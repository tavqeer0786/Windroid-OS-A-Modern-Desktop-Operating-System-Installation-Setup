import React, { useState } from 'react';
import { useOS } from '../../context/OSContext';
import { useClock } from '../../hooks/useClock';
import { 
  User, Lock, ArrowRight, Eye, EyeOff, Power, RefreshCw, 
  ShieldAlert, UserPlus, LogIn, Wifi
} from 'lucide-react';

export const LoginScreenOverlay: React.FC = () => {
  const { 
    sessionStatus, 
    userAccounts, 
    currentUser, 
    unlockSession, 
    switchUser,
    wallpaper 
  } = useOS();

  const { timeString, dateString } = useClock();

  const [selectedUsername, setSelectedUsername] = useState<string>(
    currentUser?.username || userAccounts[0]?.username || 'user'
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (sessionStatus !== 'login_screen') return null;

  const activeAccount = userAccounts.find((u) => u.username === selectedUsername) || userAccounts[0];

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoggingIn) return;

    setIsLoggingIn(true);
    setErrorMsg(null);

    try {
      const res = await unlockSession(password);
      if (!res.success) {
        setErrorMsg(res.error || 'Authentication failed. Please check your credentials.');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to authenticate');
    } finally {
      setIsLoggingIn(false);
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
    >
      {/* Background Dark Overlay */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xl -z-10" />

      {/* Top Bar: Time & Date */}
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-white">Windroid OS</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
            Display Manager
          </span>
        </div>

        <div className="text-right">
          <span className="font-mono font-bold text-white mr-2">{timeString}</span>
          <span className="text-slate-400">{dateString}</span>
        </div>
      </div>

      {/* Main Container: Account Picker & Password Box */}
      <div className="my-auto max-w-2xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900/60 p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-3xl">
        {/* Left Column: User Account Selector */}
        <div className="space-y-4 border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Select Account
          </h2>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {userAccounts.map((account) => {
              const isSelected = account.username === selectedUsername;
              return (
                <button
                  key={account.username}
                  onClick={() => {
                    setSelectedUsername(account.username);
                    switchUser(account.username);
                    setPassword('');
                    setErrorMsg(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-600/30 border border-blue-500/50 text-white shadow-md'
                      : 'hover:bg-white/10 border border-transparent text-slate-300'
                  }`}
                >
                  {account.avatarUrl ? (
                    <img 
                      src={account.avatarUrl} 
                      alt={account.fullName} 
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white ring-2 ring-white/20">
                      <User className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate text-white">{account.fullName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">@{account.username}</div>
                  </div>

                  {account.isAdmin && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      Admin
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Password Entry */}
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center space-y-2">
            {activeAccount?.avatarUrl ? (
              <img 
                src={activeAccount.avatarUrl} 
                alt={activeAccount.fullName} 
                className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/40 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white ring-4 ring-blue-500/40 shadow-xl">
                <User className="w-10 h-10" />
              </div>
            )}

            <div>
              <h3 className="font-bold text-sm text-white">{activeAccount?.fullName}</h3>
              <p className="text-xs text-slate-400 font-mono">@{activeAccount?.username}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-4 pr-20 py-2.5 rounded-2xl bg-slate-900/80 border border-white/20 focus:border-blue-500 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Sign In"
                >
                  {isLoggingIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs text-center">
                {errorMsg}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          <span>System Online</span>
        </div>
      </div>
    </div>
  );
};
