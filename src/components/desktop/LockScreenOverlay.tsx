import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { useClock } from '../../hooks/useClock';
import { 
  Lock, KeyRound, ArrowRight, Eye, EyeOff, Power, RefreshCw, 
  Moon, LogOut, ShieldAlert, Wifi, Volume2, User
} from 'lucide-react';

export const LockScreenOverlay: React.FC = () => {
  const { 
    sessionStatus, 
    currentUser, 
    unlockSession, 
    logoutSession,
    lockSession,
    wallpaper
  } = useOS();

  const { timeString, dateString } = useClock();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStatus === 'locked') {
      setPassword('');
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [sessionStatus]);

  if (sessionStatus !== 'locked') return null;

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isUnlocking) return;

    setIsUnlocking(true);
    setErrorMsg(null);

    try {
      const res = await unlockSession(password);
      if (!res.success) {
        setErrorMsg(res.error || 'Incorrect password. Please try again.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9990] flex flex-col justify-between p-8 text-white select-none animate-in fade-in duration-300"
      style={{
        ...wallpaper.style,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Dark Blur Overlay */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xl -z-10" />

      {/* Top Bar: Lock Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>Session Locked</span>
        </div>
      </div>

      {/* Center Content: Clock, User Avatar & Unlock Input */}
      <div className="flex flex-col items-center justify-center gap-6 my-auto max-w-sm mx-auto w-full">
        {/* Large Display Clock */}
        <div className="text-center space-y-1">
          <h1 className="text-6xl md:text-7xl font-light font-mono tracking-tight drop-shadow-md">
            {timeString}
          </h1>
          <p className="text-sm font-medium text-slate-200/90 tracking-wide drop-shadow-sm">
            {dateString}
          </p>
        </div>

        {/* User Card */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative group">
            {currentUser?.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20 shadow-2xl transition-transform group-hover:scale-105" 
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white ring-4 ring-white/20 shadow-2xl">
                <User className="w-12 h-12" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white ring-2 ring-slate-900 shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {currentUser?.fullName || 'Windroid User'}
            </h2>
            <p className="text-xs text-slate-300/80 font-mono">
              @{currentUser?.username || 'user'}
            </p>
          </div>
        </div>

        {/* Password / PIN Input Form */}
        <form onSubmit={handleUnlock} className="w-full space-y-3">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter PIN or password..."
              className="w-full pl-4 pr-20 py-3 rounded-2xl bg-white/10 dark:bg-slate-900/60 border border-white/20 focus:border-blue-500 text-sm text-white placeholder-slate-300/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-xl shadow-lg transition-all"
            />
            
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={isUnlocking}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Unlock"
              >
                {isUnlocking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs text-center animate-in fade-in duration-150">
              {errorMsg}
            </div>
          )}
        </form>
      </div>

      {/* Bottom Control Toolbar */}
      <div className="flex items-center justify-between text-xs text-slate-300/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
            <Wifi className="w-3.5 h-3.5 text-blue-400" />
            <span>Connected</span>
          </div>
        </div>

        {/* Power Menu Trigger */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPowerMenuOpen(!isPowerMenuOpen);
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
            title="Session Power Actions"
          >
            <Power className="w-4 h-4" />
          </button>

          {isPowerMenuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-12 right-0 w-48 p-1.5 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-2xl text-xs space-y-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <button
                onClick={() => {
                  setIsPowerMenuOpen(false);
                  logoutSession();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-slate-200 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch User / Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
