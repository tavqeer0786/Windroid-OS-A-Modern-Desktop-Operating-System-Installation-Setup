import {
  InstallationSession,
  InstallerPermission,
} from './InstallerTypes';
import {
  InstallationDestinationKind,
} from './InstallationDestinationTypes';
import {
  InstallationPlan,
  InstallationPlanIssue,
  InstallationPlanContext,
  InstallationPlanOperation,
  InstallationRollbackOperation,
} from './InstallationPlanTypes';
import { InstallerProviderRegistry } from './InstallerProviderRegistry';
import { PermissionDecisionService } from './PermissionDecisionService';

export class InstallationPlanService {
  private static instance: InstallationPlanService;

  private constructor() {}

  public static getInstance(): InstallationPlanService {
    if (!InstallationPlanService.instance) {
      InstallationPlanService.instance = new InstallationPlanService();
    }
    return InstallationPlanService.instance;
  }

  public computeFingerprint(
    session: InstallationSession,
    context?: InstallationPlanContext
  ): string {
    const isBrowserSimulation = context?.simulationMode ?? (typeof window !== 'undefined');
    const reqPermsKey = session.permissions.required
      .map((p) => `${p.id}:${p.enabled}`)
      .sort()
      .join('|');
    const optPermsKey = session.permissions.optional
      .map((p) => `${p.id}:${p.enabled}`)
      .sort()
      .join('|');

    const fpObj = {
      sessionId: session.id,
      path: session.source.packagePath || session.source.storeAppId || '',
      kind: session.packageKind,
      version: session.packageInfo.version || '',
      displayName: session.packageInfo.displayName || '',
      runtime: session.runtime,
      reqPermsKey,
      optPermsKey,
      destPolicy: session.destination.policy,
      destOptionId: session.destination.optionId || '',
      destPath: session.destination.path || '',
      destDisplayPath: session.destination.displayPath || '',
      destResolvedPath: session.destination.resolvedPath || '',
      destValid: session.destination.validation?.valid ?? true,
      optShortcut: session.options.createDesktopShortcut,
      optDock: session.options.pinToDock,
      optMenu: session.options.addToApplicationsMenu,
      optLaunch: session.options.launchAfterInstall,
      pubVerified: session.verification.publisherVerified,
      sigValid: session.verification.signatureValid,
      integValid: session.verification.packageIntegrityValid,
      compStatus: session.verification.compatibilityStatus,
      availStorage: context?.availableStorageBytes,
      simMode: isBrowserSimulation,
      storeHash: context?.storeExpectedHash || '',
      pkgHash: context?.currentPackageHash || '',
    };

    return JSON.stringify(fpObj);
  }

  public isStale(
    plan: InstallationPlan,
    session: InstallationSession,
    context?: InstallationPlanContext
  ): boolean {
    if (!plan || plan.sessionId !== session.id) return true;
    const currentFp = this.computeFingerprint(session, context);
    return plan.fingerprint !== currentFp;
  }

  public createPlan(
    session: InstallationSession,
    context?: InstallationPlanContext
  ): InstallationPlan {
    const now = Date.now();
    const isSimulationMode = context?.simulationMode ?? true;

    // 1. Resolve Provider
    const resolvedProvider = InstallerProviderRegistry.getInstance().resolveProvider(session, context?.simulationMode);
    const providerId: string | undefined = resolvedProvider?.id || context?.providerId;
    const providerResolved = !!resolvedProvider || !!context?.providerAvailable;
    const providerCapabilities = resolvedProvider?.getCapabilities();
    const providerHealth = resolvedProvider?.getHealth();

    // 2. Map Inspection Source
    let inspectionSource: InstallationPlan['package']['inspectionSource'] = 'unavailable';
    if (session.launchMode === 'store-install') {
      inspectionSource = 'store-metadata';
    } else if (session.launchMode === 'developer-demo') {
      inspectionSource = 'demo-metadata';
    } else if (session.packageInfo.version || session.packageInfo.publisher) {
      inspectionSource = 'native-bridge';
    } else if (session.packageInfo.fileName) {
      inspectionSource = 'filename-fallback';
    }

    // 3. Map Verification
    const publisherStatus: InstallationPlan['verification']['publisherStatus'] =
      session.verification.publisherVerified === true
        ? 'verified'
        : session.verification.publisherVerified === false
        ? 'unverified'
        : 'unknown';

    const signatureStatus: InstallationPlan['verification']['signatureStatus'] =
      session.verification.signatureValid === true
        ? 'valid'
        : session.verification.signatureValid === false
        ? 'invalid'
        : 'unknown';

    const integrityStatus: InstallationPlan['verification']['integrityStatus'] =
      session.verification.packageIntegrityValid === true
        ? 'valid'
        : session.verification.packageIntegrityValid === false
        ? 'invalid'
        : 'unknown';

    const compatibilityStatus: InstallationPlan['verification']['compatibilityStatus'] =
      session.verification.compatibilityStatus || 'unknown';

    // 4. Map Permissions
    const granted: InstallerPermission[] = [
      ...session.permissions.required.filter((p) => p.enabled),
      ...session.permissions.optional.filter((p) => p.enabled),
    ];
    const denied: InstallerPermission[] = [
      ...session.permissions.required.filter((p) => !p.enabled),
      ...session.permissions.optional.filter((p) => !p.enabled),
    ];
    const permSummary = PermissionDecisionService.getInstance().summarize([
      ...session.permissions.required,
      ...session.permissions.optional,
    ]);

    // 5. Map Destination Kind
    let destKind: InstallationDestinationKind = 'applications-default';
    if (session.destination.policy === 'custom') destKind = 'custom-folder';
    else if (session.destination.policy === 'managed') destKind = 'droidbridge-managed';
    else if (session.destination.policy === 'user') destKind = 'flatpak-user';
    else if (session.destination.policy === 'system') destKind = 'flatpak-system';

    // 6. Collect Issues
    const issues: InstallationPlanIssue[] = [];

    // --- Package Issues ---
    if (!session.source.packagePath && !session.source.storeAppId) {
      issues.push({
        code: 'PACKAGE_SOURCE_MISSING',
        severity: 'error',
        title: 'Package Source Missing',
        message: 'No installer package file or Store app ID was specified.',
        blocking: true,
        source: 'package',
        recoverable: false,
        suggestedStep: 'overview',
      });
    }

    if (session.packageKind === 'unknown') {
      issues.push({
        code: 'PACKAGE_KIND_UNKNOWN',
        severity: 'error',
        title: 'Unknown Package Kind',
        message: 'The package format could not be identified or is unsupported.',
        blocking: true,
        source: 'package',
        recoverable: false,
        suggestedStep: 'overview',
      });
    }

    if (session.status === 'failed' || session.error) {
      issues.push({
        code: 'PACKAGE_INSPECTION_INCOMPLETE',
        severity: 'error',
        title: 'Package Inspection Failed',
        message: session.error?.message || 'Package metadata inspection did not complete successfully.',
        blocking: true,
        source: 'package',
        recoverable: false,
        suggestedStep: 'overview',
      });
    }

    if (inspectionSource === 'filename-fallback') {
      issues.push({
        code: 'FILENAME_FALLBACK_USED',
        severity: 'warning',
        title: 'Partial Package Metadata',
        message: 'Inspection fell back to filename parsing; some package details may be estimated.',
        blocking: false,
        source: 'package',
        recoverable: true,
      });
    }

    // --- Verification Issues ---
    if (signatureStatus === 'invalid') {
      issues.push({
        code: 'INVALID_SIGNATURE',
        severity: 'error',
        title: 'Invalid Digital Signature',
        message: 'The package digital signature is invalid or corrupted.',
        blocking: true,
        source: 'verification',
        recoverable: false,
      });
    }

    if (integrityStatus === 'invalid') {
      issues.push({
        code: 'INTEGRITY_FAILED',
        severity: 'error',
        title: 'Package Integrity Check Failed',
        message: 'The package file hash or checksum does not match expected values.',
        blocking: true,
        source: 'verification',
        recoverable: false,
      });
    }

    if (
      context?.storeExpectedHash &&
      context?.currentPackageHash &&
      context.storeExpectedHash !== context.currentPackageHash
    ) {
      issues.push({
        code: 'STORE_HASH_MISMATCH',
        severity: 'error',
        title: 'Store Package Hash Mismatch',
        message: 'The downloaded package hash does not match the Store catalog manifest.',
        blocking: true,
        source: 'verification',
        recoverable: false,
      });
    }

    if (publisherStatus === 'unverified') {
      issues.push({
        code: 'PUBLISHER_UNVERIFIED',
        severity: 'warning',
        title: 'Unverified Publisher',
        message: 'The package publisher identity could not be verified by a trusted authority.',
        blocking: false,
        source: 'verification',
        recoverable: true,
      });
    }

    if (isSimulationMode) {
      issues.push({
        code: 'SIMULATION_MODE',
        severity: 'warning',
        title: 'Simulation Mode',
        message: 'The package will not be installed on the host system.',
        blocking: false,
        source: 'system',
        recoverable: true,
      });
    }

    // --- Compatibility Issues ---
    if (compatibilityStatus === 'unsupported') {
      issues.push({
        code: 'COMPATIBILITY_UNSUPPORTED',
        severity: 'error',
        title: 'Unsupported Compatibility',
        message: 'The package architecture or runtime requirements are unsupported on this system.',
        blocking: true,
        source: 'compatibility',
        recoverable: false,
        suggestedStep: 'overview',
      });
    } else if (compatibilityStatus === 'limited') {
      issues.push({
        code: 'COMPATIBILITY_LIMITED',
        severity: 'warning',
        title: 'Limited Compatibility',
        message: 'The application may run with degraded performance or features.',
        blocking: false,
        source: 'compatibility',
        recoverable: true,
      });
    } else if (compatibilityStatus === 'unknown') {
      issues.push({
        code: 'COMPATIBILITY_UNKNOWN',
        severity: 'warning',
        title: 'Unknown Compatibility',
        message: 'System compatibility for this package could not be verified.',
        blocking: false,
        source: 'compatibility',
        recoverable: true,
      });
    }

    // --- Permissions Issues ---
    const disabledRequired = session.permissions.required.filter((p) => !p.enabled);
    if (disabledRequired.length > 0) {
      issues.push({
        code: 'REQUIRED_PERMISSION_DISABLED',
        severity: 'error',
        title: 'Required Permission Disabled',
        message: `Required permission "${disabledRequired[0].title}" is disabled.`,
        blocking: true,
        source: 'permissions',
        recoverable: true,
        suggestedStep: 'permissions',
      });
    }

    const sensitiveGranted = session.permissions.optional.filter((p) => p.enabled && p.riskLevel === 'sensitive');
    if (sensitiveGranted.length > 0) {
      issues.push({
        code: 'SENSITIVE_PERMISSIONS_GRANTED',
        severity: 'warning',
        title: 'Sensitive Permissions Granted',
        message: `${sensitiveGranted.length} sensitive optional permission(s) have been granted.`,
        blocking: false,
        source: 'permissions',
        recoverable: true,
      });
    }

    // --- Destination Issues ---
    if (session.destination.validation?.valid === false) {
      issues.push({
        code: 'DESTINATION_INVALID',
        severity: 'error',
        title: 'Invalid Destination Location',
        message: session.destination.validation.message || 'The selected installation destination is invalid.',
        blocking: true,
        source: 'destination',
        recoverable: true,
        suggestedStep: 'location',
      });
    }

    if (session.destination.policy === 'custom' && !session.destination.path) {
      issues.push({
        code: 'CUSTOM_PATH_MISSING',
        severity: 'error',
        title: 'Custom Destination Path Missing',
        message: 'Please select a custom folder path for installation.',
        blocking: true,
        source: 'destination',
        recoverable: true,
        suggestedStep: 'location',
      });
    }

    if (session.destination.policy === 'custom' && !session.destination.customLocationAllowed) {
      issues.push({
        code: 'CUSTOM_LOCATION_NOT_ALLOWED',
        severity: 'error',
        title: 'Custom Location Not Allowed',
        message: 'Custom installation folders are not permitted for this package type.',
        blocking: true,
        source: 'destination',
        recoverable: true,
        suggestedStep: 'location',
      });
    }

    if (session.destination.validation?.writable === false) {
      issues.push({
        code: 'DESTINATION_NOT_WRITABLE',
        severity: 'error',
        title: 'Destination Not Writable',
        message: 'The selected folder is read-only or lacks write permission.',
        blocking: true,
        source: 'destination',
        recoverable: true,
        suggestedStep: 'location',
      });
    }

    if (
      session.destination.validation?.enoughSpace === false ||
      (context?.availableStorageBytes !== undefined &&
        session.packageInfo.installedSizeBytes &&
        context.availableStorageBytes < session.packageInfo.installedSizeBytes)
    ) {
      issues.push({
        code: 'INSUFFICIENT_STORAGE',
        severity: 'error',
        title: 'Insufficient Storage',
        message: 'Not enough disk space available for installation.',
        blocking: true,
        source: 'destination',
        recoverable: true,
        suggestedStep: 'location',
      });
    }

    // --- Runtime / Provider Issues ---
    if (session.runtime === 'unresolved') {
      issues.push({
        code: 'RUNTIME_UNRESOLVED',
        severity: 'error',
        title: 'Unresolved Runtime',
        message: 'No suitable execution runtime could be resolved for this package.',
        blocking: true,
        source: 'runtime',
        recoverable: false,
        suggestedStep: 'overview',
      });
    }

    if (!providerResolved) {
      issues.push({
        code: 'PROVIDER_NOT_AVAILABLE',
        severity: 'error',
        title: 'Installer Provider Unavailable',
        message: 'No registered runtime provider was found to execute this installation.',
        blocking: true,
        source: 'provider',
        recoverable: false,
      });
    }

    // 7. Operations Generation
    const operations: InstallationPlanOperation[] = [];
    let order = 1;

    operations.push({
      id: 'op_verify_package',
      kind: 'verify-package',
      title: 'Verify package integrity & signature',
      description: 'Checking digital signatures and package file integrity.',
      required: true,
      order: order++,
      providerId,
    });

    operations.push({
      id: 'op_resolve_runtime',
      kind: 'resolve-runtime',
      title: 'Resolve runtime environment',
      description: `Connecting to ${session.runtime} execution engine.`,
      required: true,
      order: order++,
      providerId,
    });

    operations.push({
      id: 'op_prepare_runtime',
      kind: 'prepare-runtime',
      title: 'Prepare runtime environment',
      description: 'Configuring sandbox container and runtime bridges.',
      required: true,
      order: order++,
      providerId,
    });

    if (
      session.packageKind === 'windows-exe' ||
      session.packageKind === 'windows-msi' ||
      session.destination.policy === 'custom'
    ) {
      operations.push({
        id: 'op_prepare_destination',
        kind: 'prepare-destination',
        title: 'Prepare destination directory',
        description: `Creating directory ${session.destination.displayPath || session.destination.path || ''}`,
        required: true,
        order: order++,
        providerId,
      });
    }

    operations.push({
      id: 'op_install_package',
      kind: 'install-package',
      title: 'Install package files',
      description: 'Deploying application binaries and configuration files.',
      required: true,
      order: order++,
      providerId,
    });

    operations.push({
      id: 'op_apply_permission_policy',
      kind: 'apply-permission-policy',
      title: 'Apply permission policy',
      description: 'Enforcing granted permissions and security sandbox restrictions.',
      required: true,
      order: order++,
      providerId,
    });

    operations.push({
      id: 'op_register_application',
      kind: 'register-application',
      title: 'Register application in system catalog',
      description: 'Registering app ID and launcher metadata in Windroid OS catalog.',
      required: true,
      order: order++,
      providerId,
    });

    if (session.options.addToApplicationsMenu) {
      operations.push({
        id: 'op_create_app_menu_entry',
        kind: 'create-app-menu-entry',
        title: 'Add to Applications menu',
        description: 'Creating launcher item in Windroid OS Applications menu.',
        required: false,
        order: order++,
        providerId,
      });
    }

    if (session.options.createDesktopShortcut) {
      operations.push({
        id: 'op_create_desktop_shortcut',
        kind: 'create-desktop-shortcut',
        title: 'Create Desktop shortcut',
        description: 'Placing desktop icon for quick access.',
        required: false,
        order: order++,
        providerId,
      });
    }

    if (session.options.pinToDock) {
      operations.push({
        id: 'op_pin_to_dock',
        kind: 'pin-to-dock',
        title: 'Pin to Dock',
        description: 'Adding launcher tile to Windroid OS Dock.',
        required: false,
        order: order++,
        providerId,
      });
    }

    operations.push({
      id: 'op_finalize_installation',
      kind: 'finalize-installation',
      title: 'Finalize installation',
      description: 'Completing setup, clearing temporary caches, and readying launcher.',
      required: true,
      order: order++,
      providerId,
    });

    // 8. Rollback Operations Generation
    const rollbackOperations: InstallationRollbackOperation[] = [];
    let rbOrder = 1;

    if (session.options.pinToDock) {
      rollbackOperations.push({
        id: 'rb_unpin_from_dock',
        kind: 'unpin-from-dock',
        title: 'Unpin from Dock',
        order: rbOrder++,
        providerId,
      });
    }

    if (session.options.createDesktopShortcut) {
      rollbackOperations.push({
        id: 'rb_remove_desktop_shortcut',
        kind: 'remove-desktop-shortcut',
        title: 'Remove Desktop shortcut',
        order: rbOrder++,
        providerId,
      });
    }

    if (session.options.addToApplicationsMenu) {
      rollbackOperations.push({
        id: 'rb_remove_app_menu_entry',
        kind: 'remove-app-menu-entry',
        title: 'Remove Applications menu entry',
        order: rbOrder++,
        providerId,
      });
    }

    rollbackOperations.push({
      id: 'rb_remove_app_registry_entry',
      kind: 'remove-app-registry-entry',
      title: 'Remove application catalog entry',
      order: rbOrder++,
      providerId,
    });

    rollbackOperations.push({
      id: 'rb_restore_permission_policy',
      kind: 'restore-permission-policy',
      title: 'Revoke granted permission policy',
      order: rbOrder++,
      providerId,
    });

    rollbackOperations.push({
      id: 'rb_remove_runtime_registration',
      kind: 'remove-runtime-registration',
      title: 'Unregister runtime environment instance',
      order: rbOrder++,
      providerId,
    });

    rollbackOperations.push({
      id: 'rb_remove_installed_files',
      kind: 'remove-installed-files',
      title: 'Remove installed application files',
      order: rbOrder++,
      providerId,
    });

    rollbackOperations.push({
      id: 'rb_cleanup_temporary_files',
      kind: 'cleanup-temporary-files',
      title: 'Clean up temporary files and logs',
      order: rbOrder++,
      providerId,
    });

    // 9. Calculate Blockers and CanInstall
    const blockers = issues.filter((i) => i.blocking);
    const warnings = issues.filter((i) => !i.blocking && i.severity === 'warning');
    const canInstall =
      blockers.length === 0 && session.status !== 'failed' && session.status !== 'cancelled';

    const fingerprint = this.computeFingerprint(session, context);

    return {
      id: `plan_${session.id}_${now}`,
      sessionId: session.id,
      createdAt: now,
      sourceRevision: session.updatedAt || now,
      launchMode: session.launchMode,
      package: {
        packageKind: session.packageKind,
        runtime: session.runtime,
        sourcePath: session.source.packagePath,
        sourceName: session.source.sourceName,
        packageId: session.source.storeAppId || session.packageInfo.fileName,
        displayName: session.packageInfo.displayName || session.packageInfo.fileName || 'Unknown Package',
        publisher: session.packageInfo.publisher,
        version: session.packageInfo.version,
        architecture: session.packageInfo.architecture,
        packageSizeBytes: session.packageInfo.packageSizeBytes,
        estimatedInstalledSizeBytes: session.packageInfo.installedSizeBytes,
        inspectionSource,
      },
      verification: {
        publisherStatus,
        signatureStatus,
        integrityStatus,
        compatibilityStatus,
      },
      permissions: {
        required: session.permissions.required,
        optional: session.permissions.optional,
        granted,
        denied,
        summary: permSummary,
      },
      destination: {
        optionId: session.destination.optionId || 'default-option',
        kind: destKind,
        policy: session.destination.policy,
        displayPath: session.destination.displayPath || session.destination.path,
        resolvedPath: session.destination.resolvedPath || session.destination.path,
        managedByRuntime: session.destination.managedByRuntime ?? false,
        requiresElevation: session.destination.requiresElevation ?? false,
        validation: session.destination.validation || { valid: true },
      },
      options: { ...session.options },
      provider: {
        providerId,
        runtime: session.runtime,
        resolved: providerResolved,
        capabilities: providerCapabilities,
        health: providerHealth,
      },
      operations,
      rollbackOperations,
      warnings,
      blockers,
      canInstall,
      fingerprint,
    };
  }

  public validatePlan(
    plan: InstallationPlan,
    session: InstallationSession,
    context?: InstallationPlanContext
  ): InstallationPlan {
    if (this.isStale(plan, session, context)) {
      return this.createPlan(session, context);
    }
    return plan;
  }

  public getBlockingIssues(plan: InstallationPlan): InstallationPlanIssue[] {
    return plan.blockers;
  }

  public getWarnings(plan: InstallationPlan): InstallationPlanIssue[] {
    return plan.warnings;
  }
}
