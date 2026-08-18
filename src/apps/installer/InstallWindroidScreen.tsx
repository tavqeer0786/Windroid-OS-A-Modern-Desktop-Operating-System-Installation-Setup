import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck, Wrench, ArrowRight, ArrowLeft, X, Check, Laptop, HardDrive,
  Info, AlertTriangle, RefreshCw, Globe, Key, Clock, CheckCircle2, AlertCircle, Play,
  ChevronDown, Disc, Plus, Maximize2, Minus, Square
} from 'lucide-react';
import { AppLauncherIcon } from '../../components/icons/CustomAppIcons';
import {
  getSystemBackend,
  initializeSystemBackend,
  SystemBackend,
  formatPartitionDevice
} from '../../services/SystemBackend';
import {
  InstallerDisk,
  InstallerStatus,
  InstallationPlan,
  BootMode,
  InstallationMode,
  UserConfig,
  LocaleConfig,
  InstallerPhase,
  InstallationStep,
  OobeStep
} from '../../types/installer';
import {
  InstallerStateMachine,
  StateMachineSnapshot
} from '../../services/InstallerStateMachine';
import { InstallerSessionStore } from '../../services/StartupResolver';
import { useOS } from '../../context/OSContext';
import { COUNTRIES_DATA } from '../../data/countries';
import { InstallerErrorBoundary } from '../../components/installer/InstallerErrorBoundary';

interface InstallWindroidScreenProps {
  onClose?: () => void;
  launchContext?: 'boot' | 'live-desktop';
}

const InstallWindroidContent: React.FC<InstallWindroidScreenProps> = ({
  onClose,
  launchContext
}) => {
  const { setRuntimeMode, runtimeMode: osRuntimeMode } = useOS();

  // Determine actual launch context
  const actualContext = (() => {
    if (launchContext) return launchContext;
    if (osRuntimeMode === 'installer') return 'boot';
    return 'live-desktop';
  })();

  // Instantiate Authoritative State Machine once
  const stateMachineRef = useRef<InstallerStateMachine>(
    (() => {
      const savedSession = InstallerSessionStore.getSession();
      if (savedSession && savedSession.installationCompleted && !savedSession.oobeCompleted) {
        return new InstallerStateMachine('oobe', 'region');
      }
      return new InstallerStateMachine('installation', 'language');
    })()
  );

  const [snapshot, setSnapshot] = useState<StateMachineSnapshot>(() =>
    stateMachineRef.current.getSnapshot()
  );

  useEffect(() => {
    const unsub = stateMachineRef.current.subscribe((snap) => {
      setSnapshot(snap);
    });
    return unsub;
  }, []);

  // Shortcuts for phase, step, form from state machine snapshot
  const { phase, step, form } = snapshot;

  // System Backend state
  const [backend, setBackend] = useState<SystemBackend>(() => getSystemBackend());
  const [isBackendInitialized, setIsBackendInitialized] = useState<boolean>(false);

  // Storage Disks State
  const [disks, setDisks] = useState<InstallerDisk[]>([]);
  const [loadingDisks, setLoadingDisks] = useState<boolean>(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Plan & Execution State
  const [planErrors, setPlanErrors] = useState<string[]>([]);
  const [planWarnings, setPlanWarnings] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installerStatus, setInstallerStatus] = useState<InstallerStatus | null>(null);
  const progressUnsubRef = useRef<(() => void) | null>(null);

  // Modals & Notices State
  const [showLoadDriverModal, setShowLoadDriverModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showFormatModal, setShowFormatModal] = useState<boolean>(false);
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [showSystemReqModal, setShowSystemReqModal] = useState<boolean>(false);
  const [repairMode, setRepairMode] = useState<boolean>(false);
  const [partitionNotice, setPartitionNotice] = useState<string | null>(null);
  const [userSetupError, setUserSetupError] = useState<string | null>(null);

  // Initialize System Backend once on mount
  useEffect(() => {
    let isMounted = true;
    initializeSystemBackend().then((sysBackend) => {
      if (isMounted) {
        setBackend(sysBackend);
        setIsBackendInitialized(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Storage Disks
  const refreshDisks = async () => {
    setLoadingDisks(true);
    try {
      const res = await backend.getInstallerDisks();
      if (res && res.disks) {
        setDisks(res.disks);
        const eligible =
          res.eligibleDisks && res.eligibleDisks.length > 0
            ? res.eligibleDisks
            : res.disks.filter((d) => !d.isLiveMedia && !d.protected);

        if (eligible.length > 0 && !form.selectedDiskDevice) {
          stateMachineRef.current.dispatch({
            type: 'SELECT_DISK',
            payload: { selectedDiskDevice: eligible[0].device }
          });
          setSelectedRowId(eligible[0].device);
        }
      }
    } catch (err: any) {
      console.warn('[Installer] Disk scan failed:', err);
    } finally {
      setLoadingDisks(false);
    }
  };

  useEffect(() => {
    if (isBackendInitialized) {
      refreshDisks();
    }
  }, [isBackendInitialized]);

  // Selected Disk Object
  const selectedDisk = useMemo(() => {
    return disks.find((d) => d.device === form.selectedDiskDevice) || null;
  }, [disks, form.selectedDiskDevice]);

  // Build Partition Plan
  const buildPlan = async (): Promise<boolean> => {
    if (!form.selectedDiskDevice) return false;
    const uCfg: Partial<UserConfig> = {
      username: form.username,
      fullName: form.fullName,
      password: form.password,
      deviceName: form.deviceName,
      requirePassword: true
    };
    const lCfg: Partial<LocaleConfig> = {
      language: form.language,
      keyboard: form.keyboard,
      timezone: form.timezone
    };

    const res = await backend.generateInstallerPlan(
      form.selectedDiskDevice,
      'erase_disk',
      uCfg,
      lCfg
    );

    if (res.plan && res.plan.partitions && res.plan.partitions.length > 0) {
      stateMachineRef.current.dispatch({
        type: 'GENERATE_PLAN',
        payload: {
          plan: res.plan,
          authToken: res.authToken || 'mock-auth-token-12345'
        }
      });
      setPlanErrors(res.errors || []);
      setPlanWarnings(res.warnings || []);
      return true;
    } else {
      stateMachineRef.current.dispatch({
        type: 'UPDATE_USER',
        payload: { plan: null }
      });
      setPlanErrors(
        res.errors && res.errors.length > 0
          ? res.errors
          : ['Failed to generate partition table for target disk.']
      );
      setPlanWarnings(res.warnings || []);
      return false;
    }
  };

  // Clean up progress subscription on unmount
  useEffect(() => {
    return () => {
      if (progressUnsubRef.current) {
        progressUnsubRef.current();
        progressUnsubRef.current = null;
      }
    };
  }, []);

  // Execution Order
  const handleStartInstallation = async () => {
    setIsExecuting(true);
    setInstallError(null);

    let targetPlan = form.plan;
    if (!targetPlan && form.selectedDiskDevice) {
      const uCfg: Partial<UserConfig> = {
        username: form.username,
        fullName: form.fullName,
        password: form.password,
        deviceName: form.deviceName,
        requirePassword: true
      };
      const lCfg: Partial<LocaleConfig> = {
        language: form.language,
        keyboard: form.keyboard,
        timezone: form.timezone
      };
      const planRes = await backend.generateInstallerPlan(
        form.selectedDiskDevice,
        'erase_disk',
        uCfg,
        lCfg
      );
      if (planRes.plan) {
        targetPlan = planRes.plan;
        stateMachineRef.current.dispatch({
          type: 'GENERATE_PLAN',
          payload: { plan: targetPlan }
        });
      }
    }

    if (!targetPlan) {
      setIsExecuting(false);
      setInstallError('Please select a valid target disk first.');
      return;
    }

    // Validate Plan
    const valRes = await backend.validateInstallerPlan(targetPlan);
    if (!valRes.valid) {
      setIsExecuting(false);
      setInstallError(valRes.errors?.[0] || 'Target partition plan is invalid.');
      return;
    }

    // Authorize Plan
    const authRes = await backend.authorizeInstallerPlan(targetPlan);
    if (!authRes.success || !authRes.authToken || authRes.authToken.trim() === '') {
      setIsExecuting(false);
      setInstallError(
        (authRes.errors && authRes.errors[0]) || 'Authorization failed. Valid authorization token is required.'
      );
      return;
    }

    const validToken = authRes.authToken;
    stateMachineRef.current.dispatch({
      type: 'AUTHORIZE_PLAN',
      payload: { authToken: validToken }
    });

    // Execute Plan - ONLY call execute after authorization succeeds with non-empty token
    const execRes = await backend.executeInstallerPlan(targetPlan, validToken);
    if (!execRes.success) {
      setIsExecuting(false);
      setInstallError(execRes.error || 'Installation execution failed.');
      return;
    }

    // Transition state machine to installing step
    stateMachineRef.current.dispatch({ type: 'START_INSTALLATION' });

    // Subscribe to progress lifecycle
    if (progressUnsubRef.current) progressUnsubRef.current();
    progressUnsubRef.current = backend.subscribeInstallerProgress((status) => {
      setInstallerStatus(status);
      stateMachineRef.current.dispatch({
        type: 'UPDATE_INSTALL_PROGRESS',
        payload: { status }
      });

      if (
        status.progress >= 100 ||
        status.stage === 'completed' ||
        status.status === 'completed'
      ) {
        setIsExecuting(false);
        stateMachineRef.current.dispatch({ type: 'INSTALLATION_COMPLETE' });
        InstallerSessionStore.markInstallationCompleted({
          targetDisk: form.selectedDiskDevice,
          userConfig: {
            username: form.username,
            fullName: form.fullName,
            deviceName: form.deviceName
          }
        });
        if (progressUnsubRef.current) {
          progressUnsubRef.current();
          progressUnsubRef.current = null;
        }
      } else if (status.status === 'failed') {
        setIsExecuting(false);
        setInstallError(status.error || 'Installation process failed.');
        stateMachineRef.current.dispatch({ type: 'START_INSTALLER' });
        if (progressUnsubRef.current) {
          progressUnsubRef.current();
          progressUnsubRef.current = null;
        }
      }
    });
  };

  // Power Actions
  const handlePowerAction = async (action: 'restart' | 'shutdown') => {
    await backend.executePowerAction(action);
    if (action === 'restart') {
      stateMachineRef.current.dispatch({ type: 'RESTART_COMPLETED' });
    } else {
      if (onClose) onClose();
    }
  };

  // User Setup Step
  const handleUserSetupNext = async () => {
    setUserSetupError(null);
    const trimmedUser = form.username.trim();

    if (!trimmedUser) {
      setUserSetupError('Please enter a username.');
      return;
    }

    const usernameRegex = /^[a-z_][a-z0-9_-]*$/;
    if (!usernameRegex.test(trimmedUser)) {
      setUserSetupError(
        'Username must start with a lowercase letter or underscore and contain only lowercase letters, numbers, hyphens, or underscores.'
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setUserSetupError('Passwords do not match. Please verify your entries.');
      return;
    }

    const createRes = await backend.createUser({
      username: trimmedUser,
      fullName: form.fullName || trimmedUser,
      password: form.password,
      isAdmin: true
    });

    if (!createRes.success) {
      setUserSetupError(createRes.error || 'Failed to create user account.');
      return;
    }

    const oobeRes = await backend.completeOobe({
      username: trimmedUser,
      password: form.password,
      fullName: form.fullName || trimmedUser,
      deviceName: form.deviceName || 'Windroid-PC',
      timezone: form.timezone,
      keyboard: form.keyboard,
      language: form.language
    });

    if (!oobeRes.success) {
      setUserSetupError(oobeRes.error || 'Failed to persist user configuration in native system.');
      return;
    }

    const userDispatched = stateMachineRef.current.dispatch({
      type: 'CREATE_USER',
      payload: {
        username: trimmedUser,
        fullName: form.fullName || trimmedUser,
        password: form.password
      }
    });

    if (userDispatched) {
      stateMachineRef.current.dispatch({ type: 'GO_NEXT' });
    }
  };

  // Personalization Step
  const handlePersonalizationNext = async () => {
    await backend.setTimezone(form.timezone);
    await backend.setKeyboardLayout(form.keyboard);
    stateMachineRef.current.dispatch({ type: 'GO_NEXT' });
  };

  // Auto-advance OOBE Finalizing step
  useEffect(() => {
    if (phase === 'oobe' && step === 'finalizing') {
      const timer = setTimeout(() => {
        stateMachineRef.current.dispatch({ type: 'FINALIZE_OOBE' });
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [phase, step]);

  // Complete OOBE and enter desktop
  useEffect(() => {
    if (phase === 'oobe' && step === 'desktop') {
      InstallerSessionStore.markOobeCompleted();
      try {
        if (typeof setRuntimeMode === 'function') {
          setRuntimeMode('installed');
        }
      } catch (_) {}
      if (onClose) onClose();
    }
  }, [phase, step, setRuntimeMode, onClose]);

  // Disk Table Formatting Helper
  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  // Compute Disk Table Rows
  const getDiskTableRows = () => {
    const rows: Array<{
      id: string;
      diskDevice: string;
      name: string;
      totalSize: string;
      freeSpace: string;
      type: string;
      drive: string;
      mediaType: string;
      status: string;
      isDisabled: boolean;
    }> = [];

    disks.forEach((disk) => {
      const isDiskDisabled = disk.isLiveMedia || disk.protected || disk.readOnly;
      rows.push({
        id: disk.device,
        diskDevice: disk.device,
        name: `Drive ${disk.device.replace('/dev/', '')} Unallocated Space`,
        totalSize: formatSize(disk.sizeBytes),
        freeSpace: formatSize(disk.sizeBytes),
        type: 'System',
        drive: disk.device,
        mediaType: disk.transport === 'usb' ? 'USB' : 'NVMe/SATA',
        status: isDiskDisabled ? 'Live Media (Protected)' : 'Online',
        isDisabled: isDiskDisabled
      });

      if (disk.partitions) {
        disk.partitions.forEach((part) => {
          rows.push({
            id: part.device,
            diskDevice: disk.device,
            name: `  Partition ${part.number} (${part.label || part.filesystem})`,
            totalSize: formatSize(part.sizeBytes),
            freeSpace: formatSize(part.sizeBytes * 0.8),
            type: part.mountPoint === '/boot/efi' ? 'System' : 'Primary',
            drive: disk.device,
            mediaType: disk.transport === 'usb' ? 'USB' : 'NVMe/SATA',
            status: isDiskDisabled ? 'Protected' : 'Primary',
            isDisabled: isDiskDisabled
          });
        });
      }
    });

    return rows;
  };

  // Close Handler
  const handleCloseClick = () => {
    if (actualContext === 'boot') {
      setShowExitConfirmModal(true);
    } else if (onClose) {
      onClose();
    }
  };

  // =========================================================================
  // RENDER: PHASE 1 STEP 4 — FULL-SCREEN BLUE INSTALLATION MODE
  // =========================================================================
  if (phase === 'installation' && step === 'installing') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#0067C0] via-[#005AA3] to-[#00427A] text-white flex flex-col items-center justify-center p-8 select-none font-sans antialiased animate-in fade-in duration-300">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <AppLauncherIcon className="w-8 h-8 absolute drop-shadow-md" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-tight text-white">Installing Windroid OS</h1>
            <p className="text-sm text-blue-100/90 font-normal leading-relaxed">
              {installerStatus?.stageDescription || 'Preparing target disk layout and copying system files...'}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="w-full bg-black/20 rounded-full h-3 p-0.5 border border-white/20 overflow-hidden shadow-inner">
              <div
                className="bg-white h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.max(installerStatus?.progress || 5, 5)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs font-mono text-blue-100">
              <span className="uppercase tracking-wider">{installerStatus?.stage || 'Installing'}</span>
              <span className="font-bold text-sm">{installerStatus?.progress || 0}%</span>
            </div>
          </div>

          <p className="text-xs text-blue-200/80 leading-relaxed pt-6">
            Your PC will restart automatically when installation is complete. Please don’t turn off your device.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: STANDARD CARD INSTALLER (Phase 1 & Phase 2 OOBE screens)
  // =========================================================================
  return (
    <div className={`relative w-full ${actualContext === 'boot' ? 'h-screen' : 'h-full'} min-h-full bg-[#EAF1F8] text-slate-800 flex flex-col items-center p-4 sm:p-6 select-none overflow-y-auto font-sans antialiased`}>
      {/* Centered Installer Card Window */}
      <div
        className={`relative z-10 w-full ${
          (phase === 'installation' && (step === 'target-disk' || step === 'ready')) ||
          (phase === 'oobe' && (step === 'user' || step === 'region'))
            ? 'max-w-[740px]'
            : 'max-w-[620px]'
        } my-auto bg-white rounded-2xl border border-slate-200/90 shadow-[0_20px_60px_rgba(0,103,192,0.12),0_10px_30px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden transition-all shrink-0`}
      >
        {/* Title Bar Header */}
        <div className="h-10 px-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <AppLauncherIcon className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium text-slate-700">
              {phase === 'oobe' ? 'Windroid OS Setup' : 'Windroid OS Setup'}
            </span>
            {disks.some(d => d.isMock) && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-100 text-amber-800 rounded border border-amber-200" title="Running in Browser Development Mode with virtual hardware">
                Browser Preview
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Maximize"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            {(onClose || actualContext === 'boot') && (
              <button
                type="button"
                onClick={handleCloseClick}
                disabled={isExecuting}
                className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                title={actualContext === 'boot' ? 'Exit Setup' : 'Close Setup'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* ========================================================================= */}
          {/* PHASE 1 - STEP 1: LANGUAGE / TIME / KEYBOARD                             */}
          {/* ========================================================================= */}
          {phase === 'installation' && step === 'language' && (
            <div className="flex-1 flex flex-col justify-between p-8 sm:p-10 text-center animate-in fade-in duration-200">
              <div className="my-auto space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                    <AppLauncherIcon className="w-full h-full drop-shadow-md" />
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0067C0] tracking-tight">
                    Windroid OS
                  </h1>
                </div>

                <div className="w-full max-w-md mx-auto space-y-3.5 pt-2 text-xs text-slate-700 text-left">
                  {/* Language Selection */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                    <label className="sm:w-48 text-left text-slate-700 font-medium shrink-0">
                      Language to install:
                    </label>
                    <div className="relative flex-1 w-full">
                      <select
                        value={form.language}
                        onChange={(e) =>
                          stateMachineRef.current.dispatch({
                            type: 'SELECT_LANGUAGE',
                            payload: { language: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] rounded-md px-3 py-1.5 pr-8 text-xs text-slate-800 shadow-2xs cursor-pointer appearance-none outline-none transition-all"
                      >
                        <option value="en_US.UTF-8">English (United States)</option>
                        <option value="en_GB.UTF-8">English (United Kingdom)</option>
                        <option value="es_ES.UTF-8">Español (España)</option>
                        <option value="fr_FR.UTF-8">Français (France)</option>
                        <option value="de_DE.UTF-8">Deutsch (Deutschland)</option>
                        <option value="zh_CN.UTF-8">中文 (简体)</option>
                        <option value="ja_JP.UTF-8">日本語</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Keyboard Layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                    <label className="sm:w-48 text-left text-slate-700 font-medium shrink-0">
                      Keyboard and input method:
                    </label>
                    <div className="relative flex-1 w-full">
                      <select
                        value={form.keyboard}
                        onChange={(e) =>
                          stateMachineRef.current.dispatch({
                            type: 'SELECT_KEYBOARD',
                            payload: { keyboard: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] rounded-md px-3 py-1.5 pr-8 text-xs text-slate-800 shadow-2xs cursor-pointer appearance-none outline-none transition-all"
                      >
                        <option value="us">US</option>
                        <option value="gb">United Kingdom</option>
                        <option value="de">German (QWERTZ)</option>
                        <option value="fr">French (AZERTY)</option>
                        <option value="es">Spanish</option>
                        <option value="jp">Japanese</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-6 border-t border-slate-200 mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRepairMode(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0067C0] hover:text-[#005299] hover:underline transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#0067C0]" />
                  <span>Repair your device</span>
                </button>

                <button
                  type="button"
                  onClick={() => stateMachineRef.current.dispatch({ type: 'GO_NEXT' })}
                  className="px-6 py-2 bg-[#0067C0] hover:bg-[#005299] active:bg-[#00427A] text-white text-xs font-medium rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  Install now
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 1 - STEP 2: TARGET DISK SELECTION                                   */}
          {/* ========================================================================= */}
          {phase === 'installation' && step === 'target-disk' && (
            <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-[22px] sm:text-2xl font-normal text-[#0067C0] tracking-tight mb-4 select-none">
                  Select location to install Windroid OS
                </h2>

                {/* Toolbar Actions */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-2 text-xs text-slate-700 select-none">
                  <button
                    type="button"
                    onClick={refreshDisks}
                    disabled={loadingDisks}
                    className="inline-flex items-center gap-1.5 text-[#0067C0] hover:text-[#005299] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#0067C0] ${loadingDisks ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLoadDriverModal(true)}
                    className="inline-flex items-center gap-1.5 text-[#0067C0] hover:text-[#005299] hover:underline cursor-pointer"
                  >
                    <Disc className="w-3.5 h-3.5 text-[#0067C0]" />
                    <span>Load Driver</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedRowId) {
                        setPartitionNotice('Please select a partition first.');
                        return;
                      }
                      setShowDeleteModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-[#0067C0] hover:text-[#005299] hover:underline cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-red-500 stroke-[2.5]" />
                    <span>Delete Partition</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedRowId) {
                        setPartitionNotice('Please select a partition first.');
                        return;
                      }
                      setShowFormatModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-[#0067C0] hover:text-[#005299] hover:underline cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-[#0067C0]" />
                    <span>Format Partition</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedRowId) {
                        setPartitionNotice('Please select a partition first.');
                        return;
                      }
                      setShowExtendModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-[#0067C0] hover:text-[#005299] hover:underline cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#0067C0]" />
                    <span>Extend Partition</span>
                  </button>
                </div>

                {partitionNotice && (
                  <div className="my-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                    <span>{partitionNotice}</span>
                    <button
                      type="button"
                      onClick={() => setPartitionNotice(null)}
                      className="text-amber-800 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Disk Table */}
                <div className="w-full bg-white border border-slate-300 rounded-sm overflow-x-auto my-3 shadow-2xs">
                  <table className="w-full text-left border-collapse select-none text-xs min-w-[620px]">
                    <thead>
                      <tr className="bg-white border-b border-slate-300 text-[11px] font-normal text-slate-800">
                        <th className="py-2 px-3 font-normal border-r border-slate-200/80">Name</th>
                        <th className="py-2 px-3 font-normal border-r border-slate-200/80">Total Size</th>
                        <th className="py-2 px-3 font-normal border-r border-slate-200/80">Free Space</th>
                        <th className="py-2 px-3 font-normal border-r border-slate-200/80">Type</th>
                        <th className="py-2 px-3 font-normal border-r border-slate-200/80">Drive</th>
                        <th className="py-2 px-3 font-normal border-r border-slate-200/80">Media Type</th>
                        <th className="py-2 px-3 font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingDisks ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#0067C0] mb-2" />
                            Searching for storage drives...
                          </td>
                        </tr>
                      ) : getDiskTableRows().length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                            No storage drives detected. Click{' '}
                            <span
                              className="text-[#0067C0] underline cursor-pointer"
                              onClick={refreshDisks}
                            >
                              Refresh
                            </span>{' '}
                            to scan again.
                          </td>
                        </tr>
                      ) : (
                        getDiskTableRows().map((row) => {
                          const isSelected =
                            selectedRowId === row.id ||
                            (form.selectedDiskDevice === row.diskDevice && !selectedRowId);

                          return (
                            <tr
                              key={row.id}
                              onClick={() => {
                                if (!row.isDisabled) {
                                  setSelectedRowId(row.id);
                                  stateMachineRef.current.dispatch({
                                    type: 'SELECT_DISK',
                                    payload: { selectedDiskDevice: row.diskDevice }
                                  });
                                }
                              }}
                              className={`transition-colors border-b border-slate-200/60 ${
                                row.isDisabled
                                  ? 'bg-slate-50/70 text-slate-400 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#0067C0] text-white font-medium'
                                  : 'bg-white text-slate-800 hover:bg-slate-50 cursor-pointer'
                              }`}
                            >
                              <td className="py-2 px-3 flex items-center gap-2">
                                <HardDrive
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSelected
                                      ? 'text-white'
                                      : row.isDisabled
                                      ? 'text-slate-400'
                                      : 'text-slate-600'
                                  }`}
                                />
                                <span className="truncate max-w-[210px]">{row.name}</span>
                              </td>
                              <td className="py-2 px-3">{row.totalSize}</td>
                              <td className="py-2 px-3">{row.freeSpace}</td>
                              <td className="py-2 px-3">{row.type}</td>
                              <td className="py-2 px-3">{row.drive}</td>
                              <td className="py-2 px-3">{row.mediaType}</td>
                              <td className="py-2 px-3">{row.status}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="pt-5 border-t border-slate-200 flex items-center justify-between select-none">
                <button
                  type="button"
                  onClick={() => stateMachineRef.current.dispatch({ type: 'GO_BACK' })}
                  className="px-6 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !form.selectedDiskDevice ||
                      selectedDisk?.isLiveMedia ||
                      selectedDisk?.protected
                    ) {
                      return;
                    }
                    const ok = await buildPlan();
                    if (ok) {
                      stateMachineRef.current.dispatch({ type: 'GO_NEXT' });
                    }
                  }}
                  disabled={
                    !form.selectedDiskDevice ||
                    selectedDisk?.isLiveMedia ||
                    selectedDisk?.protected
                  }
                  className={`px-8 py-1.5 border border-[#0067C0] text-xs font-medium rounded-md transition-all cursor-pointer ${
                    form.selectedDiskDevice &&
                    !selectedDisk?.isLiveMedia &&
                    !selectedDisk?.protected
                      ? 'bg-white text-[#0067C0] hover:bg-[#0067C0] hover:text-white active:bg-[#005299] shadow-2xs'
                      : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 1 - STEP 3: READY TO INSTALL                                        */}
          {/* ========================================================================= */}
          {phase === 'installation' && step === 'ready' && (
            <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 animate-in fade-in duration-200 select-none">
              <div className="space-y-4">
                <h2 className="text-[22px] sm:text-2xl font-normal text-[#0067C0] tracking-tight mb-2">
                  Ready to install
                </h2>

                <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed">
                  You won’t be able to use your PC during installation. Save and close your files before you begin.
                </p>

                <div className="space-y-3 pt-2">
                  <p className="text-xs sm:text-[13px] text-slate-800">To recap, you’ve chosen to:</p>

                  <div className="space-y-2.5 pl-0.5">
                    <div className="flex items-center gap-3 text-xs sm:text-[13px] text-slate-900 font-medium">
                      <Check className="w-4 h-4 text-slate-900 stroke-[2.5] shrink-0" />
                      <span>Install Windroid OS on {form.selectedDiskDevice}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs sm:text-[13px] text-slate-900 font-medium">
                      <Check className="w-4 h-4 text-slate-900 stroke-[2.5] shrink-0" />
                      <span>Keep nothing (Erase target drive)</span>
                    </div>
                  </div>
                </div>

                {installError && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Installation Error</span>
                    </div>
                    <p>{installError}</p>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed max-w-xl">
                    Note: Certain apps and features may have additional requirements above the Windroid OS minimum system requirements.
                  </p>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowSystemReqModal(true)}
                      className="text-xs text-[#0067C0] hover:underline cursor-pointer font-normal"
                    >
                      Check device specifications
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="pt-5 border-t border-slate-200 flex items-center justify-between select-none">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">Windroid OS Setup</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => stateMachineRef.current.dispatch({ type: 'GO_BACK' })}
                    disabled={isExecuting}
                    className="px-6 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleStartInstallation}
                    disabled={isExecuting}
                    className="px-7 py-1.5 bg-[#0067C0] hover:bg-[#005299] active:bg-[#004080] text-white text-xs font-medium rounded-md transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                  >
                    {isExecuting ? 'Starting...' : 'Install'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 1 - STEP 5: INSTALLATION COMPLETE                                   */}
          {/* ========================================================================= */}
          {phase === 'installation' && step === 'complete' && (
            <div className="p-8 text-center space-y-8 animate-in fade-in duration-300 my-auto">
              <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Installation Complete
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Windroid OS has been successfully installed on your computer. Please remove or unmount the installation media (ISO/USB) before rebooting so your system boots directly into your new Windroid OS.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => handlePowerAction('restart')}
                  className="w-full py-3 px-6 bg-[#0067C0] hover:bg-[#005299] text-white font-medium text-xs rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restart Now</span>
                </button>

                {actualContext === 'boot' ? (
                  <button
                    type="button"
                    onClick={() => handlePowerAction('shutdown')}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl cursor-pointer border border-slate-300"
                  >
                    <span>Shut Down</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl cursor-pointer border border-slate-300"
                  >
                    <span>Continue Session</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2 (OOBE) - STEP 1: REGION / COUNTRY SELECTION                       */}
          {/* ========================================================================= */}
          {phase === 'oobe' && step === 'region' && (
            <div className="flex-1 flex flex-col sm:flex-row justify-between p-6 sm:p-8 animate-in fade-in duration-200 select-none relative min-h-[420px]">
              {/* Globe Illustration */}
              <div className="w-full sm:w-[42%] flex items-center justify-center p-4 sm:p-6 shrink-0">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
                  <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
                    <defs>
                      <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0067C0" />
                        <stop offset="50%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                    </defs>
                    <circle cx="80" cy="80" r="60" fill="url(#globeGrad)" />
                    <path
                      d="M 50,50 Q 65,40 75,55 T 90,70 Q 70,85 55,75 Z M 95,90 Q 110,80 120,95 T 105,120 Q 85,110 95,90 Z M 40,85 Q 55,95 45,110 T 35,95 Z"
                      fill="#A5B4FC"
                      opacity="0.35"
                    />
                    <ellipse cx="80" cy="80" rx="60" ry="24" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
                    <ellipse cx="80" cy="80" rx="24" ry="60" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
                    <g transform="translate(75, 45) rotate(-10)">
                      <polygon points="0,30 50,0 22,32" fill="#FFFFFF" />
                      <polygon points="0,30 50,0 12,24" fill="#E2E8F0" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Country Selection List */}
              <div className="w-full sm:w-[58%] flex flex-col justify-between pl-0 sm:pl-4 pt-4 sm:pt-0">
                <div>
                  <h2 className="text-xl sm:text-[22px] font-normal text-slate-900 tracking-tight mb-4">
                    Is this the right country or region?
                  </h2>

                  <div className="w-full max-h-[260px] overflow-y-auto pr-1 space-y-1 text-slate-800 font-normal text-xs sm:text-[13px] border-y sm:border-y-0 border-slate-100 py-2 sm:py-0">
                    {COUNTRIES_DATA.map((cItem) => {
                      const isSelected = form.countryId === cItem.id;
                      return (
                        <div
                          key={cItem.id}
                          onClick={() => {
                            stateMachineRef.current.dispatch({
                              type: 'SELECT_REGION',
                              payload: {
                                countryId: cItem.id,
                                timezone: cItem.timezone
                              }
                            });
                          }}
                          className={`px-4 py-2.5 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#0067C0] text-white font-normal shadow-2xs'
                              : 'text-slate-800 hover:bg-slate-100/90'
                          }`}
                        >
                          <span>{cItem.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => stateMachineRef.current.dispatch({ type: 'GO_NEXT' })}
                    className="px-8 py-1.5 bg-[#0067C0] hover:bg-[#005299] active:bg-[#004080] text-white text-xs font-medium rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2 (OOBE) - STEP 2: KEYBOARD SELECTION                               */}
          {/* ========================================================================= */}
          {phase === 'oobe' && step === 'keyboard' && (
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 animate-in fade-in duration-200">
              <div className="space-y-4">
                <h2 className="text-xl sm:text-[22px] font-normal text-slate-900 tracking-tight">
                  Is this the right keyboard layout or input method?
                </h2>
                <p className="text-xs text-slate-600">
                  If you use another keyboard layout, you can change it later in settings.
                </p>

                <div className="max-w-md space-y-2 pt-2">
                  {[
                    { id: 'us', label: 'US' },
                    { id: 'gb', label: 'United Kingdom' },
                    { id: 'de', label: 'German (QWERTZ)' },
                    { id: 'fr', label: 'French (AZERTY)' },
                    { id: 'es', label: 'Spanish' },
                    { id: 'jp', label: 'Japanese' }
                  ].map((kb) => (
                    <div
                      key={kb.id}
                      onClick={() =>
                        stateMachineRef.current.dispatch({
                          type: 'SELECT_KEYBOARD',
                          payload: { keyboard: kb.id }
                        })
                      }
                      className={`px-4 py-3 rounded-md cursor-pointer border text-xs font-medium transition-all ${
                        form.keyboard === kb.id
                          ? 'bg-[#0067C0] border-[#0067C0] text-white'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {kb.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => stateMachineRef.current.dispatch({ type: 'GO_BACK' })}
                  className="px-6 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => stateMachineRef.current.dispatch({ type: 'GO_NEXT' })}
                  className="px-8 py-1.5 bg-[#0067C0] hover:bg-[#005299] text-white text-xs font-medium rounded-md cursor-pointer shadow-2xs"
                >
                  Yes
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2 (OOBE) - STEP 3: CREATE USER                                       */}
          {/* ========================================================================= */}
          {phase === 'oobe' && step === 'user' && (
            <div className="flex-1 flex flex-col sm:flex-row justify-between p-6 sm:p-8 animate-in fade-in duration-200 select-none relative min-h-[440px]">
              {/* Left User Avatar Illustration */}
              <div className="w-full sm:w-[42%] flex items-center justify-center p-4 sm:p-6 shrink-0">
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#3B82F6] via-[#2563EB] to-[#9333EA] flex items-center justify-center relative overflow-hidden shadow-sm">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 absolute top-5 sm:top-6" />
                    <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-t-[50%] bg-white/80 absolute -bottom-1" />
                  </div>
                  <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EBF2FA] border-2 border-white flex items-center justify-center shadow-xs">
                    <Plus className="w-5 h-5 text-[#0067C0] stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* Right User Setup Form */}
              <div className="w-full sm:w-[58%] flex flex-col justify-between pl-0 sm:pl-4 pt-4 sm:pt-0">
                <div>
                  <h2 className="text-xl sm:text-[22px] font-normal text-[#0067C0] tracking-tight mb-1">
                    Create a user for Windroid OS
                  </h2>
                  <p className="text-xs sm:text-[13px] text-slate-800 mb-5">
                    You’ll use this account to sign in to your device.
                  </p>

                  <div className="space-y-3.5 max-w-sm pointer-events-auto">
                    {/* User name */}
                    <div>
                      <label className="block text-xs sm:text-[13px] text-slate-800 font-normal mb-1">
                        User name
                      </label>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => {
                          stateMachineRef.current.dispatch({
                            type: 'UPDATE_USER',
                            payload: { username: e.target.value }
                          });
                          if (userSetupError) setUserSetupError(null);
                        }}
                        placeholder="Enter your user name"
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] rounded-md px-3.5 py-1.5 text-xs sm:text-[13px] text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-400 cursor-text select-text pointer-events-auto relative z-10"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs sm:text-[13px] text-slate-800 font-normal mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={form.password || ''}
                        onChange={(e) => {
                          stateMachineRef.current.dispatch({
                            type: 'UPDATE_USER',
                            payload: { password: e.target.value }
                          });
                          if (userSetupError) setUserSetupError(null);
                        }}
                        placeholder="Enter your password"
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] rounded-md px-3.5 py-1.5 text-xs sm:text-[13px] text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-400 cursor-text select-text pointer-events-auto relative z-10"
                      />
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-xs sm:text-[13px] text-slate-800 font-normal mb-1">
                        Confirm password
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword || ''}
                        onChange={(e) => {
                          stateMachineRef.current.dispatch({
                            type: 'UPDATE_USER',
                            payload: { confirmPassword: e.target.value }
                          });
                          if (userSetupError) setUserSetupError(null);
                        }}
                        placeholder="Confirm your password"
                        className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] rounded-md px-3.5 py-1.5 text-xs sm:text-[13px] text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-400 cursor-text select-text pointer-events-auto relative z-10"
                      />
                    </div>
                  </div>

                  {userSetupError && (
                    <div className="mt-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-1.5 max-w-sm">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{userSetupError}</span>
                    </div>
                  )}
                </div>

                <div className="pt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => stateMachineRef.current.dispatch({ type: 'GO_BACK' })}
                    className="px-7 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleUserSetupNext}
                    className="px-7 py-1.5 bg-[#0067C0] hover:bg-[#005299] text-white text-xs font-medium rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2 (OOBE) - STEP 4: PERSONALIZATION & DEVICE NAME                     */}
          {/* ========================================================================= */}
          {phase === 'oobe' && step === 'personalization' && (
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 animate-in fade-in duration-200">
              <div className="space-y-4">
                <h2 className="text-xl sm:text-[22px] font-normal text-slate-900 tracking-tight">
                  Name your PC & Timezone
                </h2>
                <p className="text-xs text-slate-600">
                  Give your PC a name to identify it on your network.
                </p>

                <div className="max-w-sm space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Device Name</label>
                    <input
                      type="text"
                      value={form.deviceName}
                      onChange={(e) =>
                        stateMachineRef.current.dispatch({
                          type: 'UPDATE_PERSONALIZATION',
                          payload: { deviceName: e.target.value, timezone: form.timezone }
                        })
                      }
                      placeholder="e.g. Windroid-PC"
                      className="w-full bg-white border border-slate-300 rounded-md px-3.5 py-1.5 text-xs text-slate-800 focus:border-[#0067C0] outline-none select-text pointer-events-auto relative z-10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">System Timezone</label>
                    <select
                      value={form.timezone}
                      onChange={(e) =>
                        stateMachineRef.current.dispatch({
                          type: 'UPDATE_PERSONALIZATION',
                          payload: { deviceName: form.deviceName, timezone: e.target.value }
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:border-[#0067C0] outline-none cursor-pointer"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">America/New_York (Eastern)</option>
                      <option value="America/Chicago">America/Chicago (Central)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                      <option value="Europe/London">Europe/London (GMT/BST)</option>
                      <option value="Europe/Paris">Europe/Paris (CET)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => stateMachineRef.current.dispatch({ type: 'GO_BACK' })}
                  className="px-6 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePersonalizationNext}
                  className="px-8 py-1.5 bg-[#0067C0] hover:bg-[#005299] text-white text-xs font-medium rounded-md cursor-pointer shadow-2xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PHASE 2 (OOBE) - STEP 5: FINALIZING & PREPARING DESKTOP                  */}
          {/* ========================================================================= */}
          {phase === 'oobe' && step === 'finalizing' && (
            <div className="p-10 text-center space-y-6 animate-in fade-in duration-300 my-auto">
              <div className="flex justify-center">
                <div className="w-12 h-12 border-4 border-[#0067C0] border-t-transparent rounded-full animate-spin" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Setting things up</h2>
                <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                  Applying user preferences and preparing your desktop...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Driver Modal */}
      {showLoadDriverModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 text-left space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800">Load Driver</h3>
              <button
                type="button"
                onClick={() => setShowLoadDriverModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Insert the installation media containing the storage driver files and click Browse.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLoadDriverModal(false)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 cursor-pointer"
              >
                Browse
              </button>
              <button
                type="button"
                onClick={() => setShowLoadDriverModal(false)}
                className="px-4 py-1.5 bg-[#0067C0] text-white text-xs font-medium rounded hover:bg-[#005299] cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Partition Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 text-left space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800">Delete Partition</h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting partition <span className="font-mono font-medium text-slate-900">{selectedRowId}</span> will permanently convert it to unallocated space.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format Partition Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 text-left space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800">Format Partition</h3>
              <button
                type="button"
                onClick={() => setShowFormatModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Formatting partition <span className="font-mono font-medium text-slate-900">{selectedRowId}</span> will erase all existing files.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFormatModal(false)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowFormatModal(false)}
                className="px-4 py-1.5 bg-[#0067C0] text-white text-xs font-medium rounded hover:bg-[#005299] cursor-pointer"
              >
                Format
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Partition Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 text-left space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800">Extend Partition</h3>
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter size in MB to extend partition <span className="font-mono font-medium text-slate-900">{selectedRowId}</span>.
            </p>
            <input
              type="number"
              defaultValue={1024}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs focus:border-[#0067C0] outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowExtendModal(false)}
                className="px-4 py-1.5 bg-[#0067C0] text-white text-xs font-medium rounded hover:bg-[#005299] cursor-pointer"
              >
                Extend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Requirements Modal */}
      {showSystemReqModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white border border-slate-300 rounded-lg max-w-md w-full p-5 text-left space-y-4 shadow-xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-800">System Requirements</h3>
              <button
                type="button"
                onClick={() => setShowSystemReqModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p><strong className="text-slate-800">Processor:</strong> 64-bit dual-core 1.5 GHz or faster</p>
              <p><strong className="text-slate-800">RAM:</strong> 4 GB or higher</p>
              <p><strong className="text-slate-800">Storage:</strong> 32 GB unallocated disk space</p>
              <p><strong className="text-slate-800">Firmware:</strong> UEFI or Legacy BIOS</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSystemReqModal(false)}
                className="px-4 py-1.5 bg-[#0067C0] text-white text-xs font-medium rounded hover:bg-[#005299] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repair Diagnostics Modal */}
      {repairMode && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#12182B] border border-slate-800 rounded-3xl max-w-md w-full p-6 text-left space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">System Diagnostics</h3>
              </div>
              <button
                type="button"
                onClick={() => setRepairMode(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Launch rescue shell or reset configuration if system repair is needed.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setRepairMode(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Setup Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#12182B] border border-slate-800 rounded-3xl max-w-md w-full p-6 text-left space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Exit Windroid Setup?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Exiting setup will power off or restart your PC.</p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePowerAction('shutdown')}
                className="w-full sm:w-auto px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 font-semibold text-xs rounded-xl cursor-pointer border border-red-500/30"
              >
                Power Off
              </button>
              <button
                type="button"
                onClick={() => handlePowerAction('restart')}
                className="w-full sm:w-auto px-4 py-2 bg-[#0067C0] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-lg shadow-blue-600/30"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InstallWindroidScreen: React.FC<InstallWindroidScreenProps> = (props) => (
  <InstallerErrorBoundary onClose={props.onClose}>
    <InstallWindroidContent {...props} />
  </InstallerErrorBoundary>
);
