import { InstallerSessionStore } from './InstallerSessionStore';
import { SimulationInstallerProvider } from './SimulationInstallerProvider';
import { CompletionEngine } from './CompletionEngine';
import { InstallationSession } from './InstallerTypes';
import { InstallationPlan } from './InstallationPlanTypes';
import {
  InstallerExecutionState,
  ExecutionProgressEvent,
} from './InstallerExecutionTypes';
import {
  InstallerEvent,
  InstallerEventCallback,
  UnsubscribeInstallerEvents,
} from './InstallerEvents';

export class InstallerExecutionEngine {
  private static instance: InstallerExecutionEngine;

  private activeAbortControllers: Map<string, AbortController> = new Map();
  private executionStates: Map<string, InstallerExecutionState> = new Map();
  private listeners: Set<InstallerEventCallback> = new Set();

  private constructor() {}

  public static getInstance(): InstallerExecutionEngine {
    if (!InstallerExecutionEngine.instance) {
      InstallerExecutionEngine.instance = new InstallerExecutionEngine();
    }
    return InstallerExecutionEngine.instance;
  }

  public getExecutionState(sessionId: string): InstallerExecutionState {
    return this.executionStates.get(sessionId) || 'idle';
  }

  public subscribe(callback: InstallerEventCallback): UnsubscribeInstallerEvents {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: InstallerEvent) {
    // Notify local subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in InstallerExecutionEngine listener:', err);
      }
    });

    // Also notify InstallerSessionStore event bus
    InstallerSessionStore.getInstance().emitEvent(event);
  }

  public async execute(
    session: InstallationSession,
    plan: InstallationPlan
  ): Promise<void> {
    const sessionId = session.id;
    const currentState = this.getExecutionState(sessionId);

    // Guard against duplicate execution
    if (currentState === 'starting' || currentState === 'running' || currentState === 'paused') {
      console.warn(`[InstallerExecutionEngine] Execution already in progress for session ${sessionId}`);
      throw new Error(`Execution already in progress for session ${sessionId}`);
    }

    if (!plan.canInstall || plan.blockers.length > 0) {
      throw new Error('Cannot execute installation plan because there are blocking issues.');
    }

    // Set starting state & AbortController
    const abortController = new AbortController();
    this.activeAbortControllers.set(sessionId, abortController);
    this.setExecutionState(sessionId, 'starting');

    const store = InstallerSessionStore.getInstance();
    store.setStep('installing');
    store.setStatus('installing');

    this.emit({ type: 'execution-started', sessionId, plan });

    const provider = SimulationInstallerProvider.getInstance();

    this.setExecutionState(sessionId, 'running');

    let lastPercent = -1;
    let lastMessage = '';
    let lastStage = '';

    try {
      await provider.execute(
        session,
        plan,
        {
          onProgress: (event: ExecutionProgressEvent) => {
            // Deduplicate progress updates if nothing changed
            if (
              event.percent === lastPercent &&
              event.message === lastMessage &&
              event.stage === lastStage
            ) {
              return;
            }

            lastPercent = event.percent;
            lastMessage = event.message;
            lastStage = event.stage;

            // Update session store progress
            store.updateProgress({
              stage: event.stage,
              percent: event.percent,
              message: event.message,
              operationId: event.operationId,
              operationKind: event.operationKind,
              executionState: this.getExecutionState(sessionId),
              canPause: provider.supportsPause,
              canResume: provider.supportsResume,
            });

            this.emit({
              type: 'execution-progress',
              sessionId,
              event,
            });
          },
        },
        abortController.signal
      );

      this.setExecutionState(sessionId, 'completed');

      this.emit({
        type: 'execution-completed',
        sessionId,
        result: {
          installedAppId: session.packageInfo.displayName || session.packageInfo.fileName || session.id,
          launchTarget: `windroid-launch://${session.id}`,
        },
      });

      // Invoke CompletionEngine pipeline
      await CompletionEngine.getInstance().completeInstallation(session, plan);
    } catch (err: any) {
      if (
        err?.message === 'EXECUTION_CANCELLED' ||
        abortController.signal.aborted ||
        this.getExecutionState(sessionId) === 'cancelling'
      ) {
        this.setExecutionState(sessionId, 'cancelled');
        store.setStatus('cancelled');
        store.updateProgress({
          stage: 'cancelled',
          message: 'Installation cancelled by user.',
          executionState: 'cancelled',
        });
        this.emit({ type: 'execution-cancelled', sessionId });
        return;
      }

      this.setExecutionState(sessionId, 'failed');
      const errorObj = {
        code: 'EXECUTION_FAILED',
        title: 'Installation Failed',
        message: err?.message || 'Execution encountered an error.',
        recoverable: false,
      };
      store.setError(errorObj);
      store.updateProgress({
        stage: 'failed',
        message: err?.message || 'Execution failed.',
        executionState: 'failed',
      });

      this.emit({
        type: 'execution-failed',
        sessionId,
        error: errorObj,
      });
    } finally {
      this.activeAbortControllers.delete(sessionId);
    }
  }

  public async pause(sessionId: string): Promise<boolean> {
    const state = this.getExecutionState(sessionId);
    if (state !== 'running') return false;

    const provider = SimulationInstallerProvider.getInstance();
    const paused = await provider.pause(sessionId);
    if (paused) {
      this.setExecutionState(sessionId, 'paused');
      const store = InstallerSessionStore.getInstance();
      const session = store.getSession(sessionId);
      if (session) {
        store.updateProgress({
          ...session.progress,
          executionState: 'paused',
          canPause: false,
          canResume: true,
        });
      }
      this.emit({ type: 'execution-paused', sessionId });
      return true;
    }
    return false;
  }

  public async resume(sessionId: string): Promise<boolean> {
    const state = this.getExecutionState(sessionId);
    if (state !== 'paused') return false;

    const provider = SimulationInstallerProvider.getInstance();
    const resumed = await provider.resume(sessionId);
    if (resumed) {
      this.setExecutionState(sessionId, 'running');
      const store = InstallerSessionStore.getInstance();
      const session = store.getSession(sessionId);
      if (session) {
        store.updateProgress({
          ...session.progress,
          executionState: 'running',
          canPause: true,
          canResume: false,
        });
      }
      this.emit({ type: 'execution-resumed', sessionId });
      return true;
    }
    return false;
  }

  public async cancel(sessionId: string): Promise<void> {
    this.setExecutionState(sessionId, 'cancelling');

    const provider = SimulationInstallerProvider.getInstance();
    await provider.cancel(sessionId);

    const controller = this.activeAbortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(sessionId);
    }
  }

  public dispose(sessionId: string) {
    this.cancel(sessionId).catch(() => {});
    this.executionStates.delete(sessionId);
  }

  private setExecutionState(sessionId: string, state: InstallerExecutionState) {
    this.executionStates.set(sessionId, state);
  }
}
