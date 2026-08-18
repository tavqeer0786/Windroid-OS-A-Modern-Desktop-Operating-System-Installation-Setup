import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { DockItem } from './DockItem';
import { AppQuickPanel } from './AppQuickPanel';
import { AppId } from '../../types/os';
import { AppLauncherIcon } from '../icons/CustomAppIcons';
import { ChevronUp } from 'lucide-react';

import { SAFE_MODE_FLAGS, metrics } from '../../system/diagnostics';

export const Dock: React.FC = () => {
  metrics.trackRender('Dock');

  const { 
    apps, 
    pinnedAppIds,
    reorderDockApps,
    windows, 
    activeWindowId,
    toggleAppLauncher, 
    isAppLauncherOpen, 
    quickPanelAppId, 
    setQuickPanelAppId,
    contextMenu 
  } = useOS();

  // Drag-and-drop reordering state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Derived state: Is any open window currently maximized and not minimized?
  const hasMaximizedWindow = windows.some(
    (w) => w.isMaximized && !w.isMinimized
  );

  // Derived state: Are any dock-attached panels/flyouts active?
  const isDockPanelOpen = isAppLauncherOpen || quickPanelAppId !== null || contextMenu.isOpen;

  // Local auto-hide reveal states
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverRevealed, setIsHoverRevealed] = useState(false);
  const [isRevealedByHandle, setIsRevealedByHandle] = useState(false);

  // Viewport scroll states & refs
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrolledAppRef = useRef<string | null>(null);

  // Pointer drag ref state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  // Width calculations for viewport: 60px per item + 8px gap
  const APP_ITEM_SIZE = 60;
  const APP_GAP = 8;
  const visibleSlotCount = Math.min(apps.length, 8);
  const appViewportWidth = visibleSlotCount > 0 
    ? visibleSlotCount * APP_ITEM_SIZE + Math.max(visibleSlotCount - 1, 0) * APP_GAP 
    : 0;

  // Automatically scroll running/active app into view if hidden outside viewport
  useEffect(() => {
    if (SAFE_MODE_FLAGS.disableDockScroll) return;
    if (!viewportRef.current || !activeWindowId) return;

    const activeWin = windows.find((w) => w.id === activeWindowId);
    if (!activeWin) return;

    const targetAppId = activeWin.appId;
    if (lastScrolledAppRef.current === targetAppId) return;

    const viewport = viewportRef.current;
    const itemEl = viewport.querySelector(`#dock-item-${targetAppId}`) as HTMLElement;
    if (itemEl) {
      const vRect = viewport.getBoundingClientRect();
      const iRect = itemEl.getBoundingClientRect();

      const isVisible = iRect.left >= vRect.left && iRect.right <= vRect.right;
      if (!isVisible) {
        itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      lastScrolledAppRef.current = targetAppId;
    }
  }, [activeWindowId]);

  // Convert vertical mouse wheel to horizontal scrolling inside app viewport
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      viewportRef.current.scrollLeft += e.deltaY;
    } else {
      viewportRef.current.scrollLeft += e.deltaX;
    }
  };

  // Keyboard navigation for scrolling viewport
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    if (e.key === 'ArrowRight') {
      viewportRef.current.scrollBy({ left: 68, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      viewportRef.current.scrollBy({ left: -68, behavior: 'smooth' });
    }
  };

  // Pointer drag handlers for viewport swipe
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    if (viewportRef.current) {
      startScrollLeftRef.current = viewportRef.current.scrollLeft;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !viewportRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 3) {
      viewportRef.current.scrollLeft = startScrollLeftRef.current - dx;
    }
  };

  const handlePointerUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  // Handle pointer entering Dock / Reveal Zone / Arrow Handle
  const handlePointerEnter = () => {
    setIsHovered(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (!isHoverRevealed && !hoverTimerRef.current) {
      hoverTimerRef.current = setTimeout(() => {
        setIsHoverRevealed(true);
        hoverTimerRef.current = null;
      }, 150);
    }
  };

  // Handle pointer leaving Dock / Reveal Zone / Arrow Handle
  const handlePointerLeave = () => {
    setIsHovered(false);

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (!hideTimerRef.current) {
      hideTimerRef.current = setTimeout(() => {
        setIsHoverRevealed(false);
        setIsRevealedByHandle(false);
        hideTimerRef.current = null;
      }, 800);
    }
  };

  // Keep dock visible while any attached panel is open
  useEffect(() => {
    if (isDockPanelOpen) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else if (!isHovered && hasMaximizedWindow) {
      if (!hideTimerRef.current) {
        hideTimerRef.current = setTimeout(() => {
          setIsHoverRevealed(false);
          setIsRevealedByHandle(false);
          hideTimerRef.current = null;
        }, 800);
      }
    }
  }, [isDockPanelOpen, isHovered, hasMaximizedWindow]);

  // Reset auto-hide override when no window is maximized
  useEffect(() => {
    if (!hasMaximizedWindow) {
      setIsHoverRevealed(false);
      setIsRevealedByHandle(false);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }
  }, [hasMaximizedWindow]);

  // Listen for global pointer events and Escape key while dragging a pinned app
  useEffect(() => {
    if (!draggedAppId) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!viewportRef.current) return;
      const pinnedElements = Array.from(
        viewportRef.current.querySelectorAll('[data-pinned="true"]')
      ) as HTMLElement[];

      if (pinnedElements.length === 0) return;

      let closestIndex = 0;
      let minDistance = Infinity;

      pinnedElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const distance = Math.abs(e.clientX - centerX);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = e.clientX < centerX ? index : index + 1;
        }
      });

      setDragOverIndex(closestIndex);
    };

    const handleWindowPointerUp = () => {
      if (draggedAppId && dragOverIndex !== null) {
        const currentIdx = pinnedAppIds.indexOf(draggedAppId);
        if (currentIdx !== -1) {
          const next = [...pinnedAppIds];
          const [removed] = next.splice(currentIdx, 1);
          const targetIdx = dragOverIndex > currentIdx ? dragOverIndex - 1 : dragOverIndex;
          const clampedIdx = Math.max(0, Math.min(targetIdx, next.length));
          next.splice(clampedIdx, 0, removed);
          reorderDockApps(next);
        }
      }
      setDraggedAppId(null);
      setDragOverIndex(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraggedAppId(null);
        setDragOverIndex(null);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [draggedAppId, dragOverIndex, pinnedAppIds, reorderDockApps]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Separate pinned and unpinned running apps for rendering
  const pinnedApps = apps.filter((a) => a.pinned);
  const unpinnedApps = apps.filter((a) => !a.pinned);

  const renderDockItems = () => {
    const elements: React.ReactNode[] = [];

    pinnedApps.forEach((app, idx) => {
      if (draggedAppId && dragOverIndex === idx) {
        elements.push(
          <div 
            key={`insertion-${idx}`} 
            className="w-1 h-9 bg-blue-500 rounded-full my-auto shrink-0 animate-pulse" 
          />
        );
      }

      elements.push(
        <DockItem 
          key={app.id} 
          app={app} 
          isDragged={draggedAppId === app.id}
          onDragStart={(id) => {
            setDraggedAppId(id);
            setDragOverIndex(idx);
          }}
        />
      );
    });

    if (draggedAppId && dragOverIndex === pinnedApps.length) {
      elements.push(
        <div 
          key="insertion-end" 
          className="w-1 h-9 bg-blue-500 rounded-full my-auto shrink-0 animate-pulse" 
        />
      );
    }

    unpinnedApps.forEach((app) => {
      elements.push(<DockItem key={app.id} app={app} />);
    });

    return elements;
  };

  // Central Dock visibility condition
  const isDockVisible = 
    !hasMaximizedWindow || 
    isDockPanelOpen || 
    isHovered || 
    isHoverRevealed || 
    isRevealedByHandle;

  return (
    <>
      {/* Up-Arrow Reveal Handle & Hover Zone when a window is maximized */}
      {hasMaximizedWindow && (
        <>
          {/* Invisible Bottom Hover Zone */}
          <div
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-[9970] w-96 h-3 bg-transparent pointer-events-auto transition-opacity duration-200 ${
              !isDockVisible ? 'block' : 'hidden'
            }`}
            title="Reveal Dock Zone"
          />

          {/* Centered Up-Arrow Handle */}
          <button
            onClick={() => {
              setIsRevealedByHandle(true);
              if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsRevealedByHandle(true);
              }
            }}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-[9980] w-10 h-5 rounded-t-lg bg-slate-900/85 dark:bg-slate-950/90 backdrop-blur-md border border-b-0 border-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all duration-200 hover:h-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              !isDockVisible ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'
            }`}
            aria-label="Show Dock"
            title="Show Dock"
          >
            <ChevronUp className="w-4 h-4 transition-transform hover:-translate-y-0.5" />
          </button>
        </>
      )}

      {/* Quick Actions Context Menu Flyout */}
      {quickPanelAppId && (
        <AppQuickPanel appId={quickPanelAppId as AppId} onClose={() => setQuickPanelAppId(null)} />
      )}

      {/* Main Dock Bar */}
      <div 
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        style={{
          transform: isDockVisible ? 'translate(-50%, 0)' : 'translate(-50%, calc(100% + 28px))',
          opacity: isDockVisible ? 1 : 0,
          pointerEvents: isDockVisible ? 'auto' : 'none',
          transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="fixed bottom-4 left-1/2 z-[9980] select-none"
      >
        <nav 
          className="glass-dock px-3 py-2.5 rounded-3xl flex items-center gap-2 max-w-full"
          aria-label="Desktop Dock"
        >
          {/* App Launcher / System Button */}
          <button
            onClick={toggleAppLauncher}
            className={`w-[62px] h-[62px] rounded-[13px] transition-all duration-200 cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 group ${
              isAppLauncherOpen
                ? 'bg-white/40 dark:bg-white/20 backdrop-blur-md ring-1 ring-blue-400/50 scale-105'
                : 'hover:bg-white/30 dark:hover:bg-white/15 hover:-translate-y-0.5'
            }`}
            title="App Launcher"
          >
            <AppLauncherIcon className="w-[56px] h-[56px] transition-transform group-hover:scale-105 duration-200" />
          </button>

          {apps.length > 0 && (
            <div className="w-px h-8 bg-slate-300/50 dark:bg-white/20 mx-0.5 shrink-0" />
          )}

          {/* Dynamic Width Viewport Container (Max 8 Slots = 536px) */}
          <div 
            className="relative flex items-center overflow-hidden transition-all duration-200"
            style={{
              width: `${appViewportWidth}px`,
              maxWidth: `${appViewportWidth}px`,
            }}
          >
            {/* Scrollable Viewport */}
            <div
              ref={viewportRef}
              onWheel={handleWheel}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrLeave}
              onPointerLeave={handlePointerUpOrLeave}
              style={{
                width: `${appViewportWidth}px`,
              }}
              className="flex items-center gap-2 overflow-x-auto overflow-y-hidden no-scrollbar py-0.5 px-0.5 focus:outline-none"
              tabIndex={0}
              aria-label="Applications List"
            >
              {renderDockItems()}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};
