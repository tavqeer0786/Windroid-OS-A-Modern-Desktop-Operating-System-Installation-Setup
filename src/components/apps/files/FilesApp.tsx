import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOS } from '../../../context/OSContext';
import {
  FSNode,
  ViewMode,
  SortByField,
  SortDirection,
  loadFilesystemFromStorage,
  saveFilesystemToStorage,
  loadViewModeFromStorage,
  saveViewModeToStorage
} from './filesystemData';
import { FilesPropertiesModal } from './FilesPropertiesModal';
import { StorageEventService } from './services/StorageEventService';
import { StorageProvider } from './providers/StorageProvider';
import { SystemDrive } from './models/drive';
import { DriveSection } from './components/DriveSection';
import { DrivePropertiesModal } from './components/DriveProperties';
import { TrashService, TrashItem } from './services/TrashService';
import { FileOperationManager, validateFileOperation } from './services/FileOperationManager';
import { isProtectedSystemItem } from '../../../services/SystemAppRegistry';
import { UnsupportedPackageDialog } from '../../dialogs/UnsupportedPackageDialog';
import { PackageDetectionService } from '../../../system/runtime/PackageDetectionService';
import { DemoPackageService } from '../../../system/demo/DemoPackageService';
import { FileAssociationService } from '../../../services/FileAssociationService';
import { DesktopShortcutService } from '../../../services/DesktopShortcutService';
import { ClipboardService, CLIPBOARD_CHANGED_EVENT } from '../../../services/ClipboardService';
import { resolveItemIcon } from '../../../services/ItemResolutionService';
import {
  Folder, FileText, Download, Film, Gamepad2, Code, Usb, Network,
  ChevronRight, ChevronLeft, ChevronDown, Search, Grid, List, Plus, Link,
  ShieldAlert, HardDrive, RotateCw, Copy, Scissors, Clipboard,
  Trash2, Edit3, Share2, MoreHorizontal, Pin, Image as ImageIcon,
  Music, Video, Monitor, Server, ArrowUp, ArrowUpDown, Check, ExternalLink, Sparkles,
  FileCode, Layers, Info, X, LayoutGrid, FilePlus, FolderPlus,
  RotateCcw, Lock, Unlock, Key, AlertTriangle, CornerUpRight
} from 'lucide-react';
import { HomeIcon, ComputerIcon, DocumentsIcon, CustomDriveIcon, RecycleBinIcon, FilesIcon, PhotosIcon, VideoIcon, DeleteIcon, TrashDeleteIcon } from '../../icons/CustomAppIcons';

interface FilesAppProps {
  initialState?: {
    initialPath?: string;
    initialDrive?: string;
    action?: string;
  };
}

export const FilesApp: React.FC<FilesAppProps> = ({ initialState }) => {
  const { developerMode, requestConfirm, addNotification, openApp } = useOS();

  // Storage Provider & System Drives State
  const [storageProvider, setStorageProvider] = useState<StorageProvider>(() =>
    StorageEventService.getInstance().getProvider()
  );
  const [drives, setDrives] = useState<SystemDrive[]>([]);
  const [selectedDriveProperties, setSelectedDriveProperties] = useState<SystemDrive | null>(null);

  // Sync drives from StorageProvider
  const refreshDrives = async () => {
    try {
      const activeDrives = await storageProvider.getDrives();
      setDrives(activeDrives);
    } catch (err) {
      console.error('Error fetching drives:', err);
    }
  };

  useEffect(() => {
    refreshDrives();
    const unsubscribe = StorageEventService.getInstance().subscribe(() => {
      refreshDrives();
    });
    return () => unsubscribe();
  }, [storageProvider]);

  const handleProviderChange = (type: 'demo' | 'native') => {
    StorageEventService.getInstance().setProvider(type);
    const newProvider = StorageEventService.getInstance().getProvider();
    setStorageProvider(newProvider);
  };

  // Primary State
  const [fsNodes, setFsNodes] = useState<FSNode[]>(() => {
    return loadFilesystemFromStorage(developerMode);
  });

  useEffect(() => {
    const handleFsChanged = () => {
      const nextNodes = loadFilesystemFromStorage(developerMode);
      setFsNodes((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(nextNodes)) {
          return prev;
        }
        return nextNodes;
      });
    };
    window.addEventListener('windroid-fs-changed', handleFsChanged);
    window.addEventListener('aether-fs-changed', handleFsChanged);
    return () => {
      window.removeEventListener('windroid-fs-changed', handleFsChanged);
      window.removeEventListener('aether-fs-changed', handleFsChanged);
    };
  }, [developerMode]);

  useEffect(() => {
    const nextNodes = loadFilesystemFromStorage(developerMode);
    setFsNodes((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextNodes)) {
        return prev;
      }
      return nextNodes;
    });
  }, [developerMode]);
  const [currentPathIds, setCurrentPathIds] = useState<string[]>([]);
  const [historyStack, setHistoryStack] = useState<string[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Recycle Bin State & Service Subscription
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => TrashService.getInstance().getItems());
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
  const isTrashEmpty = trashItems.length === 0;

  useEffect(() => {
    const unsub = TrashService.getInstance().subscribe(() => {
      setTrashItems(TrashService.getInstance().getItems());
    });
    return unsub;
  }, []);

  // Drive Selection & Action Modals State
  const [selectedDriveIds, setSelectedDriveIds] = useState<Set<string>>(new Set());
  const [mountingDriveId, setMountingDriveId] = useState<string | null>(null);
  const [unlockModal, setUnlockModal] = useState<{ isOpen: boolean; drive: SystemDrive; passwordInput: string; error?: string } | null>(null);
  const [conflictQueue, setConflictQueue] = useState<{ trashItem: TrashItem; targetParentId: string; existingName: string }[]>([]);
  const [emptyBinConfirmOpen, setEmptyBinConfirmOpen] = useState(false);

  // Selection & Clipboard
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboardState, setClipboardState] = useState(() => ClipboardService.getInstance().getClipboard());

  useEffect(() => {
    const handleClipboardChange = () => {
      setClipboardState(ClipboardService.getInstance().getClipboard());
    };
    window.addEventListener(CLIPBOARD_CHANGED_EVENT, handleClipboardChange);
    return () => window.removeEventListener(CLIPBOARD_CHANGED_EVENT, handleClipboardChange);
  }, []);

  // View & Filter Options
  const [viewMode, setViewModeState] = useState<ViewMode>(loadViewModeFromStorage);
  const [sortBy, setSortBy] = useState<SortByField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // UI State Modals & Menus
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [showViewSubmenu, setShowViewSubmenu] = useState(false);
  const [propertiesNode, setPropertiesNode] = useState<FSNode | null>(null);
  const [previewFile, setPreviewFile] = useState<FSNode | null>(null);
  const [unsupportedPackageState, setUnsupportedPackageState] = useState<{ isOpen: boolean; filename: string; reason: string } | null>(null);
  const [isThisPcExpanded, setIsThisPcExpanded] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetNode: FSNode | null;
    type: 'file' | 'folder' | 'drive' | 'empty' | 'trash_item' | 'shortcut';
  } | null>(null);

  // Inline Rename State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Address Bar State
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInputText, setPathInputText] = useState('');
  const pathInputRef = useRef<HTMLInputElement>(null);

  // Helper: Format path IDs array to user-readable string (e.g. "C:\Users\Alex\Desktop" or "This PC")
  const getFormattedPathString = useCallback((pathIds: string[], nodes: FSNode[]): string => {
    if (pathIds.length === 0) return 'This PC';
    const first = pathIds[0];
    if (first === 'recycle_bin') return 'Recycle Bin';
    if (first === 'home') return 'Home';
    if (first === 'gallery') return 'Gallery';
    if (first === 'cloud') return 'Windroid Drive';
    if (first === 'network') return 'Network';

    const segments: string[] = [];
    let currentList = nodes;
    for (const id of pathIds) {
      const found = currentList.find((n) => n.id === id);
      if (found) {
        if (found.type === 'drive' && found.driveLetter) {
          segments.push(found.driveLetter);
        } else {
          segments.push(found.name);
        }
        currentList = found.children || [];
      } else {
        segments.push(id);
      }
    }

    if (segments.length > 0 && segments[0].endsWith(':')) {
      return segments[0] + '\\' + segments.slice(1).join('\\');
    }
    return segments.join('\\');
  }, []);

  // Helper: Parse path string into path IDs array
  const parsePathStringToIds = useCallback((pathStr: string, nodes: FSNode[]): string[] | null => {
    const clean = pathStr.trim();
    if (!clean || clean.toLowerCase() === 'this pc' || clean.toLowerCase() === 'computer') {
      return [];
    }
    if (clean.toLowerCase() === 'recycle bin' || clean.toLowerCase() === 'trash') {
      return ['recycle_bin'];
    }
    if (clean.toLowerCase() === 'home') return ['home'];
    if (clean.toLowerCase() === 'gallery') return ['gallery'];
    if (clean.toLowerCase() === 'windroid drive' || clean.toLowerCase() === 'aether drive' || clean.toLowerCase() === 'cloud') return ['cloud'];
    if (clean.toLowerCase() === 'network') return ['network'];

    const parts = clean.split(/[/\\]+/).filter(Boolean);
    if (parts.length === 0) return [];

    let currentList = nodes;
    const resolvedIds: string[] = [];

    const firstPart = parts[0].toUpperCase();
    let rootDrive = currentList.find(
      (n) => n.type === 'drive' && n.driveLetter?.toUpperCase() === (firstPart.endsWith(':') ? firstPart : `${firstPart}:`)
    );

    if (!rootDrive) {
      rootDrive = currentList.find(
        (n) => n.name.toLowerCase() === parts[0].toLowerCase() || n.id.toLowerCase() === parts[0].toLowerCase()
      );
    }

    if (!rootDrive) return null;

    resolvedIds.push(rootDrive.id);
    currentList = rootDrive.children || [];

    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i].toLowerCase();
      const match = currentList.find(
        (n) => n.name.toLowerCase() === segment || n.id.toLowerCase() === segment
      );
      if (match) {
        resolvedIds.push(match.id);
        currentList = match.children || [];
      } else {
        return null;
      }
    }

    return resolvedIds;
  }, []);

  // Save filesystem to localStorage on update
  useEffect(() => {
    saveFilesystemToStorage(fsNodes);
  }, [fsNodes]);

  // Helper: Find full path IDs for a given target node ID in fsNodes
  const findPathToNodeId = useCallback((nodes: FSNode[], targetId: string, currentPath: string[] = []): string[] | null => {
    for (const node of nodes) {
      const nextPath = [...currentPath, node.id];
      if (node.id === targetId) {
        return nextPath;
      }
      if (node.children) {
        const found = findPathToNodeId(node.children, targetId, nextPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Handle Initial State Navigation - execute once on mount
  const initialPath = initialState?.initialPath;
  const initialDrive = initialState?.initialDrive;
  const initialFolderId = (initialState as any)?.initialFolderId;
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (initialFolderId) {
      if (initialFolderId === 'this_pc') {
        navigateTo([]);
        return;
      }
      if (initialFolderId === 'recycle_bin') {
        navigateTo(['recycle_bin']);
        return;
      }
      const resolvedPath = findPathToNodeId(fsNodes, initialFolderId);
      if (resolvedPath) {
        navigateTo(resolvedPath);
        return;
      }
    }

    if (initialPath) {
      const p = initialPath.trim().toLowerCase();
      if (p.includes('recycle') || p.includes('bin') || p === 'recycle_bin') {
        navigateTo(['recycle_bin']);
        return;
      }
      const findFolderByName = (nodes: FSNode[], targetName: string): FSNode | null => {
        for (const n of nodes) {
          if (n.type === 'folder' && n.name.toLowerCase() === targetName) return n;
          if (n.children) {
            const found = findFolderByName(n.children, targetName);
            if (found) return found;
          }
        }
        return null;
      };

      const targetFolder = findFolderByName(fsNodes, p);
      if (targetFolder) {
        const resolved = findPathToNodeId(fsNodes, targetFolder.id);
        if (resolved) {
          navigateTo(resolved);
          return;
        }
      }

      if (p.includes('demo')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_desktop', 'u_alex_desktop_demo_packages']);
      } else if (p.includes('download')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_downloads']);
      } else if (p.includes('document')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_documents']);
      } else if (p.includes('desktop')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_desktop']);
      } else if (p.includes('picture') || p.includes('photo')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_pictures']);
      } else if (p.includes('music')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_music']);
      } else if (p.includes('video')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_videos']);
      } else if (p.includes('workspace')) {
        navigateTo(['drive_c', 'c_users', 'u_alex', 'u_alex_workspace']);
      } else if (p.includes('c:') || p === 'drive_c') {
        navigateTo(['drive_c']);
      } else if (p.includes('d:') || p === 'drive_d') {
        navigateTo(['drive_d']);
      } else if (p.includes('e:') || p === 'drive_e') {
        navigateTo(['drive_e']);
      } else if (p.includes('f:') || p === 'drive_f') {
        navigateTo(['drive_f']);
      }
    } else if (initialDrive) {
      navigateTo([initialDrive]);
    }
  }, [initialPath, initialDrive, initialFolderId, findPathToNodeId]);

  // Reconcile currentPathIds when fsNodes changes (keep location if folder exists, fallback only if current folder was deleted)
  useEffect(() => {
    if (currentPathIds.length === 0) return;
    const firstId = currentPathIds[0];
    const isVirtual = ['recycle_bin', 'home', 'gallery', 'cloud', 'network'].includes(firstId);
    if (isVirtual) return;

    const currentNode = getNodeByPath(currentPathIds, fsNodes);
    if (!currentNode) {
      let validPath = [...currentPathIds];
      while (validPath.length > 0 && !getNodeByPath(validPath, fsNodes)) {
        validPath.pop();
      }
      setCurrentPathIds(validPath);
    }
  }, [fsNodes, currentPathIds]);

  // Focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Handle global click to dismiss dropdowns & context menu
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setIsNewMenuOpen(false);
      setIsSortMenuOpen(false);
      setIsViewMenuOpen(false);
      setIsMoreMenuOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Set ViewMode
  const changeViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    saveViewModeToStorage(mode);
    setIsViewMenuOpen(false);
  };

  // Drive Selection & Open Handlers (Part 1 Windows 11 Interaction Specs)
  const handleSelectDrive = (driveId: string, multiSelect = false) => {
    if (multiSelect) {
      setSelectedDriveIds((prev) => {
        const next = new Set(prev);
        if (next.has(driveId)) next.delete(driveId);
        else next.add(driveId);
        return next;
      });
    } else {
      setSelectedDriveIds(new Set([driveId]));
    }
  };

  const handleOpenDrive = async (drive: SystemDrive) => {
    // Encrypted drive check
    if (drive.isEncrypted && !drive.isMounted) {
      setUnlockModal({ isOpen: true, drive, passwordInput: '' });
      return;
    }

    // Unmounted drive check
    if (!drive.isMounted) {
      setMountingDriveId(drive.id);
      try {
        await storageProvider.mount(drive.id);
        await refreshDrives();
        setMountingDriveId(null);
        const target = fsNodes.find(n => n.id === drive.id || (drive.isSystemDrive && n.id === 'drive_c'));
        if (target) navigateTo([target.id]);
        else if (drive.id === 'drive_data' || drive.mountPoint?.includes('data')) navigateTo(['drive_d']);
        else if (drive.id === 'drive_usb') navigateTo(['drive_e']);
        else navigateTo(['drive_c']);
        addNotification({ title: 'Drive Mounted', message: `${drive.displayName} was successfully mounted.`, type: 'info' });
      } catch (err) {
        setMountingDriveId(null);
        addNotification({ title: 'Mount Error', message: `Could not mount ${drive.displayName}.`, type: 'error' });
      }
      return;
    }

    // Disconnected / unavailable check
    if (drive.connectionState === 'disconnected') {
      addNotification({ title: 'Drive Unavailable', message: 'This drive is no longer available.', type: 'warning' });
      return;
    }

    // Optical drive with no media
    if (drive.type === 'optical') {
      addNotification({ title: 'Optical Drive', message: 'Insert a disc to open this drive.', type: 'info' });
      return;
    }

    const target = fsNodes.find(n => n.id === drive.id || (drive.isSystemDrive && n.id === 'drive_c'));
    if (target) navigateTo([target.id]);
    else if (drive.id === 'drive_data' || drive.mountPoint?.includes('data')) navigateTo(['drive_d']);
    else if (drive.id === 'drive_usb') navigateTo(['drive_e']);
    else navigateTo(['drive_c']);
  };

  const handleContextMenuDrive = (e: React.MouseEvent, drive: SystemDrive) => {
    e.preventDefault();
    e.stopPropagation();
    handleSelectDrive(drive.id, false);
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetNode: {
        id: drive.id,
        name: drive.displayName,
        type: 'drive',
        parentId: 'this_pc',
        createdAt: '',
        modifiedAt: ''
      },
      type: 'drive'
    });
  };

  // Helper: Find Node by Path IDs
  const getNodeByPath = (pathIds: string[], nodes = fsNodes): FSNode | null => {
    if (pathIds.length === 0) return null; // Root / This PC
    let current: FSNode | undefined = nodes.find((n) => n.id === pathIds[0]);
    if (!current) return null;
    for (let i = 1; i < pathIds.length; i++) {
      if (!current.children) return null;
      current = current.children.find((child) => child.id === pathIds[i]);
      if (!current) return null;
    }
    return current;
  };

  // Helper: Build Node Breadcrumbs List
  const breadcrumbNodes = useMemo(() => {
    const list: { id: string; name: string; path: string[] }[] = [
      { id: 'this_pc', name: 'This PC', path: [] }
    ];
    let pathAcc: string[] = [];
    for (const id of currentPathIds) {
      pathAcc = [...pathAcc, id];
      const node = getNodeByPath(pathAcc);
      if (node) {
        list.push({ id: node.id, name: node.name, path: [...pathAcc] });
      } else if (id === 'recycle_bin') {
        list.push({ id: 'recycle_bin', name: 'Recycle Bin', path: ['recycle_bin'] });
      } else if (id === 'home') {
        list.push({ id: 'home', name: 'Home', path: ['home'] });
      } else if (id === 'gallery') {
        list.push({ id: 'gallery', name: 'Gallery', path: ['gallery'] });
      } else if (id === 'cloud') {
        list.push({ id: 'cloud', name: 'Windroid Drive', path: ['cloud'] });
      } else if (id === 'network') {
        list.push({ id: 'network', name: 'Network', path: ['network'] });
      }
    }
    return list;
  }, [currentPathIds, fsNodes]);

  // Navigation Logic
  const navigateTo = (newPathIds: string[]) => {
    setSelectedIds(new Set());
    setSearchQuery('');
    setCurrentPathIds(newPathIds);
    setIsEditingPath(false);

    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(newPathIds);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
  };

  const submitPathChange = () => {
    setIsEditingPath(false);
    if (!pathInputText.trim()) return;
    const targetIds = parsePathStringToIds(pathInputText, fsNodes);
    if (targetIds !== null) {
      navigateTo(targetIds);
    } else {
      addNotification({
        title: 'Path Not Found',
        message: `The path "${pathInputText}" could not be found.`,
        type: 'error'
      });
    }
  };

  useEffect(() => {
    if (isEditingPath && pathInputRef.current) {
      pathInputRef.current.focus();
      pathInputRef.current.select();
    }
  }, [isEditingPath]);

  const goBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentPathIds(historyStack[prevIndex]);
      setSelectedIds(new Set());
    }
  };

  const goForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentPathIds(historyStack[nextIndex]);
      setSelectedIds(new Set());
    }
  };

  const goUp = () => {
    if (currentPathIds.length > 0) {
      navigateTo(currentPathIds.slice(0, -1));
    }
  };

  // Get Current Folder Items
  const currentItems = useMemo(() => {
    if (currentPathIds.length === 0) {
      // THIS PC View: return drives
      return fsNodes.filter((n) => n.type === 'drive');
    }

    const firstId = currentPathIds[0];
    if (firstId === 'home') {
      // Home View: collect all pinned folders & recent files
      const pinned: FSNode[] = [];
      const collectPinned = (nodes: FSNode[]) => {
        for (const n of nodes) {
          if (n.isPinned) pinned.push(n);
          if (n.children) collectPinned(n.children);
        }
      };
      collectPinned(fsNodes);
      return pinned;
    }

    if (firstId === 'gallery') {
      // Gallery View: collect picture/image files
      const images: FSNode[] = [];
      const collectImages = (nodes: FSNode[]) => {
        for (const n of nodes) {
          if (n.type === 'file' && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(n.extension || '')) {
            images.push(n);
          }
          if (n.children) collectImages(n.children);
        }
      };
      collectImages(fsNodes);
      return images;
    }

    if (firstId === 'cloud' || firstId === 'network') {
      return [];
    }

    const parentNode = getNodeByPath(currentPathIds);
    return parentNode?.children || [];
  }, [currentPathIds, fsNodes]);

  // Filtered & Sorted Items
  const processedItems = useMemo(() => {
    let items = [...currentItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.extension && i.extension.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      // Drives & Folders always first
      if (a.type !== b.type) {
        if (a.type === 'drive') return -1;
        if (b.type === 'drive') return 1;
        if (a.type === 'folder') return -1;
        if (b.type === 'folder') return 1;
      }

      let res = 0;
      if (sortBy === 'name') {
        res = a.name.localeCompare(b.name);
      } else if (sortBy === 'modified') {
        res = a.modifiedAt.localeCompare(b.modifiedAt);
      } else if (sortBy === 'type') {
        res = (a.extension || a.type).localeCompare(b.extension || b.type);
      } else if (sortBy === 'size') {
        res = (a.sizeBytes || 0) - (b.sizeBytes || 0);
      }

      return sortDirection === 'asc' ? res : -res;
    });

    return items;
  }, [currentItems, searchQuery, sortBy, sortDirection]);

  // Selection Handlers
  const handleItemClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else if (e.shiftKey && selectedIds.size > 0) {
      const lastSelected = Array.from(selectedIds)[selectedIds.size - 1];
      const idx1 = processedItems.findIndex((i) => i.id === lastSelected);
      const idx2 = processedItems.findIndex((i) => i.id === id);
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const newSet = new Set(selectedIds);
        for (let i = start; i <= end; i++) {
          newSet.add(processedItems[i].id);
        }
        setSelectedIds(newSet);
      } else {
        setSelectedIds(new Set([id]));
      }
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  const handleItemDoubleClick = (item: FSNode) => {
    // 1. Handle shortcuts
    if (item.targetType === 'system-app' || item.extension === 'lnk' || item.targetId) {
      const targetAppId = (item.targetId || item.systemAppId || item.name.toLowerCase().replace(/\.app$/, '').replace(/ - shortcut$/i, '')) as any;
      if (targetAppId) {
        openApp(targetAppId);
        addNotification({
          title: 'Shortcut Launched',
          message: `Launched ${item.name.replace(/ - Shortcut.*$/, '')}`,
          type: 'info'
        });
        return;
      }
    }

    // 2. Direct double-click on system app executable
    if (item.type === 'file' && (item.extension === 'app' || isProtectedSystemItem(item) || item.systemAppId)) {
      const targetAppId = (item.systemAppId || item.id.replace(/^app_/, '')) as any;
      if (targetAppId) {
        openApp(targetAppId);
        return;
      }
    }

    // 3. Drive or Folder
    if (item.type === 'drive' || item.type === 'folder') {
      if (item.isProtected && !developerMode && (item.id === 'c_system' || item.id === 'sys_kernel')) {
        requestConfirm({
          title: 'Protected System Directory',
          message: `"${item.name}" contains core Windroid Linux binaries. Enable Developer Mode in Settings to inspect protected system paths.`,
          confirmLabel: 'Understood',
          onConfirm: () => {}
        });
        return;
      }

      if (currentPathIds.length === 0) {
        navigateTo([item.id]);
      } else {
        navigateTo([...currentPathIds, item.id]);
      }
    } else {
      const detection = PackageDetectionService.detectFromPath(item.name);

      if (detection.supported) {
        openApp('installer', { packagePath: `/drive_c/c_users/u_alex/Downloads/${item.name}` });
      } else if (detection.unsupportedCategory && detection.unsupportedCategory !== 'unknown') {
        setUnsupportedPackageState({
          isOpen: true,
          filename: item.name,
          reason: item.demoMetadata?.unsupportedReason || detection.reason || 'Unsupported package format'
        });
      } else {
        const payload = FileAssociationService.resolveFileOpen(item, currentItems);
        openApp(payload.appId as any, payload.initialState);
      }
    }
  };

  // Helper: Create Shortcut for System App or File
  const handleCreateShortcut = (node: FSNode) => {
    const targetAppId = node.systemAppId || node.id.replace(/^app_/, '') || 'files';
    const cleanName = node.name.replace(/\.app$/i, '');
    const shortcutName = `${cleanName} - Shortcut`;

    const newShortcutNode: FSNode = {
      id: `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: shortcutName,
      type: 'file',
      extension: 'lnk',
      size: '1 KB',
      sizeBytes: 1024,
      parentId: currentPathIds[currentPathIds.length - 1] || 'u_alex_desktop',
      createdAt: new Date().toISOString().split('T')[0],
      modifiedAt: new Date().toISOString().split('T')[0],
      targetType: 'system-app',
      targetId: targetAppId,
      systemAppId: targetAppId,
      isProtected: false, // Shortcuts are NOT protected! They can be moved/deleted/renamed freely.
      content: `Shortcut pointing to Windroid OS ${cleanName}`
    };

    setFsNodes((prev) => insertNodeAtPath(prev, currentPathIds, newShortcutNode));
    addNotification({
      title: 'Shortcut Created',
      message: `Created shortcut "${shortcutName}" in current location.`,
      type: 'info'
    });
  };

  // Context Menu Handlers
  const handleContextMenu = (e: React.MouseEvent, targetNode: FSNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetNode) {
      if (!selectedIds.has(targetNode.id)) {
        setSelectedIds(new Set([targetNode.id]));
      }
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        targetNode,
        type: targetNode.type
      });
    } else {
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        targetNode: null,
        type: 'empty'
      });
    }
  };

  // CRUD Operations
  const isCurrentLocationWritable = (): { writable: boolean; targetFolderId?: string; reason?: string } => {
    const currentFolderId = currentPathIds[currentPathIds.length - 1] || 'this_pc';
    if (currentFolderId === 'this_pc' || currentPathIds.length === 0) {
      return { writable: false, reason: "You can't create items directly in This PC. Navigate into a drive or folder." };
    }
    if (currentFolderId === 'recycle_bin' || currentPathIds[0] === 'recycle_bin') {
      return { writable: false, reason: "You can't create items in the Recycle Bin." };
    }

    const currentDriveId = currentPathIds[0];
    const currentDrive = drives.find((d) => d.id === currentDriveId);
    if (currentDrive?.isReadOnly) {
      return { writable: false, reason: "You can't create items on a read-only drive." };
    }

    const parentNode = getNodeByPath(currentPathIds, fsNodes);
    if (parentNode && (parentNode.isProtected || parentNode.canModify === false)) {
      return { writable: false, reason: "You can't create items in this protected system location." };
    }

    return { writable: true, targetFolderId: currentFolderId };
  };

  const handleCreateFolder = () => {
    const check = isCurrentLocationWritable();
    if (!check.writable || !check.targetFolderId) {
      addNotification({
        title: 'Location Protected',
        message: check.reason || "You can't create items in this location.",
        type: 'error'
      });
      return;
    }

    const newFolder = DesktopShortcutService.getInstance().createFolderInFolder(check.targetFolderId);
    if (newFolder) {
      const updatedFS = loadFilesystemFromStorage();
      setFsNodes(updatedFS);
      setSelectedIds(new Set([newFolder.id]));
      setRenamingId(newFolder.id);
      setRenameText(newFolder.name);
    }
  };

  const handleCreateDocument = () => {
    const check = isCurrentLocationWritable();
    if (!check.writable || !check.targetFolderId) {
      addNotification({
        title: 'Location Protected',
        message: check.reason || "You can't create items in this location.",
        type: 'error'
      });
      return;
    }

    const newDoc = DesktopShortcutService.getInstance().createTextFileInFolder(check.targetFolderId);
    if (newDoc) {
      const updatedFS = loadFilesystemFromStorage();
      setFsNodes(updatedFS);
      setSelectedIds(new Set([newDoc.id]));
      setRenamingId(newDoc.id);
      setRenameText(newDoc.name);
    }
  };

  // Helper: Recursive Insert Node
  const insertNodeAtPath = (nodes: FSNode[], pathIds: string[], newNode: FSNode): FSNode[] => {
    if (pathIds.length === 0) return [...nodes, newNode];
    return nodes.map((node) => {
      if (node.id === pathIds[0]) {
        if (pathIds.length === 1) {
          return { ...node, children: [...(node.children || []), newNode] };
        }
        return {
          ...node,
          children: insertNodeAtPath(node.children || [], pathIds.slice(1), newNode)
        };
      }
      return node;
    });
  };

  // Trash Item Selection Handler
  const handleTrashItemClick = (id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedTrashIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedTrashIds(new Set([id]));
    }
  };

  // Delete Selection (Protected System Items Gatekeeper)
  const handleDeleteSelected = (isShiftDelete = false) => {
    // If inside Recycle Bin, permanently delete selected trash items
    if (currentPathIds[0] === 'recycle_bin') {
      if (selectedTrashIds.size === 0) return;
      requestConfirm({
        title: 'Delete Permanently',
        message: `Are you sure you want to permanently delete these ${selectedTrashIds.size} item(s)? This action cannot be undone.`,
        confirmLabel: 'Delete Permanently',
        isDanger: true,
        onConfirm: () => {
          TrashService.getInstance().permanentlyDelete(Array.from(selectedTrashIds));
          setSelectedTrashIds(new Set());
          addNotification({ title: 'Recycle Bin', message: 'Item(s) permanently deleted.', type: 'warning' });
        }
      });
      return;
    }

    if (selectedIds.size === 0) return;
    const itemsToDelete = processedItems.filter((i) => selectedIds.has(i.id));

    // Check central operation gatekeeper
    const opType = isShiftDelete ? 'permanent-delete' : 'trash';
    const validation = validateFileOperation<FSNode>({ operation: opType, sourceItems: itemsToDelete });

    if (!validation.allowed) {
      if (validation.allowedItems.length === 0) {
        addNotification({
          title: 'System Application Protection',
          message: validation.reason || 'Protected system applications cannot be deleted.',
          type: 'error'
        });
        return;
      }

      // Multi-selection choice dialog: Some items protected, some allowed
      requestConfirm({
        title: 'Protected System Items Selected',
        message: `${validation.blockedItems.length} protected system application(s) cannot be deleted. Do you want to continue deleting the remaining ${validation.allowedItems.length} item(s)?`,
        confirmLabel: 'Continue',
        isDanger: true,
        onConfirm: () => {
          executeDeleteItems(validation.allowedItems, isShiftDelete);
        }
      });
      return;
    }

    // Check if current drive is read-only
    const currentDriveId = currentPathIds[0];
    const currentDrive = drives.find((d) => d.id === currentDriveId);
    if (currentDrive?.isReadOnly) {
      addNotification({
        title: 'Read-Only Drive',
        message: 'Items on a read-only drive cannot be deleted.',
        type: 'error'
      });
      return;
    }

    executeDeleteItems(validation.allowedItems, isShiftDelete);
  };

  const executeDeleteItems = (itemsToDelete: FSNode[], isShiftDelete: boolean) => {
    const idsToDelete = new Set(itemsToDelete.map((i) => i.id));
    if (isShiftDelete) {
      requestConfirm({
        title: 'Delete Permanently',
        message: `Are you sure you want to permanently delete ${itemsToDelete.length} item(s)? This action cannot be undone.`,
        confirmLabel: 'Delete Permanently',
        isDanger: true,
        onConfirm: () => {
          setFsNodes((prev) => removeNodesFromState(prev, idsToDelete));
          setSelectedIds(new Set());
          addNotification({
            title: 'Files',
            message: `Permanently deleted ${itemsToDelete.length} item(s)`,
            type: 'warning'
          });
        }
      });
      return;
    }

    const pathString = breadcrumbNodes.map((b) => b.name).join(' > ');
    const parentId = currentPathIds[currentPathIds.length - 1] || 'this_pc';
    const driveId = currentPathIds[0] || 'drive_c';

    const nodesToTrash = itemsToDelete.map((node) => ({
      node,
      originalPath: pathString,
      originalParentId: parentId,
      originalDriveId: driveId
    }));

    itemsToDelete.forEach((item) => {
      DemoPackageService.getInstance().markItemDeleted(item.name);
    });

    TrashService.getInstance().moveToTrash(nodesToTrash);
    setFsNodes((prev) => removeNodesFromState(prev, idsToDelete));
    setSelectedIds(new Set());

    addNotification({
      title: 'Recycle Bin',
      message: `Moved ${itemsToDelete.length} item(s) to Recycle Bin.`,
      type: 'info'
    });
  };

  // Restore Trash Items & Conflict Resolution Logic
  const restoreTrashItems = (trashIdsToRestore: string[]) => {
    const itemsToRestore = trashItems.filter((item) => trashIdsToRestore.includes(item.id));
    if (itemsToRestore.length === 0) return;

    let restoredCount = 0;
    const newConflicts: { trashItem: TrashItem; targetParentId: string; existingName: string }[] = [];
    let currentFS = [...fsNodes];

    for (const item of itemsToRestore) {
      let targetParentId = item.originalParentId || 'drive_c';

      let parentNode = getNodeByPath([targetParentId], currentFS);
      if (!parentNode && item.originalDriveId) {
        parentNode = getNodeByPath([item.originalDriveId], currentFS);
        targetParentId = parentNode ? item.originalDriveId : 'drive_c';
      }
      if (!parentNode) {
        targetParentId = 'u_alex_documents';
      }

      const children = parentNode?.children || currentFS;
      const existingConflict = children.find((c) => c.name.toLowerCase() === item.name.toLowerCase());

      if (existingConflict) {
        newConflicts.push({ trashItem: item, targetParentId, existingName: item.name });
      } else {
        const nodeToInsert: FSNode = {
          ...item.nodeData,
          parentId: targetParentId
        };
        currentFS = insertNodeAtPath(currentFS, targetParentId === 'this_pc' ? [] : [targetParentId], nodeToInsert);
        DemoPackageService.getInstance().markItemRestored(item.name);
        TrashService.getInstance().removeItems([item.id]);
        restoredCount++;
      }
    }

    setFsNodes(currentFS);
    if (restoredCount > 0) {
      addNotification({
        title: 'Recycle Bin',
        message: `Restored ${restoredCount} item(s).`,
        type: 'info'
      });
    }
    if (newConflicts.length > 0) {
      setConflictQueue(newConflicts);
    }
  };

  const handleConflictResolution = (action: 'replace' | 'keep_both' | 'skip') => {
    if (conflictQueue.length === 0) return;
    const currentConflict = conflictQueue[0];
    const { trashItem, targetParentId } = currentConflict;

    if (action === 'skip') {
      setConflictQueue((prev) => prev.slice(1));
      return;
    }

    setFsNodes((prevFS) => {
      let updatedFS = [...prevFS];
      if (action === 'replace') {
        const parentNode = getNodeByPath([targetParentId], updatedFS);
        const existing = parentNode?.children?.find((c) => c.name.toLowerCase() === trashItem.name.toLowerCase());
        if (existing) {
          updatedFS = removeNodesFromState(updatedFS, new Set([existing.id]));
        }
        const nodeToInsert: FSNode = { ...trashItem.nodeData, parentId: targetParentId };
        updatedFS = insertNodeAtPath(updatedFS, [targetParentId], nodeToInsert);
      } else if (action === 'keep_both') {
        const parts = trashItem.name.split('.');
        let newName = '';
        if (parts.length > 1 && trashItem.type === 'file') {
          const ext = parts.pop();
          newName = `${parts.join('.')} (restored).${ext}`;
        } else {
          newName = `${trashItem.name} (restored)`;
        }
        const nodeToInsert: FSNode = {
          ...trashItem.nodeData,
          id: `${trashItem.nodeData.id}_restored_${Date.now()}`,
          name: newName,
          parentId: targetParentId
        };
        updatedFS = insertNodeAtPath(updatedFS, [targetParentId], nodeToInsert);
      }
      return updatedFS;
    });

    TrashService.getInstance().removeItems([trashItem.id]);
    addNotification({
      title: 'Recycle Bin',
      message: `Restored "${trashItem.name}".`,
      type: 'info'
    });

    setConflictQueue((prev) => prev.slice(1));
  };

  // Helper: Recursive Delete Nodes
  const removeNodesFromState = (nodes: FSNode[], idsToRemove: Set<string>): FSNode[] => {
    return nodes
      .filter((node) => !idsToRemove.has(node.id))
      .map((node) => {
        if (node.children) {
          return { ...node, children: removeNodesFromState(node.children, idsToRemove) };
        }
        return node;
      });
  };

  // Inline Rename with Protection Gatekeeper
  const startRename = (node: FSNode) => {
    const validation = validateFileOperation<FSNode>({ operation: 'rename', sourceItems: [node] });
    if (!validation.allowed) {
      addNotification({
        title: 'System Application Protection',
        message: validation.reason || 'Built-in system application names cannot be changed.',
        type: 'error'
      });
      return;
    }
    setRenamingId(node.id);
    setRenameText(node.name);
  };

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      const val = renameInputRef.current.value;
      const dotIdx = val.lastIndexOf('.');
      if (dotIdx > 0) {
        renameInputRef.current.setSelectionRange(0, dotIdx);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingId]);

  // Helper: Find Node by ID
  const getNodeById = (nodes: FSNode[], id: string): FSNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = getNodeById(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const commitRename = () => {
    if (!renamingId || !renameText.trim()) {
      setRenamingId(null);
      return;
    }
    let newName = renameText.trim();
    const currentNode = getNodeById(fsNodes, renamingId);
    if (currentNode && currentNode.type === 'file' && (currentNode.extension === 'txt' || currentNode.name.endsWith('.txt'))) {
      if (!newName.toLowerCase().endsWith('.txt')) {
        newName += '.txt';
      }
    }

    if (currentNode && newName === currentNode.name) {
      setRenamingId(null);
      return;
    }

    const parentId = currentNode?.parentId;
    const parentNode = parentId ? getNodeById(fsNodes, parentId) : null;
    const siblings = parentNode?.children || fsNodes;
    const hasConflict = siblings.some((s) => s.id !== renamingId && s.name.toLowerCase() === newName.toLowerCase());
    if (hasConflict) {
      addNotification({
        title: 'Rename Failed',
        message: `An item with the name "${newName}" already exists in this directory.`,
        type: 'error'
      });
      setRenamingId(null);
      return;
    }

    setFsNodes((prev) => {
      const updated = updateNodeInState(prev, renamingId, { name: newName });
      saveFilesystemToStorage(updated);
      return updated;
    });
    window.dispatchEvent(new CustomEvent('aether-fs-changed'));
    setRenamingId(null);
  };

  // Helper: Recursive Update Node
  const updateNodeInState = (nodes: FSNode[], id: string, updates: Partial<FSNode>): FSNode[] => {
    return nodes.map((node) => {
      if (node.id === id) {
        return { ...node, ...updates, modifiedAt: new Date().toISOString().split('T')[0] };
      }
      if (node.children) {
        return { ...node, children: updateNodeInState(node.children, id, updates) };
      }
      return node;
    });
  };

  // Copy / Cut / Paste with Protection Gatekeeper
  const handleCopy = () => {
    const selected = processedItems.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;

    const validation = validateFileOperation<FSNode>({ operation: 'copy', sourceItems: selected });
    if (!validation.allowed) {
      if (validation.allowedItems.length === 0) {
        addNotification({
          title: 'System Application Protection',
          message: validation.reason || 'System application files cannot be copied. Create a shortcut instead.',
          type: 'error'
        });
        return;
      }
      addNotification({
        title: 'Protected System Items',
        message: `${validation.blockedItems.length} protected app(s) excluded from copy. Copied ${validation.allowedItems.length} item(s).`,
        type: 'warning'
      });
      ClipboardService.getInstance().setClipboard({ action: 'copy', nodes: validation.allowedItems });
      return;
    }

    ClipboardService.getInstance().setClipboard({ action: 'copy', nodes: selected });
    addNotification({ title: 'Clipboard', message: `Copied ${selected.length} item(s)`, type: 'info' });
  };

  const handleCut = () => {
    const selected = processedItems.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;

    const validation = validateFileOperation<FSNode>({ operation: 'move', sourceItems: selected });
    if (!validation.allowed) {
      if (validation.allowedItems.length === 0) {
        addNotification({
          title: 'System Application Protection',
          message: validation.reason || 'System applications cannot be moved from their installation folder.',
          type: 'error'
        });
        return;
      }
      addNotification({
        title: 'Protected System Items',
        message: `${validation.blockedItems.length} protected app(s) excluded from cut. Cut ${validation.allowedItems.length} item(s).`,
        type: 'warning'
      });
      ClipboardService.getInstance().setClipboard({ action: 'cut', nodes: validation.allowedItems });
      return;
    }

    ClipboardService.getInstance().setClipboard({ action: 'cut', nodes: selected });
    addNotification({ title: 'Clipboard', message: `Cut ${selected.length} item(s)`, type: 'info' });
  };

  const handlePaste = () => {
    if (!clipboardState || clipboardState.nodes.length === 0) return;

    const check = isCurrentLocationWritable();
    if (!check.writable || !check.targetFolderId) {
      addNotification({
        title: 'Location Protected',
        message: check.reason || "You can't paste items in this location.",
        type: 'error'
      });
      return;
    }

    const count = clipboardState.nodes.length;
    const pastedNodes = ClipboardService.getInstance().pasteToFolder(check.targetFolderId);
    setFsNodes(loadFilesystemFromStorage());
    if (pastedNodes && pastedNodes.length > 0) {
      setSelectedIds(new Set(pastedNodes.map((n) => n.id)));
    }
    addNotification({ title: 'Clipboard', message: `Pasted ${count} item(s)`, type: 'info' });
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(processedItems.map((i) => i.id)));
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'F2' && selectedIds.size === 1) {
        e.preventDefault();
        const sel = processedItems.find((i) => selectedIds.has(i.id));
        if (sel) startRename(sel);
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        goUp();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        setPathInputText(getFormattedPathString(currentPathIds, fsNodes));
        setIsEditingPath(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, processedItems, clipboardState, currentPathIds, historyIndex, fsNodes, getFormattedPathString]);

  // Render Icon for FSNode using central ItemResolutionService
  const renderNodeIcon = (node: FSNode, sizeClass = 'w-5 h-5') => {
    return resolveItemIcon(node, { className: sizeClass });
  };

  const selectedCount = selectedIds.size;
  const selectedNode = selectedCount === 1 ? processedItems.find((i) => selectedIds.has(i.id)) : null;

  return (
    <div 
      className="h-full flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none overflow-hidden"
      onClick={() => {
        setSelectedIds(new Set());
        setContextMenu(null);
      }}
    >
      {/* 1. NAVIGATION TOOLBAR (Back, Forward, Up, Refresh, Breadcrumb, Search) */}
      <div className="h-11 px-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-2 shrink-0">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); goBack(); }}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Back (Alt+Left)"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goForward(); }}
            disabled={historyIndex >= historyStack.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Forward (Alt+Right)"
          >
            <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goUp(); }}
            disabled={currentPathIds.length === 0}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Up (Alt+Up)"
          >
            <ArrowUp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setFsNodes(loadFilesystemFromStorage()); }}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Breadcrumb / Address Bar */}
        <div 
          onClick={() => {
            if (!isEditingPath) {
              setPathInputText(getFormattedPathString(currentPathIds, fsNodes));
              setIsEditingPath(true);
            }
          }}
          className="flex-1 h-8 flex items-center justify-between gap-1 px-3 rounded-none bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs overflow-x-auto custom-scrollbar shadow-none relative cursor-text group"
        >
          {isEditingPath ? (
            <input
              ref={pathInputRef}
              type="text"
              value={pathInputText}
              onChange={(e) => setPathInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitPathChange();
                } else if (e.key === 'Escape') {
                  setIsEditingPath(false);
                }
              }}
              onBlur={submitPathChange}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent text-slate-900 dark:text-white font-mono font-medium outline-none text-xs"
            />
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-1">
              {breadcrumbNodes.map((b, idx) => (
                <React.Fragment key={b.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 select-none" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateTo(b.path);
                    }}
                    className={`px-1.5 py-0.5 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer truncate max-w-[150px] font-medium select-none ${
                      idx === breadcrumbNodes.length - 1 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {b.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Quick Copy Path Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const formattedPath = getFormattedPathString(currentPathIds, fsNodes);
              navigator.clipboard.writeText(formattedPath);
              addNotification({
                title: 'Clipboard',
                message: `Path "${formattedPath}" copied to clipboard`,
                type: 'info'
              });
            }}
            className="p-1 rounded-none hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
            title="Copy as path"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 w-40 sm:w-52 h-8 flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={currentPathIds.length === 0 ? "Search This PC" : "Search folder..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full pl-8 pr-7 text-xs rounded-none bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white shadow-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. COMMAND TOOLBAR (New, Cut, Copy, Paste, Rename, Delete, Sort, View, More) */}
      <div className="h-10 px-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-1.5 shrink-0 text-xs">
        {currentPathIds[0] === 'recycle_bin' ? (
          /* RECYCLE BIN SPECIFIC TOOLBAR */
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <button
              onClick={(e) => {
                e.stopPropagation();
                restoreTrashItems(Array.from(selectedTrashIds));
              }}
              disabled={selectedTrashIds.size === 0}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400 cursor-pointer"
              title="Restore selected items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore selected</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                restoreTrashItems(trashItems.map((i) => i.id));
              }}
              disabled={trashItems.length === 0}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-medium flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Restore all items in Recycle Bin"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore all items</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSelected();
              }}
              disabled={selectedTrashIds.size === 0}
              className="px-2 py-1 rounded-lg hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-black disabled:opacity-30 flex items-center gap-1.5 cursor-pointer font-medium border border-transparent"
              title="Delete permanently"
            >
              <TrashDeleteIcon size={16} className="text-black" />
              <span>Delete permanently</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (trashItems.length > 0) setEmptyBinConfirmOpen(true);
              }}
              disabled={trashItems.length === 0}
              className="px-2.5 py-1 rounded-lg hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-black disabled:opacity-30 flex items-center gap-1.5 cursor-pointer font-semibold border border-transparent"
              title="Empty Recycle Bin"
            >
              <TrashDeleteIcon size={16} className="text-black" />
              <span>Empty Recycle Bin</span>
            </button>
          </div>
        ) : (
          /* STANDARD FOLDER TOOLBAR */
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {/* New Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsNewMenuOpen((p) => !p); }}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {isNewMenuOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-8 left-0 z-50 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1 flex flex-col gap-0.5 animate-in fade-in duration-100"
                >
                  <button
                    onClick={() => { setIsNewMenuOpen(false); handleCreateFolder(); }}
                    className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left cursor-pointer font-medium"
                  >
                    <FolderPlus className="w-4 h-4 text-amber-500" /> Folder
                  </button>
                  <button
                    onClick={() => { setIsNewMenuOpen(false); handleCreateDocument(); }}
                    className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left cursor-pointer font-medium"
                  >
                    <FilePlus className="w-4 h-4 text-blue-500" /> Text Document
                  </button>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Cut */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCut(); }}
              disabled={selectedCount === 0}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
              title="Cut (Ctrl+X)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cut</span>
            </button>

            {/* Copy */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              disabled={selectedCount === 0}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
              title="Copy (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            {/* Paste */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePaste(); }}
              disabled={!clipboardState || clipboardState.nodes.length === 0}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
              title="Paste (Ctrl+V)"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paste</span>
            </button>

            {/* Rename */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (selectedNode) startRename(selectedNode);
              }}
              disabled={selectedCount !== 1}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
              title="Rename (F2)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rename</span>
            </button>

            {/* Share */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (selectedNode) {
                  addNotification({ title: 'Share', message: `Shared link created for ${selectedNode.name}`, type: 'info' });
                }
              }}
              disabled={selectedCount === 0}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteSelected(); }}
              disabled={selectedCount === 0}
              className="px-2 py-1 rounded-lg hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-black disabled:opacity-30 flex items-center gap-1.5 cursor-pointer border border-transparent"
              title="Delete (Delete)"
            >
              <TrashDeleteIcon size={16} className="text-black" />
            </button>
          </div>
        )}

        {/* Right Toolbar Options (Sort, View, More) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSortMenuOpen((p) => !p); }}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Sort</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isSortMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-8 right-0 z-50 w-40 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1 flex flex-col gap-0.5"
              >
                {[
                  { field: 'name', label: 'Name' },
                  { field: 'modified', label: 'Date modified' },
                  { field: 'type', label: 'Type' },
                  { field: 'size', label: 'Size' }
                ].map((s) => (
                  <button
                    key={s.field}
                    onClick={() => { setSortBy(s.field as SortByField); setIsSortMenuOpen(false); }}
                    className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span>{s.label}</span>
                    {sortBy === s.field && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
                <button
                  onClick={() => { setSortDirection('asc'); setIsSortMenuOpen(false); }}
                  className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left cursor-pointer"
                >
                  <span>Ascending</span>
                  {sortDirection === 'asc' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <button
                  onClick={() => { setSortDirection('desc'); setIsSortMenuOpen(false); }}
                  className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left cursor-pointer"
                >
                  <span>Descending</span>
                  {sortDirection === 'desc' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

          {/* View Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsViewMenuOpen((p) => !p); }}
              className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>View</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isViewMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-8 right-0 z-50 w-40 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1 flex flex-col gap-0.5"
              >
                {[
                  { mode: 'extra-large-icons', label: 'Extra Large icons' },
                  { mode: 'large-icons', label: 'Large icons' },
                  { mode: 'medium-icons', label: 'Medium icons' },
                  { mode: 'small-icons', label: 'Small icons' },
                  { mode: 'list', label: 'List' },
                  { mode: 'details', label: 'Details' }
                ].map((v) => (
                  <button
                    key={v.mode}
                    onClick={() => changeViewMode(v.mode as ViewMode)}
                    className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left cursor-pointer"
                  >
                    <span>{v.label}</span>
                    {viewMode === v.mode && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen((p) => !p); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {isMoreMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-8 right-0 z-50 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1 flex flex-col gap-0.5"
              >
                <button
                  onClick={() => { setIsMoreMenuOpen(false); setSelectedIds(new Set(processedItems.map((i) => i.id))); }}
                  className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={() => { setIsMoreMenuOpen(false); setSelectedIds(new Set()); }}
                  className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left cursor-pointer"
                >
                  Clear Selection
                </button>
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (selectedNode) setPropertiesNode(selectedNode);
                    else if (currentPathIds.length > 0) setPropertiesNode(getNodeByPath(currentPathIds));
                  }}
                  className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left cursor-pointer"
                >
                  Properties
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT LAYOUT: Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-56 border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-2 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0 text-xs select-none">
          {/* HOME Section */}
          <div className="space-y-0.5">
            <button
              onClick={() => navigateTo(['home'])}
              className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2.5 transition-colors cursor-pointer border rounded-none ${
                currentPathIds[0] === 'home'
                  ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                  : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={() => navigateTo(['gallery'])}
              className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2.5 transition-colors cursor-pointer border rounded-none ${
                currentPathIds[0] === 'gallery'
                  ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                  : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
              }`}
            >
              <PhotosIcon className="w-4 h-4" />
              <span>Gallery</span>
            </button>
          </div>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

          {/* CLOUD Section */}
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Cloud Storage
            </div>
            <button
              onClick={() => navigateTo(['cloud'])}
              className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2.5 transition-colors cursor-pointer border rounded-none ${
                currentPathIds[0] === 'cloud'
                  ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                  : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="truncate">Windroid Drive / Personal</span>
            </button>
          </div>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

          {/* QUICK ACCESS Section */}
          <div>
            <div className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Quick Access</span>
              <Pin className="w-3 h-3 text-slate-400" />
            </div>
            <div className="space-y-0.5">
              {[
                { name: 'Downloads', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_downloads'], icon: <Download className="w-4 h-4 text-emerald-500" /> },
                { name: 'Desktop', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_desktop'], icon: <ComputerIcon className="w-4 h-4" /> },
                { name: 'Documents', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_documents'], icon: <DocumentsIcon className="w-4 h-4" /> },
                { name: 'Pictures', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_pictures'], icon: <PhotosIcon className="w-4 h-4" /> },
                { name: 'Music', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_music'], icon: <Music className="w-4 h-4 text-rose-500" /> },
                { name: 'Screenshots', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_screenshots'], icon: <PhotosIcon className="w-4 h-4" /> },
                { name: 'Videos', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_videos'], icon: <VideoIcon className="w-4 h-4" /> },
                { name: 'Workspace', path: ['drive_c', 'c_users', 'u_alex', 'u_alex_workspace'], icon: <Code className="w-4 h-4 text-amber-500" /> }
              ].map((item) => {
                const isActive = currentPathIds.length >= item.path.length && item.path.every((pId, idx) => currentPathIds[idx] === pId);
                return (
                  <button
                    key={item.name}
                    onClick={() => navigateTo(item.path)}
                    className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2.5 transition-colors cursor-pointer justify-between border rounded-none ${
                      isActive
                        ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                        : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.name}</span>
                    </span>
                    <Pin className="w-3 h-3 opacity-40 shrink-0" />
                  </button>
                );
              })}

              {/* Recycle Bin in Sidebar */}
              <button
                onClick={() => navigateTo(['recycle_bin'])}
                className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2.5 transition-colors cursor-pointer justify-between border rounded-none ${
                  currentPathIds[0] === 'recycle_bin'
                    ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                    : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <RecycleBinIcon isEmpty={isTrashEmpty} className="w-4 h-4" />
                  <span className="truncate">Recycle Bin</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                  currentPathIds[0] === 'recycle_bin' ? 'bg-black/10 text-slate-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {trashItems.length}
                </span>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

          {/* THIS PC Section (Collapsible Accordion) */}
          <div>
            <button
              onClick={() => setIsThisPcExpanded((p) => !p)}
              className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isThisPcExpanded ? 'rotate-90' : ''}`} />
                <span>This PC</span>
              </span>
            </button>

            {isThisPcExpanded && (
              <div className="pl-2 mt-1 space-y-0.5">
                <button
                  onClick={() => navigateTo([])}
                  className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2 transition-colors cursor-pointer border rounded-none ${
                    currentPathIds.length === 0
                      ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                      : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ComputerIcon className="w-4 h-4" />
                  <span>This PC</span>
                </button>

                {drives.map((drive) => {
                  const isActive = currentPathIds.length === 1 && (currentPathIds[0] === drive.id || (drive.isSystemDrive && currentPathIds[0] === 'drive_c'));
                  return (
                    <button
                      key={drive.id}
                      onClick={() => handleOpenDrive(drive)}
                      className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2 transition-colors cursor-pointer border pl-4 rounded-none ${
                        isActive
                          ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                          : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <CustomDriveIcon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{drive.displayName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-0.5" />

          {/* NETWORK Section */}
          <div>
            <button
              onClick={() => navigateTo(['network'])}
              className={`w-full px-2.5 py-1.5 font-normal flex items-center gap-2.5 transition-colors cursor-pointer border rounded-none ${
                currentPathIds[0] === 'network'
                  ? 'bg-[#D9D9D9] border-transparent text-slate-900'
                  : 'border-transparent hover:bg-[#E5F3FF] hover:border-transparent text-slate-700 dark:text-slate-300'
              }`}
            >
              <Network className="w-4 h-4 text-slate-500" />
              <span>Network</span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT DISPLAY AREA */}
        <div 
          className="flex-1 overflow-y-auto p-5 bg-white dark:bg-slate-950 custom-scrollbar relative"
          onContextMenu={(e) => handleContextMenu(e, null)}
        >
          {/* THIS PC VIEW (DRIVES AND DEVICES GRID VIA STORAGE PROVIDER) */}
          {currentPathIds.length === 0 ? (
            <DriveSection
              drives={drives}
              provider={storageProvider}
              selectedDriveIds={selectedDriveIds}
              onSelectDrive={handleSelectDrive}
              onOpenDrive={handleOpenDrive}
              onContextMenuDrive={handleContextMenuDrive}
              onShowProperties={(drive) => setSelectedDriveProperties(drive)}
              onDriveUpdated={refreshDrives}
            />
          ) : currentPathIds[0] === 'recycle_bin' ? (
            /* RECYCLE BIN VIEW */
            trashItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-16 text-center">
                <RecycleBinIcon isEmpty={true} className="w-20 h-20 opacity-40 text-slate-400 dark:text-slate-600" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Recycle Bin is empty</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Items deleted from your drives will be stored here until you empty the bin.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs select-none">
                <div className="px-3 py-2 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <span className="col-span-4">Name</span>
                  <span className="col-span-4">Original location</span>
                  <span className="col-span-2">Date deleted</span>
                  <span className="col-span-1">Type</span>
                  <span className="col-span-1 text-right">Size</span>
                </div>
                {trashItems.map((item) => {
                  const isSelected = selectedTrashIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => handleTrashItemClick(item.id, e)}
                      onDoubleClick={() => setPreviewFile(item.nodeData)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!selectedTrashIds.has(item.id)) {
                          setSelectedTrashIds(new Set([item.id]));
                        }
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          isOpen: true,
                          type: 'trash_item',
                          targetNode: item.nodeData
                        });
                      }}
                      className={`group px-3 py-2.5 grid grid-cols-12 items-center cursor-pointer transition-colors border rounded-none ${
                        isSelected
                          ? 'bg-[#E5F3FF] border-transparent text-slate-900 font-normal'
                          : 'border-transparent hover:bg-[#E5F3FF] text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span className="col-span-4 flex items-center gap-2.5 truncate pr-2">
                        {renderNodeIcon(item.nodeData)}
                        <span className="truncate font-normal">{item.name}</span>
                      </span>
                      <span className="col-span-4 truncate text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        {item.originalPath || 'C: > System'}
                      </span>
                      <span className="col-span-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        {new Date(item.deletedAt).toLocaleDateString()}
                      </span>
                      <span className="col-span-1 text-[11px] capitalize text-slate-600 dark:text-slate-300">
                        {item.type}
                      </span>
                      <span className="col-span-1 text-right font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {item.size}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          ) : processedItems.length === 0 ? (
            /* EMPTY FOLDER STATE */
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-12">
              <Folder className="w-16 h-16 stroke-1 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium">This folder is empty.</p>
            </div>
          ) : viewMode === 'details' ? (
            /* DETAILS VIEW */
            <div className="space-y-1 text-xs">
              <div className="px-3 py-1.5 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <span className="col-span-6">Name</span>
                <span className="col-span-3">Date modified</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-1 text-right">Size</span>
              </div>
              {processedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isRenaming = renamingId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={(e) => handleItemClick(item.id, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`group px-3 py-2 grid grid-cols-12 items-center cursor-pointer transition-colors border rounded-none ${
                      isSelected
                        ? 'bg-[#E5F3FF] border-transparent text-slate-900 font-normal'
                        : 'border-transparent hover:bg-[#E5F3FF] text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="col-span-6 flex items-center gap-2.5 truncate pr-2">
                      {renderNodeIcon(item)}
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={commitRename}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-0.5 rounded bg-white text-slate-900 border border-blue-500 focus:outline-none w-full text-xs font-normal"
                        />
                      ) : (
                        <span className="truncate font-normal">{item.name}</span>
                      )}
                    </span>
                    <span className="col-span-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {item.modifiedAt}
                    </span>
                    <span className="col-span-2 text-[11px] capitalize text-slate-500 dark:text-slate-400">
                      {item.type === 'folder' ? 'File folder' : item.extension?.toUpperCase() || 'File'}
                    </span>
                    <span className="col-span-1 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {item.size || (item.children ? `${item.children.length} items` : '--')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'list' ? (
            /* LIST VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 text-xs">
              {processedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={(e) => handleItemClick(item.id, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`group p-2 flex items-center gap-2.5 cursor-pointer transition-colors border rounded-none ${
                      isSelected
                        ? 'bg-[#E5F3FF] border-transparent text-slate-900 font-normal'
                        : 'border-transparent hover:bg-[#E5F3FF] text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {renderNodeIcon(item)}
                    <span className="truncate font-normal">{item.name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* EXTRA LARGE / LARGE / MEDIUM / SMALL ICONS GRID VIEW */
            <div className={`grid gap-4 ${
              viewMode === 'extra-large-icons'
                ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : viewMode === 'large-icons' 
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
                : viewMode === 'medium-icons'
                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
                : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'
            }`}>
              {processedItems.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isRenaming = renamingId === item.id;
                const iconSize = viewMode === 'extra-large-icons' 
                  ? 'w-20 h-20' 
                  : viewMode === 'large-icons' 
                  ? 'w-12 h-12' 
                  : viewMode === 'medium-icons' 
                  ? 'w-8 h-8' 
                  : 'w-6 h-6';

                return (
                  <div
                    key={item.id}
                    onClick={(e) => handleItemClick(item.id, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`p-3 border flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all group rounded-none ${
                      isSelected
                        ? 'border-transparent bg-[#E5F3FF] text-slate-900 font-normal'
                        : 'border-slate-100 dark:border-slate-800/60 hover:border-transparent hover:bg-[#E5F3FF] text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {renderNodeIcon(item, iconSize)}
                    </div>
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={commitRename}
                        onClick={(e) => e.stopPropagation()}
                        className="px-1 py-0.5 rounded bg-white text-slate-900 border border-blue-500 focus:outline-none w-full text-xs font-normal text-center"
                      />
                    ) : (
                      <span className={`font-normal truncate w-full px-1 ${
                        viewMode === 'extra-large-icons' ? 'text-sm' : 'text-xs'
                      }`}>
                        {item.name}
                      </span>
                    )}
                    {item.size && (viewMode === 'extra-large-icons' || viewMode === 'large-icons') && (
                      <span className="text-[10px] text-slate-400 font-mono">{item.size}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. CONTEXT MENU FLYOUT */}
      {contextMenu?.isOpen && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[10000] w-52 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs select-none animate-in fade-in duration-100"
        >
          {contextMenu.type === 'trash_item' ? (
            <>
              <button
                onClick={() => {
                  setContextMenu(null);
                  restoreTrashItems(Array.from(selectedTrashIds));
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-semibold text-blue-600 dark:text-blue-400 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Restore
              </button>
              <button
                onClick={() => {
                  setContextMenu(null);
                  handleDeleteSelected();
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-black flex items-center gap-2 text-left font-medium cursor-pointer border border-transparent"
              >
                <TrashDeleteIcon size={15} className="text-black" /> Delete permanently
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
              <button
                onClick={() => {
                  setContextMenu(null);
                  if (contextMenu.targetNode) setPropertiesNode(contextMenu.targetNode);
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer"
              >
                <Info className="w-4 h-4 text-slate-400" /> Properties
              </button>
            </>
          ) : (
            <>
              {contextMenu.targetNode && (
                <>
                  <button
                    onClick={() => {
                      const target = contextMenu.targetNode;
                      setContextMenu(null);
                      if (target) handleItemDoubleClick(target);
                    }}
                    className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-semibold cursor-pointer text-slate-800 dark:text-slate-100"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-500" /> Open
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
                </>
              )}

              {/* 1. New folder */}
              <button
                onClick={() => { setContextMenu(null); handleCreateFolder(); }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" /> New folder
              </button>

              {/* 2. New text document */}
              <button
                onClick={() => { setContextMenu(null); handleCreateDocument(); }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <FilePlus className="w-4 h-4 text-blue-500" /> New text document
              </button>

              {/* 3. Copy */}
              <button
                onClick={() => { setContextMenu(null); handleCopy(); }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <Copy className="w-4 h-4 text-slate-500" /> Copy
              </button>

              {/* 4. Paste */}
              <button
                onClick={() => { setContextMenu(null); handlePaste(); }}
                disabled={!clipboardState || clipboardState.nodes.length === 0}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium disabled:opacity-40 cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <Clipboard className="w-4 h-4 text-slate-500" /> Paste
              </button>

              {/* 5. Refresh */}
              <button
                onClick={() => { setContextMenu(null); setFsNodes(loadFilesystemFromStorage()); }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
              >
                <RotateCw className="w-4 h-4 text-slate-500" /> Refresh
              </button>

              {/* 6. ↑↓Sort icons by... Submenu */}
              <div
                className="relative"
                onMouseEnter={() => setShowSortSubmenu(true)}
                onMouseLeave={() => setShowSortSubmenu(false)}
              >
                <button
                  onClick={() => setShowSortSubmenu(!showSortSubmenu)}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-slate-500" />
                    <span>↑↓Sort icons by...</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showSortSubmenu && (
                  <div className="absolute left-full top-0 ml-1 w-44 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col gap-0.5 z-[10001]">
                    {[
                      { field: 'name', label: 'Name' },
                      { field: 'modified', label: 'Date modified' },
                      { field: 'type', label: 'Type' },
                      { field: 'size', label: 'Size' },
                    ].map((opt) => (
                      <button
                        key={opt.field}
                        onClick={() => {
                          setSortBy(opt.field as any);
                          setShowSortSubmenu(false);
                          setContextMenu(null);
                        }}
                        className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                      >
                        <span>{opt.label}</span>
                        {sortBy === opt.field && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </button>
                    ))}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
                    <button
                      onClick={() => {
                        setSortDirection('asc');
                        setShowSortSubmenu(false);
                        setContextMenu(null);
                      }}
                      className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                    >
                      <span>Ascending</span>
                      {sortDirection === 'asc' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                    <button
                      onClick={() => {
                        setSortDirection('desc');
                        setShowSortSubmenu(false);
                        setContextMenu(null);
                      }}
                      className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                    >
                      <span>Descending</span>
                      {sortDirection === 'desc' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 7. Icon Size Submenu */}
              <div
                className="relative"
                onMouseEnter={() => setShowViewSubmenu(true)}
                onMouseLeave={() => setShowViewSubmenu(false)}
              >
                <button
                  onClick={() => setShowViewSubmenu(!showViewSubmenu)}
                  className="w-full px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-slate-500" />
                    <span>Icon Size</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showViewSubmenu && (
                  <div className="absolute left-full top-0 ml-1 w-44 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col gap-0.5 z-[10001]">
                    {[
                      { mode: 'details', label: 'Details' },
                      { mode: 'list', label: 'List' },
                      { mode: 'small-icons', label: 'Small icons' },
                      { mode: 'medium-icons', label: 'Medium icons' },
                      { mode: 'large-icons', label: 'Large icons' },
                      { mode: 'extra-large-icons', label: 'Extra large icons' },
                    ].map((opt) => (
                      <button
                        key={opt.mode}
                        onClick={() => {
                          changeViewMode(opt.mode as any);
                          setShowViewSubmenu(false);
                          setContextMenu(null);
                        }}
                        className="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                      >
                        <span>{opt.label}</span>
                        {viewMode === opt.mode && <Check className="w-3.5 h-3.5 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {contextMenu.targetNode && (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
                  <button
                    onClick={() => {
                      const target = contextMenu.targetNode;
                      setContextMenu(null);
                      if (target) startRename(target);
                    }}
                    className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                  >
                    <Edit3 className="w-4 h-4 text-slate-500" /> Rename
                  </button>
                  <button
                    onClick={() => { setContextMenu(null); handleDeleteSelected(); }}
                    className="px-3 py-1.5 rounded-xl hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-black flex items-center gap-2 text-left font-medium cursor-pointer border border-transparent"
                  >
                    <TrashDeleteIcon size={15} className="text-black" /> Delete
                  </button>
                  <button
                    onClick={() => {
                      const target = contextMenu.targetNode;
                      setContextMenu(null);
                      if (target) setPropertiesNode(target);
                    }}
                    className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-left font-medium cursor-pointer text-slate-800 dark:text-slate-100"
                  >
                    <Info className="w-4 h-4 text-slate-400" /> Properties
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* 5. PROPERTIES MODAL */}
      {propertiesNode && (
        <FilesPropertiesModal
          node={propertiesNode}
          pathString={breadcrumbNodes.map((b) => b.name).join(' > ')}
          onClose={() => setPropertiesNode(null)}
        />
      )}

      {/* DRIVE PROPERTIES MODAL */}
      {selectedDriveProperties && (
        <DrivePropertiesModal
          drive={selectedDriveProperties}
          provider={storageProvider}
          onClose={() => setSelectedDriveProperties(null)}
          onDriveUpdated={refreshDrives}
        />
      )}

      {/* UNLOCK ENCRYPTED DRIVE MODAL */}
      {unlockModal?.isOpen && (
        <div className="fixed inset-0 z-[10000] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setUnlockModal(null)}>
          <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 text-amber-500 font-bold text-sm">
              <Lock className="w-5 h-5" /> Unlock Encrypted Drive
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Enter password to mount and access BitLocker drive <strong>{unlockModal.drive.displayName}</strong>.
            </p>
            <input
              type="password"
              placeholder="Password (try: admin)"
              value={unlockModal.passwordInput}
              onChange={(e) => setUnlockModal({ ...unlockModal, passwordInput: e.target.value, error: undefined })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (unlockModal.passwordInput === 'admin' || unlockModal.passwordInput === 'correct') {
                    storageProvider.unlock?.(unlockModal.drive.id, unlockModal.passwordInput).then(() => {
                      refreshDrives();
                      setUnlockModal(null);
                      const target = fsNodes.find(n => n.id === unlockModal.drive.id || (unlockModal.drive.isSystemDrive && n.id === 'drive_c'));
                      if (target) navigateTo([target.id]);
                      else navigateTo(['drive_c']);
                    });
                  } else {
                    setUnlockModal({ ...unlockModal, error: 'Incorrect password. Try "admin".' });
                  }
                }
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              autoFocus
            />
            {unlockModal.error && <p className="text-red-500 text-[11px] font-medium">{unlockModal.error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setUnlockModal(null)} className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium cursor-pointer">Cancel</button>
              <button
                onClick={async () => {
                  if (unlockModal.passwordInput === 'admin' || unlockModal.passwordInput === 'correct') {
                    await storageProvider.unlock?.(unlockModal.drive.id, unlockModal.passwordInput);
                    await refreshDrives();
                    setUnlockModal(null);
                    const target = fsNodes.find(n => n.id === unlockModal.drive.id || (unlockModal.drive.isSystemDrive && n.id === 'drive_c'));
                    if (target) navigateTo([target.id]);
                    else navigateTo(['drive_c']);
                  } else {
                    setUnlockModal({ ...unlockModal, error: 'Incorrect password. Try "admin".' });
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" /> Unlock Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFLICT RESOLUTION MODAL */}
      {conflictQueue.length > 0 && (
        <div className="fixed inset-0 z-[10000] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 text-amber-500 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" /> File Conflict
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              The destination already contains an item named <strong>"{conflictQueue[0].existingName}"</strong>.
            </p>
            <div className="flex flex-col gap-2 my-1">
              <button onClick={() => handleConflictResolution('replace')} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-left transition-colors cursor-pointer">
                <div className="font-bold">Replace file in destination</div>
                <div className="text-[11px] opacity-80">Overwrite existing file with restored version</div>
              </button>
              <button onClick={() => handleConflictResolution('keep_both')} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-left transition-colors cursor-pointer">
                <div className="font-bold">Keep both files</div>
                <div className="text-[11px] opacity-80">Restore file as "{conflictQueue[0].trashItem.name} (restored)"</div>
              </button>
              <button onClick={() => handleConflictResolution('skip')} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-left transition-colors cursor-pointer">
                <div className="font-bold">Skip this file</div>
                <div className="text-[11px] opacity-80">Leave item in Recycle Bin</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM EMPTY RECYCLE BIN MODAL */}
      {emptyBinConfirmOpen && (
        <div className="fixed inset-0 z-[10000] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setEmptyBinConfirmOpen(false)}>
          <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 font-bold text-sm">
              <TrashDeleteIcon size={20} className="text-black dark:text-white" /> Empty Recycle Bin
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete all <strong>{trashItems.length}</strong> item(s) in the Recycle Bin? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEmptyBinConfirmOpen(false)} className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium cursor-pointer">Cancel</button>
              <button
                onClick={() => {
                  TrashService.getInstance().emptyTrash();
                  setSelectedTrashIds(new Set());
                  setEmptyBinConfirmOpen(false);
                  addNotification({ title: 'Recycle Bin', message: 'Recycle Bin emptied.', type: 'info' });
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <TrashDeleteIcon size={14} className="text-white" /> Empty Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. FILE PREVIEW MODAL */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-[10000] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-5 max-w-lg w-full flex flex-col gap-3 shadow-2xl text-xs text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> {previewFile.name}
              </h4>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 font-mono text-xs max-h-64 overflow-y-auto whitespace-pre-wrap">
              {previewFile.content || 'Binary document file. Preview available in associated application.'}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Size: {previewFile.size || 'Unknown'}</span>
              <span>Modified: {previewFile.modifiedAt}</span>
            </div>
          </div>
        </div>
      )}

      {/* 7. BOTTOM STATUS BAR */}
      <div className="h-6 px-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
        <div>
          {selectedCount > 0 ? (
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </span>
          ) : (
            <span>{processedItems.length} item{processedItems.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeViewMode('details')}
            className={`p-0.5 rounded hover:text-slate-900 dark:hover:text-white ${viewMode === 'details' ? 'text-blue-600 font-bold' : ''}`}
            title="Details View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => changeViewMode('large-icons')}
            className={`p-0.5 rounded hover:text-slate-900 dark:hover:text-white ${viewMode === 'large-icons' ? 'text-blue-600 font-bold' : ''}`}
            title="Large Icons View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {unsupportedPackageState && (
        <UnsupportedPackageDialog
          filename={unsupportedPackageState.filename}
          reason={unsupportedPackageState.reason}
          isOpen={unsupportedPackageState.isOpen}
          onClose={() => setUnsupportedPackageState(null)}
        />
      )}
    </div>
  );
};
