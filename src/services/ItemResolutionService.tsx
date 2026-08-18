import React from 'react';
import { FSNode } from '../components/apps/files/filesystemData';
import { 
  HomeIcon, ComputerIcon, RecycleBinIcon, DocumentsIcon, DocumentIcon, PdfIcon,
  FilesIcon, PhotosIcon, MusicIcon, VideoIcon, CustomDriveIcon 
} from '../components/icons/CustomAppIcons';
import { AppIconRenderer } from '../components/icons/AppIconRenderer';
import { DesktopShortcutService } from './DesktopShortcutService';
import { FileAssociationService } from './FileAssociationService';
import { FolderArchive, Folder, HelpCircle } from 'lucide-react';
import { ShortcutBadge } from '../components/common/ShortcutBadge';

export interface ResolveIconOptions {
  className?: string;
  isEmptyTrash?: boolean;
  badgeSize?: number;
}

export interface OpenDesktopItemContext {
  openApp: (appId: string, initialState?: Record<string, any>) => void;
  requestConfirm?: (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }) => void;
  folderSiblings?: FSNode[];
}

/**
 * Centralized Icon Resolver used across Desktop, Files, and Search.
 */
export function resolveItemIcon(
  item: FSNode | any, 
  options: ResolveIconOptions = {}
): React.ReactNode {
  const className = options.className || 'w-12 h-12';
  const isEmptyTrash = options.isEmptyTrash !== undefined ? options.isEmptyTrash : true;

  if (!item) {
    return <HelpCircle className={className} />;
  }

  // 1. System items & System shortcuts
  if (
    item.id === 'sc_home' ||
    item.id === 'home' ||
    item.targetId === 'home' ||
    item.name === 'Home'
  ) {
    return <HomeIcon className={`${className} drop-shadow-md`} />;
  }

  if (
    item.id === 'sc_computer' ||
    item.targetId === 'this_pc' ||
    item.targetAppId === 'computer' ||
    item.systemAppId === 'computer' ||
    item.name === 'This PC'
  ) {
    return <ComputerIcon className={`${className} drop-shadow-md`} />;
  }

  if (
    item.id === 'sc_recycle_bin' ||
    item.targetId === 'recycle_bin' ||
    item.targetAppId === 'recycle_bin' ||
    item.systemAppId === 'recycle_bin' ||
    item.name === 'Recycle Bin'
  ) {
    return <RecycleBinIcon className={`${className} drop-shadow-md`} isEmpty={isEmptyTrash} />;
  }

  if (item.id === 'sc_documents' || item.targetId === 'u_alex_documents') {
    return <DocumentsIcon className={`${className} drop-shadow-md`} />;
  }

  // 2. Application shortcuts & general shortcuts
  const isShortcut = item.type === 'shortcut' || item.extension === 'lnk' || item.isShortcut === true;
  const isApplicationShortcut =
    item.type === 'shortcut' && (item.targetType === 'application' || item.targetAppId);

  if (isApplicationShortcut) {
    const targetAppId = item.targetAppId || item.appId;
    const resolvedTarget = targetAppId
      ? DesktopShortcutService.getInstance().resolveTargetApp(targetAppId)
      : null;

    const isBroken = resolvedTarget ? !resolvedTarget.exists : false;
    const iconName = resolvedTarget?.icon || item.icon || 'AppWindow';

    return (
      <div className="relative drop-shadow-md inline-flex items-center justify-center">
        <AppIconRenderer iconName={iconName} className={className} isBroken={isBroken} />
        <ShortcutBadge badgeSize={options.badgeSize || 14} />
      </div>
    );
  }

  // 3. Application files/nodes (e.g. Files.app, Browser.app, or installed app entries)
  if (item.type === 'application' || item.extension === 'app' || item.systemAppId) {
    const appId = item.systemAppId || item.targetAppId || (item.name ? item.name.replace(/\.app$/i, '').toLowerCase() : '');
    const resolvedTarget = appId
      ? DesktopShortcutService.getInstance().resolveTargetApp(appId)
      : null;
    const iconName = resolvedTarget?.icon || item.icon || 'AppWindow';
    return <AppIconRenderer iconName={iconName} className={`${className} drop-shadow-md`} />;
  }

  // 4. Special Virtual Folders
  if (item.id === 'u_alex_desktop_demo_packages') {
    return (
      <div className="relative drop-shadow-md flex items-center justify-center">
        <FolderArchive className="w-12 h-12 text-amber-500 fill-amber-500/20" />
        <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1 py-0.2 rounded-full shadow-xs">
          DEV
        </span>
      </div>
    );
  }

  if (item.id === 'u_alex_desktop_demo_media') {
    return (
      <div className="relative drop-shadow-md flex items-center justify-center">
        <Folder className="w-12 h-12 text-blue-500 fill-blue-500/20" />
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white font-extrabold text-[9px] px-1 py-0.2 rounded-full shadow-xs">
          MEDIA
        </span>
      </div>
    );
  }

  // 5. Drives, Folders & Files
  let baseIcon: React.ReactNode = null;

  if (item.type === 'drive') {
    baseIcon = <CustomDriveIcon className={`${className} drop-shadow-md`} />;
  } else if (item.type === 'folder' || item.targetType === 'folder') {
    baseIcon = <FilesIcon className={`${className} drop-shadow-md`} />;
  } else {
    const ext = (item.extension || item.name?.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') {
      baseIcon = <PdfIcon className={`${className} drop-shadow-md`} />;
    } else if (['md', 'txt', 'doc', 'docx', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'makefile', 'log', 'conf', 'ini', 'sys', 'dll', 'cpp', 'h'].includes(ext)) {
      baseIcon = <DocumentIcon className={`${className} drop-shadow-md`} />;
    } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif'].includes(ext)) {
      baseIcon = <PhotosIcon className={`${className} drop-shadow-md`} />;
    } else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
      baseIcon = <MusicIcon className={`${className} drop-shadow-md`} />;
    } else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
      baseIcon = <VideoIcon className={`${className} drop-shadow-md`} />;
    } else if (['exe', 'msi', 'apk', 'flatpakref', 'iso', 'zip', 'tar', 'gz', '7z'].includes(ext)) {
      baseIcon = <AppIconRenderer iconName="Download" className={`${className} drop-shadow-md`} />;
    } else {
      baseIcon = <DocumentIcon className={`${className} drop-shadow-md`} />;
    }
  }

  if (isShortcut) {
    return (
      <div className="relative drop-shadow-md inline-flex items-center justify-center">
        {baseIcon}
        <ShortcutBadge badgeSize={options.badgeSize || 14} />
      </div>
    );
  }

  return baseIcon;
}

/**
 * Centralized Item Dispatcher for opening Desktop & File items.
 */
export function openDesktopItem(item: FSNode | any, context: OpenDesktopItemContext): void {
  const { openApp, requestConfirm, folderSiblings = [] } = context;

  if (!item) return;

  // Clear launch overlays, drag previews, pointer capture, blur focus
  window.dispatchEvent(new CustomEvent('windroid-clear-launch-overlay'));
  window.dispatchEvent(new CustomEvent('aether-clear-launch-overlay'));
  window.dispatchEvent(new CustomEvent('windroid-cancel-desktop-drag'));
  window.dispatchEvent(new CustomEvent('aether-cancel-desktop-drag'));
  if (typeof document !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
    (document.activeElement as HTMLElement).blur();
  }

  // 1. System shortcuts & special system items
  if (
    item.id === 'sc_computer' ||
    item.targetId === 'this_pc' ||
    item.targetAppId === 'computer' ||
    item.systemAppId === 'computer' ||
    item.name === 'This PC'
  ) {
    openApp('files', { initialDrive: 'drive_sys' });
    return;
  }
  if (
    item.id === 'sc_recycle_bin' ||
    item.targetId === 'recycle_bin' ||
    item.targetAppId === 'recycle_bin' ||
    item.systemAppId === 'recycle_bin' ||
    item.name === 'Recycle Bin'
  ) {
    openApp('files', { initialPath: 'Recycle Bin' });
    return;
  }
  if (item.id === 'sc_documents' || item.targetId === 'u_alex_documents') {
    openApp('files', { initialPath: 'Documents' });
    return;
  }

  // 2. Application Shortcut
  const isApplicationShortcut =
    item.type === 'shortcut' && (item.targetType === 'application' || item.targetAppId);
  if (isApplicationShortcut) {
    const targetAppId = item.targetAppId || item.appId;
    const resolvedTarget = targetAppId
      ? DesktopShortcutService.getInstance().resolveTargetApp(targetAppId)
      : null;

    if (resolvedTarget && !resolvedTarget.exists) {
      if (requestConfirm) {
        requestConfirm({
          title: 'Missing Target Application',
          message: `The target application '${targetAppId}' is missing or no longer installed.\n\nWould you like to remove this shortcut from the Desktop?`,
          confirmLabel: 'Remove Shortcut',
          cancelLabel: 'Cancel',
          onConfirm: () => {
            DesktopShortcutService.getInstance().deleteDesktopNode(item.id);
          },
        });
      }
      return;
    }

    if (targetAppId) {
      openApp(targetAppId);
    }
    return;
  }

  // 3. Virtual folders & Folder shortcuts
  if (item.type === 'shortcut' && (item.targetType === 'folder' || item.targetId)) {
    const folderId = item.targetId || item.id;
    openApp('files', { initialFolderId: folderId, initialPath: item.name });
    return;
  }
  if (item.id === 'u_alex_desktop_demo_packages') {
    openApp('files', { initialFolderId: 'u_alex_desktop_demo_packages', initialPath: 'Desktop > Demo Packages' });
    return;
  }
  if (item.id === 'u_alex_desktop_demo_media') {
    openApp('files', { initialFolderId: 'u_alex_desktop_demo_media', initialPath: 'Desktop > Demo Media' });
    return;
  }

  // 4. Folders & Drives
  if (item.type === 'folder' || item.type === 'drive') {
    openApp('files', { initialFolderId: item.id, initialPath: item.name });
    return;
  }

  // 5. System application file node (e.g., Files.app, Browser.app, or installed app in Applications folder)
  if (item.type === 'application' || item.extension === 'app' || item.systemAppId) {
    const appId = item.systemAppId || item.targetAppId || (item.name ? item.name.replace(/\.app$/i, '').toLowerCase() : '');
    if (appId) {
      openApp(appId);
      return;
    }
  }

  // 6. Normal File -> Resolve via FileAssociationService
  if (item.type === 'file') {
    const payload = FileAssociationService.resolveFileOpen(item, folderSiblings);
    if (payload && payload.appId) {
      openApp(payload.appId, payload.initialState);
      return;
    }
  }

  // 7. Fallback File routing
  const fallbackPayload = FileAssociationService.resolveFileOpen(item, folderSiblings);
  openApp(fallbackPayload.appId, fallbackPayload.initialState);
}
