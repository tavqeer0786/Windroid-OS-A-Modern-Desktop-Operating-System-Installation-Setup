import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useOS } from '../../context/OSContext';
import { WindowState } from '../../types/os';
import { 
  Minus, Square, Copy, X, Sparkles 
} from 'lucide-react';
import { FilesIcon, SettingsIcon, PhotosIcon, MusicIcon, TerminalIcon, CalendarIcon, BrowserIcon } from '../icons/CustomAppIcons';

interface WindowFrameProps {
  windowState: WindowState;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ windowState, children }) => {
  const { 
    activeWindowId, 
    focusWindow, 
    closeWindow, 
    minimizeWindow, 
    maximizeWindow, 
    updateWindowPosition, 
    updateWindowSize 
  } = useOS();

  const isFocused = activeWindowId === windowState.id;
  const isMaximized = windowState.isMaximized;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; initialW: number; initialH: number }>({ mouseX: 0, mouseY: 0, initialW: 0, initialH: 0 });

  // Handle Dragging via Header
  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if (isMaximized) return;
    focusWindow(windowState.id);
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: windowState.x,
      initialY: windowState.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent) => {
    if (!isDragging || isMaximized) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    // Edge constraint
    const newX = Math.max(10, Math.min(dragStartRef.current.initialX + deltaX, window.innerWidth - 100));
    const newY = Math.max(40, Math.min(dragStartRef.current.initialY + deltaY, window.innerHeight - 80));

    updateWindowPosition(windowState.id, newX, newY);
  };

  const handlePointerUpHeader = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe fallback
      }
    }
  };

  // Handle Resizing via Bottom-Right Handle
  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isMaximized) return;
    focusWindow(windowState.id);
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialW: windowState.width,
      initialH: windowState.height
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing || isMaximized) return;
    const deltaX = e.clientX - resizeStartRef.current.mouseX;
    const deltaY = e.clientY - resizeStartRef.current.mouseY;

    const newW = Math.max(480, Math.min(resizeStartRef.current.initialW + deltaX, window.innerWidth - windowState.x - 10));
    const newH = Math.max(320, Math.min(resizeStartRef.current.initialH + deltaY, window.innerHeight - windowState.y - 10));

    updateWindowSize(windowState.id, newW, newH);
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe fallback
      }
    }
  };

  const renderIcon = () => {
    const cls = "w-4 h-4";
    switch (windowState.icon) {
      case 'Folder': return <FilesIcon className={cls} />;
      case 'Globe': return <BrowserIcon className={cls} />;
      case 'Settings': return <SettingsIcon className={cls} />;
      case 'Terminal': return <TerminalIcon className={cls} />;
      case 'Sparkles': return <Sparkles className={`${cls} text-blue-600`} />;
      case 'Image': return <PhotosIcon className={cls} />;
      case 'Music': return <MusicIcon className={cls} />;
      case 'Calendar': return <CalendarIcon className={cls} />;
      default: return <FilesIcon className={cls} />;
    }
  };

  if (windowState.isMinimized) return null;

  const windowStyle: React.CSSProperties = isMaximized
    ? {
        position: 'fixed',
        top: 36,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: 'calc(100vh - 36px)',
        zIndex: windowState.zIndex,
        borderRadius: 0,
        transformOrigin: 'center center'
      }
    : {
        position: 'fixed',
        top: windowState.y,
        left: windowState.x,
        width: windowState.width,
        height: windowState.height,
        zIndex: windowState.zIndex,
        borderRadius: '14px',
        transformOrigin: 'center center'
      };

  return (
    <motion.div
      key={windowState.id}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 0.93,
        transition: { 
          duration: 0.15, // 120–180ms
          ease: [0.4, 0, 1, 1] // Ease In
        }
      }}
      transition={{ 
        duration: 0.21, // 180–250ms
        ease: [0, 0, 0.2, 1] // Ease Out
      }}
      onClick={() => focusWindow(windowState.id)}
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
      style={windowStyle}
      className={`flex flex-col bg-white dark:bg-slate-900 border transition-shadow duration-150 overflow-hidden select-none ${
        isFocused
          ? 'border-slate-300/90 dark:border-white/15 ring-1 ring-blue-500/10'
          : 'border-slate-200/80 dark:border-white/10 opacity-98'
      }`}
    >
      {/* Title bar */}
      <div
        onPointerDown={handlePointerDownHeader}
        onPointerMove={handlePointerMoveHeader}
        onPointerUp={handlePointerUpHeader}
        onDoubleClick={() => maximizeWindow(windowState.id)}
        className={`h-9 px-3 flex items-center justify-between border-b cursor-grab active:cursor-grabbing select-none transition-colors backdrop-blur-xl ${
          isFocused
            ? 'bg-slate-100/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100'
            : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-200/40 dark:border-white/5 text-slate-400 dark:text-slate-500'
        }`}
      >
        {/* Left: App icon & Title */}
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-0.5 rounded bg-white/80 dark:bg-slate-800/80">
            {renderIcon()}
          </div>
          <span className="text-xs font-semibold tracking-tight truncate text-slate-900 dark:text-slate-100">{windowState.title}</span>
        </div>

        {/* Right: Window Control Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(windowState.id);
            }}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(windowState.id);
            }}
            className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(windowState.id);
            }}
            className="p-1.5 rounded-md hover:bg-rose-500 hover:text-white text-slate-500 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Content View */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 relative">
        {children}
      </div>

      {/* Bottom Right Resize Handle */}
      {!isMaximized && (
        <div
          onPointerDown={handlePointerDownResize}
          onPointerMove={handlePointerMoveResize}
          onPointerUp={handlePointerUpResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end p-0.5 group"
          title="Resize window"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-slate-300 dark:border-slate-700 group-hover:border-blue-500 transition-colors" />
        </div>
      )}
    </motion.div>
  );
};
