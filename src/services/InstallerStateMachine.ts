import {
  InstallerPhase,
  InstallationStep,
  OobeStep,
  InstallationMode,
  UserConfig,
  LocaleConfig,
  InstallationPlan,
  InstallerStatus
} from '../types/installer';

export interface InstallerFormState {
  language: string;
  countryId: string;
  keyboard: string;
  timezone: string;
  selectedDiskDevice: string;
  installationMode: InstallationMode;
  username: string;
  fullName: string;
  password?: string;
  confirmPassword?: string;
  deviceName: string;
  plan: InstallationPlan | null;
  authToken: string | null;
  status: InstallerStatus | null;
}

export type InstallerStep = InstallationStep | OobeStep;

export type InstallerAction =
  | { type: 'START_INSTALLER'; payload?: { phase?: InstallerPhase; step?: InstallerStep } }
  | { type: 'SELECT_LANGUAGE'; payload: { language: string; keyboard?: string } }
  | { type: 'SELECT_DISK'; payload: { selectedDiskDevice: string } }
  | { type: 'GENERATE_PLAN'; payload: { plan: InstallationPlan; authToken?: string } }
  | { type: 'VALIDATE_PLAN'; payload?: { errors?: string[]; warnings?: string[] } }
  | { type: 'AUTHORIZE_PLAN'; payload: { authToken: string } }
  | { type: 'START_INSTALLATION' }
  | { type: 'UPDATE_INSTALL_PROGRESS'; payload: { status: InstallerStatus } }
  | { type: 'INSTALLATION_COMPLETE' }
  | { type: 'REQUEST_RESTART' }
  | { type: 'RESTART_COMPLETED' }
  | { type: 'SELECT_REGION'; payload: { countryId: string; timezone?: string; locale?: string } }
  | { type: 'SELECT_KEYBOARD'; payload: { keyboard: string } }
  | { type: 'UPDATE_USER'; payload: Partial<InstallerFormState> }
  | { type: 'CREATE_USER'; payload: { username: string; fullName?: string; password?: string } }
  | { type: 'UPDATE_PERSONALIZATION'; payload: { deviceName: string; timezone?: string } }
  | { type: 'FINALIZE_OOBE' }
  | { type: 'ENTER_DESKTOP' }
  | { type: 'GO_BACK' }
  | { type: 'GO_NEXT' }
  | { type: 'CANCEL_INSTALLER' }
  | { type: 'RESET_INSTALLER'; payload?: { phase?: InstallerPhase } };

export interface StateMachineSnapshot {
  phase: InstallerPhase;
  step: InstallerStep;
  form: InstallerFormState;
  canGoNext: boolean;
  canGoBack: boolean;
  error: string | null;
}

export const INITIAL_FORM_STATE: InstallerFormState = {
  language: 'en_US',
  countryId: 'US',
  keyboard: 'us',
  timezone: 'America/New_York',
  selectedDiskDevice: '',
  installationMode: 'erase_disk',
  username: 'windroid',
  fullName: 'Windroid User',
  password: '',
  confirmPassword: '',
  deviceName: 'Windroid-PC',
  plan: null,
  authToken: null,
  status: null
};

// Explicit transition table for Phase 1 (Live Installation)
const PHASE1_TRANSITIONS: Record<string, { next: InstallationStep | null; back: InstallationStep | null }> = {
  'language': { next: 'target-disk', back: null },
  'target-disk': { next: 'ready', back: 'language' },
  'ready': { next: 'installing', back: 'target-disk' },
  'installing': { next: 'complete', back: null },
  'complete': { next: null, back: null }
};

// Explicit transition table for Phase 2 (First Boot OOBE)
const PHASE2_TRANSITIONS: Record<string, { next: OobeStep | null; back: OobeStep | null }> = {
  'region': { next: 'keyboard', back: null },
  'keyboard': { next: 'user', back: 'region' },
  'user': { next: 'personalization', back: 'keyboard' },
  'personalization': { next: 'finalizing', back: 'user' },
  'finalizing': { next: 'desktop', back: null },
  'desktop': { next: null, back: null }
};

export class InstallerStateMachine {
  private phase: InstallerPhase = 'installation';
  private step: InstallerStep = 'language';
  private formState: InstallerFormState = { ...INITIAL_FORM_STATE };
  private errorMessage: string | null = null;
  private listeners: Set<(snapshot: StateMachineSnapshot) => void> = new Set();

  constructor(initialPhase: InstallerPhase = 'installation', initialStep?: InstallerStep) {
    this.phase = initialPhase;
    this.step = initialStep || (initialPhase === 'installation' ? 'language' : 'region');
  }

  public getSnapshot(): StateMachineSnapshot {
    return {
      phase: this.phase,
      step: this.step,
      form: { ...this.formState },
      canGoNext: this.calculateCanGoNext(),
      canGoBack: this.calculateCanGoBack(),
      error: this.errorMessage
    };
  }

  public subscribe(listener: (snapshot: StateMachineSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  public updateForm(partial: Partial<InstallerFormState>) {
    this.formState = { ...this.formState, ...partial };
    this.notify();
  }

  public setError(error: string | null) {
    this.errorMessage = error;
    this.notify();
  }

  public clearError() {
    this.errorMessage = null;
    this.notify();
  }

  public calculateCanGoNext(): boolean {
    if (this.phase === 'installation') {
      switch (this.step) {
        case 'language':
          return !!this.formState.language;
        case 'target-disk':
          return !!this.formState.selectedDiskDevice;
        case 'ready':
          return true;
        case 'installing':
          return false;
        case 'complete':
          return true;
        default:
          return false;
      }
    } else {
      switch (this.step) {
        case 'region':
          return !!this.formState.countryId;
        case 'keyboard':
          return !!this.formState.keyboard;
        case 'user':
          return (
            /^[a-z_][a-z0-9_-]*$/.test(this.formState.username.trim()) &&
            (!this.formState.password || this.formState.password === this.formState.confirmPassword)
          );
        case 'personalization':
          return !!this.formState.deviceName.trim();
        case 'finalizing':
          return false;
        case 'desktop':
          return false;
        default:
          return false;
      }
    }
  }

  public calculateCanGoBack(): boolean {
    if (this.phase === 'installation') {
      const rule = PHASE1_TRANSITIONS[this.step];
      return rule ? rule.back !== null : false;
    } else {
      const rule = PHASE2_TRANSITIONS[this.step];
      return rule ? rule.back !== null : false;
    }
  }

  public goNext(): boolean {
    if (!this.calculateCanGoNext()) return false;
    this.clearError();

    if (this.phase === 'installation') {
      const rule = PHASE1_TRANSITIONS[this.step];
      if (rule && rule.next) {
        this.step = rule.next;
      } else if (this.step === 'complete') {
        // Transition from Phase 1 complete to Phase 2 OOBE
        this.phase = 'oobe';
        this.step = 'region';
      }
    } else {
      const rule = PHASE2_TRANSITIONS[this.step];
      if (rule && rule.next) {
        this.step = rule.next;
      }
    }

    this.notify();
    return true;
  }

  public goBack(): boolean {
    if (!this.calculateCanGoBack()) return false;
    this.clearError();

    if (this.phase === 'installation') {
      const rule = PHASE1_TRANSITIONS[this.step];
      if (rule && rule.back) {
        this.step = rule.back;
      }
    } else {
      const rule = PHASE2_TRANSITIONS[this.step];
      if (rule && rule.back) {
        this.step = rule.back;
      }
    }

    this.notify();
    return true;
  }

  public transitionTo(phase: InstallerPhase, step: InstallerStep) {
    this.clearError();
    this.phase = phase;
    this.step = step;
    this.notify();
  }

  public dispatch(action: InstallerAction): boolean {
    switch (action.type) {
      case 'START_INSTALLER':
        this.reset(action.payload?.phase || 'installation');
        if (action.payload?.step) {
          this.step = action.payload.step;
        }
        this.notify();
        return true;

      case 'SELECT_LANGUAGE':
        this.updateForm({
          language: action.payload.language,
          ...(action.payload.keyboard ? { keyboard: action.payload.keyboard } : {})
        });
        return true;

      case 'SELECT_DISK':
        this.updateForm({ selectedDiskDevice: action.payload.selectedDiskDevice });
        return true;

      case 'GENERATE_PLAN':
        this.updateForm({
          plan: action.payload.plan,
          ...(action.payload.authToken ? { authToken: action.payload.authToken } : {})
        });
        return true;

      case 'VALIDATE_PLAN':
        if (action.payload?.errors && action.payload.errors.length > 0) {
          this.setError(action.payload.errors[0]);
        } else {
          this.clearError();
        }
        return true;

      case 'AUTHORIZE_PLAN':
        this.updateForm({ authToken: action.payload.authToken });
        return true;

      case 'START_INSTALLATION':
        if (this.phase === 'installation' && this.step === 'ready') {
          this.transitionTo('installation', 'installing');
          return true;
        }
        return false;

      case 'UPDATE_INSTALL_PROGRESS':
        this.updateForm({ status: action.payload.status });
        return true;

      case 'INSTALLATION_COMPLETE':
        if (this.phase === 'installation') {
          this.transitionTo('installation', 'complete');
          return true;
        }
        return false;

      case 'REQUEST_RESTART':
        this.clearError();
        return true;

      case 'RESTART_COMPLETED':
        this.transitionTo('oobe', 'region');
        return true;

      case 'SELECT_REGION':
        this.updateForm({
          countryId: action.payload.countryId,
          ...(action.payload.timezone ? { timezone: action.payload.timezone } : {}),
          ...(action.payload.locale ? { language: action.payload.locale } : {})
        });
        return true;

      case 'SELECT_KEYBOARD':
        this.updateForm({ keyboard: action.payload.keyboard });
        return true;

      case 'UPDATE_USER':
        this.updateForm(action.payload);
        return true;

      case 'CREATE_USER': {
        const trimmedUser = action.payload.username.trim();
        const usernameRegex = /^[a-z_][a-z0-9_-]*$/;
        if (!trimmedUser || !usernameRegex.test(trimmedUser)) {
          this.setError('Invalid username format.');
          return false;
        }
        this.updateForm({
          username: trimmedUser,
          fullName: action.payload.fullName || trimmedUser,
          ...(action.payload.password ? { password: action.payload.password } : {})
        });
        this.clearError();
        return true;
      }

      case 'UPDATE_PERSONALIZATION':
        this.updateForm({
          deviceName: action.payload.deviceName,
          ...(action.payload.timezone ? { timezone: action.payload.timezone } : {})
        });
        return true;

      case 'FINALIZE_OOBE':
        if (this.phase === 'oobe') {
          this.transitionTo('oobe', 'desktop');
          return true;
        }
        return false;

      case 'ENTER_DESKTOP':
        this.transitionTo('oobe', 'desktop');
        return true;

      case 'GO_BACK':
        return this.goBack();

      case 'GO_NEXT':
        return this.goNext();

      case 'CANCEL_INSTALLER':
        this.reset('installation');
        return true;

      case 'RESET_INSTALLER':
        this.reset(action.payload?.phase || 'installation');
        return true;

      default:
        return false;
    }
  }

  public reset(phase: InstallerPhase = 'installation') {
    this.phase = phase;
    this.step = phase === 'installation' ? 'language' : 'region';
    this.formState = { ...INITIAL_FORM_STATE };
    this.errorMessage = null;
    this.notify();
  }
}
