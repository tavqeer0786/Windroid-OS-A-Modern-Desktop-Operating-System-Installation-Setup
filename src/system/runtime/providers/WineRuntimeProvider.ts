import {
  AppRuntimeProvider,
  AppRuntime,
  RuntimeStatus,
  PackageInspection,
  CompatibilityResult,
  InstallRequest,
  InstallProgress
} from '../AppRuntimeProvider';
import { DemoWindowsProvider } from './DemoWindowsProvider';

export interface WinBridgeContract {
  inspectPackage: (path: string) => Promise<PackageInspection>;
  install: (request: InstallRequest) => Promise<any>;
  launch: (appId: string) => Promise<void>;
  uninstall: (appId: string) => Promise<void>;
  getApps: () => Promise<any[]>;
  getRuntimeStatus: () => Promise<RuntimeStatus>;
}

export class WineRuntimeProvider implements AppRuntimeProvider {
  public runtime: AppRuntime = 'windows';
  private demoFallback = new DemoWindowsProvider();

  private get bridge(): WinBridgeContract | undefined {
    return typeof window !== 'undefined' ? (window.windroid?.winbridge || window.aether?.winbridge) : undefined;
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
