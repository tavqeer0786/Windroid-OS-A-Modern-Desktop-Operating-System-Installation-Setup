import {
  InstallerProvider,
  ProviderValidationResult,
} from './InstallerProvider';
import {
  InstallationSession,
  InstallerPackageKind,
  InstallerRuntimeKind,
} from './InstallerTypes';
import { InstallationPlan, InstallationOperationKind } from './InstallationPlanTypes';
import {
  InstallerExecutionCallbacks,
  ExecutionProgressStage,
  ExecutionProgressEvent,
} from './InstallerExecutionTypes';
import { ProviderCapabilities } from './ProviderCapabilities';
import { ProviderHealth } from './ProviderHealth';

interface SessionControl {
  paused: boolean;
  resumeResolver?: () => void;
  cancelled: boolean;
}

export class SimulationInstallerProvider implements InstallerProvider {
  public readonly id = 'simulation-provider';
  public readonly runtime: InstallerRuntimeKind = 'winbridge';
  public readonly supportedPackageKinds: InstallerPackageKind[] = [
    'windows-exe',
    'windows-msi',
    'android-apk',
    'flatpak-bundle',
    'flatpak-reference',
  ];

  public readonly supportsPause = true;
  public readonly supportsResume = true;

  private static instance: SimulationInstallerProvider;
  private sessionControls: Map<string, SessionControl> = new Map();

  public static getInstance(): SimulationInstallerProvider {
    if (!SimulationInstallerProvider.instance) {
      SimulationInstallerProvider.instance = new SimulationInstallerProvider();
    }
    return SimulationInstallerProvider.instance;
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
      supportsSystemInstall: true,
      supportsUserInstall: true,
      supportsPermissionPolicy: true,
      supportsUpdates: false,
      supportsUninstall: true,
      nativeAvailable: false,
      simulationAvailable: true,
      health: this.getHealth(),
    };
  }

  public getHealth(): ProviderHealth {
    return {
      state: 'simulation',
      message: 'Simulation Provider active (Browser preview environment).',
      lastCheckedAt: Date.now(),
      details: {
        mode: 'pure-simulation',
      },
    };
  }

  public canHandle(_session: InstallationSession): boolean {
    return true; // Simulation provider can simulate execution for any plan
  }

  public async prepare(_session: InstallationSession, _plan?: InstallationPlan): Promise<void> {
    // Simulation preparation
  }

  public async validate(
    _session: InstallationSession,
    _plan?: InstallationPlan
  ): Promise<ProviderValidationResult> {
    return {
      valid: true,
      issues: [],
    };
  }

  public async cleanup(sessionId: string): Promise<void> {
    this.sessionControls.delete(sessionId);
  }

  public async dispose(sessionId: string): Promise<void> {
    this.sessionControls.delete(sessionId);
  }


  public async execute(
    session: InstallationSession,
    plan: InstallationPlan,
    callbacks?: InstallerExecutionCallbacks,
    signal?: AbortSignal
  ): Promise<InstallationSession['result']> {
    const sessionId = session.id;

    // Register execution control for pause/cancel tracking
    const control: SessionControl = { paused: false, cancelled: false };
    this.sessionControls.set(sessionId, control);

    const emitProgress = (
      stage: ExecutionProgressStage,
      message: string,
      percent: number,
      opId?: string,
      opKind?: string
    ) => {
      const event: ExecutionProgressEvent = {
        sessionId,
        stage,
        message,
        percent: Math.min(100, Math.max(0, Math.round(percent))),
        operationId: opId,
        operationKind: opKind,
        timestamp: Date.now(),
      };
      callbacks?.onProgress?.(event);
    };

    try {
      emitProgress('preparing', 'Preparing simulation execution pipeline...', 0);
      await this.delay(100, sessionId, signal);

      const operations = plan.operations && plan.operations.length > 0
        ? plan.operations
        : this.getFallbackOperations();

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        await this.checkPauseAndCancel(sessionId, signal);

        const range = this.getOperationRange(op.kind);

        // Step Start
        emitProgress(range.stage, `${op.title}: Starting...`, range.start, op.id, op.kind);
        await this.delay(120, sessionId, signal);

        await this.checkPauseAndCancel(sessionId, signal);

        // Step Midpoint
        const midPercent = range.start + Math.round((range.end - range.start) / 2);
        emitProgress(
          range.stage,
          `${op.title}: ${op.description || 'Processing operation...'}`,
          midPercent,
          op.id,
          op.kind
        );
        await this.delay(150, sessionId, signal);

        await this.checkPauseAndCancel(sessionId, signal);

        // Step Complete
        emitProgress(range.stage, `${op.title}: Completed`, range.end, op.id, op.kind);
        await this.delay(80, sessionId, signal);
      }

      // Finalizing phase
      await this.checkPauseAndCancel(sessionId, signal);
      emitProgress('finalizing', 'Finalizing simulation execution...', 98);
      await this.delay(100, sessionId, signal);

      emitProgress('completed', 'Simulation completed successfully', 100);

      // Return simulation result (do not register real apps / shortcuts / dock entries)
      return {
        installedAppId: undefined,
        launchTarget: undefined,
      };
    } catch (err: any) {
      if (
        err?.message === 'EXECUTION_CANCELLED' ||
        signal?.aborted ||
        control.cancelled
      ) {
        emitProgress('cancelled', 'Installation execution cancelled by user.', session.progress?.percent || 0);
        throw new Error('EXECUTION_CANCELLED');
      }

      emitProgress('failed', err?.message || 'Simulation execution failed.', session.progress?.percent || 0);
      throw err;
    } finally {
      this.sessionControls.delete(sessionId);
    }
  }

  public async pause(sessionId: string): Promise<boolean> {
    const control = this.sessionControls.get(sessionId);
    if (control && !control.paused && !control.cancelled) {
      control.paused = true;
      return true;
    }
    return false;
  }

  public async resume(sessionId: string): Promise<boolean> {
    const control = this.sessionControls.get(sessionId);
    if (control && control.paused) {
      control.paused = false;
      if (control.resumeResolver) {
        const resolver = control.resumeResolver;
        control.resumeResolver = undefined;
        resolver();
      }
      return true;
    }
    return false;
  }

  public async cancel(sessionId: string): Promise<void> {
    const control = this.sessionControls.get(sessionId);
    if (control) {
      control.cancelled = true;
      if (control.paused && control.resumeResolver) {
        const resolver = control.resumeResolver;
        control.resumeResolver = undefined;
        resolver();
      }
    }
  }

  private async checkPauseAndCancel(sessionId: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new Error('EXECUTION_CANCELLED');
    }
    const control = this.sessionControls.get(sessionId);
    if (!control) return;

    if (control.cancelled) {
      throw new Error('EXECUTION_CANCELLED');
    }

    if (control.paused) {
      await new Promise<void>((resolve) => {
        control.resumeResolver = resolve;
      });
      if (signal?.aborted || control.cancelled) {
        throw new Error('EXECUTION_CANCELLED');
      }
    }
  }

  private delay(ms: number, sessionId: string, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      const onAbort = () => {
        cleanup();
        reject(new Error('EXECUTION_CANCELLED'));
      };

      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };

      if (signal?.aborted) {
        onAbort();
        return;
      }

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private getOperationRange(kind: InstallationOperationKind): {
    start: number;
    end: number;
    stage: ExecutionProgressStage;
  } {
    switch (kind) {
      case 'verify-package':
        return { start: 0, end: 10, stage: 'verifying' };
      case 'resolve-runtime':
        return { start: 10, end: 18, stage: 'resolving-runtime' };
      case 'prepare-runtime':
        return { start: 18, end: 25, stage: 'preparing-runtime' };
      case 'prepare-destination':
        return { start: 25, end: 35, stage: 'preparing-destination' };
      case 'install-package':
        return { start: 35, end: 70, stage: 'installing' };
      case 'apply-permission-policy':
        return { start: 70, end: 80, stage: 'applying-permissions' };
      case 'register-application':
      case 'create-app-menu-entry':
        return { start: 80, end: 88, stage: 'registering' };
      case 'create-desktop-shortcut':
        return { start: 88, end: 93, stage: 'creating-shortcuts' };
      case 'pin-to-dock':
        return { start: 93, end: 96, stage: 'pinning-dock' };
      case 'finalize-installation':
      default:
        return { start: 96, end: 100, stage: 'finalizing' };
    }
  }

  private getFallbackOperations() {
    return [
      { id: 'op_1', kind: 'verify-package' as const, title: 'Verify Package Integrity', description: 'Checking digital signature and hash' },
      { id: 'op_2', kind: 'resolve-runtime' as const, title: 'Resolve Target Runtime', description: 'Matching package format to compatibility engine' },
      { id: 'op_3', kind: 'prepare-runtime' as const, title: 'Prepare Runtime Container', description: 'Allocating sandbox and security context' },
      { id: 'op_4', kind: 'prepare-destination' as const, title: 'Prepare Destination Path', description: 'Checking write permissions and disk space' },
      { id: 'op_5', kind: 'install-package' as const, title: 'Install Application Files', description: 'Simulating payload file copying' },
      { id: 'op_6', kind: 'apply-permission-policy' as const, title: 'Apply Permission Policy', description: 'Applying user granted permissions' },
      { id: 'op_7', kind: 'finalize-installation' as const, title: 'Finalize Installation', description: 'Cleaning up installation session' },
    ];
  }
}
