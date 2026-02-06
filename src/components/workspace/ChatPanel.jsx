import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Brain, Zap, Bug, RotateCcw, Paperclip, Clock } from 'lucide-react';

export default function ChatPanel({
  messages,
  onSend,
  model,
  setModel,
  mode,
  setMode,
  isGenerating,
  onUndo,
  onAttachContext
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-background/20">
        <div className="flex items-center space-x-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,228,204,0.6)]"></div>
           <h3 className="font-display font-bold text-[10px] text-gray-400 uppercase tracking-widest">Chat Interface</h3>
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-background border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-400 outline-none focus:border-primary transition-all"
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="claude-3-5-sonnet">Claude 3.5</option>
          <option value="gemini-2.0-flash-exp">Gemini 2.0</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-background font-medium shadow-[0_4px_12px_rgba(0,228,204,0.2)] rounded-tr-none'
                  : 'bg-background border border-gray-800 text-gray-200 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.toolCalls.map((tc, j) => (
                    <div key={j} className="flex items-center space-x-2 text-[10px] text-primary font-mono bg-primary/5 p-1.5 rounded border border-primary/10">
                      <Zap size={10} className="animate-pulse" />
                      <span>{tc?.name || "tool"}({Object.keys(tc.input || {}).join(', ')})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Modes */}
      <div className="p-4 border-t border-gray-800 bg-background/20 space-y-4">
        {/* Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ModeButton
              active={mode === 'plan'}
              onClick={() => setMode('plan')}
              icon={<Brain size={12} />}
              label="Plan"
              activeColor="bg-blue-500"
            />
            <ModeButton
              active={mode === 'execute'}
              onClick={() => setMode('execute')}
              icon={<Zap size={12} />}
              label="Exec"
              activeColor="bg-emerald-500"
            />
            <ModeButton
              active={mode === 'fix'}
              onClick={() => setMode('fix')}
              icon={<Bug size={12} />}
              label="Fix"
              activeColor="bg-red-500"
            />
          </div>
          <div className="flex items-center space-x-1">
             <IconButton icon={<RotateCcw size={14} />} onClick={onUndo} title="Undo last message" />
             <IconButton icon={<Clock size={14} />} title="Chat history" />
             <IconButton icon={<Paperclip size={14} />} onClick={onAttachContext} title="Attach context" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGenerating ? 'Onyx is coding...' : 'Describe what to build next...'}
            rows={3}
            className="w-full bg-background border border-gray-800 rounded-2xl p-4 pr-12 outline-none focus:border-primary transition-all resize-none disabled:opacity-50 text-sm shadow-inner"
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
            className="absolute right-3 bottom-3 p-2 bg-primary text-background rounded-xl hover:brightness-110 transition-all disabled:opacity-30 shadow-lg"
            disabled={isGenerating || !input.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label, activeColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
        active
          ? `${activeColor} text-white border-transparent shadow-lg`
          : 'bg-background text-gray-500 border-gray-800 hover:text-gray-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function IconButton({ icon, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
    >
      {icon}
    </button>
  );
}
