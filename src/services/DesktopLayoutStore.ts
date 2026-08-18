import { metrics } from '../system/diagnostics';

export interface DesktopLayoutEntry {
  itemId: string;
  x?: number;
  y?: number;
  gridColumn?: number;
  gridRow?: number;
}

export const DESKTOP_LAYOUT_STORAGE_KEY = 'windroid.os.desktop.layout.v1';
export const LEGACY_DESKTOP_LAYOUT_STORAGE_KEY = 'aether.os.desktop.layout.v1';

export class DesktopLayoutStore {
  private static instance: DesktopLayoutStore;

  public static getInstance(): DesktopLayoutStore {
    if (!DesktopLayoutStore.instance) {
      DesktopLayoutStore.instance = new DesktopLayoutStore();
    }
    return DesktopLayoutStore.instance;
  }

  public getLayoutMap(): Record<string, DesktopLayoutEntry> {
    try {
      const raw = localStorage.getItem(DESKTOP_LAYOUT_STORAGE_KEY) || localStorage.getItem(LEGACY_DESKTOP_LAYOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load desktop layout store:', err);
    }
    return {};
  }

  public saveLayoutMap(map: Record<string, DesktopLayoutEntry>): void {
    try {
      const newJson = JSON.stringify(map);
      const oldJson = localStorage.getItem(DESKTOP_LAYOUT_STORAGE_KEY);
      if (oldJson === newJson) return;
      localStorage.setItem(DESKTOP_LAYOUT_STORAGE_KEY, newJson);
      metrics.trackLocalStorageWrite();
    } catch (err) {
      console.warn('Failed to save desktop layout store:', err);
    }
  }

  public updateItemPosition(itemId: string, pos: { x?: number; y?: number; gridColumn?: number; gridRow?: number }): void {
    const map = this.getLayoutMap();
    map[itemId] = {
      ...(map[itemId] || { itemId }),
      ...pos,
    };
    this.saveLayoutMap(map);
  }

  public removeItem(itemId: string): void {
    const map = this.getLayoutMap();
    if (map[itemId]) {
      delete map[itemId];
      this.saveLayoutMap(map);
    }
  }

  public reconcile(
    items: Array<{ id: string; name?: string }>,
    cellWidth = 96,
    cellHeight = 92
  ): Array<{ id: string; layout: DesktopLayoutEntry }> {
    const currentMap = this.getLayoutMap();
    const newMap: Record<string, DesktopLayoutEntry> = {};

    // Deduplicate item IDs to prevent duplicate nodes
    const uniqueItemsMap = new Map<string, { id: string; name?: string }>();
    items.forEach((item) => {
      if (item && item.id && !uniqueItemsMap.has(item.id)) {
        uniqueItemsMap.set(item.id, item);
      }
    });

    const uniqueItems = Array.from(uniqueItemsMap.values());

    // Track occupied grid slots (gridColumn, gridRow)
    const occupiedSlots = new Set<string>();

    // 1. Keep layout for existing items if they have an assigned slot
    uniqueItems.forEach((item) => {
      if (currentMap[item.id]) {
        const entry = currentMap[item.id];
        newMap[item.id] = entry;
        if (entry.gridColumn !== undefined && entry.gridRow !== undefined) {
          occupiedSlots.add(`${entry.gridColumn},${entry.gridRow}`);
        }
      }
    });

    // Calculate max rows based on window height (accounting for TopBar and Dock)
    const maxRows = Math.max(1, Math.floor((window.innerHeight - 120) / cellHeight));

    // 2. Assign nearest available grid slot for items without a layout entry
    let col = 0;
    let row = 0;

    uniqueItems.forEach((item) => {
      if (!newMap[item.id]) {
        while (occupiedSlots.has(`${col},${row}`)) {
          row++;
          if (row >= maxRows) {
            row = 0;
            col++;
          }
        }

        const newEntry: DesktopLayoutEntry = {
          itemId: item.id,
          gridColumn: col,
          gridRow: row,
          x: col * cellWidth + 16,
          y: row * cellHeight + 16,
        };

        newMap[item.id] = newEntry;
        occupiedSlots.add(`${col},${row}`);

        row++;
        if (row >= maxRows) {
          row = 0;
          col++;
        }
      }
    });

    // Save active layout map
    this.saveLayoutMap(newMap);

    // Return items sorted by layout grid position (column-first)
    return uniqueItems
      .map((item) => ({
        id: item.id,
        layout: newMap[item.id] || { itemId: item.id, gridColumn: 0, gridRow: 0 },
      }))
      .sort((a, b) => {
        const colA = a.layout.gridColumn ?? 0;
        const colB = b.layout.gridColumn ?? 0;
        if (colA !== colB) return colA - colB;
        const rowA = a.layout.gridRow ?? 0;
        const rowB = b.layout.gridRow ?? 0;
        return rowA - rowB;
      });
  }
}
