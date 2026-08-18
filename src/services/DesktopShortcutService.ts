import { FSNode, loadFilesystemFromStorage, saveFilesystemToStorage } from '../components/apps/files/filesystemData';
import { SYSTEM_APP_REGISTRY } from './SystemAppRegistry';
import { InstalledAppRegistry } from '../system/apps/InstalledAppRegistry';
import { INITIAL_APPS } from '../data/initialData';
import { TrashService } from '../components/apps/files/services/TrashService';

export interface ApplicationShortcutNode extends FSNode {
  id: string;
  type: 'shortcut';
  name: string;
  parentId: string;
  targetType: 'application';
  targetAppId: string;
  createdAt: string;
  modifiedAt: string;
  x?: number;
  y?: number;
  gridIndex?: number;
}

export interface ResolvedTargetApp {
  id: string;
  name: string;
  icon: string;
  description?: string;
  runtime: string;
  publisher?: string;
  version?: string;
  installationPath?: string;
  exists: boolean;
}

export const FS_CHANGED_EVENT = 'windroid-fs-changed';

export class DesktopShortcutService {
  private static instance: DesktopShortcutService;

  public static getInstance(): DesktopShortcutService {
    if (!DesktopShortcutService.instance) {
      DesktopShortcutService.instance = new DesktopShortcutService();
    }
    return DesktopShortcutService.instance;
  }

  public notifyFileSystemChanged(): void {
    window.dispatchEvent(new CustomEvent(FS_CHANGED_EVENT));
  }

  public resolveTargetApp(targetAppId: string): ResolvedTargetApp {
    if (!targetAppId) {
      return {
        id: targetAppId || 'unknown',
        name: 'Unknown Application',
        icon: 'HelpCircle',
        runtime: 'Unknown',
        exists: false,
      };
    }

    // 1. Check SYSTEM_APP_REGISTRY
    const sysEntry = SYSTEM_APP_REGISTRY[targetAppId] || Object.values(SYSTEM_APP_REGISTRY).find(
      (s) => s.id === targetAppId || s.name.toLowerCase() === targetAppId.toLowerCase()
    );

    // Check INITIAL_APPS for icon & description
    const initialApp = INITIAL_APPS.find((a) => a.id === targetAppId);

    if (sysEntry) {
      return {
        id: sysEntry.id,
        name: sysEntry.name,
        icon: initialApp?.icon || sysEntry.icon || 'AppWindow',
        description: initialApp?.description || 'Built-in system application',
        runtime: 'System Application',
        publisher: 'Windroid OS System',
        version: '1.0.0',
        installationPath: sysEntry.installationPath,
        exists: true,
      };
    }

    // 2. Check InstalledAppRegistry
    const installed = InstalledAppRegistry.getInstance().getById(targetAppId);
    if (installed) {
      let runtimeLabel = 'Native App';
      if (installed.runtime === 'windows') runtimeLabel = 'WinBridge (EXE)';
      else if (installed.runtime === 'android') runtimeLabel = 'DroidBridge (APK)';
      else if (installed.runtime === 'native') runtimeLabel = 'Native Linux (Flatpak)';

      return {
        id: installed.id,
        name: installed.name,
        icon: installed.icon || 'AppWindow',
        description: installed.description,
        runtime: runtimeLabel,
        publisher: installed.publisher,
        version: installed.version,
        installationPath: installed.installationPath,
        exists: true,
      };
    }

    // 3. Fallback: check INITIAL_APPS alone
    if (initialApp) {
      return {
        id: initialApp.id,
        name: initialApp.name,
        icon: initialApp.icon,
        description: initialApp.description,
        runtime: 'System Application',
        publisher: 'Windroid OS System',
        version: '1.0.0',
        installationPath: `/drive_c/c_apps/app_${initialApp.id}`,
        exists: true,
      };
    }

    // Target missing / not found
    return {
      id: targetAppId,
      name: targetAppId.replace(/^app_/, '').replace(/_/g, ' '),
      icon: 'HelpCircle',
      runtime: 'Unknown',
      exists: false,
    };
  }

  public findDesktopFolder(nodes: FSNode[]): FSNode | null {
    for (const node of nodes) {
      if (node.id === 'u_alex_desktop' || node.name === 'Desktop') {
        return node;
      }
      if (node.children) {
        const found = this.findDesktopFolder(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  public getDesktopNodes(): FSNode[] {
    const fs = loadFilesystemFromStorage();
    const desktopFolder = this.findDesktopFolder(fs);
    return desktopFolder?.children || [];
  }

  public createDesktopShortcut(
    targetAppId: string,
    options?: { dropPos?: { x: number; y: number } }
  ): ApplicationShortcutNode {
    const fs = loadFilesystemFromStorage();
    let desktopFolder = this.findDesktopFolder(fs);

    if (!desktopFolder) {
      desktopFolder = {
        id: 'u_alex_desktop',
        name: 'Desktop',
        type: 'folder',
        parentId: 'u_alex',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        children: [],
      };
      fs.push(desktopFolder);
    }

    if (!desktopFolder.children) {
      desktopFolder.children = [];
    }

    const resolved = this.resolveTargetApp(targetAppId);
    const baseName = resolved.name || 'Application';

    // Resolve name conflict: Files, Files (2), Files (3)
    let finalName = baseName;
    let counter = 2;
    const existingNames = new Set(desktopFolder.children.map((child) => child.name.toLowerCase()));

    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }

    // Find next free grid slot
    const occupiedSlots = new Set(
      desktopFolder.children
        .map((child) => child.gridIndex)
        .filter((idx): idx is number => typeof idx === 'number')
    );

    let nextSlot = 0;
    while (occupiedSlots.has(nextSlot)) {
      nextSlot++;
    }

    const nowIso = new Date().toISOString();
    const shortcutNode: ApplicationShortcutNode = {
      id: `sc_app_${targetAppId}_${Date.now()}`,
      type: 'shortcut',
      name: finalName,
      parentId: desktopFolder.id,
      targetType: 'application',
      targetAppId,
      createdAt: nowIso,
      modifiedAt: nowIso,
      gridIndex: nextSlot,
      x: options?.dropPos?.x,
      y: options?.dropPos?.y,
      icon: resolved.icon,
    };

    desktopFolder.children.push(shortcutNode);
    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();

    return shortcutNode;
  }

  public createShortcutForNode(node: FSNode): FSNode | null {
    if (!node) return null;

    const fs = loadFilesystemFromStorage();
    let desktopFolder = this.findDesktopFolder(fs);
    if (!desktopFolder) {
      desktopFolder = {
        id: 'u_alex_desktop',
        name: 'Desktop',
        type: 'folder',
        parentId: 'u_alex',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        children: [],
      };
      fs.push(desktopFolder);
    }
    if (!desktopFolder.children) desktopFolder.children = [];

    // Check duplicate system shortcuts for This PC & Recycle Bin
    const isThisPc = node.id === 'sc_computer' || node.targetId === 'this_pc' || node.targetAppId === 'computer' || node.name === 'This PC';
    const isRecycleBin = node.id === 'sc_recycle_bin' || node.targetId === 'recycle_bin' || node.targetAppId === 'recycle_bin' || node.name === 'Recycle Bin';

    if (isThisPc) {
      const existingThisPcShortcut = desktopFolder.children.some(
        (c) => c.id !== node.id && (c.targetAppId === 'computer' || c.targetId === 'this_pc' || c.name === 'This PC - Shortcut')
      );
      if (existingThisPcShortcut) return null;
    }

    if (isRecycleBin) {
      const existingBinShortcut = desktopFolder.children.some(
        (c) => c.id !== node.id && (c.targetAppId === 'recycle_bin' || c.targetId === 'recycle_bin' || c.name === 'Recycle Bin - Shortcut')
      );
      if (existingBinShortcut) return null;
    }

    let targetType: 'application' | 'file' | 'folder' = 'file';
    let targetAppId: string | undefined = undefined;
    let targetId: string | undefined = undefined;

    if (node.type === 'shortcut') {
      const nodeTargetType = node.targetType === 'system-app' ? 'application' : node.targetType;
      targetType = nodeTargetType || (node.targetAppId ? 'application' : 'file');
      targetAppId = node.targetAppId;
      targetId = node.targetId || node.id;
    } else if (node.type === 'folder') {
      targetType = 'folder';
      targetId = node.id;
    } else if (node.type === 'file') {
      targetType = 'file';
      targetId = node.id;
    } else if (node.targetAppId || node.systemAppId) {
      targetType = 'application';
      targetAppId = node.targetAppId || node.systemAppId;
    }

    let rawBase = node.name || 'Item';
    if (rawBase.endsWith('.app')) {
      rawBase = rawBase.slice(0, -4);
    }

    const baseShortcutName = `${rawBase} - Shortcut`;
    let finalName = baseShortcutName;
    let counter = 2;
    const existingNames = new Set(desktopFolder.children.map((child) => child.name.toLowerCase()));

    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${rawBase} - Shortcut (${counter})`;
      counter++;
    }

    const occupiedSlots = new Set(
      desktopFolder.children
        .map((child) => child.gridIndex)
        .filter((idx): idx is number => typeof idx === 'number')
    );

    let nextSlot = 0;
    while (occupiedSlots.has(nextSlot)) {
      nextSlot++;
    }

    const nowIso = new Date().toISOString();
    const shortcutNode: FSNode = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: finalName,
      type: 'shortcut',
      parentId: desktopFolder.id,
      targetType,
      targetAppId,
      targetId,
      icon: node.icon || (targetType === 'folder' ? 'Folder' : targetType === 'application' ? 'AppWindow' : 'FileText'),
      extension: node.extension,
      createdAt: nowIso,
      modifiedAt: nowIso,
      gridIndex: nextSlot,
      canDelete: true,
      canRename: true,
      canMove: true,
      canCopy: true,
    };

    desktopFolder.children.push(shortcutNode);
    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();

    return shortcutNode;
  }

  public deleteDesktopShortcut(shortcutId: string): void {
    this.deleteDesktopNode(shortcutId);
  }

  public renameDesktopShortcut(shortcutId: string, newName: string): void {
    this.renameDesktopNode(shortcutId, newName);
  }

  public createNewFolderOnDesktop(baseName: string = 'New folder'): FSNode {
    const fs = loadFilesystemFromStorage();
    let desktopFolder = this.findDesktopFolder(fs);
    if (!desktopFolder) {
      desktopFolder = {
        id: 'u_alex_desktop',
        name: 'Desktop',
        type: 'folder',
        parentId: 'u_alex',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        children: [],
      };
      fs.push(desktopFolder);
    }
    if (!desktopFolder.children) desktopFolder.children = [];

    let finalName = baseName;
    let counter = 2;
    const existingNames = new Set(desktopFolder.children.map((child) => child.name.toLowerCase()));

    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }

    const nowIso = new Date().toISOString();
    const newFolder: FSNode = {
      id: `folder_dt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'folder',
      name: finalName,
      parentId: desktopFolder.id,
      createdAt: nowIso,
      modifiedAt: nowIso,
      children: [],
      canDelete: true,
      canMove: true,
      canCopy: true,
      canRename: true,
      canModify: true,
    };

    desktopFolder.children.push(newFolder);
    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();

    return newFolder;
  }

  public createNewDocumentOnDesktop(baseName: string = 'New Text Document.txt'): FSNode {
    const fs = loadFilesystemFromStorage();
    let desktopFolder = this.findDesktopFolder(fs);
    if (!desktopFolder) {
      desktopFolder = {
        id: 'u_alex_desktop',
        name: 'Desktop',
        type: 'folder',
        parentId: 'u_alex',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        children: [],
      };
      fs.push(desktopFolder);
    }
    if (!desktopFolder.children) desktopFolder.children = [];

    let finalName = baseName;
    let counter = 2;
    const existingNames = new Set(desktopFolder.children.map((child) => child.name.toLowerCase()));

    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `New Text Document (${counter}).txt`;
      counter++;
    }

    const nowIso = new Date().toISOString();
    const newDoc: FSNode = {
      id: `doc_dt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'file',
      extension: 'txt',
      mimeType: 'text/plain',
      encoding: 'utf-8',
      name: finalName,
      parentId: desktopFolder.id,
      createdAt: nowIso,
      modifiedAt: nowIso,
      size: '0 B',
      sizeBytes: 0,
      content: '',
      canDelete: true,
      canMove: true,
      canCopy: true,
      canRename: true,
      canModify: true,
    };

    desktopFolder.children.push(newDoc);
    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();

    return newDoc;
  }

  public createFolderInFolder(parentId: string, baseName: string = 'New Folder'): FSNode | null {
    const fs = loadFilesystemFromStorage();
    const findFolder = (nodes: FSNode[]): FSNode | null => {
      for (const n of nodes) {
        if ((n.id === parentId || (parentId === 'u_alex_desktop' && n.name === 'Desktop')) && (n.type === 'folder' || n.type === 'drive')) return n;
        if (n.children) {
          const found = findFolder(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetFolder = findFolder(fs);
    if (!targetFolder) return null;
    if (!targetFolder.children) targetFolder.children = [];

    let finalName = baseName;
    let counter = 2;
    const existingNames = new Set(targetFolder.children.map((child) => child.name.toLowerCase()));

    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `${baseName} (${counter})`;
      counter++;
    }

    const nowIso = new Date().toISOString();
    const newFolder: FSNode = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'folder',
      name: finalName,
      parentId: targetFolder.id,
      createdAt: nowIso,
      modifiedAt: nowIso,
      children: [],
      canDelete: true,
      canMove: true,
      canCopy: true,
      canRename: true,
      canModify: true,
    };

    targetFolder.children.push(newFolder);
    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();

    return newFolder;
  }

  public createTextFileInFolder(parentId: string, baseName: string = 'New Text Document.txt'): FSNode | null {
    const fs = loadFilesystemFromStorage();
    const findFolder = (nodes: FSNode[]): FSNode | null => {
      for (const n of nodes) {
        if ((n.id === parentId || (parentId === 'u_alex_desktop' && n.name === 'Desktop')) && (n.type === 'folder' || n.type === 'drive')) return n;
        if (n.children) {
          const found = findFolder(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    const targetFolder = findFolder(fs);
    if (!targetFolder) return null;
    if (!targetFolder.children) targetFolder.children = [];

    let finalName = baseName;
    let counter = 2;
    const existingNames = new Set(targetFolder.children.map((child) => child.name.toLowerCase()));

    while (existingNames.has(finalName.toLowerCase())) {
      finalName = `New Text Document (${counter}).txt`;
      counter++;
    }

    const nowIso = new Date().toISOString();
    const newDoc: FSNode = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'file',
      extension: 'txt',
      mimeType: 'text/plain',
      encoding: 'utf-8',
      name: finalName,
      parentId: targetFolder.id,
      createdAt: nowIso,
      modifiedAt: nowIso,
      size: '0 B',
      sizeBytes: 0,
      content: '',
      canDelete: true,
      canMove: true,
      canCopy: true,
      canRename: true,
      canModify: true,
    };

    targetFolder.children.push(newDoc);
    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();

    return newDoc;
  }

  public updateTextFileContent(nodeId: string, newContent: string): boolean {
    const fs = loadFilesystemFromStorage();
    let updated = false;

    const updateRecursive = (nodes: FSNode[]): boolean => {
      for (const n of nodes) {
        if (n.id === nodeId && n.type === 'file') {
          n.content = newContent;
          const bytes = new TextEncoder().encode(newContent).length;
          n.sizeBytes = bytes;
          n.size = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
          n.modifiedAt = new Date().toISOString();
          return true;
        }
        if (n.children && updateRecursive(n.children)) {
          return true;
        }
      }
      return false;
    };

    updated = updateRecursive(fs);
    if (updated) {
      saveFilesystemToStorage(fs);
      this.notifyFileSystemChanged();
    }
    return updated;
  }

  public deleteDesktopNode(nodeId: string): void {
    const fs = loadFilesystemFromStorage();
    const desktopFolder = this.findDesktopFolder(fs);
    if (!desktopFolder || !desktopFolder.children) return;

    const nodeIndex = desktopFolder.children.findIndex((c) => c.id === nodeId);
    if (nodeIndex === -1) return;

    const [removedNode] = desktopFolder.children.splice(nodeIndex, 1);

    if (!removedNode.isProtected && !removedNode.isSystemItem) {
      TrashService.getInstance().moveToTrash([
        {
          node: removedNode,
          originalPath: 'Desktop',
          originalParentId: desktopFolder.id,
          originalDriveId: 'drive_c',
        },
      ]);
    }

    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();
  }

  public renameDesktopNode(nodeId: string, newName: string): void {
    const cleanName = newName.trim();
    if (!cleanName) return;

    const fs = loadFilesystemFromStorage();
    const desktopFolder = this.findDesktopFolder(fs);
    if (!desktopFolder || !desktopFolder.children) return;

    const node = desktopFolder.children.find((c) => c.id === nodeId);
    if (!node || node.canRename === false) return;

    node.name = cleanName;
    node.modifiedAt = new Date().toISOString();

    saveFilesystemToStorage(fs);
    this.notifyFileSystemChanged();
  }
}
