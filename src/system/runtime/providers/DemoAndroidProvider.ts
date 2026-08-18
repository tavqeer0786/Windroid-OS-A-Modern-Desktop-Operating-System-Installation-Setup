import {
  AppRuntimeProvider,
  AppRuntime,
  RuntimeStatus,
  PackageInspection,
  CompatibilityResult,
  InstallRequest,
  InstallProgress,
  CompatibilityRating
} from '../AppRuntimeProvider';

export class DemoAndroidProvider implements AppRuntimeProvider {
  public runtime: AppRuntime = 'android';

  async isAvailable(): Promise<boolean> {
    return true; // Browser simulation
  }

  async getStatus(): Promise<RuntimeStatus> {
    return {
      runtime: 'android',
      status: 'installed',
      message: 'Simulation — DroidBridge (Waydroid Android 13 Container) simulated',
      version: 'Waydroid 1.4.2 (Android 13 Image)',
      isNativeAvailable: false,
      activeContainersOrPrefixes: 1
    };
  }

  async inspectPackage(path: string): Promise<PackageInspection> {
    const filename = path.split('/').pop() || path;
    const cleanName = filename
      .replace(/\.apk$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    // Determine sample architecture based on filename
    const isArmOnly = path.toLowerCase().includes('arm') || path.toLowerCase().includes('social');
    const arch = isArmOnly ? 'arm64-v8a' : 'universal';

    return {
      packageName: `com.example.${cleanName.toLowerCase().replace(/\s+/g, '')}`,
      displayName: cleanName || 'Android Application',
      publisher: 'Android App Developer',
      version: '3.1.2-android',
      runtime: 'android',
      fileType: 'apk',
      architecture: arch,
      estimatedSize: '34.8 MB',
      sizeBytes: 36490445,
      permissions: [
        'Camera',
        'Microphone',
        'Files and media',
        'Location',
        'Notifications',
        'Contacts'
      ],
      packageHash: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      knownLimitations: isArmOnly
        ? ['Requires libndk / libhoudini ARM translation layer on x86_64 host']
        : ['Google Play Services framework not present by default'],
      minOsVersion: 'Android 10 (API Level 29)',
      isSigned: true,
      sourcePath: path,
      icon: 'Smartphone'
    };
  }

  async checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult> {
    const isArmOnly = inspection.architecture === 'arm64-v8a' || inspection.architecture === 'armeabi-v7a';

    const warnings: string[] = [];
    if (isArmOnly) {
      warnings.push('This Android application requires ARM translation and may not run on this device.');
    }

    return {
      rating: isArmOnly ? ('partial' as CompatibilityRating) : ('good' as CompatibilityRating),
      statusText: isArmOnly
        ? 'Requires ARM Translation (x86_64 Host)'
        : 'Compatible with DroidBridge Waydroid Container',
      details: [
        'DroidBridge Waydroid LXC Android container is initialized',
        isArmOnly
          ? 'Package architecture is ARM64. x86_64 host will use libndk translation.'
          : 'Package contains universal / x86_64 native binaries.',
        'Requested Android permissions require review before installation',
        'Graphics rendered directly to Wayland surface via EGL buffer sharing'
      ],
      passesArchCheck: !isArmOnly,
      requiredLibraries: ['Waydroid Android 13 System Image', 'binderfs', 'ashmem'],
      graphicsBackend: 'Wayland EGL SurfaceFlinger',
      androidMinSdk: 'API 29 (Android 10)',
      warnings
    };
  }

  async install(
    request: InstallRequest,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<any> {
    const steps = [
      { step: 'Parsing Android APK manifest & certificate signature...', percent: 15 },
      { step: 'Starting DroidBridge Waydroid LXC container instance...', percent: 35 },
      { step: 'Reviewing and registering Android permissions...', percent: 55 },
      { step: 'Executing pm install via Waydroid session manager...', percent: 80 },
      { step: 'Mapping Android intent handlers and launcher shortcut...', percent: 100 }
    ];

    for (const item of steps) {
      if (onProgress) {
        onProgress({
          step: item.step,
          percent: item.percent,
          status: item.percent === 100 ? 'completed' : 'in_progress',
          message: 'Simulation only — real installation requires Windroid OS native runtime.'
        });
      }
      await new Promise((res) => setTimeout(res, 400));
    }

    return {
      id: `app_droid_${Date.now()}`,
      name: request.packageName || 'Android Application',
      runtime: 'android'
    };
  }

  async launch(appId: string): Promise<void> {
    console.log(`[DemoAndroidProvider] Ensuring Waydroid container is running and launching package: ${appId}`);
  }

  async terminate(appId: string): Promise<void> {
    console.log(`[DemoAndroidProvider] Force stopping Android package: ${appId}`);
  }

  async uninstall(appId: string): Promise<void> {
    console.log(`[DemoAndroidProvider] Uninstalling Android package via Waydroid: ${appId}`);
  }

  async repair(appId: string): Promise<void> {
    console.log(`[DemoAndroidProvider] Clearing app cache & resetting DroidBridge permissions for: ${appId}`);
  }
}
