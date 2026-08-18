export type RuntimeMode = 'live' | 'installed' | 'browser-development' | 'installer';
export type PowerAction = 'shutdown' | 'restart' | 'logout' | 'sleep';

export interface UserAccount {
  username: string;
  uid: number;
  gid: number;
  fullName: string;
  email: string;
  homeDir: string;
  shell: string;
  avatarUrl: string;
  isAdmin: boolean;
  userType: 'administrator' | 'standard';
  lastLogin?: string;
  isCurrentSession: boolean;
  hasPassword?: boolean;
  isLiveUser?: boolean;
  isTemporary?: boolean;
  runtimeMode?: RuntimeMode;
}

export type SessionStatus = 'logged_in' | 'locked' | 'login_screen';

export interface SessionInfo {
  status: SessionStatus;
  currentUser: UserAccount | null;
  availableUsers: UserAccount[];
  autoLockMinutes: number;
}

export interface DeviceIdentity {
  hostname: string;
  deviceName: string;
  kernelVersion: string;
  architecture: string;
  osName: string;
}

export interface LocaleOption {
  code: string;
  name: string;
}

export interface KeyboardOption {
  layout: string;
  name: string;
}

export interface LocaleSettings {
  timezone: string;
  locale: string;
  keyboardLayout: string;
  availableTimezones: string[];
  availableLocales: LocaleOption[];
  availableKeyboards: KeyboardOption[];
}

export interface UserPreferences {
  wallpaper: string;
  darkMode: boolean;
  accentColor: string;
  desktopIconSize: number;
  dockPosition: 'bottom' | 'top' | 'left' | 'right';
  clockFormat: '12h' | '24h';
  autoLockMinutes: number;
  lockWallpaper: string;
  timezone?: string;
  locale?: string;
  keyboardLayout?: string;
}
