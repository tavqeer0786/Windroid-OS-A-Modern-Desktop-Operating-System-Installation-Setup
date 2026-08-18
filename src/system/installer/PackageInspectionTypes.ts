import {
  InstallerPackageKind,
  InstallerRuntimeKind,
  InstallerArchitecture,
  InstallerPermission,
} from './InstallerTypes';
import { PackageDetectionResult } from './PackageDetectionService';

export interface WindowsPackageMetadata {
  packageType: 'exe' | 'msi';
  productName?: string;
  productCode?: string;
  companyName?: string;
  fileDescription?: string;
  originalFileName?: string;
  fileVersion?: string;
  productVersion?: string;
  requestedExecutionLevel?:
    | 'asInvoker'
    | 'highestAvailable'
    | 'requireAdministrator'
    | 'unknown';
  detectedCapabilities?: string[];
  likelyInstallerFramework?:
    | 'msi'
    | 'nsis'
    | 'inno-setup'
    | 'squirrel'
    | 'installshield'
    | 'portable'
    | 'unknown';
}

export interface AndroidPackageMetadata {
  packageName?: string;
  appLabel?: string;
  versionName?: string;
  versionCode?: number;
  minSdkVersion?: number;
  targetSdkVersion?: number;
  supportedAbis?: Array<
    'armeabi-v7a' | 'arm64-v8a' | 'x86' | 'x86_64' | 'universal'
  >;
  requestedPermissions?: string[];
  activities?: string[];
  launchActivity?: string;
  usesFeatures?: string[];
}

export interface FlatpakPackageMetadata {
  appId?: string;
  branch?: string;
  runtime?: string;
  runtimeVersion?: string;
  sdk?: string;
  remoteName?: string;
  repositoryUrl?: string;
  architecture?: string;
  command?: string;
  permissions?: string[];
  installationScope?: 'user' | 'system' | 'unknown';
}

export interface PackageInspectionWarning {
  code: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export interface PackageInspectionResult {
  packageKind: InstallerPackageKind;
  runtime: InstallerRuntimeKind;

  source:
    | 'native-bridge'
    | 'store-metadata'
    | 'demo-metadata'
    | 'filename-fallback'
    | 'unavailable';

  inspectedAt: number;

  package: {
    fileName: string;
    sourcePath?: string;
    packageId?: string;
    displayName?: string;
    description?: string;
    icon?: string;
    publisher?: string;
    version?: string;
    versionCode?: string | number;
    architecture?: InstallerArchitecture;
    packageSizeBytes?: number;
    estimatedInstalledSizeBytes?: number;
    releaseDate?: string;
  };

  platformMetadata?: {
    windows?: WindowsPackageMetadata;
    android?: AndroidPackageMetadata;
    flatpak?: FlatpakPackageMetadata;
  };

  verification: {
    publisherStatus:
      | 'verified'
      | 'unverified'
      | 'unknown'
      | 'not-available';

    signatureStatus:
      | 'valid'
      | 'invalid'
      | 'unsigned'
      | 'unknown'
      | 'not-available';

    integrityStatus:
      | 'valid'
      | 'invalid'
      | 'unknown'
      | 'not-available';

    compatibilityStatus:
      | 'compatible'
      | 'limited'
      | 'unsupported'
      | 'unknown';

    hash?: {
      algorithm: 'sha256' | 'sha1' | 'md5' | 'unknown';
      value?: string;
      verified: boolean;
    };
  };

  requestedPermissions?: InstallerPermission[];

  warnings: PackageInspectionWarning[];

  limitations: string[];
}

export interface PackageInspectionOptions {
  storeMetadata?: Record<string, any>;
}

export interface PackageInspectionAdapter {
  readonly id: string;

  canInspect(
    detection: PackageDetectionResult,
    options?: PackageInspectionOptions
  ): boolean;

  inspect(
    detection: PackageDetectionResult,
    options?: PackageInspectionOptions,
    signal?: AbortSignal
  ): Promise<PackageInspectionResult>;
}
