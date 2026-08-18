import { StorageProvider, StorageDeviceEvent } from './StorageProvider';
import { SystemDrive } from '../models/drive';
import { FileEntry, FileInfo } from '../models/file-entry';

export class DemoStorageProvider implements StorageProvider {
  public id = 'demo-storage-provider';
  public name = 'Demo Storage Provider (Browser Sandbox)';
  public isNative = false;

  private drives: SystemDrive[] = [
    {
      id: 'drive_system',
      devicePath: '/dev/nvme0n1p2',
      displayName: 'System',
      label: 'WINDROID_ROOT',
      type: 'internal',
      category: 'internal',
      transport: 'nvme',
      filesystem: 'ext4',
      uuid: '8f92a104-e31b-4f93-8b1d-91a27e054112',
      mountPoint: '/',
      isMounted: true,
      isRemovable: false,
      isEjectable: false,
      isReadOnly: false,
      isEncrypted: false,
      isSystemDrive: true,
      totalBytes: 137438953472, // 128 GB
      usedBytes: 60129542144,  // 56 GB
      freeBytes: 77309411328,  // 72 GB
      usagePercent: 44,
      healthStatus: 'healthy',
      connectionState: 'connected',
    },
    {
      id: 'drive_data',
      devicePath: '/dev/nvme0n1p3',
      displayName: 'Data',
      label: 'USER_DATA',
      type: 'partition',
      category: 'internal',
      transport: 'nvme',
      filesystem: 'btrfs',
      uuid: 'c392b411-d922-41a2-998a-1129b8719f2a',
      mountPoint: '/mnt/data',
      isMounted: true,
      isRemovable: false,
      isEjectable: false,
      isReadOnly: false,
      isEncrypted: false,
      isSystemDrive: false,
      totalBytes: 549755813888, // 512 GB
      usedBytes: 109951162778, // 102 GB
      freeBytes: 439804651110, // 410 GB
      usagePercent: 20,
      healthStatus: 'healthy',
      connectionState: 'connected',
    },
    {
      id: 'drive_usb',
      devicePath: '/dev/sdb1',
      displayName: 'USB Drive',
      label: 'FLASH_DRIVE',
      type: 'usb',
      category: 'removable',
      transport: 'usb',
      filesystem: 'vfat',
      uuid: 'A1B2-C3D4',
      mountPoint: '/media/alex/FLASH_DRIVE',
      isMounted: true,
      isRemovable: true,
      isEjectable: true,
      isReadOnly: false,
      isEncrypted: false,
      isSystemDrive: false,
      totalBytes: 34359738368, // 32 GB
      usedBytes: 8589934592,  // 8 GB
      freeBytes: 25769803776, // 24 GB
      usagePercent: 25,
      healthStatus: 'healthy',
      connectionState: 'connected',
    },
    {
      id: 'drive_encrypted',
      devicePath: '/dev/sdc1',
      displayName: 'Encrypted Vault',
      label: 'LUKS_VAULT',
      type: 'encrypted',
      category: 'removable',
      transport: 'usb',
      filesystem: 'crypto_LUKS',
      uuid: '7d8e9f00-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
      mountPoint: null,
      isMounted: false,
      isRemovable: true,
      isEjectable: true,
      isReadOnly: false,
      isEncrypted: true,
      isSystemDrive: false,
      totalBytes: 107374182400, // 100 GB
      usedBytes: 0,
      freeBytes: 107374182400,
      usagePercent: 0,
      healthStatus: 'healthy',
      connectionState: 'locked',
    },
  ];

  private listeners: Set<(event: StorageDeviceEvent) => void> = new Set();

  public async getDrives(): Promise<SystemDrive[]> {
    return [...this.drives];
  }

  public async getDrive(id: string): Promise<SystemDrive | null> {
    return this.drives.find((d) => d.id === id) || null;
  }

  public async listDirectory(path: string): Promise<FileEntry[]> {
    // Basic mock listing
    return [];
  }

  public async getFileInfo(path: string): Promise<FileInfo> {
    return {
      id: path,
      name: path.split('/').pop() || 'Unknown',
      path,
      type: 'file',
      sizeBytes: 1024,
      sizeFormatted: '1 KB',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      location: path,
    };
  }

  public async createFolder(path: string, name: string): Promise<void> {}
  public async createFile(path: string, name: string): Promise<void> {}
  public async rename(path: string, newName: string): Promise<void> {}
  public async copy(sources: string[], destination: string): Promise<void> {}
  public async move(sources: string[], destination: string): Promise<void> {}
  public async delete(paths: string[], permanent = false): Promise<void> {}

  public async mount(deviceId: string): Promise<void> {
    const drive = this.drives.find((d) => d.id === deviceId);
    if (drive) {
      drive.isMounted = true;
      drive.connectionState = 'connected';
      drive.mountPoint = `/media/alex/${drive.displayName.replace(/\s+/g, '_')}`;
      this.notify({ type: 'drive_mounted', driveId: deviceId, drive, timestamp: Date.now() });
    }
  }

  public async unmount(deviceId: string): Promise<void> {
    const drive = this.drives.find((d) => d.id === deviceId);
    if (drive) {
      drive.isMounted = false;
      drive.mountPoint = null;
      drive.connectionState = 'disconnected';
      this.notify({ type: 'drive_unmounted', driveId: deviceId, drive, timestamp: Date.now() });
    }
  }

  public async eject(deviceId: string): Promise<void> {
    const index = this.drives.findIndex((d) => d.id === deviceId);
    if (index !== -1) {
      const [removed] = this.drives.splice(index, 1);
      this.notify({ type: 'drive_removed', driveId: deviceId, drive: removed, timestamp: Date.now() });
    }
  }

  public async unlock(deviceId: string, password?: string): Promise<boolean> {
    const drive = this.drives.find((d) => d.id === deviceId);
    if (drive && drive.isEncrypted) {
      if (password === 'correct' || password === 'admin' || password?.length! > 0) {
        drive.connectionState = 'connected';
        drive.isMounted = true;
        drive.mountPoint = `/media/alex/${drive.displayName.replace(/\s+/g, '_')}`;
        this.notify({ type: 'drive_unlocked', driveId: deviceId, drive, timestamp: Date.now() });
        return true;
      }
    }
    return false;
  }

  public subscribeToDeviceChanges(callback: (event: StorageDeviceEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(event: StorageDeviceEvent) {
    this.listeners.forEach((cb) => cb(event));
  }
}
