import React from 'react';
import { CornerUpRight } from 'lucide-react';

interface ShortcutBadgeProps {
  badgeSize?: number; // Size of the badge container in px (e.g. 12, 14, 18, 24)
  className?: string;
}

export const ShortcutBadge: React.FC<ShortcutBadgeProps> = ({
  badgeSize = 14,
  className = '',
}) => {
  // Determine icon size inside badge
  const iconSize = Math.max(8, Math.round(badgeSize * 0.65));

  return (
    <div
      style={{
        width: `${badgeSize}px`,
        height: `${badgeSize}px`,
      }}
      className={`absolute -bottom-0.5 -left-0.5 rounded-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-center pointer-events-none z-10 ${className}`}
    >
      <CornerUpRight
        style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        className="text-blue-600 dark:text-blue-400 stroke-[2.75]"
      />
    </div>
  );
};
