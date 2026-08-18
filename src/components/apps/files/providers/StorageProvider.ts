import { SystemDrive } from '../models/drive';
import { FileEntry, FileInfo } from '../models/file-entry';

export type StorageDeviceEventType =
  | 'drive_added'
  | 'drive_removed'
  | 'drive_mounted'
  | 'drive_unmounted'
  | 'drive_updated'
  | 'drive_locked'
  | 'drive_unlocked';

export interface StorageDeviceEvent {
  type: StorageDeviceEventType;
  driveId: string;
  drive?: SystemDrive;
  timestamp: number;
}

export interface StorageProvider {
  id: string;
  name: string;
  isNative: boolean;
  getDrives(): Promise<SystemDrive[]>;
  getDrive(id: string): Promise<SystemDrive | null>;
  listDirectory(path: string): Promise<FileEntry[]>;
  getFileInfo(path: string): Promise<FileInfo>;
  createFolder(path: string, name: string): Promise<void>;
  createFile(path: string, name: string): Promise<void>;
  rename(path: string, newName: string): Promise<void>;
  copy(sources: string[], destination: string): Promise<void>;
  move(sources: string[], destination: string): Promise<void>;
  delete(paths: string[], permanent?: boolean): Promise<void>;
  mount(deviceId: string): Promise<void>;
  unmount(deviceId: string): Promise<void>;
  eject(deviceId: string): Promise<void>;
  unlock?(deviceId: string, password?: string): Promise<boolean>;
  subscribeToDeviceChanges(
    callback: (event: StorageDeviceEvent) => void
  ): () => void;
}
