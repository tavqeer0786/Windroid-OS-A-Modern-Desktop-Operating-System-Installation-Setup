/**
 * @deprecated Legacy OS Installer types (Phase 1 Cleanup).
 * These types belong to the removed legacy installer architecture.
 * Phase 2 will implement the new installer architecture and its updated type definitions.
 */
export type BootMode = 'uefi' | 'bios';
/** @deprecated Legacy OS Installer type */
export type InstallationMode = 'erase_disk' | 'manual';
/** @deprecated Legacy OS Installer type */
export type InstallerStage =
  | 'idle'
  | 'preparing_disk'
  | 'creating_partitions'
  | 'formatting_filesystems'
  | 'mounting_target'
  | 'copying_system'
  | 'configuring_user'
  | 'configuring_system'
  | 'installing_bootloader'
  | 'finalizing'
  | 'completed'
  | 'failed';

/** @deprecated Legacy OS Installer type */
export interface InstallerPartition {
  device: string;
  number: number;
  sizeBytes: number;
  filesystem: string;
  label: string;
  uuid: string;
  mountPoint: string;
  partitionType: string;
  bootable: boolean;
  flags?: string[];
}

/** @deprecated Legacy OS Installer type */
export interface InstallerDisk {
  device: string;
  model: string;
  vendor: string;
  serial: string;
  sizeBytes: number;
  transport: string;
  removable: boolean;
  rotational: boolean;
  readOnly: boolean;
  systemDisk: boolean;
  isLiveMedia: boolean;
  protected?: boolean;
  protectionReason?: string;
  isMock?: boolean;
  partitions: InstallerPartition[];
}

/** @deprecated Legacy OS Installer type */
export interface RawBlockDevice {
  path: string;
  name: string;
  type: string;
  sizeBytes: number;
  transport: string;
  removable: boolean;
  readOnly: boolean;
  model: string;
  serial: string;
  vendor: string;
  fstype?: string;
  mountPoint?: string;
}

/** @deprecated Legacy OS Installer type */
export interface ExcludedDevice {
  path: string;
  reason: string;
  details?: string;
  sizeBytes?: number;
}

/** @deprecated Legacy OS Installer type */
export interface GetInstallerDisksResponse {
  success: boolean;
  error?: string;
  disks: InstallerDisk[];
  rawBlockDevices?: RawBlockDevice[];
  eligibleDisks?: InstallerDisk[];
  excludedDevices?: ExcludedDevice[];
  liveMediaDevice?: string;
  rawKernelCmdline?: string;
  detectedWindroidMode?: string;
  diagnostics?: Record<string, any>;
  deprecated?: boolean;
}

export interface UserConfig {
  username: string;
  fullName: string;
  password?: string;
  deviceName: string;
  requirePassword: boolean;
}

export interface LocaleConfig {
  language: string;
  keyboard: string;
  timezone: string;
}

/** @deprecated Legacy OS Installer type */
export interface PlannedPartition {
  device: string;
  sizeBytes: number;
  filesystem: string;
  mountPoint: string;
  label?: string;
  flags?: string[];
}

/** @deprecated Legacy OS Installer type */
export interface InstallationPlan {
  version: string;
  targetDisk: string;
  bootMode: BootMode;
  installationMode: InstallationMode;
  partitions: PlannedPartition[];
  userConfig: UserConfig;
  localeConfig: LocaleConfig;
  bootloaderConfig: {
    targetDevice: string;
    type: 'grub-efi' | 'grub-pc';
  };
}

/** @deprecated Legacy OS Installer type */
export interface InstallerStatus {
  status: 'idle' | 'in_progress' | 'completed' | 'failed' | 'deprecated';
  stage: InstallerStage;
  stageDescription: string;
  progress: number;
  error: string | null;
  canInstall: boolean;
  runtimeMode: 'live' | 'installed' | 'browser-development' | 'installer';
  bootMode: BootMode;
  liveMediaDevice?: string;
  deprecated?: boolean;
}

export type InstallerPhase = 'installation' | 'oobe';

export type InstallationStep =
  | 'language'
  | 'target-disk'
  | 'ready'
  | 'installing'
  | 'complete';

export type OobeStep =
  | 'region'
  | 'keyboard'
  | 'user'
  | 'personalization'
  | 'finalizing'
  | 'desktop';

export interface CountryItem {
  id: string;
  name: string;
  locale: string;
  timezone: string;
  keyboardLayouts?: string[];
}

export type NativeInstallerState =
  | 'INSTALLER'
  | 'INSTALLATION_IN_PROGRESS'
  | 'INSTALLATION_COMPLETE'
  | 'OOBE_PENDING'
  | 'OOBE_IN_PROGRESS'
  | 'OOBE_COMPLETE'
  | 'DESKTOP_READY'
  | 'FAILED';

export interface NativeInstallerStateResponse {
  success: boolean;
  version: string;
  state: NativeInstallerState;
  updatedAt?: string;
  targetDisk?: string;
  localeConfig?: Partial<LocaleConfig>;
  userConfig?: {
    username?: string;
    fullName?: string;
    deviceName?: string;
  } | null;
  installationCompleted?: boolean;
  installationCompletedAt?: string | null;
  oobeCompleted?: boolean;
  oobeCompletedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  runtimeMode?: string;
}


