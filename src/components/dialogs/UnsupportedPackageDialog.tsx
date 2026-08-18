import React from 'react';
import { SystemDialog } from './SystemDialog';

interface UnsupportedPackageDialogProps {
  filename: string;
  reason: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenInFiles?: () => void;
}

export const UnsupportedPackageDialog: React.FC<UnsupportedPackageDialogProps> = ({
  filename,
  reason,
  isOpen,
  onClose,
  onOpenInFiles
}) => {
  if (!isOpen) return null;

  const ext = (filename.split('.').pop() || '').toLowerCase();
  const secondaryText = ext ? `.${ext} is not a supported installer package format.` : reason;

  const description = (
    <div className="space-y-1.5 text-xs text-[#5F6368] dark:text-slate-300">
      <p>{secondaryText}</p>
      <p className="text-[11px] text-[#5F6368] dark:text-slate-400">
        Windroid OS directly installs <span className="font-semibold text-slate-700 dark:text-slate-200">.exe</span>,{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">.msi</span> (Windows),{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">.apk</span> (Android), or{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">.flatpak / .flatpakref</span> (Native Linux) files.
      </p>
    </div>
  );

  const buttons = [
    ...(onOpenInFiles
      ? [
          {
            label: 'Browse in Files',
            variant: 'secondary' as const,
            onClick: onOpenInFiles
          }
        ]
      : []),
    {
      label: 'OK',
      variant: 'primary' as const,
      onClick: onClose,
      autoFocus: true
    }
  ];

  return (
    <SystemDialog
      isOpen={isOpen}
      title="Unsupported Installer Package"
      message={`${filename} cannot be installed.`}
      description={description}
      details={reason !== secondaryText ? reason : undefined}
      iconType="error"
      buttons={buttons}
      onClose={onClose}
    />
  );
};
