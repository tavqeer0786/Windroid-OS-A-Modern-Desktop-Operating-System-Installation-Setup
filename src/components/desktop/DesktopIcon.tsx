import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { TrashService } from '../apps/files/services/TrashService';
import { resolveItemIcon, openDesktopItem } from '../../services/ItemResolutionService';
import { FSNode } from '../apps/files/filesystemData';
import { DesktopLayoutEntry } from '../../services/DesktopLayoutStore';
import { DesktopViewStore, DESKTOP_ICON_SIZE_CHANGED_EVENT } from '../../services/DesktopViewStore';

interface DesktopIconProps {
  shortcut: FSNode | any;
  layout?: DesktopLayoutEntry;
  isSelected?: boolean;
  isRenaming?: boolean;
  isCut?: boolean;
  dragDelta?: { x: number; y: number };
  onItemMouseDown?: (e: React.MouseEvent) => void;
  onItemDoubleClick?: () => void;
  onItemContextMenu?: (e: React.MouseEvent) => void;
  onRenameSubmit?: (newName: string) => void;
  onRenameCancel?: () => void;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({
  shortcut,
  layout,
  isSelected = false,
  isRenaming = false,
  isCut = false,
  dragDelta = { x: 0, y: 0 },
  onItemMouseDown,
  onItemDoubleClick,
  onItemContextMenu,
  onRenameSubmit,
  onRenameCancel,
}) => {
  const { openApp, requestConfirm } = useOS();
  const [isTrashEmpty, setIsTrashEmpty] = useState(() => TrashService.getInstance().isEmpty());
  const [renameValue, setRenameValue] = useState(shortcut.name);
  const [iconConfig, setIconConfig] = useState(() => DesktopViewStore.getInstance().getConfig());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSizeChanged = () => {
      setIconConfig(DesktopViewStore.getInstance().getConfig());
    };
    window.addEventListener(DESKTOP_ICON_SIZE_CHANGED_EVENT, handleSizeChanged);
    return () => {
      window.removeEventListener(DESKTOP_ICON_SIZE_CHANGED_EVENT, handleSizeChanged);
    };
  }, []);

  useEffect(() => {
    const unsub = TrashService.getInstance().subscribe(() => {
      setIsTrashEmpty(TrashService.getInstance().isEmpty());
    });
    return unsub;
  }, []);

  useEffect(() => {
    setRenameValue(shortcut.name);
  }, [shortcut.name]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      const dotIdx = shortcut.name.lastIndexOf('.');
      if (shortcut.type === 'file' && dotIdx > 0) {
        inputRef.current.setSelectionRange(0, dotIdx);
      } else {
        inputRef.current.select();
      }
    }
  }, [isRenaming, shortcut.name, shortcut.type]);

  const handleDoubleClick = () => {
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    window.dispatchEvent(new CustomEvent('windroid-clear-launch-overlay'));
    window.dispatchEvent(new CustomEvent('aether-clear-launch-overlay'));
    window.dispatchEvent(new CustomEvent('windroid-cancel-desktop-drag'));
    window.dispatchEvent(new CustomEvent('aether-cancel-desktop-drag'));

    if (onItemDoubleClick) {
      onItemDoubleClick();
    } else {
      openDesktopItem(shortcut, { openApp, requestConfirm });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onItemContextMenu?.(e);
  };

  const submitRename = () => {
    let clean = renameValue.trim();
    if (shortcut.type === 'file' && (shortcut.extension === 'txt' || shortcut.name.endsWith('.txt'))) {
      if (clean && !clean.toLowerCase().endsWith('.txt')) {
        clean += '.txt';
      }
    }
    if (clean && clean !== shortcut.name) {
      onRenameSubmit?.(clean);
    } else {
      setRenameValue(shortcut.name);
      onRenameCancel?.();
    }
  };

  const renderIcon = () => {
    // Map numerical icon dimensions to tailwind style or inline width/height
    const sizeStyle = { width: `${iconConfig.iconSize}px`, height: `${iconConfig.iconSize}px` };
    return (
      <div
        style={sizeStyle}
        className="flex items-center justify-center shrink-0"
      >
        {resolveItemIcon(shortcut, {
          isEmptyTrash: isTrashEmpty,
          className: 'w-full h-full',
          badgeSize: iconConfig.badgeSize,
        })}
      </div>
    );
  };

  const gridCol = layout?.gridColumn ?? 0;
  const gridRow = layout?.gridRow ?? 0;
  const posX = 16 + gridCol * iconConfig.cellWidth + (dragDelta?.x ?? 0);
  const posY = 16 + gridRow * iconConfig.cellHeight + (dragDelta?.y ?? 0);

  return (
    <div
      onMouseDown={(e) => onItemMouseDown?.(e)}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleDoubleClick();
      }}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      style={{
        position: 'absolute',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${iconConfig.cellWidth}px`,
        height: `${iconConfig.cellHeight}px`,
        zIndex: isSelected ? 20 : 10,
      }}
      className={`p-1 rounded-[4px] aspect-square flex flex-col items-center justify-start gap-0.5 cursor-pointer transition-colors duration-150 group select-none focus:outline-none overflow-hidden ${
        isCut ? 'opacity-50' : 'opacity-100'
      } ${
        isSelected
          ? 'bg-white/25 dark:bg-white/20 backdrop-blur-md border border-dotted border-white'
          : 'hover:bg-white/10 dark:hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="p-0.5 flex items-center justify-center">
        {renderIcon()}
      </div>

      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') {
              setRenameValue(shortcut.name);
              onRenameCancel?.();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-xs text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1 py-0.5 rounded border border-blue-500 outline-none"
        />
      ) : (
        <span
          style={{
            fontSize: iconConfig.fontSize,
            maxWidth: `${iconConfig.labelMaxWidth}px`,
            lineHeight: 1.2,
            paddingBottom: '2px',
          }}
          className="font-medium tracking-tight text-center text-white break-words max-w-full line-clamp-2"
        >
          {shortcut.name}
        </span>
      )}
    </div>
  );
};
