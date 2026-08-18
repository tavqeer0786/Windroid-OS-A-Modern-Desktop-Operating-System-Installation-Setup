import { InstalledAppRegistry } from '../apps/InstalledAppRegistry';

export interface SearchIndexRecord {
  appId: string;
  name: string;
  publisher: string;
  keywords: string[];
  runtime: string;
  indexedAt: number;
}

const LEGACY_STORAGE_KEY = 'aether.os.unified.search_index.v1';

export class SearchIndexRegistry {
  private static instance: SearchIndexRegistry;

  private constructor() {
    try {
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {}
  }

  public static getInstance(): SearchIndexRegistry {
    if (!SearchIndexRegistry.instance) {
      SearchIndexRegistry.instance = new SearchIndexRegistry();
    }
    return SearchIndexRegistry.instance;
  }

  public indexApp(data: {
    appId: string;
    name: string;
    publisher: string;
    keywords?: string[];
    runtime: string;
  }): SearchIndexRecord {
    const keywords = Array.from(
      new Set([
        ...(data.keywords || []),
        data.name.toLowerCase(),
        data.publisher.toLowerCase(),
        data.runtime.toLowerCase(),
        data.appId.toLowerCase(),
      ])
    );

    return {
      appId: data.appId,
      name: data.name,
      publisher: data.publisher,
      keywords,
      runtime: data.runtime,
      indexedAt: Date.now(),
    };
  }

  public search(query: string): SearchIndexRecord[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return InstalledAppRegistry.getInstance()
      .getAll()
      .filter((app) => app.name.toLowerCase().includes(q) || app.publisher.toLowerCase().includes(q))
      .map((app) => ({
        appId: app.id,
        name: app.name,
        publisher: app.publisher,
        keywords: [app.name.toLowerCase(), app.publisher.toLowerCase(), app.runtime.toLowerCase()],
        runtime: app.runtime,
        indexedAt: Date.now(),
      }));
  }

  public getAll(): SearchIndexRecord[] {
    return InstalledAppRegistry.getInstance()
      .getAll()
      .map((app) => ({
        appId: app.id,
        name: app.name,
        publisher: app.publisher,
        keywords: [app.name.toLowerCase(), app.publisher.toLowerCase(), app.runtime.toLowerCase()],
        runtime: app.runtime,
        indexedAt: Date.now(),
      }));
  }

  public remove(appId: string): boolean {
    return true;
  }

  public clear(): void {
    // Handled by InstalledAppRegistry
  }
}
