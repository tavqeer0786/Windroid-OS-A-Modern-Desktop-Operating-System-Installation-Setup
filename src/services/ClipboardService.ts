import { FSNode, loadFilesystemFromStorage, saveFilesystemToStorage } from '../components/apps/files/filesystemData';
import { FS_CHANGED_EVENT } from './DesktopShortcutService';

export interface ClipboardState {
  action: 'copy' | 'cut';
  nodes: FSNode[];
}

export const CLIPBOARD_CHANGED_EVENT = 'windroid-clipboard-changed';

export class ClipboardService {
  private static instance: ClipboardService;
  private clipboardState: ClipboardState | null = null;

  public static getInstance(): ClipboardService {
    if (!ClipboardService.instance) {
      ClipboardService.instance = new ClipboardService();
    }
    return ClipboardService.instance;
  }

  public getClipboard(): ClipboardState | null {
    return this.clipboardState;
  }

  public setClipboard(state: ClipboardState | null): void {
    this.clipboardState = state;
    window.dispatchEvent(new CustomEvent(CLIPBOARD_CHANGED_EVENT));
  }

  public clear(): void {
    this.clipboardState = null;
    window.dispatchEvent(new CustomEvent(CLIPBOARD_CHANGED_EVENT));
  }

  public pasteToFolder(targetFolderId: string): FSNode[] {
    if (!this.clipboardState || this.clipboardState.nodes.length === 0) return [];

    const fs = loadFilesystemFromStorage();

    const findFolderNode = (nodes: FSNode[], id: string): FSNode | null => {
      for (const n of nodes) {
        if (n.id === id || (id === 'u_alex_desktop' && n.name === 'Desktop')) return n;
        if (n.children) {
          const found = findFolderNode(n.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const targetFolder = findFolderNode(fs, targetFolderId);
    if (!targetFolder) return [];
    if (!targetFolder.children) targetFolder.children = [];

    const { action, nodes } = this.clipboardState;
    const resultNodes: FSNode[] = [];

    const deepCopyFSNode = (node: FSNode, newParentId: string, existingNamesInParent: Set<string>): FSNode => {
      const newId = `${node.id}_copy_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      let finalName = node.name;
      const ext = node.extension;
      let counter = 2;

      while (existingNamesInParent.has(finalName.toLowerCase())) {
        if (ext && finalName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
          const baseName = node.name.slice(0, -(ext.length + 1));
          finalName = `${baseName} (${counter}).${ext}`;
        } else if (ext) {
          finalName = `${node.name} (${counter}).${ext}`;
        } else {
          finalName = `${node.name} (${counter})`;
        }
        counter++;
      }
      existingNamesInParent.add(finalName.toLowerCase());

      const now = new Date().toISOString().split('T')[0];
      const copiedNode: FSNode = {
        ...node,
        id: newId,
        name: finalName,
        parentId: newParentId,
        createdAt: node.createdAt || now,
        modifiedAt: now,
      };

      if (node.children && Array.isArray(node.children)) {
        const childNames = new Set<string>();
        copiedNode.children = node.children.map((child) => deepCopyFSNode(child, newId, childNames));
      } else if (node.type === 'folder') {
        copiedNode.children = [];
      }

      return copiedNode;
    };

    if (action === 'cut') {
      const idsToRemove = new Set(nodes.map((n) => n.id));

      const removeNodes = (list: FSNode[]) => {
        for (let i = list.length - 1; i >= 0; i--) {
          if (idsToRemove.has(list[i].id)) {
            list.splice(i, 1);
          } else if (list[i].children) {
            removeNodes(list[i].children!);
          }
        }
      };
      removeNodes(fs);

      const existingNames = new Set(targetFolder.children.map((c) => c.name.toLowerCase()));

      nodes.forEach((n) => {
        let finalName = n.name;
        const ext = n.extension;
        let counter = 2;
        while (existingNames.has(finalName.toLowerCase())) {
          if (ext && finalName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
            const baseName = n.name.slice(0, -(ext.length + 1));
            finalName = `${baseName} (${counter}).${ext}`;
          } else {
            finalName = `${n.name} (${counter})`;
          }
          counter++;
        }
        existingNames.add(finalName.toLowerCase());

        const movedNode: FSNode = {
          ...n,
          name: finalName,
          parentId: targetFolder.id,
          modifiedAt: new Date().toISOString().split('T')[0],
        };
        targetFolder.children!.push(movedNode);
        resultNodes.push(movedNode);
      });

      this.clear();
    } else {
      const existingNames = new Set(targetFolder.children.map((c) => c.name.toLowerCase()));

      nodes.forEach((n) => {
        const copied = deepCopyFSNode(n, targetFolder.id, existingNames);
        targetFolder.children!.push(copied);
        resultNodes.push(copied);
      });
    }

    saveFilesystemToStorage(fs);
    window.dispatchEvent(new CustomEvent(FS_CHANGED_EVENT));
    return resultNodes;
  }
}
