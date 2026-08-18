import {
  InstallationSession,
  InstallerStep,
  InstallerSessionStatus,
  InstallerError,
} from './InstallerTypes';
import { InstallationPlan, InstallationPlanIssue } from './InstallationPlanTypes';
import { ExecutionProgressEvent } from './InstallerExecutionTypes';
import { InstalledApplicationRecord } from './InstalledApplicationRegistry';
import { DesktopShortcutRecord } from './DesktopShortcutRegistry';
import { DockEntryRecord } from './DockRegistry';
import { ApplicationMenuRecord } from './ApplicationMenuRegistry';
import { SearchIndexRecord } from './SearchIndexRegistry';

export type InstallerEvent =
  | { type: 'session-created'; sessionId: string; session: InstallationSession }
  | { type: 'session-updated'; sessionId: string; session: InstallationSession }
  | { type: 'step-changed'; sessionId: string; step: InstallerStep }
  | { type: 'status-changed'; sessionId: string; status: InstallerSessionStatus }
  | { type: 'progress-updated'; sessionId: string; progress: InstallationSession['progress'] }
  | { type: 'plan-created'; sessionId: string; plan: InstallationPlan }
  | { type: 'plan-updated'; sessionId: string; plan: InstallationPlan }
  | { type: 'plan-invalidated'; sessionId: string }
  | { type: 'plan-blocked'; sessionId: string; blockers: InstallationPlanIssue[] }
  | { type: 'plan-ready'; sessionId: string; plan: InstallationPlan }
  | { type: 'execution-started'; sessionId: string; plan: InstallationPlan }
  | { type: 'execution-progress'; sessionId: string; event: ExecutionProgressEvent }
  | { type: 'execution-paused'; sessionId: string }
  | { type: 'execution-resumed'; sessionId: string }
  | { type: 'execution-cancelled'; sessionId: string }
  | { type: 'execution-completed'; sessionId: string; result?: InstallationSession['result'] }
  | { type: 'execution-failed'; sessionId: string; error: InstallerError }
  | { type: 'installation-completed'; sessionId: string; result?: InstallationSession['result'] }
  | { type: 'installation-failed'; sessionId: string; error: InstallerError }
  | { type: 'installation-cancelled'; sessionId: string }
  | { type: 'session-disposed'; sessionId: string }
  | { type: 'completed'; sessionId: string; appId: string; record: InstalledApplicationRecord }
  | { type: 'registry-added'; sessionId: string; appId: string; record: InstalledApplicationRecord }
  | { type: 'shortcut-created'; sessionId: string; appId: string; shortcut: DesktopShortcutRecord }
  | { type: 'dock-added'; sessionId: string; appId: string; dockEntry: DockEntryRecord }
  | { type: 'menu-added'; sessionId: string; appId: string; menuEntry: ApplicationMenuRecord }
  | { type: 'search-indexed'; sessionId: string; appId: string; searchEntry: SearchIndexRecord };

export type InstallerEventCallback = (event: InstallerEvent) => void;
export type UnsubscribeInstallerEvents = () => void;

