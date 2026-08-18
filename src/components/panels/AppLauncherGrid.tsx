import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { AppId } from '../../types/os';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Search, Sparkles, X, ChevronRight, ChevronLeft, 
  Power, Moon, RotateCw, FileText, Folder, Palette, Terminal as TerminalLucide,
  ArrowRight, Clock, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { 
  FilesIcon, SettingsIcon, PhotosIcon, MusicIcon, 
  TerminalIcon, CalendarIcon, BrowserIcon 
} from '../icons/CustomAppIcons';
import { InstalledAppRegistry } from '../../system/apps/InstalledAppRegistry';
import { Monitor, Smartphone, Terminal as TerminalIcon2, Layers, Download } from 'lucide-react';

export const AppLauncherGrid: React.FC = () => {
  const { 
    apps, 
    pinnedAppIds,
    getAppMetadata,
    getAllApps,
    openApp, 
    isAppLauncherOpen, 
    closeAllPanels,
    addNotification,
    sendAgentMessage
  } = useOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'start' | 'allApps'>('start');
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when launcher opens or closes
  useEffect(() => {
    if (isAppLauncherOpen) {
      setCurrentView('start');
      setSearchQuery('');
      setIsPowerMenuOpen(false);
      // Auto-focus search field
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isAppLauncherOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAppLauncherOpen) {
        closeAllPanels();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAppLauncherOpen, closeAllPanels]);

  // Pinned Apps from OS Context
  const pinnedApps = pinnedAppIds
    .map((id) => getAppMetadata(id))
    .filter(Boolean);

  // All Apps from OS Context
  const combinedApps = getAllApps();

  // Sorted All Apps (Alphabetical)
  const sortedApps = [...combinedApps].sort((a, b) => a.name.localeCompare(b.name));

  // Categorize Android / APK vs Windows / .exe / System apps
  const isAndroidApp = (app: { id: string; name: string; description?: string }) => {
    const installed = InstalledAppRegistry.getInstance().getById(app.id);
    if (installed?.runtime === 'android') return true;
    if (installed?.packageName) return true;
    const id = app.id.toLowerCase();
    const name = app.name.toLowerCase();
    const desc = (app.description || '').toLowerCase();
    return (
      id.includes('apk') ||
      id.includes('android') ||
      name.includes('.apk') ||
      name.includes('android') ||
      desc.includes('android') ||
      desc.includes('droidbridge') ||
      desc.includes('apk')
    );
  };

  const windowsApps = [...combinedApps]
    .filter((a) => !isAndroidApp(a))
    .sort((a, b) => a.name.localeCompare(b.name));

  const androidApps = [...combinedApps]
    .filter((a) => isAndroidApp(a))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Search Filtering
  const isSearchActive = searchQuery.trim().length > 0;
  const filteredApps = combinedApps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mockFiles = [
    { name: 'Windroid_OS_Architecture_Spec.md', path: 'Documents', time: '10m ago', appId: 'files' as AppId },
    { name: 'linux-kernel-6.12.tar.xz', path: 'Downloads', time: '1h ago', appId: 'files' as AppId },
    { name: 'Desktop_UX_Principles.pdf', path: 'Documents', time: 'Yesterday', appId: 'files' as AppId }
  ].filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const mockSettings = [
    { name: 'Personalization & Wallpapers', path: 'Settings > Personalization', time: '5m ago', action: () => openApp('settings', { tab: 'personalization' }) },
    { name: 'Display & Brightness Settings', path: 'Settings > Display', time: '15m ago', action: () => openApp('settings', { tab: 'display' }) },
    { name: 'Wi-Fi & Network Configuration', path: 'Settings > Network', time: '1h ago', action: () => openApp('settings', { tab: 'wifi' }) }
  ].filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Render OS App Icon
  const renderAppIcon = (iconName: string, sizeClass = "w-7 h-7") => {
    switch (iconName) {
      case 'Folder': return <FilesIcon className={sizeClass} />;
      case 'Globe': return <BrowserIcon className={sizeClass} />;
      case 'Settings': return <SettingsIcon className={sizeClass} />;
      case 'Terminal': return <TerminalIcon className={sizeClass} />;
      case 'Sparkles': return <Sparkles className={`${sizeClass} text-blue-500 dark:text-blue-400`} />;
      case 'Image': return <PhotosIcon className={sizeClass} />;
      case 'Music': return <MusicIcon className={sizeClass} />;
      case 'Calendar': return <CalendarIcon className={sizeClass} />;
      case 'Download': return <Download className={`${sizeClass} text-blue-500`} />;
      case 'Layers': return <Layers className={`${sizeClass} text-indigo-500`} />;
      case 'Monitor': return <Monitor className={`${sizeClass} text-blue-500`} />;
      case 'Smartphone': return <Smartphone className={`${sizeClass} text-purple-500`} />;
      default: return <FilesIcon className={sizeClass} />;
    }
  };

  // Recommended Recent Items
  const recentItems = [
    {
      id: 'rec_1',
      title: 'Windroid_OS_Architecture_Spec.md',
      location: 'Documents',
      time: '10m ago',
      icon: <FileText className="w-4 h-4 text-amber-500" />,
      action: () => openApp('files', { initialPath: 'Documents' })
    },
    {
      id: 'rec_2',
      title: 'Personalization & Wallpapers',
      location: 'Settings',
      time: '25m ago',
      icon: <Palette className="w-4 h-4 text-purple-500" />,
      action: () => openApp('settings', { tab: 'personalization' })
    },
    {
      id: 'rec_3',
      title: 'Downloads / linux-kernel-6.12',
      location: 'Downloads',
      time: '1h ago',
      icon: <Folder className="w-4 h-4 text-blue-500" />,
      action: () => openApp('files', { initialPath: 'Downloads' })
    },
    {
      id: 'rec_4',
      title: 'Terminal Active Session',
      location: 'Dev Shell',
      time: '2h ago',
      icon: <TerminalLucide className="w-4 h-4 text-emerald-500" />,
      action: () => openApp('terminal')
    }
  ];

  // Power Menu Actions
  const handlePowerAction = (action: 'sleep' | 'restart' | 'shutdown') => {
    setIsPowerMenuOpen(false);
    closeAllPanels();

    if (action === 'sleep') {
      addNotification({
        title: 'System Power',
        message: 'Windroid OS is entering sleep mode.',
        type: 'info'
      });
    } else if (action === 'restart') {
      addNotification({
        title: 'System Power',
        message: 'Restarting Windroid OS environment...',
        type: 'warning'
      });
    } else if (action === 'shutdown') {
      addNotification({
        title: 'System Power',
        message: 'Shutting down Windroid OS session.',
        type: 'alert'
      });
    }
  };

  return (
    <AnimatePresence>
      {isAppLauncherOpen && (
        <>
          {/* Invisible Overlay for Outside Clicks (No desktop blur or dimming) */}
          <motion.div 
            key="app-launcher-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeAllPanels}
            className="fixed inset-0 z-[9990] bg-transparent cursor-default"
          />

          {/* Start Menu Panel (Floating directly above Dock with slide-top on open, slide-bottom on close) */}
          <motion.div 
            key="app-launcher-panel"
            initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.97 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ 
              opacity: 0, 
              y: 50, 
              x: '-50%', 
              scale: 0.97,
              transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] }
            }}
            transition={{ 
              type: 'spring',
              stiffness: 360,
              damping: 28,
              mass: 0.7
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (isPowerMenuOpen) setIsPowerMenuOpen(false);
            }}
            className="fixed bottom-[104px] left-1/2 z-[9995] w-[640px] max-w-[92vw] h-[580px] max-h-[calc(100vh-140px)] rounded-[5px] bg-white/90 dark:bg-slate-900/85 backdrop-blur-3xl backdrop-saturate-150 border border-white dark:border-white/20 shadow-2xl shadow-black/20 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 select-none"
          >
        {/* Top Search Field */}
        <div className="p-4 pb-3 border-b border-white/30 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[12px] bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/60 transition-all shadow-inner">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search apps, files and settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-medium focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-[4px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle Main Content */}
        <div className={`flex-1 ${currentView === 'allApps' && !isSearchActive ? 'flex flex-col min-h-0 overflow-hidden' : 'overflow-y-auto custom-scrollbar'} px-6 py-4`}>
          {/* SEARCH MODE */}
          {isSearchActive ? (
            filteredApps.length + mockFiles.length + mockSettings.length === 0 ? (
              <div className="py-16 text-center text-sm font-medium text-slate-800 dark:text-slate-100">
                Result not found
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Search Results ({filteredApps.length + mockFiles.length + mockSettings.length})
                </div>

                {/* Apps */}
                {filteredApps.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Applications</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredApps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            openApp(app.id);
                            closeAllPanels();
                          }}
                          className="p-2.5 rounded-[4px] hover:bg-white/40 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-100 transition-all text-left flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="p-1 rounded-[4px] shrink-0">
                            {renderAppIcon(app.icon, "w-7 h-7")}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{app.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {mockFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Files</div>
                    <div className="space-y-1">
                      {mockFiles.map((f) => (
                        <button
                          key={f.name}
                          onClick={() => {
                            openApp('files', { initialPath: f.path });
                            closeAllPanels();
                          }}
                          className="w-full px-3 py-2 rounded-[4px] bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs cursor-pointer border border-slate-200/50 dark:border-white/5"
                        >
                          <span className="flex items-center gap-2 truncate font-medium">
                            <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{f.path} • {f.time}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings */}
                {mockSettings.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Settings</div>
                    <div className="space-y-1">
                      {mockSettings.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => {
                            s.action();
                            closeAllPanels();
                          }}
                          className="w-full px-3 py-2 rounded-[4px] bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center justify-between text-xs cursor-pointer border border-slate-200/50 dark:border-white/5"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <SettingsIcon className="w-4 h-4 shrink-0" />
                            <span>{s.name}</span>
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{s.path}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : currentView === 'allApps' ? (
            /* ALL APPS VIEW - DUAL COLUMN WITH INDEPENDENT SCROLLBARS */
            <motion.div 
              key="all-apps-view"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex flex-col h-full min-h-0 space-y-3"
            >
              <div className="flex items-center justify-between pb-1 shrink-0">
                <button
                  onClick={() => setCurrentView('start')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1 rounded-[4px] hover:bg-white/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Pinned
                </button>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Applications</span>
              </div>

              {/* Dual Column Layout with Center Vertical Divider */}
              <div className="flex-1 min-h-0 flex gap-4 items-stretch pt-1">
                {/* Left Side: Desktop Apps (Scrollbar on Left side) */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0">
                  <div className="flex items-center gap-2 px-1 pb-2 border-b border-slate-200/50 dark:border-white/10 shrink-0">
                    <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider truncate">
                      Desktop Apps ({windowsApps.length})
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-1 pb-1 pr-1 pl-1.5 [direction:rtl]">
                    <div className="space-y-1 [direction:ltr]">
                      {windowsApps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            openApp(app.id);
                            closeAllPanels();
                          }}
                          className="w-full p-2 rounded-[4px] hover:bg-white/40 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-100 transition-all text-left flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="p-1 rounded-[4px] shrink-0">
                            {renderAppIcon(app.icon, "w-7 h-7")}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{app.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center Vertical Divider */}
                <div className="w-px bg-slate-300/60 dark:bg-white/15 my-1 self-stretch shrink-0" />

                {/* Right Side: Android Apps (Scrollbar on Right side) */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0">
                  <div className="flex items-center gap-2 px-1 pb-2 border-b border-slate-200/50 dark:border-white/10 shrink-0">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider truncate">
                      Android Apps ({androidApps.length})
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-1 pb-1 pl-1 pr-1.5 [direction:ltr]">
                    <div className="space-y-1">
                      {androidApps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            openApp(app.id);
                            closeAllPanels();
                          }}
                          className="w-full p-2 rounded-[4px] hover:bg-white/40 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-100 transition-all text-left flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="p-1 rounded-[4px] shrink-0">
                            {renderAppIcon(app.icon, "w-7 h-7")}
                          </div>
                          <div className="overflow-hidden flex-1">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{app.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* PINNED & RECOMMENDED START VIEW */
            <motion.div 
              key="start-pinned-view"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex flex-col gap-5"
            >
              {/* Pinned Section Header */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                    Pinned
                  </span>
                  <button
                    onClick={() => setCurrentView('allApps')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800/80 px-2.5 py-1 rounded-[4px] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>All apps</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pinned Apps Grid (Square tiles on hover and layout) */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {pinnedApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        openApp(app.id);
                        closeAllPanels();
                      }}
                      className="aspect-square w-full p-2 rounded-[4px] hover:bg-white/40 dark:hover:bg-slate-800/50 flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:scale-95"
                      title={app.name}
                    >
                      <div className="p-1 shrink-0">
                        {renderAppIcon(app.icon, "w-7 h-7")}
                      </div>
                      <span className="text-xs font-semibold leading-tight text-slate-800 dark:text-slate-100 line-clamp-2 px-0.5">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Section */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                    Recommended
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Recent Activity</span>
                </div>

                {recentItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recentItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          closeAllPanels();
                        }}
                        className="p-2.5 rounded-[4px] hover:bg-white/40 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-all cursor-pointer group text-left"
                      >
                        <div className="p-2 rounded-[4px] shrink-0">
                          {item.icon}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span>{item.location}</span>
                            <span>•</span>
                            <span className="text-slate-400 font-mono">{item.time}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 rounded-[4px]">
                    No recent items yet.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Bar (User Profile & Power Menu) */}
        <div className="border-t border-white/40 dark:border-white/10 px-6 py-3.5 bg-white/20 dark:bg-slate-900/30 backdrop-blur-2xl flex items-center justify-between mt-auto shrink-0 relative">
          {/* User Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs border border-white/40 shrink-0">
              AR
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Alex Rivera
              </span>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 leading-tight">
                System Admin
              </span>
            </div>
          </div>

          {/* Power Button & Nested Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPowerMenuOpen((prev) => !prev);
              }}
              className={`p-2 rounded-[4px] transition-all cursor-pointer flex items-center justify-center backdrop-blur-md border ${
                isPowerMenuOpen
                  ? 'bg-red-500/80 text-white shadow-md border-red-400/50'
                  : 'bg-transparent hover:bg-white/40 dark:hover:bg-slate-800/60 border-transparent hover:border-white/30 dark:hover:border-white/10 text-slate-800 dark:text-slate-200'
              }`}
              title="Power options"
            >
              <Power className="w-4 h-4" />
            </button>

            {/* Power Submenu Flyout */}
            <AnimatePresence>
              {isPowerMenuOpen && (
                <motion.div 
                  key="power-menu-flyout"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-12 right-0 w-36 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 flex flex-col gap-1 z-50 text-slate-800 dark:text-slate-100"
                >
                  <button
                    onClick={() => handlePowerAction('sleep')}
                    className="w-full px-3 py-2 rounded-[4px] text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                  >
                    <Moon className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Sleep</span>
                  </button>
                  <button
                    onClick={() => handlePowerAction('restart')}
                    className="w-full px-3 py-2 rounded-[4px] text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Restart</span>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />
                  <button
                    onClick={() => handlePowerAction('shutdown')}
                    className="w-full px-3 py-2 rounded-[4px] text-xs font-medium text-red-600 dark:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors text-left cursor-pointer"
                  >
                    <Power className="w-4 h-4 shrink-0" />
                    <span>Shut down</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
  );
};
