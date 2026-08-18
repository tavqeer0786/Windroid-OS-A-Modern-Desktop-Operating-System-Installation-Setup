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

export class WinBridgeProvider implements InstallerProvider {
  public readonly id = 'winbridge-provider';
  public readonly runtime: InstallerRuntimeKind = 'winbridge';
  public readonly supportedPackageKinds: InstallerPackageKind[] = [
    'windows-exe',
    'windows-msi',
  ];

  public readonly supportsPause = true;
  public readonly supportsResume = true;

  private static instance: WinBridgeProvider;

  public static getInstance(): WinBridgeProvider {
    if (!WinBridgeProvider.instance) {
      WinBridgeProvider.instance = new WinBridgeProvider();
    }
    return WinBridgeProvider.instance;
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
      supportsCustomDestination: true,
      supportsSystemInstall: false,
      supportsUserInstall: true,
      supportsPermissionPolicy: true,
      supportsUpdates: false,
      supportsUninstall: true,
      nativeAvailable: false, // Native Wine execution engine not running in browser container
      simulationAvailable: true,
      health: this.getHealth(),
    };
  }

  public getHealth(): ProviderHealth {
    return {
      state: 'simulation',
      message: 'WinBridge Provider active in simulation mode (native Wine/bridge subprocesses disabled).',
      lastCheckedAt: Date.now(),
      details: {
        architecture: 'x86_64',
        bridgeVersion: '2.4.0-sim',
        nativeExecutionBlocked: true,
      },
    };
  }

  public canHandle(session: InstallationSession): boolean {
    return (
      session.packageKind === 'windows-exe' ||
      session.packageKind === 'windows-msi' ||
      session.runtime === 'winbridge'
    );
  }

  public async prepare(session: InstallationSession, _plan?: InstallationPlan): Promise<void> {
    if (!this.canHandle(session)) {
      throw new Error(`WinBridgeProvider cannot handle package kind '${session.packageKind}'`);
    }
    // Simulation preparation only - no native Wine or subprocess execution
  }

  public async validate(
    session: InstallationSession,
    plan?: InstallationPlan
  ): Promise<ProviderValidationResult> {
    const issues: ProviderValidationIssue[] = [];

    // Validate Package Kind
    if (!this.supportedPackageKinds.includes(session.packageKind)) {
      issues.push({
        code: 'WINBRIDGE_UNSUPPORTED_PACKAGE_KIND',
        message: `Package kind '${session.packageKind}' is not supported by WinBridge. Expected EXE or MSI.`,
        severity: 'error',
        field: 'packageKind',
      });
    }

    // Validate Runtime
    if (session.runtime !== 'winbridge' && session.runtime !== 'unresolved') {
      issues.push({
        code: 'WINBRIDGE_RUNTIME_MISMATCH',
        message: `Runtime '${session.runtime}' does not match WinBridge provider.`,
        severity: 'warning',
        field: 'runtime',
      });
    }

    // Validate Destination
    if (session.destination.policy === 'system') {
      issues.push({
        code: 'WINBRIDGE_SYSTEM_DESTINATION_NOT_SUPPORTED',
        message: 'WinBridge user-space sandbox does not support system-wide root installations.',
        severity: 'error',
        field: 'destination.policy',
      });
    }

    // Validate Launch Mode
    if (session.launchMode === 'store-install') {
      issues.push({
        code: 'WINBRIDGE_STORE_INSTALL_NOTICE',
        message: 'Windows packages from Store run inside WinBridge translation container.',
        severity: 'info',
        field: 'launchMode',
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
    // DO NOT run Wine or any subprocesses. Delegate safely to SimulationProvider.
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
    // Simulation rollback - no native filesystem changes
  }

  public async cleanup(_sessionId: string): Promise<void> {
    // Simulation cleanup
  }

  public async dispose(_sessionId: string): Promise<void> {
    // Simulation dispose
  }
}
