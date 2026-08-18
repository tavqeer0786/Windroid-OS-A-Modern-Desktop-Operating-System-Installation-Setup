import React, { useState, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';
import { WALLPAPERS, Wallpaper } from '../../../data/wallpapers';
import { ChevronRight, ChevronDown, Palette, Check } from 'lucide-react';

export const PersonalizationBackground: React.FC = () => {
  const { wallpaper, setWallpaper, addNotification } = useOS();

  // Background Type state
  const [backgroundType, setBackgroundType] = useState<string>(() => {
    return localStorage.getItem('aether.os.background_type') || 'Picture';
  });

  // Fit Type state
  const [fitType, setFitType] = useState<string>(() => {
    return localStorage.getItem('aether.os.wallpaper_fit') || 'Fill';
  });

  // Dynamic Theme state
  const [dynamicThemeEnabled, setDynamicThemeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('aether.os.dynamic_theme') === 'true';
  });

  // Recent Images pagination offset index
  const [pageOffset, setPageOffset] = useState<number>(0);

  // Sync choices to localStorage
  useEffect(() => {
    localStorage.setItem('aether.os.background_type', backgroundType);
  }, [backgroundType]);

  useEffect(() => {
    localStorage.setItem('aether.os.wallpaper_fit', fitType);
  }, [fitType]);

  useEffect(() => {
    localStorage.setItem('aether.os.dynamic_theme', String(dynamicThemeEnabled));
  }, [dynamicThemeEnabled]);

  const handleSelectWallpaper = (wpId: string) => {
    setWallpaper(wpId);
  };

  const handleNextPage = () => {
    setPageOffset((prev) => (prev + 1) % Math.max(1, WALLPAPERS.length - 3));
  };

  const handleToggleDynamicTheme = () => {
    const next = !dynamicThemeEnabled;
    setDynamicThemeEnabled(next);
    addNotification({
      title: next ? 'Dynamic Theme Enabled' : 'Dynamic Theme Disabled',
      message: next
        ? 'Windroid OS will automatically adjust UI accents based on active wallpaper.'
        : 'Reverted to standard theme accent.',
      type: 'info'
    });
  };

  // Currently displayed 4 recent images
  const visibleWallpapers = WALLPAPERS.slice(pageOffset, pageOffset + 4);
  // Ensure we always show 4 items
  if (visibleWallpapers.length < 4) {
    const remaining = 4 - visibleWallpapers.length;
    visibleWallpapers.push(...WALLPAPERS.slice(0, remaining));
  }

  // Windroid Logo Emblem
  const WindroidLogoEmblem = () => (
    <svg className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L20 19H15.5L12 11.5L8.5 19H4L12 3Z" fill="#FFFFFF" fillOpacity="0.95" />
      <path d="M12 8L15 14H9L12 8Z" fill="#38BDF8" />
    </svg>
  );

  return (
    <div className="space-y-4 text-xs font-sans select-none max-w-5xl mx-auto pb-8">
      {/* 1. BREADCRUMB (Figma Replica: Personalization > Background) */}
      <div className="flex items-center gap-1.5 text-xs text-[#5F6368] dark:text-slate-400 font-medium">
        <span>Personalization</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-500" />
        <span className="text-[#202124] dark:text-slate-200 font-semibold">Background</span>
      </div>

      {/* 2. PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl font-bold text-[#202124] dark:text-slate-100 tracking-tight">
          Background
        </h1>
        <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
          Personalize your desktop background and slideshow.
        </p>
      </div>

      {/* 3. MAIN TOP SECTION (Grid Layout: Left Preview + Right Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
        {/* LEFT COLUMN: Wallpaper Preview Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div
            className="relative w-full h-full min-h-[220px] sm:min-h-[260px] rounded-2xl overflow-hidden border border-[#E5E7EB] dark:border-slate-800 shadow-sm flex items-center justify-center transition-all duration-300"
            style={wallpaper.style}
          >
            {/* Centered Windroid Logo Icon */}
            <div className="relative z-10 opacity-90 transition-transform duration-300 hover:scale-105">
              <WindroidLogoEmblem />
            </div>

            {/* Floating Desktop Window Preview Overlay in Bottom Right */}
            <div className="absolute right-3.5 bottom-3.5 w-28 sm:w-32 h-20 sm:h-22 bg-white/90 dark:bg-[#202024]/90 backdrop-blur-md rounded-xl p-2.5 border border-white/60 dark:border-slate-700/80 shadow-lg flex flex-col justify-between pointer-events-none">
              {/* Skeleton Document Lines */}
              <div className="space-y-1.5 pt-0.5">
                <div className="w-3/4 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-full h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-5/6 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                <div className="w-1/2 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Solid Accent Button */}
              <div className="w-5 h-2.5 bg-[#0067C0] rounded-xs self-end shadow-2xs" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Settings Controls Panel */}
        <div className="lg:col-span-7 bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-2xs flex flex-col justify-between">
          {/* CONTROL 1: Choose your background */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100">
                Choose your background
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5">
                Select a picture or slideshow for your desktop.
              </div>
            </div>

            <div className="relative shrink-0">
              <select
                value={backgroundType}
                onChange={(e) => setBackgroundType(e.target.value)}
                className="h-9 pl-3.5 pr-8 text-xs font-semibold bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-700 rounded-xl text-[#202124] dark:text-slate-200 focus:outline-none focus:border-[#0067C0] cursor-pointer appearance-none shadow-2xs"
              >
                <option value="Picture">Picture</option>
                <option value="Slideshow">Slideshow</option>
                <option value="Solid Color">Solid Color</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* CONTROL 2: Recent images */}
          <div>
            <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 mb-3">
              Recent images
            </div>

            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {visibleWallpapers.map((wp) => {
                const isSelected = wallpaper.id === wp.id;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleSelectWallpaper(wp.id)}
                    className={`w-20 h-20 sm:w-22 sm:h-22 rounded-xl border-2 transition-all overflow-hidden relative shrink-0 cursor-pointer ${
                      isSelected
                        ? 'border-[#0067C0] ring-2 ring-[#0067C0]/30 shadow-md scale-102'
                        : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-90 hover:opacity-100'
                    }`}
                    style={wp.style}
                    title={wp.name}
                  >
                    {/* Small Checkmark Indicator for Active Wallpaper */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 text-[#0067C0] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Pagination Next Button */}
              <button
                type="button"
                onClick={handleNextPage}
                className="w-8 h-8 rounded-full border border-[#CCCCCC]/80 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-[#5F6368] dark:text-slate-300 hover:text-[#202124] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 shadow-2xs cursor-pointer ml-1"
                title="Next wallpapers"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CONTROL 3: Choose a fit */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-sm font-semibold text-[#202124] dark:text-slate-100">
              Choose a fit
            </div>

            <div className="relative shrink-0">
              <select
                value={fitType}
                onChange={(e) => setFitType(e.target.value)}
                className="h-9 pl-3.5 pr-8 text-xs font-semibold bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-700 rounded-xl text-[#202124] dark:text-slate-200 focus:outline-none focus:border-[#0067C0] cursor-pointer appearance-none shadow-2xs"
              >
                <option value="Fill">Fill</option>
                <option value="Fit">Fit</option>
                <option value="Stretch">Stretch</option>
                <option value="Tile">Tile</option>
                <option value="Center">Center</option>
                <option value="Span">Span</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. RELATED SETTINGS SECTION */}
      <div className="pt-3 space-y-2">
        <div className="text-xs font-bold text-[#202124] dark:text-slate-300">
          Related settings
        </div>

        <div
          onClick={handleToggleDynamicTheme}
          className="p-4 bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-3.5">
            {/* Square/Rounded Accent Tile Icon */}
            <div className="w-9 h-9 flex items-center justify-center text-[#0067C0] dark:text-sky-400 shrink-0 transition-colors">
              <Palette className="w-4 h-4" />
            </div>

            <div>
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 flex items-center gap-2">
                <span>Dynamic themes</span>
                {dynamicThemeEnabled && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5">
                Automatically adjust your theme based on wallpaper.
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
