export interface BluetoothAdapter {
  id: string;
  address: string;
  name?: string;
  alias?: string;
  powered: boolean;
  discoverable: boolean;
  pairable: boolean;
  discovering: boolean;
  hardwareBlocked: boolean;
  softwareBlocked: boolean;
}

export interface BluetoothStatus {
  success: boolean;
  available: boolean;
  hasAdapter: boolean;
  powered: boolean;
  discovering: boolean;
  hardwareBlocked: boolean;
  softwareBlocked: boolean;
  primaryAdapter?: BluetoothAdapter;
  adapters: BluetoothAdapter[];
  errorCode?: string;
  message?: string;
}

export interface BluetoothDevice {
  id: string;
  address: string;
  name?: string;
  alias?: string;
  deviceType: 'audio' | 'headphones' | 'speaker' | 'mouse' | 'keyboard' | 'phone' | 'computer' | 'gamepad' | 'unknown';
  iconType: 'headphones' | 'mouse' | 'keyboard' | 'controller' | 'speaker' | 'tv' | 'tablet' | 'printer' | 'phone' | 'computer' | 'other';
  paired: boolean;
  trusted: boolean;
  connected: boolean;
  rssi?: number;
  batteryPercent?: number;
}
