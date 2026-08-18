import React, { useState, useEffect } from 'react';
import { AppIconRenderer } from '../icons/AppIconRenderer';
import { DesktopShortcutService } from '../../services/DesktopShortcutService';

export interface StartDesktopDragEventDetail {
  appId: string;
  appName: string;
  icon?: string;
  clientX: number;
  clientY: number;
}

export const START_DESKTOP_DRAG_EVENT = 'windroid-start-desktop-drag';

export const DesktopDragOverlay: React.FC = () => {
  const [dragState, setDragState] = useState<{
    appId: string;
    appName: string;
    icon?: string;
    pointerX: number;
    pointerY: number;
    isOverDesktop: boolean;
  } | null>(null);

  useEffect(() => {
    const handleStartDrag = (e: Event) => {
      const detail = (e as CustomEvent<StartDesktopDragEventDetail>).detail;
      if (!detail) return;

      const isOver = detail.clientY < window.innerHeight - 80;
      setDragState({
        appId: detail.appId,
        appName: detail.appName,
        icon: detail.icon,
        pointerX: detail.clientX,
        pointerY: detail.clientY,
        isOverDesktop: isOver,
      });
    };

    const handleClearOverlay = () => {
      setDragState(null);
    };

    window.addEventListener(START_DESKTOP_DRAG_EVENT, handleStartDrag);
    window.addEventListener('aether-start-desktop-drag', handleStartDrag);
    window.addEventListener('windroid-cancel-desktop-drag', handleClearOverlay);
    window.addEventListener('aether-cancel-desktop-drag', handleClearOverlay);
    window.addEventListener('windroid-clear-launch-overlay', handleClearOverlay);
    window.addEventListener('aether-clear-launch-overlay', handleClearOverlay);
    return () => {
      window.removeEventListener(START_DESKTOP_DRAG_EVENT, handleStartDrag);
      window.removeEventListener('aether-start-desktop-drag', handleStartDrag);
      window.removeEventListener('windroid-cancel-desktop-drag', handleClearOverlay);
      window.removeEventListener('aether-cancel-desktop-drag', handleClearOverlay);
      window.removeEventListener('windroid-clear-launch-overlay', handleClearOverlay);
      window.removeEventListener('aether-clear-launch-overlay', handleClearOverlay);
    };
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const isOver = e.clientY < window.innerHeight - 80;
      setDragState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pointerX: e.clientX,
          pointerY: e.clientY,
          isOverDesktop: isOver,
        };
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (dragState.isOverDesktop || e.clientY < window.innerHeight - 80) {
        DesktopShortcutService.getInstance().createDesktopShortcut(dragState.appId, {
          dropPos: { x: e.clientX, y: e.clientY },
        });
      }
      setDragState(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDragState(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragState]);

  if (!dragState) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${dragState.pointerX}px`,
        top: `${dragState.pointerY}px`,
        transform: 'translate(-50%, -50%)',
      }}
      className="pointer-events-none z-[9999] flex flex-col items-center gap-1 select-none animate-in fade-in duration-75"
    >
      {/* Floating App Icon with subtle shadow */}
      <div className="p-1 rounded-2xl bg-white/10 dark:bg-slate-900/20 backdrop-blur-xs shadow-2xl transition-transform scale-105">
        <AppIconRenderer iconName={dragState.icon} className="w-12 h-12 drop-shadow-2xl" />
      </div>

      {/* App Name */}
      <span className="text-[11px] font-medium tracking-tight text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] whitespace-nowrap">
        {dragState.appName}
      </span>

      {/* Valid Drop Indicator on Desktop */}
      {dragState.isOverDesktop && (
        <span className="mt-0.5 px-2 py-0.5 rounded-full bg-blue-600/90 text-white text-[9px] font-bold tracking-wide shadow-md border border-white/20 animate-pulse">
          + Create Desktop Shortcut
        </span>
      )}
    </div>
  );
};
