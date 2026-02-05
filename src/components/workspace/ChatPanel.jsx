import React, { useState } from 'react';
import { Send, Sparkles, Brain, Zap, Bug } from 'lucide-react';

export default function ChatPanel({ messages, onSend, model, setModel, mode, setMode, isGenerating }) {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-gray-400 uppercase tracking-widest">Chat Interface</h3>
        <div className="flex items-center space-x-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,228,204,0.6)]"></div>
           <span className="text-[10px] text-primary font-mono uppercase tracking-tighter">AI Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl ${
              msg.role === 'user'
                ? 'bg-primary text-background font-medium shadow-[0_4px_12px_rgba(0,228,204,0.2)]'
                : 'bg-background border border-gray-800 text-gray-200'
            }`}>
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              {msg.toolCalls && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 text-[10px] text-primary font-mono">
                  {msg.toolCalls.map((tc, j) => (
                    <div key={j} className="flex items-center space-x-1">
                      <Zap size={10} />
                      <span>Agent is calling ${tc.name}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input & Modes */}
      <div className="p-4 border-t border-gray-800 space-y-3">
        {/* Modes Bar */}
        <div className="flex items-center space-x-2">
          <ModeButton
            active={mode === 'plan'}
            onClick={() => setMode('plan')}
            icon={<Brain size={14} />}
            label="Plan"
            activeColor="bg-blue-500"
            glowColor="shadow-blue-500/50"
          />
          <ModeButton
            active={mode === 'execute'}
            onClick={() => setMode('execute')}
            icon={<Zap size={14} />}
            label="Execute"
            activeColor="bg-emerald-500"
            glowColor="shadow-emerald-500/50"
          />
          <ModeButton
            active={mode === 'fix'}
            onClick={() => setMode('fix')}
            icon={<Bug size={14} />}
            label="Fix"
            activeColor="bg-red-500"
            glowColor="shadow-red-500/50"
          />
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGenerating ? 'Onyx is thinking...' : 'Tell Onyx what to build...'}
            rows={2}
            className="w-full bg-background border border-gray-700 rounded-xl p-4 pr-12 outline-none focus:border-primary transition-colors resize-none disabled:bg-surface disabled:text-gray-500 text-sm"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="absolute right-3 bottom-3 p-2 bg-primary text-background rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            disabled={isGenerating}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label, activeColor, glowColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
        active
          ? `${activeColor} text-white shadow-lg ${glowColor} animate-pulse-slow`
          : 'bg-background text-gray-500 border border-gray-800 hover:text-gray-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
