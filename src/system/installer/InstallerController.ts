import { InstallerSessionStore } from './InstallerSessionStore';
import { PackageDetectionService } from './PackageDetectionService';
import { PackageInspectionService } from './PackageInspectionService';
import { PermissionMappingService } from './PermissionMappingService';
import { PermissionDecisionService } from './PermissionDecisionService';
import { InstallationDestinationPolicyService } from './InstallationDestinationPolicyService';
import {
  InstallationDestinationPolicy,
  InstallationDestinationContext,
} from './InstallationDestinationTypes';
import {
  InstallationSession,
  InstallerStep,
  InstallerLaunchMode,
  InstallerPermission,
  getVisibleInstallerSteps,
} from './InstallerTypes';
import { PackageInspectionOptions } from './PackageInspectionTypes';
import { InstallerPermissionSummary } from './PermissionTypes';
import { InstallationPlanService } from './InstallationPlanService';
import { InstallerProviderRegistry } from './InstallerProviderRegistry';
import { InstallerExecutionEngine } from './InstallerExecutionEngine';
import { CompletionEngine } from './CompletionEngine';
import { InstalledApplicationRecord } from './InstalledApplicationRegistry';
import { InstallerExecutionState } from './InstallerExecutionTypes';
import {
  InstallationPlan,
  InstallationPlanContext,
  InstallationPlanIssue,
} from './InstallationPlanTypes';

function mapPolicyToSessionDestination(
  policy: InstallationDestinationPolicy
): Partial<InstallationSession['destination']> {
  const selected =
    InstallationDestinationPolicyService.getInstance().getSelectedOption(
      policy
    );
  let policyName: InstallationSession['destination']['policy'] = 'default';
  if (selected?.kind === 'custom-folder') policyName = 'custom';
  else if (selected?.kind === 'droidbridge-managed') policyName = 'managed';
  else if (selected?.kind === 'flatpak-user') policyName = 'user';
  else if (selected?.kind === 'flatpak-system') policyName = 'system';

  return {
    policy: policyName,
    optionId: selected?.id,
    path:
      selected?.kind === 'custom-folder'
        ? policy.customPath
        : selected?.displayPath,
    displayPath: selected?.displayPath,
    resolvedPath: selected?.resolvedPath,
    customLocationAllowed: selected?.customLocationAllowed ?? false,
    managedByRuntime: selected?.managedByRuntime ?? false,
    requiresElevation: selected?.requiresElevation ?? false,
    validation: {
      valid: policy.validation.valid,
      writable: policy.validation.writable,
      enoughSpace: policy.validation.enoughSpace,
      errorCode: policy.validation.errorCode,
      message: policy.validation.message,
    },
  };
}

export class InstallerController {
  private static instance: InstallerController;
  private store: InstallerSessionStore;
  private currentInspectionController: AbortController | null = null;
  private currentDestinationPolicy: InstallationDestinationPolicy | null = null;

  private constructor() {
    this.store = InstallerSessionStore.getInstance();
  }

  public static getInstance(): InstallerController {
    if (!InstallerController.instance) {
      InstallerController.instance = new InstallerController();
    }
    return InstallerController.instance;
  }

  public startLocalPackageSession(
    packagePath: string,
    initialData?: Partial<InstallationSession>,
    options?: PackageInspectionOptions
  ): InstallationSession {
    // Abort any ongoing inspection for previous session
    if (this.currentInspectionController) {
      this.currentInspectionController.abort();
      this.currentInspectionController = null;
    }

    const detection = PackageDetectionService.detectFromPath(packagePath);

    if (!detection.supported) {
      return this.store.createSession({
        launchMode: 'local-package',
        source: {
          packagePath,
          sourceName: detection.fileName,
        },
        packageKind: detection.packageKind,
        runtime: detection.runtime,
        packageInfo: {
          fileName: detection.fileName,
          ...initialData?.packageInfo,
        },
        currentStep: 'failed',
        status: 'failed',
        error: {
          code: 'UNSUPPORTED_PACKAGE',
          title: 'Unsupported Package',
          message:
            detection.reason ||
            `The file extension "${
              detection.normalizedExtension
                ? '.' + detection.normalizedExtension
                : 'none'
            }" is not a recognized installer package format.`,
          recoverable: false,
        },
        ...initialData,
      });
    }

    // Reset destination policy for new session
    this.currentDestinationPolicy = null;

    const session = this.store.createSession({
      launchMode: 'local-package',
      source: {
        packagePath,
        sourceName: detection.fileName,
      },
      packageKind: detection.packageKind,
      runtime: detection.runtime,
      packageInfo: {
        fileName: detection.fileName,
        ...initialData?.packageInfo,
      },
      currentStep: 'overview',
      status: 'inspecting',
      ...initialData,
    });

    const abortController = new AbortController();
    this.currentInspectionController = abortController;

    // Trigger async package inspection
    PackageInspectionService.getInstance()
      .inspectPackage(detection, options, abortController.signal)
      .then((inspection) => {
        if (abortController.signal.aborted) return;

        const activeSession = this.getActiveSession();
        if (!activeSession || activeSession.id !== session.id) return;

        const mappedPerms = PermissionMappingService.getInstance().mapInspectionPermissions(inspection);
        const requiredPerms = mappedPerms.filter((p) => p.required);
        const optionalPerms = mappedPerms.filter((p) => !p.required);

        this.store.updateSession((prev) => ({
          ...prev,
          status: 'ready',
          packageInfo: {
            ...prev.packageInfo,
            fileName: inspection.package.fileName,
            displayName:
              inspection.package.displayName || prev.packageInfo.displayName,
            publisher: inspection.package.publisher,
            version: inspection.package.version,
            architecture:
              inspection.package.architecture || prev.packageInfo.architecture,
            packageSizeBytes: inspection.package.packageSizeBytes,
            installedSizeBytes:
              inspection.package.estimatedInstalledSizeBytes,
            icon: inspection.package.icon || prev.packageInfo.icon,
          },
          verification: {
            ...prev.verification,
            publisherVerified:
              inspection.verification.publisherStatus === 'verified',
            signatureValid:
              inspection.verification.signatureStatus === 'valid',
            packageIntegrityValid:
              inspection.verification.integrityStatus === 'valid',
            compatibilityStatus:
              inspection.verification.compatibilityStatus,
          },
          permissions: {
            required: requiredPerms,
            optional: optionalPerms,
          },
        }));

        this.initializeDestinationPolicy();
      })
      .catch((err: any) => {
        if (abortController.signal.aborted || err?.message === 'Inspection cancelled') return;

        const activeSession = this.getActiveSession();
        if (!activeSession || activeSession.id !== session.id) return;

        this.store.updateSession((prev) => ({
          ...prev,
          status: 'failed',
          error: {
            code: 'INSPECTION_FAILED',
            title: 'Package Inspection Failed',
            message:
              err?.message ||
              'Failed to inspect package metadata. The package file may be corrupted.',
            recoverable: false,
          },
        }));
      });

    return session;
  }

  public startStoreSession(
    storeAppId: string,
    packagePath?: string,
    initialData?: Partial<InstallationSession>
  ): InstallationSession {
    return this.store.createSession({
      launchMode: 'store-install',
      source: { storeAppId, packagePath, sourceName: storeAppId },
      currentStep: 'installing',
      status: 'installing',
      ...initialData,
    });
  }

  public startDemoSession(demoData?: Partial<InstallationSession>): InstallationSession {
    return this.store.createSession({
      launchMode: 'developer-demo',
      currentStep: 'completed',
      status: 'completed',
      ...demoData,
    });
  }

  public getActiveSession(): InstallationSession | null {
    return this.store.getActiveSession();
  }

  public getVisibleSteps(launchMode?: InstallerLaunchMode): InstallerStep[] {
    const session = this.getActiveSession();
    const mode = launchMode || session?.launchMode || 'local-package';
    return getVisibleInstallerSteps(mode);
  }

  public goToStep(step: InstallerStep): boolean {
    const session = this.getActiveSession();
    if (!session) return false;

    const visible = this.getVisibleSteps(session.launchMode);
    if (!visible.includes(step) && step !== 'failed' && step !== 'cancelled') {
      console.warn(`[InstallerController] Step '${step}' is invalid for mode '${session.launchMode}'`);
      return false;
    }

    this.store.setStep(step);
    if (step === 'review') {
      this.getInstallationPlan();
    }
    return true;
  }

  public updatePermission(permissionId: string, enabled: boolean): void {
    const session = this.getActiveSession();
    if (!session) return;

    const currentOptional = session.permissions.optional;
    const nextOptional = PermissionDecisionService.getInstance().setPermissionEnabled(
      currentOptional,
      permissionId,
      enabled
    );

    // If unchanged, do not trigger subscriber notification
    const changed = nextOptional.some(
      (p, idx) => p.enabled !== currentOptional[idx]?.enabled
    );
    if (!changed) return;

    this.store.updatePermissions({
      required: session.permissions.required,
      optional: nextOptional,
    });
  }

  public resetOptionalPermissions(): void {
    const session = this.getActiveSession();
    if (!session) return;

    const currentOptional = session.permissions.optional;
    const nextOptional = PermissionDecisionService.getInstance().resetOptionalPermissions(
      currentOptional
    );

    this.store.updatePermissions({
      required: session.permissions.required,
      optional: nextOptional,
    });
  }

  public getPermissionSummary(): InstallerPermissionSummary | null {
    const session = this.getActiveSession();
    if (!session) return null;

    const allPerms = [
      ...session.permissions.required,
      ...session.permissions.optional,
    ];
    return PermissionDecisionService.getInstance().summarize(allPerms);
  }

  public canContinueFromPermissions(): boolean {
    const summary = this.getPermissionSummary();
    return summary ? summary.canContinue : true;
  }

  public continueFromPermissions(): boolean {
    if (!this.canContinueFromPermissions()) return false;
    return this.goToStep('location');
  }

  public initializeDestinationPolicy(
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy | null {
    const session = this.getActiveSession();
    if (!session) return null;

    const policy = InstallationDestinationPolicyService.getInstance().createPolicy(
      session,
      context
    );
    this.currentDestinationPolicy = policy;

    const destUpdates = mapPolicyToSessionDestination(policy);
    this.store.updateDestination(destUpdates);

    if (
      session.packageKind === 'android-apk' ||
      session.packageKind === 'flatpak-bundle' ||
      session.packageKind === 'flatpak-reference'
    ) {
      this.store.updateOptions({
        createDesktopShortcut: session.options.createDesktopShortcut ?? false,
      });
    }

    return policy;
  }

  public getDestinationPolicy(
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy | null {
    const session = this.getActiveSession();
    if (!session) return null;

    if (
      this.currentDestinationPolicy &&
      this.currentDestinationPolicy.packageKind === session.packageKind
    ) {
      return this.currentDestinationPolicy;
    }

    return this.initializeDestinationPolicy(context);
  }

  public selectDestinationOption(
    optionId: string,
    context?: InstallationDestinationContext
  ): boolean {
    const session = this.getActiveSession();
    if (!session) return false;

    const currentPolicy = this.getDestinationPolicy(context);
    if (!currentPolicy) return false;

    const nextPolicy = InstallationDestinationPolicyService.getInstance().selectOption(
      currentPolicy,
      optionId,
      context
    );

    if (nextPolicy === currentPolicy) {
      return nextPolicy.validation.valid;
    }

    this.currentDestinationPolicy = nextPolicy;
    const destUpdates = mapPolicyToSessionDestination(nextPolicy);
    this.store.updateDestination(destUpdates);

    return nextPolicy.validation.valid;
  }

  public setCustomDestinationPath(
    path: string,
    context?: InstallationDestinationContext
  ): boolean {
    const session = this.getActiveSession();
    if (!session) return false;

    const currentPolicy = this.getDestinationPolicy(context);
    if (!currentPolicy) return false;

    const nextPolicy = InstallationDestinationPolicyService.getInstance().setCustomPath(
      currentPolicy,
      path,
      context
    );

    if (nextPolicy === currentPolicy) {
      return nextPolicy.validation.valid;
    }

    this.currentDestinationPolicy = nextPolicy;
    const destUpdates = mapPolicyToSessionDestination(nextPolicy);
    this.store.updateDestination(destUpdates);

    return nextPolicy.validation.valid;
  }

  public validateDestination(
    context?: InstallationDestinationContext
  ): boolean {
    const session = this.getActiveSession();
    if (!session) return false;

    const currentPolicy = this.getDestinationPolicy(context);
    if (!currentPolicy) return false;

    const nextPolicy = InstallationDestinationPolicyService.getInstance().validate(
      currentPolicy,
      context
    );

    this.currentDestinationPolicy = nextPolicy;
    const destUpdates = mapPolicyToSessionDestination(nextPolicy);
    this.store.updateDestination(destUpdates);

    return nextPolicy.validation.valid;
  }

  public canContinueFromLocation(): boolean {
    const session = this.getActiveSession();
    if (!session) return false;
    return session.destination.validation?.valid ?? true;
  }

  public continueFromLocation(): boolean {
    if (!this.canContinueFromLocation()) return false;
    return this.goToStep('review');
  }

  public updateDestination(destination: Partial<InstallationSession['destination']>): void {
    this.store.updateDestination(destination);
  }

  public updateOptions(options: Partial<InstallationSession['options']>): void {
    this.store.updateOptions(options);
  }

  public generateInstallationPlan(context?: InstallationPlanContext): InstallationPlan | null {
    const session = this.getActiveSession();
    if (!session) return null;

    const plan = InstallationPlanService.getInstance().createPlan(session, context);
    this.store.setPlan(plan, plan.canInstall ? 'ready' : 'blocked');
    return plan;
  }

  public getInstallationPlan(context?: InstallationPlanContext): InstallationPlan | null {
    const session = this.getActiveSession();
    if (!session) return null;

    const planService = InstallationPlanService.getInstance();
    if (session.plan && !planService.isStale(session.plan, session, context)) {
      return session.plan;
    }

    return this.generateInstallationPlan(context);
  }

  public refreshInstallationPlan(context?: InstallationPlanContext): InstallationPlan | null {
    return this.generateInstallationPlan(context);
  }

  public validateInstallationPlan(context?: InstallationPlanContext): boolean {
    const plan = this.getInstallationPlan(context);
    return plan ? plan.canInstall : false;
  }

  public getPlanWarnings(): InstallationPlanIssue[] {
    const plan = this.getInstallationPlan();
    return plan ? plan.warnings : [];
  }

  public getPlanBlockers(): InstallationPlanIssue[] {
    const plan = this.getInstallationPlan();
    return plan ? plan.blockers : [];
  }

  public canProceedToInstall(): boolean {
    const session = this.getActiveSession();
    if (!session) return false;
    const planService = InstallationPlanService.getInstance();
    if (!session.plan || session.planStatus === 'stale' || planService.isStale(session.plan, session)) {
      const freshPlan = this.getInstallationPlan();
      return freshPlan ? freshPlan.canInstall : false;
    }
    return session.plan.canInstall;
  }

  public async startInstallation(context?: InstallationPlanContext): Promise<boolean> {
    const session = this.getActiveSession();
    if (!session) return false;

    const plan = this.getInstallationPlan(context);
    if (!plan || !plan.canInstall) {
      if (plan) this.store.setPlan(plan, 'blocked');
      return false;
    }

    try {
      const provider = InstallerProviderRegistry.getInstance().resolveProvider(
        session,
        context?.simulationMode
      );
      if (provider?.validate) {
        const valResult = await provider.validate(session, plan);
        if (!valResult.valid) {
          console.warn('[InstallerController] Provider validation notice:', valResult.issues);
        }
      }

      // Trigger execution via InstallerExecutionEngine (runs asynchronously)
      InstallerExecutionEngine.getInstance()
        .execute(session, plan)
        .catch((err) => {
          console.error('[InstallerController] Error during installation execution:', err);
        });
      return true;
    } catch (err) {
      console.error('[InstallerController] Failed to start installation execution:', err);
      return false;
    }
  }

  public async pauseInstallation(): Promise<boolean> {
    const session = this.getActiveSession();
    if (!session) return false;
    return InstallerExecutionEngine.getInstance().pause(session.id);
  }

  public async resumeInstallation(): Promise<boolean> {
    const session = this.getActiveSession();
    if (!session) return false;
    return InstallerExecutionEngine.getInstance().resume(session.id);
  }

  public async cancelInstallation(): Promise<void> {
    const session = this.getActiveSession();
    if (!session) return;
    await InstallerExecutionEngine.getInstance().cancel(session.id);
  }

  public getExecutionState(): InstallerExecutionState {
    const session = this.getActiveSession();
    if (!session) return 'idle';
    return InstallerExecutionEngine.getInstance().getExecutionState(session.id);
  }

  public continueFromReview(context?: InstallationPlanContext): boolean {
    const plan = this.getInstallationPlan(context);
    if (!plan) return false;

    if (!plan.canInstall) {
      this.store.setPlan(plan, 'blocked');
      return false;
    }

    this.startInstallation(context);
    return true;
  }

  public async completeInstallation(): Promise<InstalledApplicationRecord | null> {
    const session = this.getActiveSession();
    if (!session) return null;
    const plan = this.store.getActivePlan() || undefined;
    return CompletionEngine.getInstance().completeInstallation(session, plan);
  }

  public cancelSession(): void {
    if (this.currentInspectionController) {
      this.currentInspectionController.abort();
      this.currentInspectionController = null;
    }
    this.currentDestinationPolicy = null;
    this.store.cancelSession();
  }

  public disposeSession(): void {
    if (this.currentInspectionController) {
      this.currentInspectionController.abort();
      this.currentInspectionController = null;
    }
    this.currentDestinationPolicy = null;
    this.store.disposeSession();
  }
}
