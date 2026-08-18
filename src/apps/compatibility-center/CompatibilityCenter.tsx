import React, { useState, useEffect } from 'react';
import { AppRuntimeService } from '../../system/runtime/AppRuntimeService';
import { RuntimeStatus } from '../../system/runtime/AppRuntimeProvider';
import { RuntimeStatusCard } from './RuntimeStatusCard';
import { InstalledCompatibilityApps } from './InstalledCompatibilityApps';
import { useOS } from '../../context/OSContext';
import {
  Layers,
  Monitor,
  Smartphone,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Info,
  Activity,
  Wrench,
  FileText
} from 'lucide-react';

export const CompatibilityCenter: React.FC = () => {
  const { addNotification } = useOS();
  const [activeTab, setActiveTab] = useState<'runtimes' | 'apps' | 'checks' | 'logs'>('runtimes');
  const [statuses, setStatuses] = useState<Record<string, RuntimeStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRuntimeKey, setSelectedRuntimeKey] = useState<string>('native');

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await AppRuntimeService.getInstance().getAllRuntimeStatuses();
      setStatuses(res);
    } catch (err) {
      console.error('Failed to fetch runtime statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const selectedStatus: RuntimeStatus | null = statuses && statuses[selectedRuntimeKey] ? statuses[selectedRuntimeKey] : null;

  const handleRepairRuntime = (runtimeName: string) => {
    addNotification({
      title: 'Subsystem Maintenance',
      message: `Re-indexing runtime libraries and clearing cache for ${runtimeName}...`,
      type: 'info'
    });
  };

  const getRuntimeDetails = (key: string) => {
    switch (key) {
      case 'windows':
        return {
          name: 'WinBridge (Wine Staging)',
          path: '/var/lib/windroid/winbridge/prefixes',
          graphics: 'DXVK 2.3 / Direct3D 11 Translation',
          sandbox: 'Per-App Wine Prefix'
        };
      case 'android':
        return {
          name: 'DroidBridge (Waydroid)',
          path: '/var/lib/windroid/droidbridge/lxc',
          graphics: 'Wayland EGL Direct Passthrough',
          sandbox: 'LXC Android Container'
        };
      case 'native':
      default:
        return {
          name: 'Native Linux Runtime',
          path: '/var/lib/windroid/native/flatpak',
          graphics: 'Native OpenGL / Vulkan',
          sandbox: 'Strict Flatpak Portal Sandbox'
        };
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#1E1E1E] text-[#202124] dark:text-slate-100 font-sans select-none">
      {/* Notice Banner */}
      <div className="bg-[#0067C0]/10 dark:bg-[#0067C0]/20 text-[#0067C0] dark:text-blue-300 px-5 py-1.5 text-xs font-medium border-b border-[#0067C0]/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#0067C0] dark:text-blue-300 shrink-0" />
          <span>Simulation Mode — native hardware bridge unavailable</span>
        </div>
        <span className="font-mono text-[11px] opacity-75">Windroid Compatibility Center v2.4</span>
      </div>

      {/* App Header */}
      <div className="p-5 bg-white dark:bg-[#1E1E1E] border-b border-[#E5E7EB] dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-[#202124] dark:text-slate-200 shrink-0" />
            <div>
              <h1 className="text-[26px] font-semibold text-[#202124] dark:text-slate-100 tracking-tight leading-tight">
                Compatibility Center
              </h1>
              <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
                Manage Native Linux, WinBridge (Wine), and DroidBridge (Waydroid) runtimes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchStatuses}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#CCCCCC] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 text-[#202124] dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer h-[32px] shrink-0"
            title="Refresh Runtimes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mt-5 border-b border-[#E5E7EB] dark:border-slate-800 text-[13px]">
          <button
            type="button"
            onClick={() => setActiveTab('runtimes')}
            className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'runtimes'
                ? 'border-[#0067C0] text-[#0067C0] dark:text-blue-400'
                : 'border-transparent text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
          >
            Runtime Statuses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apps')}
            className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'apps'
                ? 'border-[#0067C0] text-[#0067C0] dark:text-blue-400'
                : 'border-transparent text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
          >
            Installed Applications
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checks')}
            className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'checks'
                ? 'border-[#0067C0] text-[#0067C0] dark:text-blue-400'
                : 'border-transparent text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
          >
            Compatibility Checks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[#0067C0] text-[#0067C0] dark:text-blue-400'
                : 'border-transparent text-[#5F6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200'
            }`}
          >
            Runtime Logs & Diagnostics
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'runtimes' && (
          <div className="space-y-6">
            {/* Split Layout: 65% Left List | 35% Right Inspector */}
            {statuses ? (
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Left Panel: Runtime List (65%) */}
                <div className="lg:w-[65%] space-y-2">
                  <div className="text-xs font-semibold text-[#5F6368] dark:text-slate-400 uppercase tracking-wider px-1 pb-1">
                    System Runtimes
                  </div>

                  <div className="space-y-2">
                    <RuntimeStatusCard
                      status={statuses.native}
                      isSelected={selectedRuntimeKey === 'native'}
                      onSelect={() => setSelectedRuntimeKey('native')}
                    />
                    <RuntimeStatusCard
                      status={statuses.windows}
                      isSelected={selectedRuntimeKey === 'windows'}
                      onSelect={() => setSelectedRuntimeKey('windows')}
                    />
                    <RuntimeStatusCard
                      status={statuses.android}
                      isSelected={selectedRuntimeKey === 'android'}
                      onSelect={() => setSelectedRuntimeKey('android')}
                    />
                  </div>
                </div>

                {/* Right Panel: Property Inspector (35%) */}
                <div className="lg:w-[35%] border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-[#252525] flex flex-col justify-between space-y-4">
                  <div>
                    <div className="pb-3 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedRuntimeKey === 'windows' ? (
                          <Monitor className="w-5 h-5 text-[#202124] dark:text-slate-200" />
                        ) : selectedRuntimeKey === 'android' ? (
                          <Smartphone className="w-5 h-5 text-[#202124] dark:text-slate-200" />
                        ) : (
                          <Terminal className="w-5 h-5 text-[#202124] dark:text-slate-200" />
                        )}
                        <span className="text-[15px] font-semibold text-[#202124] dark:text-slate-100">
                          {selectedStatus ? getRuntimeDetails(selectedRuntimeKey).name : 'Runtime Inspector'}
                        </span>
                      </div>
                    </div>

                    {selectedStatus && (
                      <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800/80 text-xs text-[#202124] dark:text-slate-200">
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#5F6368] dark:text-slate-400">Status</span>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className={`w-2 h-2 rounded-full ${selectedStatus.isNativeAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {selectedStatus.isNativeAvailable ? 'Active Native Bridge' : 'Simulation Mode'}
                          </span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#5F6368] dark:text-slate-400">Version</span>
                          <span className="font-mono text-[#202124] dark:text-slate-200">{selectedStatus.version}</span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between gap-2">
                          <span className="text-[#5F6368] dark:text-slate-400 shrink-0">Runtime Path</span>
                          <span className="font-mono text-[11px] text-[#5F6368] dark:text-slate-400 truncate">
                            {getRuntimeDetails(selectedRuntimeKey).path}
                          </span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#5F6368] dark:text-slate-400">Containers / Prefixes</span>
                          <span className="font-mono font-medium">{selectedStatus.activeContainersOrPrefixes || 0}</span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#5F6368] dark:text-slate-400">Graphics Backend</span>
                          <span className="text-[#202124] dark:text-slate-200">{getRuntimeDetails(selectedRuntimeKey).graphics}</span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#5F6368] dark:text-slate-400">Sandbox Isolation</span>
                          <span className="text-[#202124] dark:text-slate-200">{getRuntimeDetails(selectedRuntimeKey).sandbox}</span>
                        </div>

                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#5F6368] dark:text-slate-400">Last Check</span>
                          <span className="text-[#5F6368] dark:text-slate-400">Just now</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inspector Action Buttons */}
                  <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchStatuses}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#CCCCCC] dark:border-slate-700 bg-white hover:bg-[#F5F5F5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#202124] dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer h-[34px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Check Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRepairRuntime(getRuntimeDetails(selectedRuntimeKey).name)}
                      className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#CCCCCC] dark:border-slate-700 bg-white hover:bg-[#F5F5F5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#202124] dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer h-[34px]"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Repair</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('logs')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#CCCCCC] dark:border-slate-700 bg-white hover:bg-[#F5F5F5] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#202124] dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer h-[34px]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Logs</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#5F6368] dark:text-slate-400">
                Loading runtime status metrics...
              </div>
            )}

            {/* Architecture Overview Section */}
            <div className="pt-5 border-t border-[#E5E7EB] dark:border-slate-800 space-y-3">
              <div className="text-[15px] font-semibold text-[#202124] dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5F6368] dark:text-slate-400" />
                <span>Multi-Runtime Subsystem Architecture</span>
              </div>
              <p className="text-[13px] text-[#5F6368] dark:text-slate-400 leading-relaxed max-w-4xl">
                Windroid OS encapsulates native Linux desktop apps via Flatpak sandboxing, Windows Win32 executables via
                isolated WinBridge Wine prefixes, and Android APK apps through LXC containerized Waydroid instances.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
                <div>
                  <div className="text-[13px] font-semibold text-[#202124] dark:text-slate-200">Native Priority</div>
                  <div className="text-[12px] text-[#5F6368] dark:text-slate-400 mt-1 leading-normal">
                    Flatpak and native Linux packages run directly inside isolated system portals with native display access.
                  </div>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#202124] dark:text-slate-200">WinBridge Sandbox</div>
                  <div className="text-[12px] text-[#5F6368] dark:text-slate-400 mt-1 leading-normal">
                    Per-application Wine prefixes isolate Windows files, registry states, and DXVK graphics translation layers.
                  </div>
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#202124] dark:text-slate-200">DroidBridge Container</div>
                  <div className="text-[12px] text-[#5F6368] dark:text-slate-400 mt-1 leading-normal">
                    Containerized Waydroid LXC instance maps Wayland display compositing directly to Android surface views.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apps' && <InstalledCompatibilityApps onRefreshNeeded={fetchStatuses} />}

        {activeTab === 'checks' && (
          <div className="space-y-4 text-xs font-sans max-w-4xl">
            <div className="space-y-1">
              <h3 className="text-[15px] font-semibold text-[#202124] dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5F6368] dark:text-slate-400" />
                <span>Pre-Flight Compatibility Database</span>
              </h3>
              <p className="text-[13px] text-[#5F6368] dark:text-slate-400 leading-relaxed">
                When an installer package is executed, Windroid OS checks GPG signatures, PE/ELF headers, DLL dependencies,
                and CPU architecture compatibility before initializing installation.
              </p>
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-slate-800 border-t border-b border-[#E5E7EB] dark:border-slate-800 font-mono text-xs pt-1">
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#202124] dark:text-slate-200">x86_64 PE Executable (.exe / .msi)</span>
                <span className="inline-flex items-center gap-1.5 font-sans font-medium text-[#202124] dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Direct DXVK Translation
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#202124] dark:text-slate-200">Universal Android APK (.apk)</span>
                <span className="inline-flex items-center gap-1.5 font-sans font-medium text-[#202124] dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Waydroid EGL Direct
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#202124] dark:text-slate-200">ARM64 Android APK on x86_64 Host</span>
                <span className="inline-flex items-center gap-1.5 font-sans font-medium text-[#202124] dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Requires libhoudini / libndk
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <span className="text-[#202124] dark:text-slate-200">Flatpak Native Package (.flatpak)</span>
                <span className="inline-flex items-center gap-1.5 font-sans font-medium text-[#202124] dark:text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Direct Sandboxed Execution
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="p-4 bg-[#1E1E1E] border border-slate-800 text-slate-300 font-mono text-xs rounded-lg space-y-1.5 max-h-[450px] overflow-y-auto">
            <div className="text-slate-500 font-semibold pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>=== Windroid OS Subsystem Event Diagnostics ===</span>
              <span>Filter: All Events</span>
            </div>
            <div className="pt-1 text-slate-400">[INFO] [System] Compatibility Subsystem initialized in simulation mode.</div>
            <div className="text-slate-400">[INFO] [WinBridge] Default Wine prefix: /var/lib/windroid/winbridge/prefixes/default</div>
            <div className="text-slate-400">[INFO] [DroidBridge] Waydroid session manager status: SIMULATED (Native bridge absent)</div>
            <div className="text-slate-400">[INFO] [Flatpak] Native Linux sandbox portal initialized.</div>
            <div className="text-emerald-400 font-semibold">[OK] All 3 application runtime providers ready for installer requests.</div>
          </div>
        )}
      </div>
    </div>
  );
};
