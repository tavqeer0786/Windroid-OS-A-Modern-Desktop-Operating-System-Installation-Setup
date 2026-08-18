export interface DockEntryRecord {
  id: string;
  appId: string;
  displayName: string;
  icon: string;
  pinnedAt: number;
  order: number;
}

const AUTHORITATIVE_DOCK_STORAGE_KEY = 'windroid.os.dock.v1';
const LEGACY_AUTHORITATIVE_DOCK_STORAGE_KEY = 'aether.os.dock.v1';
const LEGACY_STORAGE_KEY = 'aether.os.unified.dock_entries.v1';

export class DockRegistry {
  private static instance: DockRegistry;

  private constructor() {
    try {
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {}
  }

  public static getInstance(): DockRegistry {
    if (!DockRegistry.instance) {
      DockRegistry.instance = new DockRegistry();
    }
    return DockRegistry.instance;
  }

  private getPinnedAppIds(): string[] {
    try {
      const raw = localStorage.getItem(AUTHORITATIVE_DOCK_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTHORITATIVE_DOCK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[DockRegistry] Failed to read dock storage:', e);
    }
    return [];
  }

  private savePinnedAppIds(ids: string[]): void {
    try {
      localStorage.setItem(AUTHORITATIVE_DOCK_STORAGE_KEY, JSON.stringify(ids));
      window.dispatchEvent(new CustomEvent('windroid-dock-changed'));
      window.dispatchEvent(new CustomEvent('aether-dock-changed'));
    } catch (e) {
      console.warn('[DockRegistry] Failed to save dock storage:', e);
    }
  }

  public pin(data: { appId: string; displayName: string; icon: string }): DockEntryRecord {
    const current = this.getPinnedAppIds();
    if (!current.includes(data.appId)) {
      const next = [...current, data.appId];
      this.savePinnedAppIds(next);
    }

    return {
      id: `dock_${data.appId}`,
      appId: data.appId,
      displayName: data.displayName,
      icon: data.icon,
      pinnedAt: Date.now(),
      order: current.indexOf(data.appId) !== -1 ? current.indexOf(data.appId) : current.length,
    };
  }

  public isPinned(appId: string): boolean {
    return this.getPinnedAppIds().includes(appId);
  }

  public unpin(appId: string): boolean {
    const current = this.getPinnedAppIds();
    if (current.includes(appId)) {
      const next = current.filter((id) => id !== appId);
      this.savePinnedAppIds(next);
      return true;
    }
    return false;
  }

  public getAll(): DockEntryRecord[] {
    return this.getPinnedAppIds().map((appId, index) => ({
      id: `dock_${appId}`,
      appId,
      displayName: appId,
      icon: 'AppWindow',
      pinnedAt: Date.now(),
      order: index,
    }));
  }

  public clear(): void {
    this.savePinnedAppIds([]);
  }
}
