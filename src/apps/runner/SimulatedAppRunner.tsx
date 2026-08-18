import React from 'react';
import { InstalledAppRegistry, InstalledApplication } from '../../system/apps/InstalledAppRegistry';
import { Monitor, Smartphone, Terminal, Activity, RefreshCw, Cpu, Layers, HardDrive } from 'lucide-react';

interface SimulatedAppRunnerProps {
  appId: string;
  initialState?: any;
}

export const SimulatedAppRunner: React.FC<SimulatedAppRunnerProps> = ({ appId }) => {
  const registry = InstalledAppRegistry.getInstance();
  const app: InstalledApplication | undefined =
    registry.getById(appId) ||
    registry.getAll().find((a) => a.id === appId || a.packageId === appId);

  if (!app) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <Activity className="w-8 h-8 text-amber-500 animate-pulse" />
        <h3 className="text-sm font-bold">Application Runtime Active</h3>
        <p className="text-xs text-slate-500">
          Running simulated process PID #{Math.floor(1000 + Math.random() * 9000)}
        </p>
      </div>
    );
  }

  const getRuntimeHeader = () => {
    switch (app.runtime) {
      case 'windows':
        return {
          title: 'WinBridge Wine Runtime Instance',
          badge: 'Wine 9.0 GE (PE 64-bit)',
          bg: 'bg-blue-600',
          icon: <Monitor className="w-4 h-4 text-white" />
        };
      case 'android':
        return {
          title: 'DroidBridge Waydroid LXC Container',
          badge: 'Android 13 (Wayland EGL)',
          bg: 'bg-purple-600',
          icon: <Smartphone className="w-4 h-4 text-white" />
        };
      case 'native':
      default:
        return {
          title: 'Native Linux Flatpak Sandbox',
          badge: 'Flatpak Portal',
          bg: 'bg-emerald-600',
          icon: <Terminal className="w-4 h-4 text-white" />
        };
    }
  };

  const headerInfo = getRuntimeHeader();

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 select-none">
      {/* Subsystem Header */}
      <div className={`${headerInfo.bg} text-white px-3 py-1.5 text-xs font-medium flex items-center justify-between shrink-0 shadow-xs`}>
        <div className="flex items-center gap-1.5">
          {headerInfo.icon}
          <span>{headerInfo.title}</span>
        </div>
        <span className="font-mono text-[10px] opacity-80">{headerInfo.badge}</span>
      </div>

      {/* Main Workspace for App */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center">
          {app.runtime === 'windows' ? (
            <Monitor className="w-8 h-8 text-blue-500" />
          ) : app.runtime === 'android' ? (
            <Smartphone className="w-8 h-8 text-purple-500" />
          ) : (
            <Terminal className="w-8 h-8 text-emerald-500" />
          )}
        </div>

        <div className="space-y-1 max-w-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{app.name}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{app.description}</p>
        </div>

        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full text-left text-xs space-y-1 font-mono">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Runtime Engine:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{app.runtime}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Publisher:</span>
            <span className="text-slate-700 dark:text-slate-300">{app.publisher}</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Version:</span>
            <span className="text-slate-700 dark:text-slate-300">{app.version}</span>
          </div>
          {app.winePrefix && (
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Prefix Path:</span>
              <span className="text-blue-500 text-[10px] truncate max-w-[180px]">{app.winePrefix}</span>
            </div>
          )}
        </div>

        <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 max-w-sm">
          Simulation active — application running smoothly inside Windroid OS runtime container.
        </div>
      </div>
    </div>
  );
};
