import { FSNode } from '../../components/apps/files/filesystemData';

export interface DemoPackageMetadata {
  id: string;
  name: string;
  packageType: 'EXE' | 'MSI' | 'APK' | 'Flatpak' | 'ZIP' | 'RAR' | 'ISO' | '7z' | 'Unknown';
  publisher: string;
  version: string;
  architecture: string;
  runtime: 'Windows' | 'Android' | 'Native Linux' | 'Unsupported';
  estimatedSize: string;
  sizeBytes: number;
  icon: string;
  compatibilityRating: 'Good' | 'Excellent' | 'N/A';
  description: string;
  packageHash: string;
  extension: string;
  unsupportedReason?: string;
}

export const DEMO_PACKAGES_STORAGE_KEY = 'windroid.os.demoPackages.v1';
export const LEGACY_DEMO_PACKAGES_STORAGE_KEY = 'aether.os.demoPackages.v1';

export const ALL_DEMO_PACKAGES: DemoPackageMetadata[] = [
  // Windows
  {
    id: 'demo_sampleapp_exe',
    name: 'SampleApp.exe',
    packageType: 'EXE',
    publisher: 'Demo Software Ltd.',
    version: '1.0.0',
    architecture: 'x64',
    runtime: 'Windows',
    estimatedSize: '14.2 MB',
    sizeBytes: 14889779,
    icon: 'Monitor',
    compatibilityRating: 'Good',
    description: 'Sample Windows executable for WinBridge compatibility testing.',
    packageHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    extension: 'exe'
  },
  {
    id: 'demo_setup_msi',
    name: 'Setup.msi',
    packageType: 'MSI',
    publisher: 'Enterprise Corp',
    version: '2.1.0',
    architecture: 'x64',
    runtime: 'Windows',
    estimatedSize: '22.8 MB',
    sizeBytes: 23907532,
    icon: 'Monitor',
    compatibilityRating: 'Good',
    description: 'Enterprise Windows Installer package for database and service deployment.',
    packageHash: 'sha256:3a18b95c61ef890a5521ef88b901a88b52a17415d86f77c8e9d9e87d091a1234',
    extension: 'msi'
  },
  {
    id: 'demo_paintpro_exe',
    name: 'PaintPro.exe',
    packageType: 'EXE',
    publisher: 'Creative Studio',
    version: '3.0.1',
    architecture: 'x64',
    runtime: 'Windows',
    estimatedSize: '45.0 MB',
    sizeBytes: 47185920,
    icon: 'Monitor',
    compatibilityRating: 'Excellent',
    description: 'Professional raster graphic editor for WinBridge DirectX simulation.',
    packageHash: 'sha256:4b91f08832a884c718a24c5b1612a97561f38491d90c2e7b5f6a908264e11223',
    extension: 'exe'
  },
  {
    id: 'demo_videoeditor_msi',
    name: 'VideoEditor.msi',
    packageType: 'MSI',
    publisher: 'MediaLabs',
    version: '1.5.0',
    architecture: 'x64',
    runtime: 'Windows',
    estimatedSize: '110 MB',
    sizeBytes: 115343360,
    icon: 'Monitor',
    compatibilityRating: 'Good',
    description: 'Non-linear video editing suite installer for Windows.',
    packageHash: 'sha256:8c7b0109f257a12b48991d9c3f2b18471e9a74152e901f4c7d86e921b7452244',
    extension: 'msi'
  },

  // Android
  {
    id: 'demo_socialapp_apk',
    name: 'SocialApp.apk',
    packageType: 'APK',
    publisher: 'Demo Mobile',
    version: '2.3.1',
    architecture: 'arm64-v8a',
    runtime: 'Android',
    estimatedSize: '28.5 MB',
    sizeBytes: 29884416,
    icon: 'Smartphone',
    compatibilityRating: 'Good',
    description: 'Android social network client for DroidBridge container testing.',
    packageHash: 'sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    extension: 'apk'
  },
  {
    id: 'demo_camera_apk',
    name: 'Camera.apk',
    packageType: 'APK',
    publisher: 'Vision Tech',
    version: '4.0.0',
    architecture: 'universal',
    runtime: 'Android',
    estimatedSize: '18.2 MB',
    sizeBytes: 19084083,
    icon: 'Smartphone',
    compatibilityRating: 'Excellent',
    description: 'High performance mobile camera & photo capture utility.',
    packageHash: 'sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    extension: 'apk'
  },
  {
    id: 'demo_messenger_apk',
    name: 'Messenger.apk',
    packageType: 'APK',
    publisher: 'ChatWorks',
    version: '5.1.2',
    architecture: 'arm64-v8a',
    runtime: 'Android',
    estimatedSize: '32.0 MB',
    sizeBytes: 33554432,
    icon: 'Smartphone',
    compatibilityRating: 'Good',
    description: 'Real-time instant messaging application for Android.',
    packageHash: 'sha256:5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e',
    extension: 'apk'
  },
  {
    id: 'demo_musicplayer_apk',
    name: 'MusicPlayer.apk',
    packageType: 'APK',
    publisher: 'Audio Inc',
    version: '1.2.0',
    architecture: 'universal',
    runtime: 'Android',
    estimatedSize: '15.5 MB',
    sizeBytes: 16252928,
    icon: 'Smartphone',
    compatibilityRating: 'Excellent',
    description: 'Lightweight high fidelity offline music player.',
    packageHash: 'sha256:a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    extension: 'apk'
  },

  // Native Linux
  {
    id: 'demo_nativetool_flatpakref',
    name: 'NativeTool.flatpakref',
    packageType: 'Flatpak',
    publisher: 'Windroid Labs',
    version: '1.0.0',
    architecture: 'x86_64',
    runtime: 'Native Linux',
    estimatedSize: '4.1 MB',
    sizeBytes: 4299161,
    icon: 'Terminal',
    compatibilityRating: 'Excellent',
    description: 'System diagnostic and benchmarking native Flatpak bundle.',
    packageHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    extension: 'flatpakref'
  },
  {
    id: 'demo_imageviewer_flatpakref',
    name: 'ImageViewer.flatpakref',
    packageType: 'Flatpak',
    publisher: 'OpenSource Media',
    version: '2.0.0',
    architecture: 'x86_64',
    runtime: 'Native Linux',
    estimatedSize: '12.0 MB',
    sizeBytes: 12582912,
    icon: 'Terminal',
    compatibilityRating: 'Excellent',
    description: 'Fast vector and raster image viewing utility.',
    packageHash: 'sha256:7c8b9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    extension: 'flatpakref'
  },
  {
    id: 'demo_texteditor_flatpakref',
    name: 'TextEditor.flatpakref',
    packageType: 'Flatpak',
    publisher: 'CodeTools',
    version: '3.1.0',
    architecture: 'x86_64',
    runtime: 'Native Linux',
    estimatedSize: '8.5 MB',
    sizeBytes: 8912896,
    icon: 'Terminal',
    compatibilityRating: 'Excellent',
    description: 'Minimalist code and text editor built natively for GTK4.',
    packageHash: 'sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    extension: 'flatpakref'
  },

  // Unsupported
  {
    id: 'demo_archive_zip',
    name: 'Archive.zip',
    packageType: 'ZIP',
    publisher: 'Standard Zip Compression',
    version: 'N/A',
    architecture: 'N/A',
    runtime: 'Unsupported',
    estimatedSize: '18 MB',
    sizeBytes: 18874368,
    icon: 'FileArchive',
    compatibilityRating: 'N/A',
    description: 'Unsupported Compressed Zip Archive.',
    packageHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000001',
    extension: 'zip',
    unsupportedReason: 'ZIP Archive (.zip) files cannot be installed directly as applications. Please extract or mount the archive to access installer files inside.'
  },
  {
    id: 'demo_compressed_rar',
    name: 'Compressed.rar',
    packageType: 'RAR',
    publisher: 'RARLab',
    version: 'N/A',
    architecture: 'N/A',
    runtime: 'Unsupported',
    estimatedSize: '25 MB',
    sizeBytes: 26214400,
    icon: 'FileArchive',
    compatibilityRating: 'N/A',
    description: 'Unsupported RAR archive container file.',
    packageHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000002',
    extension: 'rar',
    unsupportedReason: 'Archive File (.rar) files cannot be installed directly as applications. Please extract or mount the archive to access installer files inside.'
  },
  {
    id: 'demo_installer_iso',
    name: 'Installer.iso',
    packageType: 'ISO',
    publisher: 'Optical Disc Standard',
    version: 'N/A',
    architecture: 'N/A',
    runtime: 'Unsupported',
    estimatedSize: '4.7 GB',
    sizeBytes: 5046586572,
    icon: 'Disc',
    compatibilityRating: 'N/A',
    description: 'Unsupported ISO 9660 Disc Image.',
    packageHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000003',
    extension: 'iso',
    unsupportedReason: 'Disc Image (.iso) files cannot be installed directly as applications. Please extract or mount the archive to access installer files inside.'
  },
  {
    id: 'demo_backup_7z',
    name: 'Backup.7z',
    packageType: '7z',
    publisher: '7-Zip Open Source',
    version: 'N/A',
    architecture: 'N/A',
    runtime: 'Unsupported',
    estimatedSize: '64 MB',
    sizeBytes: 67108864,
    icon: 'FileArchive',
    compatibilityRating: 'N/A',
    description: 'Unsupported 7-Zip LZMA archive file.',
    packageHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000004',
    extension: '7z',
    unsupportedReason: 'Archive File (.7z) files cannot be installed directly as applications. Please extract or mount the archive to access installer files inside.'
  },
  {
    id: 'demo_unknown_xyz',
    name: 'Unknown.xyz',
    packageType: 'Unknown',
    publisher: 'Unknown',
    version: 'N/A',
    architecture: 'Unknown',
    runtime: 'Unsupported',
    estimatedSize: '2.4 MB',
    sizeBytes: 2516582,
    icon: 'HelpCircle',
    compatibilityRating: 'N/A',
    description: 'Unrecognized binary executable signature format.',
    packageHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000005',
    extension: 'xyz',
    unsupportedReason: 'The file extension ".xyz" is not a recognized installer package format for Windroid OS (supported: .exe, .msi, .apk, .flatpak, .flatpakref).'
  }
];

export interface DemoPackageStorageState {
  deletedItemNames: string[];
  isFolderDeleted?: boolean;
}

export class DemoPackageService {
  private static instance: DemoPackageService;

  public static getInstance(): DemoPackageService {
    if (!DemoPackageService.instance) {
      DemoPackageService.instance = new DemoPackageService();
    }
    return DemoPackageService.instance;
  }

  public isDemoEnabled(developerMode: boolean): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return developerMode;
  }

  public getStorageState(): DemoPackageStorageState {
    try {
      const raw = localStorage.getItem(DEMO_PACKAGES_STORAGE_KEY) || localStorage.getItem(LEGACY_DEMO_PACKAGES_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse demo package storage state:', err);
    }
    return { deletedItemNames: [] };
  }

  public saveStorageState(state: DemoPackageStorageState): void {
    try {
      localStorage.setItem(DEMO_PACKAGES_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save demo package storage state:', err);
    }
  }

  public markItemDeleted(filename: string): void {
    const state = this.getStorageState();
    if (!state.deletedItemNames.includes(filename)) {
      state.deletedItemNames.push(filename);
      this.saveStorageState(state);
    }
  }

  public markItemRestored(filename: string): void {
    const state = this.getStorageState();
    state.deletedItemNames = state.deletedItemNames.filter((name) => name !== filename);
    this.saveStorageState(state);
  }

  public resetAllDemoPackages(): void {
    this.saveStorageState({ deletedItemNames: [], isFolderDeleted: false });
  }

  public getMetadataByName(filename: string): DemoPackageMetadata | undefined {
    const cleanName = filename.toLowerCase();
    return ALL_DEMO_PACKAGES.find((pkg) => pkg.name.toLowerCase() === cleanName);
  }

  public convertToFSNode(pkg: DemoPackageMetadata, parentId: string): FSNode {
    return {
      id: pkg.id,
      name: pkg.name,
      type: 'file',
      extension: pkg.extension,
      size: pkg.estimatedSize,
      sizeBytes: pkg.sizeBytes,
      parentId,
      createdAt: '2026-08-04',
      modifiedAt: '2026-08-04',
      icon: pkg.icon,
      canDelete: true,
      canMove: true,
      canCopy: true,
      canRename: true,
      canModify: true,
      demoMetadata: {
        packageType: pkg.packageType,
        publisher: pkg.publisher,
        version: pkg.version,
        architecture: pkg.architecture,
        runtime: pkg.runtime,
        estimatedSize: pkg.estimatedSize,
        compatibilityRating: pkg.compatibilityRating,
        description: pkg.description,
        packageHash: pkg.packageHash,
        unsupportedReason: pkg.unsupportedReason
      }
    };
  }

  public syncDemoPackagesFolder(nodes: FSNode[], developerMode: boolean): FSNode[] {
    const isDev = this.isDemoEnabled(developerMode);

    // Find desktop folder
    const desktopFolder = this.findDesktopFolder(nodes);
    if (!desktopFolder) return nodes;

    const folderIndex = desktopFolder.children?.findIndex(
      (child) => child.id === 'u_alex_desktop_demo_packages' || child.name === 'Demo Packages'
    );

    if (!isDev) {
      // Production or Developer Mode OFF -> Remove Demo Packages folder completely
      if (folderIndex !== undefined && folderIndex >= 0 && desktopFolder.children) {
        desktopFolder.children.splice(folderIndex, 1);
      }
      return nodes;
    }

    // Developer Mode ON -> Ensure Demo Packages folder exists
    const storageState = this.getStorageState();

    let demoFolder: FSNode;
    if (folderIndex !== undefined && folderIndex >= 0 && desktopFolder.children) {
      demoFolder = desktopFolder.children[folderIndex];
    } else {
      demoFolder = {
        id: 'u_alex_desktop_demo_packages',
        name: 'Demo Packages',
        type: 'folder',
        parentId: desktopFolder.id,
        createdAt: '2026-08-04',
        modifiedAt: '2026-08-04',
        canDelete: true,
        canMove: true,
        canCopy: true,
        canRename: true,
        children: []
      };
      if (!desktopFolder.children) desktopFolder.children = [];
      desktopFolder.children.unshift(demoFolder);
    }

    if (!demoFolder.children) demoFolder.children = [];

    // Ensure all active (non-deleted) demo packages exist inside Demo Packages folder
    ALL_DEMO_PACKAGES.forEach((pkg) => {
      if (storageState.deletedItemNames.includes(pkg.name)) {
        // Remove if present
        demoFolder.children = demoFolder.children!.filter((child) => child.name !== pkg.name);
      } else {
        const existingChildIndex = demoFolder.children!.findIndex((child) => child.name === pkg.name);
        const nodeToAdd = this.convertToFSNode(pkg, demoFolder.id);
        if (existingChildIndex >= 0) {
          demoFolder.children![existingChildIndex] = {
            ...demoFolder.children![existingChildIndex],
            ...nodeToAdd
          };
        } else {
          demoFolder.children!.push(nodeToAdd);
        }
      }
    });

    return nodes;
  }

  private findDesktopFolder(nodes: FSNode[]): FSNode | null {
    for (const node of nodes) {
      if (node.id === 'u_alex_desktop' || node.name === 'Desktop') return node;
      if (node.children) {
        const found = this.findDesktopFolder(node.children);
        if (found) return found;
      }
    }
    return null;
  }
}
