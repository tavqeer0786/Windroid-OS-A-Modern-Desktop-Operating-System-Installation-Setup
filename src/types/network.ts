export interface NetworkDevice {
  id: string;
  interfaceName: string;
  type: 'ethernet' | 'wifi' | 'loopback' | 'virtual' | 'unknown';
  state: 'connected' | 'connecting' | 'disconnected' | 'unavailable' | 'disabled';
  managed: boolean;
  hardwareAddress?: string;
  driver?: string;
  connectionName?: string;
  ipAddresses: string[];
  gateway?: string;
  dnsServers: string[];
  speedMbps?: number;
}

export interface WifiNetwork {
  ssid: string;
  bssid?: string;
  signalPercent: number;
  security: 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' | 'enterprise' | 'unknown';
  frequencyMHz?: number;
  channel?: number;
  connected: boolean;
  saved: boolean;
}

export interface SavedWifiNetwork {
  id: string;
  name: string;
  autoConnect: boolean;
}

export interface NetworkStatus {
  connectivity: 'full' | 'limited' | 'portal' | 'none' | 'unknown';
  wifiEnabled: boolean;
  wifiHardwareEnabled: boolean;
  airplaneMode: boolean;
  ethernetConnected: boolean;
  virtualBoxEnv: boolean;
  primaryDevice?: NetworkDevice;
}

export interface HotspotCapabilities {
  supported: boolean;
  active: boolean;
  ssid?: string;
  reason?: string;
}
