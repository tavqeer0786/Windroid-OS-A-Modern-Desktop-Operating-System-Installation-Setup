import { PackageDetectionResult } from '../PackageDetectionService';
import {
  PackageInspectionAdapter,
  PackageInspectionOptions,
  PackageInspectionResult,
} from '../PackageInspectionTypes';

export class StorePackageInspectionAdapter
  implements PackageInspectionAdapter
{
  public readonly id = 'store-metadata';

  public canInspect(
    detection: PackageDetectionResult,
    options?: PackageInspectionOptions
  ): boolean {
    return Boolean(detection.supported && options?.storeMetadata);
  }

  public async inspect(
    detection: PackageDetectionResult,
    options?: PackageInspectionOptions,
    _signal?: AbortSignal
  ): Promise<PackageInspectionResult> {
    const storeMeta = options?.storeMetadata || {};

    return {
      packageKind: detection.packageKind,
      runtime: detection.runtime,
      source: 'store-metadata',
      inspectedAt: Date.now(),
      package: {
        fileName: detection.fileName,
        sourcePath: detection.sourcePath,
        packageId: storeMeta.packageId || storeMeta.id,
        displayName: storeMeta.displayName || storeMeta.title || storeMeta.name,
        description: storeMeta.description,
        icon: storeMeta.icon,
        publisher: storeMeta.publisher || storeMeta.author,
        version: storeMeta.version,
        architecture: storeMeta.architecture || 'unknown',
        packageSizeBytes: storeMeta.packageSizeBytes || storeMeta.sizeBytes,
        estimatedInstalledSizeBytes: storeMeta.estimatedInstalledSizeBytes,
        releaseDate: storeMeta.releaseDate,
      },
      platformMetadata: storeMeta.platformMetadata,
      verification: {
        publisherStatus: storeMeta.publisherVerified ? 'verified' : 'unverified',
        signatureStatus: storeMeta.signatureValid ? 'valid' : 'unsigned',
        integrityStatus: 'valid',
        compatibilityStatus: 'compatible',
      },
      requestedPermissions: storeMeta.requestedPermissions || [],
      warnings: [],
      limitations: storeMeta.limitations || [],
    };
  }
}
