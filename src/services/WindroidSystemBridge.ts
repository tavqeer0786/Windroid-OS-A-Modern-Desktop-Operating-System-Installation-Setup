import { SystemDrive } from '../components/apps/files/models/drive';
import { FileEntry, FileInfo } from '../components/apps/files/models/file-entry';
import { StorageDeviceEvent } from '../components/apps/files/providers/StorageProvider';
import {
  RuntimeStatus,
  PackageInspection,
  CompatibilityResult
} from '../system/runtime/AppRuntimeProvider';
import {
  SystemHardwareInfo,
  MemoryHardwareInfo,
  GraphicsHardwareInfo,
  TrashItem
} from '../types/windroid-global';
import { NetworkDevice, WifiNetwork, SavedWifiNetwork, NetworkStatus, HotspotCapabilities } from '../types/network';
import { BluetoothAdapter, BluetoothStatus, BluetoothDevice } from '../types/bluetooth';
import {
  SystemCapabilities,
  DisplayInfo,
  AudioStatus,
  PowerStatus,
  PowerAction,
  DEFAULT_SYSTEM_CAPABILITIES
} from '../types/hardware';
import {
  UserAccount,
  SessionStatus,
  DeviceIdentity,
  LocaleSettings,
  UserPreferences,
  RuntimeMode
} from '../types/user-session';
import {
  InstallerDisk,
  InstallerStatus,
  InstallationPlan,
  BootMode,
  InstallationMode,
  UserConfig,
  LocaleConfig,
  GetInstallerDisksResponse,
  NativeInstallerStateResponse
} from '../types/installer';

const NATIVE_HTTP_BRIDGE_URL = 'http://127.0.0.1:4174';

/**
 * Windows 11 Logarithmic Perceptual Brightness Curve (CIE 1931 Formula)
 */
export class CIE1931PerceptualCurve {
  /**
   * Converts UI Slider percentage (0.0 to 100.0%) to raw sysfs backlight value.
   * Y = ((L* + 16) / 116)^3
   */
  static sliderPercentToRaw(sliderPercent: number, minRaw: number = 25, maxRaw: number = 1000): number {
    const L = Math.max(0, Math.min(100, sliderPercent));
    if (L <= 0) return minRaw;

    let Y: number;
    if (L > 8.0) {
      Y = Math.pow((L + 16.0) / 116.0, 3.0);
    } else {
      Y = L / 903.3;
    }

    const rawRange = maxRaw - minRaw;
    return Math.round(minRaw + (Y * rawRange));
  }

  /**
   * Converts sysfs raw hardware brightness value back to UI Slider percentage (0.0 to 100.0%).
   */
  static rawToSliderPercent(rawVal: number, minRaw: number = 25, maxRaw: number = 1000): number {
    const clampedRaw = Math.max(minRaw, Math.min(maxRaw, rawVal));
    const rawRange = maxRaw - minRaw;
    if (rawRange <= 0) return 0;

    const Y = (clampedRaw - minRaw) / rawRange;
    let L: number;
    if (Y > 0.008856) {
      L = (116.0 * Math.pow(Y, 1 / 3)) - 16.0;
    } else {
      L = Y * 903.3;
    }

    return Math.round(Math.max(0, Math.min(100, L)) * 10) / 10;
  }
}

export class WindroidSystemBridge {
  private static instance: WindroidSystemBridge;
  private isTauriEnv: boolean = false;
  public isNativeBridgeAvailable: boolean = false;

  // The native bridge protects every POST endpoint with a short-lived
  // bridge session token. The token is obtained from the read-only
  // /api/session/token endpoint and refreshed automatically after a 401.
  private bridgeSessionToken: string | null = null;
  private bridgeTokenPromise: Promise<string | null> | null = null;

  private storageListeners: Set<(event: StorageDeviceEvent) => void> = new Set();

  private currentBrightness: number = 80;
  private currentMasterVolume: number = 75;

  private constructor() {
    this.detectEnvironment();
    this.migrateLegacyStorage();
    this.initializeGlobalBridge();
  }

  public static getInstance(): WindroidSystemBridge {
    if (!WindroidSystemBridge.instance) {
      WindroidSystemBridge.instance = new WindroidSystemBridge();
    }
    return WindroidSystemBridge.instance;
  }

  public isNative(): boolean {
    return this.isTauriEnv || this.isNativeBridgeAvailable;
  }

  public isNativeProductionEnvironment(): boolean {
    if (typeof window === 'undefined') return false;

    // Vite development mode must never be treated as native production,
    // even though the dev server normally runs on localhost.
    if (import.meta.env.DEV) {
      return false;
    }

    const protocol = window.location.protocol;
    const host = window.location.hostname;

    const isFileRuntime = protocol === 'file:';
    const isCloudHost =
      host.includes('.run.app') ||
      host.includes('webcontainer') ||
      host.includes('stackblitz') ||
      host.includes('codesandbox');

    if (isCloudHost) {
      return false;
    }

    const isLocalNativeHost =
      host === '127.0.0.1' ||
      host === 'localhost';

    return isFileRuntime || isLocalNativeHost;
  }

  public async checkNativeBridge(forceRetry: boolean = false): Promise<boolean> {
    if (this.isTauriEnv && window.__TAURI__?.invoke) {
      this.isNativeBridgeAvailable = true;
      return true;
    }

    if (this.isNativeBridgeAvailable && !forceRetry) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    if (!this.isNativeProductionEnvironment()) {
      this.isNativeBridgeAvailable = false;
      return false;
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 5000);

        let res: Response;

        try {
          res = await fetch(`${NATIVE_HTTP_BRIDGE_URL}/api/health`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal
          });
        } finally {
          window.clearTimeout(timeoutId);
        }

        if (res.ok) {
          const data = await res.json().catch(() => null);

          if (
            data &&
            (
              data.status === 'ok' ||
              data.isNative === true
            )
          ) {
            this.isNativeBridgeAvailable = true;
            return true;
          }
        }
      } catch {
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    this.isNativeBridgeAvailable = false;
    this.bridgeSessionToken = null;
    return false;
  }

  private detectEnvironment() {
    this.isTauriEnv = typeof window !== 'undefined' && !!window.__TAURI__?.invoke;
  }

  private migrateLegacyStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const keysToMigrate = ['aether_desktop_layout', 'aether_installed_apps', 'aether_settings', 'aether_recent_files'];
      for (const oldKey of keysToMigrate) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          const newKey = oldKey.replace('aether_', 'windroid_');
          if (!localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, val);
          }
          localStorage.removeItem(oldKey);
        }
      }
    } catch (err) {
      console.warn('[WindroidSystemBridge] Storage migration notice:', err);
    }
  }

  private initializeGlobalBridge() {
    if (typeof window === 'undefined') return;

    window.windroid = window.windroid || {};

    // Native Bridge API
    window.windroid.nativebridge = {
      getSystemInfo: () => this.getSystemInfo(),
      getMemoryInfo: () => this.getMemoryInfo(),
      getGraphicsInfo: () => this.getGraphicsInfo(),
      getStorageDevices: () => this.getStorageDevices(),
      getRuntimeStatus: async (): Promise<RuntimeStatus> => ({
        runtime: 'native',
        status: 'running',
        message: this.isNativeBridgeAvailable
          ? 'Operating natively on Windroid OS (Debian 12)'
          : 'Native System Bridge unavailable',
        version: '1.0.0',
        isNativeAvailable: this.isNativeBridgeAvailable,
        activeContainersOrPrefixes: 0
      }),
      inspectPackage: async (path: string): Promise<PackageInspection> => ({
        packageName: 'com.windroid.app',
        displayName: 'Package Inspection',
        publisher: 'Windroid OS',
        version: '1.0.0',
        runtime: 'native',
        fileType: 'flatpak',
        architecture: 'x86_64',
        estimatedSize: '10 MB',
        sizeBytes: 10485760,
        permissions: [],
        packageHash: 'sha256:00000',
        knownLimitations: [],
        isSigned: true,
        sourcePath: path
      }),
      checkCompatibility: async (): Promise<CompatibilityResult> => ({
        rating: 'excellent',
        statusText: 'Native Windroid Linux Application',
        details: ['Fully compatible with Debian 12 Bookworm'],
        passesArchCheck: true,
        requiredLibraries: ['glibc'],
        graphicsBackend: 'Direct Hardware'
      }),
      install: async () => ({ success: true }),
      launch: async () => {},
      terminate: async () => {},
      uninstall: async () => {}
    };

    // Storage API
    window.windroid.storage = {
      getDrives: () => this.getStorageDevices(),
      getDrive: async (id: string) => {
        const drives = await this.getStorageDevices();
        return drives.find((d) => d.id === id) || null;
      },
      listDirectory: (path: string) => this.listDirectory(path),
      getFileInfo: (path: string) => this.getFileInfo(path),
      createFolder: (path: string, name: string) => this.createFolder(path, name),
      createFile: (path: string, name: string, content?: string) => this.createFile(path, name, content),
      rename: (path: string, newName: string) => this.rename(path, newName),
      copy: (sources: string[], destination: string) => this.copy(sources, destination),
      move: (sources: string[], destination: string) => this.move(sources, destination),
      delete: (paths: string[], permanent?: boolean) => this.delete(paths, permanent),
      readFile: (path: string) => this.readFile(path),
      writeFile: (path: string, content: string) => this.writeFile(path, content),
      getKnownFolders: () => this.getKnownFolders(),
      getTrashItems: () => this.getTrashItems(),
      restoreTrashItem: (trashId: string) => this.restoreTrashItem(trashId),
      emptyTrash: () => this.emptyTrash(),
      mount: async (deviceId: string) => {
        await this.fetchBridge('/api/drives/mount', {
          method: 'POST',
          body: JSON.stringify({ deviceId })
        });
      },
      unmount: async (deviceId: string) => {
        await this.fetchBridge('/api/drives/unmount', {
          method: 'POST',
          body: JSON.stringify({ deviceId })
        });
      },
      eject: async (deviceId: string) => {
        await this.fetchBridge('/api/drives/eject', {
          method: 'POST',
          body: JSON.stringify({ deviceId })
        });
      },
      unlock: async () => true,
      subscribe: (callback: (event: StorageDeviceEvent) => void) => {
        this.storageListeners.add(callback);
        return () => this.storageListeners.delete(callback);
      }
    };

    // Network API
    window.windroid.network = {
      getNetworkStatus: () => this.getNetworkStatus(),
      getNetworkDevices: () => this.getNetworkDevices(),
      getWifiNetworks: () => this.getWifiNetworks(),
      setWifiEnabled: (enabled: boolean) => this.setWifiEnabled(enabled),
      connectWifi: (ssid: string, password?: string) => this.connectWifi(ssid, password),
      disconnectWifi: (ssid?: string, interfaceName?: string) => this.disconnectWifi(ssid, interfaceName),
      getSavedWifiNetworks: () => this.getSavedWifiNetworks(),
      forgetWifiNetwork: (ssid: string) => this.forgetWifiNetwork(ssid),
      getHotspotCapabilities: () => this.getHotspotCapabilities(),
      startHotspot: (ssid?: string, password?: string) => this.startHotspot(ssid, password),
      stopHotspot: () => this.stopHotspot(),
      setAirplaneMode: (enabled: boolean) => this.setAirplaneMode(enabled)
    };

    // Bluetooth API
    window.windroid.bluetooth = {
      getStatus: () => this.getBluetoothStatus(),
      getAdapters: () => this.getBluetoothAdapters(),
      setPowered: (powered: boolean) => this.setBluetoothPowered(powered),
      getDevices: () => this.getBluetoothDevices(),
      startDiscovery: () => this.startBluetoothDiscovery(),
      stopDiscovery: () => this.stopBluetoothDiscovery(),
      pair: (address: string) => this.pairBluetoothDevice(address),
      respondToPairing: (address: string, accept: boolean, pin?: string) => this.respondToBluetoothPairing(address, accept, pin),
      connect: (address: string) => this.connectBluetoothDevice(address),
      disconnect: (address: string) => this.disconnectBluetoothDevice(address),
      removeDevice: (address: string) => this.removeBluetoothDevice(address)
    };

    // Alias aether for backwards compatibility
    window.aether = window.windroid;
  }

  private async getBridgeSessionToken(forceRefresh: boolean = false): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!forceRefresh && this.bridgeSessionToken) {
      return this.bridgeSessionToken;
    }

    if (!forceRefresh && this.bridgeTokenPromise) {
      return this.bridgeTokenPromise;
    }

    this.bridgeTokenPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 5000);

        let res: Response;

        try {
          res = await fetch(`${NATIVE_HTTP_BRIDGE_URL}/api/session/token`, {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal
          });
        } finally {
          window.clearTimeout(timeoutId);
        }

        if (!res.ok) {
          return null;
        }

        const data = await res.json().catch(() => null);

        if (
          data &&
          data.success === true &&
          typeof data.token === 'string' &&
          data.token.length > 0
        ) {
          this.bridgeSessionToken = data.token;
          return data.token;
        }
      } catch {
        // Token endpoint unavailable.
      }

      return null;
    })();

    try {
      return await this.bridgeTokenPromise;
    } finally {
      this.bridgeTokenPromise = null;
    }
  }

  private async fetchBridge<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnUnauthorized: boolean = true,
    isRetryAttempt: boolean = false
  ): Promise<T> {
    const token = await this.getBridgeSessionToken();

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('X-Windroid-Bridge-Token', token);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    let res: Response;

    try {
      res = await fetch(`${NATIVE_HTTP_BRIDGE_URL}${endpoint}`, {
        ...options,
        headers,
        cache: 'no-store',
        signal: options.signal || controller.signal
      });
    } catch (fetchErr: any) {
      window.clearTimeout(timeoutId);
      if (!isRetryAttempt) {
        await new Promise(r => setTimeout(r, 300));
        await this.checkNativeBridge(true);
        return this.fetchBridge<T>(endpoint, options, retryOnUnauthorized, true);
      }
      throw new Error(`NETWORK_ERROR: Failed to connect to Native System Bridge at http://127.0.0.1:4174 (${fetchErr?.message || 'Connection refused'}).`);
    } finally {
      window.clearTimeout(timeoutId);
    }

    // The bridge token is regenerated when the native service restarts.
    // Refresh it once and retry the original request after a 401.
    if (res.status === 401 && retryOnUnauthorized) {
      this.bridgeSessionToken = null;

      const refreshedToken = await this.getBridgeSessionToken(true);

      if (refreshedToken) {
        return this.fetchBridge<T>(
          endpoint,
          {
            ...options,
            headers: {
              ...(options.headers || {}),
              'Content-Type': 'application/json',
              'X-Windroid-Bridge-Token': refreshedToken
            }
          },
          false
        );
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));

      throw new Error(
        errData?.error ||
        `HTTP ${res.status}: Native operation failed`
      );
    }

    const text = await res.text();

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Native bridge returned invalid JSON for ${endpoint}`
      );
    }
  }

  public async getStorageDevices(): Promise<SystemDrive[]> {
    if (this.isTauriEnv && window.__TAURI__?.invoke) {
      try {
        const devices = await window.__TAURI__.invoke<SystemDrive[]>('get_storage_devices');
        if (devices && Array.isArray(devices) && devices.length > 0) return devices;
      } catch (err) {
        console.warn('[WindroidSystemBridge] Tauri get_storage_devices failed:', err);
      }
    }

    const isAvailable = await this.checkNativeBridge();
    if (isAvailable) {
      try {
        return await this.fetchBridge<SystemDrive[]>('/api/drives');
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch native storage devices:', err);
        return [];
      }
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return [];
    }

    // Browser development mode fallback ONLY
    return [
      {
        id: 'drive_system_dev',
        devicePath: '/dev/dev0p1',
        displayName: 'Development Filesystem (Browser)',
        label: 'WINDROID_DEV',
        type: 'internal',
        category: 'internal',
        transport: 'virtual',
        filesystem: 'ext4',
        uuid: '00000000-0000-0000-0000-000000000000',
        mountPoint: '/',
        isMounted: true,
        isRemovable: false,
        isEjectable: false,
        isReadOnly: false,
        isEncrypted: false,
        isSystemDrive: true,
        totalBytes: 128849018880,
        usedBytes: 42949672960,
        freeBytes: 85899345920,
        usagePercent: 33,
        healthStatus: 'healthy',
        connectionState: 'connected'
      }
    ];
  }

  public async listDirectory(path: string): Promise<FileEntry[]> {
    try {
      const res = await this.fetchBridge<{ entries: FileEntry[] }>('/api/fs/list', {
        method: 'POST',
        body: JSON.stringify({ path })
      });
      return res.entries || [];
    } catch {
      return [];
    }
  }

  public async getFileInfo(path: string): Promise<FileInfo> {
    try {
      const res = await this.fetchBridge<{ metadata: FileInfo }>('/api/fs/metadata', {
        method: 'POST',
        body: JSON.stringify({ path })
      });
      return res.metadata;
    } catch {
      return {
        id: path,
        name: path.split('/').pop() || 'file',
        path,
        type: 'file',
        sizeBytes: 0,
        sizeFormatted: '0 B',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        location: path
      };
    }
  }

  public async createFolder(path: string, name: string): Promise<void> {
    await this.fetchBridge('/api/fs/create-folder', {
      method: 'POST',
      body: JSON.stringify({ path, name })
    });
  }

  public async createFile(path: string, name: string, content: string = ''): Promise<void> {
    await this.fetchBridge('/api/fs/create-file', {
      method: 'POST',
      body: JSON.stringify({ path, name, content })
    });
  }

  public async rename(path: string, newName: string): Promise<void> {
    await this.fetchBridge('/api/fs/rename', {
      method: 'POST',
      body: JSON.stringify({ path, newName })
    });
  }

  public async copy(sources: string[], destination: string): Promise<void> {
    await this.fetchBridge('/api/fs/copy', {
      method: 'POST',
      body: JSON.stringify({ sources, destination })
    });
  }

  public async move(sources: string[], destination: string): Promise<void> {
    await this.fetchBridge('/api/fs/move', {
      method: 'POST',
      body: JSON.stringify({ sources, destination })
    });
  }

  public async delete(paths: string[], permanent: boolean = false): Promise<void> {
    await this.fetchBridge('/api/fs/delete', {
      method: 'POST',
      body: JSON.stringify({ paths, permanent })
    });
  }

  public async mountDevice(deviceId: string): Promise<void> {
    await this.fetchBridge('/api/storage/mount', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    });
  }

  public async unmountDevice(deviceId: string): Promise<void> {
    await this.fetchBridge('/api/storage/unmount', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    });
  }

  public async ejectDevice(deviceId: string): Promise<void> {
    await this.fetchBridge('/api/storage/eject', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    });
  }

  public async unlockDevice(deviceId: string, password?: string): Promise<{ unlocked: boolean; message?: string }> {
    try {
      const res = await this.fetchBridge<{ success: boolean; error?: string }>('/api/storage/unlock', {
        method: 'POST',
        body: JSON.stringify({ deviceId, password })
      });
      return { unlocked: !!res.success, message: res.error };
    } catch (e: any) {
      return { unlocked: false, message: e?.message || 'Unlock failed' };
    }
  }

  public async readFile(path: string): Promise<string> {
    const res = await this.fetchBridge<{ content: string }>('/api/fs/read-file', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
    return res.content || '';
  }

  public async writeFile(path: string, content: string): Promise<void> {
    await this.fetchBridge('/api/fs/write-file', {
      method: 'POST',
      body: JSON.stringify({ path, content })
    });
  }

  public async getKnownFolders(): Promise<Record<string, string>> {
    try {
      const res = await this.fetchBridge<{ knownFolders: Record<string, string> }>('/api/fs/known-folders');
      return res.knownFolders;
    } catch {
      return {
        home: '/home/user',
        desktop: '/home/user/Desktop',
        documents: '/home/user/Documents',
        downloads: '/home/user/Downloads',
        music: '/home/user/Music',
        pictures: '/home/user/Pictures',
        videos: '/home/user/Videos'
      };
    }
  }

  public async getTrashItems(): Promise<TrashItem[]> {
    try {
      const res = await this.fetchBridge<{ trashItems: TrashItem[] }>('/api/fs/trash');
      return res.trashItems || [];
    } catch {
      return [];
    }
  }

  public async restoreTrashItem(trashId: string): Promise<void> {
    await this.fetchBridge('/api/fs/trash/restore', {
      method: 'POST',
      body: JSON.stringify({ trashId })
    });
  }

  public async emptyTrash(): Promise<void> {
    await this.fetchBridge('/api/fs/trash/empty', {
      method: 'POST'
    });
  }

  public async getSystemInfo(): Promise<SystemHardwareInfo> {
    if (this.isTauriEnv && window.__TAURI__?.invoke) {
      try {
        const info = await window.__TAURI__.invoke<SystemHardwareInfo>('get_system_info');
        if (info) return info;
      } catch (err) {
        console.warn('[WindroidSystemBridge] Tauri get_system_info failed:', err);
      }
    }

    const isAvailable = await this.checkNativeBridge();
    if (isAvailable) {
      try {
        return await this.fetchBridge<SystemHardwareInfo>('/api/system-info');
      } catch (err) {
        console.warn('[WindroidSystemBridge] Native system info fetch failed:', err);
      }
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        hostname: 'Windroid-Host',
        osName: 'Windroid OS 1.0 (Native Bridge Error)',
        osVersion: '1.0.0',
        kernelVersion: 'Linux',
        architecture: 'x86_64',
        cpu: {
          modelName: 'Native System Bridge Unreachable (127.0.0.1:4174)',
          logicalCores: 0,
          architecture: 'x86_64'
        },
        memory: {
          totalBytes: 0,
          availableBytes: 0,
          usedBytes: 0,
          usagePercent: 0,
          formattedTotal: '0 GB',
          formattedAvailable: '0 GB'
        },
        graphics: {
          adapterName: 'Unknown',
          driver: 'Unknown'
        },
        isVirtualMachine: false,
        virtualizationProvider: 'None',
        isNative: true
      };
    }

    // Browser development mode fallback
    const memory = await this.getMemoryInfo();
    return {
      hostname: 'Windroid-DevBrowser',
      osName: 'Windroid OS (Browser Development Mode)',
      osVersion: '1.0.0 Dev',
      kernelVersion: 'Linux 6.12.0-sim',
      architecture: 'x86_64',
      cpu: {
        modelName: 'Browser Sandbox Virtual CPU',
        logicalCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
        architecture: 'x86_64'
      },
      memory,
      graphics: {
        adapterName: 'WebGL / Canvas Renderer',
        driver: 'browser-host'
      },
      isVirtualMachine: true,
      virtualizationProvider: 'Browser Sandbox',
      isNative: false
    };
  }

  public async getMemoryInfo(): Promise<MemoryHardwareInfo> {
    if (this.isNativeBridgeAvailable) {
      try {
        const sysInfo = await this.getSystemInfo();
        if (sysInfo && sysInfo.memory) {
          return sysInfo.memory;
        }
      } catch (_) {}
    }
    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        totalBytes: 0,
        availableBytes: 0,
        usedBytes: 0,
        usagePercent: 0,
        formattedTotal: 'Hardware information unavailable',
        formattedAvailable: 'Native bridge offline'
      };
    }
    return {
      totalBytes: 8589934592,
      availableBytes: 5368709120,
      usedBytes: 3221225472,
      usagePercent: 37,
      formattedTotal: '8.00 GB',
      formattedAvailable: '5.00 GB free'
    };
  }

  public async getGraphicsInfo(): Promise<GraphicsHardwareInfo> {
    if (this.isNativeBridgeAvailable) {
      try {
        const sysInfo = await this.getSystemInfo();
        if (sysInfo && sysInfo.graphics) {
          return sysInfo.graphics;
        }
      } catch (_) {}
    }
    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        adapterName: 'Hardware information unavailable',
        driver: 'Native bridge offline'
      };
    }
    return {
      adapterName: 'WebGL / Canvas Graphics',
      driver: 'host-graphics'
    };
  }

  // --- NETWORK API METHODS ---
  public async getNetworkStatus(): Promise<NetworkStatus> {
    if (this.isNativeBridgeAvailable) {
      try {
        return await this.fetchBridge<NetworkStatus>('/api/network/status');
      } catch (err) {
        console.warn('[WindroidSystemBridge] getNetworkStatus failed:', err);
      }
    }
    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        connectivity: 'none',
        wifiEnabled: false,
        wifiHardwareEnabled: false,
        airplaneMode: false,
        ethernetConnected: false,
        virtualBoxEnv: false,
        primaryDevice: undefined
      };
    }
    return {
      connectivity: 'full',
      wifiEnabled: true,
      wifiHardwareEnabled: true,
      airplaneMode: false,
      ethernetConnected: true,
      virtualBoxEnv: false,
      primaryDevice: {
        id: 'dev-eth0',
        interfaceName: 'dev-eth0',
        type: 'ethernet',
        state: 'connected',
        managed: true,
        hardwareAddress: '00:00:00:00:00:00',
        driver: 'browser-dev-mock',
        connectionName: 'Browser Dev Connection',
        ipAddresses: ['127.0.0.1/8'],
        gateway: '127.0.0.1',
        dnsServers: ['127.0.0.1'],
        speedMbps: 1000
      }
    };
  }

  public async getNetworkDevices(): Promise<NetworkDevice[]> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ devices: NetworkDevice[]; success: boolean }>('/api/network/devices');
        if (res && res.devices) return res.devices;
      } catch (err) {
        console.warn('[WindroidSystemBridge] getNetworkDevices failed:', err);
      }
    }
    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return [];
    }
    return [
      {
        id: 'dev-eth0',
        interfaceName: 'dev-eth0',
        type: 'ethernet',
        state: 'connected',
        managed: true,
        hardwareAddress: '00:00:00:00:00:00',
        driver: 'browser-dev-mock',
        connectionName: 'Browser Dev Connection',
        ipAddresses: ['127.0.0.1/8'],
        gateway: '127.0.0.1',
        dnsServers: ['127.0.0.1'],
        speedMbps: 1000
      }
    ];
  }

  public async getWifiNetworks(): Promise<{ wifiAvailable: boolean; hasAdapter: boolean; wifiEnabled: boolean; networks: WifiNetwork[]; message?: string }> {
    if (this.isNativeBridgeAvailable) {
      try {
        return await this.fetchBridge('/api/network/wifi/networks');
      } catch (err) {
        console.warn('[WindroidSystemBridge] getWifiNetworks failed:', err);
      }
    }
    return {
      wifiAvailable: false,
      hasAdapter: false,
      wifiEnabled: false,
      networks: [],
      message: 'No Wi-Fi adapter detected in this environment.'
    };
  }

  public async setWifiEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/wifi/enabled', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      });
    }
    return { success: false, enabled: false, error: 'No Wi-Fi adapter detected.' };
  }

  public async connectWifi(ssid: string, password?: string): Promise<{ success: boolean; connectedSSID?: string; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/wifi/connect', {
        method: 'POST',
        body: JSON.stringify({ ssid, password })
      });
    }
    return { success: false, error: 'Cannot connect to Wi-Fi: Native bridge not connected.' };
  }

  public async disconnectWifi(ssid?: string, interfaceName?: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/wifi/disconnect', {
        method: 'POST',
        body: JSON.stringify({ ssid, interfaceName })
      });
    }
    return { success: true };
  }

  public async getSavedWifiNetworks(): Promise<SavedWifiNetwork[]> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ savedNetworks: SavedWifiNetwork[]; success: boolean }>('/api/network/wifi/saved');
        if (res && res.savedNetworks) return res.savedNetworks;
      } catch (err) {
        console.warn('[WindroidSystemBridge] getSavedWifiNetworks failed:', err);
      }
    }
    return [];
  }

  public async forgetWifiNetwork(ssid: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/wifi/forget', {
        method: 'POST',
        body: JSON.stringify({ ssid })
      });
    }
    return { success: true };
  }

  public async getHotspotCapabilities(): Promise<HotspotCapabilities> {
    if (this.isNativeBridgeAvailable) {
      try {
        return await this.fetchBridge('/api/network/hotspot/capabilities');
      } catch (err) {
        console.warn('[WindroidSystemBridge] getHotspotCapabilities failed:', err);
      }
    }
    return {
      supported: false,
      active: false,
      reason: 'Hotspot requires a physical Wi-Fi adapter with Access Point (AP) mode support.'
    };
  }

  public async startHotspot(ssid?: string, password?: string): Promise<{ success: boolean; active?: boolean; ssid?: string; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/hotspot/start', {
        method: 'POST',
        body: JSON.stringify({ ssid, password })
      });
    }
    return { success: false, error: 'Mobile hotspot requires a physical Wi-Fi adapter on Windroid OS.' };
  }

  public async stopHotspot(): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/hotspot/stop', {
        method: 'POST'
      });
    }
    return { success: true };
  }

  public async setAirplaneMode(enabled: boolean): Promise<{ success: boolean; airplaneMode: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/network/airplane-mode', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      });
    }
    return { success: true, airplaneMode: enabled };
  }

  // --- BLUETOOTH API METHODS ---
  public async getBluetoothStatus(): Promise<BluetoothStatus> {
    if (this.isNativeBridgeAvailable) {
      try {
        return await this.fetchBridge<BluetoothStatus>('/api/bluetooth/status');
      } catch (err) {
        console.warn('[WindroidSystemBridge] getBluetoothStatus failed:', err);
      }
    }
    return {
      success: true,
      available: false,
      hasAdapter: false,
      powered: false,
      discovering: false,
      hardwareBlocked: false,
      softwareBlocked: false,
      adapters: [],
      message: 'No Bluetooth adapter detected or native bridge unavailable.'
    };
  }

  public async getBluetoothAdapters(): Promise<BluetoothAdapter[]> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ adapters: BluetoothAdapter[]; success: boolean }>('/api/bluetooth/adapters');
        if (res && res.adapters) return res.adapters;
      } catch (err) {
        console.warn('[WindroidSystemBridge] getBluetoothAdapters failed:', err);
      }
    }
    return [];
  }

  public async setBluetoothPowered(powered: boolean): Promise<{ success: boolean; powered: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/powered', {
        method: 'POST',
        body: JSON.stringify({ powered })
      });
    }
    return { success: false, powered: false, error: 'No Bluetooth adapter detected.', errorCode: 'ADAPTER_NOT_FOUND' };
  }

  public async getBluetoothDevices(): Promise<BluetoothDevice[]> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ devices: BluetoothDevice[]; success: boolean }>('/api/bluetooth/devices');
        if (res && res.devices) return res.devices;
      } catch (err) {
        console.warn('[WindroidSystemBridge] getBluetoothDevices failed:', err);
      }
    }
    return [];
  }

  public async startBluetoothDiscovery(): Promise<{ success: boolean; discovering: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/discovery/start', {
        method: 'POST'
      });
    }
    return { success: false, discovering: false, error: 'Native bridge unavailable.' };
  }

  public async stopBluetoothDiscovery(): Promise<{ success: boolean; discovering: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/discovery/stop', {
        method: 'POST'
      });
    }
    return { success: true, discovering: false };
  }

  public async pairBluetoothDevice(address: string): Promise<{ success: boolean; paired?: boolean; requiresPin?: boolean; pinPrompt?: string; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/pair', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
    }
    return { success: false, error: 'Native bridge unavailable.' };
  }

  public async respondToBluetoothPairing(address: string, accept: boolean, pin?: string): Promise<{ success: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/pairing/respond', {
        method: 'POST',
        body: JSON.stringify({ address, accept, pin })
      });
    }
    return { success: false, error: 'Native bridge unavailable.' };
  }

  public async connectBluetoothDevice(address: string): Promise<{ success: boolean; connected?: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/connect', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
    }
    return { success: false, error: 'Native bridge unavailable.' };
  }

  public async disconnectBluetoothDevice(address: string): Promise<{ success: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/disconnect', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
    }
    return { success: true };
  }

  public async removeBluetoothDevice(address: string): Promise<{ success: boolean; error?: string; errorCode?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/bluetooth/remove', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
    }
    return { success: true };
  }

  public async getInstalledApps(): Promise<any[]> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ apps: any[]; success: boolean }>('/api/installed-apps');
        if (res.success && Array.isArray(res.apps)) {
          return res.apps;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch native installed apps:', err);
      }
      return [];
    }
    return [];
  }

  // --- HARDWARE SUBSYSTEM API METHODS ---

  public async getCapabilities(): Promise<SystemCapabilities> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean; capabilities: SystemCapabilities }>('/api/capabilities');
        if (res.success && res.capabilities) {
          return res.capabilities;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch capabilities:', err);
      }
    }
    return DEFAULT_SYSTEM_CAPABILITIES;
  }

  public async getDisplayInfo(): Promise<DisplayInfo> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean } & DisplayInfo>('/api/display/info');
        if (res.success) {
          return {
            displays: res.displays || [],
            gpu: res.gpu || 'Standard GPU',
            brightness: res.brightness ?? 100,
            hardwareBrightnessSupported: res.hardwareBrightnessSupported ?? false,
            nightLightSupported: res.nightLightSupported ?? true,
            nightLightActive: res.nightLightActive ?? false,
            nightLightTemperature: res.nightLightTemperature ?? 4500
          };
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch display info:', err);
      }
    }
    // Fallback for dev / browser mode
    const currentRes = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080';
    return {
      displays: [
        {
          id: 'dev_display',
          name: 'Development Virtual Display',
          connector: 'Virtual-1',
          currentResolution: currentRes,
          availableResolutions: [currentRes, '1920x1080', '1600x900', '1280x720', '1024x768'],
          refreshRates: [60],
          currentRefreshRate: 60,
          primary: true,
          orientation: 'normal',
          scaling: 100,
          physicalSize: 'Virtual Monitor'
        }
      ],
      gpu: 'Web Virtual Graphics',
      brightness: this.currentBrightness,
      hardwareBrightnessSupported: false,
      nightLightSupported: true,
      nightLightActive: false,
      nightLightTemperature: 4500
    };
  }

  public async configureDisplay(config: {
    displayId?: string;
    id?: string;
    resolution: string;
    refreshRate?: number | string;
    orientation?: string;
    isPrimary?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      const payload = {
        display_id: config.displayId || config.id,
        resolution: config.resolution,
        refresh_rate: config.refreshRate,
        orientation: config.orientation,
        is_primary: config.isPrimary
      };
      return await this.fetchBridge('/api/display/configure', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    return { success: true };
  }

  public async setDisplayBrightness(brightness: number): Promise<{ success: boolean; brightness: number }> {
    this.currentBrightness = brightness;
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/display/brightness', {
        method: 'POST',
        body: JSON.stringify({ brightness })
      });
    }
    return { success: true, brightness };
  }

  public async setDisplayNightLight(active: boolean, temperature?: number): Promise<{ success: boolean; active: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/display/nightlight', {
        method: 'POST',
        body: JSON.stringify({ active, temperature })
      });
    }
    return { success: true, active };
  }

  public async getAudioStatus(): Promise<AudioStatus> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean } & AudioStatus>('/api/audio/status');
        if (res.success) {
          return {
            isAudioAvailable: res.isAudioAvailable ?? true,
            masterVolume: res.masterVolume ?? this.currentMasterVolume,
            isMuted: res.isMuted ?? false,
            micVolume: res.micVolume ?? 100,
            isMicMuted: res.isMicMuted ?? false,
            defaultOutputId: res.defaultOutputId || '',
            defaultInputId: res.defaultInputId || '',
            outputs: res.outputs || [],
            inputs: res.inputs || []
          };
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch audio status:', err);
      }
    }
    return {
      isAudioAvailable: true,
      masterVolume: this.currentMasterVolume,
      isMuted: false,
      micVolume: 100,
      isMicMuted: false,
      defaultOutputId: 'dev_out',
      defaultInputId: 'dev_in',
      outputs: [{ id: 'dev_out', name: 'Browser Audio Output', description: 'Browser Emulated Audio', active: true, volume: this.currentMasterVolume, muted: false }],
      inputs: [{ id: 'dev_in', name: 'Browser Microphone', description: 'Browser Emulated Microphone', active: true, volume: 100, muted: false }]
    };
  }

  public async setAudioVolume(volume: number, isMuted?: boolean, target: 'output' | 'input' = 'output'): Promise<{ success: boolean; volume: number }> {
    if (target === 'output') {
      this.currentMasterVolume = volume;
    }
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/audio/volume', {
        method: 'POST',
        body: JSON.stringify({ volume, isMuted, target })
      });
    }
    return { success: true, volume };
  }

  public async setAudioDefaultDevice(deviceId: string, target: 'output' | 'input' = 'output'): Promise<{ success: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/audio/default-device', {
        method: 'POST',
        body: JSON.stringify({ deviceId, target })
      });
    }
    return { success: true };
  }

  public async getPowerStatus(): Promise<PowerStatus> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean } & PowerStatus>('/api/power/status');
        if (res.success) {
          return {
            hasBattery: res.hasBattery ?? false,
            chargingState: res.chargingState || 'not_charging',
            batteryPercent: res.batteryPercent ?? null,
            acConnected: res.acConnected ?? true,
            healthPercent: res.healthPercent ?? null,
            estimatedTimeRemainingMinutes: res.estimatedTimeRemainingMinutes ?? null,
            batterySaverActive: res.batterySaverActive ?? false,
            isDesktopOrVM: res.isDesktopOrVM ?? true
          };
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch power status:', err);
      }
    }

    // Try Navigator Battery Status API for real device battery hardware
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        const batteryPercent = Math.round((battery.level || 1) * 100);
        const isCharging = battery.charging;
        return {
          hasBattery: true,
          chargingState: isCharging ? 'charging' : 'discharging',
          batteryPercent: batteryPercent,
          acConnected: isCharging,
          healthPercent: 100,
          estimatedTimeRemainingMinutes: isCharging ? battery.chargingTime : battery.dischargingTime,
          batterySaverActive: false,
          isDesktopOrVM: false
        };
      } catch (_) {
        // Fallthrough if getBattery is blocked or unavailable
      }
    }

    // Default fallback with realistic battery level & plugged status
    return {
      hasBattery: true,
      chargingState: 'charging',
      batteryPercent: 88,
      acConnected: true,
      healthPercent: 98,
      estimatedTimeRemainingMinutes: 120,
      batterySaverActive: false,
      isDesktopOrVM: false
    };
  }

  public async executePowerAction(action: PowerAction): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/power/action', {
        method: 'POST',
        body: JSON.stringify({ action })
      });
    }
    console.log(`[PowerService] Executed action '${action}' in browser sandbox mode.`);
    return { success: true };
  }

  public async setBatterySaver(enabled: boolean): Promise<{ success: boolean; batterySaverActive: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/power/battery-saver', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      });
    }
    return { success: true, batterySaverActive: enabled };
  }

  // --- ACCOUNTS & USERS ---
  public async getUserAccounts(): Promise<UserAccount[]> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean; users: UserAccount[] }>('/api/accounts/list');
        if (res.success && res.users) {
          return res.users;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch user accounts:', err);
      }
    }
    // Fallback account
    return [
      {
        username: 'user',
        uid: 1000,
        gid: 1000,
        fullName: 'Windroid Administrator',
        email: 'admin@windroid.org',
        homeDir: '/home/user',
        shell: '/bin/bash',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isAdmin: true,
        userType: 'administrator',
        isCurrentSession: true
      }
    ];
  }

  public async createUser(data: { username: string; fullName?: string; password?: string; isAdmin?: boolean }): Promise<{ success: boolean; username?: string; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/accounts/create', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
    return { success: true, username: data.username };
  }

  public async updateUser(data: { username: string; fullName?: string; isAdmin?: boolean }): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/accounts/update', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
    return { success: true };
  }

  public async deleteUser(username: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/accounts/delete', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
    }
    return { success: true };
  }

  public async authenticate(username: string, password?: string): Promise<{ success: boolean; authenticated: boolean; error?: string; errorCode?: string; runtimeMode?: RuntimeMode; isLiveUser?: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/auth/authenticate', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    }
    return { success: true, authenticated: true, runtimeMode: 'browser-development', isLiveUser: false };
  }

  public async changePassword(username: string, currentPassword?: string, newPassword?: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ username, currentPassword, newPassword })
      });
    }
    return { success: true };
  }

  // --- DEVICE IDENTITY ---
  public async getDeviceIdentity(): Promise<DeviceIdentity> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean } & DeviceIdentity>('/api/identity/get');
        if (res.success) {
          return {
            hostname: res.hostname || 'windroid-pc',
            deviceName: res.deviceName || 'windroid-pc',
            kernelVersion: res.kernelVersion || '6.1.0-28-amd64',
            architecture: res.architecture || 'x86_64',
            osName: res.osName || 'Windroid OS 1.0.0 (Debian 12)'
          };
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch device identity:', err);
      }
    }
    return {
      hostname: 'windroid-pc',
      deviceName: 'windroid-pc',
      kernelVersion: '6.1.0-28-amd64',
      architecture: 'x86_64',
      osName: 'Windroid OS 1.0.0 (Debian 12)'
    };
  }

  public async setDeviceHostname(hostname: string): Promise<{ success: boolean; hostname?: string; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/identity/set-hostname', {
        method: 'POST',
        body: JSON.stringify({ hostname })
      });
    }
    return { success: true, hostname };
  }

  // --- LOCALE, TIMEZONE & KEYBOARD ---
  public async getLocaleSettings(): Promise<LocaleSettings> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean } & LocaleSettings>('/api/locale/get');
        if (res.success) {
          return {
            timezone: res.timezone || 'America/New_York',
            locale: res.locale || 'en_US.UTF-8',
            keyboardLayout: res.keyboardLayout || 'us',
            availableTimezones: res.availableTimezones || ['America/New_York', 'UTC'],
            availableLocales: res.availableLocales || [{ code: 'en_US.UTF-8', name: 'English (United States)' }],
            availableKeyboards: res.availableKeyboards || [{ layout: 'us', name: 'English (US)' }]
          };
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch locale settings:', err);
      }
    }
    return {
      timezone: 'America/New_York',
      locale: 'en_US.UTF-8',
      keyboardLayout: 'us',
      availableTimezones: [
        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
        'Australia/Sydney', 'Pacific/Auckland', 'UTC'
      ],
      availableLocales: [
        { code: 'en_US.UTF-8', name: 'English (United States)' },
        { code: 'en_GB.UTF-8', name: 'English (United Kingdom)' },
        { code: 'de_DE.UTF-8', name: 'German (Deutschland)' },
        { code: 'fr_FR.UTF-8', name: 'French (France)' },
        { code: 'es_ES.UTF-8', name: 'Spanish (España)' },
        { code: 'it_IT.UTF-8', name: 'Italian (Italia)' },
        { code: 'pt_BR.UTF-8', name: 'Portuguese (Brasil)' },
        { code: 'ja_JP.UTF-8', name: 'Japanese (日本)' },
        { code: 'zh_CN.UTF-8', name: 'Chinese (Simplified)' }
      ],
      availableKeyboards: [
        { layout: 'us', name: 'English (US)' },
        { layout: 'gb', name: 'English (UK)' },
        { layout: 'de', name: 'German (QWERTZ)' },
        { layout: 'fr', name: 'French (AZERTY)' },
        { layout: 'es', name: 'Spanish' },
        { layout: 'it', name: 'Italian' },
        { layout: 'pt', name: 'Portuguese' },
        { layout: 'ru', name: 'Russian (JCUKEN)' },
        { layout: 'jp', name: 'Japanese' }
      ]
    };
  }

  public async setTimezone(timezone: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/locale/set-timezone', {
        method: 'POST',
        body: JSON.stringify({ timezone })
      });
    }
    return { success: true };
  }

  public async setLocale(locale: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/locale/set-locale', {
        method: 'POST',
        body: JSON.stringify({ locale })
      });
    }
    return { success: true };
  }

  public async setKeyboardLayout(layout: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/locale/set-keyboard', {
        method: 'POST',
        body: JSON.stringify({ layout })
      });
    }
    return { success: true };
  }

  // --- XDG PERSONALIZATION PERSISTENCE ---
  public async getUserPreferences(): Promise<UserPreferences> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean; preferences: UserPreferences }>('/api/personalization/get');
        if (res.success && res.preferences) {
          return res.preferences;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch personalization:', err);
      }
    }
    // Fallback to localStorage or defaults
    try {
      const stored = localStorage.getItem('windroid_user_preferences');
      if (stored) return JSON.parse(stored);
    } catch (_) {}

    return {
      wallpaper: 'aether-wallpaper-01',
      darkMode: true,
      accentColor: '#0067C0',
      desktopIconSize: 48,
      dockPosition: 'bottom',
      clockFormat: '12h',
      autoLockMinutes: 0,
      lockWallpaper: 'aether-wallpaper-01'
    };
  }

  public async setUserPreferences(preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> {
    // Always store in localStorage as cache/fallback
    try {
      const current = await this.getUserPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem('windroid_user_preferences', JSON.stringify(updated));
    } catch (_) {}

    if (this.isNativeBridgeAvailable) {
      const current = await this.getUserPreferences();
      const updated = { ...current, ...preferences };
      return await this.fetchBridge('/api/personalization/set', {
        method: 'POST',
        body: JSON.stringify({ preferences: updated })
      });
    }
    return { success: true };
  }

  public async getRuntimeMode(): Promise<RuntimeMode> {
    // SECURITY BOUNDARY: Kernel command line (/proc/cmdline) via Native System Bridge is the sole authority in production.
    // URL query parameters (?mode=..., ?context=...) are strictly ignored in production and native environments.
    // URL overrides are ONLY evaluated when in browser development mode (import.meta.env.DEV) and when the native bridge is absent.

    // 1. Authoritative check: Native Bridge via /proc/cmdline
    for (let attempt = 0; attempt < 3; attempt++) {
      const isAvailable = await this.checkNativeBridge(attempt > 0);
      if (isAvailable) {
        try {
          const res = await this.fetchBridge<{ success: boolean; runtimeMode?: RuntimeMode; runtime?: string }>('/api/system/runtime-mode');
          if (res.success && res.runtimeMode) {
            return res.runtimeMode;
          }
        } catch (err) {
          console.warn('[WindroidSystemBridge] Failed to fetch runtime mode from native bridge:', err);
        }
      }
      if (attempt < 2 && this.isNativeProductionEnvironment()) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    if (this.isNativeProductionEnvironment()) {
      console.error('[WindroidSystemBridge] Native bridge unreachable on 127.0.0.1:4174 in production ISO / native environment.');
      return 'installer';
    }

    // 2. Browser Development Fallback ONLY (when import.meta.env.DEV is true AND native bridge is absent)
    if (import.meta.env.DEV && typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      if (urlMode === 'installer' || urlMode === 'live' || urlMode === 'installed') {
        return urlMode as RuntimeMode;
      }
    }

    return 'browser-development';
  }

  // --- SESSION STATUS & LOCK / UNLOCK / LOGOUT ---
  public async getSessionStatus(): Promise<SessionStatus> {
    if (this.isNativeBridgeAvailable) {
      try {
        const res = await this.fetchBridge<{ success: boolean; status: SessionStatus }>('/api/session/status');
        if (res.success && res.status) {
          return res.status;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch session status:', err);
      }
    }
    return 'logged_in';
  }

  public async lockSession(): Promise<{ success: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/session/lock', { method: 'POST' });
    }
    return { success: true };
  }

  public async unlockSession(username?: string, password?: string): Promise<{ success: boolean; authenticated: boolean; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/session/unlock', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    }
    return { success: true, authenticated: true };
  }

  public async logoutSession(): Promise<{ success: boolean }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/session/logout', { method: 'POST' });
    }
    return { success: true };
  }

  // --- INSTALLER SUBSYSTEM METHODS ---
  public async getNativeInstallerState(): Promise<NativeInstallerStateResponse> {
    const isAvailable = await this.checkNativeBridge();
    if (isAvailable) {
      try {
        const res = await this.fetchBridge<NativeInstallerStateResponse>('/api/installer/native-state');
        if (res && res.success) {
          return res;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch native installer state:', err);
      }
    }
    return {
      success: false,
      version: 'windroid-installer-state-v1',
      state: 'NOT_INSTALLED' as any,
      runtimeMode: 'browser-development'
    };
  }

  public async completeOobe(data: {
    username: string;
    password?: string;
    fullName?: string;
    deviceName?: string;
    timezone?: string;
    keyboard?: string;
    language?: string;
  }): Promise<{ success: boolean; username?: string; error?: string }> {
    if (this.isNativeBridgeAvailable) {
      return await this.fetchBridge('/api/installer/complete-oobe', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
    return { success: true, username: data.username };
  }

  public async getInstallerStatus(): Promise<InstallerStatus> {
    const isAvailable = await this.checkNativeBridge();
    if (isAvailable) {
      try {
        const res = await this.fetchBridge<InstallerStatus & { success: boolean }>('/api/installer/status');
        if (res && res.success !== false) {
          return res;
        }
      } catch (err) {
        console.warn('[WindroidSystemBridge] Failed to fetch installer status from bridge:', err);
      }
    }

    if (this.isNativeProductionEnvironment()) {
      return {
        status: 'failed',
        stage: 'failed',
        stageDescription: 'Native System Bridge Unreachable on http://127.0.0.1:4174',
        progress: 0,
        error: 'Native System Bridge Unreachable',
        canInstall: false,
        runtimeMode: 'installer',
        bootMode: 'uefi'
      };
    }

    return {
      status: 'idle',
      stage: 'idle',
      stageDescription: 'Ready to install (Dev Sandbox)',
      progress: 0,
      error: null,
      canInstall: true,
      runtimeMode: 'browser-development',
      bootMode: 'uefi'
    };
  }

  public async getInstallerDisks(): Promise<GetInstallerDisksResponse> {
    try {
      const res = await this.fetchBridge<GetInstallerDisksResponse>('/api/installer/disks');
      if (res) {
        return res;
      }
    } catch (err: any) {
      console.warn('[WindroidSystemBridge] Failed to fetch installer disks from bridge:', err);
      const isNetworkFailure = err?.message?.includes('NETWORK_ERROR') || err?.message?.includes('Failed to fetch');
      if (!isNetworkFailure) {
        return {
          success: false,
          error: err?.message || 'Failed to discover disks via Native Bridge.',
          disks: [],
          rawBlockDevices: [],
          eligibleDisks: [],
          excludedDevices: []
        };
      }
      const recheck = await this.checkNativeBridge(true);
      if (!recheck) {
        if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
          return {
            success: false,
            error: 'Native System Bridge (http://127.0.0.1:4174) is unreachable. Disk discovery via lsblk requires the native bridge.',
            disks: [],
            rawBlockDevices: [],
            eligibleDisks: [],
            excludedDevices: [],
            diagnostics: {
              runtimeMode: 'installer',
              bootMode: 'uefi',
              rawKernelCmdline: 'N/A (Native Bridge Unreachable)',
              nativeBridgeStatus: 'Unreachable',
              nativeBridgeUrl: NATIVE_HTTP_BRIDGE_URL,
              lsblkAvailable: false,
              detectedLiveMedia: 'Unknown'
            }
          };
        }
      }
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        success: false,
        error: 'Native System Bridge (http://127.0.0.1:4174) is unreachable. Disk discovery via lsblk requires the native bridge.',
        disks: [],
        rawBlockDevices: [],
        eligibleDisks: [],
        excludedDevices: []
      };
    }

    const mockDisk = {
      device: '/dev/sda',
      model: 'Virtual Storage Disk (Dev Sandbox)',
      vendor: 'Windroid Virtual',
      serial: 'DEV-SANDBOX-001',
      sizeBytes: 64 * 1024 * 1024 * 1024,
      transport: 'sata',
      removable: false,
      rotational: false,
      readOnly: false,
      systemDisk: false,
      isLiveMedia: false,
      protected: false,
      partitions: []
    };

    return {
      success: true,
      disks: [mockDisk],
      rawBlockDevices: [],
      eligibleDisks: [mockDisk],
      excludedDevices: []
    };
  }

  public async getInstallerBootMode(): Promise<{ success: boolean; bootMode: BootMode }> {
    try {
      return await this.fetchBridge<{ success: boolean; bootMode: BootMode }>('/api/installer/boot-mode');
    } catch (err) {
      console.warn('[WindroidSystemBridge] Failed to fetch boot mode:', err);
    }
    return { success: true, bootMode: 'uefi' };
  }

  public async generateInstallerPlan(
    targetDisk: string,
    installationMode: InstallationMode,
    userConfig: Partial<UserConfig>,
    localeConfig: Partial<LocaleConfig>,
    customPartitions?: any[]
  ): Promise<{ success: boolean; plan: InstallationPlan; authToken?: string; errors: string[]; warnings: string[] }> {
    if (!targetDisk || !targetDisk.trim()) {
      return {
        success: false,
        plan: null as any,
        authToken: '',
        errors: ['TARGET_DISK_SELECTION_REQUIRED: Target disk must be explicitly selected by user.'],
        warnings: []
      };
    }

    try {
      const res = await this.fetchBridge<{
        success: boolean;
        plan: InstallationPlan;
        authToken?: string;
        errors?: string[];
        warnings?: string[];
        error?: string;
      }>('/api/installer/plan', {
        method: 'POST',
        body: JSON.stringify({
          targetDisk,
          installationMode,
          userConfig,
          localeConfig,
          customPartitions
        })
      });

      if (res) {
        return {
          success: res.success !== false,
          plan: res.plan,
          authToken: res.authToken || '',
          errors: res.errors || (res.error ? [res.error] : []),
          warnings: res.warnings || []
        };
      }
    } catch (err: any) {
      console.warn('[WindroidSystemBridge] Failed to generate plan via bridge:', err);
      const isNetworkFailure = err?.message?.includes('NETWORK_ERROR') || err?.message?.includes('Failed to fetch');
      if (!isNetworkFailure) {
        return {
          success: false,
          plan: null as any,
          authToken: '',
          errors: [err?.message || 'Failed to generate installation plan via native bridge.'],
          warnings: []
        };
      }
      await this.checkNativeBridge(true);
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        success: false,
        plan: null as any,
        authToken: '',
        errors: ['Native System Bridge (http://127.0.0.1:4174) is unreachable. Cannot generate installation plan.'],
        warnings: []
      };
    }

    const mockPlan: InstallationPlan = {
      version: '1.0',
      targetDisk,
      bootMode: 'uefi',
      installationMode,
      partitions: [
        {
          device: `${targetDisk}1`,
          sizeBytes: 512 * 1024 * 1024,
          filesystem: 'fat32',
          mountPoint: '/boot/efi',
          label: 'BOOT',
          flags: ['esp', 'boot']
        },
        {
          device: `${targetDisk}2`,
          sizeBytes: 0,
          filesystem: 'ext4',
          mountPoint: '/',
          label: 'WindroidOS'
        }
      ],
      userConfig: {
        username: userConfig.username || 'windroid',
        fullName: userConfig.fullName || 'Windroid User',
        password: userConfig.password || '',
        deviceName: userConfig.deviceName || 'Windroid-PC',
        requirePassword: userConfig.requirePassword ?? true
      },
      localeConfig: {
        language: localeConfig.language || 'en_US.UTF-8',
        keyboard: localeConfig.keyboard || 'us',
        timezone: localeConfig.timezone || 'UTC'
      },
      bootloaderConfig: {
        targetDevice: targetDisk,
        type: 'grub-efi'
      }
    };
    return {
      success: true,
      plan: mockPlan,
      authToken: 'mock-dev-auth-token-12345',
      errors: [],
      warnings: []
    };
  }

  public async validateInstallerPlan(plan: InstallationPlan): Promise<{ success: boolean; valid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const res = await this.fetchBridge<{
        success: boolean;
        valid: boolean;
        errors?: string[];
        warnings?: string[];
        error?: string;
      }>('/api/installer/validate', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
      if (res) {
        return {
          success: res.success !== false,
          valid: res.valid !== false,
          errors: res.errors || (res.error ? [res.error] : []),
          warnings: res.warnings || []
        };
      }
    } catch (err: any) {
      console.warn('[WindroidSystemBridge] Failed to validate plan via bridge:', err);
      const isNetworkFailure = err?.message?.includes('NETWORK_ERROR') || err?.message?.includes('Failed to fetch');
      if (!isNetworkFailure) {
        return {
          success: false,
          valid: false,
          errors: [err?.message || 'Failed to validate installation plan via native bridge.'],
          warnings: []
        };
      }
      await this.checkNativeBridge(true);
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        success: false,
        valid: false,
        errors: ['Native System Bridge (http://127.0.0.1:4174) is unreachable. Cannot validate installation plan.'],
        warnings: []
      };
    }
    return { success: true, valid: true, errors: [], warnings: [] };
  }

  public async authorizeInstallerPlan(plan: InstallationPlan): Promise<{ success: boolean; authToken?: string; plan?: InstallationPlan; errors?: string[] }> {
    try {
      const res = await this.fetchBridge<{
        success: boolean;
        authToken?: string;
        plan?: InstallationPlan;
        errors?: string[];
        error?: string;
      }>('/api/installer/authorize', {
        method: 'POST',
        body: JSON.stringify({ plan })
      });
      if (res) {
        return {
          success: res.success !== false,
          authToken: res.authToken,
          plan: res.plan,
          errors: res.errors || (res.error ? [res.error] : [])
        };
      }
    } catch (err: any) {
      console.warn('[WindroidSystemBridge] Failed to authorize plan via bridge:', err);
      return {
        success: false,
        errors: [err?.message || 'Failed to authorize installation plan via native bridge.']
      };
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        success: false,
        errors: ['Native System Bridge (http://127.0.0.1:4174) is unreachable. Cannot authorize plan.']
      };
    }
    return { success: true, authToken: 'mock-dev-auth-token-12345' };
  }

  public async executeInstallerPlan(plan: InstallationPlan, authToken?: string): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const res = await this.fetchBridge<{
        success: boolean;
        status?: string;
        error?: string;
      }>('/api/installer/execute', {
        method: 'POST',
        body: JSON.stringify({ plan, authToken })
      });

      if (res) {
        return {
          success: res.success !== false,
          status: res.status || (res.success !== false ? 'started' : 'failed'),
          error: res.error
        };
      }
    } catch (err: any) {
      console.warn('[WindroidSystemBridge] Failed to execute plan via bridge:', err);
      const isNetworkFailure = err?.message?.includes('NETWORK_ERROR') || err?.message?.includes('Failed to fetch');
      if (!isNetworkFailure) {
        return {
          success: false,
          status: 'failed',
          error: err?.message || 'Failed to execute installation plan via native bridge.'
        };
      }

      const recheck = await this.checkNativeBridge(true);
      if (!recheck) {
        return {
          success: false,
          status: 'failed',
          error: 'Native System Bridge (http://127.0.0.1:4174) is unreachable. Real installation requires the native bridge.'
        };
      }

      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Failed to execute installation plan via native bridge.'
      };
    }

    if (this.isNativeProductionEnvironment() || !import.meta.env.DEV) {
      return {
        success: false,
        status: 'failed',
        error: 'Native System Bridge (http://127.0.0.1:4174) is unreachable. Real installation requires the native bridge.'
      };
    }
    return { success: true, status: 'started_simulated' };
  }
}
