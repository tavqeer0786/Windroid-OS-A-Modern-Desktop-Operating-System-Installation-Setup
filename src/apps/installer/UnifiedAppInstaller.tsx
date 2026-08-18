import React, { useState, useEffect } from 'react';
import { PackageInspection, CompatibilityResult, InstallProgress } from '../../system/runtime/AppRuntimeProvider';
import { PackageDetectionResult } from '../../system/runtime/PackageDetectionService';
import { AppRuntimeService } from '../../system/runtime/AppRuntimeService';
import { useOS } from '../../context/OSContext';
import {
  InstallerController,
  InstallerSessionStore,
  selectStepIndex,
  InstallerStep,
  InstallationSession,
  InstallerProviderRegistry,
  InstalledApplicationRegistry,
} from '../../system/installer';
import {
  Download,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  Pause,
  Info,
  Folder,
  Globe,
  Check,
  ChevronRight,
  ChevronLeft,
  Mic,
  Camera,
  MapPin,
  Bell,
  Bluetooth,
  Clipboard,
  ChevronDown,
  AppWindow,
  LayoutGrid,
  CornerUpRight,
  FolderPlus,
  Tag,
  Cpu,
  HardDrive,
  Package,
  FileText
} from 'lucide-react';

interface UnifiedAppInstallerProps {
  packagePath?: string;
  onClose?: () => void;
}

const GoogleChromeLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="48" fill="#1A73E8" />
    <path d="M50 2 C 72 2, 90 16, 96 36 L 50 50 Z" fill="#EA4335" />
    <path d="M50 2 C 28 2, 10 16, 4 36 L 50 50 Z" fill="#EA4335" />
    <path d="M4 36 C -2 55, 4 75, 18 89 L 50 50 Z" fill="#34A853" />
    <path d="M18 89 C 32 101, 52 102, 68 94 L 50 50 Z" fill="#FBBC05" />
    <path d="M68 94 C 85 86, 96 69, 97 50 L 50 50 Z" fill="#FBBC05" />
    <path d="M97 50 C 98 44, 97 39, 95 34 L 50 50 Z" fill="#EA4335" />
    <circle cx="50" cy="50" r="22" fill="#FFFFFF" />
    <circle cx="50" cy="50" r="17" fill="#1A73E8" />
  </svg>
);

const WinBridgeLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <div className={`${className} shrink-0 flex items-center justify-center`}>
    <div className="grid grid-cols-2 gap-0.5 w-6 h-6">
      <div className="bg-[#0067C0] rounded-[1px]" />
      <div className="bg-[#0067C0] rounded-[1px]" />
      <div className="bg-[#0067C0] rounded-[1px]" />
      <div className="bg-[#0067C0] rounded-[1px]" />
    </div>
  </div>
);

const DroidBridgeLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <div className={`${className} shrink-0 flex items-center justify-center bg-emerald-500/10 rounded-lg text-emerald-600 font-bold text-xs`}>
    droid
  </div>
);

const FlatpakLogo: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <div className={`${className} shrink-0 flex items-center justify-center bg-sky-500/10 rounded-lg text-sky-600 font-bold text-xs`}>
    flatpak
  </div>
);

export const UnifiedAppInstaller: React.FC<UnifiedAppInstallerProps> = ({
  packagePath = '/drive_c/c_users/u_alex/Downloads/GoogleChrome_Setup.exe',
  onClose
}) => {
  const { addNotification } = useOS();

  // Primary state - Defaulting to active session step or Step 1
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(() => {
    const active = InstallerSessionStore.getInstance().getActiveSession();
    return (active ? selectStepIndex(active.currentStep) : 1) as 1 | 2 | 3 | 4 | 5 | 6;
  });
  const [loading, setLoading] = useState(true);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const [detection, setDetection] = useState<PackageDetectionResult | null>(null);
  const [inspection, setInspection] = useState<PackageInspection | null>(null);
  const [, setCompatibility] = useState<CompatibilityResult | null>(null);

  // Step 2: Optional permissions state
  const [optPerms, setOptPerms] = useState({
    microphone: true,
    camera: false,
    location: false,
    notifications: true,
    bluetooth: false,
    clipboard: true
  });
  const [showMoreOptional, setShowMoreOptional] = useState(false);

  // Step 3: Installation location & options state
  const [destType, setDestType] = useState<'default' | 'custom'>('default');
  const [customFolderPath, setCustomFolderPath] = useState('/WindroidOS/Applications');
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // Installation options checkboxes
  const [optDesktopShortcut, setOptDesktopShortcut] = useState(true);
  const [optPinToDock, setOptPinToDock] = useState(true);
  const [optAddToMenu, setOptAddToMenu] = useState(true);
  const [optLaunchAfter, setOptLaunchAfter] = useState(false);

  // Installation execution state
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState<InstallProgress>({ step: 'Installing files...', percent: 45, status: 'in_progress' });
  const [installedAppId, setInstalledAppId] = useState<string | null>(null);

  // Step 5 specific state
  const [elapsedSeconds, setElapsedSeconds] = useState(18);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Live timer for Step 5
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (currentStep === 5) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [activeSession, setActiveSession] = useState<InstallationSession | null>(() =>
    InstallerSessionStore.getInstance().getActiveSession()
  );

  // Sync with central InstallerController session lifecycle
  useEffect(() => {
    const controller = InstallerController.getInstance();
    const store = InstallerSessionStore.getInstance();
    controller.startLocalPackageSession(packagePath, {
      options: {
        createDesktopShortcut: optDesktopShortcut,
        pinToDock: optPinToDock,
        addToApplicationsMenu: optAddToMenu,
        launchAfterInstall: optLaunchAfter,
      },
    });

    setActiveSession(store.getActiveSession());

    const unsubscribe = store.subscribe((event) => {
      const currentActive = store.getActiveSession();
      setActiveSession(currentActive);
      if (event.type === 'step-changed') {
        const stepIdx = selectStepIndex(event.step) as 1 | 2 | 3 | 4 | 5 | 6;
        setCurrentStep(stepIdx);
      } else if (event.type === 'execution-completed') {
        setInstallState('completed');
        setCurrentStep(6);
      } else if (event.type === 'execution-cancelled') {
        setInstallState('idle');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [packagePath]);

  const changeStep = (stepNum: 1 | 2 | 3 | 4 | 5 | 6) => {
    const stepMap: Record<number, InstallerStep> = {
      1: 'overview',
      2: 'permissions',
      3: 'location',
      4: 'review',
      5: 'installing',
      6: 'completed',
    };
    const step = stepMap[stepNum];
    setCurrentStep(stepNum);
    if (step) {
      InstallerController.getInstance().goToStep(step);
    }
  };

  // Load package metadata
  useEffect(() => {
    let isMounted = true;
    async function loadPackageInfo() {
      setLoading(true);
      setErrorReason(null);

      try {
        const service = AppRuntimeService.getInstance();
        const res = await service.inspectPackage(packagePath);

        if (!isMounted) return;

        setDetection(res.detection);

        if (!res.detection.supported) {
          setErrorReason(res.detection.reason || 'Unsupported package format.');
          setLoading(false);
          return;
        }

        if (res.inspection) {
          const isChrome = packagePath.toLowerCase().includes('chrome') || res.inspection.displayName.toLowerCase().includes('chrome');
          const enhancedInspection: PackageInspection = {
            ...res.inspection,
            displayName: isChrome ? 'Google Chrome' : res.inspection.displayName,
            publisher: isChrome ? 'Google LLC' : res.inspection.publisher,
            version: isChrome ? '120.0.6099.201' : res.inspection.version,
            estimatedSize: isChrome ? '~ 250 MB' : res.inspection.estimatedSize,
            permissions: res.inspection.permissions || ['Files & Storage', 'Internet', 'Microphone', 'Notifications']
          };

          setInspection(enhancedInspection);

          const comp = await service.checkCompatibility(enhancedInspection);
          if (isMounted) {
            setCompatibility(comp);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorReason(err.message || 'Failed to inspect package file.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPackageInfo();
    return () => {
      isMounted = false;
    };
  }, [packagePath]);

  const toggleOptional = (key: keyof typeof optPerms) => {
    setOptPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute active shortcuts text for preview
  const getShortcutsSummary = () => {
    const active: string[] = [];
    if (optDesktopShortcut) active.push('Desktop');
    if (optPinToDock) active.push('Dock');
    if (optAddToMenu) active.push('Start Menu');
    return active.length > 0 ? active.join(', ') : 'None';
  };

  const currentDestinationPath = destType === 'default' ? '/WindroidOS/Applications' : customFolderPath;

  // Handle Triggering Installation Execution Engine
  const handleStartInstall = async () => {
    const controller = InstallerController.getInstance();
    const canInstall = controller.canProceedToInstall();

    if (!canInstall) {
      addNotification({
        title: 'Installation Blocked',
        message: 'Please resolve blocking issues before continuing.',
        type: 'error'
      });
      return;
    }

    setCurrentStep(5);
    setElapsedSeconds(0);
    setInstallState('installing');

    const started = await controller.startInstallation();
    if (!started) {
      addNotification({
        title: 'Installation Start Failed',
        message: 'Could not start installation execution pipeline.',
        type: 'error'
      });
    }
  };

  const handleLaunchInstalled = () => {
    if (installedAppId) {
      AppRuntimeService.getInstance().launchApp(installedAppId);
      addNotification({
        title: 'Application Launched',
        message: `Launching ${inspection?.displayName || 'application'}...`,
        type: 'info'
      });
      if (onClose) onClose();
    }
  };

  const stepsList = [
    { number: 1, title: 'Package Overview' },
    { number: 2, title: 'Permissions' },
    { number: 3, title: 'Installation Location' },
    { number: 4, title: 'Review' },
    { number: 5, title: 'Installing' },
    { number: 6, title: 'Completed' }
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white dark:bg-slate-900 select-none">
        <div className="relative">
          <div className="w-12 h-12 border-3 border-[#0067C0] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Download className="w-5 h-5 text-[#0067C0] animate-pulse" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Inspecting Package Architecture...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Analyzing binaries, safety signatures, and runtime requirements
          </p>
        </div>
      </div>
    );
  }

  if (errorReason) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white dark:bg-slate-900 select-none">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 flex items-center justify-center text-rose-500 shadow-sm">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cannot Open Package</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{errorReason}</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          Close Window
        </button>
      </div>
    );
  }

  if (!inspection || !detection) return null;

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] dark:bg-slate-900 text-slate-800 dark:text-slate-200 select-none overflow-hidden">
      {/* Upper Main Body Container: Left Steps Sidebar + Right Content View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Steps Navigator */}
        <div className="w-64 bg-[#F8FAFC] dark:bg-slate-900/80 border-r border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            {/* Steps Progress Timeline */}
            <div className="space-y-1 pt-2">
              {stepsList.map((stepItem) => {
                const isActive = currentStep === stepItem.number;
                const isCompleted = currentStep > stepItem.number;
                const isClickable = !installState || installState === 'idle' || installState === 'completed';

                return (
                  <button
                    key={stepItem.number}
                    disabled={!isClickable || (stepItem.number > currentStep && installState !== 'completed')}
                    onClick={() => {
                      if (stepItem.number <= currentStep || installState === 'completed') {
                        setCurrentStep(stepItem.number as any);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-[#EBF3FC] dark:bg-blue-950/60'
                        : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                    } ${!isClickable && !isActive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Step Badge Circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        isCompleted
                          ? 'border-2 border-[#0067C0] bg-white text-[#0067C0]'
                          : isActive
                          ? 'bg-[#0067C0] text-white shadow-xs'
                          : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5 text-[#0067C0] stroke-[3]" /> : stepItem.number}
                    </div>

                    {/* Step Label */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-semibold leading-tight truncate ${
                          isActive
                            ? 'text-[#0067C0] font-bold dark:text-blue-400'
                            : isCompleted
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {stepItem.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Sidebar Footer */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-slate-400 text-xs px-1">
            <Shield className="w-4 h-4 shrink-0 text-slate-400 stroke-[1.8]" />
            <span className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              Your privacy and security are our top priority
            </span>
          </div>
        </div>

        {/* Right Main Content Canvas */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
          {/* STEP 1: PACKAGE OVERVIEW */}
          {currentStep === 1 && (
            <div className="p-8 space-y-6 flex-1 max-w-5xl">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Package Overview
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Review application info and system compatibility before proceeding.
                </p>
              </div>

              {/* Primary Package Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {activeSession?.packageInfo?.icon ? (
                      <img src={activeSession.packageInfo.icon} alt="" className="w-16 h-16 object-contain rounded-xl" />
                    ) : activeSession?.runtime === 'droidbridge' || activeSession?.packageKind === 'android-apk' ? (
                      <DroidBridgeLogo className="w-16 h-16" />
                    ) : activeSession?.runtime === 'native-flatpak' || activeSession?.packageKind === 'flatpak-bundle' || activeSession?.packageKind === 'flatpak-reference' ? (
                      <FlatpakLogo className="w-16 h-16" />
                    ) : inspection.displayName.toLowerCase().includes('chrome') ? (
                      <GoogleChromeLogo className="w-16 h-16" />
                    ) : (
                      <WinBridgeLogo />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {inspection.displayName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                          Verified
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {inspection.publisher}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                        {activeSession?.packageInfo?.displayName || (inspection as any)?.description || 'Application package for Windroid OS.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 min-w-[180px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Version</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{inspection.version}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Size</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{inspection.estimatedSize}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Runtime</span>
                      <span className="font-semibold text-[#0067C0]">
                        {activeSession?.runtime === 'droidbridge' || activeSession?.packageKind === 'android-apk'
                          ? 'DroidBridge'
                          : activeSession?.runtime === 'native-flatpak' || activeSession?.packageKind === 'flatpak-bundle' || activeSession?.packageKind === 'flatpak-reference'
                          ? 'Native Flatpak'
                          : 'WinBridge'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PERMISSIONS */}
          {currentStep === 2 && (() => {
            const pkgKind = activeSession?.packageKind || detection?.packageKind || 'unknown';

            let reqTitle = 'Required permissions';
            let optTitle = 'Optional permissions';
            let emptyLabel = 'No declared permissions were found for this package.';

            if (pkgKind === 'android-apk') {
              reqTitle = 'Required permissions';
              optTitle = 'Optional permissions';
              emptyLabel = 'No declared permissions were found for this package.';
            } else if (pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference') {
              reqTitle = 'Required sandbox access';
              optTitle = 'Optional sandbox access';
              emptyLabel = 'No declared permissions were found for this package.';
            } else if (pkgKind === 'windows-exe' || pkgKind === 'windows-msi') {
              reqTitle = 'Installation capabilities';
              optTitle = 'Additional capabilities';
              emptyLabel = 'No declared capabilities are available for this Windows installer.';
            }

            const requiredList = activeSession?.permissions.required || [];
            const optionalList = activeSession?.permissions.optional || [];
            const hasAnyPerms = requiredList.length > 0 || optionalList.length > 0;

            const renderIcon = (category?: string) => {
              switch (category) {
                case 'camera':
                  return <Camera className="w-5 h-5 stroke-[1.8]" />;
                case 'microphone':
                  return <Mic className="w-5 h-5 stroke-[1.8]" />;
                case 'files':
                  return <Folder className="w-5 h-5 stroke-[1.8]" />;
                case 'location':
                  return <MapPin className="w-5 h-5 stroke-[1.8]" />;
                case 'notifications':
                  return <Bell className="w-5 h-5 stroke-[1.8]" />;
                case 'network':
                  return <Globe className="w-5 h-5 stroke-[1.8]" />;
                case 'bluetooth':
                  return <Bluetooth className="w-5 h-5 stroke-[1.8]" />;
                case 'clipboard':
                  return <Clipboard className="w-5 h-5 stroke-[1.8]" />;
                case 'administrator':
                  return <AlertTriangle className="w-5 h-5 stroke-[1.8] text-red-500" />;
                default:
                  return <Shield className="w-5 h-5 stroke-[1.8]" />;
              }
            };

            return (
              <div className="p-8 space-y-6 flex-1 max-w-6xl w-full">
                {/* Header Title Section */}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Permissions
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                    Review what this application can access.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    You can change most permissions later from{' '}
                    <span className="text-[#0067C0] hover:underline cursor-pointer font-medium">
                      Settings → Privacy & Security.
                    </span>
                  </p>
                </div>

                {/* Application Information Row */}
                <div className="flex items-center gap-4 pt-1 pb-1">
                  {activeSession?.packageInfo?.icon ? (
                    <img
                      src={activeSession.packageInfo.icon}
                      alt=""
                      className="w-14 h-14 object-contain rounded-xl"
                    />
                  ) : (
                    <GoogleChromeLogo className="w-14 h-14" />
                  )}
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {activeSession?.packageInfo?.displayName || inspection?.displayName || 'Application'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {activeSession?.packageInfo?.publisher || inspection?.publisher || 'Unknown Publisher'}
                    </p>
                    {activeSession?.verification?.publisherVerified !== false && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0067C0] pt-0.5">
                        <div className="w-4 h-4 rounded-full bg-[#0067C0] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Verified Publisher</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column (Span 2) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Notice & Warnings */}
                    {pkgKind === 'android-apk' && (
                      <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Info className="w-4 h-4 shrink-0 text-blue-500" />
                        <span>Some Android permissions are requested by the app at runtime.</span>
                      </div>
                    )}

                    {(requiredList.some((p) => p.riskLevel === 'elevated') ||
                      optionalList.some((p) => p.riskLevel === 'elevated')) && (
                      <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>This package requests elevated administrator privileges during installation.</span>
                      </div>
                    )}

                    {!hasAnyPerms && (
                      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-8 text-center shadow-2xs">
                        <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {emptyLabel}
                        </div>
                      </div>
                    )}

                    {/* Required permissions */}
                    {requiredList.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {reqTitle}
                        </h3>
                        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-700/60">
                          {requiredList.map((perm) => (
                            <div key={perm.id} className="p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5">
                                <div className="text-[#0067C0] shrink-0">
                                  {renderIcon(perm.category)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-2">
                                    <span>{perm.title}</span>
                                    {perm.riskLevel === 'sensitive' && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/20">
                                        Sensitive
                                      </span>
                                    )}
                                    {perm.riskLevel === 'elevated' && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-700 dark:text-red-300 font-medium border border-red-500/20">
                                        Elevated
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {perm.description || 'Required application capability'}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-slate-400 shrink-0">Required</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optional permissions */}
                    {optionalList.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {optTitle}
                        </h3>
                        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-700/60">
                          {optionalList.map((perm) => (
                            <div key={perm.id} className="p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5">
                                <div className="text-slate-600 dark:text-slate-400 shrink-0">
                                  {renderIcon(perm.category)}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-2">
                                    <span>{perm.title}</span>
                                    {perm.riskLevel === 'sensitive' && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/20">
                                        Sensitive
                                      </span>
                                    )}
                                    {perm.riskLevel === 'elevated' && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-700 dark:text-red-300 font-medium border border-red-500/20">
                                        Elevated
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {perm.description || 'Optional application capability'}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={perm.enabled}
                                onClick={() =>
                                  InstallerController.getInstance().updatePermission(
                                    perm.id,
                                    !perm.enabled
                                  )
                                }
                                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                                  perm.enabled ? 'bg-[#0067C0]' : 'bg-[#CBD5E1] dark:bg-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                                    perm.enabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                {/* Right Panel Column */}
                <div className="space-y-4">
                  {/* Runtime Card */}
                  <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Runtime
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {pkgKind === 'android-apk' ? (
                          <DroidBridgeLogo />
                        ) : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference' ? (
                          <FlatpakLogo />
                        ) : (
                          <WinBridgeLogo />
                        )}
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                            {pkgKind === 'android-apk'
                              ? 'DroidBridge'
                              : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference'
                              ? 'Native Flatpak'
                              : 'WinBridge'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {pkgKind === 'android-apk'
                              ? 'Android Application'
                              : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference'
                              ? 'Linux Container App'
                              : 'Windows Application'}
                          </div>
                        </div>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 shrink-0">
                        <span>Compatible</span>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* Security Status Card */}
                  <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-3.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Security status
                    </h3>
                    <div className="space-y-3">
                      {/* Row 1 */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            Verified Publisher
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            The publisher of this application is verified.
                          </div>
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            Digital Signature
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            The digital signature is valid and trusted.
                          </div>
                        </div>
                      </div>

                      {/* Row 3 */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            Package Integrity
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            The package has not been tampered with.
                          </div>
                        </div>
                      </div>

                      {/* Row 4 */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            Malware Scan
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            No threats detected in this package.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Information Box */}
                  <div className="bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-800/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[#1E40AF] dark:text-blue-300 font-medium">
                    <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      You can change optional permissions anytime from Settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

          {/* STEP 3: INSTALLATION LOCATION (FIGMA DESIGN EXACT RECREATION) */}
          {currentStep === 3 && (() => {
            const controller = InstallerController.getInstance();
            const policy = controller.getDestinationPolicy();
            const pkgKind = activeSession?.packageKind || 'windows-exe';
            const destInfo = activeSession?.destination;
            const currentOptions = activeSession?.options || {
              createDesktopShortcut: true,
              pinToDock: true,
              addToApplicationsMenu: true,
              launchAfterInstall: false,
            };

            const headerSubtitle =
              pkgKind === 'android-apk'
                ? 'This Android application will be installed in the managed DroidBridge environment.'
                : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference'
                ? 'Choose whether to install this application for the current user or system-wide.'
                : 'Choose where this application will be installed.';

            return (
              <div className="p-8 space-y-6 flex-1 max-w-6xl w-full">
                {/* Header Title Section */}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Installation Location
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                    {headerSubtitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    You can change the default install location later from{' '}
                    <span className="text-[#0067C0] hover:underline cursor-pointer font-medium">
                      Settings.
                    </span>
                  </p>
                </div>

                {/* Application Information Row */}
                <div className="flex items-center gap-4 pt-1 pb-1">
                  {activeSession?.packageInfo?.icon ? (
                    <img
                      src={activeSession.packageInfo.icon}
                      alt={activeSession.packageInfo.displayName}
                      className="w-14 h-14 object-contain rounded-xl"
                    />
                  ) : (
                    <GoogleChromeLogo className="w-14 h-14" />
                  )}
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {activeSession?.packageInfo?.displayName || 'Application'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {activeSession?.packageInfo?.publisher || 'Verified Publisher'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0067C0] pt-0.5">
                      <div className="w-4 h-4 rounded-full bg-[#0067C0] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Verified Publisher</span>
                    </div>
                  </div>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column (Span 2) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Install destination card */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Install destination
                      </h3>
                      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs">
                        {(policy?.availableOptions || []).map((opt, index) => {
                          const isSelected =
                            opt.id === (destInfo?.optionId || policy?.selectedOptionId);
                          const isCustom = opt.kind === 'custom-folder';

                          return (
                            <React.Fragment key={opt.id}>
                              {index > 0 && (
                                <div className="border-t border-slate-100 dark:border-slate-700/60" />
                              )}
                              <div
                                onClick={() => {
                                  controller.selectDestinationOption(opt.id);
                                }}
                                className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#F8FAFC]/50 dark:bg-slate-800/50'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  {/* Radio Button */}
                                  {isSelected ? (
                                    <div className="w-5 h-5 rounded-full border-2 border-[#0067C0] flex items-center justify-center shrink-0">
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#0067C0]" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                                  )}

                                  {/* Icon & Details */}
                                  <div className="flex items-center gap-3">
                                    <Folder
                                      className={`w-5 h-5 shrink-0 stroke-[2] ${
                                        isSelected
                                          ? 'text-[#0067C0]'
                                          : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                    />
                                    <div>
                                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                        {opt.title}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                        {isCustom
                                          ? destInfo?.path || opt.displayPath || 'Choose a custom location to install'
                                          : opt.displayPath}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Badge / Button */}
                                {opt.recommended && (
                                  <div className="text-xs font-semibold text-[#16A34A] dark:text-emerald-400 shrink-0">
                                    Recommended
                                  </div>
                                )}

                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      controller.selectDestinationOption(opt.id);
                                      setShowFolderPicker(true);
                                    }}
                                    className="px-4 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                                  >
                                    Browse...
                                  </button>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {destInfo?.validation?.valid === false && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{destInfo.validation.message || 'Selected destination is invalid or read-only.'}</span>
                        </div>
                      )}
                    </div>

                    {/* Installation Options */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Installation options
                      </h3>

                      <div className="space-y-3 pt-1">
                        {/* Checkbox 1: Create Desktop Shortcut */}
                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                          <div
                            onClick={() =>
                              controller.updateOptions({
                                createDesktopShortcut: !currentOptions.createDesktopShortcut,
                              })
                            }
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              currentOptions.createDesktopShortcut
                                ? 'bg-[#0067C0] text-white'
                                : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {currentOptions.createDesktopShortcut && (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Create Desktop Shortcut
                          </span>
                        </label>

                        {/* Checkbox 2: Pin to Dock */}
                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                          <div
                            onClick={() =>
                              controller.updateOptions({
                                pinToDock: !currentOptions.pinToDock,
                              })
                            }
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              currentOptions.pinToDock
                                ? 'bg-[#0067C0] text-white'
                                : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {currentOptions.pinToDock && (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Pin to Dock
                          </span>
                        </label>

                        {/* Checkbox 3: Add to Applications Menu */}
                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                          <div
                            onClick={() =>
                              controller.updateOptions({
                                addToApplicationsMenu: !currentOptions.addToApplicationsMenu,
                              })
                            }
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              currentOptions.addToApplicationsMenu
                                ? 'bg-[#0067C0] text-white'
                                : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {currentOptions.addToApplicationsMenu && (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Add to Applications Menu
                          </span>
                        </label>

                        {/* Checkbox 4: Launch after installation */}
                        <label className="flex items-center gap-3 cursor-pointer group select-none">
                          <div
                            onClick={() =>
                              controller.updateOptions({
                                launchAfterInstall: !currentOptions.launchAfterInstall,
                              })
                            }
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              currentOptions.launchAfterInstall
                                ? 'bg-[#0067C0] text-white'
                                : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {currentOptions.launchAfterInstall && (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Launch after installation
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel Column */}
                  <div className="space-y-4">
                    {/* Runtime Card */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Runtime
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {pkgKind === 'android-apk' ? (
                            <DroidBridgeLogo />
                          ) : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference' ? (
                            <FlatpakLogo />
                          ) : (
                            <WinBridgeLogo />
                          )}
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                              {pkgKind === 'android-apk'
                                ? 'DroidBridge'
                                : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference'
                                ? 'Native Flatpak'
                                : 'WinBridge'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {pkgKind === 'android-apk'
                                ? 'Android Application'
                                : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference'
                                ? 'Linux Container App'
                                : 'Windows Application'}
                            </div>
                          </div>
                        </div>
                        <div className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 shrink-0">
                          <span>Compatible</span>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    </div>

                    {/* Installation preview Card */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-3.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Installation preview
                      </h3>

                      {/* Vertical Chain Items */}
                      <div className="space-y-1.5 text-xs">
                        {/* Item 1: Application */}
                        <div className="flex items-center gap-3">
                          <AppWindow className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[1.8]" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                              Application
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              {activeSession?.packageInfo?.displayName || 'Application'}
                            </div>
                          </div>
                        </div>

                        {/* Connector Arrow 1 */}
                        <div className="pl-1.5 py-0.5 flex gap-4 text-slate-400">
                          <span className="text-[11px] font-mono leading-none">↓</span>
                          <span className="text-[11px] font-mono leading-none">↓</span>
                        </div>

                        {/* Item 2: Destination */}
                        <div className="flex items-center gap-3">
                          <Folder className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[1.8]" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                              Destination
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 truncate">
                              {destInfo?.displayPath || destInfo?.path || '/WindroidOS/Applications'}
                            </div>
                          </div>
                        </div>

                        {/* Connector Arrow 2 */}
                        <div className="pl-1.5 py-0.5 flex gap-4 text-slate-400">
                          <span className="text-[11px] font-mono leading-none">↓</span>
                          <span className="text-[11px] font-mono leading-none">↓</span>
                        </div>

                        {/* Item 3: Runtime */}
                        <div className="flex items-center gap-3">
                          <LayoutGrid className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[1.8]" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                              Runtime
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              {pkgKind === 'android-apk'
                                ? 'DroidBridge (Android Application)'
                                : pkgKind === 'flatpak-bundle' || pkgKind === 'flatpak-reference'
                                ? 'Native Flatpak (Linux Application)'
                                : 'WinBridge (Windows Application)'}
                            </div>
                          </div>
                        </div>

                        {/* Connector Arrow 3 */}
                        <div className="pl-1.5 py-0.5 flex gap-4 text-slate-400">
                          <span className="text-[11px] font-mono leading-none">↓</span>
                          <span className="text-[11px] font-mono leading-none">↓</span>
                        </div>

                        {/* Item 4: Shortcuts */}
                      <div className="flex items-center gap-3">
                        <CornerUpRight className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 stroke-[1.8]" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            Shortcuts
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            {getShortcutsSummary()}
                          </div>
                        </div>
                      </div>

                      {/* Connector Arrow 4 */}
                      <div className="pl-1.5 py-0.5 flex gap-4 text-slate-400">
                        <span className="text-[11px] font-mono leading-none">↓</span>
                        <span className="text-[11px] font-mono leading-none">↓</span>
                      </div>

                      {/* Item 5: Ready to install */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div className="font-bold text-[#16A34A] dark:text-emerald-400 text-xs">
                          Ready to install
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

          {/* STEP 4: REVIEW (DRIVEN BY INSTALLATION PLAN ENGINE) */}
          {currentStep === 4 && (() => {
            const plan = InstallerController.getInstance().getInstallationPlan();
            if (!plan) return null;

            const formatSize = (bytes?: number) => {
              if (!bytes) return 'N/A';
              return `${Math.round(bytes / (1024 * 1024))} MB`;
            };

            const getStepName = (step?: string) => {
              switch (step) {
                case 'overview': return 'Step 1: Package Details';
                case 'permissions': return 'Step 2: Permissions';
                case 'location': return 'Step 3: Location';
                default: return 'Previous Steps';
              }
            };

            const handleJumpToStep = (suggestedStep?: string) => {
              if (suggestedStep === 'overview') changeStep(1);
              else if (suggestedStep === 'permissions') changeStep(2);
              else if (suggestedStep === 'location') changeStep(3);
            };

            return (
              <div className="p-8 space-y-6 flex-1 max-w-6xl w-full">
                {/* Header Title Section */}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Review Installation
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                    {plan.canInstall ? 'Everything is ready.' : 'Action required before installation.'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    Review the verified installation plan and configuration below.
                  </p>
                </div>

                {/* Application Information Row */}
                <div className="flex items-center gap-4 pt-1 pb-1">
                  {plan.package.runtime === 'droidbridge' ? (
                    <DroidBridgeLogo className="w-14 h-14 shrink-0" />
                  ) : plan.package.runtime === 'native-flatpak' ? (
                    <FlatpakLogo className="w-14 h-14 shrink-0" />
                  ) : (
                    <GoogleChromeLogo className="w-14 h-14 shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {plan.package.displayName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {plan.package.publisher || 'Verified Publisher'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0067C0] pt-0.5">
                      <div className="w-4 h-4 rounded-full bg-[#0067C0] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>
                        {plan.verification.publisherStatus === 'verified'
                          ? 'Verified Publisher'
                          : 'Package Metadata Verified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Blockers Banner */}
                {plan.blockers.length > 0 && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-400 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 stroke-[2]" />
                      <span>Installation Cannot Proceed ({plan.blockers.length} Blocking Issue{plan.blockers.length > 1 ? 's' : ''})</span>
                    </div>
                    <div className="space-y-2">
                      {plan.blockers.map((blocker, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-4 p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-100 dark:border-rose-900/50">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{blocker.title}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{blocker.message}</div>
                          </div>
                          {blocker.suggestedStep && (
                            <button
                              onClick={() => handleJumpToStep(blocker.suggestedStep)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer"
                            >
                              Fix in {getStepName(blocker.suggestedStep)}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings Banner */}
                {plan.warnings.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 stroke-[2]" />
                      <span>Installation Warnings ({plan.warnings.length})</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {plan.warnings.map((warning, idx) => (
                        <div key={idx} className="text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <span className="font-semibold">• {warning.title}:</span>
                          <span>{warning.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Left Column (Span 2) - Detailed Summaries */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* Installation Summary */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Installation summary
                      </h3>
                      <div className="space-y-2 text-xs">
                        {/* Row 1: Application */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <Package className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Application</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{plan.package.displayName}</span>
                        </div>

                        {/* Row 2: Destination */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <Folder className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Destination</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-xs" title={plan.destination.displayPath}>
                            {plan.destination.displayPath || '/WindroidOS/Applications'}
                          </span>
                        </div>

                        {/* Row 3: Runtime */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <LayoutGrid className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Runtime</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100 uppercase">{plan.package.runtime}</span>
                        </div>

                        {/* Row 4: Package Version */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <Tag className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Package version</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{plan.package.version || '1.0.0'}</span>
                        </div>

                        {/* Row 5: Architecture */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <Cpu className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Architecture</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100 uppercase">{plan.package.architecture || 'x64'}</span>
                        </div>

                        {/* Row 6: Package Size */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <Download className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Package size</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatSize(plan.package.packageSizeBytes || 123731968)}</span>
                        </div>

                        {/* Row 7: Estimated Installed Size */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                            <HardDrive className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">Estimated installed size</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatSize(plan.package.estimatedInstalledSizeBytes || 356515840)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800" />

                    {/* Permissions Summary */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Permissions summary ({plan.permissions.granted.length} Granted)
                      </h3>
                      <div className="space-y-2 text-xs">
                        {plan.permissions.required.map((perm) => (
                          <div key={perm.id} className="flex items-center justify-between py-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{perm.title} (Required)</span>
                            {perm.enabled ? (
                              <div className="w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-rose-500 font-bold">Disabled</span>
                            )}
                          </div>
                        ))}
                        {plan.permissions.optional.map((perm) => (
                          <div key={perm.id} className="flex items-center justify-between py-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{perm.title}</span>
                            {perm.enabled ? (
                              <div className="w-4 h-4 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">Disabled</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800" />

                    {/* Installation Options */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Installation options
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Create Desktop Shortcut</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{plan.options.createDesktopShortcut ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Pin to Dock</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{plan.options.pinToDock ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Add to Applications Menu</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{plan.options.addToApplicationsMenu ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Launch After Installation</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{plan.options.launchAfterInstall ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800" />

                    {/* Security */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Security
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Publisher Verification</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{plan.verification.publisherStatus}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Digital Signature</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{plan.verification.signatureStatus}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Package Integrity</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{plan.verification.integrityStatus}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Compatible Runtime</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{plan.verification.compatibilityStatus}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ready Status Banner */}
                    <div className="pt-2 flex items-center gap-3">
                      {plan.canInstall ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#10B981] dark:text-emerald-400 leading-tight">
                              Ready to Install
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              No blocking issues detected. ({plan.operations.length} installation operations scheduled)
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                            <AlertCircle className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-tight">
                              Installation Blocked
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Please resolve blocking issues before continuing.
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Flowchart Summary */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Installation sequence ({plan.operations.length} steps)
                    </h3>

                    {/* Operations Sequence preview */}
                    <div className="space-y-2 pt-1">
                      {plan.operations.map((op, idx) => (
                        <div key={op.id} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#EBF3FC] dark:bg-blue-950/60 text-[#0067C0] flex items-center justify-center shrink-0 text-xs font-bold">
                              {op.order}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                                {op.title}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {op.description}
                              </div>
                            </div>
                          </div>
                          {idx < plan.operations.length - 1 && (
                            <div className="pl-3.5 py-0.5 text-slate-300 dark:text-slate-600">
                              <span className="text-xs font-sans leading-none">↓</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STEP 5: INSTALLING (DRIVEN BY INSTALLATION EXECUTION ENGINE) */}
          {currentStep === 5 && (() => {
            const currentPercent = activeSession?.progress?.percent ?? 0;
            const currentMessage = activeSession?.progress?.message || 'Installing files...';
            const currentStage = activeSession?.progress?.stage || 'installing';
            const execState = activeSession?.progress?.executionState || 'idle';
            const canPause = activeSession?.progress?.canPause ?? true;

            return (
              <div className="p-8 space-y-6 flex-1 max-w-6xl w-full">
                {/* Header Title Section */}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Installing Application
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                    Please wait while Windroid OS installs this application.
                  </p>
                </div>

                {/* Simulation Banner */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 font-medium flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#0067C0] shrink-0" />
                    <span>
                      Simulation Engine Active: Executing provider-agnostic installation plan without modifying host system state.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {execState === 'running' && canPause && (
                      <button
                        onClick={() => InstallerController.getInstance().pauseInstallation()}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Pause className="w-3 h-3" /> Pause
                      </button>
                    )}
                    {execState === 'paused' && (
                      <button
                        onClick={() => InstallerController.getInstance().resumeInstallation()}
                        className="px-2.5 py-1 bg-[#0067C0] hover:bg-[#0056A3] text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <Play className="w-3 h-3" /> Resume
                      </button>
                    )}
                  </div>
                </div>

                {/* Application Header Row */}
                <div className="flex items-center gap-4 pt-1 pb-1">
                  {activeSession?.packageInfo?.icon ? (
                    <img src={activeSession.packageInfo.icon} alt="" className="w-14 h-14 object-contain rounded-xl" />
                  ) : activeSession?.runtime === 'droidbridge' ? (
                    <DroidBridgeLogo className="w-14 h-14" />
                  ) : activeSession?.runtime === 'native-flatpak' ? (
                    <FlatpakLogo className="w-14 h-14" />
                  ) : (inspection?.displayName || activeSession?.packageInfo?.displayName || '').toLowerCase().includes('chrome') ? (
                    <GoogleChromeLogo className="w-14 h-14" />
                  ) : (
                    <WinBridgeLogo />
                  )}
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {inspection?.displayName || activeSession?.packageInfo?.displayName || 'Application'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {inspection?.publisher || activeSession?.packageInfo?.publisher || 'Verified Publisher'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0067C0] pt-0.5">
                      <div className="w-4 h-4 rounded-full bg-[#0067C0] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Verified Package Metadata</span>
                    </div>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Progress Bar & Details Container */}
                <div className="space-y-6 py-2 max-w-4xl">
                  {/* Progress Track */}
                  <div className="space-y-4">
                    <div className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          execState === 'paused' ? 'bg-amber-500' : 'bg-[#0067C0]'
                        }`}
                        style={{ width: `${currentPercent}%` }}
                      />
                    </div>

                    {/* Percentage & Operation Text */}
                    <div className="text-center space-y-1.5">
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {Math.round(currentPercent)}%
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center justify-center gap-1.5">
                        <span className="font-semibold uppercase text-[10px] tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {currentStage}
                        </span>
                        <span>{currentMessage}</span>
                        {execState === 'running' && (
                          <span className="inline-flex gap-0.5 text-[#0067C0]">
                            <span className="animate-pulse">.</span>
                            <span className="animate-pulse delay-100">.</span>
                            <span className="animate-pulse delay-200">.</span>
                          </span>
                        )}
                        {execState === 'paused' && (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">(Paused)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtle Horizontal Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Installation Details (Clean Key-Value List) */}
                  {(() => {
                    const resolvedProvider = activeSession ? InstallerProviderRegistry.getInstance().resolveProvider(activeSession) : null;
                    const providerHealth = resolvedProvider?.getHealth();
                    return (
                      <div className="max-w-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Runtime</span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium uppercase">
                            {activeSession?.runtime || 'winbridge'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Provider Contract</span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium font-mono">
                            {resolvedProvider?.id || 'simulation-provider'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Provider Health</span>
                          <span className="inline-flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-medium capitalize">
                            <span className={`w-2 h-2 rounded-full ${providerHealth?.state === 'available' ? 'bg-emerald-500' : providerHealth?.state === 'simulation' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                            {providerHealth?.state || 'simulation'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Destination</span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-xs" title={activeSession?.destination.displayPath || currentDestinationPath}>
                            {activeSession?.destination.displayPath || currentDestinationPath}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Execution Engine</span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium font-mono">
                            InstallerExecutionEngine
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Elapsed</span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium font-mono">
                            {formatTime(elapsedSeconds)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Subtle Horizontal Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-800" />

                  {/* Bottom Status Message */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <Info className="w-4 h-4 text-[#0067C0] shrink-0 stroke-[2]" />
                    <span>
                      {execState === 'paused'
                        ? 'Installation is paused. Click Resume to continue.'
                        : 'Installation is in progress. Please do not close this window.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STEP 6: COMPLETED (FIGMA DESIGN EXACT RECREATION) */}
          {currentStep === 6 && (() => {
            const installedRecord = (activeSession as any)?.packageId
              ? InstalledApplicationRegistry.getInstance().getById((activeSession as any).packageId)
              : undefined;

            const displayName = installedRecord?.displayName || inspection?.displayName || activeSession?.packageInfo?.displayName || 'Application';
            const publisher = installedRecord?.publisher || inspection?.publisher || activeSession?.packageInfo?.publisher || 'Verified Publisher';
            const location = installedRecord?.installLocation || currentDestinationPath;
            const version = installedRecord?.version || inspection?.version || '1.0.0';
            const runtimeLabel = installedRecord?.runtime
              ? installedRecord.runtime === 'winbridge'
                ? 'WinBridge (Windows Application)'
                : installedRecord.runtime === 'droidbridge'
                ? 'DroidBridge (Android Application)'
                : 'Flatpak (Linux Application)'
              : 'WinBridge (Windows Application)';

            return (
              <div className="p-8 space-y-6 flex-1 max-w-6xl w-full">
                {/* Header Title Section */}
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Installation Complete
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                    Your application has been registered and installed successfully.
                  </p>
                </div>

                {/* Application Header Row */}
                <div className="flex items-center gap-4 pt-1 pb-1">
                  {installedRecord?.icon ? (
                    <img src={installedRecord.icon} alt="" className="w-14 h-14 object-contain rounded-xl" />
                  ) : activeSession?.packageInfo?.icon ? (
                    <img src={activeSession.packageInfo.icon} alt="" className="w-14 h-14 object-contain rounded-xl" />
                  ) : activeSession?.runtime === 'droidbridge' ? (
                    <DroidBridgeLogo className="w-14 h-14" />
                  ) : activeSession?.runtime === 'native-flatpak' ? (
                    <FlatpakLogo className="w-14 h-14" />
                  ) : displayName.toLowerCase().includes('chrome') ? (
                    <GoogleChromeLogo className="w-14 h-14" />
                  ) : (
                    <WinBridgeLogo />
                  )}
                  <div className="space-y-0.5">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {displayName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {publisher}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0067C0] pt-0.5">
                      <div className="w-4 h-4 rounded-full bg-[#0067C0] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>Verified Publisher & Registered Metadata</span>
                    </div>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Centered Success Section */}
                <div className="py-2 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full border-[2.5px] border-[#10B981] flex items-center justify-center text-[#10B981] mx-auto">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <div className="text-base font-bold text-[#10B981] dark:text-emerald-400">
                    Installed & Registered Successfully
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Browser Preview Simulation — Metadata registered within Windroid OS environment</span>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Installation Summary Key-Value List */}
                <div className="max-w-xl space-y-3 text-xs py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                      <Folder className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Installed To</span>
                    </div>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{location}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                      <LayoutGrid className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Runtime</span>
                    </div>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{runtimeLabel}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
                      <Tag className="w-4 h-4 text-slate-500 shrink-0 stroke-[1.8]" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Version</span>
                    </div>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{version}</span>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Post-Install Checkboxes */}
                <div className="space-y-3 py-1">
                  {/* Checkbox 1: Launch Application */}
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div
                      onClick={() => setOptLaunchAfter(!optLaunchAfter)}
                      className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 transition-colors ${
                        optLaunchAfter
                          ? 'bg-[#0067C0] text-white'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {optLaunchAfter && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      Launch Application
                    </span>
                  </label>

                  {/* Checkbox 2: Pin to Dock */}
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div
                      onClick={() => setOptPinToDock(!optPinToDock)}
                      className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 transition-colors ${
                        optPinToDock
                          ? 'bg-[#0067C0] text-white'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {optPinToDock && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      Pin to Dock
                    </span>
                  </label>

                  {/* Checkbox 3: Create Desktop Shortcut */}
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <div
                      onClick={() => setOptDesktopShortcut(!optDesktopShortcut)}
                      className={`w-4 h-4 rounded-sm flex items-center justify-center shrink-0 transition-colors ${
                        optDesktopShortcut
                          ? 'bg-[#0067C0] text-white'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {optDesktopShortcut && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      Create Desktop Shortcut
                    </span>
                  </label>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Optional Links Row */}
                <div className="flex items-center gap-3 text-xs pt-1">
                  <button
                    onClick={() => addNotification({ title: 'Open Folder', type: 'info', message: `Opened ${location}` })}
                    className="flex items-center gap-2 text-[#0067C0] hover:underline font-medium cursor-pointer"
                  >
                    <Folder className="w-4 h-4 stroke-[1.8]" />
                    <span>Open Installation Folder</span>
                  </button>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  <button
                    onClick={() => addNotification({ title: 'View Log', type: 'info', message: 'Installation log exported to /WindroidOS/Logs/installer.log' })}
                    className="flex items-center gap-2 text-[#0067C0] hover:underline font-medium cursor-pointer"
                  >
                    <FileText className="w-4 h-4 stroke-[1.8]" />
                    <span>View Installation Log</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <FolderPlus className="w-4 h-4 text-[#0067C0]" />
                Select Installation Directory
              </div>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Choose or enter custom path:
              </label>
              <input
                type="text"
                value={customFolderPath}
                onChange={(e) => setCustomFolderPath(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0067C0]"
              />

              <div className="pt-2 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400">Quick suggestions:</div>
                {[
                  '/WindroidOS/CustomApps/GoogleChrome',
                  '/WindroidOS/SystemDrive/ProgramFiles/GoogleChrome',
                  '/WindroidOS/ExternalDrive/Apps/GoogleChrome',
                  '/WindroidOS/UserData/Applications'
                ].map((suggestPath) => (
                  <button
                    key={suggestPath}
                    onClick={() => setCustomFolderPath(suggestPath)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 truncate transition-colors cursor-pointer"
                  >
                    {suggestPath}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  InstallerController.getInstance().setCustomDestinationPath(customFolderPath);
                  setShowFolderPicker(false);
                }}
                className="px-4 py-2 bg-[#0067C0] text-white rounded-xl text-xs font-semibold hover:bg-[#0056A3] transition-colors cursor-pointer"
              >
                Confirm Path
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Cancel Installation?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The installation is still running. If you cancel now, the application may not be installed correctly.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="w-full py-2.5 bg-[#0067C0] hover:bg-[#0056A3] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Continue Installing
              </button>
              <button
                onClick={async () => {
                  setShowCancelDialog(false);
                  await InstallerController.getInstance().cancelInstallation();
                  if (onClose) onClose();
                }}
                className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel Installation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Action Footer */}
      <div className="px-8 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div>
          {currentStep > 1 && currentStep < 5 && (
            <button
              onClick={() => setCurrentStep((currentStep - 1) as any)}
              className="px-5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep <= 5 && (
            <button
              onClick={() => {
                if (currentStep === 5) {
                  setShowCancelDialog(true);
                } else if (onClose) {
                  onClose();
                }
              }}
              className="px-5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
          )}

          {currentStep < 4 && (
            <button
              onClick={() => {
                const controller = InstallerController.getInstance();
                if (currentStep === 2) {
                  controller.continueFromPermissions();
                } else if (currentStep === 3) {
                  controller.continueFromLocation();
                } else {
                  changeStep((currentStep + 1) as any);
                }
              }}
              className="px-6 py-2 bg-[#0067C0] hover:bg-[#0056A3] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleStartInstall}
              className="px-6 py-2 bg-[#0067C0] hover:bg-[#0056A3] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Install
            </button>
          )}

          {currentStep === 6 && (
            <>
              <button
                disabled
                title="Launch is disabled (placeholder)"
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 opacity-60"
              >
                <Play className="w-3.5 h-3.5" /> Launch
              </button>

              <button
                disabled
                title="Open Location is disabled (placeholder)"
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 opacity-60"
              >
                <Folder className="w-3.5 h-3.5" /> Open Location
              </button>

              <button
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="px-6 py-2 bg-[#0067C0] hover:bg-[#0056A3] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
