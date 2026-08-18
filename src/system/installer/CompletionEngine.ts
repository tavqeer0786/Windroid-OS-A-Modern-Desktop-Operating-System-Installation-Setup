import { InstallationSession } from './InstallerTypes';
import { InstallationPlan } from './InstallationPlanTypes';
import { InstallerSessionStore } from './InstallerSessionStore';
import { InstalledApplicationRegistry, InstalledApplicationRecord } from './InstalledApplicationRegistry';
import { DesktopShortcutRegistry, DesktopShortcutRecord } from './DesktopShortcutRegistry';
import { DockRegistry, DockEntryRecord } from './DockRegistry';
import { ApplicationMenuRegistry, ApplicationMenuRecord } from './ApplicationMenuRegistry';
import { SearchIndexRegistry, SearchIndexRecord } from './SearchIndexRegistry';
import { RecentApplicationsRegistry } from './RecentApplicationsRegistry';
import { InstallerProviderRegistry } from './InstallerProviderRegistry';

export class CompletionEngine {
  private static instance: CompletionEngine;
  private completedSessions: Map<string, InstalledApplicationRecord> = new Map();

  private constructor() {}

  public static getInstance(): CompletionEngine {
    if (!CompletionEngine.instance) {
      CompletionEngine.instance = new CompletionEngine();
    }
    return CompletionEngine.instance;
  }

  public async completeInstallation(
    session: InstallationSession,
    plan?: InstallationPlan
  ): Promise<InstalledApplicationRecord> {
    const store = InstallerSessionStore.getInstance();

    // Idempotency check: if session already completed, return existing record
    if (this.completedSessions.has(session.id)) {
      return this.completedSessions.get(session.id)!;
    }

    const provider = InstallerProviderRegistry.getInstance().resolveProvider(session);

    const appId =
      session.packageInfo.displayName?.toLowerCase().replace(/\s+/g, '-') ||
      session.packageInfo.fileName?.replace(/\.[^/.]+$/, '') ||
      `app_${Date.now()}`;

    const displayName = session.packageInfo.displayName || session.packageInfo.fileName || 'Application';
    const publisher = session.packageInfo.publisher || 'Unknown Publisher';
    const version = session.packageInfo.version || '1.0.0';
    const installLocation = session.destination.resolvedPath || session.destination.path || '/WindroidOS/Applications';
    const providerId = provider ? provider.id : 'simulation-provider';
    const icon = session.packageInfo.icon || 'AppWindow';

    // 1. Create Installed Application Record (Metadata only, simulation mode)
    const appRecord: InstalledApplicationRecord = {
      id: appId,
      appId,
      displayName,
      publisher,
      version,
      runtime: session.runtime,
      packageKind: session.packageKind,
      installLocation,
      installedAt: Date.now(),
      provider: providerId,
      icon,
      launchCommand: `windroid-launch://${appId}`,
      permissions: session.permissions?.required?.map((p) => p.key) || [],
      desktopShortcut: session.options.createDesktopShortcut ?? true,
      dockPinned: session.options.pinToDock ?? false,
      menuRegistered: session.options.addToApplicationsMenu ?? true,
      searchIndexed: true,
      status: 'installed',
      simulation: true,
    };

    // 2. Register application entry in InstalledApplicationRegistry
    InstalledApplicationRegistry.getInstance().register(appRecord);

    // 3. Register Menu (if requested)
    let menuRecord: ApplicationMenuRecord | undefined;
    if (appRecord.menuRegistered) {
      menuRecord = ApplicationMenuRegistry.getInstance().register({
        appId,
        displayName,
        icon,
      });
    }

    // 4. Register Search Index
    const searchRecord: SearchIndexRecord = SearchIndexRegistry.getInstance().indexApp({
      appId,
      name: displayName,
      publisher,
      keywords: [displayName, publisher, session.packageKind, session.runtime],
      runtime: session.runtime,
    });

    // 5. Register Dock (if requested)
    let dockRecord: DockEntryRecord | undefined;
    if (appRecord.dockPinned) {
      dockRecord = DockRegistry.getInstance().pin({
        appId,
        displayName,
        icon,
      });
    }

    // 6. Create Desktop Shortcut metadata
    let shortcutRecord: DesktopShortcutRecord | undefined;
    if (appRecord.desktopShortcut) {
      shortcutRecord = DesktopShortcutRegistry.getInstance().createShortcut({
        name: displayName,
        icon,
        targetApp: appId,
        location: '/WindroidOS/Desktop',
      });
    }

    // 7. Add to Recent Applications
    RecentApplicationsRegistry.getInstance().addRecent({
      appId,
      displayName,
      icon,
    });

    // Mark session as completed for idempotency
    this.completedSessions.set(session.id, appRecord);

    // 8. Emit Events via store
    store.emit({
      type: 'registry-added',
      sessionId: session.id,
      appId,
      record: appRecord,
    });

    if (shortcutRecord) {
      store.emit({
        type: 'shortcut-created',
        sessionId: session.id,
        appId,
        shortcut: shortcutRecord,
      });
    }

    if (dockRecord) {
      store.emit({
        type: 'dock-added',
        sessionId: session.id,
        appId,
        dockEntry: dockRecord,
      });
    }

    if (menuRecord) {
      store.emit({
        type: 'menu-added',
        sessionId: session.id,
        appId,
        menuEntry: menuRecord,
      });
    }

    store.emit({
      type: 'search-indexed',
      sessionId: session.id,
      appId,
      searchEntry: searchRecord,
    });

    store.emit({
      type: 'completed',
      sessionId: session.id,
      appId,
      record: appRecord,
    });

    store.emit({
      type: 'installation-completed',
      sessionId: session.id,
      result: {
        installedAppId: appId,
        launchTarget: appRecord.launchCommand,
      },
    });

    // 9. Update Session Store state to Completed (Step 6)
    store.setStep('completed');
    store.setStatus('completed');
    store.updateProgress({
      stage: 'completed',
      percent: 100,
      message: `${displayName} has been successfully installed (Simulated).`,
      executionState: 'completed',
    });

    return appRecord;
  }
}
