export type DriveType =
  | 'internal'
  | 'partition'
  | 'usb'
  | 'external-hdd'
  | 'external-ssd'
  | 'sd-card'
  | 'optical'
  | 'network'
  | 'encrypted'
  | 'unknown';

export type DriveCategory = 'internal' | 'removable' | 'network';

export type DriveHealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export type DriveConnectionState = 'connected' | 'disconnected' | 'mounting' | 'unmounting' | 'locked';

export interface SystemDrive {
  id: string;
  devicePath: string; // e.g. /dev/nvme0n1p2 or /dev/sdb1
  displayName: string; // Friendly name (e.g. System, Data, External SSD)
  label: string; // Filesystem label
  type: DriveType;
  category: DriveCategory;
  transport?: string; // nvme, sata, usb, etc.
  filesystem: string; // ext4, btrfs, ntfs, vfat, etc.
  uuid: string;
  mountPoint: string | null; // e.g. / or /media/user/USB_DRIVE
  isMounted: boolean;
  isRemovable: boolean;
  isEjectable: boolean;
  isReadOnly: boolean;
  isEncrypted: boolean;
  isSystemDrive: boolean;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  iconType?: string;
  healthStatus: DriveHealthStatus;
  connectionState: DriveConnectionState;
}
