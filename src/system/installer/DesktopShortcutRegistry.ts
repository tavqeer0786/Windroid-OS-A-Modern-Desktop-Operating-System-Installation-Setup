import { DesktopShortcutService } from '../../services/DesktopShortcutService';

export interface DesktopShortcutRecord {
  id: string;
  name: string;
  icon: string;
  targetApp: string; // appId
  location: string; // e.g. '/WindroidOS/Desktop'
  createdAt: number;
}

const LEGACY_STORAGE_KEY = 'aether.os.unified.desktop_shortcuts.v1';

export class DesktopShortcutRegistry {
  private static instance: DesktopShortcutRegistry;

  private constructor() {
    try {
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch (e) {}
  }

  public static getInstance(): DesktopShortcutRegistry {
    if (!DesktopShortcutRegistry.instance) {
      DesktopShortcutRegistry.instance = new DesktopShortcutRegistry();
    }
    return DesktopShortcutRegistry.instance;
  }

  public createShortcut(data: {
    name: string;
    icon: string;
    targetApp: string;
    location?: string;
  }): DesktopShortcutRecord {
    const location = data.location || '/WindroidOS/Desktop';

    // Prevent duplicate shortcut for same target app
    const existing = this.getByTargetApp(data.targetApp, location);
    if (existing) {
      return existing;
    }

    const shortcutNode = DesktopShortcutService.getInstance().createDesktopShortcut(data.targetApp);

    return {
      id: shortcutNode.id,
      name: shortcutNode.name,
      icon: shortcutNode.icon || data.icon,
      targetApp: data.targetApp,
      location,
      createdAt: Date.now(),
    };
  }

  public getByTargetApp(targetApp: string, location?: string): DesktopShortcutRecord | undefined {
    const nodes = DesktopShortcutService.getInstance().getDesktopNodes();
    const foundNode = nodes.find(
      (n) => n.type === 'shortcut' && (n.targetAppId === targetApp || n.targetId === targetApp)
    );

    if (!foundNode) return undefined;

    return {
      id: foundNode.id,
      name: foundNode.name,
      icon: foundNode.icon || 'AppWindow',
      targetApp,
      location: location || '/WindroidOS/Desktop',
      createdAt: Date.now(),
    };
  }

  public getAll(): DesktopShortcutRecord[] {
    const nodes = DesktopShortcutService.getInstance().getDesktopNodes();
    return nodes
      .filter((n) => n.type === 'shortcut' && n.targetAppId)
      .map((n) => ({
        id: n.id,
        name: n.name,
        icon: n.icon || 'AppWindow',
        targetApp: n.targetAppId!,
        location: '/WindroidOS/Desktop',
        createdAt: Date.now(),
      }));
  }

  public remove(id: string): boolean {
    DesktopShortcutService.getInstance().deleteDesktopShortcut(id);
    return true;
  }

  public clear(): void {
    // Clear handled via filesystem
  }
}
