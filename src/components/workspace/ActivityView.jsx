import React, { useMemo } from 'react';
import {
  CheckCircle2, Clock, GitCommit, GitBranch,
  Terminal, AlertCircle, ListTodo, Circle, CheckCircle,
  Trash2, Edit3, Sparkles
} from 'lucide-react';

export default function ActivityView({ messages, logs }) {
  // Extract TODOs from tool calls
  const todos = useMemo(() => {
    const todoMap = new Map();
    messages.forEach(msg => {
      msg.toolCalls?.forEach(tc => {
        if (tc.name === 'manage_todo') {
          const { action, id, text, status } = tc.input;
          if (action === 'create') {
            todoMap.set(id, { id, text, status: status || 'pending', updatedAt: tc.timestamp });
          } else if (action === 'update') {
            const existing = todoMap.get(id) || {};
            todoMap.set(id, { ...existing, id, ...tc.input, updatedAt: tc.timestamp });
          } else if (action === 'delete') {
            todoMap.delete(id);
          }
        }
      });
    });
    return Array.from(todoMap.values()).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  }, [messages]);

  // Extract Git Topology
  const topology = useMemo(() => {
    const actions = [];
    messages.forEach(msg => {
      msg.toolCalls?.forEach(tc => {
        if (tc.name === 'write_git_topology' || tc.name === 'publish_git_topology') {
           // We'll simplify this for display
           if (tc.name === 'write_git_topology') {
             actions.push({ ...tc.input, type: 'git', timestamp: tc.timestamp, status: tc.status });
           }
        }
      });
    });
    return actions;
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">

        {/* TODOs Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center space-x-2">
              <ListTodo size={18} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Project Roadmap</h3>
            </div>
            <div className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded">
              {todos.filter(t => t.status === 'completed').length}/{todos.length} Done
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {todos.length > 0 ? (
              todos.map(todo => (
                <div
                  key={todo.id}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                    todo.status === 'completed'
                      ? 'bg-green-500/5 border-green-500/10 opacity-60'
                      : 'bg-white/5 border-white/5 hover:border-primary/20 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      todo.status === 'completed'
                        ? 'bg-green-500 border-green-500 text-[#0A0A0A]'
                        : 'border-white/20 text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span className={`text-sm ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                      {todo.text}
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    ID: {todo.id}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                 <Sparkles size={24} className="text-gray-800 mx-auto mb-2" />
                 <p className="text-xs text-gray-600 italic">No tasks assigned yet. Onyx will generate them soon.</p>
              </div>
            )}
          </div>
        </section>

        {/* Development Timeline (Git Topology) */}
        <section className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
            <GitBranch size={18} className="text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Development Timeline</h3>
          </div>

          <div className="space-y-0 ml-3 border-l border-white/10 pl-6">
            {topology.map((item, i) => (
              <div key={i} className="relative pb-8 last:pb-0">
                <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#0A0A0A] shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{item.label}</span>
                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded">
                      {item.branch}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{item.sublabel || 'Continuous integration and deployment step.'}</p>
                  <div className="flex items-center space-x-2 text-[9px] font-mono text-blue-500/60 uppercase tracking-widest">
                    <Clock size={10} />
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Execution Logs */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
            <Terminal size={18} className="text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Execution Logs</h3>
          </div>
          <div className="bg-black/40 rounded-2xl border border-white/5 p-4 font-mono text-[11px] leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className={`py-1 border-b border-white/[0.02] last:border-0 ${
                  log.includes('Error') ? 'text-red-400' :
                  log.includes('$') ? 'text-primary/70 font-bold' : 'text-gray-500'
                }`}>
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-700 italic">Listening for system events...</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Check({ size, strokeWidth }) {
  return <CheckCircle size={size} strokeWidth={strokeWidth} />;
}
