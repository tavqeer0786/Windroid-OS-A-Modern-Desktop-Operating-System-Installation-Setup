import { InstalledAppRegistry } from '../apps/InstalledAppRegistry';

export interface ApplicationMenuRecord {
  id: string;
  appId: string;
  displayName: string;
  category: string;
  icon: string;
  registeredAt: number;
}

const LEGACY_STORAGE_KEY = 'aether.os.unified.app_menu_entries.v1';

export class ApplicationMenuRegistry {
  private static instance: ApplicationMenuRegistry;

  private constructor() {
    try {
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {}
  }

  public static getInstance(): ApplicationMenuRegistry {
    if (!ApplicationMenuRegistry.instance) {
      ApplicationMenuRegistry.instance = new ApplicationMenuRegistry();
    }
    return ApplicationMenuRegistry.instance;
  }

  public register(data: {
    appId: string;
    displayName: string;
    category?: string;
    icon: string;
  }): ApplicationMenuRecord {
    return {
      id: `menu_${data.appId}`,
      appId: data.appId,
      displayName: data.displayName,
      category: data.category || 'Applications',
      icon: data.icon,
      registeredAt: Date.now(),
    };
  }

  public isRegistered(appId: string): boolean {
    return !!InstalledAppRegistry.getInstance().getById(appId);
  }

  public unregister(appId: string): boolean {
    return InstalledAppRegistry.getInstance().uninstall(appId);
  }

  public getAll(): ApplicationMenuRecord[] {
    return InstalledAppRegistry.getInstance().getAll().map((app) => ({
      id: `menu_${app.id}`,
      appId: app.id,
      displayName: app.name,
      category: 'Applications',
      icon: app.icon,
      registeredAt: Date.now(),
    }));
  }

  public clear(): void {
    // Handled by InstalledAppRegistry
  }
}
