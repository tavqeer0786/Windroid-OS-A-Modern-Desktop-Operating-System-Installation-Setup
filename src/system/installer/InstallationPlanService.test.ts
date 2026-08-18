import { InstallationPlanService } from './InstallationPlanService';
import { InstallerSessionStore } from './InstallerSessionStore';

export function runInstallationPlanTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`[FAIL] ${msg}`);
    }
  };

  try {
    const store = InstallerSessionStore.getInstance();
    store.disposeSession();

    // Test 1: Deterministic Plan Generation
    const session = store.createSession({
      launchMode: 'local-package',
      source: { packagePath: '/downloads/ChromeSetup.exe' },
      packageInfo: {
        displayName: 'Google Chrome',
        publisher: 'Google LLC',
        version: '120.0.0',
        architecture: 'x64',
        packageSizeBytes: 125000000,
        installedSizeBytes: 350000000,
      },
      packageKind: 'windows-exe',
      runtime: 'winbridge',
    });

    const planService = InstallationPlanService.getInstance();
    const plan = planService.createPlan(session, { simulationMode: true });

    assert(Boolean(plan), 'Plan should be generated');
    assert(plan.sessionId === session.id, 'Plan session ID should match active session');
    assert(plan.package.displayName === 'Google Chrome', 'Package display name should be Google Chrome');
    assert(plan.operations.length > 0, 'Plan operations should contain steps');
    assert(plan.rollbackOperations.length > 0, 'Plan rollback operations should be defined');
    assert(plan.canInstall === true, 'Plan should be valid and installable');

    // Test 2: Staleness detection
    assert(planService.isStale(plan, session, { simulationMode: true }) === false, 'Fresh plan should not be stale');
    store.updateOptions({ createDesktopShortcut: false });
    const updatedSession = store.getActiveSession()!;
    assert(planService.isStale(plan, updatedSession, { simulationMode: true }) === true, 'Plan should be stale after updating options');

    // Test 3: Blocking issues on required permission disabled
    store.disposeSession();
    const session2 = store.createSession({
      launchMode: 'local-package',
      source: { packagePath: '/downloads/App.exe' },
      permissions: {
        required: [
          {
            id: 'files',
            key: 'files',
            title: 'Files & Storage',
            description: 'Required file access',
            category: 'files',
            required: true,
            enabled: false,
            canUserChange: true,
            canChangeLater: true,
            source: 'windows-capability',
            riskLevel: 'normal',
          },
        ],
        optional: [],
      },
    });

    const session2Updated = store.getActiveSession()!;
    const blockedPlan = planService.createPlan(session2Updated, { simulationMode: true });
    assert(blockedPlan.canInstall === false, 'Blocked plan canInstall should be false');
    assert(blockedPlan.blockers.some((b) => b.code === 'REQUIRED_PERMISSION_DISABLED'), 'Blocked plan should include REQUIRED_PERMISSION_DISABLED blocker');

  } catch (err) {
    failed++;
    console.error('[FAIL] Exception during tests:', err);
  }

  return { passed, failed };
}
