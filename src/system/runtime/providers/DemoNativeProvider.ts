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

export class DemoNativeProvider implements AppRuntimeProvider {
  public runtime: AppRuntime = 'native';

  async isAvailable(): Promise<boolean> {
    return true; // Simulation mode available
  }

  async getStatus(): Promise<RuntimeStatus> {
    return {
      runtime: 'native',
      status: 'installed',
      message: 'Simulation — Flatpak Native Linux engine active in browser mode',
      version: 'Flatpak 1.15.6 (Simulated)',
      isNativeAvailable: false,
      activeContainersOrPrefixes: 1
    };
  }

  async inspectPackage(path: string): Promise<PackageInspection> {
    const filename = path.split('/').pop() || path;
    const cleanName = filename
      .replace(/\.(flatpak|flatpakref)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      packageName: `org.windroid.${cleanName.toLowerCase().replace(/\s+/g, '')}`,
      displayName: cleanName || 'Native Linux Application',
      publisher: 'Windroid Community / Open Source Contributor',
      version: '1.0.0-native',
      runtime: 'native',
      fileType: path.endsWith('.flatpakref') ? 'flatpakref' : 'flatpak',
      architecture: 'x86_64',
      estimatedSize: '45.2 MB',
      sizeBytes: 47395840,
      permissions: ['Wayland Compositor', 'PipeWire Audio', 'Host Storage Access (Sandbox)'],
      packageHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      knownLimitations: ['Requires Flatpak runtime sandbox'],
      isSigned: true,
      sourcePath: path,
      icon: 'Terminal'
    };
  }

  async checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult> {
    return {
      rating: 'excellent' as CompatibilityRating,
      statusText: 'Fully Compatible (Native Linux Runtime)',
      details: [
        'Windroid OS Linux Kernel supports native Flatpak sandboxing',
        'Direct Wayland display protocol acceleration supported',
        'System PipeWire audio interface verified'
      ],
      passesArchCheck: true,
      requiredLibraries: ['org.freedesktop.Platform//23.08', 'org.gnome.Sdk//45'],
      graphicsBackend: 'Native Wayland / Mesa EGL'
    };
  }

  async install(
    request: InstallRequest,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<any> {
    const steps = [
      { step: 'Reading Flatpak reference manifest...', percent: 20 },
      { step: 'Verifying GPG signature & permissions...', percent: 40 },
      { step: 'Fetching sandbox runtime dependencies...', percent: 70 },
      { step: 'Registering Windroid OS desktop shortcut...', percent: 90 },
      { step: 'Installation finished!', percent: 100 }
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
      await new Promise((res) => setTimeout(res, 350));
    }

    return {
      id: `app_native_${Date.now()}`,
      name: request.packageName || 'Native Linux App',
      runtime: 'native'
    };
  }

  async launch(appId: string): Promise<void> {
    console.log(`[DemoNativeProvider] Launching native application: ${appId}`);
  }

  async terminate(appId: string): Promise<void> {
    console.log(`[DemoNativeProvider] Terminating native application: ${appId}`);
  }

  async uninstall(appId: string): Promise<void> {
    console.log(`[DemoNativeProvider] Uninstalling native package: ${appId}`);
  }

  async repair(appId: string): Promise<void> {
    console.log(`[DemoNativeProvider] Repairing Flatpak refs for: ${appId}`);
  }
}
