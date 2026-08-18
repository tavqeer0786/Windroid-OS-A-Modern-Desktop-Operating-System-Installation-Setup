export interface RadioCapabilities {
  networkManagerAvailable: boolean;

  wifiAdapterPresent: boolean;
  wifiSupported: boolean;
  wifiHardwareBlocked: boolean;
  wifiSoftwareBlocked: boolean;
  wifiEnabled: boolean;

  bluetoothAdapterPresent: boolean;
  bluezAvailable: boolean;
  bluetoothSupported: boolean;
  bluetoothHardwareBlocked: boolean;
  bluetoothSoftwareBlocked: boolean;
  bluetoothEnabled: boolean;

  hotspotSupported: boolean;
  hotspotAvailable: boolean;
  hotspotActive: boolean;

  loading: boolean;
  lastUpdatedAt?: number;
}

export const DEFAULT_RADIO_CAPABILITIES: RadioCapabilities = {
  networkManagerAvailable: false,

  wifiAdapterPresent: false,
  wifiSupported: false,
  wifiHardwareBlocked: false,
  wifiSoftwareBlocked: false,
  wifiEnabled: false,

  bluetoothAdapterPresent: false,
  bluezAvailable: false,
  bluetoothSupported: false,
  bluetoothHardwareBlocked: false,
  bluetoothSoftwareBlocked: false,
  bluetoothEnabled: false,

  hotspotSupported: false,
  hotspotAvailable: false,
  hotspotActive: false,

  loading: true
};
