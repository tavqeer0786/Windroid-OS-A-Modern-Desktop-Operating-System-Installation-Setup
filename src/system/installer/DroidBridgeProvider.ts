import {
  InstallerProvider,
  ProviderValidationResult,
  ProviderValidationIssue,
} from './InstallerProvider';
import {
  InstallationSession,
  InstallerPackageKind,
  InstallerRuntimeKind,
} from './InstallerTypes';
import { InstallationPlan } from './InstallationPlanTypes';
import { InstallerExecutionCallbacks } from './InstallerExecutionTypes';
import { ProviderCapabilities } from './ProviderCapabilities';
import { ProviderHealth } from './ProviderHealth';
import { SimulationInstallerProvider } from './SimulationInstallerProvider';

export class DroidBridgeProvider implements InstallerProvider {
  public readonly id = 'droidbridge-provider';
  public readonly runtime: InstallerRuntimeKind = 'droidbridge';
  public readonly supportedPackageKinds: InstallerPackageKind[] = [
    'android-apk',
  ];

  public readonly supportsPause = true;
  public readonly supportsResume = true;

  private static instance: DroidBridgeProvider;

  public static getInstance(): DroidBridgeProvider {
    if (!DroidBridgeProvider.instance) {
      DroidBridgeProvider.instance = new DroidBridgeProvider();
    }
    return DroidBridgeProvider.instance;
  }

  public get capabilities(): ProviderCapabilities {
    return this.getCapabilities();
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      id: this.id,
      runtime: this.runtime,
      supportedPackageKinds: [...this.supportedPackageKinds],
      supportsPause: true,
      supportsResume: true,
      supportsCancel: true,
      supportsRepair: false,
      supportsRollback: true,
      supportsSilentInstall: true,
      supportsCustomDestination: false,
      supportsSystemInstall: false,
      supportsUserInstall: true,
      supportsPermissionPolicy: true,
      supportsUpdates: true,
      supportsUninstall: true,
      nativeAvailable: false, // Native Waydroid/Android runtime disabled in browser preview
      simulationAvailable: true,
      health: this.getHealth(),
    };
  }

  public getHealth(): ProviderHealth {
    return {
      state: 'simulation',
      message: 'DroidBridge Provider active in simulation mode (native Waydroid container disabled).',
      lastCheckedAt: Date.now(),
      details: {
        containerVersion: '11.0.0-sim',
        nativeExecutionBlocked: true,
      },
    };
  }

  public canHandle(session: InstallationSession): boolean {
    return (
      session.packageKind === 'android-apk' ||
      session.runtime === 'droidbridge'
    );
  }

  public async prepare(session: InstallationSession, _plan?: InstallationPlan): Promise<void> {
    if (!this.canHandle(session)) {
      throw new Error(`DroidBridgeProvider cannot handle package kind '${session.packageKind}'`);
    }
  }

  public async validate(
    session: InstallationSession,
    plan?: InstallationPlan
  ): Promise<ProviderValidationResult> {
    const issues: ProviderValidationIssue[] = [];

    // Validate Package Kind
    if (!this.supportedPackageKinds.includes(session.packageKind)) {
      issues.push({
        code: 'DROIDBRIDGE_UNSUPPORTED_PACKAGE_KIND',
        message: `Package kind '${session.packageKind}' is not supported by DroidBridge. Expected APK.`,
        severity: 'error',
        field: 'packageKind',
      });
    }

    // Validate Destination (Android managed storage only)
    if (session.destination.policy === 'custom') {
      issues.push({
        code: 'DROIDBRIDGE_CUSTOM_DESTINATION_NOT_SUPPORTED',
        message: 'DroidBridge packages must be installed into managed Android container storage.',
        severity: 'error',
        field: 'destination.policy',
      });
    }

    return {
      valid: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }

  public async execute(
    session: InstallationSession,
    plan: InstallationPlan,
    callbacks?: InstallerExecutionCallbacks,
    signal?: AbortSignal
  ): Promise<InstallationSession['result']> {
    // DO NOT run Waydroid or ADB subprocesses. Delegate safely to SimulationProvider.
    return SimulationInstallerProvider.getInstance().execute(
      session,
      plan,
      callbacks,
      signal
    );
  }

  public async pause(sessionId: string): Promise<boolean> {
    return SimulationInstallerProvider.getInstance().pause(sessionId);
  }

  public async resume(sessionId: string): Promise<boolean> {
    return SimulationInstallerProvider.getInstance().resume(sessionId);
  }

  public async cancel(sessionId: string): Promise<void> {
    return SimulationInstallerProvider.getInstance().cancel(sessionId);
  }

  public async rollback(_session: InstallationSession): Promise<void> {
    // Simulation rollback
  }

  public async cleanup(_sessionId: string): Promise<void> {
    // Simulation cleanup
  }

  public async dispose(_sessionId: string): Promise<void> {
    // Simulation dispose
  }
}
