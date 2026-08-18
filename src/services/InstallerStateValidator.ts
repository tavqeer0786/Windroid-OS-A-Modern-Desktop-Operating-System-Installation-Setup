import { NativeInstallerState, NativeInstallerStateResponse } from '../types/installer';

export const STATE_VERSION = 'windroid-installer-state-v1';

export const VALID_NATIVE_STATES: NativeInstallerState[] = [
  'INSTALLER',
  'INSTALLATION_IN_PROGRESS',
  'INSTALLATION_COMPLETE',
  'OOBE_PENDING',
  'OOBE_IN_PROGRESS',
  'OOBE_COMPLETE',
  'DESKTOP_READY',
  'FAILED'
];

export const RESERVED_SYSTEM_USERNAMES = new Set([
  'root', 'bin', 'daemon', 'sys', 'sync', 'games', 'man', 'lp', 'mail', 'news',
  'uucp', 'proxy', 'www-data', 'backup', 'list', 'irc', 'gnats', 'nobody',
  'systemd-network', 'systemd-resolve', 'messagebus', 'systemd-timesync',
  'avahi-autoipd', 'avahi', 'usbmux', 'dnsmasq', 'kdm', 'gdm', 'lightdm',
  'nodm', 'desktop', 'guest', 'live', 'user', 'windroid-pc', 'windroid-oobe'
]);

export interface StateValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateNativeInstallerState(
  data: Partial<NativeInstallerStateResponse> | Record<string, any> | null | undefined
): StateValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'State data must be a valid object.' };
  }

  if (data.version !== STATE_VERSION) {
    return { valid: false, error: `Invalid state version '${data.version}', expected '${STATE_VERSION}'.` };
  }

  const state = data.state as NativeInstallerState;
  if (!state || !VALID_NATIVE_STATES.includes(state)) {
    return { valid: false, error: `Invalid or missing state: '${state}'.` };
  }

  // 1. INSTALLATION_IN_PROGRESS
  if (state === 'INSTALLATION_IN_PROGRESS') {
    if (data.userConfig !== null && data.userConfig !== undefined) {
      return { valid: false, error: 'userConfig must be null during INSTALLATION_IN_PROGRESS.' };
    }
    if (data.installationCompleted === true) {
      return { valid: false, error: 'installationCompleted must be false during INSTALLATION_IN_PROGRESS.' };
    }
    if (data.oobeCompleted === true) {
      return { valid: false, error: 'oobeCompleted must be false during INSTALLATION_IN_PROGRESS.' };
    }
    return { valid: true, error: null };
  }

  // 2. OOBE_PENDING
  if (state === 'OOBE_PENDING') {
    if (data.userConfig !== null && data.userConfig !== undefined) {
      return { valid: false, error: 'userConfig must be null in OOBE_PENDING state before user registration.' };
    }
    if (data.installationCompleted !== true) {
      return { valid: false, error: 'installationCompleted must be true for OOBE_PENDING.' };
    }
    if (data.oobeCompleted === true) {
      return { valid: false, error: 'oobeCompleted must be false for OOBE_PENDING.' };
    }
    const hasTimestamp = !!(data.installationCompletedAt || data.completedAt || data.updatedAt);
    if (!hasTimestamp) {
      return { valid: false, error: 'Timestamp (installationCompletedAt or completedAt) must be present for OOBE_PENDING.' };
    }
    if (data.error) {
      return { valid: false, error: 'error must be null for OOBE_PENDING.' };
    }
    return { valid: true, error: null };
  }

  // 3. OOBE_IN_PROGRESS
  if (state === 'OOBE_IN_PROGRESS') {
    if (data.installationCompleted !== true) {
      return { valid: false, error: 'installationCompleted must be true for OOBE_IN_PROGRESS.' };
    }
    if (data.oobeCompleted === true) {
      return { valid: false, error: 'oobeCompleted must be false during OOBE_IN_PROGRESS.' };
    }
    if (data.error) {
      return { valid: false, error: 'error must be null for OOBE_IN_PROGRESS.' };
    }
    return { valid: true, error: null };
  }

  // 4. OOBE_COMPLETE / DESKTOP_READY
  if (state === 'OOBE_COMPLETE' || state === 'DESKTOP_READY') {
    if (data.installationCompleted !== true) {
      return { valid: false, error: `installationCompleted must be true for ${state}.` };
    }
    if (data.oobeCompleted !== true) {
      return { valid: false, error: `oobeCompleted must be true for ${state}.` };
    }
    const uCfg = data.userConfig;
    if (!uCfg || typeof uCfg !== 'object') {
      return { valid: false, error: `userConfig must be a valid object for ${state}.` };
    }
    const username = String(uCfg.username || '').trim();
    if (!username || username === 'windroid-oobe' || RESERVED_SYSTEM_USERNAMES.has(username)) {
      return { valid: false, error: `userConfig contains invalid or reserved username: '${username}'.` };
    }
    const usernameRegex = /^[a-z_][a-z0-9_-]*$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, error: `userConfig username '${username}' does not match required format.` };
    }
    const hasTimestamp = !!(data.oobeCompletedAt || data.completedAt || data.updatedAt);
    if (!hasTimestamp) {
      return { valid: false, error: `Timestamp (oobeCompletedAt or completedAt) must be present for ${state}.` };
    }
    if (data.error) {
      return { valid: false, error: `error must be null for ${state}.` };
    }
    return { valid: true, error: null };
  }

  // 5. FAILED
  if (state === 'FAILED') {
    return { valid: true, error: null };
  }

  // 6. INSTALLER / INSTALLATION_COMPLETE
  return { valid: true, error: null };
}
