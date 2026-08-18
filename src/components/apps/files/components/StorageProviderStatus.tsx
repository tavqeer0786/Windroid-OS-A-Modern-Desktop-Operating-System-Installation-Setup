import React, { useState } from 'react';
import { StorageProvider } from '../providers/StorageProvider';
import { Database, Info, Cpu, CheckCircle2 } from 'lucide-react';

interface StorageProviderStatusProps {
  provider: StorageProvider;
  onProviderChange?: (type: 'demo' | 'native') => void;
  onSwitchProvider?: (type: 'demo' | 'native') => void;
}

export const StorageProviderStatus: React.FC<StorageProviderStatusProps> = ({
  provider,
  onProviderChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all select-none cursor-help border ${
          provider.isNative
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
        }`}
      >
        {provider.isNative ? (
          <Cpu className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
        ) : (
          <Database className="w-3.5 h-3.5 shrink-0 text-amber-500" />
        )}
        <span>{provider.isNative ? 'Native Windroid Storage' : 'Demo storage data'}</span>
        <Info className="w-3 h-3 opacity-60 ml-0.5" />
      </div>

      {showTooltip && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs rounded-xl shadow-xl border border-white/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            {provider.isNative ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected to Native OS</span>
              </>
            ) : (
              <>
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Sandbox Mode</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {provider.isNative
              ? 'Interfacing directly with Linux D-Bus and UDisks2 system storage services.'
              : 'Real drives will be detected when running inside Windroid OS.'}
          </p>
        </div>
      )}
    </div>
  );
};
