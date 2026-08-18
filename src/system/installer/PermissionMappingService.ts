import { InstallerPermission } from './InstallerTypes';
import {
  PackageInspectionResult,
  WindowsPackageMetadata,
} from './PackageInspectionTypes';
import {
  InstallerPermissionSummary,
  PermissionDecisionWarning,
} from './PermissionTypes';

export class PermissionMappingService {
  private static instance: PermissionMappingService;

  public static getInstance(): PermissionMappingService {
    if (!PermissionMappingService.instance) {
      PermissionMappingService.instance = new PermissionMappingService();
    }
    return PermissionMappingService.instance;
  }

  public mapInspectionPermissions(
    inspection: PackageInspectionResult
  ): InstallerPermission[] {
    const permissionsMap = new Map<string, InstallerPermission>();

    // 1. Process platform-specific metadata if present
    if (inspection.platformMetadata?.android) {
      const androidMeta = inspection.platformMetadata.android;
      if (androidMeta.requestedPermissions) {
        const mapped = this.mapAndroidPermissions(androidMeta.requestedPermissions);
        mapped.forEach((p) => permissionsMap.set(p.key, p));
      }
    } else if (inspection.platformMetadata?.flatpak) {
      const flatpakMeta = inspection.platformMetadata.flatpak;
      if (flatpakMeta.permissions) {
        const mapped = this.mapFlatpakPermissions(flatpakMeta.permissions);
        mapped.forEach((p) => permissionsMap.set(p.key, p));
      }
    } else if (inspection.platformMetadata?.windows) {
      const windowsMeta = inspection.platformMetadata.windows;
      const mapped = this.mapWindowsCapabilities(windowsMeta);
      mapped.forEach((p) => permissionsMap.set(p.key, p));
    }

    // 2. Process inspection.requestedPermissions if provided (e.g. from adapter or store/demo)
    if (inspection.requestedPermissions && inspection.requestedPermissions.length > 0) {
      inspection.requestedPermissions.forEach((p, idx) => {
        const key = p.key || p.id || `perm_${idx}`;
        if (!permissionsMap.has(key)) {
          const normPerm: InstallerPermission = {
            id: p.id || `perm_${key}`,
            key,
            title: p.title,
            description: p.description,
            category: p.category || 'other',
            required: p.required,
            enabled: p.enabled ?? true,
            canUserChange: p.canUserChange ?? (!p.required),
            canChangeLater: p.canChangeLater ?? true,
            source: p.source || 'demo',
            riskLevel: p.riskLevel || 'normal',
            rawValue: p.rawValue,
            sortOrder: p.sortOrder ?? idx,
          };
          permissionsMap.set(key, normPerm);
        }
      });
    }

    return Array.from(permissionsMap.values());
  }

  public mapAndroidPermissions(
    rawPermissions: readonly string[]
  ): InstallerPermission[] {
    const result: InstallerPermission[] = [];

    rawPermissions.forEach((raw, idx) => {
      const upper = raw.toUpperCase();
      let key = 'android_' + raw.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let title = raw;
      let description: string | undefined;
      let category: InstallerPermission['category'] = 'other';
      let riskLevel: InstallerPermission['riskLevel'] = 'normal';
      let required = false;
      let canChangeLater = true;

      if (upper.includes('CAMERA')) {
        key = 'android_camera';
        title = 'Camera';
        description = 'Allows the app to record photos and videos';
        category = 'camera';
        riskLevel = 'sensitive';
      } else if (upper.includes('RECORD_AUDIO') || upper.includes('MICROPHONE')) {
        key = 'android_microphone';
        title = 'Microphone';
        description = 'Allows the app to record audio';
        category = 'microphone';
        riskLevel = 'sensitive';
      } else if (upper.includes('ACCESS_FINE_LOCATION')) {
        key = 'android_fine_location';
        title = 'Precise Location';
        description = 'Allows precise GPS location access';
        category = 'location';
        riskLevel = 'sensitive';
      } else if (upper.includes('ACCESS_COARSE_LOCATION')) {
        key = 'android_coarse_location';
        title = 'Approximate Location';
        description = 'Allows network-based location access';
        category = 'location';
        riskLevel = 'sensitive';
      } else if (upper.includes('READ_CONTACTS') || upper.includes('WRITE_CONTACTS')) {
        key = 'android_contacts';
        title = 'Contacts';
        description = 'Allows reading and managing device contacts';
        category = 'contacts';
        riskLevel = 'sensitive';
      } else if (upper.includes('POST_NOTIFICATIONS') || upper.includes('NOTIFICATION')) {
        key = 'android_notifications';
        title = 'Notifications';
        description = 'Allows sending app notifications';
        category = 'notifications';
        riskLevel = 'normal';
      } else if (upper.includes('BLUETOOTH')) {
        key = 'android_bluetooth';
        title = 'Bluetooth Devices';
        description = 'Allows connecting to nearby Bluetooth hardware';
        category = 'bluetooth';
        riskLevel = 'normal';
      } else if (upper.includes('INTERNET')) {
        key = 'android_internet';
        title = 'Internet Access';
        description = 'Required for downloading web contents and online services';
        category = 'network';
        riskLevel = 'normal';
        required = true;
        canChangeLater = false;
      } else if (
        upper.includes('STORAGE') ||
        upper.includes('READ_MEDIA')
      ) {
        key = 'android_storage';
        title = 'Storage Access';
        description = 'Allows reading files, media, and documents';
        category = 'files';
        riskLevel = 'sensitive';
      } else {
        // Fallback for unknown Android permission
        const parts = raw.split('.');
        const lastPart = parts[parts.length - 1] || raw;
        title = lastPart
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase());
        description = `Android manifest permission: ${raw}`;
      }

      result.push({
        id: key,
        key,
        title,
        description,
        category,
        required,
        enabled: true,
        canUserChange: !required,
        canChangeLater,
        source: 'android-manifest',
        riskLevel,
        rawValue: raw,
        sortOrder: idx,
      });
    });

    return result;
  }

  public mapFlatpakPermissions(
    rawPermissions: readonly string[]
  ): InstallerPermission[] {
    const result: InstallerPermission[] = [];

    rawPermissions.forEach((raw, idx) => {
      const lower = raw.toLowerCase().trim();
      let key = 'flatpak_' + lower.replace(/[^a-z0-9]/g, '_');
      let title = raw;
      let description: string | undefined;
      let category: InstallerPermission['category'] = 'other';
      let riskLevel: InstallerPermission['riskLevel'] = 'normal';
      let required = false;
      let canChangeLater = true;

      if (lower.includes('network') || lower === 'share=network') {
        key = 'flatpak_network';
        title = 'Network Access';
        description = 'Allows network socket access inside sandbox';
        category = 'network';
        riskLevel = 'normal';
      } else if (lower.includes('x11') || lower === 'socket=x11') {
        key = 'flatpak_x11';
        title = 'X11 Display Access';
        description = 'Access graphical X11 display server';
        category = 'display';
        riskLevel = 'normal';
        required = true;
        canChangeLater = false;
      } else if (lower.includes('wayland') || lower === 'socket=wayland') {
        key = 'flatpak_wayland';
        title = 'Wayland Display Access';
        description = 'Access graphical Wayland compositor';
        category = 'display';
        riskLevel = 'normal';
        required = true;
        canChangeLater = false;
      } else if (lower.includes('pulseaudio') || lower === 'socket=pulseaudio' || lower === 'audio') {
        key = 'flatpak_audio';
        title = 'Audio Server Access';
        description = 'Access PulseAudio or PipeWire sound server';
        category = 'audio';
        riskLevel = 'normal';
      } else if (lower.includes('camera') || lower === 'device=camera') {
        key = 'flatpak_camera';
        title = 'Camera Access';
        description = 'Access video capture hardware',
        category = 'camera';
        riskLevel = 'sensitive';
      } else if (lower.includes('devices=all') || lower.includes('device=all')) {
        key = 'flatpak_devices_all';
        title = 'All Hardware Devices';
        description = 'Direct access to raw hardware devices',
        category = 'usb';
        riskLevel = 'elevated';
      } else if (lower.includes('filesystem=home')) {
        key = 'flatpak_fs_home';
        title = 'Home Folder Access';
        description = 'Access user home directory contents',
        category = 'files';
        riskLevel = 'sensitive';
      } else if (lower.includes('filesystem=host')) {
        key = 'flatpak_fs_host';
        title = 'Full Filesystem Access';
        description = 'Full access to host operating system files',
        category = 'files';
        riskLevel = 'elevated';
      } else if (lower.includes('filesystem=xdg-download')) {
        key = 'flatpak_fs_download';
        title = 'Downloads Folder Access';
        description = 'Access files in the Downloads directory';
        category = 'files';
        riskLevel = 'normal';
      } else if (lower.includes('filesystem=xdg-documents')) {
        key = 'flatpak_fs_documents';
        title = 'Documents Folder Access';
        description = 'Access files in the Documents directory';
        category = 'files';
        riskLevel = 'normal';
      } else {
        title = `Sandbox: ${raw}`;
        description = `Flatpak sandbox permission: ${raw}`;
      }

      result.push({
        id: key,
        key,
        title,
        description,
        category,
        required,
        enabled: true,
        canUserChange: !required,
        canChangeLater,
        source: 'flatpak-metadata',
        riskLevel,
        rawValue: raw,
        sortOrder: idx,
      });
    });

    return result;
  }

  public mapWindowsCapabilities(
    metadata: WindowsPackageMetadata
  ): InstallerPermission[] {
    const result: InstallerPermission[] = [];
    let order = 0;

    if (metadata.requestedExecutionLevel === 'requireAdministrator') {
      result.push({
        id: 'win_admin',
        key: 'win_admin',
        title: 'Administrator Privileges',
        description: 'Requires elevated administrator access during installation',
        category: 'administrator',
        required: true,
        enabled: true,
        canUserChange: false,
        canChangeLater: false,
        source: 'windows-capability',
        riskLevel: 'elevated',
        sortOrder: order++,
      });
    }

    if (metadata.detectedCapabilities) {
      metadata.detectedCapabilities.forEach((cap) => {
        const lower = cap.toLowerCase();
        if (lower.includes('filesystem') || lower.includes('fileaccess')) {
          result.push({
            id: 'win_fs_write',
            key: 'win_fs_write',
            title: 'Writes Application Files',
            description: 'Installs binary files into specified installation target',
            category: 'files',
            required: true,
            enabled: true,
            canUserChange: false,
            canChangeLater: false,
            source: 'windows-capability',
            riskLevel: 'normal',
            sortOrder: order++,
          });
        } else if (lower.includes('registry')) {
          result.push({
            id: 'win_registry',
            key: 'win_registry',
            title: 'Modifies WinBridge Registry',
            description: 'Configures Wine virtual environment registry keys',
            category: 'registry',
            required: true,
            enabled: true,
            canUserChange: false,
            canChangeLater: false,
            source: 'windows-capability',
            riskLevel: 'normal',
            sortOrder: order++,
          });
        } else if (lower.includes('network') || lower.includes('internetaccess')) {
          result.push({
            id: 'win_network',
            key: 'win_network',
            title: 'Outbound Network Access',
            description: 'Allows outbound network connections',
            category: 'network',
            required: false,
            enabled: true,
            canUserChange: true,
            canChangeLater: true,
            source: 'windows-capability',
            riskLevel: 'normal',
            sortOrder: order++,
          });
        } else if (lower.includes('service')) {
          result.push({
            id: 'win_service',
            key: 'win_service',
            title: 'Installs Background Service',
            description: 'Registers a WinBridge background daemon service',
            category: 'services',
            required: false,
            enabled: true,
            canUserChange: true,
            canChangeLater: true,
            source: 'windows-capability',
            riskLevel: 'elevated',
            sortOrder: order++,
          });
        } else if (lower.includes('startup')) {
          result.push({
            id: 'win_startup',
            key: 'win_startup',
            title: 'Starts with Windroid OS',
            description: 'Registers startup launcher key in user session',
            category: 'startup',
            required: false,
            enabled: true,
            canUserChange: true,
            canChangeLater: true,
            source: 'windows-capability',
            riskLevel: 'sensitive',
            sortOrder: order++,
          });
        }
      });
    }

    return result;
  }

  public summarize(
    permissions: readonly InstallerPermission[]
  ): InstallerPermissionSummary {
    const required: InstallerPermission[] = [];
    const optional: InstallerPermission[] = [];
    const sensitive: InstallerPermission[] = [];
    const elevated: InstallerPermission[] = [];
    const warnings: PermissionDecisionWarning[] = [];

    permissions.forEach((p) => {
      if (p.required) required.push(p);
      else optional.push(p);

      if (p.riskLevel === 'sensitive') sensitive.push(p);
      if (p.riskLevel === 'elevated') elevated.push(p);
    });

    if (elevated.length > 0) {
      warnings.push({
        code: 'ELEVATED_PRIVILEGES_REQUIRED',
        severity: 'warning',
        title: 'Elevated Privileges Requested',
        message: 'This package requests elevated or administrator access.',
      });
    }

    return {
      required,
      optional,
      sensitive,
      elevated,
      counts: {
        total: permissions.length,
        required: required.length,
        optional: optional.length,
        sensitive: sensitive.length,
        elevated: elevated.length,
      },
      hasRequiredPermissions: required.length > 0,
      hasOptionalPermissions: optional.length > 0,
      requiresElevation: elevated.length > 0,
      canContinue: true,
      warnings,
    };
  }
}
