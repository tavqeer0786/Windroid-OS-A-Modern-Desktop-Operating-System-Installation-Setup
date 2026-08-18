import {
  InstallationSession,
  InstallerPackageKind,
  InstallerRuntimeKind,
  InstallerSessionStatus,
} from './InstallerTypes';
import { InstallationPlan } from './InstallationPlanTypes';
import { InstallerExecutionCallbacks } from './InstallerExecutionTypes';
import { ProviderCapabilities } from './ProviderCapabilities';
import { ProviderHealth } from './ProviderHealth';

export interface InstallerProviderCallbacks {
  onProgress?: (progress: Partial<InstallationSession['progress']>) => void;
  onStatusChange?: (status: InstallerSessionStatus) => void;
}

export interface ProviderValidationIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  field?: string;
}

export interface ProviderValidationResult {
  valid: boolean;
  issues: ProviderValidationIssue[];
}

export interface InstallerProvider {
  readonly id: string;
  readonly runtime: InstallerRuntimeKind;
  readonly supportedPackageKinds: InstallerPackageKind[];

  readonly capabilities: ProviderCapabilities;
  readonly supportsPause?: boolean;
  readonly supportsResume?: boolean;

  getCapabilities(): ProviderCapabilities;
  getHealth(): ProviderHealth;

  canHandle(session: InstallationSession): boolean;

  prepare?(session: InstallationSession, plan?: InstallationPlan): Promise<void>;
  validate?(session: InstallationSession, plan?: InstallationPlan): Promise<ProviderValidationResult>;

  inspect?(
    session: InstallationSession,
    signal?: AbortSignal
  ): Promise<Partial<InstallationSession>>;

  execute?(
    session: InstallationSession,
    plan: InstallationPlan,
    callbacks?: InstallerExecutionCallbacks,
    signal?: AbortSignal
  ): Promise<InstallationSession['result']>;

  pause?(sessionId: string): Promise<boolean>;
  resume?(sessionId: string): Promise<boolean>;

  install?(
    session: InstallationSession,
    callbacks?: InstallerProviderCallbacks,
    signal?: AbortSignal
  ): Promise<InstallationSession['result']>;

  cancel?(sessionId: string): Promise<void>;

  rollback?(session: InstallationSession): Promise<void>;
  cleanup?(sessionId: string): Promise<void>;
  dispose?(sessionId: string): Promise<void>;
}

