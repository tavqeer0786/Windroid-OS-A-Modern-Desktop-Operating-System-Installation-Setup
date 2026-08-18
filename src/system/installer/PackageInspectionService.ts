import { PackageDetectionResult } from './PackageDetectionService';
import {
  PackageInspectionAdapter,
  PackageInspectionOptions,
  PackageInspectionResult,
} from './PackageInspectionTypes';
import { NativePackageInspectionAdapter } from './adapters/NativePackageInspectionAdapter';
import { StorePackageInspectionAdapter } from './adapters/StorePackageInspectionAdapter';
import { DemoPackageInspectionAdapter } from './adapters/DemoPackageInspectionAdapter';
import { FilenamePackageInspectionAdapter } from './adapters/FilenamePackageInspectionAdapter';

export class PackageInspectionService {
  private static instance: PackageInspectionService;
  private adapters: PackageInspectionAdapter[];

  private constructor() {
    this.adapters = [
      new NativePackageInspectionAdapter(),
      new StorePackageInspectionAdapter(),
      new DemoPackageInspectionAdapter(),
      new FilenamePackageInspectionAdapter(),
    ];
  }

  public static getInstance(): PackageInspectionService {
    if (!PackageInspectionService.instance) {
      PackageInspectionService.instance = new PackageInspectionService();
    }
    return PackageInspectionService.instance;
  }

  public async inspectPackage(
    detection: PackageDetectionResult,
    options?: PackageInspectionOptions,
    signal?: AbortSignal
  ): Promise<PackageInspectionResult> {
    if (!detection.supported) {
      return {
        packageKind: detection.packageKind,
        runtime: detection.runtime,
        source: 'unavailable',
        inspectedAt: Date.now(),
        package: {
          fileName: detection.fileName,
          sourcePath: detection.sourcePath,
          architecture: 'unknown',
        },
        verification: {
          publisherStatus: 'not-available',
          signatureStatus: 'not-available',
          integrityStatus: 'not-available',
          compatibilityStatus: 'unsupported',
        },
        warnings: [
          {
            code: 'PACKAGE_UNSUPPORTED',
            severity: 'error',
            title: 'Unsupported Format',
            message: detection.reason || 'Package format is not supported.',
          },
        ],
        limitations: ['Package cannot be inspected or installed.'],
      };
    }

    for (const adapter of this.adapters) {
      if (adapter.canInspect(detection, options)) {
        try {
          if (signal?.aborted) {
            throw new Error('Inspection cancelled');
          }
          return await adapter.inspect(detection, options, signal);
        } catch (err: any) {
          if (signal?.aborted || err?.message === 'Inspection cancelled') {
            throw err;
          }
          // If a higher priority adapter failed, fall through to lower priority adapters
          console.warn(`[PackageInspectionService] Adapter ${adapter.id} failed:`, err);
        }
      }
    }

    // Fallback if no adapter succeeded
    const fallbackAdapter = new FilenamePackageInspectionAdapter();
    return fallbackAdapter.inspect(detection, options, signal);
  }
}
