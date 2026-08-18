import { DemoPackageService } from '../../demo/DemoPackageService';
import { PackageDetectionResult } from '../PackageDetectionService';
import {
  InstallerArchitecture,
  InstallerPermission,
} from '../InstallerTypes';
import {
  PackageInspectionAdapter,
  PackageInspectionOptions,
  PackageInspectionResult,
  WindowsPackageMetadata,
  AndroidPackageMetadata,
  FlatpakPackageMetadata,
} from '../PackageInspectionTypes';

export class DemoPackageInspectionAdapter
  implements PackageInspectionAdapter
{
  public readonly id = 'demo-metadata';

  public canInspect(
    detection: PackageDetectionResult,
    _options?: PackageInspectionOptions
  ): boolean {
    if (!detection.supported) return false;
    const demoMeta = DemoPackageService.getInstance().getMetadataByName(
      detection.fileName
    );
    return Boolean(demoMeta);
  }

  public async inspect(
    detection: PackageDetectionResult,
    _options?: PackageInspectionOptions,
    _signal?: AbortSignal
  ): Promise<PackageInspectionResult> {
    const demoMeta = DemoPackageService.getInstance().getMetadataByName(
      detection.fileName
    )!;

    // Normalize architecture
    let arch: InstallerArchitecture = 'unknown';
    const lowerArch = (demoMeta.architecture || '').toLowerCase();
    if (lowerArch.includes('x64') || lowerArch.includes('x86_64')) arch = 'x64';
    else if (lowerArch.includes('x86')) arch = 'x86';
    else if (lowerArch.includes('arm64')) arch = 'arm64';
    else if (lowerArch.includes('arm')) arch = 'arm';
    else if (lowerArch.includes('universal')) arch = 'universal';

    // Platform-specific metadata
    let windowsMeta: WindowsPackageMetadata | undefined;
    let androidMeta: AndroidPackageMetadata | undefined;
    let flatpakMeta: FlatpakPackageMetadata | undefined;
    const requestedPermissions: InstallerPermission[] = [];

    if (detection.packageKind === 'windows-exe' || detection.packageKind === 'windows-msi') {
      const isMsi = detection.packageKind === 'windows-msi';
      windowsMeta = {
        packageType: isMsi ? 'msi' : 'exe',
        productName: demoMeta.name.replace(/\.(exe|msi)$/i, ''),
        companyName: demoMeta.publisher,
        fileVersion: demoMeta.version,
        productVersion: demoMeta.version,
        requestedExecutionLevel: 'asInvoker',
        detectedCapabilities: ['InternetAccess', 'FileAccess'],
        likelyInstallerFramework: isMsi ? 'msi' : 'inno-setup',
      };

      requestedPermissions.push(
        {
          id: 'win_file_access',
          key: 'FileAccess',
          title: 'File System Access',
          description: 'Allows writing files to installation directory',
          category: 'files',
          required: true,
          enabled: true,
          canUserChange: false,
          canChangeLater: false,
          source: 'windows-capability',
          riskLevel: 'normal',
        },
        {
          id: 'win_network_access',
          key: 'InternetAccess',
          title: 'Network Access',
          description: 'Allows outbound network connectivity',
          category: 'network',
          required: false,
          enabled: true,
          canUserChange: true,
          canChangeLater: true,
          source: 'windows-capability',
          riskLevel: 'normal',
        }
      );
    } else if (detection.packageKind === 'android-apk') {
      const cleanName = demoMeta.name.replace(/\.apk$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      androidMeta = {
        packageName: `com.demo.${cleanName}`,
        appLabel: demoMeta.name.replace(/\.apk$/i, ''),
        versionName: demoMeta.version,
        versionCode: 100,
        minSdkVersion: 26,
        targetSdkVersion: 33,
        supportedAbis: arch.includes('arm')
          ? ['arm64-v8a', 'armeabi-v7a']
          : ['x86_64', 'universal'],
        requestedPermissions: [
          'android.permission.INTERNET',
          'android.permission.READ_EXTERNAL_STORAGE',
        ],
        launchActivity: `com.demo.${cleanName}.MainActivity`,
      };

      requestedPermissions.push(
        {
          id: 'android_internet',
          key: 'android.permission.INTERNET',
          title: 'Full Network Access',
          description: 'Allows the application to create network sockets',
          category: 'network',
          required: false,
          enabled: true,
          canUserChange: true,
          canChangeLater: true,
          source: 'android-manifest',
          riskLevel: 'normal',
        },
        {
          id: 'android_storage',
          key: 'android.permission.READ_EXTERNAL_STORAGE',
          title: 'Storage Access',
          description: 'Allows reading external storage contents',
          category: 'files',
          required: false,
          enabled: true,
          canUserChange: true,
          canChangeLater: true,
          source: 'android-manifest',
          riskLevel: 'sensitive',
        }
      );
    } else if (
      detection.packageKind === 'flatpak-bundle' ||
      detection.packageKind === 'flatpak-reference'
    ) {
      const cleanName = demoMeta.name.replace(/\.(flatpak|flatpakref)$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      flatpakMeta = {
        appId: `org.windroid.demo.${cleanName}`,
        branch: 'stable',
        runtime: 'org.freedesktop.Platform',
        runtimeVersion: '23.08',
        architecture: arch,
        permissions: ['socket=x11', 'share=network'],
        installationScope: 'user',
      };

      requestedPermissions.push(
        {
          id: 'flatpak_x11',
          key: 'socket=x11',
          title: 'X11 Display Access',
          description: 'Access graphical display server',
          category: 'display',
          required: true,
          enabled: true,
          canUserChange: false,
          canChangeLater: false,
          source: 'flatpak-metadata',
          riskLevel: 'normal',
        },
        {
          id: 'flatpak_network',
          key: 'share=network',
          title: 'Network Sharing',
          description: 'Network socket access inside sandbox',
          category: 'network',
          required: false,
          enabled: true,
          canUserChange: true,
          canChangeLater: true,
          source: 'flatpak-metadata',
          riskLevel: 'normal',
        }
      );
    }

    const cleanDisplayName = demoMeta.name.replace(/\.(exe|msi|apk|flatpak|flatpakref)$/i, '');

    return {
      packageKind: detection.packageKind,
      runtime: detection.runtime,
      source: 'demo-metadata',
      inspectedAt: Date.now(),
      package: {
        fileName: detection.fileName,
        sourcePath: detection.sourcePath,
        packageId: demoMeta.id,
        displayName: cleanDisplayName,
        description: demoMeta.description,
        icon: demoMeta.icon || 'Box',
        publisher: demoMeta.publisher,
        version: demoMeta.version,
        architecture: arch,
        packageSizeBytes: demoMeta.sizeBytes,
        estimatedInstalledSizeBytes: Math.round(demoMeta.sizeBytes * 1.5),
      },
      platformMetadata: {
        windows: windowsMeta,
        android: androidMeta,
        flatpak: flatpakMeta,
      },
      verification: {
        publisherStatus: 'unverified',
        signatureStatus: 'not-available',
        integrityStatus: 'valid',
        compatibilityStatus:
          demoMeta.compatibilityRating === 'Excellent' ||
          demoMeta.compatibilityRating === 'Good'
            ? 'compatible'
            : 'limited',
        hash: demoMeta.packageHash
          ? {
              algorithm: 'sha256',
              value: demoMeta.packageHash.replace(/^sha256:/, ''),
              verified: true,
            }
          : undefined,
      },
      requestedPermissions,
      warnings: [
        {
          code: 'SIGNATURE_UNAVAILABLE_IN_BROWSER',
          severity: 'info',
          title: 'Demo Package Fixture',
          message:
            'Inspected using demo package metadata fixture in browser simulation mode.',
        },
      ],
      limitations: [
        'Simulated package metadata loaded for browser testing.',
      ],
    };
  }
}
