import { InstallationSession } from './InstallerTypes';
import { InstallationPlan, InstallationPlanOperation } from './InstallationPlanTypes';

export type InstallerExecutionState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'paused'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'failed';

export type ExecutionProgressStage =
  | 'idle'
  | 'preparing'
  | 'verifying'
  | 'resolving-runtime'
  | 'preparing-runtime'
  | 'preparing-destination'
  | 'installing'
  | 'applying-permissions'
  | 'registering'
  | 'creating-shortcuts'
  | 'pinning-dock'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionProgressEvent {
  sessionId: string;
  stage: ExecutionProgressStage;
  message: string;
  percent: number;
  operationId?: string;
  operationKind?: string;
  timestamp: number;
}

export interface InstallerExecutionCallbacks {
  onProgress?: (event: ExecutionProgressEvent) => void;
  onStateChange?: (state: InstallerExecutionState) => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onComplete?: (result?: InstallationSession['result']) => void;
  onError?: (error: { code: string; message: string; title: string }) => void;
}

export interface ExecutionSessionStatus {
  sessionId: string;
  state: InstallerExecutionState;
  currentOperation?: InstallationPlanOperation;
  stage: ExecutionProgressStage;
  percent: number;
  message: string;
  supportsPause: boolean;
  supportsResume: boolean;
  startedAt?: number;
  completedAt?: number;
}
