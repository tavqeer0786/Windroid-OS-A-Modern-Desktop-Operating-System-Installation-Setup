import { FileOperationProgress, FileOperationType, FileOperationStatus } from '../models/file-operation';
import { isProtectedSystemItem } from '../../../../services/SystemAppRegistry';

export type FileOperationListener = (operations: FileOperationProgress[]) => void;

export type ValidationOperationType =
  | 'delete'
  | 'permanent-delete'
  | 'move'
  | 'copy'
  | 'rename'
  | 'overwrite'
  | 'trash'
  | 'restore';

export interface FileOperationValidationRequest<T = any> {
  operation: ValidationOperationType;
  sourceItems: T[];
  destination?: string | T;
}

export interface FileOperationValidationResult<T = any> {
  allowed: boolean;
  blockedItems: T[];
  allowedItems: T[];
  reason?: string;
}

export function validateFileOperation<T extends Record<string, any>>(
  request: FileOperationValidationRequest<T>
): FileOperationValidationResult<T> {
  const { operation, sourceItems } = request;
  const blockedItems: T[] = [];
  const allowedItems: T[] = [];

  for (const item of sourceItems) {
    if (isProtectedSystemItem(item)) {
      blockedItems.push(item);
    } else {
      allowedItems.push(item);
    }
  }

  if (blockedItems.length === 0) {
    return {
      allowed: true,
      blockedItems: [],
      allowedItems,
    };
  }

  const firstBlocked = blockedItems[0];
  const appName = blockedItems.length === 1 
    ? (firstBlocked?.name?.replace(/\.app$/, '') || 'System application')
    : `${blockedItems.length} protected system applications`;

  let reason = 'This system application is protected.';
  switch (operation) {
    case 'delete':
    case 'permanent-delete':
    case 'trash':
      reason = blockedItems.length === 1 
        ? `${appName} is required by Windroid OS and cannot be deleted.`
        : `${blockedItems.length} protected system items are required by Windroid OS and cannot be deleted.`;
      break;
    case 'move':
      reason = blockedItems.length === 1
        ? 'System applications cannot be moved from their installation folder.'
        : 'Protected system applications cannot be moved from their installation folder.';
      break;
    case 'copy':
      reason = 'System application files cannot be copied. Create a shortcut instead.';
      break;
    case 'rename':
      reason = 'Built-in system application names cannot be changed.';
      break;
    case 'overwrite':
      reason = 'You cannot replace a protected Windroid OS application.';
      break;
  }

  return {
    allowed: false,
    blockedItems,
    allowedItems,
    reason,
  };
}

export class FileOperationManager {
  private static instance: FileOperationManager;
  private operations: Map<string, FileOperationProgress> = new Map();
  private listeners: Set<FileOperationListener> = new Set();

  public static getInstance(): FileOperationManager {
    if (!FileOperationManager.instance) {
      FileOperationManager.instance = new FileOperationManager();
    }
    return FileOperationManager.instance;
  }

  public validateFileOperation<T extends { id?: string; name?: string; isProtected?: boolean; isSystemItem?: boolean; systemAppId?: string; path?: string; type?: string }>(
    request: FileOperationValidationRequest<T>
  ): FileOperationValidationResult<T> {
    return validateFileOperation(request);
  }

  public subscribe(listener: FileOperationListener): () => void {
    this.listeners.add(listener);
    listener(this.getOperations());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getOperations(): FileOperationProgress[] {
    return Array.from(this.operations.values());
  }

  public getActiveOperations(): FileOperationProgress[] {
    return this.getOperations().filter(
      (op) => op.status === 'in_progress' || op.status === 'pending'
    );
  }

  public startOperation(
    type: FileOperationType,
    sources: string[],
    destination: string,
    totalBytes: number,
    totalFiles: number
  ): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const op: FileOperationProgress = {
      id,
      type,
      sources,
      destination,
      status: 'in_progress',
      totalBytes,
      transferredBytes: 0,
      totalFiles,
      transferredFiles: 0,
      currentFileName: sources[0]?.split('/').pop() || '',
      progressPercent: 0,
      startTime: Date.now(),
    };

    this.operations.set(id, op);
    this.notify();
    return id;
  }

  public updateProgress(
    id: string,
    transferredBytes: number,
    transferredFiles: number,
    currentFileName: string,
    bytesPerSecond?: number
  ) {
    const op = this.operations.get(id);
    if (!op) return;

    op.transferredBytes = transferredBytes;
    op.transferredFiles = transferredFiles;
    op.currentFileName = currentFileName;
    op.bytesPerSecond = bytesPerSecond;
    op.progressPercent = op.totalBytes > 0 
      ? Math.min(100, Math.round((transferredBytes / op.totalBytes) * 100)) 
      : 100;

    if (op.progressPercent >= 100) {
      op.status = 'completed';
      op.endTime = Date.now();
    }

    this.operations.set(id, op);
    this.notify();
  }

  public cancelOperation(id: string) {
    const op = this.operations.get(id);
    if (!op) return;
    op.status = 'cancelled';
    op.endTime = Date.now();
    this.operations.set(id, op);
    this.notify();
  }

  public failOperation(id: string, errorMessage: string) {
    const op = this.operations.get(id);
    if (!op) return;
    op.status = 'failed';
    op.errorMessage = errorMessage;
    op.endTime = Date.now();
    this.operations.set(id, op);
    this.notify();
  }

  public clearCompleted() {
    for (const [id, op] of this.operations.entries()) {
      if (op.status === 'completed' || op.status === 'cancelled' || op.status === 'failed') {
        this.operations.delete(id);
      }
    }
    this.notify();
  }

  private notify() {
    const ops = this.getOperations();
    this.listeners.forEach((l) => l(ops));
  }
}
