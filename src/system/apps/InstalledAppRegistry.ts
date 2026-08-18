import { AppRuntime, CompatibilityRating } from '../runtime/AppRuntimeProvider';
import { WindroidSystemBridge } from '../../services/WindroidSystemBridge';

export interface InstalledApplication {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon string or base64/url
  runtime: AppRuntime;
  packageId: string;
  executableTarget: string;
  installationPath: string;
  version: string;
  publisher: string;
  architecture: string;
  installedAt: string;
  lastOpenedAt?: string;
  source: string;
  compatibilityRating: CompatibilityRating;
  permissions: string[];
  fileAssociations: string[];
  isSystemApp: boolean;
  isProtected: boolean;
  canUninstall: boolean;
  canRepair: boolean;
  size?: string;
  // Windows specific
  winePrefix?: string;
  graphicsBackend?: string;
  // Android specific
  packageName?: string;
  storageUsage?: string;
  cacheUsage?: string;
  knownLimitations?: string[];
  status?: 'installed' | 'updating' | 'error' | 'disabled';
  simulation?: boolean;
  installationMode?: 'simulation' | 'native';
  launchTarget?: string | Record<string, any>;
}

export const INSTALLED_APPS_STORAGE_KEY = 'windroid.os.demo.installedApps.v2';
export const LEGACY_INSTALLED_APPS_STORAGE_KEY = 'aether.os.demo.installedApps.v2';

// Default mock installed apps to match Aether OS Figma design reference
const INITIAL_DEMO_INSTALLED_APPS: InstalledApplication[] = [
  {
    id: 'app_antigravity_ide',
    name: 'Antigravity IDE (User)',
    description: 'Antigravity AI Coding Platform & Next-Gen IDE',
    icon: 'Code2',
    runtime: 'native',
    packageId: 'com.antigravity.ide',
    executableTarget: 'antigravity-ide',
    installationPath: '/opt/antigravity-ide',
    version: '2.1.1',
    publisher: 'Google',
    architecture: 'x86_64',
    installedAt: '21-07-2026',
    size: '0.99 GB',
    source: 'Windroid Native Repository',
    compatibilityRating: 'excellent',
    permissions: ['filesystem:full', 'gpu:accelerated'],
    fileAssociations: ['ts', 'tsx', 'js', 'py', 'json'],
    isSystemApp: true,
    isProtected: true,
    canUninstall: false,
    canRepair: true
  },
  {
    id: 'app_calculator',
    name: 'Calculator',
    description: 'Standard and scientific mathematical calculator',
    icon: 'Calculator',
    runtime: 'native',
    packageId: 'com.microsoft.calculator',
    executableTarget: 'calculator',
    installationPath: '/usr/bin/calculator',
    version: '11.2305.0.0',
    publisher: 'Microsoft Corporation',
    architecture: 'x86_64',
    installedAt: '04-07-2026',
    size: '16.0 KB',
    source: 'Built-in System App',
    compatibilityRating: 'excellent',
    permissions: [],
    fileAssociations: [],
    isSystemApp: true,
    isProtected: false,
    canUninstall: false,
    canRepair: false
  },
  {
    id: 'app_camera',
    name: 'Camera',
    description: 'Photo and video capture application',
    icon: 'Camera',
    runtime: 'native',
    packageId: 'com.microsoft.camera',
    executableTarget: 'camera',
    installationPath: '/usr/bin/camera',
    version: '2023.2307.3.0',
    publisher: 'Microsoft Corporation',
    architecture: 'x86_64',
    installedAt: '01-07-2026',
    size: '48.0 KB',
    source: 'Built-in System App',
    compatibilityRating: 'excellent',
    permissions: ['camera', 'microphone'],
    fileAssociations: ['jpg', 'png', 'mp4'],
    isSystemApp: true,
    isProtected: false,
    canUninstall: false,
    canRepair: true
  },
  {
    id: 'app_capcut',
    name: 'CapCut',
    description: 'All-in-one video editing and creation suite',
    icon: 'Video',
    runtime: 'windows',
    packageId: 'com.bytedance.capcut',
    executableTarget: 'CapCut.exe',
    installationPath: '/var/lib/windroid/winbridge/apps/capcut/drive_c/Program Files/CapCut',
    version: '8.5.0.3590',
    publisher: 'Bytedance Pte. Ltd.',
    architecture: 'x86_64',
    installedAt: '09-05-2026',
    size: '1.1 GB',
    source: 'WinBridge Installer (EXE)',
    compatibilityRating: 'excellent',
    permissions: ['gpu:accelerated', 'media:read-write'],
    fileAssociations: ['mp4', 'mov', 'avi', 'mkv'],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true,
    winePrefix: '/var/lib/windroid/winbridge/prefixes/capcut_pfx',
    graphicsBackend: 'Direct3D11 / DXVK'
  },
  {
    id: 'app_clock',
    name: 'Clock',
    description: 'Alarms, timers, stopwatch, and world clock',
    icon: 'Clock',
    runtime: 'native',
    packageId: 'com.microsoft.clock',
    executableTarget: 'clock',
    installationPath: '/usr/bin/clock',
    version: '11.2306.26.0',
    publisher: 'Microsoft Corporation',
    architecture: 'x86_64',
    installedAt: '04-07-2026',
    size: '90.6 KB',
    source: 'Built-in System App',
    compatibilityRating: 'excellent',
    permissions: ['notifications'],
    fileAssociations: [],
    isSystemApp: true,
    isProtected: false,
    canUninstall: false,
    canRepair: false
  },
  {
    id: 'app_copilot',
    name: 'Copilot',
    description: 'AI assistant for daily productivity and web research',
    icon: 'Sparkles',
    runtime: 'windows',
    packageId: 'com.microsoft.copilot',
    executableTarget: 'Copilot.exe',
    installationPath: '/var/lib/windroid/winbridge/apps/copilot/drive_c/Program Files/Copilot',
    version: '150.0.4078.65',
    publisher: 'Microsoft Corporation',
    architecture: 'x86_64',
    installedAt: '14-07-2026',
    size: '1.99 GB',
    source: 'WinBridge Package',
    compatibilityRating: 'excellent',
    permissions: ['network:full'],
    fileAssociations: [],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true
  },
  {
    id: 'app_english_uk_pack',
    name: 'English (United Kingdom) Local Experience Pack',
    description: 'Language resources and localized region features',
    icon: 'Globe',
    runtime: 'native',
    packageId: 'com.microsoft.langpack.en-gb',
    executableTarget: 'locale-en-gb',
    installationPath: '/usr/share/locale/en_GB',
    version: '1.0.0.0',
    publisher: 'Microsoft Corporation',
    architecture: 'universal',
    installedAt: '31-05-2026',
    size: '40.0 MB',
    source: 'System Language Pack',
    compatibilityRating: 'excellent',
    permissions: [],
    fileAssociations: [],
    isSystemApp: true,
    isProtected: false,
    canUninstall: true,
    canRepair: false
  },
  {
    id: 'app_gimp_flatpak',
    name: 'GIMP Image Editor',
    description: 'GNU Image Manipulation Program (Native Flatpak)',
    icon: 'Image',
    runtime: 'native',
    packageId: 'org.gimp.GIMP',
    executableTarget: 'gimp',
    installationPath: '/var/lib/flatpak/app/org.gimp.GIMP',
    version: '2.10.36',
    publisher: 'GIMP Development Team',
    architecture: 'x86_64',
    installedAt: '28-07-2026',
    size: '320 MB',
    source: 'Flathub / Native Linux',
    compatibilityRating: 'excellent',
    permissions: ['filesystem:read-write', 'display:wayland', 'gpu:accelerated'],
    fileAssociations: ['xcf', 'psd', 'tiff', 'png', 'jpg'],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true
  },
  {
    id: 'app_notepad_plus_plus',
    name: 'Notepad++',
    description: 'Popular text editor for Windows running via WinBridge',
    icon: 'FileCode',
    runtime: 'windows',
    packageId: 'notepad_plus_plus.exe',
    executableTarget: 'notepad++.exe',
    installationPath: '/var/lib/windroid/winbridge/apps/notepad_plus_plus/prefix/drive_c/Program Files/Notepad++',
    version: '8.6.2',
    publisher: 'Don Ho',
    architecture: 'x86_64',
    installedAt: '01-08-2026',
    size: '14.5 MB',
    source: 'Notepad++ Installer (EXE)',
    compatibilityRating: 'excellent',
    permissions: ['drive_c:access', 'wine_prefix:isolated'],
    fileAssociations: ['txt', 'log', 'cpp', 'h', 'json'],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true,
    winePrefix: '/var/lib/windroid/winbridge/prefixes/npp_pfx',
    graphicsBackend: 'Direct3D9 / DXVK'
  },
  {
    id: 'app_messaging_apk',
    name: 'Signal Messenger',
    description: 'Private messenger Android app running via DroidBridge',
    icon: 'MessageSquare',
    runtime: 'android',
    packageId: 'org.thoughtcrime.securesms',
    packageName: 'org.thoughtcrime.securesms',
    executableTarget: 'org.thoughtcrime.securesms.MainActivity',
    installationPath: '/var/lib/windroid/droidbridge/apks/org.thoughtcrime.securesms',
    version: '7.4.0',
    publisher: 'Signal Foundation',
    architecture: 'universal',
    installedAt: '02-08-2026',
    size: '85.0 MB',
    source: 'Signal APK Direct Download',
    compatibilityRating: 'good',
    permissions: ['Camera', 'Microphone', 'Notifications', 'Contacts'],
    fileAssociations: [],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true,
    storageUsage: '42 MB',
    cacheUsage: '12 MB'
  },
  {
    id: 'app_socialapp_apk',
    name: 'SocialApp',
    description: 'Android social network client running via DroidBridge',
    icon: 'Smartphone',
    runtime: 'android',
    packageId: 'com.demo.socialapp',
    packageName: 'com.demo.socialapp',
    executableTarget: 'com.demo.socialapp.MainActivity',
    installationPath: '/var/lib/windroid/droidbridge/apks/com.demo.socialapp',
    version: '2.3.1',
    publisher: 'Demo Mobile',
    architecture: 'arm64-v8a',
    installedAt: '03-08-2026',
    size: '28.5 MB',
    source: 'DroidBridge Package (APK)',
    compatibilityRating: 'good',
    permissions: ['Internet', 'Storage'],
    fileAssociations: [],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true,
    storageUsage: '30 MB',
    cacheUsage: '8 MB'
  },
  {
    id: 'app_camera_apk',
    name: 'Camera Pro',
    description: 'High performance Android camera utility via DroidBridge',
    icon: 'Camera',
    runtime: 'android',
    packageId: 'com.vision.camera',
    packageName: 'com.vision.camera',
    executableTarget: 'com.vision.camera.MainActivity',
    installationPath: '/var/lib/windroid/droidbridge/apks/com.vision.camera',
    version: '4.0.0',
    publisher: 'Vision Tech',
    architecture: 'universal',
    installedAt: '04-08-2026',
    size: '18.2 MB',
    source: 'DroidBridge Package (APK)',
    compatibilityRating: 'excellent',
    permissions: ['Camera', 'Microphone', 'Storage'],
    fileAssociations: [],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true,
    storageUsage: '20 MB',
    cacheUsage: '5 MB'
  },
  {
    id: 'app_musicplayer_apk',
    name: 'Music Player',
    description: 'High-fidelity offline Android music player via DroidBridge',
    icon: 'Music',
    runtime: 'android',
    packageId: 'com.audio.musicplayer',
    packageName: 'com.audio.musicplayer',
    executableTarget: 'com.audio.musicplayer.MainActivity',
    installationPath: '/var/lib/windroid/droidbridge/apks/com.audio.musicplayer',
    version: '1.2.0',
    publisher: 'Audio Inc',
    architecture: 'universal',
    installedAt: '05-08-2026',
    size: '15.5 MB',
    source: 'DroidBridge Package (APK)',
    compatibilityRating: 'excellent',
    permissions: ['Audio', 'Storage'],
    fileAssociations: [],
    isSystemApp: false,
    isProtected: false,
    canUninstall: true,
    canRepair: true,
    storageUsage: '18 MB',
    cacheUsage: '4 MB'
  }
];

export function loadInstalledAppsFromStorage(): InstalledApplication[] {
  try {
    const raw = localStorage.getItem(INSTALLED_APPS_STORAGE_KEY) || localStorage.getItem(LEGACY_INSTALLED_APPS_STORAGE_KEY);
    if (!raw) {
      saveInstalledAppsToStorage(INITIAL_DEMO_INSTALLED_APPS);
      return INITIAL_DEMO_INSTALLED_APPS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return INITIAL_DEMO_INSTALLED_APPS;
  } catch (err) {
    console.error('Failed to load installed apps from storage:', err);
    return INITIAL_DEMO_INSTALLED_APPS;
  }
}

export function saveInstalledAppsToStorage(apps: InstalledApplication[]): void {
  try {
    localStorage.setItem(INSTALLED_APPS_STORAGE_KEY, JSON.stringify(apps));
  } catch (err) {
    console.error('Failed to save installed apps to storage:', err);
  }
}

export class InstalledAppRegistry {
  private static instance: InstalledAppRegistry;
  private apps: InstalledApplication[];
  private nativeAppsLoaded: boolean = false;

  private constructor() {
    this.apps = loadInstalledAppsFromStorage();
    this.initNativeApps();
  }

  private async initNativeApps(): Promise<void> {
    const bridge = WindroidSystemBridge.getInstance();
    if (bridge.isNativeBridgeAvailable) {
      try {
        const nativeList = await bridge.getInstalledApps();
        if (Array.isArray(nativeList) && nativeList.length > 0) {
          // Merge native apps with core Windroid system apps only
          const coreApps = this.apps.filter((a) => a.id === 'app_antigravity_ide' || a.id.startsWith('windroid_core_'));
          this.apps = [...coreApps, ...nativeList];
          this.nativeAppsLoaded = true;
        }
      } catch (err) {
        console.warn('[InstalledAppRegistry] Failed to initialize native apps:', err);
      }
    }
  }

  public static getInstance(): InstalledAppRegistry {
    if (!InstalledAppRegistry.instance) {
      InstalledAppRegistry.instance = new InstalledAppRegistry();
    }
    return InstalledAppRegistry.instance;
  }

  public getAll(): InstalledApplication[] {
    const bridge = WindroidSystemBridge.getInstance();
    if (bridge.isNativeBridgeAvailable) {
      // In native mode, NEVER include simulated demo apps
      return this.apps.filter((a) => {
        if (a.id.startsWith('native_')) return true;
        if (a.id === 'app_antigravity_ide') return true;
        if (a.id.startsWith('windroid_core_')) return true;
        return false;
      });
    }
    return [...this.apps];
  }

  public getById(id: string): InstalledApplication | undefined {
    return this.apps.find((a) => a.id === id || a.packageId === id || a.packageName === id);
  }

  public getByRuntime(runtime: AppRuntime): InstalledApplication[] {
    return this.apps.filter((a) => a.runtime === runtime);
  }

  public register(app: InstalledApplication): void {
    const existingIdx = this.apps.findIndex((a) => a.id === app.id || a.packageId === app.packageId);
    if (existingIdx >= 0) {
      this.apps[existingIdx] = app;
    } else {
      this.apps.push(app);
    }
    saveInstalledAppsToStorage(this.apps);
  }

  public uninstall(id: string): boolean {
    const app = this.getById(id);
    if (!app) return false;
    if (app.isProtected || app.isSystemApp) {
      console.warn('Cannot uninstall protected system application:', app.name);
      return false;
    }
    this.apps = this.apps.filter((a) => a.id !== id && a.packageId !== id);
    saveInstalledAppsToStorage(this.apps);
    return true;
  }

  public update(id: string, updates: Partial<InstalledApplication>): void {
    this.apps = this.apps.map((a) => {
      if (a.id === id || a.packageId === id) {
        return { ...a, ...updates };
      }
      return a;
    });
    saveInstalledAppsToStorage(this.apps);
  }
}
