import { FSNode } from '../filesystemData';
import { isProtectedSystemItem } from '../../../../services/SystemAppRegistry';

export interface TrashItem {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'drive' | 'shortcut';
  originalPath: string;
  deletedAt: string;
  size?: string;
  sizeBytes?: number;
  extension?: string;
  originalDriveId?: string;
  originalParentId?: string | null;
  nodeData: FSNode;
}

export const RECYCLE_BIN_STORAGE_KEY = 'aether.os.recycleBin.v1';

type TrashListener = () => void;

export class TrashService {
  private static instance: TrashService;
  private trashItems: TrashItem[] = [];
  private listeners: Set<TrashListener> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TrashService {
    if (!TrashService.instance) {
      TrashService.instance = new TrashService();
    }
    return TrashService.instance;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(RECYCLE_BIN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Purge any corrupted or invalid protected system items from trash
          this.trashItems = parsed.filter((item: TrashItem) => {
            if (!item || !item.nodeData) return false;
            return !isProtectedSystemItem(item.nodeData) && !isProtectedSystemItem(item);
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load Recycle Bin from localStorage:', err);
    }
    this.trashItems = [];
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(RECYCLE_BIN_STORAGE_KEY, JSON.stringify(this.trashItems));
    } catch (err) {
      console.warn('Failed to save Recycle Bin to localStorage:', err);
    }
    this.notify();
  }

  public subscribe(listener: TrashListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  public getItems(): TrashItem[] {
    return [...this.trashItems];
  }

  public isEmpty(): boolean {
    return this.trashItems.length === 0;
  }

  public moveToTrash(nodes: { node: FSNode; originalPath: string; originalParentId?: string | null; originalDriveId?: string }[]): TrashItem[] {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Filter out protected system apps before trash insertion
    const validNodes = nodes.filter(({ node }) => !isProtectedSystemItem(node));

    const newItems: TrashItem[] = validNodes.map(({ node, originalPath, originalParentId, originalDriveId }) => ({
      id: `trash_${node.id}_${Date.now()}`,
      name: node.name,
      type: node.type,
      originalPath: originalPath || 'This PC',
      deletedAt: formattedDate,
      size: node.size || (node.type === 'folder' ? 'Folder' : '0 KB'),
      sizeBytes: node.sizeBytes || 0,
      extension: node.extension,
      originalDriveId: originalDriveId || 'drive_c',
      originalParentId: originalParentId || node.parentId || null,
      nodeData: node,
    }));

    this.trashItems = [...newItems, ...this.trashItems];
    this.saveToStorage();
    return newItems;
  }

  public permanentlyDelete(trashIds: string[]): void {
    this.trashItems = this.trashItems.filter((item) => !trashIds.includes(item.id));
    this.saveToStorage();
  }

  public emptyTrash(): void {
    this.trashItems = [];
    this.saveToStorage();
  }

  public removeItems(trashIds: string[]): void {
    this.trashItems = this.trashItems.filter((item) => !trashIds.includes(item.id));
    this.saveToStorage();
  }
}
