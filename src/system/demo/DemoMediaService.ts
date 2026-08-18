import { FSNode } from '../../components/apps/files/filesystemData';

export interface DemoMediaMetadata {
  id: string;
  name: string;
  category: 'Images' | 'Videos' | 'Music' | 'Documents' | 'Icons' | 'Wallpapers';
  extension: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
  
  // Specific Metadata
  dimensions?: string;
  resolution?: string;
  camera?: string;
  duration?: string;
  durationSeconds?: number;
  codec?: string;
  fps?: number;
  artist?: string;
  album?: string;
  title?: string;
  bitrate?: string;
  sampleRate?: string;
  coverArt?: string;
  pages?: number;
  encoding?: string;
  language?: string;
  content?: string;
  previewUrl?: string;
  wallpaperId?: string;
}

export const DEMO_MEDIA_STORAGE_KEY = 'windroid.os.demoMedia.v1';
export const LEGACY_DEMO_MEDIA_STORAGE_KEY = 'aether.os.demoMedia.v1';

export const ALL_DEMO_MEDIA: DemoMediaMetadata[] = [
  // ==================== IMAGES ====================
  {
    id: 'dm_img_mountain',
    name: 'Mountain.jpg',
    category: 'Images',
    extension: 'jpg',
    size: '2.4 MB',
    sizeBytes: 2516582,
    createdAt: '2026-07-15',
    modifiedAt: '2026-08-01',
    dimensions: '1920 x 1080',
    resolution: '1920x1080 (2.1 MP)',
    camera: 'Canon EOS R5 (f/2.8, 1/1000s, ISO 100)',
    content: 'Simulated Alpine Mountain Peak Render'
  },
  {
    id: 'dm_img_forest',
    name: 'Forest.png',
    category: 'Images',
    extension: 'png',
    size: '4.1 MB',
    sizeBytes: 4299161,
    createdAt: '2026-07-20',
    modifiedAt: '2026-08-02',
    dimensions: '2560 x 1440',
    resolution: '2560x1440 (3.7 MP)',
    camera: 'Sony A7 IV (f/4.0, 1/500s, ISO 200)',
    content: 'Simulated Emerald Redwood Forest Scene'
  },
  {
    id: 'dm_img_ocean',
    name: 'Ocean.webp',
    category: 'Images',
    extension: 'webp',
    size: '1.8 MB',
    sizeBytes: 1887436,
    createdAt: '2026-07-22',
    modifiedAt: '2026-08-03',
    dimensions: '3840 x 2160',
    resolution: '3840x2160 (8.3 MP)',
    camera: 'DJI Mavic 3 (f/2.8, 1/2000s, ISO 100)',
    content: 'Simulated Aerial Pacific Coast Waves'
  },
  {
    id: 'dm_img_logo',
    name: 'Logo.svg',
    category: 'Images',
    extension: 'svg',
    size: '45 KB',
    sizeBytes: 46080,
    createdAt: '2026-07-24',
    modifiedAt: '2026-08-01',
    dimensions: '512 x 512',
    resolution: '512x512 Vector Graphics',
    camera: 'Vector Asset Studio (Scalable SVG)',
    content: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#2563eb"/></svg>'
  },
  {
    id: 'dm_img_portrait',
    name: 'Portrait.jpeg',
    category: 'Images',
    extension: 'jpeg',
    size: '1.5 MB',
    sizeBytes: 1572864,
    createdAt: '2026-07-25',
    modifiedAt: '2026-08-02',
    dimensions: '1080 x 1350',
    resolution: '1080x1350 (1.5 MP)',
    camera: 'Fujifilm X-T5 (f/1.4, 1/250s, ISO 400)',
    content: 'Simulated Studio Lighting Portrait'
  },
  {
    id: 'dm_img_sunset',
    name: 'Sunset.avif',
    category: 'Images',
    extension: 'avif',
    size: '850 KB',
    sizeBytes: 870400,
    createdAt: '2026-07-29',
    modifiedAt: '2026-08-04',
    dimensions: '1920 x 1080',
    resolution: '1920x1080 (2.1 MP)',
    camera: 'iPhone 15 Pro (f/1.8, 1/120s, ISO 50)',
    content: 'Simulated Sunset Horizon Glow'
  },
  {
    id: 'dm_img_icon',
    name: 'Icon.ico',
    category: 'Images',
    extension: 'ico',
    size: '32 KB',
    sizeBytes: 32768,
    createdAt: '2026-07-30',
    modifiedAt: '2026-08-01',
    dimensions: '256 x 256',
    resolution: '256x256 System Icon',
    camera: 'Icon Renderer',
    content: 'App Icon Binary Representation'
  },
  {
    id: 'dm_img_anim',
    name: 'Animation.gif',
    category: 'Images',
    extension: 'gif',
    size: '3.2 MB',
    sizeBytes: 3355443,
    createdAt: '2026-07-31',
    modifiedAt: '2026-08-03',
    dimensions: '800 x 600',
    resolution: '800x600 Animated GIF',
    camera: 'Motion Renderer (24 fps loop)',
    content: 'Animated Visual Ripple Loop'
  },

  // ==================== VIDEOS ====================
  {
    id: 'dm_vid_intro',
    name: 'Intro.mp4',
    category: 'Videos',
    extension: 'mp4',
    size: '24.5 MB',
    sizeBytes: 25690112,
    createdAt: '2026-07-18',
    modifiedAt: '2026-08-01',
    resolution: '1920 x 1080 (Full HD)',
    duration: '01:45',
    durationSeconds: 105,
    codec: 'H.264 / AAC LC',
    fps: 60,
    content: 'Windroid OS Developer Introduction Video Demo'
  },
  {
    id: 'dm_vid_trailer',
    name: 'Trailer.webm',
    category: 'Videos',
    extension: 'webm',
    size: '48.2 MB',
    sizeBytes: 50541363,
    createdAt: '2026-07-21',
    modifiedAt: '2026-08-02',
    resolution: '3840 x 2160 (4K Ultra HD)',
    duration: '02:30',
    durationSeconds: 150,
    codec: 'VP9 / Opus Audio',
    fps: 60,
    content: 'Windroid OS Product Cinematic Trailer'
  },
  {
    id: 'dm_vid_presentation',
    name: 'Presentation.mov',
    category: 'Videos',
    extension: 'mov',
    size: '110 MB',
    sizeBytes: 115343360,
    createdAt: '2026-07-26',
    modifiedAt: '2026-08-03',
    resolution: '1920 x 1080 (Full HD)',
    duration: '05:15',
    durationSeconds: 315,
    codec: 'Apple ProRes 422 / LPCM',
    fps: 30,
    content: 'Architecture & System Compositor Keynote'
  },
  {
    id: 'dm_vid_sample',
    name: 'Sample.mkv',
    category: 'Videos',
    extension: 'mkv',
    size: '18.8 MB',
    sizeBytes: 19713228,
    createdAt: '2026-07-28',
    modifiedAt: '2026-08-04',
    resolution: '1280 x 720 (HD 720p)',
    duration: '03:10',
    durationSeconds: 190,
    codec: 'HEVC (H.265) / AC3 5.1 Surround',
    fps: 24,
    content: 'High-Efficiency Video Test Sequence'
  },

  // ==================== MUSIC ====================
  {
    id: 'dm_mus_theme',
    name: 'Theme.mp3',
    category: 'Music',
    extension: 'mp3',
    size: '3.5 MB',
    sizeBytes: 3670016,
    createdAt: '2026-07-16',
    modifiedAt: '2026-08-01',
    title: 'Windroid OS Main Theme',
    artist: 'Windroid Soundteam',
    album: 'Windroid OS Soundtrack',
    duration: '03:30',
    durationSeconds: 210,
    bitrate: '320 kbps (VBR)',
    sampleRate: '44.1 kHz Stero',
    coverArt: 'from-blue-600 to-indigo-600'
  },
  {
    id: 'dm_mus_ambient',
    name: 'Ambient.wav',
    category: 'Music',
    extension: 'wav',
    size: '45 MB',
    sizeBytes: 47185920,
    createdAt: '2026-07-22',
    modifiedAt: '2026-08-02',
    title: 'Deep Space Soundscape',
    artist: 'Starlight Waves',
    album: 'Cosmic Ambient Sessions',
    duration: '04:15',
    durationSeconds: 255,
    bitrate: '1411 kbps (Uncompressed LPCM)',
    sampleRate: '48.0 kHz 24-bit',
    coverArt: 'from-purple-600 to-emerald-600'
  },
  {
    id: 'dm_mus_piano',
    name: 'Piano.flac',
    category: 'Music',
    extension: 'flac',
    size: '22 MB',
    sizeBytes: 23068672,
    createdAt: '2026-07-24',
    modifiedAt: '2026-08-03',
    title: 'Midnight Nocturne in C Minor',
    artist: 'Elena Rostova',
    album: 'Solitude Keys',
    duration: '02:55',
    durationSeconds: 175,
    bitrate: '960 kbps (Lossless FLAC)',
    sampleRate: '96.0 kHz 24-bit Hi-Res',
    coverArt: 'from-amber-600 to-rose-600'
  },
  {
    id: 'dm_mus_podcast',
    name: 'Podcast.ogg',
    category: 'Music',
    extension: 'ogg',
    size: '12 MB',
    sizeBytes: 12582912,
    createdAt: '2026-07-27',
    modifiedAt: '2026-08-03',
    title: 'Tech Daily Ep. 42: Modern Operating Systems',
    artist: 'Windroid Dev Podcast',
    album: 'Tech Daily 2026',
    duration: '08:20',
    durationSeconds: 500,
    bitrate: '192 kbps (Vorbis OGG)',
    sampleRate: '44.1 kHz Mono',
    coverArt: 'from-cyan-600 to-blue-700'
  },
  {
    id: 'dm_mus_voice',
    name: 'Voice.m4a',
    category: 'Music',
    extension: 'm4a',
    size: '2.1 MB',
    sizeBytes: 2202009,
    createdAt: '2026-07-30',
    modifiedAt: '2026-08-04',
    title: 'Voice Note 001 - Ideas & Specs',
    artist: 'Alex (User)',
    album: 'Voice Memos',
    duration: '01:12',
    durationSeconds: 72,
    bitrate: '256 kbps (AAC-LC)',
    sampleRate: '44.1 kHz Stereo',
    coverArt: 'from-slate-600 to-slate-800'
  },

  // ==================== DOCUMENTS ====================
  {
    id: 'dm_doc_readme',
    name: 'Readme.txt',
    category: 'Documents',
    extension: 'txt',
    size: '1.8 KB',
    sizeBytes: 1843,
    createdAt: '2026-08-01',
    modifiedAt: '2026-08-04',
    pages: 1,
    encoding: 'UTF-8',
    language: 'Plain Text (English)',
    content: `==================================================
WINDROID OS DEMO MEDIA LIBRARY
==================================================

Welcome to the official Demo Media Library for testing default system applications!

Included Folders:
- Images: Test Photos viewer with zoom, rotate, slideshow
- Videos: Test Video Player controls & playback speeds
- Music: Test Music player queue, shuffle, repeat
- Documents: Test PDF, Text, Markdown, JSON & HTML previews
- Icons: Vector & bitmap icon assets
- Wallpapers: Right-click to set as Desktop Wallpaper

Note: All media assets in this folder are lightweight simulated virtual files built specifically for testing in Windroid OS.`
  },
  {
    id: 'dm_doc_manual',
    name: 'Manual.pdf',
    category: 'Documents',
    extension: 'pdf',
    size: '240 KB',
    sizeBytes: 245760,
    createdAt: '2026-08-02',
    modifiedAt: '2026-08-03',
    pages: 12,
    encoding: 'PDF 1.7 (Portable Document Format)',
    language: 'English (US)',
    content: 'Windroid OS User Guide & Architecture Technical Specification Manual'
  },
  {
    id: 'dm_doc_notes',
    name: 'Notes.md',
    category: 'Documents',
    extension: 'md',
    size: '3.2 KB',
    sizeBytes: 3276,
    createdAt: '2026-08-03',
    modifiedAt: '2026-08-04',
    pages: 2,
    encoding: 'UTF-8',
    language: 'Markdown / GFM',
    content: `# Windroid OS Development Roadmap & Notes

## Key System Modules
- **Compositor Engine**: 60 FPS Window management & smooth transitions
- **Application Compatibility Subsystem**: WinBridge (.exe / .msi) & DroidBridge (.apk)
- **Demo Media System**: Automated virtual test assets for Photos, Music, & Browser

## Guidelines
1. Support full responsive layouts on mobile & desktop.
2. Ensure rich simulated previews for documents and media.`
  },
  {
    id: 'dm_doc_config',
    name: 'Config.json',
    category: 'Documents',
    extension: 'json',
    size: '1.5 KB',
    sizeBytes: 1536,
    createdAt: '2026-08-01',
    modifiedAt: '2026-08-04',
    pages: 1,
    encoding: 'UTF-8',
    language: 'JSON (JavaScript Object Notation)',
    content: `{
  "system": {
    "name": "Windroid OS",
    "version": "1.0.0-dev",
    "kernel": "Linux 6.12.0-windroid-rt",
    "developerMode": true
  },
  "demoMedia": {
    "enabled": true,
    "storageKey": "windroid.os.demoMedia.v1",
    "categories": ["Images", "Videos", "Music", "Documents", "Icons", "Wallpapers"]
  },
  "theme": {
    "accentColor": "#83C8E4",
    "darkMode": true
  }
}`
  },
  {
    id: 'dm_doc_index',
    name: 'Index.html',
    category: 'Documents',
    extension: 'html',
    size: '2.4 KB',
    sizeBytes: 2457,
    createdAt: '2026-08-01',
    modifiedAt: '2026-08-04',
    pages: 2,
    encoding: 'UTF-8',
    language: 'HTML5',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Windroid OS Portal</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    h1 { color: #83c8e4; }
    .card { background: #1e293b; padding: 1.5rem; border-radius: 12px; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to Windroid OS Web Portal</h1>
    <p>A next-generation desktop operating system simulator built with React, TypeScript, and Tailwind CSS.</p>
  </div>
</body>
</html>`
  },
  {
    id: 'dm_doc_style',
    name: 'Style.css',
    category: 'Documents',
    extension: 'css',
    size: '1.8 KB',
    sizeBytes: 1843,
    createdAt: '2026-08-01',
    modifiedAt: '2026-08-03',
    pages: 2,
    encoding: 'UTF-8',
    language: 'CSS3',
    content: `/* Windroid OS Core Design System Tokens */
:root {
  --primary-accent: #83C8E4;
  --bg-dark: #090d16;
  --bg-card: #111827;
  --border-subtle: rgba(255, 255, 255, 0.1);
}

.os-window {
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
}`
  },
  {
    id: 'dm_doc_script',
    name: 'Script.js',
    category: 'Documents',
    extension: 'js',
    size: '2.1 KB',
    sizeBytes: 2150,
    createdAt: '2026-08-01',
    modifiedAt: '2026-08-04',
    pages: 3,
    encoding: 'UTF-8',
    language: 'JavaScript (ES2026)',
    content: `// Windroid OS Runtime Initializer
console.log('Initializing Windroid System Runtime...');

export function bootSystem() {
  const status = {
    kernel: 'Linux 6.12.0',
    status: 'ONLINE',
    demoMedia: 'ACTIVE'
  };
  return status;
}

bootSystem();`
  },

  // ==================== ICONS ====================
  {
    id: 'dm_ico_folder',
    name: 'Folder.ico',
    category: 'Icons',
    extension: 'ico',
    size: '28 KB',
    sizeBytes: 28672,
    createdAt: '2026-07-20',
    modifiedAt: '2026-08-01',
    dimensions: '256 x 256',
    resolution: '256x256 System Folder Icon'
  },
  {
    id: 'dm_ico_app',
    name: 'App.svg',
    category: 'Icons',
    extension: 'svg',
    size: '12 KB',
    sizeBytes: 12288,
    createdAt: '2026-07-22',
    modifiedAt: '2026-08-01',
    dimensions: '512 x 512',
    resolution: '512x512 Vector App Badge'
  },
  {
    id: 'dm_ico_logo',
    name: 'Logo.png',
    category: 'Icons',
    extension: 'png',
    size: '340 KB',
    sizeBytes: 348160,
    createdAt: '2026-07-25',
    modifiedAt: '2026-08-02',
    dimensions: '1024 x 1024',
    resolution: '1024x1024 High-Res Logo Asset'
  },

  // ==================== WALLPAPERS ====================
  {
    id: 'dm_wall_aurora',
    name: 'Aurora.jpg',
    category: 'Wallpapers',
    extension: 'jpg',
    size: '4.5 MB',
    sizeBytes: 4718592,
    createdAt: '2026-07-10',
    modifiedAt: '2026-08-01',
    dimensions: '3840 x 2160 (4K)',
    resolution: '3840x2160 (8.3 MP)',
    wallpaperId: 'demo_wallpaper_aurora',
    content: 'Vibrant Northern Lights Emerald & Violet Sky'
  },
  {
    id: 'dm_wall_glass',
    name: 'Glass.png',
    category: 'Wallpapers',
    extension: 'png',
    size: '3.8 MB',
    sizeBytes: 3984588,
    createdAt: '2026-07-12',
    modifiedAt: '2026-08-01',
    dimensions: '3840 x 2160 (4K)',
    resolution: '3840x2160 (8.3 MP)',
    wallpaperId: 'demo_wallpaper_glass',
    content: 'Modern Frosted Prism Glass Gradient'
  },
  {
    id: 'dm_wall_midnight',
    name: 'Midnight.webp',
    category: 'Wallpapers',
    extension: 'webp',
    size: '2.9 MB',
    sizeBytes: 3040870,
    createdAt: '2026-07-15',
    modifiedAt: '2026-08-02',
    dimensions: '3840 x 2160 (4K)',
    resolution: '3840x2160 (8.3 MP)',
    wallpaperId: 'demo_wallpaper_midnight',
    content: 'Deep Space Starry Velvet Night'
  },
  {
    id: 'dm_wall_sunrise',
    name: 'Sunrise.avif',
    category: 'Wallpapers',
    extension: 'avif',
    size: '2.2 MB',
    sizeBytes: 2306867,
    createdAt: '2026-07-18',
    modifiedAt: '2026-08-03',
    dimensions: '3840 x 2160 (4K)',
    resolution: '3840x2160 (8.3 MP)',
    wallpaperId: 'demo_wallpaper_sunrise',
    content: 'Golden Horizon Dawn Sunlight'
  }
];

export interface DemoMediaStorageState {
  deletedItemNames: string[];
}

export class DemoMediaService {
  private static instance: DemoMediaService;

  public static getInstance(): DemoMediaService {
    if (!DemoMediaService.instance) {
      DemoMediaService.instance = new DemoMediaService();
    }
    return DemoMediaService.instance;
  }

  public isDemoEnabled(developerMode: boolean): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return developerMode;
  }

  public getStorageState(): DemoMediaStorageState {
    try {
      const raw = localStorage.getItem(DEMO_MEDIA_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse demo media storage state:', err);
    }
    return { deletedItemNames: [] };
  }

  public saveStorageState(state: DemoMediaStorageState): void {
    try {
      localStorage.setItem(DEMO_MEDIA_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save demo media storage state:', err);
    }
  }

  public markItemDeleted(filename: string): void {
    const state = this.getStorageState();
    if (!state.deletedItemNames.includes(filename)) {
      state.deletedItemNames.push(filename);
      this.saveStorageState(state);
    }
  }

  public resetAllDemoMedia(): void {
    this.saveStorageState({ deletedItemNames: [] });
  }

  public getMetadataByName(filename: string): DemoMediaMetadata | undefined {
    const clean = filename.toLowerCase();
    return ALL_DEMO_MEDIA.find((m) => m.name.toLowerCase() === clean);
  }

  public convertToFSNode(media: DemoMediaMetadata, parentId: string): FSNode {
    return {
      id: media.id,
      name: media.name,
      type: 'file',
      extension: media.extension,
      size: media.size,
      sizeBytes: media.sizeBytes,
      parentId,
      createdAt: media.createdAt,
      modifiedAt: media.modifiedAt,
      content: media.content,
      canDelete: true,
      canMove: true,
      canCopy: true,
      canRename: true,
      canModify: true
    };
  }

  public syncDemoMediaFolder(nodes: FSNode[], developerMode: boolean): FSNode[] {
    const isDev = this.isDemoEnabled(developerMode);

    // Desktop node
    const desktopFolder = this.findFolder(nodes, 'u_alex_desktop', 'Desktop');
    if (!desktopFolder) return nodes;

    const folderIndex = desktopFolder.children?.findIndex(
      (child) => child.id === 'u_alex_desktop_demo_media' || child.name === 'Demo Media'
    );

    if (!isDev) {
      // Disabled in production / devMode OFF -> remove Demo Media folder
      if (folderIndex !== undefined && folderIndex >= 0 && desktopFolder.children) {
        desktopFolder.children.splice(folderIndex, 1);
      }
      return nodes;
    }

    // DevMode ON -> ensure Demo Media root folder exists
    const storageState = this.getStorageState();

    let demoMediaFolder: FSNode;
    if (folderIndex !== undefined && folderIndex >= 0 && desktopFolder.children) {
      demoMediaFolder = desktopFolder.children[folderIndex];
    } else {
      demoMediaFolder = {
        id: 'u_alex_desktop_demo_media',
        name: 'Demo Media',
        type: 'folder',
        parentId: desktopFolder.id,
        createdAt: '2026-08-01',
        modifiedAt: '2026-08-04',
        canDelete: true,
        canMove: true,
        canCopy: true,
        canRename: true,
        children: []
      };
      if (!desktopFolder.children) desktopFolder.children = [];
      desktopFolder.children.unshift(demoMediaFolder);
    }

    if (!demoMediaFolder.children) demoMediaFolder.children = [];

    // Categories: Images, Videos, Music, Documents, Icons, Wallpapers
    const categories: DemoMediaMetadata['category'][] = ['Images', 'Videos', 'Music', 'Documents', 'Icons', 'Wallpapers'];

    categories.forEach((catName) => {
      const catFolderId = `dm_cat_${catName.toLowerCase()}`;
      let catFolder = demoMediaFolder.children!.find((c) => c.id === catFolderId || c.name === catName);

      if (!catFolder) {
        catFolder = {
          id: catFolderId,
          name: catName,
          type: 'folder',
          parentId: demoMediaFolder.id,
          createdAt: '2026-08-01',
          modifiedAt: '2026-08-04',
          canDelete: true,
          canMove: true,
          canCopy: true,
          canRename: true,
          children: []
        };
        demoMediaFolder.children!.push(catFolder);
      }

      if (!catFolder.children) catFolder.children = [];

      // Items in this category
      const itemsInCat = ALL_DEMO_MEDIA.filter((m) => m.category === catName);
      itemsInCat.forEach((media) => {
        if (storageState.deletedItemNames.includes(media.name)) {
          catFolder!.children = catFolder!.children!.filter((child) => child.name !== media.name);
        } else {
          const existingIdx = catFolder!.children!.findIndex((child) => child.name === media.name);
          const nodeToAdd = this.convertToFSNode(media, catFolder!.id);
          if (existingIdx >= 0) {
            catFolder!.children![existingIdx] = {
              ...catFolder!.children![existingIdx],
              ...nodeToAdd
            };
          } else {
            catFolder!.children!.push(nodeToAdd);
          }
        }
      });
    });

    return nodes;
  }

  private findFolder(nodes: FSNode[], id: string, name: string): FSNode | null {
    for (const node of nodes) {
      if (node.id === id || node.name === name) return node;
      if (node.children) {
        const found = this.findFolder(node.children, id, name);
        if (found) return found;
      }
    }
    return null;
  }
}
