import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { useOS } from '../../context/OSContext';
import { DesktopIcon } from './DesktopIcon';
import { DesktopDragOverlay } from './DesktopDragOverlay';
import { WindowFrame } from '../windows/WindowFrame';
import { ContextMenu } from './ContextMenu';
import { QuickSettingsPanel } from '../panels/QuickSettingsPanel';
import { NotificationsPanel } from '../panels/NotificationsPanel';
import { SystemAgentPanel } from '../panels/SystemAgentPanel';
import { UniversalSearch } from '../panels/UniversalSearch';
import { AppLauncherGrid } from '../panels/AppLauncherGrid';
import { ModalConfirm } from '../common/ModalConfirm';
import { SystemDialogRenderer } from '../dialogs/SystemDialog';

// Applications
import { FilesApp } from '../apps/files/FilesApp';
import { BrowserApp } from '../apps/browser/BrowserApp';
import { SettingsApp } from '../apps/settings/SettingsApp';
import { TerminalApp } from '../apps/terminal/TerminalApp';
import { AgentApp } from '../apps/agent/AgentApp';
import { PhotosApp } from '../apps/photos/PhotosApp';
import { MusicApp } from '../apps/music/MusicApp';
import { CalendarApp } from '../apps/calendar/CalendarApp';
import { UnifiedAppInstaller } from '../../apps/installer/UnifiedAppInstaller';
import { InstallWindroidScreen } from '../../apps/installer/InstallWindroidScreen';
import { SimulatedAppRunner } from '../../apps/runner/SimulatedAppRunner';
import { DesktopShortcutService, FS_CHANGED_EVENT } from '../../services/DesktopShortcutService';
import { DesktopLayoutStore, DesktopLayoutEntry } from '../../services/DesktopLayoutStore';
import { DesktopViewStore, DESKTOP_ICON_SIZE_CHANGED_EVENT } from '../../services/DesktopViewStore';
import { TrashService } from '../apps/files/services/TrashService';
import { StorageEventService } from '../apps/files/services/StorageEventService';
import { FSNode, loadFilesystemFromStorage, isUserVisibleDesktopItem } from '../apps/files/filesystemData';
import { ClipboardService, CLIPBOARD_CHANGED_EVENT } from '../../services/ClipboardService';
import { isProtectedSystemItem } from '../../services/SystemAppRegistry';
import { openDesktopItem } from '../../services/ItemResolutionService';

const PADDING_LEFT = 16;
const PADDING_TOP = 16;

import { SAFE_MODE_FLAGS, metrics } from '../../system/diagnostics';

export const DesktopArea: React.FC = () => {
  metrics.trackRender('DesktopArea');

  const {
    wallpaper, 
    windows, 
    openContextMenu, 
    closeAllPanels,
    closeWindow,
    developerMode,
    runtimeMode,
    openApp,
    requestConfirm,
    addNotification
  } = useOS();

  const [desktopNodesWithLayout, setDesktopNodesWithLayout] = useState<
    Array<{ item: FSNode; layout: DesktopLayoutEntry }>
  >([]);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [cutItemIds, setCutItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClipboardChange = () => {
      const cb = ClipboardService.getInstance().getClipboard();
      if (cb && cb.action === 'cut') {
        setCutItemIds(new Set(cb.nodes.map((n) => n.id)));
      } else {
        setCutItemIds(new Set());
      }
    };
    window.addEventListener(CLIPBOARD_CHANGED_EVENT, handleClipboardChange);
    handleClipboardChange();
    return () => {
      window.removeEventListener(CLIPBOARD_CHANGED_EVENT, handleClipboardChange);
    };
  }, []);

  // Transient drag state for smooth rendering
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync ref to track drag interactions without stale closures
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    anchorItemId: string;
    initialSelectedIds: Set<string>;
    isMultiSelect: boolean;
    hasMovedBeyondThreshold: boolean;
    currentDelta: { x: number; y: number };
  } | null>(null);

  const suppressClickRef = useRef<boolean>(false);

  const refreshDesktopContent = useCallback((clearSelection = false) => {
    const fs = loadFilesystemFromStorage(developerMode, runtimeMode);
    const desktopFolder = DesktopShortcutService.getInstance().findDesktopFolder(fs);
    const rawChildren = desktopFolder?.children || [];

    // Filter hidden/internal nodes unless developer mode allows
    const visibleChildren = rawChildren.filter((node) =>
      isUserVisibleDesktopItem(node, developerMode, runtimeMode)
    );

    // Reconcile nodes with layout store using active icon size dimensions
    const iconConfig = DesktopViewStore.getInstance().getConfig();
    const reconciled = DesktopLayoutStore.getInstance().reconcile(
      visibleChildren,
      iconConfig.cellWidth,
      iconConfig.cellHeight
    );

    // Map back to FSNode objects preserving layout slot order
    const nodeMap = new Map<string, FSNode>();
    visibleChildren.forEach((child) => nodeMap.set(child.id, child));

    const finalItems: Array<{ item: FSNode; layout: DesktopLayoutEntry }> = [];
    reconciled.forEach((r) => {
      const node = nodeMap.get(r.id);
      if (node) {
        finalItems.push({ item: node, layout: r.layout });
      }
    });

    if (clearSelection) {
      setSelectedItemIds(new Set());
    }

    setDesktopNodesWithLayout((prev) => {
      if (!clearSelection && prev.length === finalItems.length) {
        const isSame = prev.every((p, idx) => {
          const f = finalItems[idx];
          return (
            p.item.id === f.item.id &&
            p.item.name === f.item.name &&
            p.item.modifiedAt === f.item.modifiedAt &&
            p.layout.gridRow === f.layout.gridRow &&
            p.layout.gridColumn === f.layout.gridColumn
          );
        });
        if (isSame) return prev;
      }
      return finalItems;
    });
  }, [developerMode, runtimeMode]);

  useEffect(() => {
    refreshDesktopContent();

    const handleFsChanged = () => {
      refreshDesktopContent(false);
    };

    const handleRefreshRequested = () => {
      refreshDesktopContent(true);
    };

    const handleIconSizeChanged = () => {
      refreshDesktopContent(false);
    };

    const handleItemCreated = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      refreshDesktopContent(false);
      if (customEvent.detail?.id) {
        setSelectedItemIds(new Set([customEvent.detail.id]));
        setRenamingItemId(customEvent.detail.id);
      }
    };

    window.addEventListener(FS_CHANGED_EVENT, handleFsChanged);
    window.addEventListener('windroid-desktop-refresh-requested', handleRefreshRequested);
    window.addEventListener('aether-desktop-refresh-requested', handleRefreshRequested);
    window.addEventListener(DESKTOP_ICON_SIZE_CHANGED_EVENT, handleIconSizeChanged);
    window.addEventListener('windroid-desktop-item-created', handleItemCreated);
    window.addEventListener('aether-desktop-item-created', handleItemCreated);
    const unsubStorage = StorageEventService.getInstance().subscribe(() => {
      refreshDesktopContent(false);
    });
    const unsubTrash = TrashService.getInstance().subscribe(() => {
      refreshDesktopContent(false);
    });

    return () => {
      window.removeEventListener(FS_CHANGED_EVENT, handleFsChanged);
      window.removeEventListener('windroid-desktop-refresh-requested', handleRefreshRequested);
      window.removeEventListener('aether-desktop-refresh-requested', handleRefreshRequested);
      window.removeEventListener(DESKTOP_ICON_SIZE_CHANGED_EVENT, handleIconSizeChanged);
      window.removeEventListener('windroid-desktop-item-created', handleItemCreated);
      window.removeEventListener('aether-desktop-item-created', handleItemCreated);
      unsubStorage();
      unsubTrash();
    };
  }, [refreshDesktopContent]);

  // Handle global mouse move & mouse up for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !dragRef.current.active) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const dist = Math.hypot(dx, dy);

      if (!dragRef.current.hasMovedBeyondThreshold) {
        if (dist >= 8) {
          dragRef.current.hasMovedBeyondThreshold = true;
          setIsDragging(true);

          // If the dragged item was NOT part of initial selection and not a multi-select,
          // clear previous selection and select only the dragged item
          const anchorId = dragRef.current.anchorItemId;
          if (!dragRef.current.isMultiSelect && !dragRef.current.initialSelectedIds.has(anchorId)) {
            setSelectedItemIds(new Set([anchorId]));
          }
        }
      }

      if (dragRef.current.hasMovedBeyondThreshold) {
        dragRef.current.currentDelta = { x: dx, y: dy };
        setDragDelta({ x: dx, y: dy });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragRef.current) return;

      const {
        hasMovedBeyondThreshold,
        anchorItemId,
        initialSelectedIds,
        isMultiSelect,
        currentDelta,
      } = dragRef.current;

      dragRef.current = null;

      if (hasMovedBeyondThreshold) {
        // Suppress subsequent click events so item isn't opened or selection reset
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 200);

        setIsDragging(false);
        setDragDelta({ x: 0, y: 0 });

        const iconConfig = DesktopViewStore.getInstance().getConfig();
        const cellW = iconConfig.cellWidth;
        const cellH = iconConfig.cellHeight;

        // Calculate grid column / row delta
        const colDelta = Math.round(currentDelta.x / cellW);
        const rowDelta = Math.round(currentDelta.y / cellH);

        if (colDelta !== 0 || rowDelta !== 0) {
          // Calculate desktop bounds
          const bounds = containerRef.current?.getBoundingClientRect() || {
            width: window.innerWidth,
            height: window.innerHeight - 120,
          };

          const maxCols = Math.max(1, Math.floor((bounds.width - PADDING_LEFT * 2) / cellW));
          const maxRows = Math.max(1, Math.floor((bounds.height - PADDING_TOP * 2) / cellH));

          // Which items are being moved?
          let activeSelectedIds = new Set(selectedItemIds);
          if (!activeSelectedIds.has(anchorItemId) && !initialSelectedIds.has(anchorItemId)) {
            activeSelectedIds = new Set([anchorItemId]);
          } else if (initialSelectedIds.has(anchorItemId) && !isMultiSelect) {
            activeSelectedIds = new Set(initialSelectedIds);
          }

          // Occupied slots by UNSELECTED items
          const occupiedSlots = new Set<string>();
          desktopNodesWithLayout.forEach(({ item, layout }) => {
            if (!activeSelectedIds.has(item.id)) {
              if (layout.gridColumn !== undefined && layout.gridRow !== undefined) {
                occupiedSlots.add(`${layout.gridColumn},${layout.gridRow}`);
              }
            }
          });

          // Helper to find nearest free slot
          const findNearestFreeSlot = (targetCol: number, targetRow: number) => {
            targetCol = Math.max(0, Math.min(maxCols - 1, targetCol));
            targetRow = Math.max(0, Math.min(maxRows - 1, targetRow));

            if (!occupiedSlots.has(`${targetCol},${targetRow}`)) {
              return { col: targetCol, row: targetRow };
            }

            let radius = 1;
            const maxRadius = Math.max(maxCols, maxRows);

            while (radius <= maxRadius) {
              let bestDist = Infinity;
              let bestSlot = { col: targetCol, row: targetRow };

              for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                  if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
                  const c = targetCol + dc;
                  const r = targetRow + dr;
                  if (c >= 0 && c < maxCols && r >= 0 && r < maxRows) {
                    if (!occupiedSlots.has(`${c},${r}`)) {
                      const dist = dc * dc + dr * dr;
                      if (dist < bestDist) {
                        bestDist = dist;
                        bestSlot = { col: c, row: r };
                      }
                    }
                  }
                }
              }

              if (bestDist < Infinity) return bestSlot;
              radius++;
            }

            return { col: targetCol, row: targetRow };
          };

          // Apply grid move to each selected item
          desktopNodesWithLayout.forEach(({ item, layout }) => {
            if (activeSelectedIds.has(item.id)) {
              const curCol = layout.gridColumn ?? 0;
              const curRow = layout.gridRow ?? 0;

              const targetCol = curCol + colDelta;
              const targetRow = curRow + rowDelta;

              const freeSlot = findNearestFreeSlot(targetCol, targetRow);
              occupiedSlots.add(`${freeSlot.col},${freeSlot.row}`);

              DesktopLayoutStore.getInstance().updateItemPosition(item.id, {
                gridColumn: freeSlot.col,
                gridRow: freeSlot.row,
                x: freeSlot.col * cellW + PADDING_LEFT,
                y: freeSlot.row * cellH + PADDING_TOP,
              });
            }
          });

          refreshDesktopContent();
        }
      } else {
        // Static click (no drag)
        if (isMultiSelect) {
          setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(anchorItemId)) {
              next.delete(anchorItemId);
            } else {
              next.add(anchorItemId);
            }
            return next;
          });
        } else {
          setSelectedItemIds(new Set([anchorItemId]));
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [desktopNodesWithLayout, selectedItemIds, refreshDesktopContent]);

  const cleanupDesktopDragAndOverlay = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    setDragDelta({ x: 0, y: 0 });
    if (typeof document !== 'undefined' && document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
  }, []);

  useEffect(() => {
    const handleClearOverlay = () => {
      cleanupDesktopDragAndOverlay();
    };
    window.addEventListener('windroid-clear-launch-overlay', handleClearOverlay);
    window.addEventListener('aether-clear-launch-overlay', handleClearOverlay);
    window.addEventListener('windroid-cancel-desktop-drag', handleClearOverlay);
    window.addEventListener('aether-cancel-desktop-drag', handleClearOverlay);
    return () => {
      window.removeEventListener('windroid-clear-launch-overlay', handleClearOverlay);
      window.removeEventListener('aether-clear-launch-overlay', handleClearOverlay);
      window.removeEventListener('windroid-cancel-desktop-drag', handleClearOverlay);
      window.removeEventListener('aether-cancel-desktop-drag', handleClearOverlay);
    };
  }, [cleanupDesktopDragAndOverlay]);

  const handleItemMouseDown = (e: React.MouseEvent, itemId: string) => {
    if (e.button !== 0) return; // Only left click for dragging
    e.stopPropagation();

    const isMultiSelect = e.ctrlKey || e.metaKey;

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      anchorItemId: itemId,
      initialSelectedIds: new Set(selectedItemIds),
      isMultiSelect,
      hasMovedBeyondThreshold: false,
      currentDelta: { x: 0, y: 0 },
    };
  };

  const handleItemDoubleClick = (item: FSNode) => {
    cleanupDesktopDragAndOverlay();
    openDesktopItem(item, { openApp, requestConfirm });
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: FSNode) => {
    e.preventDefault();
    e.stopPropagation();

    let nextSelectedIds: Set<string>;
    if (selectedItemIds.has(item.id)) {
      nextSelectedIds = new Set(selectedItemIds);
    } else {
      nextSelectedIds = new Set([item.id]);
      setSelectedItemIds(nextSelectedIds);
    }

    const selectedNodes = desktopNodesWithLayout
      .filter(({ item: node }) => nextSelectedIds.has(node.id))
      .map(({ item: node }) => node);

    openContextMenu(e.clientX, e.clientY, undefined, selectedNodes, (itemIdToRename) => {
      setRenamingItemId(itemIdToRename);
    });
  };

  const handleEmptyDesktopClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) return;
    closeAllPanels();
    setSelectedItemIds(new Set());
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY);
  };

  // Keyboard navigation / shortcut handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const selectedNodes = desktopNodesWithLayout
      .filter(({ item }) => selectedItemIds.has(item.id))
      .map(({ item }) => item);

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const eligibleList = selectedNodes.filter((node) => !isProtectedSystemItem(node));
      if (eligibleList.length > 0) {
        ClipboardService.getInstance().setClipboard({ action: 'copy', nodes: eligibleList });
        addNotification({ title: 'Clipboard', message: `Copied ${eligibleList.length} item(s)`, type: 'info' });
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      const eligibleList = selectedNodes.filter((node) => !isProtectedSystemItem(node));
      if (eligibleList.length > 0) {
        ClipboardService.getInstance().setClipboard({ action: 'cut', nodes: eligibleList });
        addNotification({ title: 'Clipboard', message: `Cut ${eligibleList.length} item(s)`, type: 'info' });
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      const cb = ClipboardService.getInstance().getClipboard();
      if (cb && cb.nodes.length > 0) {
        ClipboardService.getInstance().pasteToFolder('u_alex_desktop');
        addNotification({ title: 'Clipboard', message: `Pasted ${cb.nodes.length} item(s)`, type: 'info' });
      }
    } else if (e.key === 'Enter') {
      if (selectedNodes.length === 1) {
        openDesktopItem(selectedNodes[0], { openApp, requestConfirm });
      }
    } else if (e.key === 'F2') {
      if (selectedNodes.length === 1) {
        const node = selectedNodes[0];
        if (isProtectedSystemItem(node) || node.canRename === false) {
          requestConfirm({
            title: 'System item protected',
            message: 'This protected system item cannot be renamed.',
            confirmLabel: 'OK',
            onConfirm: () => {},
          });
        } else {
          setRenamingItemId(node.id);
        }
      }
    } else if (e.key === 'Delete') {
      if (selectedNodes.length === 0) return;
      const protectedList = selectedNodes.filter((node) => isProtectedSystemItem(node) || node.canDelete === false);
      const eligibleList = selectedNodes.filter((node) => !isProtectedSystemItem(node) && node.canDelete !== false);

      if (protectedList.length > 0 && eligibleList.length === 0) {
        requestConfirm({
          title: 'System item protected',
          message: 'This Windroid OS system item cannot be deleted.',
          confirmLabel: 'OK',
          onConfirm: () => {},
        });
        return;
      }

      if (protectedList.length > 0 && eligibleList.length > 0) {
        requestConfirm({
          title: 'Delete Items - System Protection',
          message: `The following protected system items cannot be deleted:\n${protectedList.map((b) => `• ${b.name}`).join('\n')}\n\nDo you want to continue deleting the remaining ${eligibleList.length} eligible item(s)?`,
          confirmLabel: 'Delete Eligible Items Only',
          cancelLabel: 'Cancel',
          onConfirm: () => {
            eligibleList.forEach((node) => DesktopShortcutService.getInstance().deleteDesktopNode(node.id));
          },
        });
        return;
      }

      eligibleList.forEach((node) => DesktopShortcutService.getInstance().deleteDesktopNode(node.id));
    }
  };

  const renderAppContent = (appId: string, initialState?: any) => {
    switch (appId) {
      case 'files':
        return <FilesApp initialState={initialState} />;
      case 'browser':
        return <BrowserApp initialState={initialState} />;
      case 'settings':
        return <SettingsApp initialState={initialState} />;
      case 'terminal':
        return <TerminalApp />;
      case 'agent':
        return <AgentApp />;
      case 'photos':
        return <PhotosApp />;
      case 'music':
        return <MusicApp initialState={initialState} />;
      case 'calendar':
        return <CalendarApp initialState={initialState} />;
      case 'installer':
        return (
          <UnifiedAppInstaller
            packagePath={initialState?.packagePath}
            onClose={() => {
              const installerWin = windows.find((w) => w.appId === 'installer');
              if (installerWin) closeWindow(installerWin.id);
            }}
          />
        );
      case 'install-windroid':
        return (
          <InstallWindroidScreen
            onClose={() => {
              const win = windows.find((w) => w.appId === 'install-windroid');
              if (win) closeWindow(win.id);
            }}
          />
        );
      default:
        return <SimulatedAppRunner appId={appId} initialState={initialState} />;
    }
  };

  return (
    <main
      ref={containerRef}
      onClick={handleEmptyDesktopClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="flex-1 relative overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-300 select-none outline-none"
      style={wallpaper.style}
    >
      {/* Absolute Grid Container for Desktop Icons */}
      <div className="absolute inset-0 pointer-events-none">
        {desktopNodesWithLayout.map(({ item, layout }) => {
          const isSelected = selectedItemIds.has(item.id);
          const isItemDragging = isDragging && isSelected;

          return (
            <div key={item.id} className="pointer-events-auto">
              <DesktopIcon
                shortcut={item}
                layout={layout}
                isSelected={isSelected}
                isRenaming={renamingItemId === item.id}
                isCut={cutItemIds.has(item.id)}
                dragDelta={isItemDragging ? dragDelta : { x: 0, y: 0 }}
                onItemMouseDown={(e) => handleItemMouseDown(e, item.id)}
                onItemDoubleClick={() => handleItemDoubleClick(item)}
                onItemContextMenu={(e) => handleItemContextMenu(e, item)}
                onRenameSubmit={(newName) => {
                  setRenamingItemId(null);
                  DesktopShortcutService.getInstance().renameDesktopNode(item.id, newName);
                }}
                onRenameCancel={() => setRenamingItemId(null)}
              />
            </div>
          );
        })}
      </div>

      {/* Render Active Desktop Windows */}
      <AnimatePresence>
        {windows
          .filter((win) => !win.isMinimized)
          .map((win) => (
            <WindowFrame key={win.id} windowState={win}>
              {renderAppContent(win.appId, win.initialState)}
            </WindowFrame>
          ))}
      </AnimatePresence>

      {/* Slide-over & Floating System Panels */}
      <QuickSettingsPanel />
      <NotificationsPanel />
      <SystemAgentPanel />
      <UniversalSearch />
      <AppLauncherGrid />

      {/* Desktop Drag & Drop Overlay */}
      <DesktopDragOverlay />

      {/* Global Context Menu */}
      <ContextMenu />

      {/* Global Confirmation Dialog */}
      <ModalConfirm />

      {/* Global Centralized System Dialog */}
      <SystemDialogRenderer />
    </main>
  );
};
