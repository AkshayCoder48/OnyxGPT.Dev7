import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Brain, Zap, Bug, Cpu,
  RotateCcw, Paperclip, Check, AlertCircle,
  FileCode, Terminal, FileText, Box, Globe, StopCircle,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatPanel({
  messages, onSend, onStop, model, setModel, mode, setMode, isGenerating
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A]">
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-black/20">
        <div className="flex items-center space-x-2">
          <MessageSquare className="text-primary" size={16} />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Assistant</span>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              {msg.role === 'user' ? (
                <div className="inline-block p-3.5 rounded-2xl text-sm leading-relaxed bg-primary text-[#0A0A0A] font-bold shadow-lg shadow-primary/10 rounded-tr-none">
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-[9px] opacity-40 mt-1 flex items-center justify-end">
                    <Clock size={8} className="mr-1" />
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
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
                <span className="text-xs text-gray-500 font-medium">Onyx is processing...</span>
                <button
                  onClick={onStop}
                  className="ml-4 px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-all flex items-center space-x-1"
                >
                  <StopCircle size={10} />
                  <span>Stop</span>
                </button>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/5 bg-black/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ModeButton active={mode === 'plan'} onClick={() => setMode('plan')} icon={<Brain size={12} />} label="Plan" activeColor="bg-blue-500" />
            <ModeButton active={mode === 'execute'} onClick={() => setMode('execute')} icon={<Zap size={12} />} label="Exec" activeColor="bg-primary" />
            <ModeButton active={mode === 'fix'} onClick={() => setMode('fix')} icon={<Bug size={12} />} label="Fix" activeColor="bg-red-500" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGenerating ? 'Synthesizing...' : 'Describe your changes...'}
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
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="absolute right-3 bottom-3 p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all shadow-lg"
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              type="submit"
              className="absolute right-3 bottom-3 p-2 bg-primary text-[#0A0A0A] rounded-xl hover:brightness-110 transition-all disabled:opacity-20 shadow-lg shadow-primary/20"
              disabled={!input.trim()}
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function renderAssistantContent(msg) {
  let content = msg.content;
  const reasonBlocks = [];
  content = content.replace(/<reason>([\s\S]*?)<\/reason>/g, (match, p1) => {
    reasonBlocks.push(p1.trim());
    return `[REASON_BLOCK:${reasonBlocks.length - 1}]`;
  });

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
            <div key={i} className="bg-primary/5 border-l-2 border-primary/30 py-3 px-4 rounded-r-2xl my-2 italic text-xs text-gray-400 leading-relaxed font-serif relative group">
               <div className="flex items-center space-x-2 text-primary/60 mb-2 non-italic font-sans font-bold uppercase tracking-widest text-[9px]">
                  <Brain size={10} />
                  <span>Internal Logic</span>
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
                pre: ({children}) => <pre className="bg-black/50 p-4 rounded-xl my-4 overflow-x-auto border border-white/5 text-[11px] leading-tight shadow-inner">{children}</pre>,
                code: ({inline, className, children, ...props}) => (
                  <code className={`${className} ${inline ? 'bg-white/10 px-1.5 py-0.5 rounded text-primary' : 'block'}`} {...props}>
                    {children}
                  </code>
                ),
                ul: ({children}) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
                h2: ({children}) => <h2 className="text-base font-bold text-white mb-2 flex items-center space-x-2 border-b border-white/5 pb-1">{children}</h2>,
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 my-2">
      <div className={`flex flex-col rounded-xl border transition-all ${
        tc.status === 'error'
          ? 'bg-red-500/5 border-red-500/20'
          : tc.status === 'success'
            ? 'bg-primary/5 border-primary/20'
            : 'bg-white/5 border-white/5'
      }`}>
        <div
          className="flex items-center justify-between p-3 cursor-pointer group"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
               tc.status === 'success' ? 'bg-primary/20 text-primary' :
               tc.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-500'
            }`}>
              {getToolIcon(tc.name)}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] font-bold uppercase tracking-widest truncate">
                {getToolLabel(tc.name)}
              </div>
              <div className="text-[9px] opacity-40 font-mono truncate mt-0.5">
                {tc.input?.path || (tc.input?.command ? `${tc.input.command} ${tc.input.args?.join(' ')}` : tc.name)}
              </div>
            </div>
          </div>

          <div className="flex items-center shrink-0 ml-4 space-x-3">
            {tc.status === 'running' ? (
              <Zap size={14} className="text-primary animate-pulse" />
            ) : tc.status === 'success' ? (
              <Check size={14} className="text-primary" />
            ) : (
              <AlertCircle size={14} className="text-red-400" />
            )}
            {isOpen ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
          </div>
        </div>

        {isOpen && (
          <div className="p-3 pt-0 border-t border-white/5 animate-in slide-in-from-top-1 duration-200">
             <div className="bg-black/40 rounded-lg p-3 text-[10px] font-mono text-gray-400 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                <div>
                  <span className="text-primary/60 font-bold uppercase">Input:</span>
                  <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(tc.input, null, 2)}</pre>
                </div>
                {tc.result && (
                  <div>
                    <span className="text-green-500/60 font-bold uppercase">Result:</span>
                    <pre className="mt-1 whitespace-pre-wrap text-gray-500">{tc.result}</pre>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getToolIcon(name) {
  switch (name) {
    case 'writeFile': return <FileCode size={14} />;
    case 'runCommand': return <Terminal size={14} />;
    case 'manage_todo': return <CheckCircle2 size={14} />;
    case 'write_git_topology': return <Box size={14} />;
    case 'publish_git_topology': return <Globe size={14} />;
    default: return <Cpu size={14} />;
  }
}

function getToolLabel(name) {
  switch (name) {
    case 'writeFile': return 'Publishing Asset';
    case 'runCommand': return 'Executing Task';
    case 'manage_todo': return 'Updating Todos';
    case 'write_git_topology': return 'Git Action';
    case 'publish_git_topology': return 'Deployment Map';
    default: return 'System Call';
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

function MessageSquare(props) {
  return <Box {...props} />;
}
