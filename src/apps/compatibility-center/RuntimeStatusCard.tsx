import React from 'react';
import { RuntimeStatus } from '../../system/runtime/AppRuntimeProvider';
import { Monitor, Smartphone, Terminal } from 'lucide-react';

interface RuntimeStatusCardProps {
  status: RuntimeStatus;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const RuntimeStatusCard: React.FC<RuntimeStatusCardProps> = ({
  status,
  isSelected = false,
  onSelect
}) => {
  const getIcon = () => {
    switch (status.runtime) {
      case 'native':
        return <Terminal className="w-5 h-5 text-[#202124] dark:text-slate-300 shrink-0" />;
      case 'windows':
        return <Monitor className="w-5 h-5 text-[#202124] dark:text-slate-300 shrink-0" />;
      case 'android':
        return <Smartphone className="w-5 h-5 text-[#202124] dark:text-slate-300 shrink-0" />;
    }
  };

  const getTitle = () => {
    switch (status.runtime) {
      case 'native':
        return 'Native Linux Runtime';
      case 'windows':
        return 'WinBridge (Wine Staging)';
      case 'android':
        return 'DroidBridge (Waydroid)';
    }
  };

  const getStatusDot = () => {
    if (!status.isNativeAvailable) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-[#5F6368] dark:text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          Simulation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#202124] dark:text-slate-200 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        Running
      </span>
    );
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-md border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
        isSelected
          ? 'bg-[#EAF3FF] dark:bg-blue-950/40 border-[#0067C0] text-[#0067C0] dark:text-blue-300 font-medium'
          : 'bg-white dark:bg-[#252525] border-[#E5E7EB] dark:border-slate-800 hover:bg-[#FAFAFA] dark:hover:bg-slate-800/60 text-[#202124] dark:text-slate-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">{getIcon()}</div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate leading-snug">{getTitle()}</div>
          <div className="text-[11px] font-mono text-[#5F6368] dark:text-slate-400 truncate">{status.version}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-right">
        <div className="text-[12px] text-[#5F6368] dark:text-slate-400 hidden sm:block font-mono">
          {status.activeContainersOrPrefixes || 0} active
        </div>
        <div>{getStatusDot()}</div>
      </div>
    </div>
  );
};
