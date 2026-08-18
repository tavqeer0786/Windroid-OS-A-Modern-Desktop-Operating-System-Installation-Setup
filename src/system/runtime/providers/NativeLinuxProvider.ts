import {
  AppRuntimeProvider,
  AppRuntime,
  RuntimeStatus,
  PackageInspection,
  CompatibilityResult,
  InstallRequest,
  InstallProgress
} from '../AppRuntimeProvider';
import { DemoNativeProvider } from './DemoNativeProvider';

export class NativeLinuxProvider implements AppRuntimeProvider {
  public runtime: AppRuntime = 'native';
  private demoFallback = new DemoNativeProvider();

  private get bridge() {
    return typeof window !== 'undefined' ? (window.windroid?.nativebridge || window.aether?.nativebridge) : undefined;
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
      return await this.bridge.inspectPackage(path);
    }
    return await this.demoFallback.inspectPackage(path);
  }

  async checkCompatibility(inspection: PackageInspection): Promise<CompatibilityResult> {
    if (this.bridge) {
      return await this.bridge.checkCompatibility(inspection);
    }
    return await this.demoFallback.checkCompatibility(inspection);
  }

  async install(
    request: InstallRequest,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<any> {
    if (this.bridge) {
      return await this.bridge.install(request);
    }
    return await this.demoFallback.install(request, onProgress);
  }

  async launch(appId: string): Promise<void> {
    if (this.bridge) {
      return await this.bridge.launch(appId);
    }
    return await this.demoFallback.launch(appId);
  }

  async terminate(appId: string): Promise<void> {
    if (this.bridge) {
      return await this.bridge.terminate(appId);
    }
    return await this.demoFallback.terminate(appId);
  }

  async uninstall(appId: string): Promise<void> {
    if (this.bridge) {
      return await this.bridge.uninstall(appId);
    }
    return await this.demoFallback.uninstall(appId);
  }

  async repair(appId: string): Promise<void> {
    return await this.demoFallback.repair(appId);
  }
}
