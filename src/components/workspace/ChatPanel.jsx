import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Brain, Zap, Bug, RotateCcw, Paperclip, Clock, Check, AlertCircle, Cpu, FileJson, FileCode, FileText, Globe, Box, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
      <div className="p-4 border-b border-onyx-border flex items-center justify-between bg-background/20">
        <div className="flex items-center space-x-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,228,204,0.6)]"></div>
           <h3 className="font-display font-bold text-[10px] text-gray-400 uppercase tracking-widest">Chat Interface</h3>
        </div>
        <div className="flex items-center bg-background border border-onyx-border rounded px-2 py-1 space-x-2 group focus-within:border-primary transition-all">
          <Cpu size={12} className="text-gray-500 group-focus-within:text-primary" />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Model ID (e.g. gpt-4o)"
            className="bg-transparent text-[10px] text-gray-300 outline-none w-32 font-mono"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] group ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-background font-medium shadow-[0_4px_12px_rgba(0,228,204,0.2)] rounded-tr-none'
                  : 'bg-background border border-onyx-border text-gray-200 rounded-tl-none prose prose-invert prose-sm max-w-none'
              }`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  renderAssistantContent(msg)
                )}
              </div>

            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Modes */}
      <div className="p-4 border-t border-onyx-border bg-background/20 space-y-4">
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
            className="w-full bg-background border border-onyx-border rounded-2xl p-4 pr-12 outline-none focus:border-primary transition-all resize-none disabled:opacity-50 text-sm shadow-inner"
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

function getToolIcon(name) {
  switch (name) {
    case 'writeFile': return <FileCode size={16} />;
    case 'runCommand': return <Terminal size={16} />;
    case 'readFile': return <FileText size={16} />;
    case 'listFiles': return <Box size={16} />;
    case 'deploy': return <Globe size={16} />;
    case 'kvSet':
    case 'fsWrite': return <FileJson size={16} />;
    default: return <Cpu size={16} />;
  }
}

function renderAssistantContent(msg) {
  const parts = msg.content.split(/(\[TOOL_CALL:[^\]]+\])/g);

  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        const match = part.match(/\[TOOL_CALL:([^\]]+)\]/);
        if (match) {
          const toolCallId = match[1];
          const tc = msg.toolCalls?.find(t => t.id === toolCallId);
          if (!tc) return null;
          return <ToolCallBlock key={i} tc={tc} />;
        }

        if (!part.trim()) return null;

        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({children}) => <p className="mb-2 last:mb-0 leading-normal">{children}</p>,
              pre: ({children}) => <pre className="bg-black/30 p-2 rounded-lg my-2 overflow-x-auto border border-white/5">{children}</pre>,
              code: ({node, inline, className, children, ...props}) => (
                <code className={`${className} ${inline ? 'bg-white/10 px-1 rounded' : 'block text-xs font-mono'}`} {...props}>
                  {children}
                </code>
              ),
              ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}

      {/* Render any tool calls that weren't matched in content (backup) */}
      {msg.toolCalls?.filter(tc => !msg.content.includes(`[TOOL_CALL:${tc.id}]`)).map((tc, i) => (
        <ToolCallBlock key={`extra-${i}`} tc={tc} />
      ))}
    </div>
  );
}

function ToolCallBlock({ tc }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 my-4">
      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
        tc.status === 'error'
          ? 'bg-red-500/5 border-red-500/20 text-red-400'
          : tc.status === 'success'
            ? 'bg-primary/5 border-primary/20 text-primary shadow-[0_0_15px_rgba(0,228,204,0.05)]'
            : 'bg-white/5 border-white/10 text-gray-400'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
             tc.status === 'success' ? 'bg-primary/20' : 'bg-white/5'
          }`}>
            {getToolIcon(tc.name)}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider">
              {tc.name === 'writeFile' ? 'Publishing File' :
               tc.name === 'runCommand' ? 'Executing Task' :
               tc.name === 'readFile' ? 'Analyzing Source' : 'Processing'}
            </div>
            <div className="text-[10px] opacity-60 font-mono truncate max-w-[200px]">
              {tc.input?.path || (tc.input?.command ? `${tc.input.command} ${tc.input.args?.join(' ')}` : tc.name)}
            </div>
          </div>
        </div>

        <div className="flex items-center">
          {tc.status === 'running' ? (
            <div className="flex items-center space-x-2">
               <span className="text-[9px] font-bold animate-pulse">RUNNING</span>
               <Zap size={12} className="animate-pulse" />
            </div>
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

function ModeButton({ active, onClick, icon, label, activeColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
        active
          ? `${activeColor} text-white border-transparent shadow-lg`
          : 'bg-background text-gray-500 border-onyx-border hover:text-gray-300'
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
