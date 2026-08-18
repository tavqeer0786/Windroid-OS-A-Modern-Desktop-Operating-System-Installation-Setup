export type RuntimeEnvironmentType =
  | 'browser-preview'
  | 'native-live'
  | 'native-installer'
  | 'native-installed'
  | 'test';

export class RuntimeEnvironmentResolver {
  public static getEnvironmentType(): RuntimeEnvironmentType {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return 'test';
    }

    if (typeof window === 'undefined') {
      return 'browser-preview';
    }

    if (import.meta.env?.DEV) {
      return 'browser-preview';
    }

    const host = window.location.hostname;
    const isCloudOrSandbox =
      host.includes('.run.app') ||
      host.includes('webcontainer') ||
      host.includes('stackblitz') ||
      host.includes('codesandbox');

    if (isCloudOrSandbox) {
      return 'browser-preview';
    }

    const protocol = window.location.protocol;
    const isFile = protocol === 'file:';
    const isLocalNative = host === '127.0.0.1' || host === 'localhost';

    if (isFile || isLocalNative) {
      // In native environment, default to live ISO unless specified otherwise by bridge
      return 'native-live';
    }

    return 'browser-preview';
  }

  public static isBrowserDevelopment(): boolean {
    const env = this.getEnvironmentType();
    return env === 'browser-preview' || env === 'test';
  }

  public static isNativeProductionEnvironment(): boolean {
    const env = this.getEnvironmentType();
    return env === 'native-live' || env === 'native-installer' || env === 'native-installed';
  }

  /**
   * Production native mode MUST NOT be controllable by arbitrary URL parameters.
   * URL parameter overrides are strictly permitted only in browser development / preview mode.
   */
  public static allowUrlParameterOverrides(): boolean {
    return this.isBrowserDevelopment();
  }
}
