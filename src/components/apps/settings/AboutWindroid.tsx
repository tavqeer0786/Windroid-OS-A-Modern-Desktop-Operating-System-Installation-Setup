import React, { useState, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';
import {
  Laptop,
  Cpu,
  HardDrive,
  Info,
  ChevronRight,
  X
} from 'lucide-react';
import { WindroidSystemBridge } from '../../../services/WindroidSystemBridge';
import { SystemHardwareInfo } from '../../../types/windroid-global';
import { SystemDrive } from '../files/models/drive';

export const AboutWindroid: React.FC = () => {
  const { addNotification, deviceIdentity, updateDeviceHostname } = useOS();
  const [sysInfo, setSysInfo] = useState<SystemHardwareInfo | null>(null);
  const [drives, setDrives] = useState<SystemDrive[]>([]);

  const [deviceName, setDeviceName] = useState<string>(deviceIdentity.hostname || 'windroid-pc');
  const [tempDeviceName, setTempDeviceName] = useState<string>(deviceIdentity.hostname || 'windroid-pc');

  // Active sub-modal for detailed specs or rename
  const [activeModal, setActiveModal] = useState<
    null | 'deviceName' | 'processor' | 'ram' | 'storage' | 'systemType' | 'osInfo'
  >(null);

  useEffect(() => {
    if (deviceIdentity.hostname) {
      setDeviceName(deviceIdentity.hostname);
      setTempDeviceName(deviceIdentity.hostname);
    }
  }, [deviceIdentity.hostname]);

  useEffect(() => {
    const bridge = WindroidSystemBridge.getInstance();
    bridge.getSystemInfo().then((info) => {
      setSysInfo(info);
    });
    bridge.getStorageDevices().then((devs) => {
      setDrives(devs);
    });
  }, []);

  const handleSaveDeviceName = async () => {
    if (tempDeviceName.trim()) {
      const name = tempDeviceName.trim();
      setDeviceName(name);
      await updateDeviceHostname(name);
      addNotification({
        title: 'Device Renamed',
        message: `Device hostname set to "${name}"`,
        type: 'info'
      });
      setActiveModal(null);
    }
  };

  const mainDrive = drives.find((d) => d.isSystemDrive) || drives[0];

  const processorDisplay = sysInfo?.cpu
    ? `${sysInfo.cpu.modelName} (${sysInfo.cpu.logicalCores} Logical Cores)`
    : 'Detecting Processor...';

  const ramDisplay = sysInfo?.memory
    ? sysInfo.memory.formattedTotal
    : 'Detecting Memory...';

  const storageDisplay = mainDrive
    ? `${(mainDrive.totalBytes / (1024 * 1024 * 1024)).toFixed(0)} GB ${mainDrive.filesystem.toUpperCase() || 'Disk'}`
    : 'Detecting Storage...';

  const systemTypeDisplay = sysInfo
    ? `${sysInfo.architecture}-based operating system, ${sysInfo.cpu.architecture}-based processor`
    : '64-bit operating system, x86_64-based processor';

  return (
    <div className="space-y-6 text-xs font-sans select-none max-w-5xl mx-auto pb-8">
      {/* 1. HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#202124] dark:text-slate-100 tracking-tight">
          About Windroid OS
        </h1>
        <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
          Learn more about your device and Windroid OS.
        </p>
      </div>

      {/* 2. HERO SECTION CARD */}
      <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 shadow-2xs flex items-center gap-6">
        <div className="w-16 h-16 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-16 h-16 text-[#0067C0] fill-current"
          >
            <path d="M 50 10 L 15 85 L 32 85 L 50 45 L 68 85 L 85 85 Z" />
            <path
              d="M 25 70 Q 50 48 75 70"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <div className="text-2xl font-bold text-[#202124] dark:text-slate-100 flex items-baseline gap-2">
            <span>Windroid OS</span>
            <span className="font-normal text-xl text-[#202124] dark:text-slate-200">1.0</span>
          </div>
          <div className="text-xs font-medium text-[#5F6368] dark:text-slate-400 mt-1">
            {sysInfo?.osName ? `${sysInfo.osName}` : 'Debian 12 Live x86_64'}
          </div>
        </div>
      </div>

      {/* 3. SYSTEM INFORMATION LIST CARD */}
      <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* ROW 1: Device name */}
        <div
          onClick={() => {
            setTempDeviceName(deviceName);
            setActiveModal('deviceName');
          }}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Laptop className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Device name
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate font-medium">
                {deviceName}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 2: Processor */}
        <div
          onClick={() => setActiveModal('processor')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Cpu className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Processor
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate font-medium">
                {processorDisplay}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 3: Installed RAM */}
        <div
          onClick={() => setActiveModal('ram')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <svg className="w-5 h-5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <line x1="6" y1="18" x2="6" y2="21" />
                <line x1="10" y1="18" x2="10" y2="21" />
                <line x1="14" y1="18" x2="14" y2="21" />
                <line x1="18" y1="18" x2="18" y2="21" />
                <line x1="6" y1="10" x2="10" y2="10" />
                <line x1="14" y1="10" x2="18" y2="10" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Installed RAM
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate font-medium">
                {ramDisplay}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 4: Storage */}
        <div
          onClick={() => setActiveModal('storage')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <HardDrive className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Storage
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate font-medium">
                {storageDisplay}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 5: System type */}
        <div
          onClick={() => setActiveModal('systemType')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <svg className="w-5 h-5 stroke-[2] fill-none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M2 20h20" />
                <path d="M9 10l2 2-2 2" />
                <path d="M13 14h2" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                System type
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate font-medium">
                {systemTypeDisplay}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* 4. WINDROID OS INFO CARD */}
      <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div
          onClick={() => setActiveModal('osInfo')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Info className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Windroid OS info
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Kernel, graphics, virtualization and build details
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* 5. MODALS FOR DETAILED SYSTEM INFO */}

      {/* RENAME DEVICE MODAL */}
      {activeModal === 'deviceName' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Rename your PC
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#5F6368] dark:text-slate-300">
                Current device name: <span className="font-bold text-[#202124] dark:text-slate-100">{deviceName}</span>
              </p>
              <div>
                <label className="text-xs font-semibold text-[#5F6368] block mb-1">
                  New Device Name
                </label>
                <input
                  type="text"
                  value={tempDeviceName}
                  onChange={(e) => setTempDeviceName(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0067C0]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeviceName}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSOR SPECS MODAL */}
      {activeModal === 'processor' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Processor Information
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">Model</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.cpu.modelName || 'Detecting...'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">Logical Processors</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.cpu.logicalCores || 1} Cores / Threads</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">Architecture</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.cpu.architecture || 'x86_64'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">Hypervisor / Host</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.virtualizationProvider || 'Bare Metal'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAM SPECS MODAL */}
      {activeModal === 'ram' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Memory Information
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">Installed RAM</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.memory.formattedTotal || 'Detecting...'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">Available Memory</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.memory.formattedAvailable || 'Detecting...'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">RAM Usage</span>
                <span className="font-semibold text-[#202124] dark:text-slate-200">{sysInfo?.memory ? `${sysInfo.memory.usagePercent}% active` : 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STORAGE & SYSTEM TYPE & OS INFO MODALS */}
      {(activeModal === 'storage' || activeModal === 'systemType' || activeModal === 'osInfo') && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100 capitalize">
                {activeModal === 'storage'
                  ? 'Storage Diagnostics'
                  : activeModal === 'systemType'
                  ? 'System Architecture Details'
                  : 'Windroid OS System Details'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModal === 'storage' && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Main Disk</span>
                  <span className="font-semibold">{mainDrive ? `${mainDrive.displayName} (${mainDrive.devicePath})` : 'System Disk'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Total Capacity</span>
                  <span className="font-semibold">{mainDrive ? `${(mainDrive.totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Free Space</span>
                  <span className="font-semibold">{mainDrive ? `${(mainDrive.freeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB free` : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5F6368]">Filesystem</span>
                  <span className="font-semibold">{mainDrive?.filesystem || 'ext4'}</span>
                </div>
              </div>
            )}

            {activeModal === 'systemType' && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">OS Architecture</span>
                  <span className="font-semibold">{sysInfo?.architecture || 'x86_64'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Instruction Set</span>
                  <span className="font-semibold">{sysInfo?.cpu.architecture || 'x86_64'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5F6368]">Virtualization</span>
                  <span className="font-semibold">{sysInfo?.virtualizationProvider || 'Bare Metal'}</span>
                </div>
              </div>
            )}

            {activeModal === 'osInfo' && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Edition</span>
                  <span className="font-semibold">{sysInfo?.osName || 'Windroid OS 1.0.0 (Debian 12)'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Kernel</span>
                  <span className="font-semibold">{sysInfo?.kernelVersion || 'Linux 6.x'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[#5F6368]">Graphics</span>
                  <span className="font-semibold">{sysInfo?.graphics.adapterName || 'VGA Adapter'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#5F6368]">Environment</span>
                  <span className="font-semibold">{sysInfo?.virtualizationProvider || 'Bare Metal'}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
