import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { AppId } from '../../types/os';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Search, Sparkles, 
  ArrowRight, FileText, X
} from 'lucide-react';
import { FilesIcon, SettingsIcon, PhotosIcon, MusicIcon, TerminalIcon, CalendarIcon, BrowserIcon } from '../icons/CustomAppIcons';
import { InstalledAppRegistry } from '../../system/apps/InstalledAppRegistry';
import { Monitor, Smartphone, Terminal as TerminalIcon2, Layers, Download, FolderArchive } from 'lucide-react';
import { DemoPackageService, ALL_DEMO_PACKAGES } from '../../system/demo/DemoPackageService';
import { DemoMediaService, ALL_DEMO_MEDIA } from '../../system/demo/DemoMediaService';
import { FileAssociationService } from '../../services/FileAssociationService';
import { PackageDetectionService } from '../../system/runtime/PackageDetectionService';

export const UniversalSearch: React.FC = () => {
  const { 
    apps, 
    getAllApps,
    openApp, 
    isUniversalSearchOpen, 
    closeAllPanels,
    sendAgentMessage,
    developerMode
  } = useOS();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isUniversalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isUniversalSearchOpen]);

  const isDemoEnabled = DemoPackageService.getInstance().isDemoEnabled(developerMode);
  const q = query.trim().toLowerCase();
  const demoState = DemoPackageService.getInstance().getStorageState();

  const isDemoFolderMatch = isDemoEnabled && q && ('demo packages'.includes(q) || 'packages'.includes(q));

  const matchingDemoPackages = isDemoEnabled && q ? ALL_DEMO_PACKAGES.filter((pkg) => {
    if (demoState.deletedItemNames.includes(pkg.name)) return false;
    return (
      pkg.name.toLowerCase().includes(q) ||
      pkg.extension.toLowerCase().includes(q) ||
      pkg.packageType.toLowerCase().includes(q) ||
      pkg.runtime.toLowerCase().includes(q) ||
      pkg.publisher.toLowerCase().includes(q)
    );
  }) : [];

  const isDemoMediaFolderMatch = isDemoEnabled && q && ('demo media'.includes(q) || 'media'.includes(q));
  const mediaStorageState = DemoMediaService.getInstance().getStorageState();

  const matchingDemoMedia = isDemoEnabled && q ? ALL_DEMO_MEDIA.filter((item) => {
    if (mediaStorageState.deletedItemNames.includes(item.name)) return false;
    const cat = item.category.toLowerCase();
    const ext = item.extension.toLowerCase();
    const name = item.name.toLowerCase();
    const content = (item.content || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const artist = (item.artist || '').toLowerCase();

    if (q === 'wallpaper' || q === 'wallpapers') return cat === 'wallpapers';
    return (
      name.includes(q) ||
      ext.includes(q) ||
      cat.includes(q) ||
      content.includes(q) ||
      title.includes(q) ||
      artist.includes(q)
    );
  }) : [];

  const combinedApps = getAllApps();

  const filteredApps = combinedApps.filter(a => 
    a.name.toLowerCase().includes(query.toLowerCase()) || 
    a.description.toLowerCase().includes(query.toLowerCase())
  );

  const mockFiles = [
    { name: 'Windroid_OS_Architecture_Spec.md', path: 'Documents/Windroid_OS_Architecture_Spec.md', appId: 'files' as AppId },
    { name: 'linux-kernel-6.12.tar.xz', path: 'Downloads/linux-kernel-6.12.tar.xz', appId: 'files' as AppId },
    { name: 'Desktop_UX_Principles.pdf', path: 'Documents/Desktop_UX_Principles.pdf', appId: 'files' as AppId }
  ].filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.path.toLowerCase().includes(query.toLowerCase()));

  const mockSettings = [
    { name: 'Wi-Fi & Network Settings', path: 'Settings > Network', action: () => openApp('settings', { tab: 'wifi' }) },
    { name: 'Display Brightness & Night Light', path: 'Settings > Display', action: () => openApp('settings', { tab: 'display' }) },
    { name: 'Personalization & Wallpapers', path: 'Settings > Personalization', action: () => openApp('settings', { tab: 'personalization' }) },
    { name: 'Developer & Terminal Configuration', path: 'Settings > System', action: () => openApp('settings', { tab: 'system' }) }
  ].filter(s => s.name.toLowerCase().includes(query.toLowerCase()));

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Folder': return <FilesIcon className="w-4 h-4" />;
      case 'Globe': return <BrowserIcon className="w-4 h-4" />;
      case 'Settings': return <SettingsIcon className="w-4 h-4" />;
      case 'Terminal': return <TerminalIcon className="w-4 h-4" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'Image': return <PhotosIcon className="w-4 h-4" />;
      case 'Music': return <MusicIcon className="w-4 h-4" />;
      case 'Calendar': return <CalendarIcon className="w-4 h-4" />;
      default: return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isUniversalSearchOpen && (
        <motion.div 
          key="universal-search-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeAllPanels}
          className="fixed inset-0 z-[9999] bg-slate-950/40 flex items-start justify-center pt-24 p-4"
        >
          <motion.div 
            key="universal-search-modal"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 shadow-os-window rounded-[20px] max-w-xl w-full p-4 text-slate-900 dark:text-slate-100 backdrop-blur-2xl flex flex-col gap-3 select-none"
          >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-white/5 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search apps, files, system preferences, or AI actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-medium focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
          {/* Applications */}
          {filteredApps.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Applications</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      openApp(app.id);
                      closeAllPanels();
                    }}
                    className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-blue-600 hover:text-white transition-all text-left flex items-center gap-3 cursor-pointer group border border-slate-100 dark:border-white/5"
                  >
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 group-hover:bg-white/20 shadow-2xs">
                      {renderIcon(app.icon)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate">{app.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-blue-100 truncate">{app.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Demo Packages & Developer Test Packages */}
          {(isDemoFolderMatch || matchingDemoPackages.length > 0) && (
            <div className="space-y-1.5">
              <div className="px-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center justify-between">
                <span>Demo Packages (Dev)</span>
                <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-mono">DEVELOPER MODE</span>
              </div>
              <div className="space-y-1">
                {isDemoFolderMatch && (
                  <button
                    onClick={() => {
                      openApp('files', { initialPath: 'Desktop > Demo Packages' });
                      closeAllPanels();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-left flex items-center justify-between text-xs cursor-pointer border border-amber-200/50 dark:border-amber-800/30"
                  >
                    <span className="flex items-center gap-2 truncate font-bold text-slate-900 dark:text-white">
                      <FolderArchive className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">Demo Packages (Virtual Folder)</span>
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold shrink-0 ml-2">Desktop &gt; Demo Packages</span>
                  </button>
                )}
                {matchingDemoPackages.map((pkg) => {
                  const detection = PackageDetectionService.detectPackage(pkg.name);
                  const isSupported = detection.supported;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => {
                        closeAllPanels();
                        if (isSupported) {
                          openApp('installer', { packagePath: `/drive_c/c_users/u_alex/Desktop/Demo Packages/${pkg.name}` });
                        } else {
                          openApp('files', { initialPath: 'Desktop > Demo Packages' });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs cursor-pointer border border-slate-100 dark:border-white/5"
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        {pkg.runtime === 'Windows' ? (
                          <Monitor className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : pkg.runtime === 'Android' ? (
                          <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : pkg.runtime === 'Native Linux' ? (
                          <TerminalIcon2 className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate text-slate-800 dark:text-slate-200 font-semibold">{pkg.name}</span>
                        <span className="text-[10px] text-slate-400">({pkg.packageType})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{pkg.estimatedSize}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Demo Media */}
          {(isDemoMediaFolderMatch || matchingDemoMedia.length > 0) && (
            <div className="space-y-1.5">
              <div className="px-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center justify-between">
                <span>Demo Media & Assets</span>
                <span className="text-[9px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full font-mono">MEDIA LIBRARY</span>
              </div>
              <div className="space-y-1">
                {isDemoMediaFolderMatch && (
                  <button
                    onClick={() => {
                      openApp('files', { initialPath: 'Desktop > Demo Media' });
                      closeAllPanels();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-left flex items-center justify-between text-xs cursor-pointer border border-blue-200/50 dark:border-blue-800/30"
                  >
                    <span className="flex items-center gap-2 truncate font-bold text-slate-900 dark:text-white">
                      <FilesIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate">Demo Media (Virtual Folder)</span>
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0 ml-2">Desktop &gt; Demo Media</span>
                  </button>
                )}
                {matchingDemoMedia.map((media) => {
                  const node = DemoMediaService.getInstance().convertToFSNode(media, 'dm_search');
                  const payload = FileAssociationService.resolveFileOpen(node, []);
                  return (
                    <button
                      key={media.id}
                      onClick={() => {
                        closeAllPanels();
                        openApp(payload.appId as any, payload.initialState);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs cursor-pointer border border-slate-100 dark:border-white/5"
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        <span className="text-blue-500 font-mono text-[10px] uppercase font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">
                          .{media.extension}
                        </span>
                        <span className="truncate text-slate-800 dark:text-slate-200 font-semibold">{media.name}</span>
                        <span className="text-[10px] text-slate-400">({media.category})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{media.size}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files */}
          {mockFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Files & Storage</div>
              <div className="space-y-1">
                {mockFiles.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => {
                      openApp('files', { initialPath: 'Documents' });
                      closeAllPanels();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs cursor-pointer border border-slate-100 dark:border-white/5"
                  >
                    <span className="flex items-center gap-2 truncate font-medium">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate text-slate-800 dark:text-slate-200">{f.name}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{f.path}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {mockSettings.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">System Preferences</div>
              <div className="space-y-1">
                {mockSettings.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => {
                      s.action();
                      closeAllPanels();
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs cursor-pointer border border-slate-100 dark:border-white/5"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <SettingsIcon className="w-4 h-4 shrink-0" />
                      <span className="text-slate-800 dark:text-slate-200">{s.name}</span>
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{s.path}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Agent Command Trigger */}
          {query.trim() && (
            <button
              onClick={() => {
                sendAgentMessage(query);
                closeAllPanels();
              }}
              className="w-full p-3 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-between hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-xs"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Execute Agent Action: "{query}"</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
