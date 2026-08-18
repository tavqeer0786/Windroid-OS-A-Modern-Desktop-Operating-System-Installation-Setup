export interface SystemCapabilities {
  wifi: boolean;
  bluetooth: boolean;
  hotspot: boolean;
  displayConfig: boolean;
  hardwareBrightness: boolean;
  audioOutput: boolean;
  audioInput: boolean;
  battery: boolean;
  suspend: boolean;
  nightLight: boolean;
  powerManagement: boolean;
  isNative: boolean;
}

export const DEFAULT_SYSTEM_CAPABILITIES: SystemCapabilities = {
  wifi: false,
  bluetooth: false,
  hotspot: false,
  displayConfig: false,
  hardwareBrightness: false,
  audioOutput: false,
  audioInput: false,
  battery: false,
  suspend: false,
  nightLight: false,
  powerManagement: false,
  isNative: false,
};

export interface DisplayMonitor {
  id: string;
  name: string;
  connector: string;
  currentResolution: string;
  availableResolutions: string[];
  refreshRates: number[];
  currentRefreshRate: number;
  primary: boolean;
  isPrimary?: boolean;
  activeRefreshRate?: string;
  orientation: 'normal' | 'left' | 'right' | 'inverted';
  scaling: number;
  physicalSize?: string;
}

export interface DisplayInfo {
  displays: DisplayMonitor[];
  gpu: string;
  brightness: number; // 0 - 100
  hardwareBrightnessSupported: boolean;
  hasHardwareBacklight?: boolean;
  nightLightSupported: boolean;
  nightLightActive: boolean;
  nightLightTemperature: number; // Kelvin e.g. 4500
}

export interface AudioDevice {
  id: string;
  name: string;
  description: string;
  active: boolean;
  isActive?: boolean;
  volume: number;
  muted: boolean;
}

export interface AudioStatus {
  isAudioAvailable: boolean;
  masterVolume: number;
  isMuted: boolean;
  micVolume: number;
  isMicMuted: boolean;
  defaultOutputId: string;
  defaultInputId: string;
  outputs: AudioDevice[];
  inputs: AudioDevice[];
}

export interface PowerStatus {
  hasBattery: boolean;
  chargingState: 'charging' | 'discharging' | 'full' | 'not_charging' | 'unknown';
  batteryPercent: number | null;
  acConnected: boolean;
  healthPercent: number | null;
  estimatedTimeRemainingMinutes: number | null;
  batterySaverActive: boolean;
  isDesktopOrVM: boolean;
}

export type PowerAction = 'shutdown' | 'restart' | 'suspend' | 'lock' | 'logout';
