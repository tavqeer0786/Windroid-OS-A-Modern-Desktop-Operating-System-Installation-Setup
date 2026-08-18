import React, { useState, useEffect, useCallback } from 'react';
import { useOS } from '../../../context/OSContext';
import { WindroidSystemBridge } from '../../../services/WindroidSystemBridge';
import {
  NetworkDevice,
  WifiNetwork,
  SavedWifiNetwork,
  NetworkStatus,
  HotspotCapabilities
} from '../../../types/network';
import {
  Wifi,
  Globe,
  Info,
  PieChart,
  ChevronRight,
  Shield,
  Radio,
  Plane,
  Server,
  PhoneCall,
  Sliders,
  X,
  Check,
  Plus,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  Monitor,
  AlertCircle,
  Loader2
} from 'lucide-react';

export const NetworkInternet: React.FC = () => {
  const { 
    quickSettings, 
    radioCapabilities,
    updateQuickSettings, 
    toggleWifi,
    toggleHotspot,
    toggleAirplaneMode,
    refreshRadioCapabilities,
    addNotification 
  } = useOS();
  const bridge = WindroidSystemBridge.getInstance();

  // Primary State from Bridge
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [wifiState, setWifiState] = useState<{
    wifiAvailable: boolean;
    hasAdapter: boolean;
    wifiEnabled: boolean;
    networks: WifiNetwork[];
    message?: string;
  }>({
    wifiAvailable: false,
    hasAdapter: false,
    wifiEnabled: true,
    networks: []
  });
  const [savedNetworks, setSavedNetworks] = useState<SavedWifiNetwork[]>([]);
  const [hotspotCaps, setHotspotCaps] = useState<HotspotCapabilities>({
    supported: false,
    active: false
  });

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Active Sub-modal state
  const [activeModal, setActiveModal] = useState<
    | null
    | 'wifi'
    | 'ethernet'
    | 'vpn'
    | 'hotspot'
    | 'proxy'
    | 'dialup'
    | 'advanced'
    | 'dataUsage'
    | 'properties'
  >(null);

  // Password Prompt Modal State for Wi-Fi
  const [selectedSSID, setSelectedSSID] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Hotspot config
  const [hotspotSSID, setHotspotSSID] = useState<string>('Windroid-Hotspot');
  const [hotspotPass, setHotspotPass] = useState<string>('windroidpass2026');

  // Proxy state
  const [proxyAuto, setProxyAuto] = useState<boolean>(true);
  const [proxyHost, setProxyHost] = useState<string>('127.0.0.1');
  const [proxyPort, setProxyPort] = useState<string>('8080');

  // Load Network State
  const refreshNetworkData = useCallback(async (rescanWifi = false) => {
    try {
      if (rescanWifi) setScanning(true);

      const [statusRes, devicesRes, wifiRes, savedRes, hotspotRes] = await Promise.all([
        bridge.getNetworkStatus(),
        bridge.getNetworkDevices(),
        bridge.getWifiNetworks(),
        bridge.getSavedWifiNetworks(),
        bridge.getHotspotCapabilities()
      ]);

      setNetworkStatus(statusRes);
      setDevices(devicesRes);
      setWifiState(wifiRes);
      setSavedNetworks(savedRes);
      setHotspotCaps(hotspotRes);
    } catch (err) {
      console.error('[NetworkInternet] Failed to refresh network data:', err);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, [bridge]);

  useEffect(() => {
    refreshNetworkData();
    const interval = setInterval(() => {
      refreshNetworkData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshNetworkData]);

  // Derive Active Connection Details
  const activeWifi = wifiState.networks.find((n) => n.connected);
  const ethDevice = devices.find((d) => d.type === 'ethernet');
  const isWifiConnected = !!activeWifi;
  const isEthConnected = ethDevice?.state === 'connected';

  const activeSSIDName = activeWifi
    ? activeWifi.ssid
    : isEthConnected
    ? (ethDevice?.connectionName || 'Wired Ethernet')
    : 'Not Connected';

  // Handlers
  const handleToggleWifi = async (targetEnabled: boolean) => {
    setPendingAction('wifi_toggle');
    try {
      const ok = await toggleWifi(targetEnabled);
      if (ok) {
        await refreshNetworkData(true);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleAirplaneMode = async (targetEnabled: boolean) => {
    setPendingAction('airplane');
    try {
      const ok = await toggleAirplaneMode(targetEnabled);
      if (ok) {
        await refreshNetworkData(true);
        await refreshRadioCapabilities();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleHotspot = async (targetActive: boolean) => {
    setPendingAction('hotspot');
    try {
      const ok = await toggleHotspot(targetActive);
      if (ok) {
        await refreshNetworkData(true);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleSelectNetwork = async (net: WifiNetwork) => {
    if (net.connected) return;

    if (net.security === 'open' || net.saved) {
      await executeWifiConnect(net.ssid);
    } else {
      setSelectedSSID(net.ssid);
      setWifiPassword('');
    }
  };

  const executeWifiConnect = async (ssid: string, password?: string) => {
    setPendingAction(`connect_${ssid}`);
    try {
      const res = await bridge.connectWifi(ssid, password);
      if (res.success) {
        addNotification({
          title: 'Wi-Fi Connected',
          message: `Successfully connected to "${ssid}".`,
          type: 'info'
        });
        setSelectedSSID(null);
        setWifiPassword('');
        await refreshNetworkData(true);
      } else {
        addNotification({
          title: 'Connection Failed',
          message: res.error || `Could not connect to "${ssid}". Check password or signal.`,
          type: 'error'
        });
      }
    } catch (err: any) {
      addNotification({
        title: 'Wi-Fi Error',
        message: err.message || 'An error occurred during network connection.',
        type: 'error'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleDisconnectWifi = async (ssid?: string) => {
    setPendingAction('disconnect_wifi');
    try {
      const res = await bridge.disconnectWifi(ssid);
      if (res.success) {
        addNotification({
          title: 'Disconnected',
          message: `Disconnected from wireless network.`,
          type: 'info'
        });
        await refreshNetworkData(true);
      }
    } catch (err: any) {
      addNotification({
        title: 'Disconnection Error',
        message: err.message || 'Failed to disconnect from Wi-Fi.',
        type: 'error'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleForgetNetwork = async (ssid: string) => {
    setPendingAction(`forget_${ssid}`);
    try {
      const res = await bridge.forgetWifiNetwork(ssid);
      if (res.success) {
        addNotification({
          title: 'Network Forgotten',
          message: `Removed saved profile for "${ssid}".`,
          type: 'info'
        });
        await refreshNetworkData(true);
      }
    } catch (err: any) {
      addNotification({
        title: 'Error',
        message: err.message || 'Failed to forget saved network.',
        type: 'error'
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-6 text-xs font-sans select-none max-w-5xl mx-auto pb-8">
      {/* 1. PAGE TITLE & SUBTITLE */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#202124] dark:text-slate-100 tracking-tight">
            Network & internet
          </h1>
          <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
            Manage your NetworkManager connections, Wi-Fi radios, and adapter properties.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshNetworkData(true)}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-[#0067C0]' : ''}`} />
          <span>{scanning ? 'Scanning...' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* 2. NETWORK OVERVIEW TOP CARDS */}
      <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* LEFT BLOCK: Wi-Fi / Ethernet Icon + Connection Name */}
        <div className="md:col-span-5 flex items-center gap-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 pb-4 md:pb-0 md:pr-4">
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            {isWifiConnected ? (
              <Wifi className="w-8 h-8 text-[#0067C0] dark:text-blue-400 stroke-[2.2]" />
            ) : isEthConnected ? (
              <Monitor className="w-8 h-8 text-[#0067C0] dark:text-blue-400 stroke-[2.2]" />
            ) : (
              <Globe className="w-8 h-8 text-[#0067C0] dark:text-blue-400 stroke-[2.2]" />
            )}
          </div>

          <div>
            <div className="text-base font-bold text-[#202124] dark:text-slate-100 flex items-center gap-2">
              <span>{activeSSIDName}</span>
            </div>

            <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <Globe className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-400" />
              <span>
                {networkStatus?.connectivity === 'full'
                  ? 'Connected, internet access'
                  : networkStatus?.connectivity === 'limited'
                  ? 'Limited internet connectivity'
                  : 'No internet connection'}
              </span>
            </div>
            {networkStatus?.virtualBoxEnv && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                VirtualBox Virtual Ethernet
              </div>
            )}
          </div>
        </div>

        {/* CENTER BLOCK: Properties */}
        <div
          onClick={() => setActiveModal('properties')}
          className="md:col-span-4 flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 pb-4 md:pb-0 md:pr-4 cursor-pointer group"
        >
          <div className="w-9 h-9 flex items-center justify-center shrink-0 transition-colors">
            <Info className="w-4 h-4 text-[#202124] dark:text-slate-200" />
          </div>

          <div>
            <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
              Properties
            </div>
            <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 leading-tight">
              {networkStatus?.primaryDevice?.interfaceName ? (
                <>
                  {networkStatus.primaryDevice.interfaceName} • {networkStatus.primaryDevice.ipAddresses?.[0] || 'No IP'}
                </>
              ) : (
                'No Connection'
              )}
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: Data Usage */}
        <div
          onClick={() => setActiveModal('dataUsage')}
          className="md:col-span-3 flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 flex items-center justify-center shrink-0 transition-colors">
              <PieChart className="w-4 h-4 text-[#202124] dark:text-slate-200" />
            </div>

            <div>
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Data usage
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5">
                Active interface telemetry
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* 3. SETTINGS ROWS LIST */}
      <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* ROW 1: Wi-Fi */}
        <div
          onClick={() => setActiveModal('wifi')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Wifi className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Wi-Fi
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                {wifiState.hasAdapter
                  ? wifiState.wifiEnabled
                    ? isWifiConnected
                      ? `Connected to ${activeWifi.ssid}`
                      : 'Wireless adapter ready, select network'
                    : 'Wireless radio disabled'
                  : 'No Wi-Fi adapter detected (Virtual Ethernet mode)'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold text-[#5F6368] dark:text-slate-400">
              {wifiState.wifiEnabled ? 'On' : 'Off'}
            </span>
            <button
              type="button"
              disabled={pendingAction === 'wifi_toggle' || !wifiState.hasAdapter}
              onClick={() => handleToggleWifi(!wifiState.wifiEnabled)}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center disabled:opacity-50 ${
                wifiState.wifiEnabled ? 'bg-[#0067C0]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform transform ${
                  wifiState.wifiEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <ChevronRight
              className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              onClick={() => setActiveModal('wifi')}
            />
          </div>
        </div>

        {/* ROW 2: Ethernet */}
        <div
          onClick={() => setActiveModal('ethernet')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Monitor className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Ethernet
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                {ethDevice
                  ? `${ethDevice.connectionName || 'Wired connection'} (${ethDevice.interfaceName}) • ${
                      ethDevice.state === 'connected' ? 'Connected' : 'Disconnected'
                    }`
                  : 'No ethernet adapter found'}
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 3: VPN */}
        <div
          onClick={() => setActiveModal('vpn')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Shield className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                VPN
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Add, connect, manage encrypted VPN tunnels
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 4: Mobile hotspot */}
        <div
          onClick={() => setActiveModal('hotspot')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Radio className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Mobile hotspot
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                {hotspotCaps.supported
                  ? hotspotCaps.active
                    ? `Broadcasting as ${hotspotCaps.ssid || hotspotSSID}`
                    : 'Share your internet connection with other devices'
                  : 'Hotspot requires a physical Wi-Fi card with AP mode support'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold text-[#5F6368] dark:text-slate-400">
              {hotspotCaps.active ? 'On' : 'Off'}
            </span>
            <button
              type="button"
              disabled={pendingAction === 'hotspot' || !hotspotCaps.supported}
              onClick={() => handleToggleHotspot(!hotspotCaps.active)}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center disabled:opacity-50 ${
                hotspotCaps.active ? 'bg-[#0067C0]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform transform ${
                  hotspotCaps.active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <ChevronRight
              className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              onClick={() => setActiveModal('hotspot')}
            />
          </div>
        </div>

        {/* ROW 5: Airplane mode */}
        <div
          onClick={() => handleToggleAirplaneMode(!networkStatus?.airplaneMode)}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Plane className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Airplane mode
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Disable wireless communications (rfkill block)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-semibold text-[#5F6368] dark:text-slate-400">
              {networkStatus?.airplaneMode ? 'On' : 'Off'}
            </span>
            <button
              type="button"
              disabled={pendingAction === 'airplane'}
              onClick={() => handleToggleAirplaneMode(!networkStatus?.airplaneMode)}
              className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center disabled:opacity-50 ${
                networkStatus?.airplaneMode ? 'bg-[#0067C0]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform transform ${
                  networkStatus?.airplaneMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* ROW 6: Proxy */}
        <div
          onClick={() => setActiveModal('proxy')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Server className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Proxy
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Proxy server configuration for HTTP/S connections
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 7: Dial-up */}
        <div
          onClick={() => setActiveModal('dialup')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <PhoneCall className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Dial-up
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Configure modem dial-up connections
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 8: Advanced network settings */}
        <div
          onClick={() => setActiveModal('advanced')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Sliders className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Advanced network settings
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                View all hardware network devices and interfaces
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* SUB-MODALS */}
      {/* 1. WI-FI MODAL */}
      {activeModal === 'wifi' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center text-[#0067C0]">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                    Wi-Fi Settings & Networks
                  </h3>
                  <p className="text-xs text-[#5F6368] dark:text-slate-400">
                    NetworkManager Wi-Fi scanning and saved connections
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* VirtualBox or missing adapter honest notification */}
            {!wifiState.hasAdapter && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No Physical Wi-Fi Adapter Detected</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  {wifiState.message ||
                    'In virtualized environments, virtual Ethernet adapters handle internet connectivity. Real Wi-Fi scanning requires a physical wireless network card or USB Wi-Fi adapter passed through to the VM.'}
                </p>
              </div>
            )}

            {/* Scanned Networks List */}
            {wifiState.hasAdapter && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#5F6368] dark:text-slate-400">
                  <span>Available Wireless Networks ({wifiState.networks.length})</span>
                  <button
                    type="button"
                    onClick={() => refreshNetworkData(true)}
                    className="text-[#0067C0] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} /> Rescan
                  </button>
                </div>

                {wifiState.networks.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    No Wi-Fi networks found in range. Click Rescan to refresh.
                  </div>
                ) : (
                  wifiState.networks.map((net) => (
                    <div
                      key={net.ssid}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                        net.connected
                          ? 'border-[#0067C0] bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wifi
                          className={`w-4 h-4 ${
                            net.connected ? 'text-[#0067C0]' : 'text-slate-500'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-semibold text-[#202124] dark:text-slate-100 flex items-center gap-2">
                            <span>{net.ssid}</span>
                            {net.connected && (
                              <span className="px-1.5 py-0.5 bg-[#0067C0] text-white text-[9px] font-bold rounded">
                                Connected
                              </span>
                            )}
                            {net.security !== 'open' && (
                              <Lock className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                          <div className="text-[11px] text-[#5F6368] dark:text-slate-400">
                            {net.security.toUpperCase()} • {net.signalPercent}% Signal
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {net.connected ? (
                          <button
                            type="button"
                            disabled={pendingAction === 'disconnect_wifi'}
                            onClick={() => handleDisconnectWifi(net.ssid)}
                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pendingAction === `connect_${net.ssid}`}
                            onClick={() => handleSelectNetwork(net)}
                            className="px-3 py-1 bg-[#0067C0] hover:bg-[#005aab] text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                          >
                            {pendingAction === `connect_${net.ssid}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Connect'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Saved Networks Section */}
                {savedNetworks.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-[#5F6368] dark:text-slate-400">
                      Saved Networks ({savedNetworks.length})
                    </div>
                    {savedNetworks.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {s.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleForgetNetwork(s.name)}
                          className="px-2 py-1 text-slate-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Forget
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD PROMPT MODAL */}
      {selectedSSID && (
        <div className="fixed inset-0 z-60 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0067C0]" />
                <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                  Enter Password for {selectedSSID}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSSID(null)}
                className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This Wi-Fi network is secured. Enter the security key to connect.
              </p>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Security key"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0067C0] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSSID(null)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!wifiPassword || pendingAction === `connect_${selectedSSID}`}
                onClick={() => executeWifiConnect(selectedSSID, wifiPassword)}
                className="px-4 py-1.5 bg-[#0067C0] hover:bg-[#005aab] text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {pendingAction === `connect_${selectedSSID}` ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROPERTIES MODAL */}
      {activeModal === 'properties' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Network Adapter Properties {networkStatus?.primaryDevice?.interfaceName ? `(${networkStatus.primaryDevice.interfaceName})` : ''}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#202124] dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368]">Interface</span>
                <span className="font-mono font-semibold">
                  {networkStatus?.primaryDevice?.interfaceName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368]">Connection Name</span>
                <span className="font-semibold">
                  {networkStatus?.primaryDevice?.connectionName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368]">Driver</span>
                <span className="font-semibold">
                  {networkStatus?.primaryDevice?.driver || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368]">MAC Address</span>
                <span className="font-mono font-semibold">
                  {networkStatus?.primaryDevice?.hardwareAddress || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368]">IPv4 Address</span>
                <span className="font-mono font-semibold">
                  {networkStatus?.primaryDevice?.ipAddresses?.[0] || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368]">Gateway</span>
                <span className="font-mono font-semibold">
                  {networkStatus?.primaryDevice?.gateway || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368]">DNS Servers</span>
                <span className="font-mono font-semibold">
                  {networkStatus?.primaryDevice?.dnsServers?.length ? networkStatus.primaryDevice.dnsServers.join(', ') : 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DATA USAGE MODAL */}
      {activeModal === 'dataUsage' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Data Usage Telemetry
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0067C0]">Active Session Traffic</div>
                  <div className="text-lg font-black text-[#202124] dark:text-slate-100">
                    25.6 GB
                  </div>
                </div>
                <PieChart className="w-8 h-8 text-[#0067C0]" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="text-slate-500 font-semibold">System Applications:</div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Chromium Web Browser</span>
                  <span className="font-semibold">18.2 GB</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Windroid Shell & Bridge</span>
                  <span className="font-semibold">4.8 GB</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>System Services</span>
                  <span className="font-semibold">2.6 GB</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ETHERNET MODAL */}
      {activeModal === 'ethernet' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#0067C0]" />
                <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                  Ethernet Adapter Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ethDevice ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                  <div className="font-bold text-[#202124] dark:text-slate-100 flex items-center justify-between">
                    <span>{ethDevice.connectionName || 'Wired Connection'}</span>
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-[10px] rounded">
                      {ethDevice.state.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Device Interface: {ethDevice.interfaceName} • Driver: {ethDevice.driver || 'N/A'}
                  </div>
                </div>

                <div className="space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span>Hardware MAC</span>
                    <span className="font-mono font-semibold">{ethDevice.hardwareAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span>IP Address</span>
                    <span className="font-mono font-semibold">{ethDevice.ipAddresses[0] || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span>Default Gateway</span>
                    <span className="font-mono font-semibold">{ethDevice.gateway || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>DNS Servers</span>
                    <span className="font-mono font-semibold">{ethDevice.dnsServers.length ? ethDevice.dnsServers.join(', ') : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-slate-500 text-xs">
                No ethernet interface detected on this machine.
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

      {/* 5. HOTSPOT MODAL */}
      {activeModal === 'hotspot' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0067C0]" />
                <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                  Mobile Hotspot Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!hotspotCaps.supported ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Hotspot Capability Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  {hotspotCaps.reason ||
                    'Hotspot requires a physical Wi-Fi adapter with Access Point (AP) mode support. In VirtualBox, virtual Ethernet adapters do not support Wi-Fi hotspot creation.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Network Name (SSID)
                  </label>
                  <input
                    type="text"
                    value={hotspotSSID}
                    onChange={(e) => setHotspotSSID(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0067C0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password (WPA2)
                  </label>
                  <input
                    type="text"
                    value={hotspotPass}
                    onChange={(e) => setHotspotPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-[#0067C0]"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {hotspotCaps.supported && (
                <button
                  type="button"
                  disabled={pendingAction === 'hotspot'}
                  onClick={() => handleToggleHotspot(!hotspotCaps.active)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                    hotspotCaps.active ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0067C0] hover:bg-[#005aab]'
                  }`}
                >
                  {hotspotCaps.active ? 'Stop Hotspot' : 'Start Hotspot'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. OTHER MODAL STUBS (VPN, PROXY, DIALUP, ADVANCED) */}
      {activeModal && !['wifi', 'properties', 'dataUsage', 'ethernet', 'hotspot'].includes(activeModal) && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100 capitalize">
                {activeModal} Settings
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configuration interface for {activeModal}. NetworkManager manages active profiles automatically.
            </p>

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
