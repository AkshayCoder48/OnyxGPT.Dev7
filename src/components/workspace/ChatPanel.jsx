import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Cpu,
  Brain,
  Zap,
  Bug,
  RotateCcw,
  Clock,
  Paperclip,
  FileCode,
  Terminal,
  FileText,
  Box,
  Globe,
  FileJson,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';

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
    <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center space-x-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,228,204,0.6)]"></div>
           <h3 className="font-display font-bold text-[10px] text-gray-500 uppercase tracking-widest">Neural Link</h3>
        </div>
        <div className="flex items-center bg-white/5 border border-white/5 rounded-lg px-2 py-1 space-x-2 group focus-within:border-primary/50 transition-all">
          <Cpu size={12} className="text-gray-600 group-focus-within:text-primary" />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-transparent text-[10px] text-gray-400 outline-none w-24 font-mono"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              {msg.role === 'user' ? (
                <div className="inline-block p-3.5 rounded-2xl text-sm leading-relaxed bg-primary text-[#0A0A0A] font-bold shadow-lg shadow-primary/10 rounded-tr-none">
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {renderAssistantContent(msg)}
                </div>
              )}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
             <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center space-x-3">
                <Sparkles size={16} className="text-primary animate-spin" />
                <span className="text-xs text-gray-500 font-medium">Onyx is thinking...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 border-t border-white/5 bg-black/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ModeButton active={mode === 'plan'} onClick={() => setMode('plan')} icon={<Brain size={12} />} label="Plan" activeColor="bg-blue-500" />
            <ModeButton active={mode === 'execute'} onClick={() => setMode('execute')} icon={<Zap size={12} />} label="Exec" activeColor="bg-primary" />
            <ModeButton active={mode === 'fix'} onClick={() => setMode('fix')} icon={<Bug size={12} />} label="Fix" activeColor="bg-red-500" />
          </div>
          <div className="flex items-center space-x-1">
             <IconButton icon={<RotateCcw size={14} />} onClick={onUndo} title="Undo" />
             <IconButton icon={<Paperclip size={14} />} onClick={onAttachContext} title="Context" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGenerating ? 'Synthesizing...' : 'Enter prompt...'}
            rows={2}
            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 pr-12 outline-none focus:border-primary/30 transition-all resize-none disabled:opacity-50 text-sm text-gray-200"
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
            className="absolute right-3 bottom-3 p-2 bg-primary text-[#0A0A0A] rounded-xl hover:brightness-110 transition-all disabled:opacity-20 shadow-lg shadow-primary/20"
            disabled={isGenerating || !input.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}

function renderAssistantContent(msg) {
  // 1. Extract reasoning
  let content = msg.content;
  const reasonBlocks = [];
  content = content.replace(/<reason>([\s\S]*?)<\/reason>/g, (match, p1) => {
    reasonBlocks.push(p1.trim());
    return `[REASON_BLOCK:${reasonBlocks.length - 1}]`;
  });

  // 2. Split by markers
  const parts = content.split(/(\[(?:TOOL_CALL|REASON_BLOCK):[^\]]+\])/g);

  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        const tcMatch = part.match(/\[TOOL_CALL:([^\]]+)\]/);
        const rbMatch = part.match(/\[REASON_BLOCK:([^\]]+)\]/);

        if (tcMatch) {
          const toolCallId = tcMatch[1];
          const tc = msg.toolCalls?.find(t => t.id === toolCallId);
          if (!tc) return null;
          return <ToolCallBlock key={i} tc={tc} />;
        }

        if (rbMatch) {
          const idx = parseInt(rbMatch[1]);
          return (
            <div key={i} className="bg-primary/5 border-l-2 border-primary/30 py-2 px-4 rounded-r-lg my-2 italic text-xs text-gray-400 leading-relaxed font-serif">
               <div className="flex items-center space-x-2 text-primary/60 mb-1 non-italic font-sans font-bold uppercase tracking-widest text-[9px]">
                  <Brain size={10} />
                  <span>AI reasoning</span>
               </div>
               "{reasonBlocks[idx]}"
            </div>
          );
        }

        if (!part.trim()) return null;

        return (
          <div key={i} className="prose prose-invert prose-sm max-w-none text-gray-300">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                pre: ({children}) => <pre className="bg-black/50 p-3 rounded-xl my-3 overflow-x-auto border border-white/5 text-[11px] leading-tight">{children}</pre>,
                code: ({inline, className, children, ...props}) => (
                  <code className={`${className} ${inline ? 'bg-white/10 px-1.5 py-0.5 rounded text-primary' : 'block'}`} {...props}>
                    {children}
                  </code>
                ),
                ul: ({children}) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
                h1: ({children}) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-bold text-white mb-2">{children}</h2>,
              }}
            >
              {part}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

function ToolCallBlock({ tc }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 my-2">
      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        tc.status === 'error'
          ? 'bg-red-500/5 border-red-500/20 text-red-400'
          : tc.status === 'success'
            ? 'bg-primary/5 border-primary/20 text-primary'
            : 'bg-white/5 border-white/5 text-gray-500'
      }`}>
        <div className="flex items-center space-x-4 overflow-hidden">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
             tc.status === 'success' ? 'bg-primary/10' : 'bg-white/5'
          }`}>
            {getToolIcon(tc.name)}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center space-x-2">
              <div className="text-[10px] font-bold uppercase tracking-widest truncate">
                {tc.name === 'writeFile' ? 'Publishing Asset' :
                 tc.name === 'runCommand' ? 'Executing Task' :
                 tc.name === 'readFile' ? 'Reading Source' : 'System Logic'}
              </div>
            </div>
            <div className="text-[9px] opacity-40 font-mono truncate mt-0.5">
              {tc.input?.path || (tc.input?.command ? `${tc.input.command} ${tc.input.args?.join(' ')}` : tc.name)}
            </div>
          </div>
        </div>

        <div className="flex items-center shrink-0 ml-4">
          {tc.status === 'running' ? (
            <Zap size={14} className="text-primary animate-pulse" />
          ) : tc.status === 'success' ? (
            <Check size={14} className="text-primary" />
          ) : (
            <AlertCircle size={14} className="text-red-400" />
          )}
        </div>
      </div>
    </div>
  );
}

function getToolIcon(name) {
  switch (name) {
    case 'writeFile': return <FileCode size={16} />;
    case 'runCommand': return <Terminal size={16} />;
    case 'readFile': return <FileText size={16} />;
    case 'listFiles': return <Box size={16} />;
    case 'deploy': return <Globe size={16} />;
    default: return <Cpu size={16} />;
  }
}

function ModeButton({ active, onClick, icon, label, activeColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
        active
          ? `${activeColor} text-[#0A0A0A] border-transparent shadow-lg`
          : 'bg-white/5 text-gray-500 border-white/5 hover:text-gray-300'
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
      className="p-1.5 text-gray-600 hover:text-primary hover:bg-white/5 rounded-lg transition-all"
    >
      {icon}
    </button>
  );
}
