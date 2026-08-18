import { SystemDrive } from '../components/apps/files/models/drive';
import { FileEntry, FileInfo } from '../components/apps/files/models/file-entry';
import { StorageDeviceEvent } from '../components/apps/files/providers/StorageProvider';
import { RuntimeStatus, PackageInspection, CompatibilityResult, InstallRequest } from '../system/runtime/AppRuntimeProvider';
import { NetworkDevice, WifiNetwork, SavedWifiNetwork, NetworkStatus, HotspotCapabilities } from './network';
import { BluetoothAdapter, BluetoothStatus, BluetoothDevice } from './bluetooth';

export interface CpuHardwareInfo {
  modelName: string;
  logicalCores: number;
  architecture: string;
}

export interface MemoryHardwareInfo {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  usagePercent: number;
  formattedTotal: string;
  formattedAvailable: string;
}

export interface GraphicsHardwareInfo {
  adapterName: string;
  driver: string;
}

export interface SystemHardwareInfo {
  hostname: string;
  osName: string;
  osVersion: string;
  kernelVersion: string;
  architecture: string;
  cpu: CpuHardwareInfo;
  memory: MemoryHardwareInfo;
  graphics: GraphicsHardwareInfo;
  isVirtualMachine: boolean;
  virtualizationProvider: string;
  isNative: boolean;
}

export interface TrashItem {
  trashId: string;
  originalPath: string;
  deletionDate: string;
  name: string;
  fileEntry?: FileEntry | null;
}

declare global {
  interface Window {
    __TAURI__?: {
      invoke<T = any>(cmd: string, args?: Record<string, unknown>): Promise<T>;
    };
    windroid?: {
      storage?: {
        getDrives(): Promise<SystemDrive[]>;
        getDrive(id: string): Promise<SystemDrive | null>;
        listDirectory(path: string): Promise<FileEntry[]>;
        getFileInfo(path: string): Promise<FileInfo>;
        createFolder(path: string, name: string): Promise<void>;
        createFile(path: string, name: string, content?: string): Promise<void>;
        rename(path: string, newName: string): Promise<void>;
        copy(sources: string[], destination: string): Promise<void>;
        move(sources: string[], destination: string): Promise<void>;
        delete(paths: string[], permanent?: boolean): Promise<void>;
        readFile(path: string): Promise<string>;
        writeFile(path: string, content: string): Promise<void>;
        getKnownFolders(): Promise<Record<string, string>>;
        getTrashItems(): Promise<TrashItem[]>;
        restoreTrashItem(trashId: string): Promise<void>;
        emptyTrash(): Promise<void>;
        mount(deviceId: string): Promise<void>;
        unmount(deviceId: string): Promise<void>;
        eject(deviceId: string): Promise<void>;
        unlock?(deviceId: string, password?: string): Promise<boolean>;
        subscribe(callback: (event: StorageDeviceEvent) => void): () => void;
      };
      nativebridge?: {
        getSystemInfo(): Promise<SystemHardwareInfo>;
        getMemoryInfo(): Promise<MemoryHardwareInfo>;
        getGraphicsInfo(): Promise<GraphicsHardwareInfo>;
        getStorageDevices(): Promise<SystemDrive[]>;
        getRuntimeStatus(): Promise<RuntimeStatus>;
        inspectPackage(path: string): Promise<PackageInspection>;
        checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult>;
        install(request: InstallRequest): Promise<any>;
        launch(appId: string): Promise<void>;
        terminate(appId: string): Promise<void>;
        uninstall(appId: string): Promise<void>;
      };
      network?: {
        getNetworkStatus(): Promise<NetworkStatus>;
        getNetworkDevices(): Promise<NetworkDevice[]>;
        getWifiNetworks(): Promise<{ wifiAvailable: boolean; hasAdapter: boolean; wifiEnabled: boolean; networks: WifiNetwork[]; message?: string }>;
        setWifiEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }>;
        connectWifi(ssid: string, password?: string): Promise<{ success: boolean; connectedSSID?: string; error?: string }>;
        disconnectWifi(ssid?: string, interfaceName?: string): Promise<{ success: boolean; error?: string }>;
        getSavedWifiNetworks(): Promise<SavedWifiNetwork[]>;
        forgetWifiNetwork(ssid: string): Promise<{ success: boolean; error?: string }>;
        getHotspotCapabilities(): Promise<HotspotCapabilities>;
        startHotspot(ssid?: string, password?: string): Promise<{ success: boolean; active?: boolean; ssid?: string; error?: string }>;
        stopHotspot(): Promise<{ success: boolean; error?: string }>;
        setAirplaneMode(enabled: boolean): Promise<{ success: boolean; airplaneMode: boolean }>;
      };
      bluetooth?: {
        getStatus(): Promise<BluetoothStatus>;
        getAdapters(): Promise<BluetoothAdapter[]>;
        setPowered(powered: boolean): Promise<{ success: boolean; powered: boolean; error?: string; errorCode?: string }>;
        getDevices(): Promise<BluetoothDevice[]>;
        startDiscovery(): Promise<{ success: boolean; discovering: boolean; error?: string; errorCode?: string }>;
        stopDiscovery(): Promise<{ success: boolean; discovering: boolean; error?: string; errorCode?: string }>;
        pair(address: string): Promise<{ success: boolean; paired?: boolean; requiresPin?: boolean; pinPrompt?: string; error?: string; errorCode?: string }>;
        respondToPairing(address: string, accept: boolean, pin?: string): Promise<{ success: boolean; error?: string; errorCode?: string }>;
        connect(address: string): Promise<{ success: boolean; connected?: boolean; error?: string; errorCode?: string }>;
        disconnect(address: string): Promise<{ success: boolean; error?: string; errorCode?: string }>;
        removeDevice(address: string): Promise<{ success: boolean; error?: string; errorCode?: string }>;
      };
      winbridge?: any;
      droidbridge?: any;
    };
    aether?: Window['windroid'];
  }
}
