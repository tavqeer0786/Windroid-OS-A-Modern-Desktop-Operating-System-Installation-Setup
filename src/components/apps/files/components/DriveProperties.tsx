import React, { useState } from 'react';
import { SystemDrive } from '../models/drive';
import { StorageProvider } from '../providers/StorageProvider';
import { CustomDriveIcon } from '../../../icons/CustomAppIcons';
import { 
  X, ShieldAlert, Lock, Unlock, 
  CheckCircle2, AlertTriangle, Disc, Usb, Server 
} from 'lucide-react';

interface DrivePropertiesProps {
  drive: SystemDrive;
  provider: StorageProvider;
  onClose: () => void;
  onDriveUpdated?: () => void;
}

export const DrivePropertiesModal: React.FC<DrivePropertiesProps> = ({
  drive,
  provider,
  onClose,
  onDriveUpdated,
}) => {
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) return;

    setIsUnlocking(true);
    setUnlockError(null);

    try {
      if (provider.unlock) {
        const success = await provider.unlock(drive.id, unlockPassword);
        if (success) {
          setUnlockPassword('');
          onDriveUpdated?.();
          onClose();
        } else {
          setUnlockError('Invalid password or key file for encrypted volume.');
        }
      } else {
        setUnlockError('Encryption unlock is not supported by current provider.');
      }
    } catch (err: any) {
      setUnlockError(err.message || 'Failed to unlock volume.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const renderIcon = () => {
    if (drive.type === 'usb' || drive.category === 'removable') {
      return <Usb className="w-8 h-8 text-blue-500" />;
    }
    if (drive.type === 'optical') {
      return <Disc className="w-8 h-8 text-indigo-500" />;
    }
    if (drive.type === 'network') {
      return <Server className="w-8 h-8 text-emerald-500" />;
    }
    return <CustomDriveIcon className="w-8 h-8" />;
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] bg-transparent flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 dark:bg-slate-900/95 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CustomDriveIcon className="w-5 h-5" />
            <h3 className="font-bold text-sm truncate max-w-[260px]">{drive.displayName} Properties</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Main Info Card */}
          <div className="flex items-center gap-4 p-3.5">
            <div className="p-3 shrink-0">
              {renderIcon()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{drive.displayName}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {drive.devicePath} ({drive.filesystem.toUpperCase()})
              </div>
            </div>
          </div>

          {/* Encrypted Unlock Form if Locked */}
          {drive.isEncrypted && !drive.isMounted && (
            <form onSubmit={handleUnlock} className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Volume is Encrypted (LUKS)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Enter passphrase to unlock and mount this device.
              </p>
              <input
                type="password"
                placeholder="Passphrase"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {unlockError && (
                <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                  {unlockError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isUnlocking ? 'Unlocking...' : 'Unlock Volume'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Usage Progress */}
          {drive.isMounted && drive.totalBytes > 0 && (
            <div className="space-y-2 p-3.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Used Space ({drive.usagePercent}%)</span>
                <span>{formatBytes(drive.usedBytes)} / {formatBytes(drive.totalBytes)}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    drive.usagePercent > 85 ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${drive.usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Free Space: {formatBytes(drive.freeBytes)}</span>
                <span>Total Capacity: {formatBytes(drive.totalBytes)}</span>
              </div>
            </div>
          )}

          {/* Detailed Specifications */}
          <div className="space-y-2">
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Mount Point:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{drive.mountPoint || 'Not mounted'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Device Node:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{drive.devicePath}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Filesystem:</span>
              <span className="font-mono uppercase text-slate-800 dark:text-slate-200">{drive.filesystem}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">UUID:</span>
              <span className="font-mono text-[10px] text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={drive.uuid}>
                {drive.uuid}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Removable:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{drive.isRemovable ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Read-Only:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{drive.isReadOnly ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
