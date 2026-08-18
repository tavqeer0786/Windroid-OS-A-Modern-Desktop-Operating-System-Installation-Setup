import {
  InstallationDestinationContext,
  InstallationDestinationPolicy,
  InstallationDestinationValidation,
} from './InstallationDestinationTypes';
import { InstallerPackageKind } from './InstallerTypes';

export function normalizePath(pathStr: string): string {
  if (!pathStr) return '';
  let trimmed = pathStr.trim();
  // Replace backslashes with forward slashes
  trimmed = trimmed.replace(/\\+/g, '/');
  // Collapse multiple slashes unless starting with double slash (UNC)
  if (trimmed.startsWith('//')) {
    trimmed = '//' + trimmed.slice(2).replace(/\/+/g, '/');
  } else {
    trimmed = trimmed.replace(/\/+/g, '/');
  }
  // Trim trailing slash unless it is root '/'
  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

export class InstallationDestinationValidator {
  public static validateCustomPath(
    pathInput: string | undefined,
    packageKind: InstallerPackageKind,
    context?: InstallationDestinationContext
  ): InstallationDestinationValidation {
    if (!pathInput || !pathInput.trim()) {
      return {
        valid: false,
        errorCode: 'DESTINATION_REQUIRED',
        message: 'An installation path is required.',
      };
    }

    if (
      packageKind === 'android-apk' ||
      packageKind === 'flatpak-bundle' ||
      packageKind === 'flatpak-reference'
    ) {
      return {
        valid: false,
        errorCode: 'CUSTOM_LOCATION_NOT_ALLOWED',
        message: 'Custom installation folders are not supported for this package type.',
      };
    }

    if (pathInput.includes('\0')) {
      return {
        valid: false,
        errorCode: 'INVALID_PATH',
        message: 'Path contains illegal null characters.',
      };
    }

    const norm = normalizePath(pathInput);

    // Traversal check
    const segments = norm.split('/');
    if (segments.includes('..')) {
      return {
        valid: false,
        errorCode: 'INVALID_PATH',
        message: 'Path contains relative traversal segments (..).',
      };
    }

    if (norm === '/' || norm === '') {
      return {
        valid: false,
        errorCode: 'INVALID_PATH',
        message: 'Root folder cannot be used directly as custom installation destination.',
      };
    }

    const lower = norm.toLowerCase();
    const protectedPaths = [
      '/windroidos/recyclebin',
      '/windroidos/system/recyclebin',
      '$recycle.bin',
      '.trash',
      '/tmp',
      '/var/tmp',
      '/windroidos/system/core',
      '/windroidos/system/kernel',
      '/windroidos/installercache',
    ];

    if (protectedPaths.some((p) => lower === p || lower.startsWith(p + '/'))) {
      return {
        valid: false,
        errorCode: 'PROTECTED_LOCATION',
        message: 'Selected location is protected or reserved for system use.',
      };
    }

    if (context?.requiredStorageBytes && context?.availableStorageBytes) {
      if (context.requiredStorageBytes > context.availableStorageBytes) {
        return {
          valid: false,
          enoughSpace: false,
          errorCode: 'INSUFFICIENT_STORAGE',
          message: 'Insufficient storage space available at destination.',
        };
      }
    }

    return {
      valid: true,
      writable: true,
      enoughSpace: true,
      exists: true,
    };
  }

  public static validatePolicy(
    policy: InstallationDestinationPolicy,
    context?: InstallationDestinationContext
  ): InstallationDestinationPolicy {
    const selected = policy.availableOptions.find((o) => o.id === policy.selectedOptionId);

    if (!selected) {
      return {
        ...policy,
        validation: {
          valid: false,
          errorCode: 'DESTINATION_REQUIRED',
          message: 'No destination option selected.',
        },
      };
    }

    if (selected.kind === 'custom-folder') {
      const customValidation = this.validateCustomPath(
        policy.customPath,
        policy.packageKind,
        context
      );
      return {
        ...policy,
        validation: customValidation,
      };
    }

    if (context?.requiredStorageBytes && context?.availableStorageBytes) {
      if (context.requiredStorageBytes > context.availableStorageBytes) {
        return {
          ...policy,
          validation: {
            valid: false,
            enoughSpace: false,
            errorCode: 'INSUFFICIENT_STORAGE',
            message: 'Insufficient storage space available at destination.',
          },
        };
      }
    }

    return {
      ...policy,
      validation: {
        valid: true,
        writable: true,
        enoughSpace: true,
        exists: true,
      },
    };
  }
}
