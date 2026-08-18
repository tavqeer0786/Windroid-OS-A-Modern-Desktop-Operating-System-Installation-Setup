import { RuntimeMode } from '../types/user-session';
import { InstallerPhase } from '../types/installer';
import { InstallerStep } from './InstallerStateMachine';
import { WindroidSystemBridge } from './WindroidSystemBridge';
import { RuntimeEnvironmentResolver, RuntimeEnvironmentType } from './RuntimeEnvironmentResolver';

export type InstallerLifecycleState =
  | 'NOT_INSTALLED'
  | 'INSTALLING'
  | 'INSTALLED_PENDING_OOBE'
  | 'COMPLETED'
  | 'FAILED';

export interface InstallerSessionV2 {
  version: 2;
  lifecycleState: InstallerLifecycleState;
  phase: InstallerPhase;
  step: InstallerStep;
  installationStarted: boolean;
  installationCompleted: boolean;
  installationFailed: boolean;
  installationProgress: number;
  installationStage: string;
  targetDisk?: string;
  installationPlanHash?: string;
  userConfig?: {
    username: string;
    fullName?: string;
    deviceName?: string;
  };
  localeConfig?: {
    language?: string;
    region?: string;
    keyboard?: string;
    timezone?: string;
  };
  oobeCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  environment: RuntimeEnvironmentType;
}

export interface InstallerSessionV1 {
  version: 1;
  installationCompleted: boolean;
  completedAt?: string;
  targetDisk?: string;
  userConfig?: {
    username: string;
    fullName?: string;
    deviceName?: string;
  };
  oobeCompleted: boolean;
  oobeCompletedAt?: string;
  environment: string;
}

export const INSTALLER_SESSION_STORAGE_KEY_V2 = 'installer-session-v2';
export const INSTALLER_SESSION_STORAGE_KEY_V1 = 'installer-session-v1';
export const INSTALLER_SESSION_STORAGE_KEY = INSTALLER_SESSION_STORAGE_KEY_V2;

let memoryStorage: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem(key);
    } catch (_) {}
  }
  return memoryStorage[key] || null;
}

function setStorageItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }
  memoryStorage[key] = value;
}

function removeStorageItem(key: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }
  delete memoryStorage[key];
}

export class InstallerSessionStore {
  public static getSession(): InstallerSessionV2 | null {
    try {
      // 1. Check v2
      const rawV2 = getStorageItem(INSTALLER_SESSION_STORAGE_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && parsed.version === 2) {
          return parsed as InstallerSessionV2;
        }
      }

      // 2. Fallback check & auto-migrate v1 -> v2
      const rawV1 = getStorageItem(INSTALLER_SESSION_STORAGE_KEY_V1);
      if (rawV1) {
        const parsedV1 = JSON.parse(rawV1);
        if (parsedV1 && (parsedV1.version === 1 || typeof parsedV1.installationCompleted === 'boolean')) {
          const now = new Date().toISOString();
          const migrated: InstallerSessionV2 = {
            version: 2,
            lifecycleState: parsedV1.oobeCompleted
              ? 'COMPLETED'
              : parsedV1.installationCompleted
              ? 'INSTALLED_PENDING_OOBE'
              : 'NOT_INSTALLED',
            phase: parsedV1.installationCompleted ? 'oobe' : 'installation',
            step: parsedV1.oobeCompleted ? 'desktop' : parsedV1.installationCompleted ? 'region' : 'language',
            installationStarted: !!parsedV1.installationCompleted,
            installationCompleted: !!parsedV1.installationCompleted,
            installationFailed: false,
            installationProgress: parsedV1.installationCompleted ? 100 : 0,
            installationStage: parsedV1.installationCompleted ? 'completed' : 'idle',
            targetDisk: parsedV1.targetDisk,
            userConfig: parsedV1.userConfig
              ? {
                  username: parsedV1.userConfig.username || 'windroid',
                  fullName: parsedV1.userConfig.fullName,
                  deviceName: parsedV1.userConfig.deviceName
                }
              : undefined,
            oobeCompleted: !!parsedV1.oobeCompleted,
            createdAt: parsedV1.completedAt || now,
            updatedAt: now,
            completedAt: parsedV1.completedAt,
            environment: RuntimeEnvironmentResolver.getEnvironmentType()
          };

          // Save migrated v2 session
          setStorageItem(INSTALLER_SESSION_STORAGE_KEY_V2, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (e) {
      console.warn('[InstallerSessionStore] Failed to read installer session:', e);
    }
    return null;
  }

  public static updateSession(partial: Partial<InstallerSessionV2>): InstallerSessionV2 {
    const now = new Date().toISOString();
    const existing = this.getSession() || {
      version: 2,
      lifecycleState: 'NOT_INSTALLED',
      phase: 'installation',
      step: 'language',
      installationStarted: false,
      installationCompleted: false,
      installationFailed: false,
      installationProgress: 0,
      installationStage: 'idle',
      oobeCompleted: false,
      createdAt: now,
      updatedAt: now,
      environment: RuntimeEnvironmentResolver.getEnvironmentType()
    };

    // Sanitize userConfig: Ensure NO plaintext password is included
    let sanitizedUserConfig = partial.userConfig || existing.userConfig;
    if (sanitizedUserConfig) {
      const { password, confirmPassword, ...safeConfig } = sanitizedUserConfig as any;
      sanitizedUserConfig = safeConfig;
    }

    const updated: InstallerSessionV2 = {
      ...existing,
      ...partial,
      userConfig: sanitizedUserConfig,
      updatedAt: now,
      version: 2
    };

    try {
      setStorageItem(INSTALLER_SESSION_STORAGE_KEY_V2, JSON.stringify(updated));
    } catch (e) {
      console.error('[InstallerSessionStore] Failed to save installer session:', e);
    }

    return updated;
  }

  public static markInstallationStarted(data: { targetDisk?: string; planHash?: string }): InstallerSessionV2 {
    return this.updateSession({
      lifecycleState: 'INSTALLING',
      installationStarted: true,
      installationCompleted: false,
      installationFailed: false,
      installationProgress: 0,
      installationStage: 'preparing_disk',
      targetDisk: data.targetDisk,
      installationPlanHash: data.planHash,
      phase: 'installation',
      step: 'installing'
    });
  }

  public static markInstallationCompleted(data?: {
    targetDisk?: string;
    userConfig?: { username: string; fullName?: string; deviceName?: string };
  }): InstallerSessionV2 {
    const now = new Date().toISOString();
    return this.updateSession({
      lifecycleState: 'INSTALLED_PENDING_OOBE',
      installationStarted: true,
      installationCompleted: true,
      installationFailed: false,
      installationProgress: 100,
      installationStage: 'completed',
      completedAt: now,
      phase: 'installation',
      step: 'complete',
      ...(data?.targetDisk ? { targetDisk: data.targetDisk } : {}),
      ...(data?.userConfig ? { userConfig: data.userConfig } : {})
    });
  }

  public static markInstallationFailed(reason: string): InstallerSessionV2 {
    const now = new Date().toISOString();
    return this.updateSession({
      lifecycleState: 'FAILED',
      installationFailed: true,
      failedAt: now,
      installationStage: 'failed'
    });
  }

  public static markOobeCompleted(): InstallerSessionV2 {
    const now = new Date().toISOString();
    return this.updateSession({
      lifecycleState: 'COMPLETED',
      oobeCompleted: true,
      phase: 'oobe',
      step: 'desktop'
    });
  }

  public static clearSession(): void {
    try {
      removeStorageItem(INSTALLER_SESSION_STORAGE_KEY_V2);
      removeStorageItem(INSTALLER_SESSION_STORAGE_KEY_V1);
    } catch (e) {}
  }
}

export interface StartupRouteResolution {
  runtimeMode: RuntimeMode;
  initialPhase: InstallerPhase;
  initialStep: InstallerStep;
  launchContext: 'boot' | 'live-desktop';
  installationCompleted: boolean;
  oobeCompleted: boolean;
  targetDisk?: string;
  source: 'native-cmdline' | 'url-override' | 'session-persistence' | 'default';
}

export class StartupResolver {
  public static async resolveStartupRoute(): Promise<StartupRouteResolution> {
    const bridge = WindroidSystemBridge.getInstance();

    // 1. Check Native ISO / System Bridge environment first
    if (RuntimeEnvironmentResolver.isNativeProductionEnvironment()) {
      try {
        const isNativeAvailable = await bridge.checkNativeBridge();
        if (isNativeAvailable) {
          const nativeStateRes = await bridge.getNativeInstallerState();
          if (nativeStateRes && nativeStateRes.success && nativeStateRes.state) {
            const state = nativeStateRes.state;
            if (state === 'OOBE_PENDING' || state === 'OOBE_IN_PROGRESS') {
              // Synchronize local session store with authoritative native state
              InstallerSessionStore.updateSession({
                lifecycleState: 'INSTALLED_PENDING_OOBE',
                installationCompleted: true,
                oobeCompleted: false,
                targetDisk: nativeStateRes.targetDisk,
                phase: 'oobe',
                step: 'region'
              });
              return {
                runtimeMode: 'installer',
                initialPhase: 'oobe',
                initialStep: 'region',
                launchContext: 'boot',
                installationCompleted: true,
                oobeCompleted: false,
                targetDisk: nativeStateRes.targetDisk,
                source: 'native-cmdline'
              };
            } else if (state === 'OOBE_COMPLETE' || state === 'DESKTOP_READY') {
              const uConfig = nativeStateRes.userConfig;
              const realUsername = uConfig?.username;
              if (realUsername && realUsername.trim() !== '' && realUsername !== 'windroid-oobe') {
                InstallerSessionStore.updateSession({
                  lifecycleState: 'COMPLETED',
                  installationCompleted: true,
                  oobeCompleted: true,
                  userConfig: {
                    username: realUsername,
                    fullName: uConfig?.fullName,
                    deviceName: uConfig?.deviceName
                  },
                  phase: 'oobe',
                  step: 'desktop'
                });
                return {
                  runtimeMode: 'installed',
                  initialPhase: 'oobe',
                  initialStep: 'desktop',
                  launchContext: 'boot',
                  installationCompleted: true,
                  oobeCompleted: true,
                  targetDisk: nativeStateRes.targetDisk,
                  source: 'native-cmdline'
                };
              } else {
                InstallerSessionStore.updateSession({
                  lifecycleState: 'INSTALLED_PENDING_OOBE',
                  installationCompleted: true,
                  oobeCompleted: false,
                  targetDisk: nativeStateRes.targetDisk,
                  phase: 'oobe',
                  step: 'region'
                });
                return {
                  runtimeMode: 'installer',
                  initialPhase: 'oobe',
                  initialStep: 'region',
                  launchContext: 'boot',
                  installationCompleted: true,
                  oobeCompleted: false,
                  targetDisk: nativeStateRes.targetDisk,
                  source: 'native-cmdline'
                };
              }
            } else if (state === 'INSTALLER') {
              const nativeMode = await bridge.getRuntimeMode();
              if (nativeMode === 'live') {
                return {
                  runtimeMode: 'live',
                  initialPhase: 'installation',
                  initialStep: 'language',
                  launchContext: 'live-desktop',
                  installationCompleted: false,
                  oobeCompleted: false,
                  source: 'native-cmdline'
                };
              }
              return {
                runtimeMode: 'installer',
                initialPhase: 'installation',
                initialStep: 'language',
                launchContext: 'boot',
                installationCompleted: false,
                oobeCompleted: false,
                source: 'native-cmdline'
              };
            } else if (state === 'INSTALLATION_IN_PROGRESS' || state === 'FAILED') {
              InstallerSessionStore.updateSession({
                lifecycleState: 'FAILED',
                installationFailed: true,
                installationStage: 'failed'
              });
              return {
                runtimeMode: 'installer',
                initialPhase: 'installation',
                initialStep: 'language',
                launchContext: 'boot',
                installationCompleted: false,
                oobeCompleted: false,
                source: 'native-cmdline'
              };
            }
          }

          const nativeMode = await bridge.getRuntimeMode();
          if (nativeMode === 'installer') {
            return {
              runtimeMode: 'installer',
              initialPhase: 'installation',
              initialStep: 'language',
              launchContext: 'boot',
              installationCompleted: false,
              oobeCompleted: false,
              source: 'native-cmdline'
            };
          } else if (nativeMode === 'installed') {
            const session = InstallerSessionStore.getSession();
            if (session && session.installationCompleted && !session.oobeCompleted) {
              return {
                runtimeMode: 'installer',
                initialPhase: 'oobe',
                initialStep: 'region',
                launchContext: 'boot',
                installationCompleted: true,
                oobeCompleted: false,
                targetDisk: session.targetDisk,
                source: 'session-persistence'
              };
            }
            return {
              runtimeMode: 'installed',
              initialPhase: 'oobe',
              initialStep: 'desktop',
              launchContext: 'boot',
              installationCompleted: true,
              oobeCompleted: true,
              source: 'native-cmdline'
            };
          } else if (nativeMode === 'live') {
            return {
              runtimeMode: 'live',
              initialPhase: 'installation',
              initialStep: 'language',
              launchContext: 'live-desktop',
              installationCompleted: false,
              oobeCompleted: false,
              source: 'native-cmdline'
            };
          }
        }
      } catch (e) {
        console.warn('[StartupResolver] Native mode resolution error:', e);
      }
    }

    // 2. Check URL Query Parameters (Permitted ONLY in Development / Preview mode)
    if (RuntimeEnvironmentResolver.allowUrlParameterOverrides() && typeof window !== 'undefined' && window.location) {
      const search = window.location.search || '';
      const params = new URLSearchParams(search);
      const modeParam = params.get('mode');

      if (modeParam === 'installer') {
        return {
          runtimeMode: 'installer',
          initialPhase: 'installation',
          initialStep: 'language',
          launchContext: 'boot',
          installationCompleted: false,
          oobeCompleted: false,
          source: 'url-override'
        };
      } else if (modeParam === 'oobe') {
        return {
          runtimeMode: 'installer',
          initialPhase: 'oobe',
          initialStep: 'region',
          launchContext: 'boot',
          installationCompleted: true,
          oobeCompleted: false,
          source: 'url-override'
        };
      } else if (modeParam === 'installed') {
        return {
          runtimeMode: 'installed',
          initialPhase: 'oobe',
          initialStep: 'desktop',
          launchContext: 'boot',
          installationCompleted: true,
          oobeCompleted: true,
          source: 'url-override'
        };
      } else if (modeParam === 'live') {
        return {
          runtimeMode: 'live',
          initialPhase: 'installation',
          initialStep: 'language',
          launchContext: 'live-desktop',
          installationCompleted: false,
          oobeCompleted: false,
          source: 'url-override'
        };
      }
    }

    // 3. Check Session Persistence (installer-session-v2 / migrated v1)
    const session = InstallerSessionStore.getSession();
    if (session && session.installationCompleted) {
      if (!session.oobeCompleted) {
        return {
          runtimeMode: 'installer',
          initialPhase: 'oobe',
          initialStep: 'region',
          launchContext: 'boot',
          installationCompleted: true,
          oobeCompleted: false,
          targetDisk: session.targetDisk,
          source: 'session-persistence'
        };
      }
      return {
        runtimeMode: 'installed',
        initialPhase: 'oobe',
        initialStep: 'desktop',
        launchContext: 'boot',
        installationCompleted: true,
        oobeCompleted: true,
        targetDisk: session.targetDisk,
        source: 'session-persistence'
      };
    }

    // 4. Default for Browser Development / AI Studio Preview
    return {
      runtimeMode: 'browser-development',
      initialPhase: 'installation',
      initialStep: 'language',
      launchContext: 'live-desktop',
      installationCompleted: false,
      oobeCompleted: false,
      source: 'default'
    };
  }
}
