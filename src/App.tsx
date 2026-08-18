import React, { useState } from 'react';
import { OSProvider, useOS } from './context/OSContext';
import { TopBar } from './components/desktop/TopBar';
import { DesktopArea } from './components/desktop/DesktopArea';
import { Dock } from './components/dock/Dock';
import { LockScreenOverlay } from './components/desktop/LockScreenOverlay';
import { LoginScreenOverlay } from './components/desktop/LoginScreenOverlay';
import { InstallWindroidScreen } from './apps/installer/InstallWindroidScreen';

function MainShell() {
  const { runtimeMode, isResolvingRuntimeMode } = useOS();

  // SECURITY BOUNDARY: Kernel command line (/proc/cmdline) via Native System Bridge is the sole authority in production.
  // URL query parameters (e.g. ?mode=installer) are strictly ignored in production and CANNOT promote
  // a live or installed production session into installer mode. URL overrides are ONLY permitted in DEV mode.
  const isBootInstaller = runtimeMode === 'installer' || (
    import.meta.env.DEV &&
    runtimeMode === 'browser-development' &&
    typeof window !== 'undefined' &&
    window.location &&
    window.location.search.includes('mode=installer')
  );

  if (isResolvingRuntimeMode) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 font-sans select-none">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs tracking-widest uppercase font-semibold text-slate-400">Booting Windroid OS...</span>
      </div>
    );
  }

  // Dedicated Installer Session (Boot Mode) - NO Desktop Shell loaded or exposed
  if (isBootInstaller) {
    return (
      <div className="h-screen w-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
        <InstallWindroidScreen launchContext="boot" />
      </div>
    );
  }

  // Live Mode or Installed Desktop Mode
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased select-none">
      <TopBar />
      <DesktopArea />
      <Dock />
      <LockScreenOverlay />
      <LoginScreenOverlay />
    </div>
  );
}

export default function App() {
  return (
    <OSProvider>
      <MainShell />
    </OSProvider>
  );
}
