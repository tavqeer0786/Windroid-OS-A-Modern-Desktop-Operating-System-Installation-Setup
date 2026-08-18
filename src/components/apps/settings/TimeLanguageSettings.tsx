import React, { useState } from 'react';
import { useOS } from '../../../context/OSContext';
import { useClock } from '../../../hooks/useClock';
import { Clock, Globe, Keyboard, Check, RefreshCw, AlertCircle, Laptop } from 'lucide-react';

export const TimeLanguageSettings: React.FC = () => {
  const { localeSettings, updateTimezone, updateLocale, updateKeyboardLayout } = useOS();
  const { timeString, dateString } = useClock();

  const [selectedTz, setSelectedTz] = useState(localeSettings.timezone);
  const [selectedLocale, setSelectedLocale] = useState(localeSettings.locale);
  const [selectedKb, setSelectedKb] = useState(localeSettings.keyboardLayout);

  const [savingTz, setSavingTz] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [savingKb, setSavingKb] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testTypingText, setTestTypingText] = useState('');

  const handleTimezoneChange = async (tz: string) => {
    setSelectedTz(tz);
    setSavingTz(true);
    setStatusMsg(null);
    const res = await updateTimezone(tz);
    setSavingTz(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: `Timezone updated to ${tz}.` });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to set timezone.' });
    }
  };

  const handleLocaleChange = async (loc: string) => {
    setSelectedLocale(loc);
    setSavingLocale(true);
    setStatusMsg(null);
    const res = await updateLocale(loc);
    setSavingLocale(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: `System language set to ${loc}.` });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update system language.' });
    }
  };

  const handleKeyboardChange = async (kb: string) => {
    setSelectedKb(kb);
    setSavingKb(true);
    setStatusMsg(null);
    const res = await updateKeyboardLayout(kb);
    setSavingKb(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: `Keyboard layout set to '${kb}'.` });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to set keyboard layout.' });
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 max-w-4xl animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Time & Language</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage system timezone, regional formats, display language, and keyboard input maps.
            </p>
          </div>
        </div>

        {/* Live System Time Badge */}
        <div className="px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">{timeString}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{dateString}</div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {selectedTz}
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}
        >
          {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Date & Time Settings Card */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
          <Clock className="w-4 h-4 text-blue-500" />
          <span>Date & Time Zone</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              System Time Zone
            </label>
            <select
              value={selectedTz}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={savingTz}
              className="w-full px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              {localeSettings.availableTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Time Synchronization
            </label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs">
              <span className="text-slate-600 dark:text-slate-400">NTP Time Synchronization</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Language & Regional Format Card */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span>Language & Region</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Display Language & Locale
            </label>
            <select
              value={selectedLocale}
              onChange={(e) => handleLocaleChange(e.target.value)}
              disabled={savingLocale}
              className="w-full px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              {localeSettings.availableLocales.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Regional Formats
            </label>
            <div className="p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Calendar:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">Gregorian</span>
              </div>
              <div className="flex justify-between">
                <span>First day of week:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">Sunday</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Input Methods Card */}
      <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
          <Keyboard className="w-4 h-4 text-purple-500" />
          <span>Keyboard Layout & Input Methods</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Active Keyboard Map
            </label>
            <select
              value={selectedKb}
              onChange={(e) => handleKeyboardChange(e.target.value)}
              disabled={savingKb}
              className="w-full px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              {localeSettings.availableKeyboards.map((kb) => (
                <option key={kb.layout} value={kb.layout}>
                  {kb.name} [{kb.layout.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Test Typing Area
            </label>
            <input
              type="text"
              value={testTypingText}
              onChange={(e) => setTestTypingText(e.target.value)}
              placeholder="Type here to test active keymap layout..."
              className="w-full px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
