import { InstallationSession, InstallerStep } from './InstallerTypes';
import { InstallationPlan, InstallationPlanIssue } from './InstallationPlanTypes';

export function selectInstallationPlan(session: InstallationSession | null): InstallationPlan | undefined {
  return session?.plan;
}

export function selectPlanStatus(session: InstallationSession | null): InstallationSession['planStatus'] {
  return session?.planStatus || 'not-created';
}

export function selectCanInstall(session: InstallationSession | null): boolean {
  if (!session?.plan) return false;
  return session.plan.canInstall && session.planStatus !== 'stale';
}

export function selectPlanBlockers(session: InstallationSession | null): InstallationPlanIssue[] {
  return session?.plan?.blockers || [];
}

export function selectPlanWarnings(session: InstallationSession | null): InstallationPlanIssue[] {
  return session?.plan?.warnings || [];
}

export function selectCurrentStep(session: InstallationSession | null): InstallerStep {
  return session?.currentStep || 'overview';
}

export function selectStepIndex(step: InstallerStep): number {
  switch (step) {
    case 'overview':
      return 1;
    case 'permissions':
      return 2;
    case 'location':
      return 3;
    case 'review':
      return 4;
    case 'installing':
      return 5;
    case 'completed':
      return 6;
    case 'failed':
      return 5;
    case 'cancelled':
      return 1;
    default:
      return 1;
  }
}

export function selectIsCompleted(session: InstallationSession | null): boolean {
  return session?.status === 'completed' || session?.currentStep === 'completed';
}

export function selectIsInstalling(session: InstallationSession | null): boolean {
  return session?.status === 'installing' || session?.currentStep === 'installing';
}

export function selectProgress(session: InstallationSession | null): InstallationSession['progress'] {
  return (
    session?.progress || {
      stage: 'idle',
      percent: 0,
      message: '',
    }
  );
}

export function selectPackageInfo(session: InstallationSession | null): InstallationSession['packageInfo'] {
  return (
    session?.packageInfo || {
      displayName: 'Google Chrome',
      publisher: 'Google LLC',
      version: '138.0.0',
    }
  );
}

export function selectOptions(session: InstallationSession | null): InstallationSession['options'] {
  return (
    session?.options || {
      createDesktopShortcut: true,
      pinToDock: true,
      addToApplicationsMenu: true,
      launchAfterInstall: false,
    }
  );
}

export function selectDestination(session: InstallationSession | null): InstallationSession['destination'] {
  return (
    session?.destination || {
      policy: 'default',
      path: '/WindroidOS/Applications',
      customLocationAllowed: true,
    }
  );
}

export function selectRequiredPermissions(session: InstallationSession | null) {
  return session?.permissions?.required || [];
}

export function selectOptionalPermissions(session: InstallationSession | null) {
  return session?.permissions?.optional || [];
}

export function selectAllPermissions(session: InstallationSession | null) {
  const req = selectRequiredPermissions(session);
  const opt = selectOptionalPermissions(session);
  return [...req, ...opt];
}

