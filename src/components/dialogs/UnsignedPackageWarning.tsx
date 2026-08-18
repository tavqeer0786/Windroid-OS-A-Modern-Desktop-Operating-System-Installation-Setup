import React from 'react';
import { ShieldAlert, AlertTriangle, Check, X } from 'lucide-react';

interface UnsignedPackageWarningProps {
  packageName: string;
  publisher?: string;
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export const UnsignedPackageWarning: React.FC<UnsignedPackageWarningProps> = ({
  packageName,
  publisher = 'Unknown Publisher',
  isOpen,
  onContinue,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent p-4 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200">
        <div className="p-4 flex items-center justify-between text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Unverified Application Publisher
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{packageName}</h3>
            <p className="text-slate-500 dark:text-slate-400">Publisher: {publisher}</p>
          </div>

          <div className="p-3 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
            This package is not signed with a recognized Windroid OS cryptographic certificate. Installing unverified binaries
            may expose your runtime environment to unvetted software.
          </div>
        </div>

        <div className="p-3 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel Installation
          </button>
          <button
            onClick={onContinue}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
