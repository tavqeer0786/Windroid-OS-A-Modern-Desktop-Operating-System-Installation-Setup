import {
  InstallerPackageKind,
  InstallerRuntimeKind,
} from './InstallerTypes';

export interface PackageDetectionResult {
  supported: boolean;
  packageKind: InstallerPackageKind;
  runtime: InstallerRuntimeKind;
  fileName: string;
  extension: string;
  normalizedExtension: string;
  sourcePath?: string;
  reason?: string;
  unsupportedCategory?:
    | 'archive'
    | 'disk-image'
    | 'unsupported-linux-package'
    | 'unknown';
  detectedAt: number;

  // Compatibility properties for legacy callers
  fileType?: 'exe' | 'msi' | 'apk' | 'flatpak' | 'flatpakref';
  legacyRuntime?: 'native' | 'windows' | 'android';
}

const SUPPORTED_EXTENSIONS = ['exe', 'msi', 'apk', 'flatpak', 'flatpakref'] as const;

const ARCHIVE_EXTENSIONS = new Set([
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bz2',
  'xz',
  'tar.gz',
  'tar.xz',
  'tgz',
  'txz',
]);

const DISK_IMAGE_EXTENSIONS = new Set(['iso', 'img', 'dmg']);

const UNSUPPORTED_LINUX_EXTENSIONS = new Set(['deb', 'rpm', 'appimage']);

export class PackageDetectionService {
  public static getSupportedExtensions(): readonly string[] {
    return SUPPORTED_EXTENSIONS;
  }

  public static getExpectedRuntime(packageKind: InstallerPackageKind): InstallerRuntimeKind {
    switch (packageKind) {
      case 'windows-exe':
      case 'windows-msi':
        return 'winbridge';
      case 'android-apk':
        return 'droidbridge';
      case 'flatpak-bundle':
      case 'flatpak-reference':
        return 'native-flatpak';
      default:
        return 'unresolved';
    }
  }

  public static detectFromPath(sourcePath: string): PackageDetectionResult {
    return PackageDetectionService.detect(sourcePath);
  }

  public static detectFromFileName(fileName: string): PackageDetectionResult {
    return PackageDetectionService.detect(fileName);
  }

  public static isSupportedPackage(pathOrFileName: string): boolean {
    const result = PackageDetectionService.detect(pathOrFileName);
    return result.supported;
  }

  // Legacy helper method for backwards compatibility
  public static detectPackage(filenameOrPath: string, _mimeType?: string): PackageDetectionResult {
    return PackageDetectionService.detect(filenameOrPath);
  }

  private static detect(inputPathOrFileName: string): PackageDetectionResult {
    const detectedAt = Date.now();

    if (!inputPathOrFileName || typeof inputPathOrFileName !== 'string') {
      return {
        supported: false,
        packageKind: 'unknown',
        runtime: 'unresolved',
        fileName: '',
        extension: '',
        normalizedExtension: '',
        reason: 'Invalid or empty package path.',
        unsupportedCategory: 'unknown',
        detectedAt,
      };
    }

    // 1. Strip query string or URL hash fragments
    const cleanInput = inputPathOrFileName.split('?')[0].split('#')[0].trim();

    // 2. Convert backslashes to slashes and extract filename
    const normalizedPath = cleanInput.replace(/\\/g, '/');
    const rawFileName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1);

    // Strip trailing dots from filename
    const fileName = rawFileName.replace(/\.+$/, '');

    if (!fileName) {
      return {
        supported: false,
        packageKind: 'unknown',
        runtime: 'unresolved',
        fileName: '',
        extension: '',
        normalizedExtension: '',
        sourcePath: inputPathOrFileName,
        reason: 'Invalid or empty file name.',
        unsupportedCategory: 'unknown',
        detectedAt,
      };
    }

    const lowerFileName = fileName.toLowerCase();

    // 3. Extract extension handling compound extensions (.tar.gz, .tar.xz)
    let ext = '';
    if (lowerFileName.endsWith('.tar.gz')) {
      ext = 'tar.gz';
    } else if (lowerFileName.endsWith('.tar.xz')) {
      ext = 'tar.xz';
    } else if (lowerFileName.endsWith('.flatpakref')) {
      ext = 'flatpakref';
    } else if (lowerFileName.endsWith('.flatpak')) {
      ext = 'flatpak';
    } else {
      // Check dotfile rule (e.g. .hiddenfile has no extension)
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex > 0) {
        ext = fileName.substring(dotIndex + 1);
      }
    }

    const normalizedExtension = ext.toLowerCase().trim();

    // 4. Match Supported Formats
    if (normalizedExtension === 'exe') {
      return {
        supported: true,
        packageKind: 'windows-exe',
        runtime: 'winbridge',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        fileType: 'exe',
        legacyRuntime: 'windows',
        detectedAt,
      };
    }

    if (normalizedExtension === 'msi') {
      return {
        supported: true,
        packageKind: 'windows-msi',
        runtime: 'winbridge',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        fileType: 'msi',
        legacyRuntime: 'windows',
        detectedAt,
      };
    }

    if (normalizedExtension === 'apk') {
      return {
        supported: true,
        packageKind: 'android-apk',
        runtime: 'droidbridge',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        fileType: 'apk',
        legacyRuntime: 'android',
        detectedAt,
      };
    }

    if (normalizedExtension === 'flatpak') {
      return {
        supported: true,
        packageKind: 'flatpak-bundle',
        runtime: 'native-flatpak',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        fileType: 'flatpak',
        legacyRuntime: 'native',
        detectedAt,
      };
    }

    if (normalizedExtension === 'flatpakref') {
      return {
        supported: true,
        packageKind: 'flatpak-reference',
        runtime: 'native-flatpak',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        fileType: 'flatpakref',
        legacyRuntime: 'native',
        detectedAt,
      };
    }

    // 5. Match Unsupported Categories
    if (ARCHIVE_EXTENSIONS.has(normalizedExtension)) {
      return {
        supported: false,
        packageKind: 'unknown',
        runtime: 'unresolved',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        unsupportedCategory: 'archive',
        reason: `Compressed archive (${normalizedExtension ? '.' + normalizedExtension : ''}) files cannot be installed directly as applications. Please extract or inspect contents in Files.`,
        detectedAt,
      };
    }

    if (DISK_IMAGE_EXTENSIONS.has(normalizedExtension)) {
      return {
        supported: false,
        packageKind: 'unknown',
        runtime: 'unresolved',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        unsupportedCategory: 'disk-image',
        reason: `Disc image (${normalizedExtension ? '.' + normalizedExtension : ''}) files cannot be installed directly as applications.`,
        detectedAt,
      };
    }

    if (UNSUPPORTED_LINUX_EXTENSIONS.has(normalizedExtension)) {
      return {
        supported: false,
        packageKind: 'unknown',
        runtime: 'unresolved',
        fileName,
        extension: ext,
        normalizedExtension,
        sourcePath: inputPathOrFileName,
        unsupportedCategory: 'unsupported-linux-package',
        reason: `Linux package format (${normalizedExtension ? '.' + normalizedExtension : ''}) is not natively supported by Windroid OS installer.`,
        detectedAt,
      };
    }

    // 6. Unknown / Other extension
    return {
      supported: false,
      packageKind: 'unknown',
      runtime: 'unresolved',
      fileName,
      extension: ext,
      normalizedExtension,
      sourcePath: inputPathOrFileName,
      unsupportedCategory: 'unknown',
      reason: `The file extension "${normalizedExtension ? '.' + normalizedExtension : 'none'}" is not a recognized installer package format for Windroid OS (supported: .exe, .msi, .apk, .flatpak, .flatpakref).`,
      detectedAt,
    };
  }
}
