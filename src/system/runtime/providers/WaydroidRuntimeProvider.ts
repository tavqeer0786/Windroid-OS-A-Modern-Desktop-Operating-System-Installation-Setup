import {
  AppRuntimeProvider,
  AppRuntime,
  RuntimeStatus,
  PackageInspection,
  CompatibilityResult,
  InstallRequest,
  InstallProgress
} from '../AppRuntimeProvider';
import { DemoAndroidProvider } from './DemoAndroidProvider';

export interface DroidBridgeContract {
  getRuntimeStatus: () => Promise<RuntimeStatus>;
  startRuntime: () => Promise<void>;
  stopRuntime: () => Promise<void>;
  inspectApk: (path: string) => Promise<PackageInspection>;
  installApk: (path: string) => Promise<any>;
  launchPackage: (packageName: string) => Promise<void>;
  uninstallPackage: (packageName: string) => Promise<void>;
  listApps: () => Promise<any[]>;
}

export class WaydroidRuntimeProvider implements AppRuntimeProvider {
  public runtime: AppRuntime = 'android';
  private demoFallback = new DemoAndroidProvider();

  private get bridge(): DroidBridgeContract | undefined {
    return typeof window !== 'undefined' ? (window.windroid?.droidbridge || window.aether?.droidbridge) : undefined;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.bridge;
  }

  async getStatus(): Promise<RuntimeStatus> {
    if (this.bridge) {
      return await this.bridge.getRuntimeStatus();
    }
    const demoStatus = await this.demoFallback.getStatus();
    return {
      ...demoStatus,
      message: 'Simulation — native bridge unavailable'
    };
  }

  async inspectPackage(path: string): Promise<PackageInspection> {
    if (this.bridge) {
      return await this.bridge.inspectApk(path);
    }
    return await this.demoFallback.inspectPackage(path);
  }

  async checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult> {
    return await this.demoFallback.checkCompatibility(inspection);
  }

  async install(
    request: InstallRequest,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<any> {
    if (this.bridge) {
      return await this.bridge.installApk(request.packagePath);
    }
    return await this.demoFallback.install(request, onProgress);
  }

  async launch(appId: string): Promise<void> {
    if (this.bridge) {
      return await this.bridge.launchPackage(appId);
    }
    return await this.demoFallback.launch(appId);
  }

  async terminate(appId: string): Promise<void> {
    return await this.demoFallback.terminate(appId);
  }

  async uninstall(appId: string): Promise<void> {
    if (this.bridge) {
      return await this.bridge.uninstallPackage(appId);
    }
    return await this.demoFallback.uninstall(appId);
  }

  async repair(appId: string): Promise<void> {
    return await this.demoFallback.repair(appId);
  }
}
