import React, { useState, useEffect } from 'react';
import { useClock } from '../../hooks/useClock';
import { CloudSun, Cpu, Calendar as CalendarIcon, Eye, EyeOff, Activity, HardDrive } from 'lucide-react';
import { useOS } from '../../context/OSContext';

export const WidgetArea: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { timeString, fullDateString } = useClock();
  const { openApp } = useOS();

  // Simulated CPU/RAM dynamic usage
  const [cpuUsage, setCpuUsage] = useState(14);
  const [ramUsage, setRamUsage] = useState(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(10 + Math.random() * 18));
      setRamUsage(Math.floor(40 + Math.random() * 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-11 right-3 z-10 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-950/80 border border-white/20 dark:border-white/10 backdrop-blur-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
        title="Show desktop widgets"
      >
        <Eye className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-[11px]">Widgets</span>
      </button>
    );
  }

  return (
    <div className="fixed top-11 right-3 z-10 w-64 flex flex-col gap-2.5 select-none pointer-events-auto">
      {/* Widget Header & Hide toggle */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase font-mono">
          System Companion
        </span>
        <button
          onClick={() => setIsVisible(false)}
          className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          title="Hide desktop widgets"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>

      {/* Clock & Date Card */}
      <div className="p-3 rounded-2xl bg-white/75 dark:bg-slate-900/75 border border-white/50 dark:border-white/10 backdrop-blur-2xl shadow-os-flyout flex flex-col gap-0.5">
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
          {timeString}
        </span>
        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
          {fullDateString}
        </span>
      </div>

      {/* Weather Card */}
      <div className="p-3 rounded-2xl bg-white/75 dark:bg-slate-900/75 border border-white/50 dark:border-white/10 backdrop-blur-2xl shadow-os-flyout flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">72°F Partly Cloudy</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">San Francisco • 55% Humidity</div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="p-3 rounded-2xl bg-white/75 dark:bg-slate-900/75 border border-white/50 dark:border-white/10 backdrop-blur-2xl shadow-os-flyout flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-blue-500" /> Performance
          </span>
          <span className="text-[9px] font-mono text-slate-400">Kernel 6.12</span>
        </div>

        {/* CPU */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-blue-500" /> CPU Load</span>
            <span className="font-mono font-semibold">{cpuUsage}%</span>
          </div>
          <div className="w-full h-1 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${cpuUsage}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-cyan-500" /> RAM</span>
            <span className="font-mono font-semibold">6.7 / 16 GB</span>
          </div>
          <div className="w-full h-1 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${ramUsage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Calendar Agenda */}
      <div 
        onClick={() => openApp('calendar')}
        className="p-3 rounded-2xl bg-white/75 dark:bg-slate-900/75 border border-white/50 dark:border-white/10 backdrop-blur-2xl shadow-os-flyout flex items-center gap-2.5 cursor-pointer hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all"
      >
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-500/20">
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            Kernel & UX Review
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Today at 4:00 PM • Room 304
          </div>
        </div>
      </div>
    </div>
  );
};
