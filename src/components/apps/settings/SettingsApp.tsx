import React, { useState, useMemo, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';
import { useClock } from '../../../hooks/useClock';
import { WALLPAPERS } from '../../../data/initialData';
import { Toggle } from '../../common/Toggle';
import { Slider } from '../../common/Slider';
import { 
  Monitor, Bluetooth, Wifi, Pencil, LayoutGrid, User, Clock, 
  Gamepad2, Sparkles, Shield, RotateCw, Info, Search, ChevronRight, 
  Volume2, VolumeX, Bell, Zap, HardDrive, Share2, SquareStack, Wrench, 
  CheckCircle2, Sun, Moon, Palette, ShieldAlert, Check, Layers, X,
  Mic, Power, RotateCcw, Lock, LogOut, Sliders
} from 'lucide-react';
import { InstalledCompatibilityApps } from '../../../apps/compatibility-center/InstalledCompatibilityApps';
import { PersonalizationBackground } from './PersonalizationBackground';
import { BluetoothDevices } from './BluetoothDevices';
import { NetworkInternet } from './NetworkInternet';
import { AccountsSettings } from './AccountsSettings';
import { TimeLanguageSettings } from './TimeLanguageSettings';
import { AboutWindroid } from './AboutWindroid';
import { DemoPackageService } from '../../../system/demo/DemoPackageService';
import { DemoMediaService } from '../../../system/demo/DemoMediaService';
import { loadFilesystemFromStorage, saveFilesystemToStorage } from '../files/filesystemData';
import { WindroidSystemBridge } from '../../../services/WindroidSystemBridge';
import { SystemHardwareInfo } from '../../../types/windroid-global';
import { SystemDrive } from '../files/models/drive';

interface SettingsAppProps {
  initialState?: {
    tab?: string;
  };
}

export const SettingsApp: React.FC<SettingsAppProps> = ({ initialState }) => {
  const { 
    quickSettings, 
    updateQuickSettings, 
    setDisplayBrightness,
    setAudioVolume,
    setNightLight,
    setBatterySaver,
    powerStatus,
    audioStatus,
    displayInfo,
    systemCapabilities,
    refreshHardwareState,
    wallpaper, 
    setWallpaper, 
    developerMode, 
    toggleDeveloperMode,
    requestConfirm,
    openApp,
    addNotification,
    currentUser,
    deviceIdentity,
    updateDeviceHostname
  } = useOS();

  const { timeString, dateString } = useClock();

  const [activeTab, setActiveTab] = useState<string>(initialState?.tab || 'system');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sysInfo, setSysInfo] = useState<SystemHardwareInfo | null>(null);
  const [drives, setDrives] = useState<SystemDrive[]>([]);
  
  const deviceName = deviceIdentity.deviceName || deviceIdentity.hostname || 'Windroid-PC';
  const userName = currentUser?.fullName || currentUser?.username || 'Windroid Administrator';
  const userEmail = currentUser?.email || `${currentUser?.username || 'admin'}@windroid.local`;
  const avatarUrl = currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [tempDeviceName, setTempDeviceName] = useState<string>(deviceName);

  // Synchronize tempDeviceName when deviceName changes
  useEffect(() => {
    setTempDeviceName(deviceName);
  }, [deviceName]);

  // Native Display Configuration State
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<string>('');
  const [selectedRefreshRate, setSelectedRefreshRate] = useState<string>('');
  const [selectedOrientation, setSelectedOrientation] = useState<string>('normal');
  const [isApplyingDisplay, setIsApplyingDisplay] = useState<boolean>(false);

  useEffect(() => {
    if (displayInfo && displayInfo.displays && displayInfo.displays.length > 0) {
      const activeDisp = displayInfo.displays.find((d) => d.id === selectedDisplayId) || 
                         displayInfo.displays.find((d) => d.isPrimary) || 
                         displayInfo.displays[0];
      if (activeDisp && (!selectedDisplayId || !selectedResolution)) {
        setSelectedDisplayId(activeDisp.id);
        setSelectedResolution(activeDisp.currentResolution || activeDisp.availableResolutions[0] || '1920x1080');
        setSelectedRefreshRate(String(activeDisp.activeRefreshRate || activeDisp.currentRefreshRate || activeDisp.refreshRates[0] || '60.0'));
        setSelectedOrientation(activeDisp.orientation || 'normal');
      }
    }
  }, [displayInfo]);

  const handleSelectDisplay = (id: string) => {
    setSelectedDisplayId(id);
    const disp = displayInfo?.displays.find((d) => d.id === id);
    if (disp) {
      setSelectedResolution(disp.currentResolution || disp.availableResolutions[0] || '1920x1080');
      setSelectedRefreshRate(String(disp.activeRefreshRate || disp.currentRefreshRate || disp.refreshRates[0] || '60.0'));
      setSelectedOrientation(disp.orientation || 'normal');
    }
  };

  const handleApplyDisplayConfig = async () => {
    if (!selectedDisplayId) return;
    setIsApplyingDisplay(true);
    try {
      const currentDisp = displayInfo?.displays.find((d) => d.id === selectedDisplayId);
      const bridge = WindroidSystemBridge.getInstance();
      const res = await bridge.configureDisplay({
        id: selectedDisplayId,
        resolution: selectedResolution,
        refreshRate: selectedRefreshRate,
        orientation: selectedOrientation,
        isPrimary: currentDisp?.isPrimary ?? true,
      });
      if (res.success) {
        addNotification({
          title: 'Display Configured',
          message: `Updated ${selectedDisplayId} to ${selectedResolution} @ ${selectedRefreshRate}Hz`,
          type: 'success',
        });
        await refreshHardwareState();
      } else {
        addNotification({
          title: 'Display Configuration Failed',
          message: res.error || 'Unable to update display configuration',
          type: 'error',
        });
      }
    } catch (err: any) {
      addNotification({
        title: 'Display Error',
        message: err?.message || 'Failed to apply display settings',
        type: 'error',
      });
    } finally {
      setIsApplyingDisplay(false);
    }
  };

  useEffect(() => {
    const bridge = WindroidSystemBridge.getInstance();
    bridge.getSystemInfo().then((info) => {
      setSysInfo(info);
    });
    bridge.getStorageDevices().then((devs) => setDrives(devs));
  }, []);

  const handleSaveRename = async () => {
    if (tempDeviceName.trim()) {
      const newName = tempDeviceName.trim();
      await updateDeviceHostname(newName);
      setIsRenaming(false);
      addNotification({
        title: 'Device Renamed',
        message: `Device name set to ${newName}`,
        type: 'info'
      });
    }
  };

  const mainDrive = drives.find((d) => d.isSystemDrive) || drives[0];

  // Sidebar navigation items
  const navItems = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'bluetooth', label: 'Bluetooth & devices', icon: Bluetooth },
    { id: 'wifi', label: 'Network & internet', icon: Wifi },
    { id: 'personalization', label: 'Personalization', icon: Pencil },
    { id: 'apps', label: 'Apps', icon: LayoutGrid },
    { id: 'accounts', label: 'Accounts', icon: User },
    { id: 'time', label: 'Time & language', icon: Clock },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'accessibility', label: 'Accessibility', icon: Sparkles },
    { id: 'privacy', label: 'Privacy & security', icon: Shield },
    { id: 'update', label: 'Windroid Update', icon: RotateCw },
    { id: 'about', label: 'About Windroid OS', icon: Info },
  ];

  // System settings rows list matching attached Figma design reference
  const systemSettingsRows = [
    { id: 'display', title: 'Display', desc: 'Monitors, brightness, night light, display profile', icon: Monitor },
    { id: 'sound', title: 'Sound', desc: 'Volume levels, output, input, sound devices', icon: Volume2 },
    { id: 'notifications', title: 'Notifications', desc: 'Alerts from apps and system', icon: Bell },
    { id: 'power', title: 'Power & battery', desc: 'Battery usage, power mode, sleep', icon: Zap },
    { id: 'storage', title: 'Storage', desc: 'Storage sense, drives, configuration rules', icon: HardDrive },
    { id: 'nearby', title: 'Nearby sharing', desc: 'Discoverability, received files location', icon: Share2 },
    { id: 'multitasking', title: 'Multitasking', desc: 'Snap windows, desktops, task switching', icon: SquareStack },
    { id: 'developers', title: 'For developers', desc: 'Developer tools, debugging, remote desktop', icon: Wrench },
  ];

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    const q = searchQuery.toLowerCase();
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchQuery]);

  // Stylized Windroid Logo Component
  const WindroidLogo = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L20 19H15.5L12 11.5L8.5 19H4L12 3Z" fill="#0067C0" />
      <path d="M12 8L15 14H9L12 8Z" fill="#38BDF8" />
    </svg>
  );

  return (
    <div className="h-full flex flex-col text-slate-900 dark:text-slate-100 select-none bg-white dark:bg-[#18181B] font-sans">
      {/* TOP HEADER BAR (Matching Figma Design Reference) */}
      <div className="h-12 px-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#18181B]/95 shrink-0">
        {/* Left Logo */}
        <div className="flex items-center gap-2">
          <WindroidLogo className="w-5 h-5" />
          <span className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">Windroid</span>
        </div>

        {/* Center Search Input */}
        <div className="relative w-72 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full h-8 pl-9 pr-12 text-xs bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] transition-all"
          />
          <div className="absolute right-2.5 top-1.5 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-[10px] font-semibold text-slate-400">
            ⌘ K
          </div>
        </div>

        {/* Right Date/Time */}
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <span>{dateString}</span>
          <span>{timeString}</span>
        </div>
      </div>

      {/* MAIN CONTAINER (Sidebar + Right Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-60 p-3.5 border-r border-slate-200/80 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#121215] flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="space-y-4">
            {/* User Profile Section */}
            <div className="px-2 py-1.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300/60 dark:border-slate-600">
                <img
                  src={avatarUrl}
                  alt="User avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {userName}
                </div>
                <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {userEmail}
                </div>
              </div>
            </div>

            {/* Navigation List */}
            <nav className="space-y-0.5">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full px-3 py-2 rounded-xl text-[13px] font-medium flex items-center gap-3 transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Windroid OS Build Box */}
          <div className="mt-4 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E1E22] flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <WindroidLogo className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Windroid OS</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Build 1.0.0</div>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-[#18181B]">
          {/* TAB 1: SYSTEM (Default Figma View) */}
          {activeTab === 'system' && (
            <div className="max-w-4xl space-y-6">
              {/* Page Title & Subtitle */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Manage your device, hardware, and system preferences.
                </p>
              </div>

              {/* HERO DEVICE CARD (Figma Exact Replica) */}
              <div className="bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Top Section: Laptop Graphic + Specs */}
                <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
                  {/* Laptop Mockup Graphic */}
                  <div className="w-56 h-36 relative shrink-0 flex items-center justify-center">
                    {/* Laptop Screen */}
                    <div className="w-48 h-30 bg-slate-900 rounded-t-lg p-1 relative border-2 border-slate-700 shadow-md overflow-hidden flex flex-col items-center justify-center">
                      <img
                        src="/assets/wallpapers/aether-wallpaper-01.svg"
                        alt="Desktop screen"
                        className="w-full h-full object-cover rounded-xs"
                      />
                      <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                        <WindroidLogo className="w-8 h-8 drop-shadow-md" />
                      </div>
                    </div>
                    {/* Laptop Base */}
                    <div className="absolute bottom-1 w-56 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-b-md shadow-xs flex justify-center">
                      <div className="w-12 h-0.5 bg-slate-400 dark:bg-slate-500 rounded-full mt-0.5" />
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempDeviceName}
                            onChange={(e) => setTempDeviceName(e.target.value)}
                            className="text-lg font-bold px-2 py-0.5 border border-[#0067C0] rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveRename}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#0067C0] text-white rounded cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{deviceName}</h2>
                          <button
                            onClick={() => {
                              setTempDeviceName(deviceName);
                              setIsRenaming(true);
                            }}
                            className="text-[13px] font-medium text-[#0067C0] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer ml-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Rename</span>
                          </button>
                        </>
                      )}
                    </div>
                    <div className="text-[13px] text-slate-500 dark:text-slate-400 pt-1">
                      {sysInfo?.cpu ? `${sysInfo.cpu.modelName} (${sysInfo.cpu.logicalCores} Cores)` : 'Detecting Processor...'}
                    </div>
                    <div className="text-[13px] text-slate-500 dark:text-slate-400">
                      {sysInfo?.memory ? `${sysInfo.memory.formattedTotal}` : '8 GB RAM'} &nbsp;•&nbsp; {mainDrive ? `${(mainDrive.totalBytes / (1024 * 1024 * 1024)).toFixed(0)} GB ${mainDrive.filesystem.toUpperCase() || 'Disk'}` : 'Storage'}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: 4 Info Tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-200/90 dark:border-slate-800 divide-x divide-y md:divide-y-0 divide-slate-200/90 dark:divide-slate-800 bg-slate-50/50 dark:bg-[#1C1C20]">
                  {/* OS Version */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <WindroidLogo className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">OS Version</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{sysInfo?.osName ? sysInfo.osName : 'Windroid OS 1.0.0 (Debian 12)'}</div>
                    </div>
                  </div>

                  {/* Display */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#0067C0] dark:text-blue-400">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Display</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {displayInfo?.displays?.[0] ? `${displayInfo.displays[0].connector} (${displayInfo.displays[0].currentResolution})` : '1920 × 1080'}
                      </div>
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#0067C0] dark:text-blue-400">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Storage</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {mainDrive ? `${(mainDrive.freeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB free of ${(mainDrive.totalBytes / (1024 * 1024 * 1024)).toFixed(0)} GB` : 'Storage info...'}
                      </div>
                    </div>
                  </div>

                  {/* Update */}
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Update</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Up to date</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SETTINGS ROWS LIST (Figma Exact Replica) */}
              <div className="bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl divide-y divide-slate-200/90 dark:divide-slate-800 overflow-hidden shadow-xs">
                {systemSettingsRows.map((row) => {
                  const RowIcon = row.icon;
                  return (
                    <div
                      key={row.id}
                      onClick={() => setActiveTab(row.id)}
                      className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-slate-700 dark:text-slate-300">
                          <RowIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                            {row.title}
                          </div>
                          <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {row.desc}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: BLUETOOTH & DEVICES */}
          {activeTab === 'bluetooth' && (
            <div className="max-w-5xl">
              <BluetoothDevices />
            </div>
          )}

          {/* TAB 2: DISPLAY */}
          {activeTab === 'display' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Display</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Connected monitors, resolution, refresh rates, screen brightness, and night light.
                </p>
              </div>

              {/* Brightness & Night Light Card */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-5 shadow-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Screen Brightness</span>
                    <span className="text-xs font-bold text-[#0067C0]">{quickSettings.brightness}%</span>
                  </div>
                  <Slider
                    label=""
                    icon={<Sun className="w-4 h-4 text-amber-500" />}
                    value={quickSettings.brightness}
                    onChange={(val) => setDisplayBrightness(val)}
                  />
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {displayInfo?.hasHardwareBacklight
                      ? '✓ Hardware backlight controller active (/sys/class/backlight)'
                      : '✓ Software gamma calibration mode (xrandr)'}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Night Light</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Filter blue light for eye protection during evening hours (Redshift)</div>
                    </div>
                    <Toggle
                      checked={quickSettings.nightLight}
                      onChange={(val) => setNightLight(val)}
                    />
                  </div>

                  {quickSettings.nightLight && (
                    <div className="pt-2">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Color Temperature (Warmth)</span>
                        <span>{displayInfo?.nightLightTemperature || 4500}K</span>
                      </div>
                      <input
                        type="range"
                        min="2500"
                        max="6500"
                        step="100"
                        value={displayInfo?.nightLightTemperature || 4500}
                        onChange={(e) => {
                          const temp = parseInt(e.target.value, 10);
                          WindroidSystemBridge.getInstance().setDisplayNightLight(true, temp);
                          refreshHardwareState();
                        }}
                        className="w-full accent-[#0067C0] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Connected Monitors & Resolution Card */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#0067C0]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Connected Monitors & Adapter</h3>
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    GPU: <span className="font-semibold text-slate-700 dark:text-slate-300">{displayInfo?.gpu || 'Standard Graphics'}</span>
                  </div>
                </div>

                {displayInfo?.displays && displayInfo.displays.length > 0 ? (
                  <div className="space-y-4">
                    {/* Display Selector */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Select Display Connector</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {displayInfo.displays.map((disp) => (
                          <button
                            key={disp.id}
                            type="button"
                            onClick={() => handleSelectDisplay(disp.id)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                              selectedDisplayId === disp.id
                                ? 'border-[#0067C0] bg-blue-50/50 dark:bg-blue-950/40 text-[#0067C0] dark:text-blue-400 font-bold'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs truncate">{disp.connector} {disp.isPrimary ? '(Primary)' : ''}</div>
                              <div className="text-[11px] text-slate-500 font-normal">{disp.currentResolution} @ {disp.activeRefreshRate}Hz</div>
                            </div>
                            {selectedDisplayId === disp.id && <Check className="w-4 h-4 text-[#0067C0] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resolution & Refresh Rate controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Resolution</label>
                        <select
                          value={selectedResolution}
                          onChange={(e) => setSelectedResolution(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0067C0]"
                        >
                          {(displayInfo.displays.find((d) => d.id === selectedDisplayId)?.availableResolutions || [selectedResolution]).map((res) => (
                            <option key={res} value={res}>{res}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Refresh Rate</label>
                        <select
                          value={selectedRefreshRate}
                          onChange={(e) => setSelectedRefreshRate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0067C0]"
                        >
                          {(displayInfo.displays.find((d) => d.id === selectedDisplayId)?.refreshRates || [selectedRefreshRate]).map((rate) => (
                            <option key={rate} value={rate}>{rate} Hz</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Orientation</label>
                        <select
                          value={selectedOrientation}
                          onChange={(e) => setSelectedOrientation(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0067C0]"
                        >
                          <option value="normal">Landscape (Normal)</option>
                          <option value="left">Portrait (Left 90°)</option>
                          <option value="inverted">Inverted (180°)</option>
                          <option value="right">Portrait (Right 270°)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleApplyDisplayConfig}
                        disabled={isApplyingDisplay}
                        className="px-4 py-2 bg-[#0067C0] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isApplyingDisplay ? 'Applying xrandr settings...' : 'Apply Display Configuration'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-3">No external displays detected via xrandr.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SOUND */}
          {activeTab === 'sound' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sound</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Master volume levels, PipeWire / PulseAudio output devices, and microphone inputs.
                </p>
              </div>

              {/* Master Volume Card */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Master Volume</span>
                  <span className="text-xs font-bold text-[#0067C0]">{quickSettings.volume}%</span>
                </div>
                <Slider
                  label=""
                  icon={quickSettings.volume === 0 ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-[#0067C0]" />}
                  value={quickSettings.volume}
                  onChange={(val) => setAudioVolume(val)}
                />
              </div>

              {/* Output Audio Devices (Sinks) */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <Volume2 className="w-4 h-4 text-[#0067C0]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Audio Output Devices</h3>
                </div>

                {audioStatus?.outputs && audioStatus.outputs.length > 0 ? (
                  <div className="space-y-2">
                    {audioStatus.outputs.map((dev) => (
                      <div
                        key={dev.id}
                        onClick={async () => {
                          await WindroidSystemBridge.getInstance().setAudioDefaultDevice(dev.id, 'output');
                          await refreshHardwareState();
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          dev.isActive
                            ? 'border-[#0067C0] bg-blue-50/50 dark:bg-blue-950/40'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                            dev.isActive ? 'text-[#0067C0] dark:text-blue-400' : 'text-slate-500'
                          }`}>
                            <Volume2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {dev.name} {dev.isActive ? '(Default Sink)' : ''}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{dev.description || dev.id}</div>
                          </div>
                        </div>
                        {dev.isActive && <Check className="w-4 h-4 text-[#0067C0] shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-2">No PipeWire or PulseAudio sinks detected.</div>
                )}
              </div>

              {/* Input Audio Devices (Microphones) */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <Mic className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Microphone Input Devices</h3>
                </div>

                {audioStatus?.inputs && audioStatus.inputs.length > 0 ? (
                  <div className="space-y-2">
                    {audioStatus.inputs.map((dev) => (
                      <div
                        key={dev.id}
                        onClick={async () => {
                          await WindroidSystemBridge.getInstance().setAudioDefaultDevice(dev.id, 'input');
                          await refreshHardwareState();
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          dev.isActive
                            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                            dev.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                          }`}>
                            <Mic className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {dev.name} {dev.isActive ? '(Default Input)' : ''}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{dev.description || dev.id}</div>
                          </div>
                        </div>
                        {dev.isActive && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 py-2">No microphone inputs detected.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB: POWER & BATTERY */}
          {activeTab === 'power' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Power & battery</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Battery level, power saving mode, and hardware power actions.
                </p>
              </div>

              {/* Battery / Power Status Card */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
                {powerStatus?.hasBattery ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Battery Level: {powerStatus.batteryPercent}%
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 capitalize">
                        {powerStatus.chargingState}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, powerStatus.batteryPercent || 0))}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {powerStatus.estimatedTimeRemainingMinutes
                          ? `${Math.floor(powerStatus.estimatedTimeRemainingMinutes / 60)}h ${powerStatus.estimatedTimeRemainingMinutes % 60}m remaining`
                          : powerStatus.acConnected ? 'Connected to AC Power' : 'Discharging'}
                      </span>
                      <span>Health: {powerStatus.healthPercent ?? 100}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="text-[#0067C0] flex items-center justify-center shrink-0">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">AC Power Connected</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Desktop PC / Virtual Machine Environment (No battery hardware detected)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Battery Saver Toggle */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Battery Saver Mode</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Optimizes CPU governor via powerprofilesctl / sysfs to extend usage
                  </div>
                </div>
                <Toggle
                  checked={quickSettings.batterySaver}
                  onChange={(val) => setBatterySaver(val)}
                />
              </div>

              {/* System Power Actions */}
              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-slate-500">
                  Hardware Power Operations
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      requestConfirm({
                        title: 'Shut Down System?',
                        message: 'Are you sure you want to turn off this device?',
                        confirmLabel: 'Shut Down',
                        onConfirm: () => WindroidSystemBridge.getInstance().executePowerAction('shutdown')
                      });
                    }}
                    className="p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-red-100/50 transition-all cursor-pointer"
                  >
                    <Power className="w-5 h-5" />
                    <span>Shut Down</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      requestConfirm({
                        title: 'Restart System?',
                        message: 'Are you sure you want to reboot Windroid OS?',
                        confirmLabel: 'Restart',
                        onConfirm: () => WindroidSystemBridge.getInstance().executePowerAction('restart')
                      });
                    }}
                    className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-amber-100/50 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Restart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => WindroidSystemBridge.getInstance().executePowerAction('suspend')}
                    className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-blue-100/50 transition-all cursor-pointer"
                  >
                    <Moon className="w-5 h-5" />
                    <span>Suspend</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => WindroidSystemBridge.getInstance().executePowerAction('lock')}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex flex-col items-center gap-1 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Lock Screen</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPS / COMPATIBILITY */}
          {(activeTab === 'apps' || activeTab === 'compatibility') && (
            <div className="max-w-5xl">
              <InstalledCompatibilityApps />
            </div>
          )}

          {/* TAB 5: PERSONALIZATION */}
          {activeTab === 'personalization' && (
            <div className="max-w-5xl">
              <PersonalizationBackground />
            </div>
          )}

          {/* TAB 6: NETWORK & INTERNET */}
          {(activeTab === 'wifi' || activeTab === 'network') && (
            <div className="max-w-5xl">
              <NetworkInternet />
            </div>
          )}

          {/* TAB: ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="max-w-5xl">
              <AccountsSettings />
            </div>
          )}

          {/* TAB: TIME & LANGUAGE */}
          {activeTab === 'time' && (
            <div className="max-w-5xl">
              <TimeLanguageSettings />
            </div>
          )}

          {/* TAB: ABOUT WINDROID OS */}
          {activeTab === 'about' && (
            <div className="max-w-5xl">
              <AboutWindroid />
            </div>
          )}

          {/* TAB 7: FOR DEVELOPERS */}
          {activeTab === 'developers' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">For developers</h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Developer privileges, system diagnostics, and demo package resets.
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-amber-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Developer Mode</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Unlocks raw system drive access & debug tools</div>
                    </div>
                  </div>
                  <Toggle
                    checked={developerMode}
                    onChange={() => {
                      if (!developerMode) {
                        requestConfirm({
                          title: 'Enable Developer Mode?',
                          message: 'Developer mode grants elevated access to internal system configurations.',
                          confirmLabel: 'Enable Dev Mode',
                          onConfirm: toggleDeveloperMode
                        });
                      } else {
                        toggleDeveloperMode();
                      }
                    }}
                  />
                </div>

                {developerMode && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Reset Demo Packages</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Restores all virtual demo packages</div>
                      </div>
                      <button
                        onClick={() => {
                          DemoPackageService.getInstance().resetAllDemoPackages();
                          const currentFS = loadFilesystemFromStorage();
                          const updatedFS = DemoPackageService.getInstance().syncDemoPackagesFolder(currentFS, true);
                          saveFilesystemToStorage(updatedFS);
                          addNotification({
                            title: 'Developer Mode',
                            message: 'All virtual demo package files have been reset.',
                            type: 'success'
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0067C0] text-white font-semibold text-xs cursor-pointer"
                      >
                        Reset Packages
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FALLBACK FOR OTHER TABS */}
          {!['system', 'display', 'sound', 'apps', 'compatibility', 'personalization', 'wifi', 'developers', 'accounts', 'about'].includes(activeTab) && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h1 className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-100">
                  {navItems.find((n) => n.id === activeTab)?.label || activeTab}
                </h1>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  Configure options and system preferences for {navItems.find((n) => n.id === activeTab)?.label || activeTab}.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-[#202024] border border-slate-200/90 dark:border-slate-800 rounded-2xl text-xs space-y-3 text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {navItems.find((n) => n.id === activeTab)?.label} Subsystem Active
                </div>
                <div>All default device parameters and configurations are optimized for Windroid OS 1.0.0.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
