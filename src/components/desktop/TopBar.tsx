import React from 'react';
import { useOS } from '../../context/OSContext';
import { useClock } from '../../hooks/useClock';
import { AppLauncherIcon } from '../icons/CustomAppIcons';
import { 
  Wifi, WifiOff, Bluetooth, BluetoothOff, Battery, Volume2, VolumeX,
  Bell, Sparkles, Search, Moon, Sun, ShieldAlert, Command
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const { 
    quickSettings, 
    radioCapabilities,
    powerStatus,
    notifications, 
    toggleQuickSettings, 
    toggleNotifications, 
    toggleSystemAgent, 
    toggleAppLauncher, 
    openAppLauncher,
    toggleUniversalSearch,
    isQuickSettingsOpen,
    isNotificationsOpen,
    isSystemAgentOpen,
    developerMode
  } = useOS();

  const { timeString, dateString } = useClock();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-11 px-4 flex items-center justify-between text-sm select-none bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border-b border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-100 z-50 transition-colors shadow-2xs">
      {/* Left Group: Brand OS Badge, App Launcher & Universal Search */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleAppLauncher}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all font-normal tracking-tight cursor-pointer group"
          title="App Launcher (Super / Meta Key)"
        >
          <div className="w-5 h-5">
            <AppLauncherIcon className="w-5 h-5 drop-shadow-xs" />
          </div>
          <span className="font-normal text-sm tracking-tight text-slate-900 dark:text-white">Windroid</span>
        </button>

        <div className="h-4.5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        <button
          onClick={openAppLauncher}
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800/90 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 transition-all text-xs cursor-pointer group"
          title="Search in App Launcher (⌘K)"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="hidden sm:inline font-normal text-xs">Search commands...</span>
          <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/90 dark:bg-slate-800/90 rounded border border-slate-200 dark:border-slate-700/60 shadow-2xs">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>

        {developerMode && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-semibold border border-amber-500/20 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> DEV
          </span>
        )}
      </div>

      {/* Center Group: Clock & Date Indicator */}
      <div className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-200 font-normal text-xs sm:text-sm">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">{dateString}</span>
        <span className="text-slate-300 dark:text-slate-800">|</span>
        <span className="font-normal font-mono tracking-tight text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{timeString}</span>
      </div>

      {/* Right Group: System Status & Triggers */}
      <div className="flex items-center gap-2">
        {/* System Agent Trigger */}
        <button
          onClick={toggleSystemAgent}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[5px] text-xs sm:text-sm font-normal transition-all duration-150 cursor-pointer ${
            isSystemAgentOpen
              ? 'bg-white text-slate-900 shadow-xs'
              : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white hover:text-slate-900 dark:hover:text-slate-900 hover:shadow-xs'
          }`}
          title="Windroid System Agent"
        >
          <Sparkles className="w-4 h-4 text-blue-500 stroke-[1.5]" />
          <span className="hidden sm:inline font-normal">Agent</span>
        </button>

        {/* Notifications Trigger */}
        <button
          onClick={toggleNotifications}
          className={`relative p-1.5 px-2.5 rounded-[5px] transition-all duration-150 cursor-pointer ${
            isNotificationsOpen
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
              : 'hover:bg-white dark:hover:bg-white/20 text-slate-600 dark:text-slate-300'
          }`}
          title="Notification Center"
        >
          <Bell className="w-4 h-4 stroke-[1.5]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
          )}
        </button>

        {/* Quick Settings Control Group */}
        <button
          onClick={toggleQuickSettings}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[5px] transition-all duration-150 cursor-pointer border border-transparent ${
            isQuickSettingsOpen
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 shadow-xs'
              : 'hover:bg-white dark:hover:bg-white/20 text-slate-600 dark:text-slate-300'
          }`}
          title="System Controls & Quick Settings"
        >
          {radioCapabilities.wifiAdapterPresent && !radioCapabilities.wifiHardwareBlocked && quickSettings.wifi ? (
            <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[1.5]" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-400 stroke-[1.5]" />
          )}
          {radioCapabilities.bluetoothAdapterPresent && !radioCapabilities.bluetoothHardwareBlocked && radioCapabilities.bluezAvailable && quickSettings.bluetooth ? (
            <Bluetooth className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[1.5]" />
          ) : (
            <BluetoothOff className="w-4 h-4 text-slate-400 stroke-[1.5]" />
          )}
          {quickSettings.volume > 0 ? <Volume2 className="w-4 h-4 stroke-[1.5]" /> : <VolumeX className="w-4 h-4 text-slate-400 stroke-[1.5]" />}
          {quickSettings.darkMode ? <Moon className="w-4 h-4 stroke-[1.5]" /> : <Sun className="w-4 h-4 text-amber-500 stroke-[1.5]" />}
          
          {powerStatus?.hasBattery && powerStatus.batteryPercent !== null && powerStatus.batteryPercent !== undefined && (
            <div className="flex items-center gap-1 font-mono text-xs font-normal ml-0.5" title={powerStatus.acConnected || powerStatus.chargingState === 'charging' ? "Plugged in" : "Discharging"}>
              <Battery className={`w-4 h-4 stroke-[1.5] ${powerStatus.batteryPercent <= 20 ? 'text-red-500' : 'text-emerald-500'}`} />
              <span className="font-normal">{powerStatus.batteryPercent}%</span>
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
