export interface RecentApplicationRecord {
  appId: string;
  displayName: string;
  icon: string;
  installedAt: number;
}

const STORAGE_KEY = 'aether.os.unified.recent_installs.v1';
const MAX_RECENT_ENTRIES = 20;

export class RecentApplicationsRegistry {
  private static instance: RecentApplicationsRegistry;
  private recents: RecentApplicationRecord[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RecentApplicationsRegistry {
    if (!RecentApplicationsRegistry.instance) {
      RecentApplicationsRegistry.instance = new RecentApplicationsRegistry();
    }
    return RecentApplicationsRegistry.instance;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.recents = parsed;
        }
      }
    } catch (err) {
      console.warn('[RecentApplicationsRegistry] Failed to load storage:', err);
    }
  }

  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.recents);
      const existing = localStorage.getItem(STORAGE_KEY);
      if (serialized !== existing) {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch (err) {
      console.warn('[RecentApplicationsRegistry] Failed to save storage:', err);
    }
  }

  public addRecent(data: { appId: string; displayName: string; icon: string }): RecentApplicationRecord {
    // Remove if existing to re-insert at top
    this.recents = this.recents.filter((r) => r.appId !== data.appId);

    const record: RecentApplicationRecord = {
      appId: data.appId,
      displayName: data.displayName,
      icon: data.icon,
      installedAt: Date.now(),
    };

    this.recents.unshift(record);

    // Bounded history
    if (this.recents.length > MAX_RECENT_ENTRIES) {
      this.recents = this.recents.slice(0, MAX_RECENT_ENTRIES);
    }

    this.saveToStorage();
    return record;
  }

  public getAll(): RecentApplicationRecord[] {
    return [...this.recents];
  }

  public clear(): void {
    this.recents = [];
    this.saveToStorage();
  }
}
