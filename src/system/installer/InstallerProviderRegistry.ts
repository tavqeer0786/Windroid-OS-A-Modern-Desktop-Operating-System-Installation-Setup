import { InstallerProvider } from './InstallerProvider';
import { InstallationSession } from './InstallerTypes';
import { ProviderCapabilities } from './ProviderCapabilities';
import { ProviderHealth } from './ProviderHealth';
import { SimulationInstallerProvider } from './SimulationInstallerProvider';
import { WinBridgeProvider } from './WinBridgeProvider';
import { DroidBridgeProvider } from './DroidBridgeProvider';
import { FlatpakProvider } from './FlatpakProvider';

export class InstallerProviderRegistry {
  private static instance: InstallerProviderRegistry;
  private providers: Map<string, InstallerProvider> = new Map();

  private constructor() {
    this.initDefaultProviders();
  }

  public static getInstance(): InstallerProviderRegistry {
    if (!InstallerProviderRegistry.instance) {
      InstallerProviderRegistry.instance = new InstallerProviderRegistry();
    }
    return InstallerProviderRegistry.instance;
  }

  private initDefaultProviders(): void {
    // Register standard providers
    const sim = SimulationInstallerProvider.getInstance();
    const win = WinBridgeProvider.getInstance();
    const droid = DroidBridgeProvider.getInstance();
    const flatpak = FlatpakProvider.getInstance();

    this.registerInternal(sim);
    this.registerInternal(win);
    this.registerInternal(droid);
    this.registerInternal(flatpak);
  }

  private registerInternal(provider: InstallerProvider): void {
    if (!this.providers.has(provider.id)) {
      this.providers.set(provider.id, provider);
    }
  }

  public register(provider: InstallerProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`InstallerProvider with ID '${provider.id}' is already registered.`);
    }
    this.providers.set(provider.id, provider);
  }

  public unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  public getProvider(id: string): InstallerProvider | undefined {
    return this.providers.get(id);
  }

  public listProviders(): InstallerProvider[] {
    return Array.from(this.providers.values());
  }

  public getAllProviders(): InstallerProvider[] {
    return this.listProviders();
  }

  public resolveProvider(
    session: InstallationSession,
    forceSimulation = false
  ): InstallerProvider {
    if (forceSimulation) {
      return SimulationInstallerProvider.getInstance();
    }

    const packageKind = session.packageKind;

    // Direct mapping rules
    if (packageKind === 'windows-exe' || packageKind === 'windows-msi') {
      return WinBridgeProvider.getInstance();
    }

    if (packageKind === 'android-apk') {
      return DroidBridgeProvider.getInstance();
    }

    if (packageKind === 'flatpak-bundle' || packageKind === 'flatpak-reference') {
      return FlatpakProvider.getInstance();
    }

    // Check runtime
    if (session.runtime === 'winbridge') return WinBridgeProvider.getInstance();
    if (session.runtime === 'droidbridge') return DroidBridgeProvider.getInstance();
    if (session.runtime === 'native-flatpak') return FlatpakProvider.getInstance();

    // Fallback to simulation provider
    return SimulationInstallerProvider.getInstance();
  }

  public resolveForSession(session: InstallationSession): InstallerProvider | undefined {
    return this.resolveProvider(session);
  }

  public getCapabilities(id?: string): ProviderCapabilities[] | ProviderCapabilities | undefined {
    if (id) {
      const provider = this.getProvider(id);
      return provider ? provider.getCapabilities() : undefined;
    }
    return this.listProviders().map((p) => p.getCapabilities());
  }

  public getHealth(id?: string): Record<string, ProviderHealth> | ProviderHealth | undefined {
    if (id) {
      const provider = this.getProvider(id);
      return provider ? provider.getHealth() : undefined;
    }

    const healthMap: Record<string, ProviderHealth> = {};
    for (const provider of this.providers.values()) {
      healthMap[provider.id] = provider.getHealth();
    }
    return healthMap;
  }

  public clear(): void {
    this.providers.clear();
    this.initDefaultProviders();
  }
}
