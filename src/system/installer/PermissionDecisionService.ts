import { InstallerPermission } from './InstallerTypes';
import { PermissionMappingService } from './PermissionMappingService';
import { InstallerPermissionSummary } from './PermissionTypes';

export class PermissionDecisionService {
  private static instance: PermissionDecisionService;

  public static getInstance(): PermissionDecisionService {
    if (!PermissionDecisionService.instance) {
      PermissionDecisionService.instance = new PermissionDecisionService();
    }
    return PermissionDecisionService.instance;
  }

  public canToggle(permission: InstallerPermission): boolean {
    return Boolean(permission.canUserChange && !permission.required);
  }

  public setPermissionEnabled(
    permissions: readonly InstallerPermission[],
    permissionId: string,
    enabled: boolean
  ): InstallerPermission[] {
    const target = permissions.find((p) => p.id === permissionId || p.key === permissionId);
    if (!target || !this.canToggle(target) || target.enabled === enabled) {
      return [...permissions];
    }

    let modified = false;
    const next = permissions.map((p) => {
      if (p.id === permissionId || p.key === permissionId) {
        if (p.enabled !== enabled) {
          modified = true;
          return { ...p, enabled };
        }
      }
      return p;
    });

    return modified ? next : [...permissions];
  }

  public resetOptionalPermissions(
    permissions: readonly InstallerPermission[]
  ): InstallerPermission[] {
    let modified = false;
    const next = permissions.map((p) => {
      if (!p.required && p.canUserChange && !p.enabled) {
        modified = true;
        return { ...p, enabled: true };
      }
      return p;
    });

    return modified ? next : [...permissions];
  }

  public summarize(
    permissions: readonly InstallerPermission[]
  ): InstallerPermissionSummary {
    return PermissionMappingService.getInstance().summarize(permissions);
  }
}
