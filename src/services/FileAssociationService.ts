import { FSNode } from '../components/apps/files/filesystemData';
import { DemoMediaService, ALL_DEMO_MEDIA } from '../system/demo/DemoMediaService';
import { RecentFilesService } from './RecentFilesService';
import { PackageDetectionService } from '../system/installer/PackageDetectionService';

export interface AppLaunchPayload {
  appId: string;
  initialState: any;
}

export class FileAssociationService {
  public static resolveFileOpen(file: FSNode, folderSiblings: FSNode[] = []): AppLaunchPayload {
    RecentFilesService.getInstance().recordFileOpen(file);
    const ext = file.extension?.toLowerCase() || '';
    const demoMeta = DemoMediaService.getInstance().getMetadataByName(file.name);

    // 1. Photos & Image Viewer
    if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'avif', 'ico', 'gif'].includes(ext)) {
      let imageSiblings = folderSiblings
        .filter((s) => ['jpg', 'jpeg', 'png', 'webp', 'svg', 'avif', 'ico', 'gif'].includes(s.extension?.toLowerCase() || ''))
        .map((s) => {
          const m = DemoMediaService.getInstance().getMetadataByName(s.name);
          return {
            id: s.id,
            name: s.name,
            size: s.size,
            modifiedAt: s.modifiedAt,
            metadata: m
          };
        });

      if (imageSiblings.length <= 1) {
        imageSiblings = ALL_DEMO_MEDIA
          .filter((m) => m.category === 'Images' || m.category === 'Wallpapers' || m.category === 'Icons')
          .map((m) => ({
            id: m.id,
            name: m.name,
            size: m.size,
            modifiedAt: m.modifiedAt,
            metadata: m
          }));
      }

      return {
        appId: 'photos',
        initialState: {
          photo: {
            id: file.id,
            name: file.name,
            size: file.size,
            modifiedAt: file.modifiedAt,
            metadata: demoMeta
          },
          playlist: imageSiblings
        }
      };
    }

    // 2. Videos (Photos/Media Player in Video Mode)
    if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
      let videoSiblings = folderSiblings
        .filter((s) => ['mp4', 'webm', 'mov', 'mkv'].includes(s.extension?.toLowerCase() || ''))
        .map((s) => {
          const m = DemoMediaService.getInstance().getMetadataByName(s.name);
          return {
            id: s.id,
            name: s.name,
            size: s.size,
            modifiedAt: s.modifiedAt,
            metadata: m
          };
        });

      if (videoSiblings.length <= 1) {
        videoSiblings = ALL_DEMO_MEDIA
          .filter((m) => m.category === 'Videos')
          .map((m) => ({
            id: m.id,
            name: m.name,
            size: m.size,
            modifiedAt: m.modifiedAt,
            metadata: m
          }));
      }

      return {
        appId: 'photos',
        initialState: {
          videoMode: true,
          video: {
            id: file.id,
            name: file.name,
            size: file.size,
            modifiedAt: file.modifiedAt,
            metadata: demoMeta
          },
          playlist: videoSiblings
        }
      };
    }

    // 3. Audio / Music App
    if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) {
      let audioSiblings = folderSiblings
        .filter((s) => ['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(s.extension?.toLowerCase() || ''))
        .map((s) => {
          const m = DemoMediaService.getInstance().getMetadataByName(s.name);
          return {
            id: s.id,
            title: m?.title || s.name,
            artist: m?.artist || 'Unknown Artist',
            album: m?.album || 'Demo Album',
            duration: m?.duration || '03:15',
            durationSeconds: m?.durationSeconds || 195,
            bitrate: m?.bitrate || '320 kbps',
            sampleRate: m?.sampleRate || '44.1 kHz',
            coverArt: m?.coverArt || 'from-blue-600 to-indigo-600',
            filename: s.name
          };
        });

      if (audioSiblings.length <= 1) {
        audioSiblings = ALL_DEMO_MEDIA
          .filter((m) => m.category === 'Music')
          .map((m) => ({
            id: m.id,
            title: m.title || m.name,
            artist: m.artist || 'Unknown Artist',
            album: m.album || 'Demo Album',
            duration: m.duration || '03:15',
            durationSeconds: m.durationSeconds || 195,
            bitrate: m.bitrate || '320 kbps',
            sampleRate: m.sampleRate || '44.1 kHz',
            coverArt: m.coverArt || 'from-blue-600 to-indigo-600',
            filename: m.name
          }));
      }

      const currentTrack = {
        id: file.id,
        title: demoMeta?.title || file.name,
        artist: demoMeta?.artist || 'Unknown Artist',
        album: demoMeta?.album || 'Demo Album',
        duration: demoMeta?.duration || '03:15',
        durationSeconds: demoMeta?.durationSeconds || 195,
        bitrate: demoMeta?.bitrate || '320 kbps',
        sampleRate: demoMeta?.sampleRate || '44.1 kHz',
        coverArt: demoMeta?.coverArt || 'from-blue-600 to-indigo-600',
        filename: file.name
      };

      return {
        appId: 'music',
        initialState: {
          currentTrack,
          playlist: audioSiblings.length > 0 ? audioSiblings : [currentTrack],
          autoplay: true
        }
      };
    }

    // 4. Documents & Code (Browser Viewer / Editor)
    if (['pdf', 'txt', 'md', 'json', 'html', 'css', 'js'].includes(ext)) {
      return {
        appId: 'browser',
        initialState: {
          docViewer: true,
          doc: {
            id: file.id,
            name: file.name,
            extension: ext,
            content: file.content || demoMeta?.content || '',
            metadata: demoMeta
          }
        }
      };
    }

    // 5. Installers
    if (PackageDetectionService.isSupportedPackage(file.name)) {
      return {
        appId: 'installer',
        initialState: {
          packagePath: `/drive_c/c_users/u_alex/Desktop/${file.name}`
        }
      };
    }

    // Default Fallback
    return {
      appId: 'browser',
      initialState: {
        docViewer: true,
        doc: {
          id: file.id,
          name: file.name,
          extension: ext || 'txt',
          content: file.content || demoMeta?.content || `Binary preview for ${file.name}`
        }
      }
    };
  }
}
