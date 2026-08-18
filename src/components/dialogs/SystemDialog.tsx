import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  AlertCircle, AlertTriangle, Info, CheckCircle2, HelpCircle, 
  FileText, Package, ChevronDown, ChevronUp, X 
} from 'lucide-react';
import { SystemDialogOptions, SystemDialogButton, DialogIconType } from '../../types/os';
import { useOS } from '../../context/OSContext';

interface DialogButtonProps extends SystemDialogButton {
  onAction?: () => void;
  disabled?: boolean;
}

export const DialogButton: React.FC<DialogButtonProps> = ({
  label,
  variant = 'secondary',
  onClick,
  onAction,
  disabled = false,
  autoFocus = false
}) => {
  const handleClick = () => {
    if (disabled) return;
    if (onClick) onClick();
    if (onAction) onAction();
  };

  let baseStyle = 'px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50';
  
  if (disabled) {
    baseStyle += ' opacity-50 cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500';
  } else if (variant === 'primary') {
    baseStyle += ' bg-[#0067C0] hover:bg-[#005A9E] active:bg-[#004E8A] text-white shadow-xs';
  } else if (variant === 'destructive') {
    baseStyle += ' bg-[#C42B1C] hover:bg-[#B12618] active:bg-[#9E2013] text-white shadow-xs';
  } else {
    // Secondary
    baseStyle += ' bg-[#FBFBFB] hover:bg-[#F5F5F5] active:bg-[#EAEAEA] text-[#1A1A1A] border border-[#CCCCCC] dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-500 dark:text-slate-100 dark:border-slate-600';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      autoFocus={autoFocus}
      className={baseStyle}
    >
      {label}
    </button>
  );
};

export const DialogIcons: React.FC<{ type?: DialogIconType; customIcon?: React.ReactNode; className?: string }> = ({
  type = 'info',
  customIcon,
  className = 'w-9 h-9'
}) => {
  if (customIcon) return <>{customIcon}</>;

  switch (type) {
    case 'error':
      return <AlertCircle className={`${className} text-[#C42B1C] shrink-0`} />;
    case 'warning':
      return <AlertTriangle className={`${className} text-[#9A5B00] dark:text-amber-400 shrink-0`} />;
    case 'success':
      return <CheckCircle2 className={`${className} text-emerald-600 dark:text-emerald-400 shrink-0`} />;
    case 'question':
      return <HelpCircle className={`${className} text-[#0067C0] shrink-0`} />;
    case 'file':
      return <FileText className={`${className} text-slate-600 dark:text-slate-300 shrink-0`} />;
    case 'installer':
      return <Package className={`${className} text-[#0067C0] shrink-0`} />;
    case 'info':
    default:
      return <Info className={`${className} text-[#0067C0] shrink-0`} />;
  }
};

interface SystemDialogProps extends SystemDialogOptions {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDialog: React.FC<SystemDialogProps> = ({
  isOpen,
  title,
  message,
  description,
  iconType = 'info',
  customIcon,
  details,
  buttons,
  onClose
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management and keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element or default button
    const timer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];
      if (focusables.length > 0) {
        const autoFocused = focusables.find((el) => el.hasAttribute('autofocus'));
        if (autoFocused) {
          autoFocused.focus();
        } else {
          // Focus primary/OK button if present, else first focusable
          focusables[0].focus();
        }
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Keyboard trap and Escape/Enter handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = (
          Array.from(
            dialogRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ) as HTMLElement[]
        ).filter((el) => !el.hasAttribute('disabled'));

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const defaultButtons: SystemDialogButton[] = [
    { label: 'OK', variant: 'primary', onClick: onClose, autoFocus: true }
  ];

  const activeButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-transparent p-4 select-none transition-opacity duration-150 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sys-dialog-title"
        aria-describedby="sys-dialog-desc"
        className="w-full max-w-[460px] bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col transition-transform duration-150 scale-100"
      >
        {/* Title bar */}
        <div className="h-9 px-3.5 flex items-center justify-between bg-transparent shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-slate-100 truncate">
            <Package className="w-3.5 h-3.5 text-[#0067C0] shrink-0" />
            <span className="truncate">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#5F6368] dark:text-slate-200 hover:text-[#202124] dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex items-start gap-4 flex-1">
          <DialogIcons type={iconType} customIcon={customIcon} className="w-9 h-9" />
          <div className="flex-1 min-w-0 space-y-2">
            <h2 id="sys-dialog-title" className="text-sm font-semibold text-[#202124] dark:text-slate-100 leading-snug break-words">
              {message}
            </h2>

            {description && (
              <div id="sys-dialog-desc" className="text-xs text-[#5F6368] dark:text-slate-300 leading-relaxed space-y-1.5">
                {description}
              </div>
            )}

            {details && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-[#0067C0] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showDetails ? 'Hide details' : 'Show details'}</span>
                </button>
                {showDetails && (
                  <div className="mt-2 text-[11px] font-mono p-2.5 rounded-md text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto">
                    {details}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-transparent flex items-center justify-end gap-2 shrink-0">
          {activeButtons.map((btn, index) => (
            <DialogButton
              key={index}
              {...btn}
              onAction={onClose}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const SystemDialogRenderer: React.FC = () => {
  const { systemDialogState, dismissSystemDialog } = useOS();

  if (!systemDialogState || !systemDialogState.isOpen) return null;

  return (
    <SystemDialog
      {...systemDialogState}
      isOpen={systemDialogState.isOpen}
      onClose={() => {
        if (systemDialogState.onClose) {
          systemDialogState.onClose();
        }
        dismissSystemDialog(systemDialogState.id);
      }}
    />
  );
};
