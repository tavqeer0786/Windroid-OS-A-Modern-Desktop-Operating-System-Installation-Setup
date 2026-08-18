import React, { useState } from 'react';
import {
  Shield,
  Camera,
  Mic,
  Folder,
  MapPin,
  Bell,
  Users,
  Check,
  Globe,
  Monitor,
  Volume2,
  Usb,
  Database,
  Cog,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { InstallerPermission } from '../../system/installer/InstallerTypes';

interface PermissionReviewProps {
  permissions: (string | InstallerPermission)[];
  onChange?: (granted: string[]) => void;
  onTogglePermission?: (id: string, enabled: boolean) => void;
}

export const PermissionReview: React.FC<PermissionReviewProps> = ({
  permissions,
  onChange,
  onTogglePermission,
}) => {
  const normPermissions: InstallerPermission[] = permissions.map((p, idx) => {
    if (typeof p === 'string') {
      const lower = p.toLowerCase();
      let category: InstallerPermission['category'] = 'other';
      if (lower.includes('camera')) category = 'camera';
      else if (lower.includes('mic')) category = 'microphone';
      else if (lower.includes('file') || lower.includes('storage')) category = 'files';
      else if (lower.includes('location')) category = 'location';
      else if (lower.includes('notification')) category = 'notifications';
      else if (lower.includes('contact')) category = 'contacts';
      else if (lower.includes('internet') || lower.includes('network')) category = 'network';

      const isSensitive = ['camera', 'microphone', 'location', 'contacts'].includes(category);

      return {
        id: `perm_${idx}`,
        key: p,
        title: p,
        description: isSensitive
          ? 'Requires explicit user consent'
          : 'Standard application capability',
        category,
        required: false,
        enabled: true,
        canUserChange: true,
        canChangeLater: true,
        source: 'fallback',
        riskLevel: isSensitive ? 'sensitive' : 'normal',
      };
    }
    return p;
  });

  const [granted, setGranted] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    normPermissions.forEach((p) => {
      if (p.enabled) initial.add(p.id);
    });
    return initial;
  });

  const togglePermission = (perm: InstallerPermission) => {
    if (perm.required || !perm.canUserChange) return;

    const nextEnabled = !granted.has(perm.id);
    const nextSet = new Set(granted);
    if (nextEnabled) {
      nextSet.add(perm.id);
    } else {
      nextSet.delete(perm.id);
    }
    setGranted(nextSet);

    if (onTogglePermission) {
      onTogglePermission(perm.id, nextEnabled);
    }
    if (onChange) {
      onChange(Array.from(nextSet));
    }
  };

  const getPermIcon = (category: InstallerPermission['category']) => {
    switch (category) {
      case 'camera':
        return <Camera className="w-4 h-4 text-purple-500" />;
      case 'microphone':
        return <Mic className="w-4 h-4 text-red-500" />;
      case 'files':
        return <Folder className="w-4 h-4 text-blue-500" />;
      case 'location':
        return <MapPin className="w-4 h-4 text-emerald-500" />;
      case 'notifications':
        return <Bell className="w-4 h-4 text-amber-500" />;
      case 'contacts':
        return <Users className="w-4 h-4 text-indigo-500" />;
      case 'network':
        return <Globe className="w-4 h-4 text-cyan-500" />;
      case 'display':
        return <Monitor className="w-4 h-4 text-indigo-400" />;
      case 'audio':
        return <Volume2 className="w-4 h-4 text-pink-500" />;
      case 'usb':
        return <Usb className="w-4 h-4 text-orange-500" />;
      case 'registry':
        return <Database className="w-4 h-4 text-teal-500" />;
      case 'services':
        return <Cog className="w-4 h-4 text-slate-500" />;
      case 'startup':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'administrator':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Shield className="w-4 h-4 text-slate-500" />;
    }
  };

  if (normPermissions.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        No declared permissions found for this package.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-slate-500" /> Runtime Permission Review
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review access permissions requested by this application.
          </div>
        </div>
        <div className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300">
          {granted.size} / {normPermissions.length} Granted
        </div>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {normPermissions.map((perm) => {
          const isGranted = granted.has(perm.id) || perm.required;
          const isSensitive = perm.riskLevel === 'sensitive';
          const isElevated = perm.riskLevel === 'elevated';

          return (
            <div
              key={perm.id}
              onClick={() => togglePermission(perm)}
              className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                perm.required
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 cursor-default'
                  : isGranted
                  ? 'bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/40 cursor-pointer'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">{getPermIcon(perm.category)}</div>
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {perm.title}
                    {perm.required && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-normal">
                        Required
                      </span>
                    )}
                    {isSensitive && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-normal border border-amber-500/20">
                        Sensitive
                      </span>
                    )}
                    {isElevated && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-700 dark:text-red-300 font-normal border border-red-500/20">
                        Elevated
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {perm.description ||
                      (isSensitive
                        ? 'Requires explicit user consent under Windroid OS security policy'
                        : 'Standard application privilege')}
                  </div>
                </div>
              </div>

              {!perm.required ? (
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    isGranted
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {isGranted && <Check className="w-3 h-3" />}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">Mandatory</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

