export type ProviderHealthState =
  | 'available'
  | 'unavailable'
  | 'not-installed'
  | 'unsupported'
  | 'simulation'
  | 'error'
  | 'unknown';

export interface ProviderHealth {
  state: ProviderHealthState;
  message: string;
  lastCheckedAt?: number;
  details?: Record<string, unknown>;
}
