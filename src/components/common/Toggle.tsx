import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, icon, disabled, tooltip }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={tooltip}
      onClick={() => !disabled && onChange(!checked)}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl text-xs font-medium transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border min-h-[78px] ${
        checked
          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15'
          : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-800/90 backdrop-blur-md'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Top Row: Icon badge + Switch toggle pill */}
      <div className="flex items-center justify-between w-full">
        {icon && (
          <div className={`p-1.5 rounded-xl transition-colors ${
            checked 
              ? 'bg-white/20 text-white' 
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
          }`}>
            {icon}
          </div>
        )}
        <span
          className={`relative inline-block w-8 h-4.5 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out mt-0.5 ml-0.5 ${
              checked ? 'translate-x-3.5' : 'translate-x-0'
            }`}
          />
        </span>
      </div>

      {/* Bottom Row: Label name underneath */}
      {label && (
        <div className="flex flex-col items-start w-full text-left mt-2">
          <span className="font-normal text-xs leading-tight tracking-tight line-clamp-1">{label}</span>
          <span className={`text-[10px] font-normal leading-tight opacity-75 mt-0.5 ${checked ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'}`}>
            {checked ? 'On' : 'Off'}
          </span>
        </div>
      )}
    </button>
  );
};

