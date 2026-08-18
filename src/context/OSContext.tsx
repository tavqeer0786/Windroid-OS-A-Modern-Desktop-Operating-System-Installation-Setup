import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { 
  AppId, AppMetadata, WindowState, OSNotification, NewNotification, QuickSettingsState, 
  Wallpaper, SystemAgentMessage, ContextMenuState, ConfirmModalState, QuickAction,
  SystemDialogOptions, SystemDialogState
} from '../types/os';
import {
  UserAccount, SessionStatus, DeviceIdentity, LocaleSettings, UserPreferences, RuntimeMode
} from '../types/user-session';
import { RadioCapabilities, DEFAULT_RADIO_CAPABILITIES } from '../types/radio';
import {
  SystemCapabilities,
  DisplayInfo,
  AudioStatus,
  PowerStatus,
  DEFAULT_SYSTEM_CAPABILITIES
} from '../types/hardware';
import { WindroidSystemBridge } from '../services/WindroidSystemBridge';
import { getSystemBackend } from '../services/SystemBackend';
import { StartupResolver } from '../services/StartupResolver';
import { INITIAL_APPS, INITIAL_NOTIFICATIONS, WALLPAPERS } from '../data/initialData';
import { getSavedWallpaperId, saveWallpaperId, getWallpaperById } from '../data/wallpapers';
import { InstalledAppRegistry } from '../system/apps/InstalledAppRegistry';
import { SYSTEM_APP_REGISTRY } from '../services/SystemAppRegistry';

export const DOCK_STORAGE_KEY = 'windroid.os.dock.v1';
export const LEGACY_DOCK_STORAGE_KEY = 'aether.os.dock.v1';

interface OSContextType {
  apps: AppMetadata[];
  pinnedAppIds: string[];
  windows: WindowState[];
  activeWindowId: string | null;
  quickSettings: QuickSettingsState;
  radioCapabilities: RadioCapabilities;
  systemCapabilities: SystemCapabilities;
  powerStatus: PowerStatus | null;
  audioStatus: AudioStatus | null;
  displayInfo: DisplayInfo | null;
  notifications: OSNotification[];
  wallpaper: Wallpaper;
  agentMessages: SystemAgentMessage[];
  
  // Dock Management
  pinApp: (appId: AppId) => void;
  unpinApp: (appId: AppId) => void;
  moveDockApp: (appId: AppId, direction: 'left' | 'right') => void;
  reorderDockApps: (newPinnedIds: string[]) => void;
  closeApp: (appId: AppId) => void;

  // Panel visibilities
  isQuickSettingsOpen: boolean;
  isNotificationsOpen: boolean;
  isSystemAgentOpen: boolean;
  isAppLauncherOpen: boolean;
  isUniversalSearchOpen: boolean;
  quickPanelAppId: AppId | null;
  contextMenu: ContextMenuState;
  confirmModal: ConfirmModalState;
  systemDialogState: SystemDialogState | null;
  developerMode: boolean;

  // Window Management
  openApp: (appId: AppId, initialState?: Record<string, any>) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, x: number, y: number) => void;
  updateWindowSize: (windowId: string, width: number, height: number) => void;

  // UI Panel Toggles
  toggleQuickSettings: () => void;
  toggleNotifications: () => void;
  toggleSystemAgent: () => void;
  toggleAppLauncher: () => void;
  openAppLauncher: () => void;
  toggleUniversalSearch: () => void;
  setQuickPanelAppId: (appId: AppId | null) => void;
  closeAllPanels: () => void;

  // Settings & System Actions
  updateQuickSettings: (partial: Partial<QuickSettingsState>) => void;
  toggleWifi: (targetEnabled: boolean) => Promise<boolean>;
  toggleBluetooth: (targetPowered: boolean) => Promise<boolean>;
  toggleHotspot: (targetActive: boolean) => Promise<boolean>;
  toggleAirplaneMode: (targetEnabled: boolean) => Promise<boolean>;
  refreshRadioCapabilities: () => Promise<RadioCapabilities>;
  refreshHardwareState: () => Promise<void>;
  setDisplayBrightness: (val: number) => Promise<void>;
  setAudioVolume: (val: number, isMuted?: boolean) => Promise<void>;
  toggleAudioMute: () => Promise<void>;
  setNightLight: (active: boolean) => Promise<void>;
  setBatterySaver: (enabled: boolean) => Promise<void>;

  addNotification: (notification: NewNotification) => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setWallpaper: (wallpaperId: string) => void;
  toggleDeveloperMode: () => void;

  // System Agent
  sendAgentMessage: (text: string) => void;
  executeAgentAction: (commandText: string) => void;

  // App Lookup
  getAppMetadata: (appId: string) => AppMetadata;
  getAllApps: () => AppMetadata[];

  // Context Menu & Dialogs
  openContextMenu: (
    x: number,
    y: number,
    targetAppId?: AppId,
    targetItems?: any[],
    onRenameRequested?: (itemId: string) => void
  ) => void;
  closeContextMenu: () => void;
  requestConfirm: (options: Omit<ConfirmModalState, 'isOpen'>) => void;
  closeConfirm: () => void;
  showSystemDialog: (options: SystemDialogOptions) => void;
  dismissSystemDialog: (id?: string) => void;

  // User Identity, Session & Personalization
  runtimeMode: RuntimeMode;
  setRuntimeMode: (mode: RuntimeMode) => void;
  isResolvingRuntimeMode: boolean;
  sessionStatus: SessionStatus;
  currentUser: UserAccount | null;
  userAccounts: UserAccount[];
  deviceIdentity: DeviceIdentity;
  localeSettings: LocaleSettings;
  userPreferences: UserPreferences;

  lockSession: () => Promise<void>;
  unlockSession: (password?: string) => Promise<{ success: boolean; error?: string }>;
  logoutSession: () => Promise<void>;
  switchUser: (username: string) => Promise<void>;
  refreshUserAccounts: () => Promise<void>;
  createUserAccount: (data: { username: string; fullName?: string; password?: string; isAdmin?: boolean }) => Promise<{ success: boolean; error?: string }>;
  updateUserAccount: (data: { username: string; fullName?: string; isAdmin?: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (username: string) => Promise<{ success: boolean; error?: string }>;
  updateDeviceHostname: (hostname: string) => Promise<{ success: boolean; error?: string }>;
  updateTimezone: (timezone: string) => Promise<{ success: boolean; error?: string }>;
  updateLocale: (locale: string) => Promise<{ success: boolean; error?: string }>;
  updateKeyboardLayout: (layout: string) => Promise<{ success: boolean; error?: string }>;
  updateUserPreferences: (partial: Partial<UserPreferences>) => Promise<void>;
}

const OSContext = createContext<OSContextType | undefined>(undefined);

const DEFAULT_QUICK_SETTINGS: QuickSettingsState = {
  wifi: false,
  bluetooth: false,
  darkMode: false,
  airplaneMode: false,
  batterySaver: false,
  focusMode: false,
  hotspot: false,
  nightLight: false,
  brightness: 80,
  volume: 75,
  batteryPercentage: 92
};

const getInitialPinnedAppIds = (): string[] => {
  try {
    const saved = localStorage.getItem(DOCK_STORAGE_KEY) || localStorage.getItem(LEGACY_DOCK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const arr = parsed as unknown[];
        const valid = arr.filter(
          (id, idx) =>
            typeof id === 'string' &&
            arr.indexOf(id) === idx &&
            (INITIAL_APPS.some((a) => a.id === id) ||
              SYSTEM_APP_REGISTRY[id as AppId] ||
              InstalledAppRegistry.getInstance().getById(id as string))
        ) as string[];
        return valid;
      }
    }
  } catch (e) {
    console.error('Failed to load dock state from storage:', e);
  }

  const defaultPinned = INITIAL_APPS.filter((a) => a.pinned).map((a) => a.id);
  try {
    localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(defaultPinned));
  } catch (e) {}
  return defaultPinned;
};

export const OSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pinnedAppIds, setPinnedAppIds] = useState<string[]>(getInitialPinnedAppIds);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(10);

  const [quickSettings, setQuickSettings] = useState<QuickSettingsState>(DEFAULT_QUICK_SETTINGS);
  const [radioCapabilities, setRadioCapabilities] = useState<RadioCapabilities>(DEFAULT_RADIO_CAPABILITIES);
  const [systemCapabilities, setSystemCapabilities] = useState<SystemCapabilities>(DEFAULT_SYSTEM_CAPABILITIES);
  const [powerStatus, setPowerStatus] = useState<PowerStatus | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus | null>(null);
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null);
  const [notifications, setNotifications] = useState<OSNotification[]>(INITIAL_NOTIFICATIONS);

  // User Identity & Session State
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('browser-development');
  const [isResolvingRuntimeMode, setIsResolvingRuntimeMode] = useState<boolean>(true);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('logged_in');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [deviceIdentity, setDeviceIdentity] = useState<DeviceIdentity>({
    hostname: 'windroid-pc',
    deviceName: 'windroid-pc',
    kernelVersion: '6.1.0-28-amd64',
    architecture: 'x86_64',
    osName: 'Windroid OS 1.0.0 (Debian 12)'
  });
  const [localeSettings, setLocaleSettings] = useState<LocaleSettings>({
    timezone: 'America/New_York',
    locale: 'en_US.UTF-8',
    keyboardLayout: 'us',
    availableTimezones: ['America/New_York', 'UTC'],
    availableLocales: [{ code: 'en_US.UTF-8', name: 'English (United States)' }],
    availableKeyboards: [{ layout: 'us', name: 'English (US)' }]
  });
  const [userPreferences, setUserPreferencesState] = useState<UserPreferences>({
    wallpaper: getSavedWallpaperId(),
    darkMode: true,
    accentColor: '#0067C0',
    desktopIconSize: 48,
    dockPosition: 'bottom',
    clockFormat: '12h',
    autoLockMinutes: 0,
    lockWallpaper: getSavedWallpaperId()
  });

  const refreshUserAccounts = useCallback(async () => {
    try {
      const bridge = WindroidSystemBridge.getInstance();
      const accounts = await bridge.getUserAccounts();
      setUserAccounts(accounts);
      const nonSystem = accounts.filter((a) => a.username !== 'root' && a.username !== 'windroid-oobe');
      const active = accounts.find((a) => a.isCurrentSession && a.username !== 'root' && a.username !== 'windroid-oobe')
        || nonSystem.find((a) => a.isCurrentSession)
        || nonSystem[0]
        || accounts.find((a) => a.isCurrentSession)
        || accounts[0]
        || null;
      setCurrentUser(active);
    } catch (err) {
      console.warn('[OSContext] Failed to refresh user accounts:', err);
    }
  }, []);

  const refreshDeviceIdentity = useCallback(async () => {
    try {
      const bridge = WindroidSystemBridge.getInstance();
      const id = await bridge.getDeviceIdentity();
      setDeviceIdentity(id);
    } catch (err) {
      console.warn('[OSContext] Failed to refresh device identity:', err);
    }
  }, []);

  const refreshLocaleSettings = useCallback(async () => {
    try {
      const bridge = WindroidSystemBridge.getInstance();
      const loc = await bridge.getLocaleSettings();
      setLocaleSettings(loc);
    } catch (err) {
      console.warn('[OSContext] Failed to refresh locale settings:', err);
    }
  }, []);

  const refreshUserPreferences = useCallback(async () => {
    try {
      const bridge = WindroidSystemBridge.getInstance();
      const prefs = await bridge.getUserPreferences();
      setUserPreferencesState(prefs);
      if (prefs.darkMode !== undefined) {
        setQuickSettings((prev) => ({ ...prev, darkMode: prefs.darkMode }));
      }
    } catch (err) {
      console.warn('[OSContext] Failed to refresh user preferences:', err);
    }
  }, []);

  useEffect(() => {
    StartupResolver.resolveStartupRoute()
      .then((route) => {
        setRuntimeMode(route.runtimeMode);
        setIsResolvingRuntimeMode(false);
      })
      .catch(() => {
        setIsResolvingRuntimeMode(false);
      });
    refreshUserAccounts();
    refreshDeviceIdentity();
    refreshLocaleSettings();
    refreshUserPreferences();
  }, [refreshUserAccounts, refreshDeviceIdentity, refreshLocaleSettings, refreshUserPreferences]);

  const lockSession = useCallback(async () => {
    const bridge = WindroidSystemBridge.getInstance();
    await bridge.lockSession();
    setSessionStatus('locked');
  }, []);

  const unlockSession = useCallback(async (password?: string): Promise<{ success: boolean; error?: string }> => {
    const bridge = WindroidSystemBridge.getInstance();
    const username = currentUser?.username || 'user';
    const res = await bridge.unlockSession(username, password);
    if (res.authenticated) {
      setSessionStatus('logged_in');
      return { success: true };
    }
    return { success: false, error: res.error || 'Incorrect password' };
  }, [currentUser]);

  const logoutSession = useCallback(async () => {
    const bridge = WindroidSystemBridge.getInstance();
    await bridge.logoutSession();
    setSessionStatus('login_screen');
  }, []);

  const switchUser = useCallback(async (username: string) => {
    const target = userAccounts.find((u) => u.username === username);
    if (target) {
      setCurrentUser(target);
      setSessionStatus('login_screen');
    }
  }, [userAccounts]);

  const createUserAccount = useCallback(async (data: { username: string; fullName?: string; password?: string; isAdmin?: boolean }) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.createUser(data);
    if (res.success) {
      await refreshUserAccounts();
    }
    return res;
  }, [refreshUserAccounts]);

  const updateUserAccount = useCallback(async (data: { username: string; fullName?: string; isAdmin?: boolean }) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.updateUser(data);
    if (res.success) {
      await refreshUserAccounts();
    }
    return res;
  }, [refreshUserAccounts]);

  const deleteUserAccount = useCallback(async (username: string) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.deleteUser(username);
    if (res.success) {
      await refreshUserAccounts();
    }
    return res;
  }, [refreshUserAccounts]);

  const updateDeviceHostname = useCallback(async (hostname: string) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setDeviceHostname(hostname);
    if (res.success) {
      setDeviceIdentity((prev) => ({ ...prev, hostname, deviceName: hostname }));
    }
    return res;
  }, []);

  const updateTimezone = useCallback(async (timezone: string) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setTimezone(timezone);
    if (res.success) {
      setLocaleSettings((prev) => ({ ...prev, timezone }));
    }
    return res;
  }, []);

  const updateLocale = useCallback(async (locale: string) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setLocale(locale);
    if (res.success) {
      setLocaleSettings((prev) => ({ ...prev, locale }));
    }
    return res;
  }, []);

  const updateKeyboardLayout = useCallback(async (layout: string) => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setKeyboardLayout(layout);
    if (res.success) {
      setLocaleSettings((prev) => ({ ...prev, keyboardLayout: layout }));
    }
    return res;
  }, []);

  const updateUserPreferences = useCallback(async (partial: Partial<UserPreferences>) => {
    const bridge = WindroidSystemBridge.getInstance();
    await bridge.setUserPreferences(partial);
    setUserPreferencesState((prev) => ({ ...prev, ...partial }));
    if (partial.darkMode !== undefined) {
      setQuickSettings((prev) => ({ ...prev, darkMode: partial.darkMode! }));
    }
  }, []);

  const refreshHardwareState = useCallback(async () => {
    try {
      const bridge = WindroidSystemBridge.getInstance();
      const [caps, power, audio, display] = await Promise.all([
        bridge.getCapabilities().catch(() => DEFAULT_SYSTEM_CAPABILITIES),
        bridge.getPowerStatus().catch(() => null),
        bridge.getAudioStatus().catch(() => null),
        bridge.getDisplayInfo().catch(() => null)
      ]);

      setSystemCapabilities(caps);
      setPowerStatus(power);
      setAudioStatus(audio);
      setDisplayInfo(display);

      if (bridge.isNative()) {
        setQuickSettings((prev) => ({
          ...prev,
          volume: audio?.masterVolume ?? prev.volume,
          volumeMuted: audio?.isMuted ?? prev.volumeMuted,
          brightness: display?.brightness ?? prev.brightness,
          nightLight: display?.nightLightActive ?? prev.nightLight,
          batterySaver: power?.batterySaverActive ?? prev.batterySaver
        }));
      } else {
        // In browser mode, preserve user's slider positions and sync night light / battery saver
        setQuickSettings((prev) => ({
          ...prev,
          nightLight: display?.nightLightActive ?? prev.nightLight,
          batterySaver: power?.batterySaverActive ?? prev.batterySaver
        }));
      }
    } catch (err) {
      console.warn('[OSContext] Failed to refresh hardware state:', err);
    }
  }, []);

  const brightnessDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const volumeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const setDisplayBrightness = useCallback(async (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setQuickSettings((prev) => ({ ...prev, brightness: clamped }));

    if (brightnessDebounceRef.current) {
      clearTimeout(brightnessDebounceRef.current);
    }
    brightnessDebounceRef.current = setTimeout(async () => {
      try {
        const backend = getSystemBackend();
        await backend.setDisplayBrightness(clamped);
      } catch (err) {
        console.warn('[OSContext] Failed to set brightness:', err);
      }
    }, 40);
  }, []);

  const setAudioVolume = useCallback(async (val: number, isMuted?: boolean) => {
    const clamped = Math.max(0, Math.min(100, val));
    setQuickSettings((prev) => ({
      ...prev,
      volume: clamped,
      volumeMuted: isMuted !== undefined ? isMuted : (clamped === 0 ? true : prev.volumeMuted)
    }));

    if (volumeDebounceRef.current) {
      clearTimeout(volumeDebounceRef.current);
    }
    volumeDebounceRef.current = setTimeout(async () => {
      try {
        const backend = getSystemBackend();
        await backend.setAudioVolume(clamped, isMuted);
      } catch (err) {
        console.warn('[OSContext] Failed to set audio volume:', err);
      }
    }, 40);
  }, []);

  const toggleAudioMute = useCallback(async () => {
    setQuickSettings((prev) => {
      const nextMuted = !prev.volumeMuted;
      const targetVol = prev.volume;
      const backend = getSystemBackend();
      backend.setAudioVolume(targetVol, nextMuted).catch((err) => {
        console.warn('[OSContext] Failed to toggle mute:', err);
      });
      return { ...prev, volumeMuted: nextMuted };
    });
  }, []);

  const setNightLight = useCallback(async (active: boolean) => {
    setQuickSettings((prev) => ({ ...prev, nightLight: active }));
    const bridge = WindroidSystemBridge.getInstance();
    await bridge.setDisplayNightLight(active);
  }, []);

  const setBatterySaver = useCallback(async (enabled: boolean) => {
    setQuickSettings((prev) => ({ ...prev, batterySaver: enabled }));
    const bridge = WindroidSystemBridge.getInstance();
    await bridge.setBatterySaver(enabled);
  }, []);

  const refreshRadioCapabilities = useCallback(async (): Promise<RadioCapabilities> => {
    try {
      const bridge = WindroidSystemBridge.getInstance();
      const [wifiRes, btRes, hotspotRes, netRes] = await Promise.all([
        bridge.getWifiNetworks().catch(() => null),
        bridge.getBluetoothStatus().catch(() => null),
        bridge.getHotspotCapabilities().catch(() => null),
        bridge.getNetworkStatus().catch(() => null)
      ]);

      const wifiPresent = wifiRes?.hasAdapter ?? false;
      const wifiBlocked = wifiRes?.hardwareBlocked ?? false;
      const wifiEnabled = wifiPresent && !wifiBlocked && (wifiRes?.wifiEnabled ?? false);

      const btPresent = btRes?.hasAdapter ?? false;
      const btBluez = btRes?.errorCode !== 'BLUEZ_UNAVAILABLE';
      const btBlocked = btRes?.hardwareBlocked ?? false;
      const btEnabled = btPresent && btBluez && !btBlocked && (btRes?.powered ?? false);

      const hotspotSup = hotspotRes?.supported ?? false;
      const hotspotAvail = hotspotSup && wifiPresent && !wifiBlocked;
      const hotspotAct = hotspotAvail && (hotspotRes?.active ?? false);

      const caps: RadioCapabilities = {
        networkManagerAvailable: netRes?.available ?? false,

        wifiAdapterPresent: wifiPresent,
        wifiSupported: wifiPresent,
        wifiHardwareBlocked: wifiBlocked,
        wifiSoftwareBlocked: wifiRes?.softwareBlocked ?? false,
        wifiEnabled,

        bluetoothAdapterPresent: btPresent,
        bluezAvailable: btBluez,
        bluetoothSupported: btPresent,
        bluetoothHardwareBlocked: btBlocked,
        bluetoothSoftwareBlocked: btRes?.softwareBlocked ?? false,
        bluetoothEnabled: btEnabled,

        hotspotSupported: hotspotSup,
        hotspotAvailable: hotspotAvail,
        hotspotActive: hotspotAct,

        loading: false,
        lastUpdatedAt: Date.now()
      };

      setRadioCapabilities(caps);

      // Keep quickSettings strictly synchronized with real hardware capabilities
      setQuickSettings((prev) => ({
        ...prev,
        wifi: caps.wifiEnabled,
        bluetooth: caps.bluetoothEnabled,
        hotspot: caps.hotspotActive,
        airplaneMode: netRes?.airplaneMode ?? false
      }));

      return caps;
    } catch (err) {
      console.warn('[OSContext] Failed to refresh radio capabilities:', err);
      setRadioCapabilities((prev) => ({ ...prev, loading: false }));
      return DEFAULT_RADIO_CAPABILITIES;
    }
  }, []);

  useEffect(() => {
    refreshRadioCapabilities();
    refreshHardwareState();
    const interval = setInterval(() => {
      refreshRadioCapabilities();
      refreshHardwareState();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshRadioCapabilities, refreshHardwareState]);

  // Hardware Effect: Smart Brightness & Night Light Warmth Integration
  useEffect(() => {
    const brightnessVal = quickSettings.brightness;
    const isNightLight = quickSettings.nightLight || brightnessVal < 15;

    // Perceptual logarithmic brightness mapping with zero-blackout safety floor
    // Ensures setting slider to 0% never dims screen to complete blackout
    const minSafetyFloor = 0.88; // 88% minimum brightness factor floor
    const range = 1.0 - minSafetyFloor;
    const perceptualFactor = minSafetyFloor + (Math.pow(brightnessVal / 100, 2) * range);

    // Night Light Color Temperature Adjustment (6500K Daylight down to 4500K Warmth)
    const filters: string[] = [`brightness(${perceptualFactor.toFixed(3)})`];
    if (isNightLight) {
      filters.push('sepia(0.22) hue-rotate(-10deg) saturate(1.1)');
    }

    document.documentElement.style.filter = filters.join(' ');
    return () => {
      document.documentElement.style.filter = '';
    };
  }, [quickSettings.brightness, quickSettings.nightLight]);

  // Hardware Effect: Master Audio Volume
  useEffect(() => {
    const vol = quickSettings.volumeMuted ? 0 : quickSettings.volume / 100;
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach((el) => {
      (el as HTMLMediaElement).volume = vol;
    });
  }, [quickSettings.volume, quickSettings.volumeMuted]);
  const [wallpaper, setWallpaperState] = useState<Wallpaper>(() => {
    const savedId = getSavedWallpaperId();
    return getWallpaperById(savedId);
  });
  const [developerMode, setDeveloperMode] = useState(false);

  // Panel state
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSystemAgentOpen, setIsSystemAgentOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [quickPanelAppId, setQuickPanelAppId] = useState<AppId | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0 });
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {}
  });
  const [systemDialogState, setSystemDialogState] = useState<SystemDialogState | null>(null);

  const [agentMessages, setAgentMessages] = useState<SystemAgentMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      text: 'Hello! I am your Windroid System Agent. How can I assist you with your desktop today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'info'
    }
  ]);

  // Dock persistence helpers
  const savePinnedAppIds = (ids: string[]) => {
    setPinnedAppIds(ids);
    try {
      localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save dock state to storage:', e);
    }
  };

  const pinApp = (appId: AppId) => {
    if (pinnedAppIds.includes(appId)) return;
    const next = [...pinnedAppIds, appId];
    savePinnedAppIds(next);
  };

  const unpinApp = (appId: AppId) => {
    if (!pinnedAppIds.includes(appId)) return;
    const next = pinnedAppIds.filter((id) => id !== appId);
    savePinnedAppIds(next);
  };

  const moveDockApp = (appId: AppId, direction: 'left' | 'right') => {
    const index = pinnedAppIds.indexOf(appId);
    if (index === -1) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pinnedAppIds.length) return;

    const next = [...pinnedAppIds];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed);
    savePinnedAppIds(next);
  };

  const reorderDockApps = (newPinnedIds: string[]) => {
    const unique = Array.from(new Set(newPinnedIds));
    savePinnedAppIds(unique);
  };

  const closeApp = (appId: AppId) => {
    setWindows((prev) => prev.filter((w) => w.appId !== appId));
    if (activeWindowId) {
      const activeWin = windows.find((w) => w.id === activeWindowId);
      if (activeWin && activeWin.appId === appId) {
        setActiveWindowId(null);
      }
    }
  };

  const getAppMetadata = (appId: string): AppMetadata => {
    const initial = INITIAL_APPS.find((a) => a.id === appId);
    if (initial) return initial;

    const sys = SYSTEM_APP_REGISTRY[appId as AppId];
    if (sys) {
      return {
        id: sys.id,
        name: sys.name,
        icon: sys.icon,
        description: sys.name,
        category: 'system',
        pinned: false,
        running: false,
        defaultWidth: 720,
        defaultHeight: 520,
        minWidth: 500,
        minHeight: 380,
        quickActions: []
      };
    }

    const installed = InstalledAppRegistry.getInstance().getById(appId);
    if (installed) {
      return {
        id: installed.id,
        name: installed.name,
        icon: installed.icon || (installed.runtime === 'windows' ? 'Monitor' : installed.runtime === 'android' ? 'Smartphone' : 'Terminal'),
        description: installed.description,
        category: 'productivity',
        pinned: false,
        running: false,
        defaultWidth: 720,
        defaultHeight: 520,
        minWidth: 500,
        minHeight: 380,
        quickActions: []
      };
    }

    return {
      id: appId,
      name: appId,
      icon: 'HelpCircle',
      description: appId,
      category: 'utilities',
      pinned: false,
      running: false,
      defaultWidth: 720,
      defaultHeight: 520,
      minWidth: 500,
      minHeight: 380,
      quickActions: []
    };
  };

  const getAllApps = (): AppMetadata[] => {
    const builtIn = INITIAL_APPS;
    const installed = InstalledAppRegistry.getInstance().getAll().map((ia) => ({
      id: ia.id,
      name: ia.name,
      icon: ia.icon || (ia.runtime === 'windows' ? 'Monitor' : ia.runtime === 'android' ? 'Smartphone' : 'Terminal'),
      description: ia.description || `${ia.publisher} (${ia.runtime} app)`,
      category: 'utilities' as const,
      pinned: false,
      running: false,
      defaultWidth: 720,
      defaultHeight: 520,
      minWidth: 500,
      minHeight: 380,
      quickActions: []
    }));

    const map = new Map<string, AppMetadata>();
    builtIn.forEach((a) => map.set(a.id, a));
    installed.forEach((a) => {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    });
    if (runtimeMode === 'installed') {
      map.delete('install-windroid');
    }
    return Array.from(map.values());
  };

  // Derived active Dock apps list
  const apps = useMemo(() => {
    const runningAppIds: string[] = Array.from(new Set(windows.map((w) => w.appId as string)));
    const list: AppMetadata[] = [];

    // Pinned apps in exact order
    pinnedAppIds.forEach((id) => {
      const meta = getAppMetadata(id);
      list.push({
        ...meta,
        pinned: true,
        running: runningAppIds.includes(id)
      });
    });

    // Running unpinned apps appended after pinned apps
    runningAppIds.forEach((id) => {
      if (!pinnedAppIds.includes(id)) {
        const meta = getAppMetadata(id);
        list.push({
          ...meta,
          pinned: false,
          running: true
        });
      }
    });

    return list;
  }, [pinnedAppIds, windows]);

  // Sync Dark Mode state to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', quickSettings.darkMode ? 'dark' : 'light');
  }, [quickSettings.darkMode]);

  // Keyboard shortcut listener (Super key, Ctrl+Space, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Space -> Universal Search
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setIsUniversalSearchOpen((prev) => !prev);
        setIsAppLauncherOpen(false);
        setIsQuickSettingsOpen(false);
        setIsNotificationsOpen(false);
        setIsSystemAgentOpen(false);
        setQuickPanelAppId(null);
        setContextMenu({ isOpen: false, x: 0, y: 0 });
      }
      // Meta/Super key -> App Launcher
      else if (e.key === 'Meta' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        setIsAppLauncherOpen((prev) => !prev);
        setIsUniversalSearchOpen(false);
        setIsQuickSettingsOpen(false);
        setIsNotificationsOpen(false);
        setIsSystemAgentOpen(false);
        setQuickPanelAppId(null);
        setContextMenu({ isOpen: false, x: 0, y: 0 });
      }
      // Escape -> close active panels
      else if (e.key === 'Escape') {
        closeAllPanels();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeAllPanels = () => {
    setIsQuickSettingsOpen(false);
    setIsNotificationsOpen(false);
    setIsSystemAgentOpen(false);
    setIsAppLauncherOpen(false);
    setIsUniversalSearchOpen(false);
    setQuickPanelAppId(null);
    setContextMenu({ isOpen: false, x: 0, y: 0 });
    window.dispatchEvent(new CustomEvent('windroid-clear-launch-overlay'));
    window.dispatchEvent(new CustomEvent('aether-clear-launch-overlay'));
    window.dispatchEvent(new CustomEvent('windroid-cancel-desktop-drag'));
    window.dispatchEvent(new CustomEvent('aether-cancel-desktop-drag'));
  };

  // Open App
  const openApp = (appId: AppId, initialState?: Record<string, any>) => {
    closeAllPanels();

    const appMeta = getAppMetadata(appId);
    if (!appMeta) return;

    // Check if a window for this app already exists
    const existingWindow = windows.find((w) => w.appId === appId);

    if (existingWindow) {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === existingWindow.id
            ? { ...w, isMinimized: false, zIndex: nextZIndex, initialState: initialState ?? w.initialState }
            : w
        )
      );
      setActiveWindowId(existingWindow.id);
      setNextZIndex((z) => z + 1);
    } else {
      // Calculate responsive default position with cascade offset
      const offset = (windows.length % 5) * 28;
      const windowWidth = Math.min(appMeta.defaultWidth, window.innerWidth - 60);
      const windowHeight = Math.min(appMeta.defaultHeight, window.innerHeight - 120);

      const x = Math.max(20, Math.min((window.innerWidth - windowWidth) / 2 + offset, window.innerWidth - windowWidth - 20));
      const y = Math.max(50, Math.min((window.innerHeight - windowHeight) / 2 + offset, window.innerHeight - windowHeight - 40));

      const newWindow: WindowState = {
        id: `${appId}_${Date.now()}`,
        appId,
        title: appMeta.name,
        icon: appMeta.icon,
        x,
        y,
        width: windowWidth,
        height: windowHeight,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZIndex,
        initialState
      };

      setWindows((prev) => [...prev, newWindow]);
      setActiveWindowId(newWindow.id);
      setNextZIndex((z) => z + 1);
    }
  };

  const closeWindow = (windowId: string) => {
    const targetWin = windows.find((w) => w.id === windowId);
    if (!targetWin) return;

    const remainingWindows = windows.filter((w) => w.id !== windowId);
    setWindows(remainingWindows);

    if (activeWindowId === windowId) {
      const topWin = remainingWindows.reduce<WindowState | null>(
        (highest, curr) => (!highest || curr.zIndex > highest.zIndex ? curr : highest),
        null
      );
      setActiveWindowId(topWin ? topWin.id : null);
    }
  };

  const minimizeWindow = (windowId: string) => {
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, isMinimized: true } : w)));
    if (activeWindowId === windowId) {
      const visibleWindows = windows.filter((w) => w.id !== windowId && !w.isMinimized);
      const topWin = visibleWindows.reduce<WindowState | null>(
        (highest, curr) => (!highest || curr.zIndex > highest.zIndex ? curr : highest),
        null
      );
      setActiveWindowId(topWin ? topWin.id : null);
    }
  };

  const maximizeWindow = (windowId: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, isMaximized: !w.isMaximized, zIndex: nextZIndex } : w))
    );
    setActiveWindowId(windowId);
    setNextZIndex((z) => z + 1);
  };

  const restoreWindow = (windowId: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, isMinimized: false, isMaximized: false, zIndex: nextZIndex } : w))
    );
    setActiveWindowId(windowId);
    setNextZIndex((z) => z + 1);
  };

  const focusWindow = (windowId: string) => {
    const win = windows.find((w) => w.id === windowId);
    if (!win) return;
    if (win.isMinimized) {
      setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, isMinimized: false, zIndex: nextZIndex } : w)));
    } else {
      setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, zIndex: nextZIndex } : w)));
    }
    setActiveWindowId(windowId);
    setNextZIndex((z) => z + 1);
  };

  const updateWindowPosition = (windowId: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, x, y } : w)));
  };

  const updateWindowSize = (windowId: string, width: number, height: number) => {
    setWindows((prev) => prev.map((w) => (w.id === windowId ? { ...w, width, height } : w)));
  };

  // Panel Toggles
  const toggleQuickSettings = () => {
    setIsQuickSettingsOpen((prev) => !prev);
    setIsNotificationsOpen(false);
    setIsSystemAgentOpen(false);
    setIsAppLauncherOpen(false);
    setIsUniversalSearchOpen(false);
    setQuickPanelAppId(null);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
    setIsQuickSettingsOpen(false);
    setIsSystemAgentOpen(false);
    setIsAppLauncherOpen(false);
    setIsUniversalSearchOpen(false);
    setQuickPanelAppId(null);
  };

  const toggleSystemAgent = () => {
    setIsSystemAgentOpen((prev) => !prev);
    setIsQuickSettingsOpen(false);
    setIsNotificationsOpen(false);
    setIsAppLauncherOpen(false);
    setIsUniversalSearchOpen(false);
    setQuickPanelAppId(null);
  };

  const openAppLauncher = () => {
    setIsAppLauncherOpen(true);
    setIsUniversalSearchOpen(false);
    setIsQuickSettingsOpen(false);
    setIsNotificationsOpen(false);
    setIsSystemAgentOpen(false);
    setQuickPanelAppId(null);
  };

  const toggleAppLauncher = () => {
    setIsAppLauncherOpen((prev) => !prev);
    setIsUniversalSearchOpen(false);
    setIsQuickSettingsOpen(false);
    setIsNotificationsOpen(false);
    setIsSystemAgentOpen(false);
    setQuickPanelAppId(null);
  };

  const toggleUniversalSearch = () => {
    setIsUniversalSearchOpen((prev) => !prev);
    setIsAppLauncherOpen(false);
    setIsQuickSettingsOpen(false);
    setIsNotificationsOpen(false);
    setIsSystemAgentOpen(false);
    setQuickPanelAppId(null);
  };

  const updateQuickSettings = useCallback((partial: Partial<QuickSettingsState>) => {
    setQuickSettings((prev) => ({ ...prev, ...partial }));
    if (partial.brightness !== undefined) {
      setDisplayBrightness(partial.brightness);
    }
    if (partial.volume !== undefined) {
      setAudioVolume(partial.volume);
    }
    if (partial.nightLight !== undefined) {
      setNightLight(partial.nightLight);
    }
    if (partial.batterySaver !== undefined) {
      setBatterySaver(partial.batterySaver);
    }
  }, [setDisplayBrightness, setAudioVolume, setNightLight, setBatterySaver]);

  const toggleWifi = async (targetEnabled: boolean): Promise<boolean> => {
    if (!radioCapabilities.wifiAdapterPresent || radioCapabilities.wifiHardwareBlocked) {
      addNotification({
        title: 'Wi-Fi Unavailable',
        message: !radioCapabilities.wifiAdapterPresent ? 'No Wi-Fi adapter detected on this system.' : 'Wi-Fi is disabled by a hardware switch.',
        type: 'warning'
      });
      return false;
    }
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setWifiEnabled(targetEnabled);
    if (res.success) {
      await refreshRadioCapabilities();
      return true;
    } else {
      addNotification({
        title: 'Wi-Fi Error',
        message: res.error || 'Failed to toggle Wi-Fi adapter.',
        type: 'error'
      });
      return false;
    }
  };

  const toggleBluetooth = async (targetPowered: boolean): Promise<boolean> => {
    if (!radioCapabilities.bluetoothAdapterPresent || radioCapabilities.bluetoothHardwareBlocked || !radioCapabilities.bluezAvailable) {
      addNotification({
        title: 'Bluetooth Unavailable',
        message: !radioCapabilities.bluetoothAdapterPresent ? 'No Bluetooth adapter detected on this system.' : !radioCapabilities.bluezAvailable ? 'Bluetooth service is unavailable.' : 'Bluetooth is disabled by a hardware switch.',
        type: 'warning'
      });
      return false;
    }
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setBluetoothPowered(targetPowered);
    if (res.success) {
      await refreshRadioCapabilities();
      return true;
    } else {
      addNotification({
        title: 'Bluetooth Error',
        message: res.error || 'Failed to toggle Bluetooth adapter.',
        type: 'error'
      });
      return false;
    }
  };

  const toggleHotspot = async (targetActive: boolean): Promise<boolean> => {
    if (!radioCapabilities.hotspotAvailable) {
      addNotification({
        title: 'Hotspot Unavailable',
        message: !radioCapabilities.wifiAdapterPresent ? 'No Wi-Fi adapter detected.' : !radioCapabilities.hotspotSupported ? 'Mobile hotspot is not supported by this adapter.' : 'Wi-Fi is hardware blocked.',
        type: 'warning'
      });
      return false;
    }
    const bridge = WindroidSystemBridge.getInstance();
    let res;
    if (targetActive) {
      res = await bridge.startHotspot();
    } else {
      res = await bridge.stopHotspot();
    }
    if (res.success) {
      await refreshRadioCapabilities();
      return true;
    } else {
      addNotification({
        title: 'Hotspot Error',
        message: res.error || 'Failed to toggle mobile hotspot.',
        type: 'error'
      });
      return false;
    }
  };

  const toggleAirplaneMode = async (targetEnabled: boolean): Promise<boolean> => {
    const bridge = WindroidSystemBridge.getInstance();
    const res = await bridge.setAirplaneMode(targetEnabled);
    if (res.success) {
      await refreshRadioCapabilities();
      return true;
    }
    return false;
  };

  const addNotification = (notification: NewNotification) => {
    const item: OSNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      appId: notification.appId,
      actionLabel: notification.actionLabel,
      actionPayload: notification.actionPayload,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setNotifications((prev) => [item, ...prev]);
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const setWallpaper = (wallpaperId: string) => {
    const found = WALLPAPERS.find((w) => w.id === wallpaperId);
    if (found) {
      setWallpaperState(found);
      saveWallpaperId(found.id);
    }
  };

  const toggleDeveloperMode = () => {
    setDeveloperMode((prev) => !prev);
  };

  // Context Menu
  const openContextMenu = (
    x: number,
    y: number,
    targetAppId?: AppId,
    targetItems?: any[],
    onRenameRequested?: (itemId: string) => void
  ) => {
    // Keep context menu inside screen viewport
    const menuWidth = 220;
    const menuHeight = targetItems && targetItems.length > 0 ? 360 : 280;
    const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
    const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);
    setContextMenu({ isOpen: true, x: adjustedX, y: adjustedY, targetAppId, targetItems, onRenameRequested });
  };

  const closeContextMenu = () => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  // Confirmation Modal
  const requestConfirm = (options: Omit<ConfirmModalState, 'isOpen'>) => {
    setConfirmModal({ ...options, isOpen: true });
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const showSystemDialog = useCallback((options: SystemDialogOptions) => {
    setSystemDialogState({
      ...options,
      isOpen: true
    });
  }, []);

  const dismissSystemDialog = useCallback((id?: string) => {
    setSystemDialogState((prev) => {
      if (!prev) return null;
      if (id && prev.id && prev.id !== id) return prev;
      return null;
    });
  }, []);

  // System Agent logic (Local prototype action processing)
  const executeAgentAction = (commandText: string) => {
    const lower = commandText.toLowerCase().trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let replyText = `I processed your command: "${commandText}"`;
    let actionTaken = 'Simulated Local Action';
    let status: 'success' | 'info' | 'warning' = 'success';

    if (lower.includes('open settings') || lower.includes('settings')) {
      openApp('settings');
      replyText = 'Opened Settings window.';
      actionTaken = 'App: Settings Opened';
    } else if (lower.includes('turn on bluetooth') || lower.includes('bluetooth on')) {
      updateQuickSettings({ bluetooth: true });
      replyText = 'Bluetooth has been enabled in Quick Settings.';
      actionTaken = 'Quick Settings: Bluetooth Enabled';
    } else if (lower.includes('turn off bluetooth') || lower.includes('bluetooth off')) {
      updateQuickSettings({ bluetooth: false });
      replyText = 'Bluetooth has been disabled.';
      actionTaken = 'Quick Settings: Bluetooth Disabled';
    } else if (lower.includes('brightness to') || lower.includes('set brightness')) {
      const match = lower.match(/\d+/);
      const level = match ? Math.min(100, Math.max(0, parseInt(match[0], 10))) : 60;
      updateQuickSettings({ brightness: level });
      replyText = `Display brightness set to ${level}%.`;
      actionTaken = `Display Brightness: ${level}%`;
    } else if (lower.includes('downloads') || lower.includes('open downloads')) {
      openApp('files', { initialPath: 'Downloads' });
      replyText = 'Opened Files app in the Downloads directory.';
      actionTaken = 'App: Files (Downloads)';
    } else if (lower.includes('play music') || lower.includes('music')) {
      openApp('music', { autoplay: true });
      replyText = 'Opened Music app and started audio playback.';
      actionTaken = 'App: Music Playing';
    } else if (lower.includes('create a new folder') || lower.includes('new folder')) {
      openApp('files', { action: 'new_folder' });
      replyText = 'Created a new folder in Documents.';
      actionTaken = 'Files: New Folder Created';
    } else if (lower.includes('dark mode') || lower.includes('theme')) {
      updateQuickSettings({ darkMode: !quickSettings.darkMode });
      replyText = `Switched desktop theme to ${!quickSettings.darkMode ? 'Dark' : 'Light'} mode.`;
      actionTaken = 'Theme Toggled';
    } else if (lower.includes('terminal') || lower.includes('open terminal')) {
      openApp('terminal');
      replyText = 'Opened Windroid Linux Terminal.';
      actionTaken = 'App: Terminal Opened';
    } else if (lower.includes('browser') || lower.includes('open browser')) {
      openApp('browser');
      replyText = 'Opened Windroid Browser.';
      actionTaken = 'App: Browser Opened';
    } else {
      status = 'info';
      replyText = `Understood: "${commandText}". Command logged in prototype agent history.`;
    }

    const userMsg: SystemAgentMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: commandText,
      timestamp: nowTime
    };

    const agentMsg: SystemAgentMessage = {
      id: `a_${Date.now() + 1}`,
      sender: 'agent',
      text: replyText,
      timestamp: nowTime,
      actionTaken,
      status
    };

    setAgentMessages((prev) => [...prev, userMsg, agentMsg]);
  };

  const sendAgentMessage = (text: string) => {
    if (!text.trim()) return;
    executeAgentAction(text);
  };

  const contextValue = useMemo(
    () => ({
      apps,
      pinnedAppIds,
      windows,
      activeWindowId,
      quickSettings,
      radioCapabilities,
      systemCapabilities,
      powerStatus,
      audioStatus,
      displayInfo,
      notifications,
      wallpaper,
      agentMessages,
      isQuickSettingsOpen,
      isNotificationsOpen,
      isSystemAgentOpen,
      isAppLauncherOpen,
      isUniversalSearchOpen,
      quickPanelAppId,
      contextMenu,
      confirmModal,
      developerMode,

      pinApp,
      unpinApp,
      moveDockApp,
      reorderDockApps,
      closeApp,

      openApp,
      closeWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      focusWindow,
      updateWindowPosition,
      updateWindowSize,

      toggleQuickSettings,
      toggleNotifications,
      toggleSystemAgent,
      toggleAppLauncher,
      openAppLauncher,
      toggleUniversalSearch,
      setQuickPanelAppId,
      closeAllPanels,

      updateQuickSettings,
      toggleWifi,
      toggleBluetooth,
      toggleHotspot,
      toggleAirplaneMode,
      refreshRadioCapabilities,
      refreshHardwareState,
      setDisplayBrightness,
      setAudioVolume,
      toggleAudioMute,
      setNightLight,
      setBatterySaver,

      addNotification,
      clearNotification,
      clearAllNotifications,
      setWallpaper,
      toggleDeveloperMode,

      sendAgentMessage,
      executeAgentAction,

      getAppMetadata,
      getAllApps,

      openContextMenu,
      closeContextMenu,
      requestConfirm,
      closeConfirm,
      systemDialogState,
      showSystemDialog,
      dismissSystemDialog,

      // User Identity, Session & Personalization
      runtimeMode,
      setRuntimeMode,
      isResolvingRuntimeMode,
      sessionStatus,
      currentUser,
      userAccounts,
      deviceIdentity,
      localeSettings,
      userPreferences,

      lockSession,
      unlockSession,
      logoutSession,
      switchUser,
      refreshUserAccounts,
      createUserAccount,
      updateUserAccount,
      deleteUserAccount,
      updateDeviceHostname,
      updateTimezone,
      updateLocale,
      updateKeyboardLayout,
      updateUserPreferences
    }),
    [
      apps,
      pinnedAppIds,
      windows,
      activeWindowId,
      quickSettings,
      radioCapabilities,
      notifications,
      wallpaper,
      agentMessages,
      isQuickSettingsOpen,
      isNotificationsOpen,
      isSystemAgentOpen,
      isAppLauncherOpen,
      isUniversalSearchOpen,
      quickPanelAppId,
      contextMenu,
      confirmModal,
      systemDialogState,
      showSystemDialog,
      dismissSystemDialog,
      developerMode,
      toggleWifi,
      toggleBluetooth,
      toggleHotspot,
      toggleAirplaneMode,
      refreshRadioCapabilities,
      runtimeMode,
      isResolvingRuntimeMode,
      sessionStatus,
      currentUser,
      userAccounts,
      deviceIdentity,
      localeSettings,
      userPreferences,
      lockSession,
      unlockSession,
      logoutSession,
      switchUser,
      refreshUserAccounts,
      createUserAccount,
      updateUserAccount,
      deleteUserAccount,
      updateDeviceHostname,
      updateTimezone,
      updateLocale,
      updateKeyboardLayout,
      updateUserPreferences
    ]
  );

  return (
    <OSContext.Provider value={contextValue}>
      {children}
    </OSContext.Provider>
  );
};

export const useOS = () => {
  const context = useContext(OSContext);
  if (!context) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
};

export const useNotifications = () => {
  const context = useContext(OSContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider / OSProvider');
  }
  return {
    notifications: context.notifications,
    addNotification: context.addNotification,
    clearNotification: context.clearNotification,
    removeNotification: context.clearNotification,
    clearAllNotifications: context.clearAllNotifications
  };
};
