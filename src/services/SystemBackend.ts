import { WindroidSystemBridge } from './WindroidSystemBridge';
import { RuntimeEnvironmentResolver } from './RuntimeEnvironmentResolver';
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
import { RuntimeMode } from '../types/user-session';
import { PowerAction, DisplayInfo, AudioStatus, SystemCapabilities, PowerStatus, DEFAULT_SYSTEM_CAPABILITIES } from '../types/hardware';

export function formatPartitionDevice(targetDisk: string, partNumber: number): string {
  if (!targetDisk) return '';
  const lastChar = targetDisk.slice(-1);
  if (/\d/.test(lastChar)) {
    return `${targetDisk}p${partNumber}`;
  }
  return `${targetDisk}${partNumber}`;
}

export function isBrowserDevelopment(): boolean {
  return RuntimeEnvironmentResolver.isBrowserDevelopment();
}

export interface SystemBackend {
  checkNativeBridge(forceRecheck?: boolean): Promise<boolean>;
  getNativeInstallerState(): Promise<NativeInstallerStateResponse>;
  completeOobe(data: {
    username: string;
    password?: string;
    fullName?: string;
    deviceName?: string;
    timezone?: string;
    keyboard?: string;
    language?: string;
  }): Promise<{ success: boolean; username?: string; error?: string }>;
  getInstallerStatus(): Promise<InstallerStatus>;
  getInstallerDisks(): Promise<GetInstallerDisksResponse>;
  getInstallerBootMode(): Promise<{ success: boolean; bootMode: BootMode }>;
  generateInstallerPlan(
    targetDisk: string,
    installationMode: InstallationMode,
    userConfig: Partial<UserConfig>,
    localeConfig: Partial<LocaleConfig>,
    customPartitions?: any[]
  ): Promise<{ success: boolean; plan: InstallationPlan; authToken?: string; errors: string[]; warnings: string[] }>;
  validateInstallerPlan(plan: InstallationPlan): Promise<{ success: boolean; valid: boolean; errors: string[]; warnings: string[] }>;
  authorizeInstallerPlan(plan: InstallationPlan): Promise<{ success: boolean; authToken?: string; plan?: InstallationPlan; errors?: string[] }>;
  executeInstallerPlan(plan: InstallationPlan, authToken?: string): Promise<{ success: boolean; status?: string; error?: string }>;
  executePowerAction(action: PowerAction): Promise<{ success: boolean; error?: string }>;
  createUser(data: { username: string; fullName?: string; password?: string; isAdmin?: boolean }): Promise<{ success: boolean; username?: string; error?: string }>;
  setTimezone(timezone: string): Promise<{ success: boolean; error?: string }>;
  setLocale(locale: string): Promise<{ success: boolean; error?: string }>;
  setKeyboardLayout(layout: string): Promise<{ success: boolean; error?: string }>;
  getRuntimeMode(): Promise<RuntimeMode>;
  subscribeInstallerProgress(onProgress: (status: InstallerStatus) => void): () => void;

  // Real Hardware Display & Audio Controls
  getDisplayInfo(): Promise<DisplayInfo>;
  setDisplayBrightness(brightness: number): Promise<{ success: boolean; brightness: number; hardware?: boolean }>;
  setDisplayNightLight(active: boolean, temperature?: number): Promise<{ success: boolean; active: boolean; temperature?: number }>;
  configureDisplay(config: { displayId?: string; id?: string; resolution: string; refreshRate?: number | string; orientation?: string; isPrimary?: boolean }): Promise<{ success: boolean; error?: string }>;
  getAudioStatus(): Promise<AudioStatus>;
  setAudioVolume(volume: number, isMuted?: boolean, target?: 'output' | 'input'): Promise<{ success: boolean; volume: number; target?: string }>;
  setAudioDefaultDevice(deviceId: string, target?: 'output' | 'input'): Promise<{ success: boolean; error?: string }>;
  getCapabilities(): Promise<SystemCapabilities>;
  getPowerStatus(): Promise<PowerStatus>;
}

export class NativeSystemBackend implements SystemBackend {
  private bridge = WindroidSystemBridge.getInstance();

  public async checkNativeBridge(forceRecheck?: boolean): Promise<boolean> {
    return await this.bridge.checkNativeBridge(forceRecheck);
  }

  public async getNativeInstallerState(): Promise<NativeInstallerStateResponse> {
    return await this.bridge.getNativeInstallerState();
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
    return await this.bridge.completeOobe(data);
  }

  public async getInstallerStatus(): Promise<InstallerStatus> {
    return await this.bridge.getInstallerStatus();
  }

  public async getInstallerDisks(): Promise<GetInstallerDisksResponse> {
    return await this.bridge.getInstallerDisks();
  }

  public async getInstallerBootMode(): Promise<{ success: boolean; bootMode: BootMode }> {
    return await this.bridge.getInstallerBootMode();
  }

  public async generateInstallerPlan(
    targetDisk: string,
    installationMode: InstallationMode,
    userConfig: Partial<UserConfig>,
    localeConfig: Partial<LocaleConfig>,
    customPartitions?: any[]
  ) {
    return await this.bridge.generateInstallerPlan(targetDisk, installationMode, userConfig, localeConfig, customPartitions);
  }

  public async validateInstallerPlan(plan: InstallationPlan) {
    return await this.bridge.validateInstallerPlan(plan);
  }

  public async authorizeInstallerPlan(plan: InstallationPlan) {
    return await this.bridge.authorizeInstallerPlan(plan);
  }

  public async executeInstallerPlan(plan: InstallationPlan, authToken?: string) {
    return await this.bridge.executeInstallerPlan(plan, authToken);
  }

  public async executePowerAction(action: PowerAction) {
    return await this.bridge.executePowerAction(action);
  }

  public async createUser(data: { username: string; fullName?: string; password?: string; isAdmin?: boolean }) {
    return await this.bridge.createUser(data);
  }

  public async setTimezone(timezone: string) {
    return await this.bridge.setTimezone(timezone);
  }

  public async setLocale(locale: string) {
    return await this.bridge.setLocale(locale);
  }

  public async setKeyboardLayout(layout: string) {
    return await this.bridge.setKeyboardLayout(layout);
  }

  public async getRuntimeMode() {
    return await this.bridge.getRuntimeMode();
  }

  public async getDisplayInfo(): Promise<DisplayInfo> {
    return await this.bridge.getDisplayInfo();
  }

  public async setDisplayBrightness(brightness: number): Promise<{ success: boolean; brightness: number; hardware?: boolean }> {
    return await this.bridge.setDisplayBrightness(brightness);
  }

  public async setDisplayNightLight(active: boolean, temperature?: number): Promise<{ success: boolean; active: boolean; temperature?: number }> {
    return await this.bridge.setDisplayNightLight(active, temperature);
  }

  public async configureDisplay(config: { displayId?: string; id?: string; resolution: string; refreshRate?: number | string; orientation?: string; isPrimary?: boolean }): Promise<{ success: boolean; error?: string }> {
    return await this.bridge.configureDisplay(config);
  }

  public async getAudioStatus(): Promise<AudioStatus> {
    return await this.bridge.getAudioStatus();
  }

  public async setAudioVolume(volume: number, isMuted?: boolean, target?: 'output' | 'input'): Promise<{ success: boolean; volume: number; target?: string }> {
    return await this.bridge.setAudioVolume(volume, isMuted, target);
  }

  public async setAudioDefaultDevice(deviceId: string, target?: 'output' | 'input'): Promise<{ success: boolean; error?: string }> {
    return await this.bridge.setAudioDefaultDevice(deviceId, target);
  }

  public async getCapabilities(): Promise<SystemCapabilities> {
    return await this.bridge.getCapabilities();
  }

  public async getPowerStatus(): Promise<PowerStatus> {
    return await this.bridge.getPowerStatus();
  }

  public subscribeInstallerProgress(onProgress: (status: InstallerStatus) => void): () => void {
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const st = await this.getInstallerStatus();
        if (active) onProgress(st);
      } catch (_) {}
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }
}

export class BrowserMockSystemBackend implements SystemBackend {
  private isExecuting: boolean = false;
  private mockStatus: InstallerStatus = {
    status: 'idle',
    stage: 'idle',
    stageDescription: 'Ready to install (Browser Preview Mode)',
    progress: 0,
    error: null,
    canInstall: true,
    runtimeMode: 'browser-development',
    bootMode: 'uefi'
  };

  private progressListeners: Set<(status: InstallerStatus) => void> = new Set();
  private progressTimer: NodeJS.Timeout | null = null;

  public async checkNativeBridge(): Promise<boolean> {
    return false;
  }

  public async getNativeInstallerState(): Promise<NativeInstallerStateResponse> {
    return {
      success: true,
      version: 'windroid-installer-state-v1',
      state: 'INSTALLER',
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
    return { success: true, username: data.username };
  }

  public async getInstallerStatus(): Promise<InstallerStatus> {
    return { ...this.mockStatus };
  }

  public async getInstallerDisks(): Promise<GetInstallerDisksResponse> {
    const primaryDisk: InstallerDisk = {
      device: '/dev/sda',
      model: 'Virtual Storage Device (64 GB NVMe)',
      vendor: 'Windroid Virtual',
      serial: 'WND-VIRT-64G-001',
      sizeBytes: 64 * 1024 * 1024 * 1024,
      transport: 'nvme',
      removable: false,
      rotational: false,
      readOnly: false,
      systemDisk: false,
      isLiveMedia: false,
      protected: false,
      isMock: true,
      partitions: [
        {
          device: '/dev/sda1',
          number: 1,
          sizeBytes: 512 * 1024 * 1024,
          filesystem: 'fat32',
          label: 'BOOT',
          uuid: 'mock-efi-uuid-1111',
          mountPoint: '/boot/efi',
          partitionType: 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b',
          bootable: true,
          flags: ['boot', 'esp']
        },
        {
          device: '/dev/sda2',
          number: 2,
          sizeBytes: 63.5 * 1024 * 1024 * 1024,
          filesystem: 'ext4',
          label: 'WindroidOS',
          uuid: 'mock-root-uuid-2222',
          mountPoint: '/',
          partitionType: '0fc63daf-8483-4772-8e79-3d69d8477de4',
          bootable: false
        }
      ]
    };

    const liveUsbDisk: InstallerDisk = {
      device: '/dev/sdb',
      model: 'Windroid Live USB Drive (16 GB)',
      vendor: 'SanDisk USB',
      serial: 'LIVE-USB-MEDIA-999',
      sizeBytes: 16 * 1024 * 1024 * 1024,
      transport: 'usb',
      removable: true,
      rotational: false,
      readOnly: true,
      systemDisk: true,
      isLiveMedia: true,
      protected: true,
      protectionReason: 'Live installation media is protected from overwrite',
      isMock: true,
      partitions: []
    };

    return {
      success: true,
      disks: [primaryDisk, liveUsbDisk],
      eligibleDisks: [primaryDisk],
      excludedDevices: [
        {
          path: '/dev/sdb',
          reason: 'Live installation source media',
          sizeBytes: 16 * 1024 * 1024 * 1024
        }
      ],
      liveMediaDevice: '/dev/sdb'
    };
  }

  public async getInstallerBootMode(): Promise<{ success: boolean; bootMode: BootMode }> {
    return { success: true, bootMode: 'uefi' };
  }

  public async generateInstallerPlan(
    targetDisk: string,
    installationMode: InstallationMode,
    userConfig: Partial<UserConfig>,
    localeConfig: Partial<LocaleConfig>
  ) {
    if (!targetDisk) {
      return {
        success: false,
        plan: null as any,
        authToken: '',
        errors: ['Target disk selection is required.'],
        warnings: []
      };
    }

    if (targetDisk === '/dev/sdb') {
      return {
        success: false,
        plan: null as any,
        authToken: '',
        errors: ['Target disk is live installation media and cannot be overwritten.'],
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
          device: formatPartitionDevice(targetDisk, 1),
          sizeBytes: 512 * 1024 * 1024,
          filesystem: 'fat32',
          mountPoint: '/boot/efi',
          label: 'BOOT',
          flags: ['boot', 'esp']
        },
        {
          device: formatPartitionDevice(targetDisk, 2),
          sizeBytes: 63.5 * 1024 * 1024 * 1024,
          filesystem: 'ext4',
          mountPoint: '/',
          label: 'WindroidOS'
        }
      ],
      userConfig: {
        username: userConfig.username || 'windroid',
        fullName: userConfig.fullName || 'Windroid User',
        password: userConfig.password || '',
        deviceName: userConfig.deviceName || 'windroid-pc',
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
      authToken: 'mock-dev-token-abc12345',
      errors: [],
      warnings: []
    };
  }

  public async validateInstallerPlan(plan: InstallationPlan) {
    if (plan.targetDisk === '/dev/sdb') {
      return {
        success: false,
        valid: false,
        errors: ['Target disk /dev/sdb is live media and protected.'],
        warnings: []
      };
    }
    return { success: true, valid: true, errors: [], warnings: [] };
  }

  public async authorizeInstallerPlan(plan: InstallationPlan) {
    if (plan.targetDisk === '/dev/sdb') {
      return { success: false, errors: ['Target disk /dev/sdb is live media and protected.'] };
    }
    return { success: true, authToken: 'mock-dev-token-abc12345', plan };
  }

  public async executeInstallerPlan(plan: InstallationPlan, authToken?: string) {
    if (this.isExecuting) {
      return { success: false, error: 'Installation is already in progress.' };
    }

    if (plan.targetDisk === '/dev/sdb') {
      return { success: false, error: 'Target disk /dev/sdb is protected live installation media.' };
    }

    this.isExecuting = true;
    this.mockStatus = {
      status: 'in_progress',
      stage: 'preparing_disk',
      stageDescription: 'Preparing target disk layout...',
      progress: 5,
      error: null,
      canInstall: false,
      runtimeMode: 'browser-development',
      bootMode: 'uefi'
    };
    this.notifyListeners();

    if (this.progressTimer) clearInterval(this.progressTimer);

    const steps: Array<{ stage: any; desc: string; progress: number }> = [
      { stage: 'preparing_disk', desc: 'Preparing GPT partition table...', progress: 10 },
      { stage: 'creating_partitions', desc: 'Creating EFI boot & ext4 root partitions...', progress: 25 },
      { stage: 'formatting_filesystems', desc: 'Formatting target ext4 filesystem...', progress: 40 },
      { stage: 'copying_system', desc: 'Copying Windroid OS image & system modules...', progress: 60 },
      { stage: 'configuring_system', desc: 'Applying system settings & regional configuration...', progress: 80 },
      { stage: 'installing_bootloader', desc: 'Installing GRUB EFI bootloader...', progress: 95 },
      { stage: 'completed', desc: 'Windroid OS installation complete!', progress: 100 }
    ];

    let stepIdx = 0;
    this.progressTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        const item = steps[stepIdx];
        this.mockStatus = {
          ...this.mockStatus,
          status: item.progress === 100 ? 'completed' : 'in_progress',
          stage: item.stage,
          stageDescription: item.desc,
          progress: item.progress
        };
        this.notifyListeners();
        stepIdx++;
      } else {
        if (this.progressTimer) clearInterval(this.progressTimer);
        this.progressTimer = null;
        this.isExecuting = false;
      }
    }, 800);

    return { success: true, status: 'started' };
  }

  public async executePowerAction(action: PowerAction) {
    console.log(`[BrowserMockSystemBackend] Executed power action: ${action}`);
    return { success: true };
  }

  public async createUser(data: { username: string; fullName?: string; password?: string }) {
    try {
      const existing = localStorage.getItem('windroid_user_accounts');
      const accounts = existing ? JSON.parse(existing) : [];
      
      // Avoid duplicate accounts on repeated submissions
      const idx = accounts.findIndex((a: any) => a.username === data.username);
      const acc = {
        username: data.username,
        fullName: data.fullName || data.username,
        isAdmin: true,
        uid: 1000,
        gid: 1000
      };

      if (idx >= 0) {
        accounts[idx] = acc;
      } else {
        accounts.push(acc);
      }

      localStorage.setItem('windroid_user_accounts', JSON.stringify(accounts));
      localStorage.setItem('windroid_current_user', data.username);
    } catch (_) {}
    return { success: true, username: data.username };
  }

  public async setTimezone(timezone: string) {
    try {
      localStorage.setItem('windroid_timezone', timezone);
    } catch (_) {}
    return { success: true };
  }

  public async setLocale(locale: string) {
    try {
      localStorage.setItem('windroid_locale', locale);
    } catch (_) {}
    return { success: true };
  }

  public async setKeyboardLayout(layout: string) {
    try {
      localStorage.setItem('windroid_keyboard', layout);
    } catch (_) {}
    return { success: true };
  }

  public async getRuntimeMode(): Promise<RuntimeMode> {
    return 'browser-development';
  }

  public async getDisplayInfo(): Promise<DisplayInfo> {
    const rawSaved = localStorage.getItem('windroid_display_brightness');
    const brightness = rawSaved !== null ? parseInt(rawSaved, 10) : 100;
    const rawNightLight = localStorage.getItem('windroid_nightlight');
    const isNight = rawNightLight === 'true';

    return {
      displays: [
        {
          id: 'VIRTUAL-1',
          name: 'Windroid Virtual Screen',
          connector: 'eDP-1',
          currentResolution: '1920x1080',
          availableResolutions: ['1920x1080', '1600x900', '1366x768', '1280x720'],
          refreshRates: [60],
          currentRefreshRate: 60,
          primary: true,
          isPrimary: true,
          activeRefreshRate: '60.0',
          orientation: 'normal',
          scaling: 1.0,
          physicalSize: '15.6 inch'
        }
      ],
      gpu: 'Windroid Virtual GPU Accelerated (Mesa / LLVMpipe)',
      brightness,
      hardwareBrightnessSupported: false,
      hasHardwareBacklight: false,
      nightLightSupported: true,
      nightLightActive: isNight,
      nightLightTemperature: 4500
    };
  }

  public async setDisplayBrightness(brightness: number): Promise<{ success: boolean; brightness: number; hardware?: boolean }> {
    const clamped = Math.max(0, Math.min(100, brightness));
    try {
      localStorage.setItem('windroid_display_brightness', String(clamped));
    } catch (_) {}
    return { success: true, brightness: clamped, hardware: false };
  }

  public async setDisplayNightLight(active: boolean, temperature?: number): Promise<{ success: boolean; active: boolean; temperature?: number }> {
    try {
      localStorage.setItem('windroid_nightlight', String(active));
      if (temperature) {
        localStorage.setItem('windroid_nightlight_temp', String(temperature));
      }
    } catch (_) {}
    return { success: true, active, temperature: temperature || 4500 };
  }

  public async configureDisplay(config: { displayId?: string; id?: string; resolution: string; refreshRate?: number | string; orientation?: string; isPrimary?: boolean }): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  public async getAudioStatus(): Promise<AudioStatus> {
    const rawVol = localStorage.getItem('windroid_audio_volume');
    const volume = rawVol !== null ? parseInt(rawVol, 10) : 80;
    const isMuted = localStorage.getItem('windroid_audio_muted') === 'true';

    return {
      isAudioAvailable: true,
      masterVolume: volume,
      isMuted,
      micVolume: 100,
      isMicMuted: false,
      defaultOutputId: 'mock-speakers',
      defaultInputId: 'mock-mic',
      outputs: [
        {
          id: 'mock-speakers',
          name: 'Speakers (Windroid High Definition Audio)',
          description: 'Default System Output Sink',
          active: true,
          isActive: true,
          volume,
          muted: isMuted
        },
        {
          id: 'mock-headphones',
          name: 'Headphones (Stereo Output)',
          description: 'Front 3.5mm Headphone Jack',
          active: false,
          isActive: false,
          volume,
          muted: false
        }
      ],
      inputs: [
        {
          id: 'mock-mic',
          name: 'Internal Microphone Array',
          description: 'Front Microphone Input',
          active: true,
          isActive: true,
          volume: 100,
          muted: false
        }
      ]
    };
  }

  public async setAudioVolume(volume: number, isMuted?: boolean, target?: 'output' | 'input'): Promise<{ success: boolean; volume: number; target?: string }> {
    const clamped = Math.max(0, Math.min(100, volume));
    try {
      localStorage.setItem('windroid_audio_volume', String(clamped));
      if (isMuted !== undefined) {
        localStorage.setItem('windroid_audio_muted', String(isMuted));
      }
    } catch (_) {}
    return { success: true, volume: clamped, target: target || 'output' };
  }

  public async setAudioDefaultDevice(deviceId: string, target?: 'output' | 'input'): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  public async getCapabilities(): Promise<SystemCapabilities> {
    return {
      wifi: true,
      bluetooth: true,
      hotspot: true,
      displayConfig: true,
      hardwareBrightness: false,
      audioOutput: true,
      audioInput: true,
      battery: true,
      suspend: true,
      nightLight: true,
      powerManagement: true,
      isNative: false
    };
  }

  public async getPowerStatus(): Promise<PowerStatus> {
    return {
      hasBattery: true,
      chargingState: 'charging',
      batteryPercent: 95,
      acConnected: true,
      healthPercent: 100,
      estimatedTimeRemainingMinutes: 240,
      batterySaverActive: false,
      isDesktopOrVM: false
    };
  }

  public subscribeInstallerProgress(onProgress: (status: InstallerStatus) => void): () => void {
    this.progressListeners.add(onProgress);
    onProgress(this.mockStatus);

    return () => {
      this.progressListeners.delete(onProgress);
    };
  }

  private notifyListeners() {
    this.progressListeners.forEach(listener => listener({ ...this.mockStatus }));
  }
}

let activeBackendInstance: SystemBackend | null = null;

export async function initializeSystemBackend(): Promise<SystemBackend> {
  if (activeBackendInstance) return activeBackendInstance;

  if (isBrowserDevelopment()) {
    activeBackendInstance = new BrowserMockSystemBackend();
    return activeBackendInstance;
  }

  // In native production ISO environment, strictly use NativeSystemBackend.
  activeBackendInstance = new NativeSystemBackend();
  await activeBackendInstance.checkNativeBridge(true);
  return activeBackendInstance;
}

export function getSystemBackend(): SystemBackend {
  if (!activeBackendInstance) {
    if (isBrowserDevelopment()) {
      activeBackendInstance = new BrowserMockSystemBackend();
    } else {
      activeBackendInstance = new NativeSystemBackend();
    }
  }
  return activeBackendInstance;
}
