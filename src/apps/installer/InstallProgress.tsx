import React from 'react';
import { InstallProgress as InstallProgressType } from '../../system/runtime/AppRuntimeProvider';
import { Loader2, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';

interface InstallProgressViewProps {
  progress: InstallProgressType;
  appName: string;
}

export const InstallProgressView: React.FC<InstallProgressViewProps> = ({ progress, appName }) => {
  return (
    <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          {progress.status === 'completed' ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : progress.status === 'failed' ? (
            <AlertCircle className="w-8 h-8 text-red-200" />
          ) : (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          )}
        </div>
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {progress.status === 'completed'
            ? `Successfully Installed ${appName}`
            : progress.status === 'failed'
            ? `Installation Failed`
            : `Installing ${appName}...`}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{progress.step}</p>
      </div>

      <div className="w-full max-w-sm space-y-1.5">
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progress.status === 'failed'
                ? 'bg-red-500'
                : progress.status === 'completed'
                ? 'bg-emerald-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>{progress.percent}%</span>
          <span>{progress.status === 'completed' ? 'Done' : 'Processing...'}</span>
        </div>
      </div>

      {progress.message && (
        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 max-w-sm flex items-center justify-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 shrink-0" /> {progress.message}
        </div>
      )}
    </div>
  );
};
