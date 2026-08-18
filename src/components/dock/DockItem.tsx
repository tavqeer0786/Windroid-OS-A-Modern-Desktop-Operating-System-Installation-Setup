import React, { useState, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { AppMetadata } from '../../types/os';
import { AppIconRenderer } from '../icons/AppIconRenderer';
import { START_DESKTOP_DRAG_EVENT } from '../desktop/DesktopDragOverlay';

interface DockItemProps {
  app: AppMetadata;
  isDragged?: boolean;
  onDragStart?: (appId: string, clientX: number) => void;
  onDragMove?: (clientX: number) => void;
  onDragEnd?: () => void;
}

export const DockItem: React.FC<DockItemProps> = ({ 
  app, 
  isDragged = false,
  onDragStart,
  onDragMove,
  onDragEnd 
}) => {
  const { openApp, activeWindowId, windows, quickPanelAppId, setQuickPanelAppId } = useOS();
  const [isHovered, setIsHovered] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingLocalRef = useRef(false);
  const wasDraggedRef = useRef(false);

  const isRunning = app.running || windows.some((w) => w.appId === app.id);
  const isActive = windows.some((w) => w.appId === app.id && w.id === activeWindowId && !w.isMinimized);
  const isQuickPanelOpen = quickPanelAppId === app.id;

  const renderIcon = () => {
    return (
      <AppIconRenderer
        iconName={app.icon}
        className="w-11 h-11 transition-transform duration-200 group-hover:scale-105"
      />
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    setIsPointerDown(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingLocalRef.current = false;
    wasDraggedRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      if (!isDraggingLocalRef.current) {
        setQuickPanelAppId(app.id);
      }
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDown || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 1. Upward drag towards Desktop threshold (12-20px movement)
    if (dy < -14 && dist >= 12 && !isDraggingLocalRef.current) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      setIsPointerDown(false);
      wasDraggedRef.current = true;

      window.dispatchEvent(
        new CustomEvent(START_DESKTOP_DRAG_EVENT, {
          detail: {
            appId: app.id,
            appName: app.name,
            icon: app.icon,
            clientX: e.clientX,
            clientY: e.clientY,
          },
        })
      );
      return;
    }

    // 2. Horizontal drag along Dock for reordering pinned apps
    if (dist > 6 && Math.abs(dx) > Math.abs(dy) && app.pinned && !isDraggingLocalRef.current) {
      isDraggingLocalRef.current = true;
      wasDraggedRef.current = true;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (onDragStart) onDragStart(app.id, e.clientX);
    }

    if (isDraggingLocalRef.current && onDragMove) {
      onDragMove(e.clientX);
    }
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isDraggingLocalRef.current) {
      isDraggingLocalRef.current = false;
      if (onDragEnd) onDragEnd();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickPanelAppId(isQuickPanelOpen ? null : app.id);
  };

  return (
    <div 
      id={`dock-item-${app.id}`} 
      data-pinned={app.pinned ? 'true' : 'false'}
      className={`relative w-[60px] h-[60px] flex-none shrink-0 flex flex-col items-center justify-center transition-opacity duration-150 ${
        isDragged ? 'opacity-50 z-50' : ''
      }`}
    >
      {/* Floating Tooltip */}
      {isHovered && !isQuickPanelOpen && !isDragged && (
        <div className="absolute -top-10 px-2 py-0.5 rounded-lg bg-slate-900/95 dark:bg-slate-950/95 text-white text-[10px] font-medium tracking-tight border border-white/10 whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150 z-50">
          {app.name}
        </div>
      )}

      {/* Main Icon Button */}
      <button
        onClick={() => {
          if (wasDraggedRef.current) {
            wasDraggedRef.current = false;
            return;
          }
          if (isQuickPanelOpen) {
            setQuickPanelAppId(null);
          } else {
            openApp(app.id);
          }
        }}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setIsHovered(false);
        }}
        onMouseEnter={() => setIsHovered(true)}
        className={`w-full h-full p-1.5 rounded-[13px] transition-all duration-200 cursor-pointer flex items-center justify-center relative focus:outline-none group ${
          isActive
            ? 'bg-white/40 dark:bg-white/20 backdrop-blur-md ring-1 ring-blue-400/50'
            : isHovered
            ? 'bg-white/30 dark:bg-white/15 backdrop-blur-md -translate-y-0.5'
            : 'hover:bg-white/30 dark:hover:bg-white/15'
        }`}
        title={`${app.name}`}
      >
        {renderIcon()}

        {/* Badge counter */}
        {app.badgeCount && app.badgeCount > 0 ? (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 text-white font-mono text-[8px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {app.badgeCount}
          </span>
        ) : null}

        {/* Running Indicator Pill */}
        {isRunning && (
          <span 
            className={`absolute bottom-0.5 rounded-full transition-all duration-300 ${
              isActive 
                ? 'bg-blue-600 dark:bg-blue-400 w-2.5 h-1' 
                : 'bg-slate-400 dark:bg-slate-500 w-1 h-1'
            }`} 
          />
        )}
      </button>
    </div>
  );
};
