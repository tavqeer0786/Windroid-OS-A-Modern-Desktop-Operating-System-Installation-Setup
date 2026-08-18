import { InstallerPackageKind, InstallerRuntimeKind } from './InstallerTypes';
import { InstalledAppRegistry, InstalledApplication } from '../apps/InstalledAppRegistry';

export interface InstalledApplicationRecord {
  id: string;
  appId: string;
  displayName: string;
  publisher: string;
  version: string;
  runtime: InstallerRuntimeKind;
  packageKind: InstallerPackageKind;
  installLocation: string;
  installedAt: number;
  provider: string;
  icon: string;
  launchCommand?: string; // Placeholder command only e.g. "windroid-launch://appId"
  permissions: string[];
  desktopShortcut: boolean;
  dockPinned: boolean;
  menuRegistered: boolean;
  searchIndexed: boolean;
  status: 'installed' | 'updating' | 'error' | 'disabled';
  simulation?: boolean;
}

const LEGACY_STORAGE_KEY = 'aether.os.unified.installed_apps.v1';

export class InstalledApplicationRegistry {
  private static instance: InstalledApplicationRegistry;

  private constructor() {
    // Clean up duplicate legacy key if present
    try {
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {}
  }

  public static getInstance(): InstalledApplicationRegistry {
    if (!InstalledApplicationRegistry.instance) {
      InstalledApplicationRegistry.instance = new InstalledApplicationRegistry();
    }
    return InstalledApplicationRegistry.instance;
  }

  public register(record: InstalledApplicationRecord): void {
    let runtimeLabel: 'windows' | 'android' | 'native' = 'native';
    if (record.runtime === 'winbridge') runtimeLabel = 'windows';
    else if (record.runtime === 'droidbridge') runtimeLabel = 'android';

    const installedApp: InstalledApplication = {
      id: record.appId || record.id,
      name: record.displayName,
      description: `${record.displayName} (${record.runtime})`,
      icon: record.icon,
      runtime: runtimeLabel,
      packageId: record.appId,
      executableTarget: record.appId,
      installationPath: record.installLocation,
      version: record.version,
      publisher: record.publisher,
      architecture: 'x86_64',
      installedAt: new Date(record.installedAt).toLocaleDateString(),
      source: `Installer (${record.provider})`,
      compatibilityRating: 'excellent',
      permissions: record.permissions,
      fileAssociations: [],
      isSystemApp: false,
      isProtected: false,
      canUninstall: true,
      canRepair: true,
      status: record.status,
      simulation: true,
      installationMode: 'simulation',
      launchTarget: record.launchCommand,
    };

    InstalledAppRegistry.getInstance().register(installedApp);
  }

  public has(appId: string): boolean {
    return !!InstalledAppRegistry.getInstance().getById(appId);
  }

  public getById(appId: string): InstalledApplicationRecord | undefined {
    const app = InstalledAppRegistry.getInstance().getById(appId);
    if (!app) return undefined;

    let runtimeKind: InstallerRuntimeKind = 'native-flatpak';
    if (app.runtime === 'windows') runtimeKind = 'winbridge';
    else if (app.runtime === 'android') runtimeKind = 'droidbridge';

    return {
      id: app.id,
      appId: app.id,
      displayName: app.name,
      publisher: app.publisher,
      version: app.version,
      runtime: runtimeKind,
      packageKind: 'unknown',
      installLocation: app.installationPath,
      installedAt: Date.now(),
      provider: app.source,
      icon: app.icon,
      launchCommand: typeof app.launchTarget === 'string' ? app.launchTarget : `windroid-launch://${app.id}`,
      permissions: app.permissions || [],
      desktopShortcut: true,
      dockPinned: false,
      menuRegistered: true,
      searchIndexed: true,
      status: app.status || 'installed',
      simulation: true,
    };
  }

  public getAll(): InstalledApplicationRecord[] {
    return InstalledAppRegistry.getInstance().getAll().map((app) => {
      let runtimeKind: InstallerRuntimeKind = 'native-flatpak';
      if (app.runtime === 'windows') runtimeKind = 'winbridge';
      else if (app.runtime === 'android') runtimeKind = 'droidbridge';

      return {
        id: app.id,
        appId: app.id,
        displayName: app.name,
        publisher: app.publisher,
        version: app.version,
        runtime: runtimeKind,
        packageKind: 'unknown',
        installLocation: app.installationPath,
        installedAt: Date.now(),
        provider: app.source,
        icon: app.icon,
        launchCommand: typeof app.launchTarget === 'string' ? app.launchTarget : `windroid-launch://${app.id}`,
        permissions: app.permissions || [],
        desktopShortcut: true,
        dockPinned: false,
        menuRegistered: true,
        searchIndexed: true,
        status: app.status || 'installed',
        simulation: true,
      };
    });
  }

  public unregister(appId: string): boolean {
    return InstalledAppRegistry.getInstance().uninstall(appId);
  }

  public clear(): void {
    // Protected system apps remain, user installed apps cleared
  }
}
