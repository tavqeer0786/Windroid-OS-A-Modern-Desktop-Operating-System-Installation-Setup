import {
  InstallerPackageKind,
  InstallerRuntimeKind,
  InstallerLaunchMode,
  InstallerArchitecture,
  InstallerPermission,
} from './InstallerTypes';
import {
  InstallationDestinationKind,
  InstallationDestinationValidation,
} from './InstallationDestinationTypes';
import { InstallerPermissionSummary } from './PermissionTypes';

export interface InstallationPlanIssue {
  code: string;

  severity: 'info' | 'warning' | 'error';

  title: string;
  message: string;

  blocking: boolean;

  source:
    | 'package'
    | 'verification'
    | 'compatibility'
    | 'permissions'
    | 'destination'
    | 'runtime'
    | 'provider'
    | 'options'
    | 'system';

  recoverable: boolean;

  suggestedStep?: 'overview' | 'permissions' | 'location' | 'review';
}

export type InstallationOperationKind =
  | 'verify-package'
  | 'resolve-runtime'
  | 'prepare-runtime'
  | 'prepare-destination'
  | 'install-package'
  | 'apply-permission-policy'
  | 'register-application'
  | 'create-app-menu-entry'
  | 'create-desktop-shortcut'
  | 'pin-to-dock'
  | 'finalize-installation';

export interface InstallationPlanOperation {
  id: string;
  kind: InstallationOperationKind;
  title: string;
  description?: string;

  required: boolean;
  order: number;

  providerId?: string;

  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export type InstallationRollbackOperationKind =
  | 'remove-installed-files'
  | 'remove-runtime-registration'
  | 'remove-app-registry-entry'
  | 'remove-app-menu-entry'
  | 'remove-desktop-shortcut'
  | 'unpin-from-dock'
  | 'restore-permission-policy'
  | 'cleanup-temporary-files';

export interface InstallationRollbackOperation {
  id: string;
  kind: InstallationRollbackOperationKind;
  title: string;
  order: number;
  providerId?: string;
}

export interface InstallationPlanContext {
  providerAvailable?: boolean;
  providerId?: string;
  runtimeAvailable?: boolean;
  availableStorageBytes?: number;
  storeExpectedHash?: string;
  currentPackageHash?: string;
  nativeBridgeAvailable?: boolean;
  simulationMode?: boolean;
}

export interface InstallationPlan {
  id: string;
  sessionId: string;

  createdAt: number;
  sourceRevision: number;

  launchMode: InstallerLaunchMode;

  package: {
    packageKind: InstallerPackageKind;
    runtime: InstallerRuntimeKind;

    sourcePath?: string;
    sourceName?: string;

    packageId?: string;
    displayName: string;
    publisher?: string;
    version?: string;
    architecture?: InstallerArchitecture;

    packageSizeBytes?: number;
    estimatedInstalledSizeBytes?: number;

    inspectionSource:
      | 'native-bridge'
      | 'store-metadata'
      | 'demo-metadata'
      | 'filename-fallback'
      | 'unavailable';
  };

  verification: {
    publisherStatus:
      | 'verified'
      | 'unverified'
      | 'unknown'
      | 'not-available';

    signatureStatus:
      | 'valid'
      | 'invalid'
      | 'unsigned'
      | 'unknown'
      | 'not-available';

    integrityStatus:
      | 'valid'
      | 'invalid'
      | 'unknown'
      | 'not-available';

    compatibilityStatus:
      | 'compatible'
      | 'limited'
      | 'unsupported'
      | 'unknown';
  };

  permissions: {
    required: InstallerPermission[];
    optional: InstallerPermission[];
    granted: InstallerPermission[];
    denied: InstallerPermission[];

    summary: InstallerPermissionSummary;
  };

  destination: {
    optionId: string;
    kind: InstallationDestinationKind;
    policy: 'default' | 'custom' | 'managed' | 'user' | 'system';

    displayPath?: string;
    resolvedPath?: string;

    managedByRuntime: boolean;
    requiresElevation: boolean;

    validation: InstallationDestinationValidation;
  };

  options: {
    createDesktopShortcut: boolean;
    pinToDock: boolean;
    addToApplicationsMenu: boolean;
    launchAfterInstall: boolean;
  };

  provider: {
    providerId?: string;
    runtime: InstallerRuntimeKind;
    resolved: boolean;
    capabilities?: import('./ProviderCapabilities').ProviderCapabilities;
    health?: import('./ProviderHealth').ProviderHealth;
  };

  operations: InstallationPlanOperation[];

  rollbackOperations: InstallationRollbackOperation[];

  warnings: InstallationPlanIssue[];
  blockers: InstallationPlanIssue[];

  canInstall: boolean;

  fingerprint: string;
}
