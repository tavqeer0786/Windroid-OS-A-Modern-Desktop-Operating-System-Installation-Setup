import { InstallerPackageKind, InstallerRuntimeKind } from './InstallerTypes';
import { ProviderHealth } from './ProviderHealth';

export interface ProviderCapabilities {
  id: string;
  runtime: InstallerRuntimeKind;
  supportedPackageKinds: InstallerPackageKind[];

  supportsPause: boolean;
  supportsResume: boolean;
  supportsCancel: boolean;
  supportsRepair: boolean;
  supportsRollback: boolean;
  supportsSilentInstall: boolean;
  supportsCustomDestination: boolean;
  supportsSystemInstall: boolean;
  supportsUserInstall: boolean;
  supportsPermissionPolicy: boolean;
  supportsUpdates: boolean;
  supportsUninstall: boolean;

  nativeAvailable: boolean;
  simulationAvailable: boolean;

  health: ProviderHealth;
}
