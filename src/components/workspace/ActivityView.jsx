import React from 'react';
import {
  Terminal,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Cpu,
  Brain,
  Clock,
  Download,
  Filter,
  FileCode,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ActivityView({ messages = [] }) {
  // Extract all tool calls and reasoning from messages
  const logs = [];

  messages.forEach(msg => {
    if (msg.role === 'assistant') {
      // Extract reasoning
      const reasonMatch = msg.content.match(/<reason>([\s\S]*?)<\/reason>/g);
      if (reasonMatch) {
        reasonMatch.forEach(rm => {
          logs.push({
            type: 'reasoning',
            content: rm.replace(/<\/?reason>/g, '').trim(),
            timestamp: msg.timestamp || new Date().toISOString(),
          });
        });
      }

      // Add tool calls
      if (msg.toolCalls) {
        msg.toolCalls.forEach(tc => {
          logs.push({
            type: 'tool',
            name: tc.name,
            input: tc.input,
            status: tc.status,
            result: tc.result,
            timestamp: tc.timestamp || msg.timestamp,
            completedAt: tc.completedAt
          });
        });
      }
    }
  });

  // Sort logs by timestamp
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="h-full flex bg-[#0A0A0A] overflow-hidden">
      {/* Sidebar: Git Topology */}
      <aside className="w-64 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center space-x-2 text-primary mb-1">
            <GitBranch size={18} />
            <h3 className="font-display font-bold text-sm">Git Topology</h3>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Auto-generated Flow</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 relative">
          {/* Vertical line */}
          <div className="absolute left-[29px] top-8 bottom-8 w-[1px] bg-gradient-to-b from-primary/50 via-purple-500/50 to-transparent"></div>

          <GitNode
            active
            branch="feature/auth"
            label="Implement Puter.js Auth"
            time="2m ago"
            sublabel="AI agent integrated session handling"
          />
          <GitNode
            branch="main"
            label="Setup Vite Scaffold"
            time="15m ago"
            sublabel="Initial project structure created"
          />
          <GitNode
            branch="main"
            label="Initial Commit"
            time="1h ago"
          />
        </div>
      </aside>

      {/* Main Content: Execution Logs */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-display font-bold text-white">Execution Logs</h2>
            <p className="text-xs text-gray-500 mt-1">Real-time tool output and AI reasoning</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-colors border border-white/5">
              <Filter size={16} />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-colors border border-white/5">
              <Download size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Clock size={32} className="opacity-20" />
              </div>
              <p className="text-sm font-medium italic">Waiting for execution data...</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <LogEntry key={i} log={log} />
            ))
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #222;
        }
      `}} />
    </div>
  );
}

function GitNode({ active, branch, label, time, sublabel }) {
  return (
    <div className="relative pl-10 group cursor-default">
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-[#0A0A0A] z-10 transition-all ${
        active ? 'border-primary shadow-[0_0_10px_rgba(0,228,204,0.4)]' : 'border-gray-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary' : 'bg-gray-800'}`}></div>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-mono ${active ? 'text-primary' : 'text-gray-500'}`}>{branch}</span>
        <span className="text-[10px] text-gray-600">{time}</span>
      </div>
      <div className={`text-xs font-bold transition-colors ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>{label}</div>
      {sublabel && <div className="text-[10px] text-gray-600 mt-1 leading-tight">{sublabel}</div>}
    </div>
  );
}

function LogEntry({ log }) {
  if (log.type === 'reasoning') {
    return (
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-primary">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <Brain size={14} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">AI Thought</span>
          </div>
          <span className="text-[10px] font-mono text-primary/40">
            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
          </span>
        </div>
        <div className="text-sm text-gray-300 italic leading-relaxed font-serif pl-2 border-l-2 border-primary/20">
          "{log.content}"
        </div>
      </div>
    );
  }

  const isTool = log.type === 'tool';
  const isError = log.status === 'error';
  const isSuccess = log.status === 'success';

  return (
    <div className={`bg-white/5 border border-white/5 rounded-xl overflow-hidden transition-all hover:bg-white/10 ${isError ? 'border-red-500/20' : ''}`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
            log.name === 'runCommand' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {log.name === 'runCommand' ? 'Shell' : 'Tool Call'}
          </div>
          <div className="font-mono text-xs text-gray-200">
            {log.name}({log.input?.path || log.input?.command || ''})
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {log.status === 'running' && <Zap size={14} className="text-primary animate-pulse" />}
          {isSuccess && <CheckCircle2 size={14} className="text-primary" />}
          {isError && <AlertCircle size={14} className="text-red-400" />}
          <span className="text-[10px] font-mono text-gray-600">
             {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-black/40 rounded-lg p-3 border border-white/5 flex items-start space-x-3">
           <div className="bg-white/5 p-2 rounded-lg text-gray-500">
              {log.name === 'writeFile' ? <FileCode size={16} /> : <Terminal size={16} />}
           </div>
           <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">
                {log.name === 'writeFile' ? 'Writing Asset' : 'Executing Binary'}
              </div>
              <div className="text-xs font-mono text-gray-300 truncate">
                {log.input?.path || `${log.input?.command} ${log.input?.args?.join(' ') || ''}`}
              </div>
              {log.result && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-gray-500 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {log.result}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
