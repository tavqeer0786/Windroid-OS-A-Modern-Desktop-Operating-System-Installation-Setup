import React, { useState } from 'react';
import { useOS } from '../../../context/OSContext';
import { SUGGESTED_AGENT_COMMANDS } from '../../../data/initialData';
import { Sparkles, Mic, Send, Bot, User, CheckCircle2, Info } from 'lucide-react';

export const AgentApp: React.FC = () => {
  const { agentMessages, sendAgentMessage } = useOS();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

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
      sendAgentMessage('Open Settings');
    }, 1800);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none">
      {/* Prototype Banner */}
      <div className="px-4 py-2 bg-blue-500/10 dark:bg-blue-500/20 border-b border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Windroid OS System Agent</span>
          <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[9px] font-bold uppercase">
            Prototype Mode
          </span>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">Local Action Dispatcher</span>
      </div>

      {/* Suggested Commands Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Try Command:
        </span>
        {SUGGESTED_AGENT_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => sendAgentMessage(cmd)}
            className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Conversation Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white dark:bg-slate-950">
        {agentMessages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-[85%] ${isAgent ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${isAgent ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                isAgent
                  ? 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                  : 'bg-blue-600 text-white font-medium'
              }`}>
                <div className="leading-relaxed">{msg.text}</div>
                
                {msg.actionTaken && (
                  <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Action: {msg.actionTaken}</span>
                  </div>
                )}
                
                <div className={`text-[9px] text-right ${isAgent ? 'text-slate-400' : 'text-blue-100'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input controls */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            isListening 
              ? 'bg-red-500 text-white border-red-500 animate-pulse' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600'
          }`}
          title="Voice Command Prototype (Click to simulate 'Open Settings')"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          placeholder={isListening ? "Listening for voice command..." : "Type a command e.g. 'Set brightness to 60%'..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white cursor-pointer transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
