import {
  InstallerPackageKind,
  InstallerRuntimeKind,
  InstallerLaunchMode,
} from './InstallerTypes';

export type InstallationDestinationKind =
  | 'applications-default'
  | 'custom-folder'
  | 'droidbridge-managed'
  | 'flatpak-user'
  | 'flatpak-system';

export interface InstallationDestinationOption {
  id: string;
  kind: InstallationDestinationKind;

  title: string;
  description?: string;

  displayPath?: string;
  resolvedPath?: string;

  recommended: boolean;
  selected: boolean;

  customLocationAllowed: boolean;
  requiresElevation: boolean;
  managedByRuntime: boolean;

  available: boolean;
  disabledReason?: string;
}

export interface InstallationDestinationValidation {
  valid: boolean;
  writable?: boolean;
  exists?: boolean;
  enoughSpace?: boolean;
  errorCode?: string;
  message?: string;
}

export interface InstallationDestinationPolicy {
  packageKind: InstallerPackageKind;
  runtime: InstallerRuntimeKind;

  availableOptions: InstallationDestinationOption[];

  selectedOptionId: string;

  customPath?: string;

  validation: InstallationDestinationValidation;

  source:
    | 'default-policy'
    | 'user-preference'
    | 'store-policy'
    | 'demo-policy';

  resolvedAt: number;
}

export interface InstallationDestinationContext {
  launchMode?: InstallerLaunchMode;
  currentUser?: string;
  userHomePath?: string;
  defaultApplicationsPath?: string;
  selectedCustomPath?: string;
  availableStorageBytes?: number;
  requiredStorageBytes?: number;
  supportsSystemScope?: boolean;
  supportsCustomFolder?: boolean;
}

export const DEFAULT_APPLICATIONS_DISPLAY_PATH = '/WindroidOS/Applications';
export const DROIDBRIDGE_MANAGED_DISPLAY_PATH = 'DroidBridge Android Environment';
