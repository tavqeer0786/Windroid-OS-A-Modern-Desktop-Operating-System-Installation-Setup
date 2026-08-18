import {
  AppRuntimeProvider,
  AppRuntime,
  RuntimeStatus,
  PackageInspection,
  CompatibilityResult,
  InstallRequest,
  InstallProgress
} from './AppRuntimeProvider';
import { PackageDetectionService, PackageDetectionResult } from './PackageDetectionService';
import { NativeLinuxProvider } from './providers/NativeLinuxProvider';
import { WineRuntimeProvider } from './providers/WineRuntimeProvider';
import { WaydroidRuntimeProvider } from './providers/WaydroidRuntimeProvider';
import { DemoNativeProvider } from './providers/DemoNativeProvider';
import { DemoWindowsProvider } from './providers/DemoWindowsProvider';
import { DemoAndroidProvider } from './providers/DemoAndroidProvider';
import { InstalledAppRegistry, InstalledApplication } from '../apps/InstalledAppRegistry';
import { DemoPackageService } from '../demo/DemoPackageService';

export class AppRuntimeService {
  private static instance: AppRuntimeService;

  private nativeProvider: AppRuntimeProvider;
  private windowsProvider: AppRuntimeProvider;
  private androidProvider: AppRuntimeProvider;

  private constructor() {
    this.nativeProvider = new NativeLinuxProvider();
    this.windowsProvider = new WineRuntimeProvider();
    this.androidProvider = new WaydroidRuntimeProvider();
  }

  public static getInstance(): AppRuntimeService {
    if (!AppRuntimeService.instance) {
      AppRuntimeService.instance = new AppRuntimeService();
    }
    return AppRuntimeService.instance;
  }

  public detectPackage(path: string, mimeType?: string): PackageDetectionResult {
    return PackageDetectionService.detectPackage(path, mimeType);
  }

  public getProviderForRuntime(runtime: AppRuntime): AppRuntimeProvider {
    switch (runtime) {
      case 'native':
        return this.nativeProvider;
      case 'windows':
        return this.windowsProvider;
      case 'android':
        return this.androidProvider;
      default:
        return this.nativeProvider;
    }
  }

  public async getRuntimeStatus(runtime: AppRuntime): Promise<RuntimeStatus> {
    const provider = this.getProviderForRuntime(runtime);
    return await provider.getStatus();
  }

  public async getAllRuntimeStatuses(): Promise<Record<AppRuntime, RuntimeStatus>> {
    const [nativeStatus, windowsStatus, androidStatus] = await Promise.all([
      this.nativeProvider.getStatus(),
      this.windowsProvider.getStatus(),
      this.androidProvider.getStatus()
    ]);

    return {
      native: nativeStatus,
      windows: windowsStatus,
      android: androidStatus
    };
  }

  public async inspectPackage(path: string): Promise<{
    detection: PackageDetectionResult;
    inspection?: PackageInspection;
  }> {
    const detection = this.detectPackage(path);
    if (!detection.supported || !detection.legacyRuntime) {
      return { detection };
    }

    const provider = this.getProviderForRuntime(detection.legacyRuntime);
    const inspection = await provider.inspectPackage(path);

    const filename = path.split('/').pop() || path;
    const demoMeta = DemoPackageService.getInstance().getMetadataByName(filename);
    if (demoMeta && inspection) {
      inspection.displayName = demoMeta.name.replace(/\.[^/.]+$/, '');
      inspection.publisher = demoMeta.publisher;
      inspection.version = demoMeta.version;
      inspection.architecture = demoMeta.architecture as PackageInspection['architecture'];
      inspection.estimatedSize = demoMeta.estimatedSize;
      inspection.sizeBytes = demoMeta.sizeBytes;
      inspection.packageHash = demoMeta.packageHash;
      if (demoMeta.icon) inspection.icon = demoMeta.icon;
    }

    return { detection, inspection };
  }

  public async checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult> {
    const provider = this.getProviderForRuntime(inspection.runtime);
    return await provider.checkCompatibility(inspection);
  }

  public async installApp(
    request: InstallRequest,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<InstalledApplication> {
    const detection = this.detectPackage(request.packagePath);
    const legacyRuntime = detection.legacyRuntime;
    if (!detection.supported || !legacyRuntime) {
      throw new Error(detection.reason || 'Unsupported package format.');
    }

    const provider = this.getProviderForRuntime(legacyRuntime);
    const inspection = request.inspection || (await provider.inspectPackage(request.packagePath));
    const comp = await provider.checkCompatibility(inspection);

    // Perform provider installation steps
    await provider.install(request, onProgress);

    // Map Lucide icon based on runtime
    let defaultIcon = 'Box';
    if (legacyRuntime === 'native') defaultIcon = 'Terminal';
    if (legacyRuntime === 'windows') defaultIcon = 'Monitor';
    if (legacyRuntime === 'android') defaultIcon = 'Smartphone';

    // Create InstalledApplication entry
    const appId = `app_${legacyRuntime}_${Date.now()}`;
    const installedApp: InstalledApplication = {
      id: appId,
      name: inspection.displayName || request.packageName,
      description: `${inspection.displayName} (${inspection.runtime.toUpperCase()} app via ${
        legacyRuntime === 'windows' ? 'WinBridge Wine' : legacyRuntime === 'android' ? 'DroidBridge Waydroid' : 'Flatpak Native'
      })`,
      icon: inspection.icon || defaultIcon,
      runtime: legacyRuntime,
      packageId: inspection.packageName,
      executableTarget: inspection.packageName,
      installationPath: `/var/lib/windroid/${legacyRuntime === 'windows' ? 'winbridge' : legacyRuntime === 'android' ? 'droidbridge' : 'flatpak'}/apps/${appId}`,
      version: inspection.version || '1.0.0',
      publisher: inspection.publisher || 'Third-Party Developer',
      architecture: inspection.architecture,
      installedAt: new Date().toISOString().split('T')[0],
      source: `${request.packagePath.split('/').pop()}`,
      compatibilityRating: comp.rating,
      permissions: request.grantedPermissions || inspection.permissions,
      fileAssociations: [],
      isSystemApp: false,
      isProtected: false,
      canUninstall: true,
      canRepair: true,
      winePrefix: legacyRuntime === 'windows' ? `/var/lib/windroid/winbridge/prefixes/${appId}_pfx` : undefined,
      graphicsBackend: comp.graphicsBackend,
      knownLimitations: inspection.knownLimitations
    };

    // Register into central registry
    InstalledAppRegistry.getInstance().register(installedApp);

    return installedApp;
  }

  public async launchApp(appIdOrPackage: string): Promise<void> {
    const registry = InstalledAppRegistry.getInstance();
    const app = registry.getById(appIdOrPackage);
    if (!app) {
      console.warn(`[AppRuntimeService] App not found in registry: ${appIdOrPackage}`);
      return;
    }

    // Update last opened timestamp
    registry.update(app.id, { lastOpenedAt: new Date().toISOString().split('T')[0] });

    const provider = this.getProviderForRuntime(app.runtime);
    await provider.launch(app.id);
  }

  public async uninstallApp(appId: string): Promise<boolean> {
    const registry = InstalledAppRegistry.getInstance();
    const app = registry.getById(appId);
    if (!app) return false;

    const provider = this.getProviderForRuntime(app.runtime);
    await provider.uninstall(app.id);

    return registry.uninstall(app.id);
  }
}
