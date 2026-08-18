import { PackageDetectionResult } from '../PackageDetectionService';
import {
  PackageInspectionAdapter,
  PackageInspectionOptions,
  PackageInspectionResult,
} from '../PackageInspectionTypes';

export class FilenamePackageInspectionAdapter
  implements PackageInspectionAdapter
{
  public readonly id = 'filename-fallback';

  public canInspect(
    detection: PackageDetectionResult,
    _options?: PackageInspectionOptions
  ): boolean {
    return detection.supported;
  }

  public async inspect(
    detection: PackageDetectionResult,
    _options?: PackageInspectionOptions,
    _signal?: AbortSignal
  ): Promise<PackageInspectionResult> {
    const rawName = detection.fileName;
    // Strip known extensions cleanly for display name
    const displayName = rawName.replace(
      /\.(exe|msi|apk|flatpak|flatpakref)$/i,
      ''
    );

    return {
      packageKind: detection.packageKind,
      runtime: detection.runtime,
      source: 'filename-fallback',
      inspectedAt: Date.now(),
      package: {
        fileName: rawName,
        sourcePath: detection.sourcePath,
        displayName: displayName || rawName,
        architecture: 'unknown',
      },
      verification: {
        publisherStatus: 'not-available',
        signatureStatus: 'not-available',
        integrityStatus: 'not-available',
        compatibilityStatus: 'unknown',
      },
      warnings: [
        {
          code: 'METADATA_PARTIAL',
          severity: 'info',
          title: 'Basic Metadata Only',
          message:
            'Native binary inspection is unavailable in browser preview. Displaying filename fallback metadata.',
        },
      ],
      limitations: [
        'Detailed package metadata is unavailable in browser preview.',
      ],
    };
  }
}
