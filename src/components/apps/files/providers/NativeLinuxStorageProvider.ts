import { StorageProvider, StorageDeviceEvent } from './StorageProvider';
import { SystemDrive } from '../models/drive';
import { FileEntry, FileInfo } from '../models/file-entry';
import { WindroidSystemBridge } from '../../../../services/WindroidSystemBridge';

export class NativeLinuxStorageProvider implements StorageProvider {
  public id = 'native-linux-storage-provider';
  public name = 'Native Windroid Linux Storage Service';
  public isNative = true;

  private get bridge() {
    if (typeof window !== 'undefined') {
      if (window.windroid?.storage) return window.windroid.storage;
      if (window.aether?.storage) return window.aether.storage;
    }
    return null;
  }

  public isAvailable(): boolean {
    return this.bridge !== null || WindroidSystemBridge.getInstance().isNativeProductionEnvironment();
  }

  public async getDrives(): Promise<SystemDrive[]> {
    if (this.bridge) {
      return await this.bridge.getDrives();
    }
    return await WindroidSystemBridge.getInstance().getStorageDevices();
  }

  public async getDrive(id: string): Promise<SystemDrive | null> {
    if (this.bridge) {
      return await this.bridge.getDrive(id);
    }
    const drives = await WindroidSystemBridge.getInstance().getStorageDevices();
    return drives.find((d) => d.id === id || d.devicePath === id) || null;
  }

  public async listDirectory(path: string): Promise<FileEntry[]> {
    if (this.bridge) return await this.bridge.listDirectory(path);
    return await WindroidSystemBridge.getInstance().listDirectory(path);
  }

  public async getFileInfo(path: string): Promise<FileInfo> {
    if (this.bridge) return await this.bridge.getFileInfo(path);
    return await WindroidSystemBridge.getInstance().getFileInfo(path);
  }

  public async createFolder(path: string, name: string): Promise<void> {
    if (this.bridge) return await this.bridge.createFolder(path, name);
    await WindroidSystemBridge.getInstance().createFolder(path, name);
  }

  public async createFile(path: string, name: string): Promise<void> {
    if (this.bridge) return await this.bridge.createFile(path, name);
    await WindroidSystemBridge.getInstance().createFile(path, name);
  }

  public async rename(path: string, newName: string): Promise<void> {
    if (this.bridge) return await this.bridge.rename(path, newName);
    await WindroidSystemBridge.getInstance().rename(path, newName);
  }

  public async copy(sources: string[], destination: string): Promise<void> {
    if (this.bridge) return await this.bridge.copy(sources, destination);
    await WindroidSystemBridge.getInstance().copy(sources, destination);
  }

  public async move(sources: string[], destination: string): Promise<void> {
    if (this.bridge) return await this.bridge.move(sources, destination);
    await WindroidSystemBridge.getInstance().move(sources, destination);
  }

  public async delete(paths: string[], permanent = false): Promise<void> {
    if (this.bridge) return await this.bridge.delete(paths, permanent);
    await WindroidSystemBridge.getInstance().delete(paths, permanent);
  }

  public async mount(deviceId: string): Promise<void> {
    if (this.bridge) return await this.bridge.mount(deviceId);
    await WindroidSystemBridge.getInstance().mountDevice(deviceId);
  }

  public async unmount(deviceId: string): Promise<void> {
    if (this.bridge) return await this.bridge.unmount(deviceId);
    await WindroidSystemBridge.getInstance().unmountDevice(deviceId);
  }

  public async eject(deviceId: string): Promise<void> {
    if (this.bridge) return await this.bridge.eject(deviceId);
    await WindroidSystemBridge.getInstance().ejectDevice(deviceId);
  }

  public async unlock(deviceId: string, password?: string): Promise<boolean> {
    if (this.bridge?.unlock) {
      return await this.bridge.unlock(deviceId, password);
    }
    const res = await WindroidSystemBridge.getInstance().unlockDevice(deviceId, password);
    return res.unlocked;
  }

  public subscribeToDeviceChanges(callback: (event: StorageDeviceEvent) => void): () => void {
    if (this.bridge) {
      return this.bridge.subscribe(callback);
    }
    return () => {};
  }
}
