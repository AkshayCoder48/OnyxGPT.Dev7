import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Brain, Zap, Bug, RotateCcw, Paperclip, Clock, Check, AlertCircle, Cpu } from 'lucide-react';

export default function ChatPanel({
  messages,
  onSend,
  model,
  setModel,
  mode,
  setMode,
  isGenerating,
  onUndo,
  onAttachContext,
  todos = []
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
           <Sparkles size={14} className="text-primary animate-pulse" />
           <h3 className="font-display font-bold text-[10px] text-gray-400 uppercase tracking-widest">Onyx AI Assistant</h3>
        </div>
      </div>

      {/* TODOs Section */}
      {todos && todos.length > 0 && (
        <div className="bg-primary/5 border-b border-gray-800 p-3">
           <div className="flex items-center space-x-2 mb-2">
              <Check className="text-primary w-3 h-3" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Project Objectives</span>
           </div>
           <div className="space-y-1.5">
              {todos.map((todo, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                   <div className={`mt-1 w-2.5 h-2.5 rounded-sm border ${todo.completed ? 'bg-primary border-primary' : 'border-gray-600'} flex items-center justify-center`}>
                      {todo.completed && <Check size={8} className="text-background" />}
                   </div>
                   <span className={`text-[11px] leading-tight ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                      {todo.task}
                   </span>
                </div>
              ))}
           </div>
        </div>
      )}

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
                    <div key={j} className={`flex items-center space-x-2 text-[10px] font-mono p-1.5 rounded border transition-all ${
                      tc.status === 'error'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : tc.status === 'success'
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-primary/5 border-primary/10 text-primary'
                    }`}>
                      {tc.status === 'running' ? (
                        <Zap size={10} className="animate-pulse" />
                      ) : tc.status === 'success' ? (
                        <Check size={10} />
                      ) : (
                        <AlertCircle size={10} />
                      )}
                      <span className="font-bold">{tc?.name || "tool"}</span>
                      <span className="opacity-60 truncate">({Object.keys(tc.input || {}).join(', ')})</span>
                      {tc.result && <span className="opacity-80 ml-1 border-l border-white/10 pl-2 truncate">{tc.result}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Actions */}
      <div className="p-4 border-t border-gray-800 bg-background/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
             <div className="text-[10px] text-gray-500 font-mono flex items-center space-x-1">
                <Cpu size={10} />
                <span>{model}</span>
             </div>
          </div>
          <div className="flex items-center space-x-1">
             <IconButton icon={<RotateCcw size={14} />} onClick={onUndo} title="Undo last message" />
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
