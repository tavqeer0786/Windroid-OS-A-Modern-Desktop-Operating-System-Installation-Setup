import { AppMetadata, OSNotification, Wallpaper, VirtualFile, DesktopShortcut } from '../types/os';

export const INITIAL_APPS: AppMetadata[] = [
  {
    id: 'files',
    name: 'Files',
    icon: 'Folder',
    description: 'Manage files, storage and connected drives',
    category: 'system',
    pinned: true,
    running: false,
    defaultWidth: 860,
    defaultHeight: 580,
    minWidth: 620,
    minHeight: 420,
    quickActions: [
      { id: 'open_home', label: 'Home', iconName: 'Home' },
      { id: 'open_documents', label: 'Documents', iconName: 'FileText' },
      { id: 'open_downloads', label: 'Downloads', iconName: 'Download' },
      { id: 'open_pictures', label: 'Pictures', iconName: 'Image' },
      { id: 'open_recents', label: 'Recent files', iconName: 'Clock' },
      { id: 'new_folder', label: 'New folder', iconName: 'FolderPlus' }
    ]
  },
  {
    id: 'browser',
    name: 'Browser',
    icon: 'Globe',
    description: 'Ultra-fast web client and browsing agent',
    category: 'productivity',
    pinned: true,
    running: false,
    defaultWidth: 960,
    defaultHeight: 640,
    minWidth: 680,
    minHeight: 460,
    quickActions: [
      { id: 'new_tab', label: 'New tab', iconName: 'Plus' },
      { id: 'private_tab', label: 'Private tab', iconName: 'Shield' },
      { id: 'downloads', label: 'Downloads', iconName: 'Download' },
      { id: 'history', label: 'History', iconName: 'Clock' },
      { id: 'bookmarks', label: 'Bookmarks', iconName: 'Bookmark' }
    ]
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: 'Settings',
    description: 'System preferences, personalization and display',
    category: 'system',
    pinned: true,
    running: false,
    defaultWidth: 840,
    defaultHeight: 600,
    minWidth: 580,
    minHeight: 420,
    quickActions: [
      { id: 'wifi', label: 'Wi-Fi & Network', iconName: 'Wifi' },
      { id: 'bluetooth', label: 'Bluetooth', iconName: 'Bluetooth' },
      { id: 'display', label: 'Display & Brightness', iconName: 'Sun' },
      { id: 'sound', label: 'Sound', iconName: 'Volume2' },
      { id: 'personalization', label: 'Personalization', iconName: 'Palette' }
    ]
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: 'Terminal',
    description: 'Command line environment and developer shell',
    category: 'utilities',
    pinned: true,
    running: false,
    defaultWidth: 740,
    defaultHeight: 490,
    minWidth: 520,
    minHeight: 340,
    quickActions: [
      { id: 'new_window', label: 'New Window', iconName: 'SquarePlus' },
      { id: 'clear_screen', label: 'Clear Buffer', iconName: 'Eraser' },
      { id: 'run_sysinfo', label: 'Run sysinfo', iconName: 'Info' }
    ]
  },
  {
    id: 'agent',
    name: 'System Agent',
    icon: 'Sparkles',
    description: 'Autonomous AI system assistant',
    category: 'utilities',
    pinned: true,
    running: false,
    badgeCount: 1,
    defaultWidth: 680,
    defaultHeight: 540,
    minWidth: 500,
    minHeight: 400,
    quickActions: [
      { id: 'agent_brightness', label: 'Set brightness to 60%', iconName: 'Sun' },
      { id: 'agent_bluetooth', label: 'Turn on Bluetooth', iconName: 'Bluetooth' },
      { id: 'agent_downloads', label: 'Open Downloads', iconName: 'Download' },
      { id: 'agent_new_folder', label: 'Create new folder', iconName: 'FolderPlus' }
    ]
  },
  {
    id: 'photos',
    name: 'Photos',
    icon: 'Image',
    description: 'Media gallery and visual studio',
    category: 'media',
    pinned: true,
    running: false,
    defaultWidth: 800,
    defaultHeight: 540,
    minWidth: 520,
    minHeight: 360,
    quickActions: [
      { id: 'view_all', label: 'All Photos', iconName: 'Grid' },
      { id: 'albums', label: 'Albums', iconName: 'FolderImage' }
    ]
  },
  {
    id: 'music',
    name: 'Music',
    icon: 'Music',
    description: 'High-fidelity audio player and ambient generator',
    category: 'media',
    pinned: true,
    running: false,
    defaultWidth: 720,
    defaultHeight: 480,
    minWidth: 520,
    minHeight: 360,
    quickActions: [
      { id: 'now_playing', label: 'Now Playing', iconName: 'Play' },
      { id: 'playlist', label: 'Favorites', iconName: 'Heart' }
    ]
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: 'Calendar',
    description: 'Schedule, events and time management',
    category: 'productivity',
    pinned: true,
    running: false,
    defaultWidth: 780,
    defaultHeight: 540,
    minWidth: 560,
    minHeight: 400,
    quickActions: [
      { id: 'today', label: "Today's Schedule", iconName: 'Calendar' },
      { id: 'upcoming', label: 'Upcoming Events', iconName: 'Clock' },
      { id: 'add_event', label: 'Add Event', iconName: 'Plus' }
    ]
  },
  {
    id: 'installer',
    name: 'Unified App Installer',
    icon: 'Download',
    description: 'Universal installer for Native Linux, Windows, and Android apps',
    category: 'utilities',
    pinned: false,
    running: false,
    defaultWidth: 580,
    defaultHeight: 520,
    minWidth: 480,
    minHeight: 400,
    quickActions: []
  },
  {
    id: 'install-windroid',
    name: 'Install Windroid OS',
    icon: 'HardDrive',
    description: 'System setup and installation visual entry',
    category: 'system',
    pinned: true,
    running: false,
    defaultWidth: 700,
    defaultHeight: 520,
    minWidth: 560,
    minHeight: 440,
    quickActions: [
      { id: 'install_now', label: 'Install Now', iconName: 'ArrowRight' }
    ]
  }
];

export const DESKTOP_SHORTCUTS: DesktopShortcut[] = [
  { id: 'sc_computer', name: 'Computer', type: 'computer', icon: 'HardDrive', appId: 'files' },
  { id: 'sc_documents', name: 'Documents', type: 'documents', icon: 'FileText', appId: 'files' },
  { id: 'sc_install_windroid', name: 'Install Windroid OS', type: 'app', icon: 'HardDrive', appId: 'install-windroid' },
  { id: 'sc_recycle_bin', name: 'Recycle Bin', type: 'recycle_bin', icon: 'Trash2', appId: 'files' }
];

export { WALLPAPERS } from './wallpapers';

export const INITIAL_NOTIFICATIONS: OSNotification[] = [
  {
    id: 'n_1',
    appId: 'agent',
    title: 'Windroid System Agent',
    message: 'Welcome to Windroid OS. Try typing "Open Settings" or "Set brightness to 60%" in universal search.',
    time: 'Just now',
    read: false,
    actionLabel: 'Launch Agent',
    actionPayload: 'open_agent'
  },
  {
    id: 'n_2',
    appId: 'files',
    title: 'Storage Sync Complete',
    message: 'Windroid_Architecture_Spec.md synced to local drive.',
    time: '4m ago',
    read: false,
    actionLabel: 'Open Folder',
    actionPayload: 'open_downloads'
  },
  {
    id: 'n_3',
    appId: 'calendar',
    title: 'Upcoming Meeting',
    message: 'Design System & Desktop Architecture Review in 15 minutes.',
    time: '12m ago',
    read: true,
    actionLabel: 'View Schedule',
    actionPayload: 'open_calendar'
  }
];

export const INITIAL_FILE_SYSTEM: VirtualFile[] = [
  {
    id: 'drive_sys',
    name: 'System Drive (Windroid OS)',
    type: 'folder',
    updatedAt: '2026-08-03',
    icon: 'HardDrive',
    children: [
      {
        id: 'dir_apps',
        name: 'Applications',
        type: 'folder',
        updatedAt: '2026-08-03',
        icon: 'AppWindow',
        children: [
          { id: 'app_f', name: 'Files.app', type: 'file', size: '24 MB', updatedAt: '2026-08-03' },
          { id: 'app_b', name: 'Browser.app', type: 'file', size: '64 MB', updatedAt: '2026-08-03' },
          { id: 'app_s', name: 'Settings.app', type: 'file', size: '18 MB', updatedAt: '2026-08-03' },
          { id: 'app_t', name: 'Terminal.app', type: 'file', size: '12 MB', updatedAt: '2026-08-03' }
        ]
      },
      {
        id: 'dir_users',
        name: 'Users',
        type: 'folder',
        updatedAt: '2026-08-03',
        children: [
          {
            id: 'dir_home',
            name: 'windroid-user',
            type: 'folder',
            updatedAt: '2026-08-03',
            children: [
              {
                id: 'dir_docs',
                name: 'Documents',
                type: 'folder',
                updatedAt: '2026-08-03',
                icon: 'FileText',
                children: [
                  { id: 'doc_1', name: 'Windroid_OS_Architecture_Spec.md', type: 'file', size: '14 KB', updatedAt: '2026-08-03', content: '# Windroid OS Architecture Specification\n\nWindroid OS is a modern operating system built for clean focus, real Linux native execution, and seamless productivity.' },
                  { id: 'doc_2', name: 'Desktop_UX_Principles.pdf', type: 'file', size: '240 KB', updatedAt: '2026-08-02' },
                  { id: 'doc_3', name: 'Project_Roadmap_2026.txt', type: 'file', size: '3.2 KB', updatedAt: '2026-08-01', content: 'Q3 2026: Windroid Native Storage & Linux Bridge\nQ4 2026: Universal Command Palette\nQ1 2027: Multi-device Synchronization' }
                ]
              },
              {
                id: 'dir_downloads',
                name: 'Downloads',
                type: 'folder',
                updatedAt: '2026-08-03',
                icon: 'Download',
                children: [
                  { id: 'dl_1', name: 'windroid-kernel-release-6.12.tar.xz', type: 'file', size: '135 MB', updatedAt: '2026-08-03' },
                  { id: 'dl_2', name: 'design-assets-pack.zip', type: 'file', size: '18 MB', updatedAt: '2026-08-02' }
                ]
              },
              {
                id: 'dir_media',
                name: 'Media',
                type: 'folder',
                updatedAt: '2026-08-03',
                icon: 'Film',
                children: [
                  { id: 'med_1', name: 'Ambient_Soundscape.mp3', type: 'file', size: '4.8 MB', updatedAt: '2026-08-01' },
                  { id: 'med_2', name: 'Desktop_Demo.mp4', type: 'file', size: '42 MB', updatedAt: '2026-07-28' }
                ]
              },
              {
                id: 'dir_workspace',
                name: 'Workspace',
                type: 'folder',
                updatedAt: '2026-08-03',
                icon: 'Code',
                children: [
                  { id: 'ws_1', name: 'src', type: 'folder', updatedAt: '2026-08-03' },
                  { id: 'ws_2', name: 'Makefile', type: 'file', size: '1.2 KB', updatedAt: '2026-08-03' }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'drive_usb',
    name: 'USB Drive (PORTABLE_32GB)',
    type: 'folder',
    updatedAt: '2026-08-03',
    icon: 'Usb',
    children: [
      { id: 'usb_1', name: 'Backup_Configs.tar.gz', type: 'file', size: '4.2 MB', updatedAt: '2026-08-01' }
    ]
  }
];

export const SUGGESTED_AGENT_COMMANDS = [
  'Open Settings',
  'Turn on Bluetooth',
  'Set brightness to 60%',
  'Open Downloads',
  'Play music',
  'Create a new folder'
];
