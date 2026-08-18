import React from 'react';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  label?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  icon,
  label
}) => {
  return (
    <div className="flex items-center gap-3 w-full text-slate-700 dark:text-slate-200">
      {icon && <span className="text-slate-500 dark:text-slate-400 shrink-0">{icon}</span>}
      <div className="flex-1 flex flex-col gap-1">
        {label && (
          <div className="flex justify-between items-center text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>{label}</span>
            <span className="font-mono text-[11px] text-slate-500">{value}%</span>
          </div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
    </div>
  );
};
