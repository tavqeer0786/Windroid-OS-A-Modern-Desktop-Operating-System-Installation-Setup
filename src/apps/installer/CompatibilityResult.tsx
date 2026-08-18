import React from 'react';
import { CompatibilityResult as CompResult } from '../../system/runtime/AppRuntimeProvider';
import { CheckCircle2, AlertTriangle, XCircle, Info, Layers, Monitor, Cpu } from 'lucide-react';

interface CompatibilityResultProps {
  result: CompResult;
}

export const CompatibilityResultView: React.FC<CompatibilityResultProps> = ({ result }) => {
  const getRatingBadge = () => {
    switch (result.rating) {
      case 'excellent':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Compatible
          </div>
        );
      case 'good':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Compatible
          </div>
        );
      case 'partial':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Compatible with adjustments
          </div>
        );
      case 'untested':
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
            <Info className="w-3.5 h-3.5 text-slate-500" /> Untested
          </div>
        );
      case 'unsupported':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" /> Unsupported
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Compatibility Status Simple Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Compatibility status</span>
          {getRatingBadge()}
        </div>
        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
          {result.statusText}
        </p>
      </div>

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="p-2.5 bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500 text-amber-900 dark:text-amber-200 rounded-r-lg space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Compatibility Warning
          </div>
          {result.warnings.map((w, idx) => (
            <div key={idx} className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed pl-5">
              • {w}
            </div>
          ))}
        </div>
      )}

      {/* Runtime Specifications - Open Section */}
      <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" /> Runtime specifications
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs py-1">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Graphics backend: </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{result.graphicsBackend}</span>
          </div>
          {result.wineVersion && (
            <div>
              <span className="text-slate-500 dark:text-slate-400">Wine engine: </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{result.wineVersion}</span>
            </div>
          )}
          {result.androidMinSdk && (
            <div>
              <span className="text-slate-500 dark:text-slate-400">Android target: </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{result.androidMinSdk}</span>
            </div>
          )}
        </div>

        {result.details && result.details.length > 0 && (
          <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            {result.details.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-slate-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
