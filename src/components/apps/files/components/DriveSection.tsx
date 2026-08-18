import React from 'react';
import { SystemDrive } from '../models/drive';
import { StorageProvider } from '../providers/StorageProvider';
import { CustomDriveIcon } from '../../../icons/CustomAppIcons';
import { 
  Usb, Server, Disc, Lock, Unlock, 
  LogOut, Play, Info, AlertTriangle, ShieldCheck 
} from 'lucide-react';

interface DriveSectionProps {
  drives: SystemDrive[];
  provider: StorageProvider;
  selectedDriveIds: Set<string>;
  onSelectDrive: (driveId: string, multiSelect?: boolean) => void;
  onOpenDrive: (drive: SystemDrive) => void;
  onShowProperties: (drive: SystemDrive) => void;
  onContextMenuDrive: (e: React.MouseEvent, drive: SystemDrive) => void;
  onDriveUpdated: () => void;
}

export const DriveSection: React.FC<DriveSectionProps> = ({
  drives,
  provider,
  selectedDriveIds,
  onSelectDrive,
  onOpenDrive,
  onShowProperties,
  onContextMenuDrive,
  onDriveUpdated,
}) => {
  const internalDrives = drives.filter((d) => d.category === 'internal');
  const removableDrives = drives.filter((d) => d.category === 'removable');
  const networkDrives = drives.filter((d) => d.category === 'network');

  const formatCapacity = (freeBytes: number, totalBytes: number): string => {
    const freeGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(0);
    return `${freeGB} GB free of ${totalGB} GB`;
  };

  const handleEject = async (e: React.MouseEvent, drive: SystemDrive) => {
    e.stopPropagation();
    try {
      await provider.eject(drive.id);
      onDriveUpdated();
    } catch (err) {
      console.error('Eject error:', err);
    }
  };

  const handleMount = async (e: React.MouseEvent, drive: SystemDrive) => {
    e.stopPropagation();
    try {
      await provider.mount(drive.id);
      onDriveUpdated();
    } catch (err) {
      console.error('Mount error:', err);
    }
  };

  const handleUnmount = async (e: React.MouseEvent, drive: SystemDrive) => {
    e.stopPropagation();
    try {
      await provider.unmount(drive.id);
      onDriveUpdated();
    } catch (err) {
      console.error('Unmount error:', err);
    }
  };

  const renderDriveCard = (drive: SystemDrive) => {
    const isLocked = drive.isEncrypted && !drive.isMounted;
    const isSelected = selectedDriveIds.has(drive.id);

    return (
      <div
        key={drive.id}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onSelectDrive(drive.id, e.ctrlKey || e.metaKey);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenDrive(drive);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelectDrive(drive.id, false);
          onContextMenuDrive(e, drive);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onOpenDrive(drive);
          } else if (e.key === ' ') {
            e.preventDefault();
            onShowProperties(drive);
          }
        }}
        className={`group relative p-3.5 transition-all duration-150 cursor-pointer flex items-center gap-3.5 select-none border focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-none ${
          isSelected
            ? 'bg-[#E5F3FF] border-transparent text-slate-900'
            : 'bg-white/70 dark:bg-slate-800/50 hover:bg-[#E5F3FF] hover:border-transparent text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/60'
        }`}
      >
        {/* Drive Icon */}
        <div className="relative p-0 bg-transparent border-0 shrink-0 flex items-center justify-center">
          {drive.type === 'usb' || drive.category === 'removable' ? (
            <Usb className="w-7 h-7 text-slate-700 dark:text-slate-300" />
          ) : drive.type === 'network' ? (
            <Server className="w-7 h-7 text-slate-700 dark:text-slate-300" />
          ) : (
            <CustomDriveIcon className="w-7 h-7" />
          )}

          {/* Status Overlay Badges */}
          {isLocked && (
            <div className="absolute -top-1 -right-1 p-1 bg-amber-500 text-white rounded-full">
              <Lock className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-medium text-xs truncate text-slate-900 dark:text-white">
              {drive.displayName}
            </span>
            {drive.isSystemDrive && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                System
              </span>
            )}
          </div>

          {/* Capacity Progress Bar or Locked State */}
          {isLocked ? (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked Encrypted Drive
            </span>
          ) : !drive.isMounted ? (
            <span className="text-[11px] text-slate-400 font-medium">
              Not mounted
            </span>
          ) : (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    drive.usagePercent > 85 ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${drive.usagePercent}%` }}
                />
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                {formatCapacity(drive.freeBytes, drive.totalBytes)}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions (Eject / Mount / Unmount / Info) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          {!drive.isMounted ? (
            <button
              onClick={(e) => handleMount(e, drive)}
              title="Mount drive"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            !drive.isSystemDrive && (
              <button
                onClick={(e) => handleUnmount(e, drive)}
                title="Unmount drive"
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
              >
                <Disc className="w-3.5 h-3.5" />
              </button>
            )
          )}
          {drive.isRemovable && drive.isEjectable && (
            <button
              onClick={(e) => handleEject(e, drive)}
              title="Eject drive"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Internal Storage Group */}
      {internalDrives.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
            <span>Internal Storage</span>
            <span className="text-[10px] font-medium text-slate-400 font-mono">({internalDrives.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {internalDrives.map(renderDriveCard)}
          </div>
        </div>
      )}

      {/* Removable Devices Group */}
      {removableDrives.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
            <span>Removable Storage</span>
            <span className="text-[10px] font-medium text-slate-400 font-mono">({removableDrives.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {removableDrives.map(renderDriveCard)}
          </div>
        </div>
      )}

      {/* Network Locations Group */}
      {networkDrives.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
            <span>Network Locations</span>
            <span className="text-[10px] font-medium text-slate-400 font-mono">({networkDrives.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {networkDrives.map(renderDriveCard)}
          </div>
        </div>
      )}
    </div>
  );
};
