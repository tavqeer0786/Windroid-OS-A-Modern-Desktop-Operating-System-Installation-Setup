import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOS } from '../../context/OSContext';
import { SUGGESTED_AGENT_COMMANDS } from '../../data/initialData';
import { Sparkles, Mic, Send, Bot, User, CheckCircle2 } from 'lucide-react';

export const SystemAgentPanel: React.FC = () => {
  const { 
    agentMessages, 
    sendAgentMessage, 
    isSystemAgentOpen, 
    openApp, 
    closeAllPanels 
  } = useOS();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSystemAgentOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentMessages, isSystemAgentOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendAgentMessage(inputText);
    setInputText('');
  };

  const handleMicClick = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      sendAgentMessage('Turn on Bluetooth');
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isSystemAgentOpen && (
        <>
          {/* Invisible Overlay for Outside Clicks */}
          <motion.div 
            key="agent-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={closeAllPanels}
            className="fixed inset-0 z-[9970] bg-transparent cursor-default"
          />

          <motion.div 
            key="agent-panel"
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
            <div className="flex items-center justify-between px-0.5 border-b border-white/30 dark:border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">
                  Windroid Agent
                </span>
              </div>
              <button
                onClick={() => {
                  openApp('agent');
                  closeAllPanels();
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
              >
                Expand →
              </button>
            </div>

            {/* Suggested Commands */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {SUGGESTED_AGENT_COMMANDS.slice(0, 4).map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => sendAgentMessage(cmd)}
                  className="px-2 py-1 rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 hover:bg-blue-600 hover:text-white text-[10px] font-medium text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Recent History Messages */}
            <div className="h-[400px] overflow-y-auto scroll-smooth pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-h-full flex flex-col justify-end space-y-2">
                {agentMessages.map((msg) => {
                  const isAgent = msg.sender === 'agent';
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-2xl text-xs space-y-1 ${
                        isAgent
                          ? 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-sm'
                          : 'bg-blue-600 text-white font-medium ml-auto max-w-[85%]'
                      }`}
                    >
                      <div className="leading-snug">{msg.text}</div>
                      {msg.actionTaken && (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1 border-t border-white/30 dark:border-white/10">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{msg.actionTaken}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Form Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1 border-t border-white/30 dark:border-white/10">
              <button
                type="button"
                onClick={handleMicClick}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-blue-600'
                }`}
                title="Voice command prototype"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              <input
                type="text"
                placeholder={isListening ? "Listening..." : "Ask agent to do something..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 text-slate-900 dark:text-white"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
