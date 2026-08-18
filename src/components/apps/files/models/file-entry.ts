export interface FilePermissionState {
  readable: boolean;
  writable: boolean;
  executable: boolean;
  ownerName?: string;
  groupName?: string;
  unixPermissions?: string; // e.g., '0755' or 'rwxr-xr-x'
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder' | 'drive' | 'symlink';
  sizeBytes: number;
  sizeFormatted: string;
  extension?: string;
  createdAt: string;
  modifiedAt: string;
  accessedAt?: string;
  parentId?: string | null;
  content?: string;
  isProtected?: boolean;
  isSystemItem?: boolean;
  protectionType?: string;
  systemAppId?: string;
  canDelete?: boolean;
  canMove?: boolean;
  canCopy?: boolean;
  canRename?: boolean;
  canModify?: boolean;
  targetType?: 'system-app' | 'file' | 'folder';
  targetId?: string;
  isPinned?: boolean;
  icon?: string;
  children?: FileEntry[];
  permissions?: FilePermissionState;
}

export interface FileInfo extends FileEntry {
  mimeType?: string;
  location: string;
  sizeOnDiskBytes?: number;
  isSymbolicLink?: boolean;
  targetPath?: string;
}
