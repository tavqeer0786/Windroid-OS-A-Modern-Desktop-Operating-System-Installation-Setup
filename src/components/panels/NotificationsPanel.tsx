import React from 'react';
import { useOS } from '../../context/OSContext';
import { 
  Bell, Trash2, CheckCheck, Sparkles, Folder, Calendar, Settings, X 
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const NotificationsPanel: React.FC = () => {
  const { 
    notifications, 
    clearNotification, 
    clearAllNotifications, 
    isNotificationsOpen, 
    openApp, 
    closeAllPanels
  } = useOS();

  const renderIcon = (appId?: string) => {
    switch (appId) {
      case 'agent': return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'files': return <Folder className="w-4 h-4 text-emerald-500" />;
      case 'calendar': return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'settings': return <Settings className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isNotificationsOpen && (
        <>
          {/* Invisible Overlay for Outside Clicks */}
          <motion.div 
            key="notifications-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={closeAllPanels}
            className="fixed inset-0 z-[9970] bg-transparent cursor-default"
          />

          <motion.div 
            key="notifications-panel"
            initial={{ opacity: 0, y: -28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ 
              opacity: 0, 
              y: -28, 
              scale: 0.97,
              transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } 
            }}
            transition={{ 
              duration: 0.21,
              ease: [0, 0, 0.2, 1]
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-12 right-3 z-[9980] w-96 p-4 rounded-2xl bg-[#f3f3f3]/95 dark:bg-[#1c1c1c]/95 backdrop-blur-3xl backdrop-saturate-150 border border-slate-200/80 dark:border-white/10 shadow-2xl text-slate-800 dark:text-slate-100 flex flex-col gap-3 select-none overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-1 pb-2 border-b border-white/20 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Notification Center
                </span>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[11px] font-medium text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-red-500/10"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="h-[400px] overflow-y-auto overflow-x-hidden space-y-2.5 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {notifications.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2"
                >
                  <CheckCheck className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                  <span>You are all caught up!</span>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: 50, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ 
                        opacity: 0, 
                        x: 160, 
                        scale: 0.9, 
                        transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] } 
                      }}
                      className="p-3 rounded-2xl text-xs space-y-1.5 relative group bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm hover:border-white/80 dark:hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-center justify-between pr-5">
                        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {renderIcon(n.appId)}
                          <span className="truncate">{n.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">{n.time}</span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed pr-2">
                        {n.message}
                      </p>

                      {n.actionLabel && (
                        <button
                          onClick={() => {
                            if (n.appId) openApp(n.appId);
                            closeAllPanels();
                          }}
                          className="mt-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[10px] cursor-pointer"
                        >
                          {n.actionLabel}
                        </button>
                      )}

                      <button
                        onClick={() => clearNotification(n.id)}
                        className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

