export type DesktopIconSize = 'small' | 'medium' | 'large' | 'extra-large';

export interface DesktopIconSizeConfig {
  size: DesktopIconSize;
  label: string;
  iconSize: number; // SVG px height/width
  cellWidth: number; // Desktop grid width
  cellHeight: number; // Desktop grid height
  labelMaxWidth: number; // Label max-width in px
  fontSize: string; // CSS font-size
  badgeSize: number; // Shortcut arrow badge size in px
}

export const DESKTOP_ICON_SIZE_KEY = 'windroid.os.desktop.iconSize.v1';
export const LEGACY_DESKTOP_ICON_SIZE_KEY = 'aether.os.desktop.iconSize.v1';
export const DESKTOP_ICON_SIZE_CHANGED_EVENT = 'windroid-desktop-iconsize-changed';

export const DESKTOP_ICON_CONFIGS: Record<DesktopIconSize, DesktopIconSizeConfig> = {
  small: {
    size: 'small',
    label: 'Small',
    iconSize: 32,
    cellWidth: 80,
    cellHeight: 80,
    labelMaxWidth: 74,
    fontSize: '11px',
    badgeSize: 12,
  },
  medium: {
    size: 'medium',
    label: 'Medium',
    iconSize: 48,
    cellWidth: 96,
    cellHeight: 96,
    labelMaxWidth: 88,
    fontSize: '11px',
    badgeSize: 14,
  },
  large: {
    size: 'large',
    label: 'Large',
    iconSize: 64,
    cellWidth: 118,
    cellHeight: 118,
    labelMaxWidth: 108,
    fontSize: '12px',
    badgeSize: 18,
  },
  'extra-large': {
    size: 'extra-large',
    label: 'Extra Large',
    iconSize: 88,
    cellWidth: 148,
    cellHeight: 148,
    labelMaxWidth: 136,
    fontSize: '13px',
    badgeSize: 24,
  },
};

export class DesktopViewStore {
  private static instance: DesktopViewStore;

  public static getInstance(): DesktopViewStore {
    if (!DesktopViewStore.instance) {
      DesktopViewStore.instance = new DesktopViewStore();
    }
    return DesktopViewStore.instance;
  }

  public getIconSize(): DesktopIconSize {
    try {
      const raw = localStorage.getItem(DESKTOP_ICON_SIZE_KEY) || localStorage.getItem(LEGACY_DESKTOP_ICON_SIZE_KEY);
      if (raw && ['small', 'medium', 'large', 'extra-large'].includes(raw)) {
        return raw as DesktopIconSize;
      }
    } catch (err) {
      console.warn('Failed to load desktop icon size:', err);
    }
    return 'medium';
  }

  public setIconSize(size: DesktopIconSize): void {
    try {
      localStorage.setItem(DESKTOP_ICON_SIZE_KEY, size);
      window.dispatchEvent(new CustomEvent(DESKTOP_ICON_SIZE_CHANGED_EVENT, { detail: { size } }));
    } catch (err) {
      console.warn('Failed to save desktop icon size:', err);
    }
  }

  public getConfig(): DesktopIconSizeConfig {
    const size = this.getIconSize();
    return DESKTOP_ICON_CONFIGS[size] || DESKTOP_ICON_CONFIGS.medium;
  }
}
