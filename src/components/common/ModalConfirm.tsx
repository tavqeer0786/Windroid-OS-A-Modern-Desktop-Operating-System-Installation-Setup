import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOS } from '../../context/OSContext';
import { AlertTriangle, X } from 'lucide-react';

export const ModalConfirm: React.FC = () => {
  const { confirmModal, closeConfirm } = useOS();

  return (
    <AnimatePresence>
      {confirmModal.isOpen && (
        <motion.div 
          key="modal-confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/30 backdrop-blur-xs p-4"
        >
          <motion.div 
            key="modal-confirm-content"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ 
              opacity: 0, 
              scale: 0.93,
              transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } 
            }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-800 dark:text-slate-100 flex flex-col gap-4 relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <button
              onClick={closeConfirm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className={`shrink-0 pt-0.5 ${confirmModal.isDanger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="confirm-modal-title" className="text-base font-semibold leading-6 text-slate-900 dark:text-slate-50">
                  {confirmModal.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 mt-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                {confirmModal.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  closeConfirm();
                }}
                className={`px-4 py-2 text-xs font-medium text-white rounded-xl transition-colors shadow-xs cursor-pointer ${
                  confirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
