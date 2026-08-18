import {
  InstallationSession,
  InstallerStep,
  InstallerSessionStatus,
  InstallerError,
} from './InstallerTypes';
import { InstallationPlan } from './InstallationPlanTypes';
import { InstallerEvent, InstallerEventCallback, UnsubscribeInstallerEvents } from './InstallerEvents';

export class InstallerSessionStore {
  private static instance: InstallerSessionStore;
  private activeSession: InstallationSession | null = null;
  private listeners: Set<InstallerEventCallback> = new Set();

  private constructor() {}

  public static getInstance(): InstallerSessionStore {
    if (!InstallerSessionStore.instance) {
      InstallerSessionStore.instance = new InstallerSessionStore();
    }
    return InstallerSessionStore.instance;
  }

  public getActiveSession(): InstallationSession | null {
    return this.activeSession;
  }

  public getSession(sessionId: string): InstallationSession | null {
    if (this.activeSession && this.activeSession.id === sessionId) {
      return this.activeSession;
    }
    return null;
  }

  public emitEvent(event: InstallerEvent): void {
    this.notify(event);
  }

  public emit(event: InstallerEvent): void {
    this.notify(event);
  }

  public getActivePlan(): InstallationPlan | null {
    return (this.activeSession as any)?.plan || null;
  }

  public subscribe(listener: InstallerEventCallback): UnsubscribeInstallerEvents {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: InstallerEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event);
      } catch (err) {
        console.error('[InstallerSessionStore] Listener error:', err);
      }
    }
  }

  public createSession(initial?: Partial<InstallationSession>): InstallationSession {
    const now = Date.now();
    const sessionId = initial?.id || `session_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const session: InstallationSession = {
      id: sessionId,
      launchMode: initial?.launchMode || 'local-package',
      source: {
        packagePath: initial?.source?.packagePath,
        sourceName: initial?.source?.sourceName,
        storeAppId: initial?.source?.storeAppId,
      },
      packageKind: initial?.packageKind || 'unknown',
      runtime: initial?.runtime || 'unresolved',
      currentStep: initial?.currentStep || (initial?.launchMode === 'store-install' ? 'installing' : 'overview'),
      status: initial?.status || 'created',
      packageInfo: {
        fileName: initial?.packageInfo?.fileName,
        displayName: initial?.packageInfo?.displayName || 'Google Chrome',
        publisher: initial?.packageInfo?.publisher || 'Google LLC',
        version: initial?.packageInfo?.version || '138.0.0',
        architecture: initial?.packageInfo?.architecture || 'x64',
        packageSizeBytes: initial?.packageInfo?.packageSizeBytes,
        installedSizeBytes: initial?.packageInfo?.installedSizeBytes,
        icon: initial?.packageInfo?.icon,
      },
      verification: {
        publisherVerified: initial?.verification?.publisherVerified ?? true,
        signatureValid: initial?.verification?.signatureValid ?? true,
        packageIntegrityValid: initial?.verification?.packageIntegrityValid ?? true,
        compatibilityStatus: initial?.verification?.compatibilityStatus || 'compatible',
      },
      permissions: {
        required: initial?.permissions?.required || [],
        optional: initial?.permissions?.optional || [],
      },
      destination: {
        policy: initial?.destination?.policy || 'default',
        optionId: initial?.destination?.optionId,
        path: initial?.destination?.path || '/WindroidOS/Applications',
        displayPath: initial?.destination?.displayPath || initial?.destination?.path || '/WindroidOS/Applications',
        resolvedPath: initial?.destination?.resolvedPath,
        customLocationAllowed: initial?.destination?.customLocationAllowed ?? true,
        managedByRuntime: initial?.destination?.managedByRuntime ?? false,
        requiresElevation: initial?.destination?.requiresElevation ?? false,
        validation: initial?.destination?.validation || {
          valid: true,
          writable: true,
          enoughSpace: true,
        },
      },
      options: {
        createDesktopShortcut: initial?.options?.createDesktopShortcut ?? true,
        pinToDock: initial?.options?.pinToDock ?? true,
        addToApplicationsMenu: initial?.options?.addToApplicationsMenu ?? true,
        launchAfterInstall: initial?.options?.launchAfterInstall ?? false,
      },
      progress: {
        stage: initial?.progress?.stage || 'idle',
        percent: initial?.progress?.percent ?? 0,
        message: initial?.progress?.message || '',
        startedAt: initial?.progress?.startedAt,
        completedAt: initial?.progress?.completedAt,
      },
      result: initial?.result,
      error: initial?.error,
      createdAt: now,
      updatedAt: now,
    };

    this.activeSession = session;
    this.notify({ type: 'session-created', sessionId: session.id, session });
    return session;
  }

  public updateSession(
    updater: (prev: InstallationSession) => InstallationSession
  ): InstallationSession | null {
    if (!this.activeSession) return null;

    const prev = this.activeSession;
    const next = updater(prev);

    if (prev === next) {
      return prev;
    }

    const updatedSession: InstallationSession = {
      ...next,
      updatedAt: Date.now(),
    };

    this.activeSession = updatedSession;
    this.notify({
      type: 'session-updated',
      sessionId: updatedSession.id,
      session: updatedSession,
    });

    return updatedSession;
  }

  public setStep(step: InstallerStep): void {
    if (!this.activeSession) return;
    if (this.activeSession.currentStep === step) return;

    this.updateSession((prev) => ({
      ...prev,
      currentStep: step,
    }));

    this.notify({
      type: 'step-changed',
      sessionId: this.activeSession.id,
      step,
    });
  }

  public setStatus(status: InstallerSessionStatus): void {
    if (!this.activeSession) return;
    if (this.activeSession.status === status) return;

    this.updateSession((prev) => ({
      ...prev,
      status,
    }));

    this.notify({
      type: 'status-changed',
      sessionId: this.activeSession.id,
      status,
    });
  }

  public setPlan(plan: InstallationPlan, status: InstallationSession['planStatus'] = 'ready'): void {
    if (!this.activeSession) return;
    const isNew = !this.activeSession.plan;

    this.updateSession((prev) => ({
      ...prev,
      plan,
      planStatus: status,
    }));

    if (isNew) {
      this.notify({
        type: 'plan-created',
        sessionId: this.activeSession.id,
        plan,
      });
    } else {
      this.notify({
        type: 'plan-updated',
        sessionId: this.activeSession.id,
        plan,
      });
    }

    if (plan.canInstall) {
      this.notify({
        type: 'plan-ready',
        sessionId: this.activeSession.id,
        plan,
      });
    } else {
      this.notify({
        type: 'plan-blocked',
        sessionId: this.activeSession.id,
        blockers: plan.blockers,
      });
    }
  }

  public invalidatePlan(): void {
    if (!this.activeSession || !this.activeSession.plan) return;
    if (this.activeSession.planStatus === 'stale') return;

    this.updateSession((prev) => ({
      ...prev,
      planStatus: 'stale',
    }));

    this.notify({
      type: 'plan-invalidated',
      sessionId: this.activeSession.id,
    });
  }

  public updatePackageInfo(info: Partial<InstallationSession['packageInfo']>): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      packageInfo: { ...prev.packageInfo, ...info },
      planStatus: prev.plan ? 'stale' : prev.planStatus,
    }));
  }

  public updateVerification(verification: Partial<InstallationSession['verification']>): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      verification: { ...prev.verification, ...verification },
      planStatus: prev.plan ? 'stale' : prev.planStatus,
    }));
  }

  public updatePermissions(permissions: Partial<InstallationSession['permissions']>): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      permissions: {
        required: permissions.required ? [...permissions.required] : prev.permissions.required,
        optional: permissions.optional ? [...permissions.optional] : prev.permissions.optional,
      },
      planStatus: prev.plan ? 'stale' : prev.planStatus,
    }));
  }

  public updateDestination(destination: Partial<InstallationSession['destination']>): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      destination: { ...prev.destination, ...destination },
      planStatus: prev.plan ? 'stale' : prev.planStatus,
    }));
  }

  public updateOptions(options: Partial<InstallationSession['options']>): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      options: { ...prev.options, ...options },
      planStatus: prev.plan ? 'stale' : prev.planStatus,
    }));
  }

  public updateProgress(progress: Partial<InstallationSession['progress']>): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      progress: { ...prev.progress, ...progress },
    }));

    this.notify({
      type: 'progress-updated',
      sessionId: this.activeSession.id,
      progress: this.activeSession.progress,
    });
  }

  public setResult(result: InstallationSession['result']): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      result,
      status: 'completed',
      currentStep: 'completed',
    }));

    this.notify({
      type: 'installation-completed',
      sessionId: this.activeSession.id,
      result,
    });
  }

  public setError(error: InstallerError): void {
    if (!this.activeSession) return;
    this.updateSession((prev) => ({
      ...prev,
      error,
      status: 'failed',
      currentStep: 'failed',
    }));

    this.notify({
      type: 'installation-failed',
      sessionId: this.activeSession.id,
      error,
    });
  }

  public cancelSession(): void {
    if (!this.activeSession) return;
    const sessionId = this.activeSession.id;

    this.updateSession((prev) => ({
      ...prev,
      status: 'cancelled',
      currentStep: 'cancelled',
    }));

    this.notify({
      type: 'installation-cancelled',
      sessionId,
    });
  }

  public disposeSession(): void {
    if (!this.activeSession) return;
    const sessionId = this.activeSession.id;
    this.activeSession = null;

    this.notify({
      type: 'session-disposed',
      sessionId,
    });
  }
}
