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
        <div className="flex items-center space-x-4">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-background border border-gray-700 text-sm rounded px-2 py-1 outline-none text-gray-300 focus:border-primary"
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-5-nano">GPT-5 Nano</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          </select>

          <div className="flex bg-background p-1 rounded border border-gray-700">
            <ModeButton active={mode === 'plan'} onClick={() => setMode('plan')} icon={<Brain size={14} />} label="Plan" />
            <ModeButton active={mode === 'execute'} onClick={() => setMode('execute')} icon={<Zap size={14} />} label="Execute" />
            <ModeButton active={mode === 'fix'} onClick={() => setMode('fix')} icon={<Bug size={14} />} label="Fix" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl ${
              msg.role === 'user'
                ? 'bg-primary text-background font-medium'
                : 'bg-background border border-gray-800 text-gray-200'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.toolCalls && (
                <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-primary font-mono">
                  {msg.toolCalls.map((tc, j) => (
                    <div key={j} className="flex items-center space-x-1">
                      <Zap size={10} />
                      <span>AI is calling ${tc.name}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGenerating ? 'Onyx is thinking...' : 'Tell Onyx what to build...'}
            rows={2}
            className="w-full bg-background border border-gray-700 rounded-xl p-4 pr-12 outline-none focus:border-primary transition-colors resize-none disabled:bg-surface disabled:text-gray-500" disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="absolute right-3 bottom-3 p-2 bg-primary text-background rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={isGenerating}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1 px-3 py-1 rounded text-xs transition-colors ${
        active ? 'bg-primary text-background font-bold' : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
