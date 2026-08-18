import { FSNode } from '../components/apps/files/filesystemData';
import { DemoMediaService, ALL_DEMO_MEDIA } from '../system/demo/DemoMediaService';

export interface RecentFileRecord {
  id: string;
  name: string;
  path: string;
  type: string;
  extension: string;
  openedAt: string;
  size?: string;
}

export const RECENT_FILES_STORAGE_KEY = 'windroid.os.recentFiles.v1';
export const LEGACY_RECENT_FILES_STORAGE_KEY = 'aether.os.recentFiles.v1';

export class RecentFilesService {
  private static instance: RecentFilesService;
  private listeners: (() => void)[] = [];

  public static getInstance(): RecentFilesService {
    if (!RecentFilesService.instance) {
      RecentFilesService.instance = new RecentFilesService();
    }
    return RecentFilesService.instance;
  }

  public getRecentFiles(): RecentFileRecord[] {
    try {
      const raw = localStorage.getItem(RECENT_FILES_STORAGE_KEY) || localStorage.getItem(LEGACY_RECENT_FILES_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to load recent files:', err);
    }
    // Return default initial recent files if empty
    return [
      {
        id: 'rec_1',
        name: 'Mountain.jpg',
        path: 'Desktop > Demo Media > Images > Mountain.jpg',
        type: 'image',
        extension: 'jpg',
        openedAt: new Date(Date.now() - 3600000).toISOString(),
        size: '2.4 MB'
      },
      {
        id: 'rec_2',
        name: 'Theme.mp3',
        path: 'Desktop > Demo Media > Music > Theme.mp3',
        type: 'audio',
        extension: 'mp3',
        openedAt: new Date(Date.now() - 7200000).toISOString(),
        size: '3.5 MB'
      },
      {
        id: 'rec_3',
        name: 'Readme.txt',
        path: 'Desktop > Demo Media > Documents > Readme.txt',
        type: 'document',
        extension: 'txt',
        openedAt: new Date(Date.now() - 10800000).toISOString(),
        size: '1.8 KB'
      }
    ];
  }

  public recordFileOpen(node: FSNode, fullPath?: string): void {
    const list = this.getRecentFiles();
    const cleanList = list.filter((item) => item.name !== node.name);
    
    const ext = node.extension?.toLowerCase() || '';
    let fileType = 'document';
    if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'avif', 'ico', 'gif'].includes(ext)) {
      fileType = 'image';
    } else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
      fileType = 'video';
    } else if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) {
      fileType = 'audio';
    }

    const newRecord: RecentFileRecord = {
      id: `rec_${Date.now()}`,
      name: node.name,
      path: fullPath || `Demo Media > ${node.name}`,
      type: fileType,
      extension: ext,
      openedAt: new Date().toISOString(),
      size: node.size || '1 KB'
    };

    const updated = [newRecord, ...cleanList].slice(0, 20);
    try {
      localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(updated));
      this.notifyListeners();
    } catch (err) {
      console.warn('Failed to save recent file:', err);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb());
  }
}
