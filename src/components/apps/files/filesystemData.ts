import { DemoPackageService } from '../../../system/demo/DemoPackageService';
import { DemoMediaService } from '../../../system/demo/DemoMediaService';

export interface FSDemoMetadata {
  packageType: string;
  publisher: string;
  version: string;
  architecture: string;
  runtime: string;
  estimatedSize: string;
  compatibilityRating: string;
  description: string;
  packageHash: string;
  unsupportedReason?: string;
}

import { SAFE_MODE_FLAGS, metrics } from '../../../system/diagnostics';

export interface FSNode {
  id: string;
  name: string;
  type: 'drive' | 'folder' | 'file' | 'shortcut';
  driveLetter?: string; // 'C:', 'D:', 'E:', 'F:'
  totalSizeGB?: number;
  freeSizeGB?: number;
  parentId?: string | null;
  size?: string;
  sizeBytes?: number;
  extension?: string;
  createdAt: string;
  modifiedAt: string;
  content?: string;
  isProtected?: boolean;
  isSystemItem?: boolean;
  protectionType?: string;
  systemAppId?: string;
  targetAppId?: string;
  gridIndex?: number;
  canDelete?: boolean;
  canMove?: boolean;
  canCopy?: boolean;
  canRename?: boolean;
  canModify?: boolean;
  mimeType?: string;
  encoding?: string;
  targetType?: 'system-app' | 'file' | 'folder' | 'application';
  targetId?: string;
  isPinned?: boolean;
  icon?: string;
  children?: FSNode[];
  demoMetadata?: FSDemoMetadata;
}

export const FS_STORAGE_KEY = 'windroid.os.filesystem.v1';
export const LEGACY_FS_STORAGE_KEY = 'aether.os.filesystem.v1';
export const VIEW_MODE_STORAGE_KEY = 'windroid.os.files.viewMode';
export const LEGACY_VIEW_MODE_STORAGE_KEY = 'aether.os.files.viewMode';

export type ViewMode = 'extra-large-icons' | 'large-icons' | 'medium-icons' | 'small-icons' | 'list' | 'details';
export type SortByField = 'name' | 'modified' | 'type' | 'size';
export type SortDirection = 'asc' | 'desc';

export const PROTECTED_SYSTEM_APP_NODES: FSNode[] = [
  {
    id: 'app_files',
    name: 'Files.app',
    type: 'file',
    extension: 'app',
    size: '24 MB',
    sizeBytes: 25165824,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'files',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_computer',
    name: 'Computer.app',
    type: 'file',
    extension: 'app',
    size: '16 MB',
    sizeBytes: 16777216,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'computer',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_browser',
    name: 'Browser.app',
    type: 'file',
    extension: 'app',
    size: '64 MB',
    sizeBytes: 67108864,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'browser',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_settings',
    name: 'Settings.app',
    type: 'file',
    extension: 'app',
    size: '18 MB',
    sizeBytes: 18874368,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'settings',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_terminal',
    name: 'Terminal.app',
    type: 'file',
    extension: 'app',
    size: '12 MB',
    sizeBytes: 12582912,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'terminal',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_photos',
    name: 'Photos.app',
    type: 'file',
    extension: 'app',
    size: '32 MB',
    sizeBytes: 33554432,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'photos',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_music',
    name: 'Music.app',
    type: 'file',
    extension: 'app',
    size: '28 MB',
    sizeBytes: 29360128,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'music',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_calendar',
    name: 'Calendar.app',
    type: 'file',
    extension: 'app',
    size: '20 MB',
    sizeBytes: 20971520,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'calendar',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  },
  {
    id: 'app_agent',
    name: 'Windroid Agent.app',
    type: 'file',
    extension: 'app',
    size: '45 MB',
    sizeBytes: 47185920,
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-01',
    isProtected: true,
    isSystemItem: true,
    protectionType: 'core-system-app',
    systemAppId: 'agent',
    canDelete: false,
    canMove: false,
    canCopy: false,
    canRename: false,
    canModify: false
  }
];

export const INITIAL_FS_NODES: FSNode[] = [
  // DRIVE C:
  {
    id: 'drive_c',
    name: 'Local Disk (C:)',
    type: 'drive',
    driveLetter: 'C:',
    totalSizeGB: 118,
    freeSizeGB: 13.1,
    parentId: 'this_pc',
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-04',
    children: [
      {
        id: 'c_apps',
        name: 'Applications',
        type: 'folder',
        parentId: 'drive_c',
        isProtected: true,
        isSystemItem: true,
        protectionType: 'system-folder',
        canDelete: false,
        canMove: false,
        canRename: false,
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-01',
        children: PROTECTED_SYSTEM_APP_NODES
      },
      {
        id: 'c_users',
        name: 'Users',
        type: 'folder',
        parentId: 'drive_c',
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-04',
        children: [
          {
            id: 'u_alex',
            name: 'Alex',
            type: 'folder',
            parentId: 'c_users',
            createdAt: '2026-01-01',
            modifiedAt: '2026-08-04',
            children: [
              {
                id: 'u_alex_desktop',
                name: 'Desktop',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  {
                    id: 'sc_computer',
                    name: 'This PC',
                    type: 'shortcut',
                    targetType: 'application',
                    targetAppId: 'computer',
                    icon: 'HardDrive',
                    isSystemItem: true,
                    canDelete: false,
                    canRename: false,
                    createdAt: '2026-01-01',
                    modifiedAt: '2026-08-04'
                  },
                  {
                    id: 'sc_documents',
                    name: 'Documents',
                    type: 'shortcut',
                    targetType: 'application',
                    targetAppId: 'files',
                    icon: 'FileText',
                    isSystemItem: true,
                    canDelete: false,
                    canRename: false,
                    createdAt: '2026-01-01',
                    modifiedAt: '2026-08-04'
                  },
                  {
                    id: 'sc_recycle_bin',
                    name: 'Recycle Bin',
                    type: 'shortcut',
                    targetType: 'application',
                    targetAppId: 'recycle_bin',
                    icon: 'Trash2',
                    isSystemItem: true,
                    canDelete: false,
                    canRename: false,
                    createdAt: '2026-01-01',
                    modifiedAt: '2026-08-04'
                  },
                  { 
                    id: 'doc_arch', 
                    name: 'Windroid_OS_Architecture_Spec.md', 
                    type: 'file', 
                    extension: 'md', 
                    size: '14 KB', 
                    sizeBytes: 14336, 
                    createdAt: '2026-08-01', 
                    modifiedAt: '2026-08-04',
                    content: '# Windroid OS Architecture Specification\n\nWindroid OS is an ultra-modern, high-performance desktop operating system built for clean focus and seamless agent interactions.\n\n## Key Highlights\n- Windows 11 inspired UX layout\n- Full full-stack capability with Gemini integration\n- Real-time event architecture'
                  },
                  { 
                    id: 'doc_pb', 
                    name: 'Project Brief.pdf', 
                    type: 'file', 
                    extension: 'pdf', 
                    size: '240 KB', 
                    sizeBytes: 245760, 
                    createdAt: '2026-08-02', 
                    modifiedAt: '2026-08-03' 
                  }
                ]
              },
              {
                id: 'u_alex_documents',
                name: 'Documents',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  { 
                    id: 'doc_notes', 
                    name: 'Notes.txt', 
                    type: 'file', 
                    extension: 'txt', 
                    size: '1.8 KB', 
                    sizeBytes: 1843, 
                    createdAt: '2026-08-03', 
                    modifiedAt: '2026-08-04',
                    content: 'Meeting Notes - Aug 4, 2026\n- Complete File Explorer refactor\n- Add support for C:, D:, E:, F: drives\n- Implement breadcrumb and search navigation'
                  },
                  { 
                    id: 'doc_roadmap', 
                    name: 'Project_Roadmap_2026.txt', 
                    type: 'file', 
                    extension: 'txt', 
                    size: '3.2 KB', 
                    sizeBytes: 3276, 
                    createdAt: '2026-08-01', 
                    modifiedAt: '2026-08-02',
                    content: 'Q3 2026: Next-Gen Desktop Experience\nQ4 2026: Universal Command Palette\nQ1 2027: Multi-device Synchronization'
                  },
                  { 
                    id: 'doc_spec_copy', 
                    name: 'Windroid_OS_Architecture_Spec.md', 
                    type: 'file', 
                    extension: 'md', 
                    size: '14 KB', 
                    sizeBytes: 14336, 
                    createdAt: '2026-08-01', 
                    modifiedAt: '2026-08-03' 
                  }
                ]
              },
              {
                id: 'u_alex_downloads',
                name: 'Downloads',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  { id: 'dl_sample_exe', name: 'SampleApp.exe', type: 'file', extension: 'exe', size: '14.2 MB', sizeBytes: 14889779, createdAt: '2026-08-03', modifiedAt: '2026-08-03' },
                  { id: 'dl_setup_msi', name: 'Setup.msi', type: 'file', extension: 'msi', size: '22.8 MB', sizeBytes: 23907532, createdAt: '2026-08-03', modifiedAt: '2026-08-03' },
                  { id: 'dl_social_apk', name: 'SocialApp.apk', type: 'file', extension: 'apk', size: '28.5 MB', sizeBytes: 29884416, createdAt: '2026-08-02', modifiedAt: '2026-08-02' },
                  { id: 'dl_native_flatpak', name: 'NativeTool.flatpakref', type: 'file', extension: 'flatpakref', size: '4.1 MB', sizeBytes: 4299161, createdAt: '2026-08-04', modifiedAt: '2026-08-04' },
                  { id: 'dl_archive_zip', name: 'ArchivePackage.zip', type: 'file', extension: 'zip', size: '18 MB', sizeBytes: 18874368, createdAt: '2026-08-02', modifiedAt: '2026-08-02' },
                  { id: 'dl_kernel', name: 'linux-kernel-6.12.tar.xz', type: 'file', extension: 'xz', size: '135 MB', sizeBytes: 141557760, createdAt: '2026-08-03', modifiedAt: '2026-08-03' }
                ]
              },
              {
                id: 'u_alex_pictures',
                name: 'Pictures',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  { id: 'pic_ss1', name: 'Screenshot 2026-08-04.png', type: 'file', extension: 'png', size: '1.4 MB', sizeBytes: 1468006, createdAt: '2026-08-04', modifiedAt: '2026-08-04' },
                  { id: 'pic_wall', name: 'wallpaper_lake.jpg', type: 'file', extension: 'jpg', size: '3.8 MB', sizeBytes: 3984588, createdAt: '2026-07-28', modifiedAt: '2026-07-28' }
                ]
              },
              {
                id: 'u_alex_music',
                name: 'Music',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  { id: 'mus_1', name: 'music.mp3', type: 'file', extension: 'mp3', size: '3.5 MB', sizeBytes: 3670016, createdAt: '2026-08-01', modifiedAt: '2026-08-01' },
                  { id: 'mus_2', name: 'Ambient_Soundscape.mp3', type: 'file', extension: 'mp3', size: '4.8 MB', sizeBytes: 5033164, createdAt: '2026-08-01', modifiedAt: '2026-08-01' }
                ]
              },
              {
                id: 'u_alex_screenshots',
                name: 'Screenshots',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  { id: 'ss_captured_1', name: 'Screenshot_2026_08_01.png', type: 'file', extension: 'png', size: '2.1 MB', sizeBytes: 2202009, createdAt: '2026-08-01', modifiedAt: '2026-08-01' }
                ]
              },
              {
                id: 'u_alex_videos',
                name: 'Videos',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  { id: 'vid_1', name: 'video.mp4', type: 'file', extension: 'mp4', size: '18.4 MB', sizeBytes: 19293798, createdAt: '2026-08-02', modifiedAt: '2026-08-02' },
                  { id: 'vid_demo', name: 'Desktop_Demo.mp4', type: 'file', extension: 'mp4', size: '42 MB', sizeBytes: 44040192, createdAt: '2026-07-28', modifiedAt: '2026-07-28' }
                ]
              },
              {
                id: 'u_alex_workspace',
                name: 'Workspace / Web Development Kit',
                type: 'folder',
                isPinned: true,
                parentId: 'u_alex',
                createdAt: '2026-01-01',
                modifiedAt: '2026-08-04',
                children: [
                  {
                    id: 'ws_src',
                    name: 'src',
                    type: 'folder',
                    parentId: 'u_alex_workspace',
                    createdAt: '2026-08-01',
                    modifiedAt: '2026-08-04',
                    children: [
                      { id: 'ws_app', name: 'App.tsx', type: 'file', extension: 'tsx', size: '2.4 KB', sizeBytes: 2457, createdAt: '2026-08-01', modifiedAt: '2026-08-04', content: '// Entry App component for Windroid OS' },
                      { id: 'ws_main', name: 'main.tsx', type: 'file', extension: 'tsx', size: '1.1 KB', sizeBytes: 1126, createdAt: '2026-08-01', modifiedAt: '2026-08-01', content: 'import React from "react";' }
                    ]
                  },
                  { id: 'ws_makefile', name: 'Makefile', type: 'file', extension: 'makefile', size: '1.2 KB', sizeBytes: 1228, createdAt: '2026-08-01', modifiedAt: '2026-08-01', content: '# Windroid OS Build Pipeline' },
                  { id: 'ws_pkg', name: 'package.json', type: 'file', extension: 'json', size: '1.8 KB', sizeBytes: 1843, createdAt: '2026-08-01', modifiedAt: '2026-08-04', content: '{\n  "name": "windroid-os",\n  "version": "1.0.0"\n}' }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'c_system',
        name: 'System',
        type: 'folder',
        isProtected: true,
        parentId: 'drive_c',
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-01',
        children: [
          { id: 'sys_kernel', name: 'windroid_kernel.sys', type: 'file', extension: 'sys', size: '12 MB', sizeBytes: 12582912, createdAt: '2026-01-01', modifiedAt: '2026-08-01' },
          { id: 'sys_dll', name: 'render_pipeline.dll', type: 'file', extension: 'dll', size: '8.4 MB', sizeBytes: 8808038, createdAt: '2026-01-01', modifiedAt: '2026-08-01' }
        ]
      },
      {
        id: 'c_programdata',
        name: 'ProgramData',
        type: 'folder',
        parentId: 'drive_c',
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-01',
        children: []
      },
      {
        id: 'c_temp',
        name: 'Temp',
        type: 'folder',
        parentId: 'drive_c',
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-04',
        children: []
      }
    ]
  },

  // DRIVE D:
  {
    id: 'drive_d',
    name: 'Local Disk (D:)',
    type: 'drive',
    driveLetter: 'D:',
    totalSizeGB: 195,
    freeSizeGB: 121,
    parentId: 'this_pc',
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-04',
    children: [
      {
        id: 'd_backups',
        name: 'Backups',
        type: 'folder',
        parentId: 'drive_d',
        createdAt: '2026-02-10',
        modifiedAt: '2026-08-01',
        children: [
          { id: 'd_bk_1', name: 'system_snapshot_2026_07.img', type: 'file', extension: 'img', size: '24.5 GB', sizeBytes: 26306674688, createdAt: '2026-07-31', modifiedAt: '2026-07-31' }
        ]
      },
      {
        id: 'd_media',
        name: 'Media Library',
        type: 'folder',
        parentId: 'drive_d',
        createdAt: '2026-02-15',
        modifiedAt: '2026-08-02',
        children: [
          { id: 'd_m1', name: 'High_Res_Render_4K.mov', type: 'file', extension: 'mov', size: '1.2 GB', sizeBytes: 1288490188, createdAt: '2026-08-02', modifiedAt: '2026-08-02' }
        ]
      },
      {
        id: 'd_projects',
        name: 'Projects',
        type: 'folder',
        parentId: 'drive_d',
        createdAt: '2026-03-01',
        modifiedAt: '2026-08-04',
        children: [
          { id: 'd_p1', name: 'windroid_v2_design_system.fig', type: 'file', extension: 'fig', size: '48 MB', sizeBytes: 50331648, createdAt: '2026-08-03', modifiedAt: '2026-08-04' }
        ]
      }
    ]
  },

  // DRIVE E:
  {
    id: 'drive_e',
    name: 'New Volume (E:)',
    type: 'drive',
    driveLetter: 'E:',
    totalSizeGB: 511,
    freeSizeGB: 94.6,
    parentId: 'this_pc',
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-04',
    children: [
      {
        id: 'e_datasets',
        name: 'Datasets',
        type: 'folder',
        parentId: 'drive_e',
        createdAt: '2026-04-12',
        modifiedAt: '2026-08-03',
        children: [
          { id: 'e_d1', name: 'gemini_training_corpus.parquet', type: 'file', extension: 'parquet', size: '120 GB', sizeBytes: 128849018880, createdAt: '2026-08-03', modifiedAt: '2026-08-03' }
        ]
      },
      {
        id: 'e_iso',
        name: 'ISO Images',
        type: 'folder',
        parentId: 'drive_e',
        createdAt: '2026-05-20',
        modifiedAt: '2026-08-01',
        children: [
          { id: 'e_iso1', name: 'Windroid_OS_Installer_v1.0.iso', type: 'file', extension: 'iso', size: '4.8 GB', sizeBytes: 5153960755, createdAt: '2026-08-01', modifiedAt: '2026-08-01' }
        ]
      }
    ]
  },

  // DRIVE F:
  {
    id: 'drive_f',
    name: 'New Volume (F:)',
    type: 'drive',
    driveLetter: 'F:',
    totalSizeGB: 199,
    freeSizeGB: 165,
    parentId: 'this_pc',
    createdAt: '2026-01-01',
    modifiedAt: '2026-08-04',
    children: [
      {
        id: 'f_archives',
        name: 'Archives',
        type: 'folder',
        parentId: 'drive_f',
        createdAt: '2026-06-10',
        modifiedAt: '2026-08-02',
        children: [
          { id: 'f_arch1', name: 'Legacy_Projects_2020_2025.7z', type: 'file', extension: '7z', size: '12.4 GB', sizeBytes: 13314398617, createdAt: '2026-08-02', modifiedAt: '2026-08-02' }
        ]
      },
      {
        id: 'f_vm',
        name: 'Virtual Machines',
        type: 'folder',
        parentId: 'drive_f',
        createdAt: '2026-07-01',
        modifiedAt: '2026-08-03',
        children: [
          { id: 'f_vm1', name: 'Debian_12_DevEnv.vmdk', type: 'file', extension: 'vmdk', size: '18.2 GB', sizeBytes: 19542101196, createdAt: '2026-08-03', modifiedAt: '2026-08-03' }
        ]
      }
    ]
  }
];

// LocalStorage Persistence Helpers
export function ensureProtectedAppsInFileSystem(nodes: FSNode[]): FSNode[] {
  let driveC = nodes.find((n) => n.id === 'drive_c');
  if (!driveC) return INITIAL_FS_NODES;

  let cApps = driveC.children?.find((n) => n.id === 'c_apps' || n.name === 'Applications');
  if (!cApps) {
    cApps = {
      id: 'c_apps',
      name: 'Applications',
      type: 'folder',
      parentId: 'drive_c',
      isProtected: true,
      isSystemItem: true,
      protectionType: 'system-folder',
      canDelete: false,
      canMove: false,
      canRename: false,
      createdAt: '2026-01-01',
      modifiedAt: '2026-08-01',
      children: []
    };
    if (!driveC.children) driveC.children = [];
    driveC.children.unshift(cApps);
  }

  cApps.isProtected = true;
  cApps.isSystemItem = true;
  cApps.protectionType = 'system-folder';
  cApps.canDelete = false;
  cApps.canMove = false;
  cApps.canRename = false;

  if (!cApps.children) cApps.children = [];

  PROTECTED_SYSTEM_APP_NODES.forEach((protoApp) => {
    const existingIndex = cApps!.children!.findIndex(
      (child) => child.id === protoApp.id || child.systemAppId === protoApp.systemAppId || child.name.toLowerCase() === protoApp.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      cApps!.children![existingIndex] = {
        ...cApps!.children![existingIndex],
        ...protoApp,
        parentId: 'c_apps'
      };
    } else {
      cApps!.children!.push({
        ...protoApp,
        parentId: 'c_apps'
      });
    }
  });

  return nodes;
}

export function ensureDesktopSystemShortcuts(nodes: FSNode[], runtimeMode: string = 'live'): FSNode[] {
  const findDesktop = (list: FSNode[]): FSNode | null => {
    for (const node of list) {
      if (node.id === 'u_alex_desktop' || node.name === 'Desktop') return node;
      if (node.children) {
        const found = findDesktop(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const desktop = findDesktop(nodes);
  if (desktop) {
    if (!desktop.children) desktop.children = [];

    const sysShortcuts: FSNode[] = [
      {
        id: 'sc_computer',
        name: 'This PC',
        type: 'shortcut',
        targetType: 'application',
        targetAppId: 'files',
        icon: 'HardDrive',
        isSystemItem: true,
        canDelete: false,
        canRename: false,
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-04'
      },
      {
        id: 'sc_documents',
        name: 'Documents',
        type: 'shortcut',
        targetType: 'application',
        targetAppId: 'files',
        icon: 'FileText',
        isSystemItem: true,
        canDelete: false,
        canRename: false,
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-04'
      },
      {
        id: 'sc_recycle_bin',
        name: 'Recycle Bin',
        type: 'shortcut',
        targetType: 'application',
        targetAppId: 'files',
        icon: 'Trash2',
        isSystemItem: true,
        canDelete: false,
        canRename: false,
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-04'
      }
    ];

    if (runtimeMode !== 'installed') {
      sysShortcuts.push({
        id: 'sc_install_windroid',
        name: 'Install Windroid OS',
        type: 'shortcut',
        targetType: 'application',
        targetAppId: 'install-windroid',
        icon: 'HardDrive',
        isSystemItem: true,
        canDelete: false,
        canRename: false,
        createdAt: '2026-01-01',
        modifiedAt: '2026-08-04'
      });
    } else {
      desktop.children = desktop.children.filter(
        (child) => child.id !== 'sc_install_windroid' && child.targetAppId !== 'install-windroid' && child.name !== 'Install Windroid OS'
      );
    }

    sysShortcuts.forEach((sc) => {
      const exists = desktop.children!.some((child) => child.id === sc.id || child.name === sc.name);
      if (!exists && (sc.id !== 'sc_install_windroid' || runtimeMode !== 'installed')) {
        desktop.children!.unshift(sc);
      }
    });
  }
  return nodes;
}

export function isUserVisibleDesktopItem(node: FSNode, developerMode: boolean = false, runtimeMode: string = 'live'): boolean {
  if (!node || !node.name) return false;

  if (runtimeMode === 'installed') {
    if (node.id === 'sc_install_windroid' || node.targetAppId === 'install-windroid' || node.name === 'Install Windroid OS') {
      return false;
    }
  }

  if ((node as any).isInternalOnly || (node as any).isSystemHidden) return false;

  if (node.name.startsWith('.')) {
    return developerMode;
  }

  if (node.name.startsWith('~$') || node.name.endsWith('.tmp') || node.name.endsWith('.bak')) {
    return developerMode;
  }

  if ((node as any).isHidden) {
    return developerMode;
  }

  return true;
}

export function syncVirtualFolders(nodes: FSNode[], developerMode: boolean, runtimeMode: string = 'live'): FSNode[] {
  let updated = ensureProtectedAppsInFileSystem(nodes);
  updated = ensureDesktopSystemShortcuts(updated, runtimeMode);
  if (!SAFE_MODE_FLAGS.disableDemoPackages) {
    updated = DemoPackageService.getInstance().syncDemoPackagesFolder(updated, developerMode);
  }
  if (!SAFE_MODE_FLAGS.disableDemoMedia) {
    updated = DemoMediaService.getInstance().syncDemoMediaFolder(updated, developerMode);
  }
  return updated;
}

export function loadFilesystemFromStorage(developerMode: boolean = true, runtimeMode: string = 'live'): FSNode[] {
  try {
    const raw = localStorage.getItem(FS_STORAGE_KEY) || localStorage.getItem(LEGACY_FS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return syncVirtualFolders(parsed, developerMode, runtimeMode);
      }
    }
  } catch (err) {
    console.warn('Failed to load filesystem from localStorage:', err);
  }
  return syncVirtualFolders(JSON.parse(JSON.stringify(INITIAL_FS_NODES)), developerMode, runtimeMode);
}

export function saveFilesystemToStorage(nodes: FSNode[]): void {
  try {
    const newJson = JSON.stringify(nodes);
    const oldJson = localStorage.getItem(FS_STORAGE_KEY);
    if (oldJson === newJson) {
      return;
    }
    localStorage.setItem(FS_STORAGE_KEY, newJson);
    metrics.trackLocalStorageWrite();
    metrics.trackFsNotification();
    window.dispatchEvent(new CustomEvent('windroid-fs-changed'));
    window.dispatchEvent(new CustomEvent('aether-fs-changed'));
  } catch (err) {
    console.warn('Failed to save filesystem to localStorage:', err);
  }
}

export function loadViewModeFromStorage(): ViewMode {
  try {
    const raw = localStorage.getItem(VIEW_MODE_STORAGE_KEY) || localStorage.getItem(LEGACY_VIEW_MODE_STORAGE_KEY);
    if (raw && ['extra-large-icons', 'large-icons', 'medium-icons', 'small-icons', 'list', 'details'].includes(raw)) {
      return raw as ViewMode;
    }
  } catch (err) {
    console.warn('Failed to load viewMode from localStorage:', err);
  }
  return 'details';
}

export function saveViewModeToStorage(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch (err) {
    console.warn('Failed to save viewMode to localStorage:', err);
  }
}
