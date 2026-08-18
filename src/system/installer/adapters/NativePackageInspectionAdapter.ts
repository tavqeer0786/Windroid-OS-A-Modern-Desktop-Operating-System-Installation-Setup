import { PackageDetectionResult } from '../PackageDetectionService';
import {
  PackageInspectionAdapter,
  PackageInspectionOptions,
  PackageInspectionResult,
} from '../PackageInspectionTypes';

export class NativePackageInspectionAdapter
  implements PackageInspectionAdapter
{
  public readonly id = 'native-bridge';

  public canInspect(
    detection: PackageDetectionResult,
    _options?: PackageInspectionOptions
  ): boolean {
    if (!detection.supported) return false;
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).aetherNative?.installer?.inspectPackage)
    );
  }

  public async inspect(
    detection: PackageDetectionResult,
    _options?: PackageInspectionOptions,
    _signal?: AbortSignal
  ): Promise<PackageInspectionResult> {
    try {
      const nativeService = (window as any).aetherNative.installer;
      const rawResult = await nativeService.inspectPackage({
        path: detection.sourcePath || detection.fileName,
        packageKind: detection.packageKind,
      });

      return {
        packageKind: detection.packageKind,
        runtime: detection.runtime,
        source: 'native-bridge',
        inspectedAt: Date.now(),
        package: {
          fileName: detection.fileName,
          sourcePath: detection.sourcePath,
          packageId: rawResult.packageId || rawResult.packageName,
          displayName: rawResult.displayName || rawResult.appName,
          description: rawResult.description,
          icon: rawResult.icon,
          publisher: rawResult.publisher,
          version: rawResult.version,
          architecture: rawResult.architecture || 'unknown',
          packageSizeBytes: rawResult.packageSizeBytes,
          estimatedInstalledSizeBytes: rawResult.estimatedInstalledSizeBytes,
          releaseDate: rawResult.releaseDate,
        },
        platformMetadata: rawResult.platformMetadata,
        verification: {
          publisherStatus: rawResult.verification?.publisherStatus || 'unknown',
          signatureStatus: rawResult.verification?.signatureStatus || 'unknown',
          integrityStatus: rawResult.verification?.integrityStatus || 'unknown',
          compatibilityStatus:
            rawResult.verification?.compatibilityStatus || 'compatible',
          hash: rawResult.verification?.hash,
        },
        requestedPermissions: rawResult.requestedPermissions || [],
        warnings: rawResult.warnings || [],
        limitations: rawResult.limitations || [],
      };
    } catch (err: any) {
      throw new Error(
        `Native inspection bridge failed: ${err?.message || 'Unknown bridge error'}`
      );
    }
  }
}
