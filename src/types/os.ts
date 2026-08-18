import type { CSSProperties, ReactNode } from 'react';

export type AppId = 
  | 'files' 
  | 'computer'
  | 'browser' 
  | 'settings' 
  | 'terminal' 
  | 'agent' 
  | 'photos' 
  | 'music' 
  | 'calendar'
  | 'installer'
  | string;

export interface QuickAction {
  id: string;
  label: string;
  iconName?: string;
  payload?: any;
}

export interface AppMetadata {
  id: AppId;
  name: string;
  icon: string;
  description: string;
  category: 'system' | 'productivity' | 'utilities' | 'media';
  pinned: boolean;
  running: boolean;
  badgeCount?: number;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  quickActions: QuickAction[];
}

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  initialState?: Record<string, any>;
}

export interface OSNotification {
  id: string;
  appId?: AppId;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'info' | 'warning' | 'error' | 'alert' | 'success';
  actionLabel?: string;
  actionPayload?: string;
}

export interface NewNotification {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'alert' | 'success';
  appId?: AppId;
  actionLabel?: string;
  actionPayload?: string;
}

export interface QuickSettingsState {
  wifi: boolean;
  bluetooth: boolean;
  darkMode: boolean;
  airplaneMode: boolean;
  batterySaver: boolean;
  focusMode: boolean;
  hotspot: boolean;
  nightLight: boolean;
  brightness: number; // 0 - 100
  volume: number; // 0 - 100
  volumeMuted?: boolean;
  batteryPercentage: number;
}

export interface Wallpaper {
  id: string;
  name: string;
  style: CSSProperties;
}

export interface SystemAgentMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionTaken?: string;
  status?: 'success' | 'info' | 'warning';
}

export interface DesktopShortcut {
  id: string;
  name: string;
  type: 'computer' | 'documents' | 'recycle_bin' | 'app';
  icon: string;
  appId?: AppId;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetAppId?: AppId;
  targetItems?: any[];
  onRenameRequested?: (itemId: string) => void;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDanger?: boolean;
}

export type DialogIconType = 'error' | 'warning' | 'info' | 'success' | 'question' | 'file' | 'installer';

export interface SystemDialogButton {
  label: string;
  variant?: 'primary' | 'secondary' | 'destructive';
  onClick?: () => void;
  autoFocus?: boolean;
}

export interface SystemDialogOptions {
  id?: string;
  title: string;
  message: string;
  description?: ReactNode;
  iconType?: DialogIconType;
  customIcon?: ReactNode;
  details?: string;
  buttons?: SystemDialogButton[];
  onClose?: () => void;
}

export interface SystemDialogState extends SystemDialogOptions {
  isOpen: boolean;
}

export interface VirtualFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  updatedAt: string;
  content?: string;
  icon?: string;
  isSystem?: boolean;
  children?: VirtualFile[];
}
