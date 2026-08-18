import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { 
  FolderPlus, FilePlus, RotateCw, ArrowUpDown, 
  Monitor, Palette, Clipboard, Image, Check, ChevronRight, Grid, Link,
  ExternalLink, FolderSearch, CornerUpRight, Scissors, Copy, Edit3, Trash2, Info
} from 'lucide-react';
import { DesktopShortcutService, FS_CHANGED_EVENT } from '../../services/DesktopShortcutService';
import { ClipboardService, CLIPBOARD_CHANGED_EVENT } from '../../services/ClipboardService';
import { isProtectedSystemItem } from '../../services/SystemAppRegistry';
import { openDesktopItem } from '../../services/ItemResolutionService';
import { DesktopViewStore, DesktopIconSize, DESKTOP_ICON_CONFIGS } from '../../services/DesktopViewStore';

export const ContextMenu: React.FC = () => {
  const { contextMenu, closeContextMenu, openApp, requestConfirm, addNotification } = useOS();
  const [clipboardState, setClipboardState] = useState(() => ClipboardService.getInstance().getClipboard());
  const [showIconSizeSubmenu, setShowIconSizeSubmenu] = useState(false);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeIconSize = DesktopViewStore.getInstance().getIconSize();

  useEffect(() => {
    const handleClipboardChange = () => {
      setClipboardState(ClipboardService.getInstance().getClipboard());
    };
    window.addEventListener(CLIPBOARD_CHANGED_EVENT, handleClipboardChange);
    return () => {
      window.removeEventListener(CLIPBOARD_CHANGED_EVENT, handleClipboardChange);
    };
  }, []);

  // Reset submenu state when context menu is opened or moved
  useEffect(() => {
    if (contextMenu.isOpen) {
      setShowIconSizeSubmenu(false);
    }
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
        submenuTimeoutRef.current = null;
      }
    };
  }, [contextMenu.isOpen, contextMenu.x, contextMenu.y]);

  // Handle Escape key navigation (closing submenu first, then parent context menu)
  useEffect(() => {
    if (!contextMenu.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showIconSizeSubmenu) {
          e.preventDefault();
          e.stopPropagation();
          setShowIconSizeSubmenu(false);
        } else {
          closeContextMenu();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [contextMenu.isOpen, showIconSizeSubmenu, closeContextMenu]);

  if (!contextMenu.isOpen) return null;

  const handleSubmenuMouseEnter = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    setShowIconSizeSubmenu(true);
  };

  const handleSubmenuMouseLeave = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    submenuTimeoutRef.current = setTimeout(() => {
      setShowIconSizeSubmenu(false);
    }, 200);
  };

  const handleAction = (action: () => void) => {
    action();
    closeContextMenu();
  };

  const getItemPath = (node: any): string => {
    if (node.path && typeof node.path === 'string' && (node.path.startsWith('C:') || node.path.startsWith('This PC'))) {
      return node.path;
    }
    if (node.id === 'sc_computer' || node.name === 'This PC') return 'This PC';
    if (node.id === 'sc_recycle_bin' || node.name === 'Recycle Bin') return 'Recycle Bin';
    return `C:\\Users\\Alex\\Desktop\\${node.name}`;
  };

  const targetItems = contextMenu.targetItems || [];
  const isItemMenu = targetItems.length > 0;
  const isMulti = targetItems.length > 1;
  const singleItem = targetItems[0];

  // System protection status
  const protectedItems = targetItems.filter((item) => isProtectedSystemItem(item));
  const eligibleItems = targetItems.filter((item) => !isProtectedSystemItem(item));
  const isSingleProtected = !isMulti && singleItem && isProtectedSystemItem(singleItem);

  // Checks for virtual system items
  const isThisPc = !isMulti && singleItem && (
    singleItem.id === 'sc_computer' ||
    singleItem.targetId === 'this_pc' ||
    singleItem.targetAppId === 'computer' ||
    singleItem.name === 'This PC'
  );
  const isRecycleBin = !isMulti && singleItem && (
    singleItem.id === 'sc_recycle_bin' ||
    singleItem.targetId === 'recycle_bin' ||
    singleItem.targetAppId === 'recycle_bin' ||
    singleItem.name === 'Recycle Bin'
  );

  // Button disabled logic for Item Menu
  const isOpenDisabled = isMulti;
  const isOpenLocationDisabled = isMulti || isThisPc || isRecycleBin;
  const isCreateShortcutDisabled = !isMulti && (isThisPc || isRecycleBin);
  const isCutDisabled = isMulti ? eligibleItems.length === 0 : isSingleProtected;
  const isCopyDisabled = isMulti ? eligibleItems.length === 0 : isSingleProtected;
  const isRenameDisabled = isMulti || isSingleProtected || singleItem?.canRename === false;
  const isDeleteDisabled = isMulti ? eligibleItems.length === 0 : (isSingleProtected || singleItem?.canDelete === false);

  // Tooltips for disabled items
  const openLocationTooltip = isMulti
    ? 'Cannot open location for multiple items.'
    : (isThisPc || isRecycleBin)
    ? 'Virtual system items do not have a file location.'
    : '';

  const cutTooltip = isMulti
    ? (eligibleItems.length === 0 ? 'Selected items are protected system items and cannot be moved.' : '')
    : (isSingleProtected ? 'This protected system item cannot be moved.' : '');

  const copyTooltip = isMulti
    ? (eligibleItems.length === 0 ? 'Selected items are protected system items and cannot be copied.' : '')
    : (isSingleProtected ? 'Protected system applications cannot be copied. Create a shortcut instead.' : '');

  const renameTooltip = isMulti
    ? 'Rename is not available for multiple items.'
    : (isSingleProtected || singleItem?.canRename === false ? 'This protected system item cannot be renamed.' : '');

  const deleteTooltip = isMulti
    ? (eligibleItems.length === 0 ? 'This Windroid OS system item cannot be deleted.' : '')
    : (isSingleProtected || singleItem?.canDelete === false ? 'This protected system item cannot be deleted.' : '');

  // Render Item Context Menu
  if (isItemMenu) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ top: contextMenu.y, left: contextMenu.x }}
        className="fixed z-[9999] w-56 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-2xl text-[12px] font-medium text-[#202124] dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
      >
        {/* Group 1: Open */}
        <button
          disabled={isOpenDisabled}
          title={isOpenDisabled ? 'Cannot open multiple items at once.' : ''}
          onClick={() => handleAction(() => {
            if (isMulti) return;
            openDesktopItem(singleItem, { openApp, requestConfirm });
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isOpenDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <ExternalLink className={`w-4 h-4 shrink-0 stroke-[1.75] ${isOpenDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Open</span>
        </button>

        <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

        {/* Group 2: Open File Location & Create Shortcut */}
        <button
          disabled={isOpenLocationDisabled}
          title={openLocationTooltip}
          onClick={() => handleAction(() => {
            if (isOpenLocationDisabled) return;
            const targetAppId = singleItem.targetAppId || singleItem.appId || singleItem.systemAppId;
            const resolvedTarget = targetAppId ? DesktopShortcutService.getInstance().resolveTargetApp(targetAppId) : null;
            if (resolvedTarget && resolvedTarget.installationPath) {
              openApp('files', { initialPath: resolvedTarget.installationPath });
            } else {
              openApp('files', { initialPath: 'Desktop', selectItemId: singleItem.id });
            }
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isOpenLocationDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <FolderSearch className={`w-4 h-4 shrink-0 stroke-[1.75] ${isOpenLocationDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Open File Location</span>
        </button>

        <button
          disabled={isCreateShortcutDisabled}
          title={isCreateShortcutDisabled ? 'System shortcut already exists on Desktop.' : ''}
          onClick={() => handleAction(() => {
            if (isMulti) {
              if (protectedItems.length > 0) {
                requestConfirm({
                  title: 'Create Shortcuts',
                  message: `The following protected system item(s) cannot have shortcuts created:\n${protectedItems.map((b) => `• ${b.name}`).join('\n')}\n\nDo you want to create shortcuts for the remaining ${eligibleItems.length} eligible item(s)?`,
                  confirmLabel: 'Create Eligible Shortcuts',
                  cancelLabel: 'Cancel',
                  onConfirm: () => {
                    eligibleItems.forEach((item) => DesktopShortcutService.getInstance().createShortcutForNode(item));
                  },
                });
              } else {
                targetItems.forEach((item) => DesktopShortcutService.getInstance().createShortcutForNode(item));
              }
            } else {
              DesktopShortcutService.getInstance().createShortcutForNode(singleItem);
            }
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isCreateShortcutDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <CornerUpRight className={`w-4 h-4 shrink-0 stroke-[1.75] ${isCreateShortcutDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Create Shortcut</span>
        </button>

        <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

        {/* Group 3: Cut & Copy */}
        <button
          disabled={isCutDisabled}
          title={cutTooltip}
          onClick={() => handleAction(() => {
            if (isMulti) {
              if (protectedItems.length > 0) {
                requestConfirm({
                  title: 'Cut Items',
                  message: `The following protected system item(s) cannot be moved:\n${protectedItems.map((b) => `• ${b.name}`).join('\n')}\n\nDo you want to cut the remaining ${eligibleItems.length} eligible item(s)?`,
                  confirmLabel: 'Cut Eligible Items',
                  cancelLabel: 'Cancel',
                  onConfirm: () => {
                    ClipboardService.getInstance().setClipboard({ action: 'cut', nodes: eligibleItems });
                  },
                });
              } else {
                ClipboardService.getInstance().setClipboard({ action: 'cut', nodes: targetItems });
              }
            } else {
              if (isSingleProtected) return;
              ClipboardService.getInstance().setClipboard({ action: 'cut', nodes: [singleItem] });
            }
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isCutDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <Scissors className={`w-4 h-4 shrink-0 stroke-[1.75] ${isCutDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Cut</span>
        </button>

        <button
          disabled={isCopyDisabled}
          title={copyTooltip}
          onClick={() => handleAction(() => {
            if (isMulti) {
              if (protectedItems.length > 0) {
                requestConfirm({
                  title: 'Copy Items',
                  message: `The following protected system item(s) cannot be copied:\n${protectedItems.map((b) => `• ${b.name}`).join('\n')}\n\nDo you want to copy the remaining ${eligibleItems.length} eligible item(s)?`,
                  confirmLabel: 'Copy Eligible Items',
                  cancelLabel: 'Cancel',
                  onConfirm: () => {
                    ClipboardService.getInstance().setClipboard({ action: 'copy', nodes: eligibleItems });
                  },
                });
              } else {
                ClipboardService.getInstance().setClipboard({ action: 'copy', nodes: targetItems });
              }
            } else {
              if (isSingleProtected) return;
              ClipboardService.getInstance().setClipboard({ action: 'copy', nodes: [singleItem] });
            }
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isCopyDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <Copy className={`w-4 h-4 shrink-0 stroke-[1.75] ${isCopyDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Copy</span>
        </button>

        <button
          onClick={() => handleAction(() => {
            const paths = targetItems.map(getItemPath).join('\n');
            navigator.clipboard.writeText(paths);
            addNotification({
              title: 'Clipboard',
              message: targetItems.length > 1 ? `Copied ${targetItems.length} paths to clipboard` : 'Path copied to clipboard',
              type: 'info',
            });
          })}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
        >
          <Link className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
          <span>Copy as path</span>
        </button>

        <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

        {/* Group 4: Rename & Delete */}
        <button
          disabled={isRenameDisabled}
          title={renameTooltip}
          onClick={() => handleAction(() => {
            if (isRenameDisabled) {
              if (isSingleProtected) {
                requestConfirm({
                  title: 'System item protected',
                  message: 'This protected system item cannot be renamed.',
                  confirmLabel: 'OK',
                  onConfirm: () => {},
                });
              }
              return;
            }
            if (contextMenu.onRenameRequested) {
              contextMenu.onRenameRequested(singleItem.id);
            }
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isRenameDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <Edit3 className={`w-4 h-4 shrink-0 stroke-[1.75] ${isRenameDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Rename</span>
        </button>

        <button
          disabled={isDeleteDisabled}
          title={deleteTooltip}
          onClick={() => handleAction(() => {
            if (isMulti) {
              if (protectedItems.length > 0 && eligibleItems.length === 0) {
                requestConfirm({
                  title: 'System item protected',
                  message: 'This Windroid OS system item cannot be deleted.',
                  confirmLabel: 'OK',
                  onConfirm: () => {},
                });
                return;
              }
              if (protectedItems.length > 0 && eligibleItems.length > 0) {
                requestConfirm({
                  title: 'Delete Items - System Protection',
                  message: `The following protected system items cannot be deleted:\n${protectedItems.map((b) => `• ${b.name}`).join('\n')}\n\nDo you want to continue deleting the remaining ${eligibleItems.length} eligible item(s)?`,
                  confirmLabel: 'Delete Eligible Items Only',
                  cancelLabel: 'Cancel',
                  onConfirm: () => {
                    eligibleItems.forEach((item) => DesktopShortcutService.getInstance().deleteDesktopNode(item.id));
                    addNotification({
                      title: 'Recycle Bin',
                      message: `Moved ${eligibleItems.length} item(s) to Recycle Bin`,
                      type: 'info',
                    });
                  },
                });
                return;
              }
              targetItems.forEach((item) => DesktopShortcutService.getInstance().deleteDesktopNode(item.id));
              addNotification({
                title: 'Recycle Bin',
                message: `Moved ${targetItems.length} item(s) to Recycle Bin`,
                type: 'info',
              });
            } else {
              if (isSingleProtected || singleItem?.canDelete === false) {
                requestConfirm({
                  title: 'System item protected',
                  message: 'This Windroid OS system item cannot be deleted.',
                  confirmLabel: 'OK',
                  onConfirm: () => {},
                });
                return;
              }
              DesktopShortcutService.getInstance().deleteDesktopNode(singleItem.id);
              addNotification({
                title: 'Recycle Bin',
                message: `Moved '${singleItem.name}' to Recycle Bin`,
                type: 'info',
              });
            }
          })}
          className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
            isDeleteDisabled
              ? 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
              : 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
          }`}
        >
          <Trash2 className={`w-4 h-4 shrink-0 stroke-[1.75] ${isDeleteDisabled ? 'text-[#9CA3AF] dark:text-slate-600' : 'text-[#202124] dark:text-slate-200'}`} />
          <span>Delete</span>
        </button>

        <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

        {/* Group 5: Properties */}
        <button
          onClick={() => handleAction(() => {
            if (isMulti) {
              requestConfirm({
                title: 'Properties - Selection',
                message: `Selected Items: ${targetItems.length}\nProtected Items: ${protectedItems.length}\nEligible Items: ${eligibleItems.length}\nLocation: C:\\Users\\Alex\\Desktop`,
                confirmLabel: 'Close',
                onConfirm: () => {},
              });
            } else {
              const createdStr = singleItem.createdAt ? new Date(singleItem.createdAt).toLocaleString() : 'System Default';
              const modifiedStr = singleItem.modifiedAt ? new Date(singleItem.modifiedAt).toLocaleString() : 'System Default';
              const targetAppId = singleItem.targetAppId || singleItem.appId;
              const resolvedTarget = targetAppId ? DesktopShortcutService.getInstance().resolveTargetApp(targetAppId) : null;

              const details = [
                `Name: ${singleItem.name}`,
                `Type: ${singleItem.type === 'shortcut' ? 'Application Shortcut' : singleItem.type === 'folder' ? 'File Folder' : isSingleProtected ? 'System Object' : 'File'}`,
                `Location: C:\\Users\\Alex\\Desktop`,
                `Protected System Item: ${isSingleProtected ? 'Yes' : 'No'}`,
                `Created: ${createdStr}`,
                `Modified: ${modifiedStr}`,
              ];
              if (resolvedTarget) {
                details.push(`Target Application: ${resolvedTarget.name}`);
                details.push(`Runtime: ${resolvedTarget.runtime}`);
              }

              requestConfirm({
                title: `Properties - ${singleItem.name}`,
                message: details.join('\n'),
                confirmLabel: 'Close',
                onConfirm: () => {},
              });
            }
          })}
          className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
        >
          <Info className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
          <span>Properties</span>
        </button>
      </div>
    );
  }

  // Render Desktop Context Menu (when clicking empty desktop)
  const hasClipboardItems = !!clipboardState && clipboardState.nodes.length > 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top: contextMenu.y, left: contextMenu.x }}
      className="fixed z-[9999] w-52 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-2xl text-[12px] font-medium text-[#202124] dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
    >
      <button
        onClick={() => handleAction(() => {
          const newFolder = DesktopShortcutService.getInstance().createNewFolderOnDesktop();
          if (newFolder) {
            window.dispatchEvent(new CustomEvent('windroid-desktop-item-created', { detail: { id: newFolder.id } }));
            window.dispatchEvent(new CustomEvent('aether-desktop-item-created', { detail: { id: newFolder.id } }));
          }
        })}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <FolderPlus className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>New folder</span>
      </button>

      <button
        onClick={() => handleAction(() => {
          const newDoc = DesktopShortcutService.getInstance().createNewDocumentOnDesktop();
          if (newDoc) {
            window.dispatchEvent(new CustomEvent('windroid-desktop-item-created', { detail: { id: newDoc.id } }));
            window.dispatchEvent(new CustomEvent('aether-desktop-item-created', { detail: { id: newDoc.id } }));
          }
        })}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <FilePlus className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>New text document</span>
      </button>

      <button
        disabled={!hasClipboardItems}
        onClick={() => handleAction(() => {
          ClipboardService.getInstance().pasteToFolder('u_alex_desktop');
        })}
        className={`w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent text-left transition-colors ${
          hasClipboardItems
            ? 'hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 cursor-pointer'
            : 'text-[#9CA3AF] dark:text-slate-600 cursor-not-allowed'
        }`}
        title={hasClipboardItems ? `Paste ${clipboardState?.nodes.length} item(s)` : 'Clipboard is empty'}
      >
        <Clipboard className={`w-4 h-4 shrink-0 stroke-[1.75] ${hasClipboardItems ? 'text-[#202124] dark:text-slate-200' : 'text-[#9CA3AF] dark:text-slate-600'}`} />
        <span className="flex items-center justify-between w-full">
          Paste
          {hasClipboardItems && (
            <span className="text-[10px] text-[#5F6368] dark:text-slate-400 font-mono">
              ({clipboardState?.nodes.length})
            </span>
          )}
        </span>
      </button>

      <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

      <button
        onClick={() => handleAction(() => {
          window.dispatchEvent(new CustomEvent(FS_CHANGED_EVENT));
          window.dispatchEvent(new CustomEvent('windroid-desktop-refresh-requested'));
          window.dispatchEvent(new CustomEvent('aether-desktop-refresh-requested'));
        })}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <RotateCw className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>Refresh desktop</span>
      </button>

      <button
        onClick={() => handleAction(() => {})}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <ArrowUpDown className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>↑↓Sort icons by...</span>
      </button>

      {/* Icon Size Submenu */}
      <div
        className="relative group/iconsize"
        onMouseEnter={handleSubmenuMouseEnter}
        onMouseLeave={handleSubmenuMouseLeave}
      >
        <button
          onClick={() => {
            if (submenuTimeoutRef.current) {
              clearTimeout(submenuTimeoutRef.current);
              submenuTimeoutRef.current = null;
            }
            setShowIconSizeSubmenu((prev) => !prev);
          }}
          onFocus={handleSubmenuMouseEnter}
          className="w-full px-3 py-1.5 flex items-center justify-between gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5">
            <Grid className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
            <span>Icon Size</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showIconSizeSubmenu && (
          <div
            onMouseEnter={handleSubmenuMouseEnter}
            onMouseLeave={handleSubmenuMouseLeave}
            className="absolute left-full top-0 ml-1 w-44 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-2xl text-[12px] font-medium text-[#202124] dark:text-slate-200 z-[10000] animate-in fade-in zoom-in-95 duration-100"
          >
            {(['small', 'medium', 'large', 'extra-large'] as DesktopIconSize[]).map((sz) => {
              const cfg = DESKTOP_ICON_CONFIGS[sz];
              const isActive = activeIconSize === sz;
              return (
                <button
                  key={sz}
                  onClick={() => handleAction(() => {
                    DesktopViewStore.getInstance().setIconSize(sz);
                  })}
                  className="w-full px-3 py-1.5 flex items-center justify-between gap-2 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left"
                >
                  <span>{cfg.label}</span>
                  {isActive && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

      <button
        onClick={() => handleAction(() => openApp('settings', { tab: 'personalization' }))}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <Image className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>Change wallpaper</span>
      </button>

      <button
        onClick={() => handleAction(() => openApp('settings', { tab: 'display' }))}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <Monitor className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>Display settings</span>
      </button>

      <button
        onClick={() => handleAction(() => openApp('settings', { tab: 'personalization' }))}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-slate-800/80 active:bg-[#F1F3F4] dark:active:bg-slate-700/80 text-[#202124] dark:text-slate-200 transition-colors cursor-pointer text-left group"
      >
        <Palette className="w-4 h-4 text-[#202124] dark:text-slate-200 shrink-0 stroke-[1.75]" />
        <span>Personalize...</span>
      </button>
    </div>
  );
};
