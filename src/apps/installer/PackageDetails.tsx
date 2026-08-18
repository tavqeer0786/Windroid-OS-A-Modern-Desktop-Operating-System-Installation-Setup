import React from 'react';
import { PackageInspection } from '../../system/runtime/AppRuntimeProvider';
import { HardDrive, Cpu, ShieldCheck, AlertCircle, Folder } from 'lucide-react';

interface PackageDetailsProps {
  inspection?: Partial<PackageInspection> | null;
  publisherStatus?: string;
  signatureStatus?: string;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({
  inspection,
  publisherStatus,
  signatureStatus,
}) => {
  const sourcePath = inspection?.sourcePath || 'File path unavailable';
  const arch = inspection?.architecture
    ? inspection.architecture.toUpperCase()
    : 'UNKNOWN';
  const estimatedSize =
    inspection?.estimatedSize || 'Estimated size unavailable';

  let integrityLabel = 'Signature not available in browser preview';
  if (signatureStatus === 'valid' || inspection?.isSigned) {
    integrityLabel = 'Digitally Signed & Verified';
  } else if (signatureStatus === 'unsigned') {
    integrityLabel = 'Unsigned Package';
  } else if (signatureStatus === 'not-available') {
    integrityLabel = 'Signature not available in browser preview';
  }

  return (
    <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 py-1">
        <div className="flex items-start gap-2.5">
          <Folder className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="overflow-hidden space-y-0.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Package file</div>
            <div className="font-mono text-xs truncate text-slate-800 dark:text-slate-200" title={sourcePath}>
              {sourcePath}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Target architecture</div>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {arch}
              {arch.includes('ARM') && (
                <span className="ml-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-normal">(Requires ARM Translation)</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Estimated space</div>
            <div className="font-medium text-slate-800 dark:text-slate-200">{estimatedSize}</div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Package integrity</div>
            <div className="font-medium text-slate-800 dark:text-slate-200">
              {integrityLabel}
            </div>
          </div>
        </div>
      </div>

      {inspection?.knownLimitations && inspection.knownLimitations.length > 0 && (
        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500 text-amber-900 dark:text-amber-200 rounded-r-lg space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Known Runtime Limitations
          </div>
          <ul className="space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300/90 pl-5">
            {inspection.knownLimitations.map((limit, idx) => (
              <li key={idx}>• {limit}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

