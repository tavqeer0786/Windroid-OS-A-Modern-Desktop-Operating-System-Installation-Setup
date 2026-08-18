import React, { useState, useRef, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';
import { Terminal as TerminalIcon } from 'lucide-react';

interface HistoryItem {
  id: string;
  command: string;
  output: React.ReactNode;
}

export const TerminalApp: React.FC = () => {
  const { developerMode, quickSettings, updateQuickSettings } = useOS();

  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'h_welcome',
      command: '',
      output: (
        <div className="text-slate-400 space-y-1">
          <div>Windroid Linux 6.12.0-windroid-rt (x86_64-pc-linux-gnu)</div>
          <div>Type <span className="text-yellow-400 font-bold">help</span> to list available built-in commands.</div>
        </div>
      )
    }
  ]);
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [logIndex, setLogIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (cmdStr: string) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    setCommandLog((prev) => [...prev, raw]);
    setLogIndex(-1);

    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let output: React.ReactNode = null;

    switch (cmd) {
      case 'help':
        output = (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
            <div><span className="text-emerald-400 font-bold">help</span> - Show this help menu</div>
            <div><span className="text-emerald-400 font-bold">ls</span> - List files in current directory</div>
            <div><span className="text-emerald-400 font-bold">uname -a</span> - Print kernel information</div>
            <div><span className="text-emerald-400 font-bold">sysinfo</span> - Print CPU, memory & system status</div>
            <div><span className="text-emerald-400 font-bold">cat &lt;file&gt;</span> - Print contents of file</div>
            <div><span className="text-emerald-400 font-bold">top</span> - View running system processes</div>
            <div><span className="text-emerald-400 font-bold">theme</span> - Toggle desktop light/dark theme</div>
            <div><span className="text-emerald-400 font-bold">clear</span> - Clear terminal screen</div>
            <div><span className="text-emerald-400 font-bold">date</span> - Display current system time</div>
          </div>
        );
        break;

      case 'uname':
        if (args.includes('-a')) {
          output = <div className="text-slate-300">Linux windroid-os 6.12.0-windroid-rt #1 SMP PREEMPT_RT Mon Aug 3 20:33:49 UTC 2026 x86_64 GNU/Linux</div>;
        } else {
          output = <div className="text-slate-300">Linux</div>;
        }
        break;

      case 'sysinfo':
        output = (
          <div className="text-slate-300 space-y-1">
            <div><span className="text-cyan-400">OS:</span> Windroid Linux 2026.08</div>
            <div><span className="text-cyan-400">Kernel:</span> 6.12.0-windroid-rt</div>
            <div><span className="text-cyan-400">Uptime:</span> 3 hours, 42 mins</div>
            <div><span className="text-cyan-400">Memory:</span> 6720 MiB / 16384 MiB (41%)</div>
            <div><span className="text-cyan-400">Developer Mode:</span> {developerMode ? 'Enabled' : 'Disabled'}</div>
          </div>
        );
        break;

      case 'ls':
        output = (
          <div className="flex flex-wrap gap-4 text-slate-300">
            <span className="text-blue-400 font-bold">Applications/</span>
            <span className="text-blue-400 font-bold">Documents/</span>
            <span className="text-blue-400 font-bold">Downloads/</span>
            <span className="text-blue-400 font-bold">Media/</span>
            <span className="text-blue-400 font-bold">Workspace/</span>
            <span className="text-slate-300">Windroid_OS_Architecture_Spec.md</span>
          </div>
        );
        break;

      case 'cat':
        if (args.length > 0) {
          output = (
            <div className="text-slate-300">
              # Windroid OS Architecture Spec{'\n'}
              Windroid OS is a modern Linux-based operating system emphasizing high responsiveness and calm desktop design.
            </div>
          );
        } else {
          output = <div className="text-red-400">cat: missing file argument</div>;
        }
        break;

      case 'top':
        output = (
          <div className="text-slate-300 font-mono text-[11px] space-y-1">
            <div className="text-slate-400">top - 20:33:49 up 3:42, 1 user, load average: 0.14, 0.18, 0.15</div>
            <div className="text-slate-400">Tasks: 142 total, 1 running, 141 sleeping</div>
            <div className="text-yellow-400 font-bold mt-2">PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND</div>
            <div> 1024 windroid 20 0 1.2g 340m 85m S 4.2 2.1 0:14.20 windroid-wm</div>
            <div> 1089 windroid 20 0 850m 180m 45m S 1.8 1.1 0:08.12 desktop-dock</div>
            <div> 1105 windroid 20 0 420m 90m 30m S 0.5 0.5 0:02.40 system-agent</div>
          </div>
        );
        break;

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      case 'theme':
        updateQuickSettings({ darkMode: !quickSettings.darkMode });
        output = <div className="text-emerald-400">Desktop theme toggled.</div>;
        break;

      case 'date':
        output = <div className="text-slate-300">{new Date().toString()}</div>;
        break;

      case 'echo':
        output = <div className="text-slate-300">{args.join(' ')}</div>;
        break;

      default:
        output = <div className="text-red-400">command not found: {cmd}. Type <span className="text-yellow-400">help</span> for commands.</div>;
        break;
    }

    setHistory((prev) => [
      ...prev,
      {
        id: `h_${Date.now()}`,
        command: raw,
        output
      }
    ]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      if (commandLog.length > 0) {
        const nextIdx = logIndex === -1 ? commandLog.length - 1 : Math.max(0, logIndex - 1);
        setLogIndex(nextIdx);
        setInputVal(commandLog[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      if (logIndex !== -1) {
        const nextIdx = logIndex + 1;
        if (nextIdx >= commandLog.length) {
          setLogIndex(-1);
          setInputVal('');
        } else {
          setLogIndex(nextIdx);
          setInputVal(commandLog[nextIdx]);
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-mono text-xs select-text p-3 overflow-y-auto">
      <div className="flex-1 space-y-3">
        {history.map((item) => (
          <div key={item.id} className="space-y-1">
            {item.command && (
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-emerald-400 font-bold">windroid-os:~$</span>
                <span>{item.command}</span>
              </div>
            )}
            {item.output && <div className="pl-2">{item.output}</div>}
          </div>
        ))}

        {/* Prompt Input Line */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-bold shrink-0">windroid-os:~$</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent text-slate-100 focus:outline-none font-mono text-xs caret-blue-400"
          />
        </div>
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
