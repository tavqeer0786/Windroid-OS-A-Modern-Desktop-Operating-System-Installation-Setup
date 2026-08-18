import React, { useState, useEffect } from 'react';
import { WALLPAPERS } from '../../../data/initialData';
import { 
  Check, ZoomIn, ZoomOut, RotateCw, Play, Pause, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Info, Film, Image as ImageIcon, Maximize2, Minimize2, Sliders
} from 'lucide-react';
import { PhotosIcon } from '../../icons/CustomAppIcons';
import { useOS } from '../../../context/OSContext';

interface PhotosAppProps {
  initialState?: {
    photo?: any;
    videoMode?: boolean;
    video?: any;
    playlist?: any[];
  };
}

export const PhotosApp: React.FC<PhotosAppProps> = ({ initialState }) => {
  const { wallpaper, setWallpaper, addNotification } = useOS();

  const isVideoMode = initialState?.videoMode || false;
  const initialMediaList = initialState?.playlist || (isVideoMode ? [initialState?.video] : WALLPAPERS);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(25);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const activeMedia = initialState?.photo || initialState?.video || initialMediaList[currentIndex] || WALLPAPERS[0];
  const mediaName = activeMedia.name || activeMedia.title || 'Demo Media Item';
  const meta = activeMedia.metadata || {};

  // Slideshow auto-advance timer for image mode
  useEffect(() => {
    if (isSlideshow && !isVideoMode) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev < initialMediaList.length - 1 ? prev + 1 : 0));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isSlideshow, isVideoMode, initialMediaList.length]);

  const handleSetWallpaper = () => {
    const wpId = meta.wallpaperId || activeMedia.id;
    setWallpaper(wpId);
    addNotification({
      title: 'Personalization',
      message: `Set "${mediaName}" as Desktop Wallpaper.`,
      type: 'success'
    });
  };

  const handleNextSpeed = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const idx = speeds.indexOf(playbackSpeed);
    const nextIdx = (idx + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  return (
    <div className={`h-full flex flex-col bg-slate-950 text-slate-100 select-none ${isFullscreen ? 'fixed inset-0 z-[99999]' : ''}`}>
      {/* Top Toolbar */}
      <div className="h-11 px-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {isVideoMode ? <Film className="w-4 h-4 text-purple-400" /> : <PhotosIcon className="w-4 h-4" />}
          <span className="text-xs font-semibold truncate max-w-[200px]">{mediaName}</span>
          {meta.dimensions && (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full hidden sm:inline">
              {meta.dimensions}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isVideoMode && (
            <>
              <button
                onClick={() => setIsSlideshow(!isSlideshow)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSlideshow ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Toggle Slideshow"
              >
                {isSlideshow ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isSlideshow ? 'Slideshow Playing' : 'Slideshow'}</span>
              </button>

              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 25, 200))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {isVideoMode && (
            <button
              onClick={handleNextSpeed}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[11px] font-mono font-bold text-purple-400 cursor-pointer"
              title="Change Playback Speed"
            >
              {playbackSpeed}x
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showInfo ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="File Properties & EXIF"
          >
            <Info className="w-4 h-4" />
          </button>

          {!isVideoMode && (
            <button
              onClick={handleSetWallpaper}
              className="px-3 py-1 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Set as Wallpaper
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Screen */}
      <div className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center p-6">
        {/* Navigation Arrows */}
        {initialMediaList.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : initialMediaList.length - 1))}
              className="absolute left-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white shadow-xl backdrop-blur-md transition-all cursor-pointer"
              title="Previous Item"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev < initialMediaList.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white shadow-xl backdrop-blur-md transition-all cursor-pointer"
              title="Next Item"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Media Container */}
        <div
          className="max-w-3xl w-full h-80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative flex flex-col items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`
          }}
        >
          {isVideoMode ? (
            <div className="w-full h-full bg-slate-900 flex flex-col justify-between p-6 relative">
              <div className="flex items-center justify-between text-xs font-mono text-purple-400">
                <span className="flex items-center gap-2">
                  <Film className="w-4 h-4" /> {meta.codec || 'H.264 / AAC Video Codec'}
                </span>
                <span>{meta.resolution || '1080p Full HD'} ({meta.fps || 60} fps)</span>
              </div>

              {/* Video Playback Center Pulse */}
              <div className="self-center flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-5 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-2xl cursor-pointer transition-transform hover:scale-110"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
                <div className="text-sm font-bold text-white drop-shadow-md">{mediaName}</div>
              </div>

              {/* Video Controls & Timeline Bar */}
              <div className="space-y-2">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  setPlaybackProgress(pct);
                }}>
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-150" style={{ width: `${playbackProgress}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{isPlaying ? '00:42' : '00:00'}</span>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white">
                      {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(Number(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-16 h-1 bg-slate-700 accent-purple-500 rounded-lg cursor-pointer"
                    />
                  </div>

                  <span>{meta.duration || '01:45'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-slate-900 flex items-center justify-center p-6 relative"
              style={activeMedia.style}
            >
              <div className="text-center space-y-2 z-10 bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/10">
                <ImageIcon className="w-10 h-10 text-blue-400 mx-auto" />
                <div className="text-sm font-bold text-white">{mediaName}</div>
                <div className="text-xs text-slate-300 font-mono">{meta.resolution || 'High-Resolution Media Asset'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Sidebar Slideover */}
        {showInfo && (
          <div className="absolute right-4 top-4 bottom-4 w-72 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-4 text-xs space-y-3 backdrop-blur-xl z-30 overflow-y-auto animate-in slide-in-from-right duration-150">
            <div className="font-bold text-sm text-white border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>File EXIF & Details</span>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            
            <div className="space-y-2 font-mono">
              <div>
                <span className="text-slate-500 block">File Name:</span>
                <span className="text-slate-200 font-bold">{mediaName}</span>
              </div>
              {meta.camera && (
                <div>
                  <span className="text-slate-500 block">Camera Specs:</span>
                  <span className="text-slate-200">{meta.camera}</span>
                </div>
              )}
              {meta.dimensions && (
                <div>
                  <span className="text-slate-500 block">Dimensions:</span>
                  <span className="text-slate-200">{meta.dimensions}</span>
                </div>
              )}
              {meta.duration && (
                <div>
                  <span className="text-slate-500 block">Duration:</span>
                  <span className="text-slate-200">{meta.duration}</span>
                </div>
              )}
              {meta.codec && (
                <div>
                  <span className="text-slate-500 block">Video Codec:</span>
                  <span className="text-slate-200">{meta.codec}</span>
                </div>
              )}
              {activeMedia.size && (
                <div>
                  <span className="text-slate-500 block">File Size:</span>
                  <span className="text-slate-200">{activeMedia.size}</span>
                </div>
              )}
              {activeMedia.modifiedAt && (
                <div>
                  <span className="text-slate-500 block">Modified Date:</span>
                  <span className="text-slate-200">{activeMedia.modifiedAt}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
