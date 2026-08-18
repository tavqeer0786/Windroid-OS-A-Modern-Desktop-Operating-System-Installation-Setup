export type AppRuntime = 'native' | 'windows' | 'android';

export type CompatibilityRating = 'excellent' | 'good' | 'partial' | 'untested' | 'unsupported';

export interface RuntimeStatus {
  runtime: AppRuntime;
  status: 'installed' | 'running' | 'needs_setup' | 'update_available' | 'error';
  message: string;
  version: string;
  isNativeAvailable: boolean;
  activeContainersOrPrefixes?: number;
}

export interface PackageInspection {
  packageName: string;
  displayName: string;
  publisher: string;
  version: string;
  runtime: AppRuntime;
  fileType: string; // 'exe' | 'msi' | 'apk' | 'flatpak' | 'flatpakref'
  architecture: 'x86' | 'x86_64' | 'armeabi-v7a' | 'arm64-v8a' | 'universal' | 'unknown';
  estimatedSize: string;
  sizeBytes: number;
  permissions: string[];
  packageHash: string;
  knownLimitations: string[];
  minOsVersion?: string;
  isSigned: boolean;
  sourcePath: string;
  icon?: string;
}

export interface CompatibilityResult {
  rating: CompatibilityRating;
  statusText: string;
  details: string[];
  passesArchCheck: boolean;
  requiredLibraries: string[];
  graphicsBackend: string;
  wineVersion?: string;
  androidMinSdk?: string;
  warnings?: string[];
}

export interface InstallRequest {
  packagePath: string;
  packageName: string;
  packageType: string;
  customPrefix?: string;
  grantedPermissions?: string[];
  inspection?: PackageInspection;
}

export interface InstallProgress {
  step: string;
  percent: number;
  status: 'in_progress' | 'completed' | 'failed';
  message?: string;
}

export interface AppRuntimeProvider {
  runtime: AppRuntime;
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<RuntimeStatus>;
  inspectPackage(path: string): Promise<PackageInspection>;
  checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult>;
  install(
    request: InstallRequest,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<any>;
  launch(appId: string): Promise<void>;
  terminate(appId: string): Promise<void>;
  uninstall(appId: string): Promise<void>;
  repair?(appId: string): Promise<void>;
}
