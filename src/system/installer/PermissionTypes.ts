import { InstallerPermission } from './InstallerTypes';

export interface PermissionDecisionWarning {
  code: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  permissionId?: string;
}

export interface InstallerPermissionSummary {
  required: InstallerPermission[];
  optional: InstallerPermission[];
  sensitive: InstallerPermission[];
  elevated: InstallerPermission[];

  counts: {
    total: number;
    required: number;
    optional: number;
    sensitive: number;
    elevated: number;
  };

  hasRequiredPermissions: boolean;
  hasOptionalPermissions: boolean;
  requiresElevation: boolean;
  canContinue: boolean;

  warnings: PermissionDecisionWarning[];
}
