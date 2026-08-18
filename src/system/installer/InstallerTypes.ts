import { InstallationPlan } from './InstallationPlanTypes';

export type InstallerPackageKind =
  | 'windows-exe'
  | 'windows-msi'
  | 'android-apk'
  | 'flatpak-bundle'
  | 'flatpak-reference'
  | 'unknown';

export type InstallerRuntimeKind =
  | 'winbridge'
  | 'droidbridge'
  | 'native-flatpak'
  | 'unresolved';

export type InstalledLaunchTarget =
  | {
      runtime: 'winbridge' | 'windows';
      prefixId?: string;
      executablePath: string;
    }
  | {
      runtime: 'droidbridge' | 'android';
      packageName: string;
      activity?: string;
    }
  | {
      runtime: 'native-flatpak' | 'flatpak';
      appId: string;
    }
  | {
      runtime: 'simulation';
      demoAppId: string;
      executablePath?: string;
    };

export type InstallerLaunchMode =
  | 'local-package'
  | 'store-install'
  | 'developer-demo';

export type InstallerStep =
  | 'overview'
  | 'permissions'
  | 'location'
  | 'review'
  | 'installing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type InstallerSessionStatus =
  | 'created'
  | 'inspecting'
  | 'ready'
  | 'installing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type InstallerArchitecture =
  | 'x86'
  | 'x64'
  | 'arm'
  | 'arm64'
  | 'universal'
  | 'unknown';

export interface InstallerPermission {
  id: string;
  key: string;
  title: string;
  description?: string;
  category:
    | 'files'
    | 'network'
    | 'camera'
    | 'microphone'
    | 'location'
    | 'contacts'
    | 'notifications'
    | 'bluetooth'
    | 'clipboard'
    | 'display'
    | 'audio'
    | 'usb'
    | 'registry'
    | 'services'
    | 'startup'
    | 'administrator'
    | 'system'
    | 'other';
  required: boolean;
  enabled: boolean;
  canUserChange: boolean;
  canChangeLater: boolean;
  source:
    | 'android-manifest'
    | 'flatpak-metadata'
    | 'windows-capability'
    | 'store-metadata'
    | 'demo'
    | 'fallback';
  riskLevel: 'normal' | 'sensitive' | 'elevated';
  rawValue?: string;
  sortOrder?: number;
}

export interface InstallerError {
  code: string;
  title: string;
  message: string;
  recoverable: boolean;
  technicalDetails?: string;
  providerId?: string;
}

export interface InstallationSession {
  id: string;

  launchMode: InstallerLaunchMode;

  source: {
    packagePath?: string;
    sourceName?: string;
    storeAppId?: string;
  };

  packageKind: InstallerPackageKind;
  runtime: InstallerRuntimeKind;

  currentStep: InstallerStep;
  status: InstallerSessionStatus;

  packageInfo: {
    fileName?: string;
    displayName?: string;
    publisher?: string;
    version?: string;
    architecture?: InstallerArchitecture;
    packageSizeBytes?: number;
    installedSizeBytes?: number;
    icon?: string;
  };

  verification: {
    publisherVerified?: boolean;
    signatureValid?: boolean;
    packageIntegrityValid?: boolean;
    compatibilityStatus?:
      | 'unknown'
      | 'compatible'
      | 'limited'
      | 'unsupported';
  };

  permissions: {
    required: InstallerPermission[];
    optional: InstallerPermission[];
  };

  destination: {
    policy: 'default' | 'custom' | 'managed' | 'user' | 'system';
    optionId?: string;
    path?: string;
    displayPath?: string;
    resolvedPath?: string;
    customLocationAllowed: boolean;
    managedByRuntime?: boolean;
    requiresElevation?: boolean;
    validation?: {
      valid: boolean;
      writable?: boolean;
      enoughSpace?: boolean;
      errorCode?: string;
      message?: string;
    };
  };

  options: {
    createDesktopShortcut: boolean;
    pinToDock: boolean;
    addToApplicationsMenu: boolean;
    launchAfterInstall: boolean;
  };

  progress: {
    stage:
      | 'idle'
      | 'preparing'
      | 'verifying'
      | 'resolving-runtime'
      | 'preparing-runtime'
      | 'preparing-destination'
      | 'extracting'
      | 'installing'
      | 'applying-permissions'
      | 'registering'
      | 'creating-shortcuts'
      | 'pinning-dock'
      | 'finalizing'
      | 'rolling-back'
      | 'completed'
      | 'failed'
      | 'cancelled';
    percent?: number;
    message?: string;
    operationId?: string;
    operationKind?: string;
    startedAt?: number;
    completedAt?: number;
    executionState?:
      | 'idle'
      | 'starting'
      | 'running'
      | 'paused'
      | 'cancelling'
      | 'cancelled'
      | 'completed'
      | 'failed';
    canPause?: boolean;
    canResume?: boolean;
  };

  result?: {
    installedAppId?: string;
    launchTarget?: unknown;
  };

  error?: InstallerError;

  plan?: InstallationPlan;
  planStatus?:
    | 'not-created'
    | 'ready'
    | 'stale'
    | 'blocked';

  createdAt: number;
  updatedAt: number;
}

export function getVisibleInstallerSteps(launchMode: InstallerLaunchMode): InstallerStep[] {
  switch (launchMode) {
    case 'store-install':
      return ['installing', 'completed'];
    case 'local-package':
    case 'developer-demo':
    default:
      return ['overview', 'permissions', 'location', 'review', 'installing', 'completed'];
  }
}
