import React, { useState, useMemo, useEffect } from 'react';
import { InstalledApplication, InstalledAppRegistry } from '../../system/apps/InstalledAppRegistry';
import { AppRuntimeService } from '../../system/runtime/AppRuntimeService';
import { useOS } from '../../context/OSContext';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  List,
  LayoutList,
  LayoutGrid,
  Code2,
  Calculator,
  Camera,
  Video,
  Clock,
  Sparkles,
  Globe,
  Image,
  FileCode,
  MessageSquare,
  Play,
  Info,
  Folder,
  ExternalLink,
  Pin,
  Wrench,
  Trash2,
  Monitor,
  Smartphone,
  Terminal,
  ShieldCheck
} from 'lucide-react';

interface InstalledCompatibilityAppsProps {
  onRefreshNeeded?: () => void;
  showBreadcrumb?: boolean;
}

export const InstalledCompatibilityApps: React.FC<InstalledCompatibilityAppsProps> = ({
  onRefreshNeeded,
  showBreadcrumb = true
}) => {
  const { addNotification, requestConfirm } = useOS();

  // State
  const [filter, setFilter] = useState<'all' | 'native' | 'windows' | 'android'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'installedAt' | 'version'>('name');
  const [viewMode, setViewMode] = useState<'list' | 'detailed' | 'grid'>('detailed');
  const [apps, setApps] = useState<InstalledApplication[]>(() =>
    InstalledAppRegistry.getInstance().getAll()
  );

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [activeMenuAppId, setActiveMenuAppId] = useState<string | null>(null);
  const [propertiesApp, setPropertiesApp] = useState<InstalledApplication | null>(null);
  const [pinnedDockIds, setPinnedDockIds] = useState<Set<string>>(new Set());

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuAppId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuAppId(null);
        setPropertiesApp(null);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleRefreshList = () => {
    setApps(InstalledAppRegistry.getInstance().getAll());
    if (onRefreshNeeded) onRefreshNeeded();
  };

  const handleUninstall = (app: InstalledApplication) => {
    requestConfirm({
      title: `Uninstall ${app.name}?`,
      message: `This will remove ${app.name} from Windroid OS and delete its runtime state directory.`,
      confirmLabel: 'Uninstall',
      isDanger: true,
      onConfirm: async () => {
        const ok = await AppRuntimeService.getInstance().uninstallApp(app.id);
        if (ok) {
          addNotification({
            title: 'App Uninstalled',
            message: `Removed ${app.name} cleanly.`,
            type: 'info'
          });
          handleRefreshList();
        }
      }
    });
  };

  const handleRepair = (app: InstalledApplication) => {
    addNotification({
      title: 'Runtime Repair Started',
      message: `Verifying runtime dependencies and recreating launcher entries for ${app.name}...`,
      type: 'info'
    });
  };

  const handleLaunch = async (app: InstalledApplication) => {
    try {
      await AppRuntimeService.getInstance().launchApp(app.id);
      addNotification({
        title: 'Launching Application',
        message: `Starting ${app.name}...`,
        type: 'info'
      });
    } catch {
      addNotification({
        title: 'Launch Error',
        message: `Could not launch ${app.name}.`,
        type: 'error'
      });
    }
  };

  const handleOpenFolder = (app: InstalledApplication) => {
    addNotification({
      title: 'App Directory',
      message: `Path: ${app.installationPath}`,
      type: 'info'
    });
  };

  const handleCreateShortcut = (app: InstalledApplication) => {
    addNotification({
      title: 'Shortcut Created',
      message: `Desktop shortcut created for ${app.name}.`,
      type: 'info'
    });
  };

  const handleToggleDock = (app: InstalledApplication) => {
    setPinnedDockIds((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
        addNotification({
          title: 'Unpinned from Dock',
          message: `Removed ${app.name} from Dock.`,
          type: 'info'
        });
      } else {
        next.add(app.id);
        addNotification({
          title: 'Pinned to Dock',
          message: `Pinned ${app.name} to Dock.`,
          type: 'info'
        });
      }
      return next;
    });
  };

  // Helper to parse size into numerical bytes for accurate sorting
  const parseSizeToBytes = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const str = sizeStr.trim().toUpperCase();
    const val = parseFloat(str);
    if (isNaN(val)) return 0;
    if (str.includes('GB')) return val * 1024 * 1024 * 1024;
    if (str.includes('MB')) return val * 1024 * 1024;
    if (str.includes('KB')) return val * 1024;
    return val;
  };

  // Filter and Sort Memoization
  const filteredAndSortedApps = useMemo(() => {
    let result = apps;

    // Runtime filter
    if (filter !== 'all') {
      result = result.filter((a) => a.runtime === filter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.publisher.toLowerCase().includes(q) ||
          a.packageId.toLowerCase().includes(q) ||
          a.version.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') {
        const sizeA = parseSizeToBytes(a.size || a.storageUsage);
        const sizeB = parseSizeToBytes(b.size || b.storageUsage);
        return sizeB - sizeA;
      }
      if (sortBy === 'version') return a.version.localeCompare(b.version);
      if (sortBy === 'installedAt') return b.installedAt.localeCompare(a.installedAt);
      return 0;
    });
  }, [apps, filter, searchQuery, sortBy]);

  // Render stylized application icon tile matching Figma reference
  const renderAppIconTile = (app: InstalledApplication) => {
    const iconName = app.icon || '';
    const nameLower = app.name.toLowerCase();

    if (nameLower.includes('antigravity') || iconName === 'Code2') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#1E1E2E] dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700/50 shadow-2xs">
          <Code2 className="w-5 h-5 text-[#38BDF8]" />
        </div>
      );
    }

    if (nameLower.includes('calculator') || iconName === 'Calculator') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#0067C0] flex items-center justify-center shrink-0 shadow-2xs">
          <Calculator className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (nameLower.includes('camera') || iconName === 'Camera') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#0078D4] flex items-center justify-center shrink-0 shadow-2xs">
          <Camera className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (nameLower.includes('capcut') || iconName === 'Video') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#18181B] flex items-center justify-center shrink-0 border border-slate-700 shadow-2xs">
          <Video className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (nameLower.includes('clock') || iconName === 'Clock') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#0067C0] flex items-center justify-center shrink-0 shadow-2xs">
          <Clock className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (nameLower.includes('copilot') || iconName === 'Sparkles') {
      return (
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-2xs p-0.5">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[6px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#0067C0] dark:text-sky-400" />
          </div>
        </div>
      );
    }

    if (nameLower.includes('english') || iconName === 'Globe') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#0067C0] flex items-center justify-center shrink-0 shadow-2xs">
          <Globe className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (nameLower.includes('gimp') || iconName === 'Image') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#2D3748] flex items-center justify-center shrink-0 border border-slate-600 shadow-2xs">
          <Image className="w-5 h-5 text-amber-400" />
        </div>
      );
    }

    if (nameLower.includes('notepad') || iconName === 'FileCode') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#0F172A] flex items-center justify-center shrink-0 border border-slate-700 shadow-2xs">
          <FileCode className="w-5 h-5 text-emerald-400" />
        </div>
      );
    }

    if (nameLower.includes('signal') || iconName === 'MessageSquare') {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#3A76F0] flex items-center justify-center shrink-0 shadow-2xs">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
      );
    }

    // Default icon tile fallback based on runtime
    if (app.runtime === 'windows') {
      return (
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Monitor className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (app.runtime === 'android') {
      return (
        <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
      );
    }

    return (
      <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
        <Terminal className="w-5 h-5 text-white" />
      </div>
    );
  };

  return (
    <div className="space-y-4 text-xs font-sans select-none max-w-5xl mx-auto pb-8">
      {/* 1. BREADCRUMB (Figma Exact Replica: Apps > Installed apps) */}
      {showBreadcrumb && (
        <div className="flex items-center gap-1.5 text-xs text-[#5F6368] dark:text-slate-400 font-medium">
          <span>Apps</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-500" />
          <span className="text-[#202124] dark:text-slate-200 font-semibold">Installed apps</span>
        </div>
      )}

      {/* 2. MAIN PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-2xl font-bold text-[#202124] dark:text-slate-100 tracking-tight">
          Installed apps
        </h1>
        <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
          Uninstall and manage apps on your device.
        </p>
      </div>

      {/* 3. SEARCH BOX & VIEW TOGGLE ROW */}
      <div className="flex items-center justify-between gap-4 pt-2">
        {/* Search Input Box */}
        <div className="relative flex-1 max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps"
            className="h-10 w-full pl-4 pr-10 text-xs bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-800 rounded-xl text-[#202124] dark:text-slate-100 placeholder:text-[#5F6368] dark:placeholder:text-slate-400 focus:outline-none focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] transition-all shadow-2xs"
          />
          <Search className="w-4 h-4 text-[#5F6368] dark:text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-9 top-3 text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switch Buttons (3 Segmented Icon Container) */}
        <div className="p-1 bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-800 rounded-xl flex items-center gap-0.5 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#EAF3FF] dark:bg-blue-950/80 text-[#0067C0] dark:text-blue-300 font-bold border border-[#0067C0]/30'
                : 'text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detailed')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              viewMode === 'detailed'
                ? 'bg-[#EAF3FF] dark:bg-blue-950/80 text-[#0067C0] dark:text-blue-300 font-bold border border-[#0067C0]/30'
                : 'text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
            title="Detailed list view"
          >
            <LayoutList className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[#EAF3FF] dark:bg-blue-950/80 text-[#0067C0] dark:text-blue-300 font-bold border border-[#0067C0]/30'
                : 'text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. APPS COUNT & FILTER / SORT TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-[13px] font-bold text-[#202124] dark:text-slate-200">
          {filteredAndSortedApps.length} apps found
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#5F6368] dark:text-slate-400 font-medium">Filter by:</span>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="h-8 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-800 rounded-lg text-[#202124] dark:text-slate-200 focus:outline-none focus:border-[#0067C0] cursor-pointer appearance-none shadow-2xs"
              >
                <option value="all">All drives</option>
                <option value="native">System drive (C:)</option>
                <option value="windows">WinBridge Apps</option>
                <option value="android">DroidBridge Apps</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#5F6368] dark:text-slate-400 font-medium">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 pl-3 pr-8 text-xs font-semibold bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-800 rounded-lg text-[#202124] dark:text-slate-200 focus:outline-none focus:border-[#0067C0] cursor-pointer appearance-none shadow-2xs"
              >
                <option value="name">Name (A to Z)</option>
                <option value="size">Size</option>
                <option value="installedAt">Date installed</option>
                <option value="version">Version</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. INSTALLED APPLICATION LIST ROWS */}
      {viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {filteredAndSortedApps.map((app) => {
            const isMenuOpen = activeMenuAppId === app.id;
            return (
              <div
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                onDoubleClick={() => handleLaunch(app)}
                className={`bg-white dark:bg-[#202024] border rounded-xl p-4 flex flex-col justify-between transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer ${
                  selectedAppId === app.id
                    ? 'border-[#0067C0] ring-1 ring-[#0067C0]/30 bg-[#F7F9FC] dark:bg-[#252830]'
                    : 'border-[#E5E7EB] dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  {renderAppIconTile(app)}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuAppId(isMenuOpen ? null : app.id);
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-[#5F6368] dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && renderContextMenu(app)}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[14px] font-semibold text-[#202124] dark:text-slate-100 truncate">
                    {app.name}
                  </div>
                  <div className="text-[12px] text-[#5F6368] dark:text-slate-400 truncate mt-0.5">
                    {app.publisher}
                  </div>
                  <div className="text-[11px] text-[#5F6368] dark:text-slate-500 mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>{app.version || '1.0.0'}</span>
                    <span className="font-medium">{app.size || app.storageUsage || '48.0 KB'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DETAILED / LIST ROWS VIEW (Figma Exact Replica) */
        <div className="space-y-2.5 pt-1">
          {filteredAndSortedApps.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-[14px] font-semibold text-[#202124] dark:text-slate-200">
                No installed applications found
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400">
                Try a different search query or drive filter.
              </div>
            </div>
          ) : (
            filteredAndSortedApps.map((app) => {
              const isSelected = selectedAppId === app.id;
              const isMenuOpen = activeMenuAppId === app.id;

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  onDoubleClick={() => handleLaunch(app)}
                  className={`bg-white dark:bg-[#202024] border rounded-xl px-4 py-3 flex items-center justify-between transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer ${
                    isSelected
                      ? 'border-[#0067C0] ring-1 ring-[#0067C0]/30 bg-[#F7F9FC] dark:bg-[#252830]'
                      : 'border-[#E5E7EB] dark:border-slate-800'
                  }`}
                >
                  {/* Left Side: Icon + Name + Sub-metadata */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                    {renderAppIconTile(app)}

                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#202124] dark:text-slate-100 truncate leading-tight">
                        {app.name}
                      </div>
                      <div className="text-[12px] text-[#5F6368] dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5 font-normal">
                        {app.version && <span>{app.version}</span>}
                        {app.version && <span className="text-slate-300 dark:text-slate-600">|</span>}
                        <span>{app.publisher}</span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span>{app.installedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Size + 3-Dot Options */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] font-medium text-[#5F6368] dark:text-slate-400 min-w-[65px] text-right">
                      {app.size || app.storageUsage || '48.0 KB'}
                    </span>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuAppId(isMenuOpen ? null : app.id);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-[#5F6368] dark:text-slate-300 transition-colors cursor-pointer"
                        title="More options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && renderContextMenu(app)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PROPERTIES DIALOG */}
      {propertiesApp && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202024] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {renderAppIconTile(propertiesApp)}
                <div>
                  <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                    {propertiesApp.name}
                  </h3>
                  <p className="text-xs text-[#5F6368] dark:text-slate-400">
                    {propertiesApp.publisher}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPropertiesApp(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#202124] dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368] dark:text-slate-400">Version</span>
                <span className="font-semibold">{propertiesApp.version}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368] dark:text-slate-400">Installed Size</span>
                <span className="font-semibold">{propertiesApp.size || propertiesApp.storageUsage || '48.0 KB'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368] dark:text-slate-400">Install Date</span>
                <span className="font-semibold">{propertiesApp.installedAt}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368] dark:text-slate-400">Runtime</span>
                <span className="font-semibold capitalize">{propertiesApp.runtime}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368] dark:text-slate-400">Package ID</span>
                <span className="font-mono text-[11px] truncate max-w-[200px]">{propertiesApp.packageId}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPropertiesApp(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold hover:bg-[#005aab] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper context menu renderer
  function renderContextMenu(app: InstalledApplication) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-9 z-50 w-52 bg-white dark:bg-[#2C2C2C] border border-[#E5E7EB] dark:border-slate-700 rounded-xl shadow-xl py-1 text-left text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
      >
        <button
          type="button"
          onClick={() => {
            setActiveMenuAppId(null);
            handleLaunch(app);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>Open</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMenuAppId(null);
            setPropertiesApp(app);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>Properties</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMenuAppId(null);
            handleOpenFolder(app);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <Folder className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>Open Install Location</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMenuAppId(null);
            handleCreateShortcut(app);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>Create Desktop Shortcut</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMenuAppId(null);
            handleToggleDock(app);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <Pin className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>{pinnedDockIds.has(app.id) ? 'Unpin from Dock' : 'Pin to Dock'}</span>
        </button>

        {app.canRepair && (
          <button
            type="button"
            onClick={() => {
              setActiveMenuAppId(null);
              handleRepair(app);
            }}
            className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
            <span>Repair Runtime</span>
          </button>
        )}

        {app.canUninstall && (
          <button
            type="button"
            onClick={() => {
              setActiveMenuAppId(null);
              handleUninstall(app);
            }}
            className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 cursor-pointer border-t border-[#E5E7EB] dark:border-slate-700/60 mt-1 pt-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Uninstall</span>
          </button>
        )}
      </div>
    );
  }
};
