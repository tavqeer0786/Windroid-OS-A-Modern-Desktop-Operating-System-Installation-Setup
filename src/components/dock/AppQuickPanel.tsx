import React, { useState, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import { AppId } from '../../types/os';
import { 
  Pin, PinOff, ArrowLeft, ArrowRight, X, Info, ExternalLink,
  PlusSquare, Shield, Download, FileText, Home, Plus, Monitor
} from 'lucide-react';
import { SYSTEM_APP_REGISTRY } from '../../services/SystemAppRegistry';
import { InstalledAppRegistry } from '../../system/apps/InstalledAppRegistry';
import { DesktopShortcutService } from '../../services/DesktopShortcutService';

interface AppQuickPanelProps {
  appId: AppId;
  onClose: () => void;
}

export const AppQuickPanel: React.FC<AppQuickPanelProps> = ({ appId, onClose }) => {
  const { 
    apps, 
    pinnedAppIds, 
    openApp, 
    pinApp, 
    unpinApp, 
    moveDockApp, 
    closeApp, 
    requestConfirm
  } = useOS();

  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  useEffect(() => {
    const updatePos = () => {
      const el = document.getElementById(`dock-item-${appId}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const bottom = Math.max(80, window.innerHeight - rect.top + 12);
        const left = Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2));
        setPos({ left, bottom });
      }
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [appId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const panelEl = document.getElementById(`app-quick-panel-${appId}`);
      if (panelEl && !panelEl.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
      window.addEventListener('contextmenu', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [appId, onClose]);

  const app = apps.find((a) => a.id === appId);
  const isPinned = pinnedAppIds.includes(appId);
  const pinnedIdx = pinnedAppIds.indexOf(appId);
  const isRunning = app ? app.running : false;

  const canMoveLeft = isPinned && pinnedIdx > 0;
  const canMoveRight = isPinned && pinnedIdx >= 0 && pinnedIdx < pinnedAppIds.length - 1;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleShowProperties = () => {
    const sys = SYSTEM_APP_REGISTRY[appId as AppId];
    const installed = InstalledAppRegistry.getInstance().getById(appId);
    const infoLines = [
      `Application: ${app ? app.name : appId}`,
      `App ID: ${appId}`,
      `Status: ${isRunning ? 'Running' : 'Closed'} (${isPinned ? 'Pinned to Dock' : 'Unpinned'})`,
      `Category: ${app?.category || 'System'}`,
      sys ? `Built-in System App: ${sys.isBuiltIn ? 'Yes' : 'No'}` : null,
      sys ? `Installation Path: ${sys.installationPath}` : null,
      installed ? `Runtime Engine: ${installed.runtime.toUpperCase()}` : null,
      installed ? `Publisher: ${installed.publisher}` : null,
      installed ? `Version: ${installed.version}` : null,
      installed ? `Installation Path: ${installed.installationPath}` : null,
    ].filter(Boolean).join('\n');

    requestConfirm({
      title: `${app ? app.name : appId} Properties`,
      message: infoLines,
      confirmLabel: 'OK',
      cancelLabel: 'Close',
      onConfirm: () => {}
    });
  };

  // Render App Shortcuts (if any)
  const renderAppShortcuts = () => {
    switch (appId) {
      case 'browser':
        return (
          <>
            <button
              onClick={() => handleAction(() => openApp('browser', { action: 'new_tab' }))}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 text-[12px] font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>New tab</span>
            </button>
            <button
              onClick={() => handleAction(() => openApp('browser', { action: 'private_tab' }))}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 text-[12px] font-medium cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Private tab</span>
            </button>
            <button
              onClick={() => handleAction(() => openApp('browser', { action: 'downloads' }))}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 text-[12px] font-medium cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Downloads</span>
            </button>
          </>
        );

      case 'files':
        return (
          <>
            <button
              onClick={() => handleAction(() => openApp('files', { initialPath: 'Home' }))}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 text-[12px] font-medium cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Home</span>
            </button>
            <button
              onClick={() => handleAction(() => openApp('files', { initialPath: 'Documents' }))}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 text-[12px] font-medium cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Documents</span>
            </button>
            <button
              onClick={() => handleAction(() => openApp('files', { initialPath: 'Downloads' }))}
              className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 text-[12px] font-medium cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Downloads</span>
            </button>
          </>
        );

      default:
        return null;
    }
  };

  const hasShortcuts = appId === 'browser' || appId === 'files';

  return (
    <div 
      id={`app-quick-panel-${appId}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: pos ? `${pos.left}px` : '50%',
        bottom: pos ? `${pos.bottom}px` : '80px',
        transform: 'translateX(-50%)',
      }}
      className="z-[9995] min-w-[210px] p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-2xl text-[12px] font-medium text-[#202124] dark:text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
    >
      {/* Group 0: App Shortcuts (if present) */}
      {hasShortcuts && (
        <>
          <div className="flex flex-col gap-0.5">
            {renderAppShortcuts()}
          </div>
          <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />
        </>
      )}

      {/* Group 1: Launch Actions */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => handleAction(() => openApp(appId))}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left"
        >
          <ExternalLink className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
          <span>Open</span>
        </button>

        <button
          onClick={() => handleAction(() => openApp(appId, { newWindow: true }))}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left"
        >
          <PlusSquare className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
          <span>New window</span>
        </button>
      </div>

      <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

      {/* Group 2: Pin / Unpin & Reorder */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => handleAction(() => DesktopShortcutService.getInstance().createDesktopShortcut(appId))}
          className="w-full px-3 py-1.5 flex items-center justify-between rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
        >
          <span className="flex items-center gap-2.5">
            <Monitor className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
            <span>Create Desktop shortcut</span>
          </span>
        </button>

        {isPinned ? (
          <button
            onClick={() => handleAction(() => unpinApp(appId))}
            className="w-full px-3 py-1.5 flex items-center justify-between rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
          >
            <span className="flex items-center gap-2.5">
              <PinOff className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Unpin from Dock</span>
            </span>
          </button>
        ) : (
          <button
            onClick={() => handleAction(() => pinApp(appId))}
            className="w-full px-3 py-1.5 flex items-center justify-between rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
          >
            <span className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
              <span>Pin to Dock</span>
            </span>
          </button>
        )}

        {isPinned && (
          <>
            <button
              disabled={!canMoveLeft}
              onClick={() => handleAction(() => moveDockApp(appId, 'left'))}
              className="w-full px-3 py-1.5 flex items-center justify-between rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 disabled:text-[#9CA3AF] disabled:bg-transparent disabled:cursor-not-allowed transition-colors text-left group"
            >
              <span className="flex items-center gap-2.5">
                <ArrowLeft className="w-4 h-4 text-[#202124] dark:text-slate-200 group-disabled:text-[#9CA3AF] shrink-0" />
                <span>Move left</span>
              </span>
            </button>

            <button
              disabled={!canMoveRight}
              onClick={() => handleAction(() => moveDockApp(appId, 'right'))}
              className="w-full px-3 py-1.5 flex items-center justify-between rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 disabled:text-[#9CA3AF] disabled:bg-transparent disabled:cursor-not-allowed transition-colors text-left group"
            >
              <span className="flex items-center gap-2.5">
                <ArrowRight className="w-4 h-4 text-[#202124] dark:text-slate-200 group-disabled:text-[#9CA3AF] shrink-0" />
                <span>Move right</span>
              </span>
            </button>
          </>
        )}
      </div>

      <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

      {/* Group 3: Window Management & Properties */}
      <div className="flex flex-col gap-0.5">
        <button
          disabled={!isRunning}
          onClick={() => handleAction(() => closeApp(appId))}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 disabled:text-[#9CA3AF] disabled:bg-transparent disabled:cursor-not-allowed transition-colors text-left group"
        >
          <X className="w-4 h-4 text-[#202124] dark:text-slate-200 group-disabled:text-[#9CA3AF] shrink-0" />
          <span>Close</span>
        </button>

        <button
          onClick={() => handleAction(handleShowProperties)}
          className="w-full px-3 py-1.5 flex items-center justify-between rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
        >
          <span className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0" />
            <span>Properties</span>
          </span>
        </button>
      </div>
    </div>
  );
};
