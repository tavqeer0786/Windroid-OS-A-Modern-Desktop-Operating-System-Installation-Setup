import React, { useState, useEffect, useCallback } from 'react';
import { useOS } from '../../../context/OSContext';
import { WindroidSystemBridge } from '../../../services/WindroidSystemBridge';
import { BluetoothAdapter, BluetoothStatus, BluetoothDevice } from '../../../types/bluetooth';
import {
  Bluetooth,
  Plus,
  Headphones,
  Mouse,
  Keyboard,
  Gamepad2,
  Volume2,
  Tv,
  Tablet,
  Battery,
  MoreHorizontal,
  ChevronRight,
  X,
  Printer,
  Smartphone,
  RefreshCw,
  Info,
  Trash2,
  Zap,
  AlertTriangle,
  Radio
} from 'lucide-react';

export const BluetoothDevices: React.FC = () => {
  const { addNotification, requestConfirm, quickSettings, updateQuickSettings, refreshRadioCapabilities } = useOS();

  const [status, setStatus] = useState<BluetoothStatus | null>(null);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [bluetoothPowered, setBluetoothPowered] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState<boolean>(false);
  const [activeMenuDevId, setActiveMenuDevId] = useState<string | null>(null);
  const [selectedPropDev, setSelectedPropDev] = useState<BluetoothDevice | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const bridge = WindroidSystemBridge.getInstance();
  const isNative = bridge.isNative();

  const refreshBluetoothState = useCallback(async () => {
    try {
      if (window.windroid?.bluetooth) {
        const st = await window.windroid.bluetooth.getStatus();
        setStatus(st);
        setBluetoothPowered(st.powered);

        if (st.hasAdapter && st.powered) {
          const devs = await window.windroid.bluetooth.getDevices();
          setDevices(devs);
        } else {
          setDevices([]);
        }
      } else {
        // Fallback status if global API missing
        setStatus({
          success: true,
          available: false,
          hasAdapter: false,
          powered: false,
          discovering: false,
          hardwareBlocked: false,
          softwareBlocked: false,
          adapters: [],
          message: 'Bluetooth API unavailable in this runtime.'
        });
        setDevices([]);
      }
    } catch (err) {
      console.warn('[BluetoothDevices] Error fetching Bluetooth status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBluetoothState();
    const interval = setInterval(() => {
      refreshBluetoothState();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshBluetoothState]);

  // Handle outside click & escape key
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuDevId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuDevId(null);
        setIsAddDeviceOpen(false);
        setSelectedPropDev(null);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Toggle Power
  const handleTogglePower = async (targetPowered: boolean) => {
    if (!status?.hasAdapter) {
      addNotification({
        title: 'Bluetooth Adapter Required',
        message: 'No physical or virtual Bluetooth adapter was detected in this system.',
        type: 'warning'
      });
      return;
    }

    setActionInProgress('power');
    try {
      if (window.windroid?.bluetooth) {
        const res = await window.windroid.bluetooth.setPowered(targetPowered);
        if (res.success) {
          setBluetoothPowered(res.powered);
          updateQuickSettings({ bluetooth: res.powered });
          await refreshRadioCapabilities();
          addNotification({
            title: res.powered ? 'Bluetooth Enabled' : 'Bluetooth Disabled',
            message: res.powered
              ? 'Bluetooth radio turned on. Nearby devices can discover Windroid OS.'
              : 'Bluetooth radio turned off.',
            type: 'info'
          });
          await refreshBluetoothState();
        } else {
          addNotification({
            title: 'Bluetooth Toggle Failed',
            message: res.error || 'Failed to change Bluetooth power state.',
            type: 'error'
          });
        }
      }
    } catch (err: any) {
      addNotification({
        title: 'Bluetooth Error',
        message: err.message || 'Error executing Bluetooth power change.',
        type: 'error'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Start Discovery Scan
  const handleOpenAddDevice = async () => {
    if (!status?.hasAdapter) {
      addNotification({
        title: 'No Bluetooth Adapter',
        message: 'Cannot scan for devices because no Bluetooth controller is present.',
        type: 'warning'
      });
      return;
    }

    if (!bluetoothPowered) {
      await handleTogglePower(true);
    }

    setIsAddDeviceOpen(true);
    setIsScanning(true);

    try {
      if (window.windroid?.bluetooth) {
        await window.windroid.bluetooth.startDiscovery();
        // Poll for discovered devices over 10 seconds
        let elapsed = 0;
        const scanInterval = setInterval(async () => {
          elapsed += 2;
          if (window.windroid?.bluetooth) {
            const currentDevs = await window.windroid.bluetooth.getDevices();
            setDevices(currentDevs);
          }
          if (elapsed >= 12) {
            clearInterval(scanInterval);
            if (window.windroid?.bluetooth) {
              await window.windroid.bluetooth.stopDiscovery();
            }
            setIsScanning(false);
          }
        }, 2000);
      }
    } catch (err) {
      console.warn('[BluetoothDevices] Scan error:', err);
      setIsScanning(false);
    }
  };

  const handleStopScan = async () => {
    try {
      if (window.windroid?.bluetooth) {
        await window.windroid.bluetooth.stopDiscovery();
      }
    } catch (err) {
      console.warn('[BluetoothDevices] Stop scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Pair Device
  const handlePairDevice = async (device: BluetoothDevice) => {
    setActionInProgress(device.address);
    try {
      if (window.windroid?.bluetooth) {
        const res = await window.windroid.bluetooth.pair(device.address);
        if (res.success) {
          addNotification({
            title: 'Device Paired',
            message: `Successfully paired with ${device.name || device.address}.`,
            type: 'info'
          });
          await refreshBluetoothState();
        } else {
          addNotification({
            title: 'Pairing Failed',
            message: res.error || `Failed to pair with ${device.name || device.address}.`,
            type: 'error'
          });
        }
      }
    } catch (err: any) {
      addNotification({
        title: 'Pairing Error',
        message: err.message || 'An error occurred during Bluetooth pairing.',
        type: 'error'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Connect / Disconnect Device
  const handleToggleConnect = async (device: BluetoothDevice) => {
    setActionInProgress(device.address);
    try {
      if (window.windroid?.bluetooth) {
        if (device.connected) {
          const res = await window.windroid.bluetooth.disconnect(device.address);
          if (res.success) {
            addNotification({
              title: 'Disconnected',
              message: `Disconnected from ${device.name || device.address}.`,
              type: 'info'
            });
            await refreshBluetoothState();
          } else {
            addNotification({
              title: 'Disconnect Failed',
              message: res.error || 'Failed to disconnect Bluetooth device.',
              type: 'error'
            });
          }
        } else {
          const res = await window.windroid.bluetooth.connect(device.address);
          if (res.success) {
            addNotification({
              title: 'Connected',
              message: `Connected to ${device.name || device.address}.`,
              type: 'info'
            });
            await refreshBluetoothState();
          } else {
            addNotification({
              title: 'Connection Failed',
              message: res.error || 'Failed to establish Bluetooth connection.',
              type: 'error'
            });
          }
        }
      }
    } catch (err: any) {
      addNotification({
        title: 'Bluetooth Error',
        message: err.message || 'An error occurred during Bluetooth operation.',
        type: 'error'
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // Forget / Remove Device
  const handleForgetDevice = (device: BluetoothDevice) => {
    requestConfirm({
      title: `Forget ${device.name || device.address}?`,
      message: `Your device will be unpaired from Windroid OS and will no longer connect automatically.`,
      confirmLabel: 'Forget Device',
      isDanger: true,
      onConfirm: async () => {
        setActionInProgress(device.address);
        try {
          if (window.windroid?.bluetooth) {
            const res = await window.windroid.bluetooth.removeDevice(device.address);
            if (res.success) {
              addNotification({
                title: 'Device Removed',
                message: `Removed ${device.name || device.address} from paired devices.`,
                type: 'info'
              });
              await refreshBluetoothState();
            } else {
              addNotification({
                title: 'Remove Failed',
                message: res.error || 'Failed to remove Bluetooth device.',
                type: 'error'
              });
            }
          }
        } catch (err: any) {
          addNotification({
            title: 'Bluetooth Error',
            message: err.message || 'An error occurred while removing the device.',
            type: 'error'
          });
        } finally {
          setActionInProgress(null);
        }
      }
    });
  };

  const renderDeviceIcon = (iconType: BluetoothDevice['iconType']) => {
    switch (iconType) {
      case 'headphones':
        return <Headphones className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'mouse':
        return <Mouse className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'keyboard':
        return <Keyboard className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'controller':
        return <Gamepad2 className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'speaker':
        return <Volume2 className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'tv':
        return <Tv className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'printer':
        return <Printer className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      case 'phone':
        return <Smartphone className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
      default:
        return <Bluetooth className="w-5 h-5 text-[#202124] dark:text-slate-200" />;
    }
  };

  const pairedDevices = devices.filter((d) => d.paired);
  const availableDevices = devices.filter((d) => !d.paired);

  return (
    <div className="space-y-5 text-xs font-sans select-none max-w-5xl mx-auto pb-8">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#202124] dark:text-slate-100 tracking-tight">
          Bluetooth & devices
        </h1>
        <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
          Manage your Bluetooth controllers, audio devices, mouse, keyboard and peripherals.
        </p>
      </div>

      {/* NO ADAPTER WARNING BANNER (E.G. VIRTUALBOX) */}
      {!loading && status && !status.hasAdapter && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
              No Bluetooth Adapter Detected
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Windroid OS could not detect an active Bluetooth controller on this system.
              VirtualBox and hypervisors generally do not expose the host Bluetooth radio directly to virtual machines unless a USB Bluetooth dongle is passed through.
            </p>
          </div>
        </div>
      )}

      {/* TOP CONTROLS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bluetooth Power Card */}
        <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Bluetooth className="w-5 h-5 text-[#0067C0] dark:text-sky-400" />
            </div>

            <div>
              <div className="text-sm font-bold text-[#202124] dark:text-slate-100">
                Bluetooth
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5">
                {!status?.hasAdapter
                  ? 'No Bluetooth adapter'
                  : bluetoothPowered
                  ? 'Discoverable as "Windroid-OS"'
                  : 'Off'}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!status?.hasAdapter || actionInProgress === 'power'}
            onClick={() => handleTogglePower(!bluetoothPowered)}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors shrink-0 flex items-center ${
              !status?.hasAdapter
                ? 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-slate-700'
                : bluetoothPowered
                ? 'bg-[#0067C0] cursor-pointer'
                : 'bg-slate-300 dark:bg-slate-700 cursor-pointer'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform transform ${
                bluetoothPowered ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Add Device Card */}
        <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-[#202124] dark:text-slate-200" />
            </div>

            <div>
              <div className="text-sm font-bold text-[#202124] dark:text-slate-100">
                Add device
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5">
                Scan and pair a Bluetooth device
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!status?.hasAdapter}
            onClick={handleOpenAddDevice}
            className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs shrink-0 ${
              !status?.hasAdapter
                ? 'bg-slate-300 dark:bg-slate-700 opacity-60 cursor-not-allowed'
                : 'bg-[#0067C0] hover:bg-[#005aab] cursor-pointer'
            }`}
          >
            Add device
          </button>
        </div>
      </div>

      {/* PAIRED DEVICES SECTION */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-bold text-[#202124] dark:text-slate-200">
          Paired devices
        </h2>

        <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#5F6368] dark:text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0067C0]" />
              Checking Bluetooth hardware...
            </div>
          ) : pairedDevices.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5F6368] dark:text-slate-400">
              {status?.hasAdapter
                ? 'No paired Bluetooth devices.'
                : 'No Bluetooth adapter installed on this machine.'}
            </div>
          ) : (
            pairedDevices.map((dev) => {
              const isMenuOpen = activeMenuDevId === dev.id;
              const isBusy = actionInProgress === dev.address;

              return (
                <div
                  key={dev.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {renderDeviceIcon(dev.iconType)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 truncate">
                        {dev.alias || dev.name || dev.address}
                      </div>
                      <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 font-mono truncate">
                        {dev.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          dev.connected ? 'bg-[#10B981]' : 'bg-slate-400'
                        }`}
                      />
                      <span className="text-xs font-medium text-[#202124] dark:text-slate-200">
                        {dev.connected ? 'Connected' : 'Paired'}
                      </span>
                    </div>

                    {/* Show battery percentage ONLY when provided by BlueZ */}
                    {dev.connected && dev.batteryPercent !== undefined && dev.batteryPercent !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-[#202124] dark:text-slate-200 font-medium justify-end">
                        <span>{dev.batteryPercent}%</span>
                        <Battery className="w-4 h-4 text-[#202124] dark:text-slate-200" />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleConnect(dev)}
                      className="px-3 py-1.5 bg-white dark:bg-[#202024] border border-[#CCCCCC]/80 dark:border-slate-700 hover:border-slate-400 text-xs font-semibold text-[#202124] dark:text-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      {isBusy ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : dev.connected ? (
                        'Disconnect'
                      ) : (
                        'Connect'
                      )}
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuDevId(isMenuOpen ? null : dev.id);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 flex items-center justify-center text-[#5F6368] dark:text-slate-300 transition-colors cursor-pointer"
                        title="Device options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && renderContextMenu(dev)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DISCOVERED / AVAILABLE DEVICES SECTION */}
      {availableDevices.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-sm font-bold text-[#202124] dark:text-slate-200">
            Available devices nearby
          </h2>

          <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
            {availableDevices.map((dev) => {
              const isMenuOpen = activeMenuDevId === dev.id;
              const isBusy = actionInProgress === dev.address;

              return (
                <div
                  key={dev.id}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {renderDeviceIcon(dev.iconType)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 truncate">
                        {dev.alias || dev.name || dev.address}
                      </div>
                      <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 font-mono truncate">
                        {dev.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handlePairDevice(dev)}
                      className="px-4 py-1.5 bg-[#0067C0] hover:bg-[#005aab] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Pair'}
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuDevId(isMenuOpen ? null : dev.id);
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 flex items-center justify-center text-[#5F6368] dark:text-slate-300 transition-colors cursor-pointer"
                        title="Device options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && renderContextMenu(dev)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MORE BLUETOOTH SETTINGS CARD */}
      <div
        onClick={() =>
          addNotification({
            title: 'Bluetooth Preferences',
            message: 'BlueZ daemon and RFCOMM settings are optimized for Windroid OS.',
            type: 'info'
          })
        }
        className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs group"
      >
        <div>
          <div className="text-sm font-semibold text-[#202124] dark:text-slate-100">
            More Bluetooth settings
          </div>
          <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5">
            View adapter details and BlueZ service status
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>

      {/* ADD DEVICE MODAL */}
      {isAddDeviceOpen && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                  Add a device
                </h3>
                <p className="text-xs text-[#5F6368] dark:text-slate-400">
                  Make sure your Bluetooth device is in pairing mode.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleStopScan();
                  setIsAddDeviceOpen(false);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isScanning ? (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-[#0067C0] animate-spin mx-auto" />
                <p className="text-xs font-medium text-[#202124] dark:text-slate-200">
                  Scanning for nearby Bluetooth devices...
                </p>
                <p className="text-[11px] text-[#5F6368] dark:text-slate-400">
                  Bluetooth discovery is active.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#5F6368] dark:text-slate-400 uppercase">
                  Discovered Devices
                </div>
                {devices.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#5F6368] dark:text-slate-400">
                    No nearby devices found. Make sure target devices are discoverable.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {devices.map((dev) => (
                      <div
                        key={dev.id}
                        onClick={() => handlePairDevice(dev)}
                        className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center text-[#0067C0]">
                            {renderDeviceIcon(dev.iconType)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#202124] dark:text-slate-100">
                              {dev.alias || dev.name || dev.address}
                            </div>
                            <div className="text-[11px] text-[#5F6368] dark:text-slate-400 font-mono">
                              {dev.address}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#0067C0] hover:underline">
                          {dev.paired ? (dev.connected ? 'Connected' : 'Connect') : 'Pair'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleStopScan();
                  setIsAddDeviceOpen(false);
                }}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEVICE PROPERTIES MODAL */}
      {selectedPropDev && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center">
                  {renderDeviceIcon(selectedPropDev.iconType)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                    {selectedPropDev.alias || selectedPropDev.name || selectedPropDev.address}
                  </h3>
                  <p className="text-xs text-[#5F6368] dark:text-slate-400">
                    Bluetooth Device Properties
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPropDev(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#202124] dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368] dark:text-slate-400">Status</span>
                <span className="font-semibold text-emerald-600">
                  {selectedPropDev.connected ? 'Connected' : selectedPropDev.paired ? 'Paired' : 'Discovered'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-[#5F6368] dark:text-slate-400">Bluetooth Address</span>
                <span className="font-mono font-semibold">{selectedPropDev.address}</span>
              </div>
              {selectedPropDev.batteryPercent !== undefined && selectedPropDev.batteryPercent !== null && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-[#5F6368] dark:text-slate-400">Battery Percentage</span>
                  <span className="font-semibold">{selectedPropDev.batteryPercent}%</span>
                </div>
              )}
              {selectedPropDev.rssi !== undefined && selectedPropDev.rssi !== null && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-[#5F6368] dark:text-slate-400">Signal Strength (RSSI)</span>
                  <span className="font-semibold">{selectedPropDev.rssi} dBm</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-[#5F6368] dark:text-slate-400">Device Type</span>
                <span className="font-semibold capitalize">{selectedPropDev.deviceType}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPropDev(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold hover:bg-[#005aab] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderContextMenu(dev: BluetoothDevice) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-9 z-50 w-48 bg-white dark:bg-[#2C2C2C] border border-[#E5E7EB] dark:border-slate-700 rounded-xl shadow-xl py-1 text-left text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
      >
        <button
          type="button"
          onClick={() => {
            setActiveMenuDevId(null);
            handleToggleConnect(dev);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>{dev.connected ? 'Disconnect' : 'Connect'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMenuDevId(null);
            setSelectedPropDev(dev);
          }}
          className="w-full px-3 py-2 text-left text-[#202124] dark:text-slate-200 hover:bg-[#F3F4F6] dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-[#5F6368] dark:text-slate-300" />
          <span>Device Properties</span>
        </button>

        {dev.paired && (
          <button
            type="button"
            onClick={() => {
              setActiveMenuDevId(null);
              handleForgetDevice(dev);
            }}
            className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 cursor-pointer border-t border-[#E5E7EB] dark:border-slate-700/60 mt-1 pt-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Forget Device</span>
          </button>
        )}
      </div>
    );
  }
};
