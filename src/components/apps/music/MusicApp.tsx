import React, { useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Music as MusicIcon, 
  Volume2, Disc, Shuffle, Repeat, List, Radio, AudioWaveform
} from 'lucide-react';
import { ALL_DEMO_MEDIA, DemoMediaMetadata } from '../../../system/demo/DemoMediaService';

interface TrackItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds?: number;
  bitrate?: string;
  sampleRate?: string;
  coverArt?: string;
  filename: string;
}

interface MusicAppProps {
  initialState?: {
    currentTrack?: TrackItem;
    playlist?: TrackItem[];
    autoplay?: boolean;
  };
}

export const MusicApp: React.FC<MusicAppProps> = ({ initialState }) => {
  const defaultPlaylist: TrackItem[] = (ALL_DEMO_MEDIA.filter((m) => m.category === 'Music') as DemoMediaMetadata[]).map((m) => ({
    id: m.id,
    title: m.title || m.name,
    artist: m.artist || 'Unknown Artist',
    album: m.album || 'Demo Soundtracks',
    duration: m.duration || '03:15',
    durationSeconds: m.durationSeconds || 195,
    bitrate: m.bitrate || '320 kbps',
    sampleRate: m.sampleRate || '44.1 kHz',
    coverArt: m.coverArt || 'from-rose-600 to-purple-600',
    filename: m.name
  }));

  const activePlaylist = initialState?.playlist && initialState.playlist.length > 0 ? initialState.playlist : defaultPlaylist;
  const initialTrack = initialState?.currentTrack || activePlaylist[0];

  const [playlist, setPlaylist] = useState<TrackItem[]>(activePlaylist);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const idx = activePlaylist.findIndex((t) => t.filename === initialTrack.filename || t.id === initialTrack.id);
    return idx >= 0 ? idx : 0;
  });
  const [isPlaying, setIsPlaying] = useState(initialState?.autoplay || false);
  const [volume, setVolume] = useState(85);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(30);

  const track = playlist[currentTrackIndex] || playlist[0];

  const handleNextTrack = () => {
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * playlist.length);
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev < playlist.length - 1 ? prev + 1 : 0));
    }
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev > 0 ? prev - 1 : playlist.length - 1));
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-950 text-slate-100 select-none">
      {/* Left: Interactive Media Player */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        {/* Album Artwork Disc */}
        <div className="relative group">
          <div
            className={`w-44 h-44 rounded-full bg-gradient-to-tr ${track.coverArt || 'from-rose-600 to-purple-600'} flex items-center justify-center shadow-2xl relative transition-transform duration-300 ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '12s' }}
          >
            <Disc className="w-24 h-24 text-white/30" />
            <div className="w-12 h-12 rounded-full bg-slate-950 border-4 border-slate-800 absolute flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
            </div>
          </div>
        </div>

        {/* Track Title & Metadata Details */}
        <div className="text-center space-y-1 max-w-sm">
          <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <MusicIcon className="w-3 h-3" /> WINDROIDSOUND AUDIO ENGINE
          </div>
          <h3 className="text-base font-bold text-white truncate" title={track.title}>{track.title}</h3>
          <p className="text-xs text-slate-400 truncate">{track.artist} — <span className="text-slate-500">{track.album}</span></p>
          <div className="text-[10px] font-mono text-slate-500 pt-1 flex items-center justify-center gap-3">
            <span>Bitrate: {track.bitrate || '320 kbps'}</span>
            <span>Rate: {track.sampleRate || '44.1 kHz'}</span>
          </div>
        </div>

        {/* Interactive Timeline Progress Bar */}
        <div className="w-full max-w-sm space-y-1.5">
          <div
            className="w-full h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              setPlaybackProgress(pct);
            }}
          >
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full transition-all duration-150"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>{isPlaying ? '01:14' : '00:00'}</span>
            <span>{track.duration}</span>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isShuffle ? 'text-rose-400 bg-rose-500/10' : 'text-slate-500 hover:text-white'
            }`}
            title="Shuffle Playlist"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrevTrack}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="Previous Track"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 rounded-full bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-xl cursor-pointer transition-transform hover:scale-105"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <button
            onClick={handleNextTrack}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isRepeat ? 'text-rose-400 bg-rose-500/10' : 'text-slate-500 hover:text-white'
            }`}
            title="Repeat Track"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right: Active Playlist Drawer */}
      <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
          <span className="flex items-center gap-2">
            <List className="w-4 h-4 text-rose-500" /> Active Playlist ({playlist.length})
          </span>
          <span className="text-[10px] font-mono text-slate-500">DEMO MEDIA</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {playlist.map((item, index) => {
            const isSelected = index === currentTrackIndex;
            return (
              <button
                key={item.id || item.filename}
                onClick={() => {
                  setCurrentTrackIndex(index);
                  setIsPlaying(true);
                }}
                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white font-semibold shadow-md'
                    : 'hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="overflow-hidden flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-800'}`}>
                    <MusicIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="truncate font-semibold text-xs">{item.title}</div>
                    <div className={`text-[10px] truncate ${isSelected ? 'text-rose-100' : 'text-slate-500'}`}>{item.artist}</div>
                  </div>
                </div>
                <span className="font-mono text-[10px] opacity-80 shrink-0 ml-2">{item.duration}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
