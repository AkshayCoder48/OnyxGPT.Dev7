import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  User,
  Bot,
  Loader2,
  Paperclip,
  Undo2,
  Sparkles,
  Command,
  Plus,
  Zap,
  CheckCircle2,
  Circle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Layout,
  MessageSquare,
  MoreHorizontal,
  Box,
  Cpu
} from 'lucide-react';

export default function ChatPanel({
  messages,
  onSend,
  isGenerating,
  onUndo,
  onAttachContext,
  todos = []
}) {
  const [input, setInput] = useState('');
  const [showRoadmap, setShowRoadmap] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <header className="px-8 py-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0 relative z-10 backdrop-blur-xl">
        <div className="flex items-center space-x-4">
           <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <MessageSquare size={20} />
           </div>
           <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Neural Interface</h3>
              <div className="text-[9px] text-gray-600 font-mono mt-0.5">status: connected // protocol: secure_socket_layer</div>
           </div>
        </div>
        <div className="flex items-center space-x-3">
           <button
             onClick={onUndo}
             className="p-2.5 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90"
             title="Undo Last Activity"
           >
             <Undo2 size={18} />
           </button>
           <button
             onClick={onAttachContext}
             className="p-2.5 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90"
             title="Attach Context Buffer"
           >
             <Paperclip size={18} />
           </button>
        </div>
      </header>

      {/* Roadmap / TODOs Section */}
      {todos.length > 0 && (
        <div className="border-b border-white/5 bg-white/[0.01] relative z-10">
          <button
            onClick={() => setShowRoadmap(!showRoadmap)}
            className="w-full px-8 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
          >
            <div className="flex items-center space-x-4">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-primary transition-colors">Neural Roadmap ({todos.filter(t => t.completed).length}/{todos.length})</span>
            </div>
            {showRoadmap ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
          </button>

          {showRoadmap && (
            <div className="px-10 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {todos.map((todo, idx) => (
                <div key={idx} className="flex items-center space-x-4 group">
                  {todo.completed ? (
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                  ) : (
                    <Circle size={16} className="text-gray-700 shrink-0 group-hover:text-gray-500" />
                  )}
                  <span className={`text-[11px] font-medium tracking-tight ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                    {todo.task}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative z-10 pb-40">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20 opacity-50">
             <div className="relative">
                <div className="absolute inset-[-40px] bg-primary/10 blur-[80px] rounded-full animate-pulse"></div>
                <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center relative">
                   <Bot size={40} className="text-primary/40" />
                </div>
             </div>
             <div>
                <p className="text-xs font-black uppercase tracking-[0.4em] text-white">System Standby</p>
                <p className="text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest max-w-[200px] leading-relaxed">Neural engine initialized and awaiting directives...</p>
             </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            <div className={`flex items-start max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-4`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xl ${
                m.role === 'user'
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-primary/10 border-primary/20 text-primary'
              }`}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>

              <div className={`p-6 rounded-[2rem] text-sm leading-relaxed shadow-xl ${
                m.role === 'user'
                  ? 'bg-white/10 text-white border border-white/10 rounded-tr-none'
                  : 'bg-white/[0.03] text-gray-200 border border-white/5 rounded-tl-none'
              }`}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl max-w-none text-[13px] font-medium tracking-tight markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-[13px] font-medium tracking-tight">{m.content}</div>
                )}

                {m.tool_calls && m.tool_calls.map((call, idx) => (
                  <div key={idx} className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center space-x-4 animate-pulse">
                     <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Terminal size={14} />
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <div className="text-[9px] font-black uppercase tracking-widest text-primary/60">Executing Neural Tool</div>
                        <div className="text-[10px] font-mono text-gray-500 truncate mt-1">
                           {call.function.name}({JSON.stringify(call.function.arguments).substring(0, 40)}...)
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent z-20">
        <form
          onSubmit={handleSubmit}
          className="relative group max-w-3xl mx-auto"
        >
          <div className="absolute inset-0 bg-primary/10 blur-[30px] rounded-[2.5rem] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          <div className="relative bg-[#111] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl focus-within:border-primary/50 transition-all flex items-center space-x-3 pr-5">
            <div className="p-4 bg-white/5 rounded-2xl text-gray-500 group-focus-within:text-primary transition-colors">
               <Command size={20} />
            </div>
            <textarea
              rows="1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Direct neural engine..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm py-4 resize-none max-h-40 custom-scrollbar font-medium placeholder:text-gray-700"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className={`p-4 rounded-2xl transition-all shadow-lg active:scale-95 ${
                input.trim() && !isGenerating
                  ? 'bg-primary text-black hover:shadow-[0_0_30px_rgba(0,228,204,0.4)]'
                  : 'bg-white/5 text-gray-600 grayscale'
              }`}
            >
              {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
          <div className="flex items-center justify-between px-6 mt-4">
             <div className="flex items-center space-x-2 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                <Zap size={10} className="text-primary/40" />
                <span>Onyx Core Integrated</span>
             </div>
             <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                <span className="text-primary/40">shift + enter</span> for newline
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}
