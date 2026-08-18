import { AppId } from '../types/os';

export interface SystemAppEntry {
  id: AppId;
  name: string;
  icon: string;
  executableTarget: string; // Component or launcher target name
  supportedFileTypes: string[];
  installationPath: string;
  isBuiltIn: boolean;
  isProtected: boolean;
  protectionType: 'core-system-app' | 'system-folder' | 'system-file';
  canUninstall: false;
  canMove: false;
  canRename: false;
  canCopy: false;
  canDelete: false;
  canModify: false;
}

export const SYSTEM_APP_REGISTRY: Record<AppId, SystemAppEntry> = {
  files: {
    id: 'files',
    name: 'Files',
    icon: 'Folder',
    executableTarget: 'FilesApp',
    supportedFileTypes: ['folder', 'zip', 'tar', 'gz', 'iso'],
    installationPath: '/drive_c/c_apps/app_files',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  computer: {
    id: 'files', // maps to files with computer target
    name: 'Computer',
    icon: 'HardDrive',
    executableTarget: 'FilesApp',
    supportedFileTypes: ['drive'],
    installationPath: '/drive_c/c_apps/app_computer',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: 'Settings',
    executableTarget: 'SettingsApp',
    supportedFileTypes: ['cfg', 'conf', 'ini', 'sys'],
    installationPath: '/drive_c/c_apps/app_settings',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: 'Terminal',
    executableTarget: 'TerminalApp',
    supportedFileTypes: ['sh', 'bash', 'zsh', 'bat', 'cmd'],
    installationPath: '/drive_c/c_apps/app_terminal',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  browser: {
    id: 'browser',
    name: 'Browser',
    icon: 'Globe',
    executableTarget: 'BrowserApp',
    supportedFileTypes: ['html', 'htm', 'url', 'svg', 'xml'],
    installationPath: '/drive_c/c_apps/app_browser',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  photos: {
    id: 'photos',
    name: 'Photos',
    icon: 'Image',
    executableTarget: 'PhotosApp',
    supportedFileTypes: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'],
    installationPath: '/drive_c/c_apps/app_photos',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  music: {
    id: 'music',
    name: 'Music',
    icon: 'Music',
    executableTarget: 'MusicApp',
    supportedFileTypes: ['mp3', 'wav', 'flac', 'ogg', 'm4a'],
    installationPath: '/drive_c/c_apps/app_music',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: 'Calendar',
    executableTarget: 'CalendarApp',
    supportedFileTypes: ['ics', 'ical'],
    installationPath: '/drive_c/c_apps/app_calendar',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  agent: {
    id: 'agent',
    name: 'Windroid Agent',
    icon: 'Sparkles',
    executableTarget: 'AgentApp',
    supportedFileTypes: [],
    installationPath: '/drive_c/c_apps/app_agent',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  installer: {
    id: 'installer',
    name: 'Unified App Installer',
    icon: 'Download',
    executableTarget: 'UnifiedAppInstaller',
    supportedFileTypes: ['exe', 'msi', 'apk', 'flatpak', 'flatpakref'],
    installationPath: '/drive_c/c_apps/app_installer',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
  'install-windroid': {
    id: 'install-windroid',
    name: 'Install Windroid OS',
    icon: 'HardDrive',
    executableTarget: 'InstallWindroidScreen',
    supportedFileTypes: ['iso'],
    installationPath: '/drive_c/c_apps/app_install_windroid',
    isBuiltIn: true,
    isProtected: true,
    protectionType: 'core-system-app',
    canUninstall: false,
    canMove: false,
    canRename: false,
    canCopy: false,
    canDelete: false,
    canModify: false,
  },
};

// Known protected app IDs & names
export const PROTECTED_SYSTEM_APP_IDS: Set<string> = new Set([
  'files',
  'computer',
  'settings',
  'terminal',
  'browser',
  'photos',
  'music',
  'calendar',
  'agent',
  'installer',
  'install-windroid',
  'app_files',
  'app_computer',
  'app_settings',
  'app_terminal',
  'app_browser',
  'app_photos',
  'app_music',
  'app_calendar',
  'app_agent',
  'app_installer'
]);

export const PROTECTED_SYSTEM_APP_NAMES: Set<string> = new Set([
  'Files',
  'Files.app',
  'Computer',
  'Computer.app',
  'Settings',
  'Settings.app',
  'Terminal',
  'Terminal.app',
  'Browser',
  'Browser.app',
  'Photos',
  'Photos.app',
  'Music',
  'Music.app',
  'Calendar',
  'Calendar.app',
  'Windroid Agent',
  'Windroid Agent.app',
  'System Agent',
  'System Agent.app'
]);

/**
 * Check if a file or node represents a protected system application or system folder.
 * Uses metadata-first checks (isProtected, isSystemItem, systemAppId) and falls back to registry IDs/paths.
 */
export function isProtectedSystemItem(item: {
  id?: string;
  name?: string;
  isProtected?: boolean;
  isSystemItem?: boolean;
  systemAppId?: string;
  path?: string;
  type?: string;
}): boolean {
  if (!item) return false;

  // Metadata check first
  if (item.isProtected || item.isSystemItem) return true;
  if (item.systemAppId && PROTECTED_SYSTEM_APP_IDS.has(item.systemAppId)) return true;

  // Check ID matching
  if (item.id && PROTECTED_SYSTEM_APP_IDS.has(item.id)) return true;

  // Check system folder IDs
  if (item.id === 'c_system' || item.id === 'c_apps' || item.id === 'sys_kernel' || item.id === 'sys_dll') return true;
  if (item.id === 'sc_computer' || item.id === 'sc_recycle_bin' || item.id === 'sc_documents') return true;

  // Check if name ends with .app and matches protected system app names
  if (item.name) {
    const cleanName = item.name.trim();
    const withoutExt = cleanName.endsWith('.app') ? cleanName.slice(0, -4) : cleanName;
    if (PROTECTED_SYSTEM_APP_NAMES.has(cleanName) || PROTECTED_SYSTEM_APP_NAMES.has(withoutExt)) {
      // If it's a user-created shortcut node (not marked as system item), it is not protected
      if (item.type === 'shortcut' && !item.isSystemItem && !item.isProtected) {
        return false;
      }
      return true;
    }
  }

  // Check installation path
  if (item.path) {
    if (item.path.includes('/c_apps/') || item.path.includes('/Applications/System Apps/') || item.path.includes('/c_system/')) {
      return true;
    }
  }

  return false;
}

export function getSystemAppEntry(appIdOrName: string): SystemAppEntry | undefined {
  if (!appIdOrName) return undefined;
  const key = appIdOrName.toLowerCase().replace(/\.app$/, '');
  if (key in SYSTEM_APP_REGISTRY) {
    return SYSTEM_APP_REGISTRY[key as AppId];
  }
  return Object.values(SYSTEM_APP_REGISTRY).find(
    (app) => app.name.toLowerCase() === key || app.id.toLowerCase() === key
  );
}

export function getAllSystemApps(): SystemAppEntry[] {
  return Object.values(SYSTEM_APP_REGISTRY);
}
