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

export class FlatpakProvider implements InstallerProvider {
  public readonly id = 'flatpak-provider';
  public readonly runtime: InstallerRuntimeKind = 'native-flatpak';
  public readonly supportedPackageKinds: InstallerPackageKind[] = [
    'flatpak-bundle',
    'flatpak-reference',
  ];

  public readonly supportsPause = true;
  public readonly supportsResume = true;

  private static instance: FlatpakProvider;

  public static getInstance(): FlatpakProvider {
    if (!FlatpakProvider.instance) {
      FlatpakProvider.instance = new FlatpakProvider();
    }
    return FlatpakProvider.instance;
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
      supportsRepair: true,
      supportsRollback: true,
      supportsSilentInstall: true,
      supportsCustomDestination: false,
      supportsSystemInstall: true,
      supportsUserInstall: true,
      supportsPermissionPolicy: true,
      supportsUpdates: true,
      supportsUninstall: true,
      nativeAvailable: false, // Native Flatpak CLI disabled in browser container
      simulationAvailable: true,
      health: this.getHealth(),
    };
  }

  public getHealth(): ProviderHealth {
    return {
      state: 'simulation',
      message: 'Flatpak Provider active in simulation mode (Flatpak CLI subprocesses disabled).',
      lastCheckedAt: Date.now(),
      details: {
        flatpakVersion: '1.14.0-sim',
        nativeExecutionBlocked: true,
      },
    };
  }

  public canHandle(session: InstallationSession): boolean {
    return (
      session.packageKind === 'flatpak-bundle' ||
      session.packageKind === 'flatpak-reference' ||
      session.runtime === 'native-flatpak'
    );
  }

  public async prepare(session: InstallationSession, _plan?: InstallationPlan): Promise<void> {
    if (!this.canHandle(session)) {
      throw new Error(`FlatpakProvider cannot handle package kind '${session.packageKind}'`);
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
        code: 'FLATPAK_UNSUPPORTED_PACKAGE_KIND',
        message: `Package kind '${session.packageKind}' is not supported by FlatpakProvider. Expected Flatpak bundle or reference.`,
        severity: 'error',
        field: 'packageKind',
      });
    }

    // Validate Destination (Flatpak user or system installation only)
    if (session.destination.policy === 'custom') {
      issues.push({
        code: 'FLATPAK_CUSTOM_DESTINATION_NOT_SUPPORTED',
        message: 'Flatpak packages use user (~/.local/share/flatpak) or system (/var/lib/flatpak) installations, not arbitrary folders.',
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
    // DO NOT run Flatpak CLI or subprocesses. Delegate safely to SimulationProvider.
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
