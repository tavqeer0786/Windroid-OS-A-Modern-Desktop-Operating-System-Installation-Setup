export type FileOperationType =
  | 'copy'
  | 'move'
  | 'delete'
  | 'restore'
  | 'mkdir'
  | 'mkfile'
  | 'rename'
  | 'unlock';

export type FileOperationStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FileOperationProgress {
  id: string;
  type: FileOperationType;
  sources: string[];
  destination: string;
  status: FileOperationStatus;
  totalBytes: number;
  transferredBytes: number;
  totalFiles: number;
  transferredFiles: number;
  currentFileName: string;
  progressPercent: number;
  bytesPerSecond?: number;
  errorMessage?: string;
  startTime: number;
  endTime?: number;
}
