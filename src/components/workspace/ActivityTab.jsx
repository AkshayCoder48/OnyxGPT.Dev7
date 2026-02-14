import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GitCommit, GitBranch, Terminal, FileEdit, Play, ShieldCheck } from 'lucide-react';

export default function ActivityTab({ logs }) {
  const [now, setNow] = useState(Date.now());

  // Update relative times every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type) => {
    if (type?.includes('runned command')) return <Terminal size={14} />;
    if (type?.includes('updated file')) return <FileEdit size={14} />;
    if (type?.includes('published') || type?.includes('updated repo')) return <GitCommit size={14} />;
    return <ShieldCheck size={14} />;
  };

  const getTimeAgo = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-surface">
      <div className="flex items-center gap-3 mb-8">
        <GitBranch size={20} className="text-primary" />
        <h2 className="text-lg font-bold text-white tracking-tight">Onyx Activity Timeline</h2>
      </div>

      <div className="relative ml-3 border-l border-onyx-border/50 pl-8 space-y-12">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-sm italic py-4">
            No activity recorded yet.
          </div>
        ) : (
          logs.slice().reverse().map((log, i) => (
            <div key={i} className="relative">
              {/* Timeline dot/node */}
              <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-[#0a0a0a] border-2 border-primary flex items-center justify-center text-primary shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {getIcon(log.text)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary/80 uppercase tracking-widest">
                    {log.type || 'SYSTEM'}
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono">
                    {getTimeAgo(log.timestamp)}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/[0.07] transition-all group cursor-default">
                  <p className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                    {log.text}
                  </p>
                </div>
              </div>

              {/* Topology curve decoration */}
              {i < logs.length - 1 && (
                <div className="absolute -left-[33px] top-6 w-[2px] h-[48px] bg-gradient-to-b from-primary/50 to-transparent"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
