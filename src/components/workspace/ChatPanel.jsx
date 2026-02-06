import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronRight, Activity, Paperclip, Undo2, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';

export default function ChatPanel({ messages, onSendMessage, isProcessing }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-onyx-dark overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-onyx-border/50 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-onyx-text">Assistant History</span>
        <button className="text-onyx-text hover:text-white">
          <Activity className="w-3 h-3" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex flex-col gap-2",
            msg.role === 'user' ? "items-end" : "items-start"
          )}>
            {msg.role !== 'user' && (
              <div className="flex items-center gap-2 mb-1">
                 <div className="size-6 rounded-full bg-gradient-to-br from-onyx-light to-onyx-dark flex items-center justify-center border border-primary/30">
                    <Bot className="w-3 h-3 text-primary" />
                 </div>
                 <span className="text-[10px] font-bold text-primary uppercase">Onyx Agent</span>
              </div>
            )}

            <div className={cn(
              "max-w-[90%] space-y-2",
              msg.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-xl px-4 py-3 text-sm leading-relaxed shadow-lg",
                msg.role === 'user'
                  ? "bg-onyx-light text-white rounded-tr-sm"
                  : "bg-[#15322f] text-onyx-text border border-onyx-border"
              )}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    components={{
                      code({inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md my-2"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={cn("bg-black/40 px-1 rounded", className)} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>

              {/* Tool Execution Logs (Accordion style for Assistant) */}
              {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="ml-2 border-l-2 border-onyx-border pl-4 w-full">
                   <details className="group bg-[#132c2a] rounded-lg border border-onyx-border overflow-hidden transition-all duration-300">
                      <summary className="flex cursor-pointer items-center justify-between p-2 select-none">
                        <div className="flex items-center gap-2">
                           <Activity className="w-3 h-3 text-primary animate-spin" />
                           <span className="text-white text-[10px] font-bold">Thinking Process</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-onyx-text transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-2 pb-2 pt-0 space-y-1">
                        {msg.toolCalls.map((tool, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[9px] font-mono text-onyx-text">
                            <span className="text-green-400">✔</span>
                            <span className="truncate max-w-[200px]">
                              {tool.name === "writeFile" ? `Updated ${tool.args.path}` : tool.name === "runCommand" ? `Ran ${tool.args.command}` : tool.name}
                            </span>
                          </div>
                        ))}
                      </div>
                   </details>
                </div>
              )}
            </div>

            <span className="text-[9px] text-onyx-text/50 font-mono">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isProcessing && (
          <div className="flex flex-col gap-2 items-start">
             <div className="flex items-center gap-2 mb-1">
                 <div className="size-6 rounded-full bg-gradient-to-br from-onyx-light to-onyx-dark flex items-center justify-center border border-primary/30">
                    <Bot className="w-3 h-3 text-primary animate-pulse" />
                 </div>
                 <span className="text-[10px] font-bold text-primary uppercase">Onyx Agent</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15322f] border border-onyx-border shadow-lg">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-onyx-dark border-t border-onyx-border shrink-0">
        <form onSubmit={handleSubmit} className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isProcessing}
            placeholder="Describe a change or new feature..."
            className="w-full bg-[#163532] text-white text-sm rounded-xl border border-onyx-border focus:border-primary focus:ring-1 focus:ring-primary p-3 pr-12 min-h-[50px] max-h-[200px] resize-none placeholder-onyx-text/50 font-sans transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 bottom-2 size-8 bg-primary hover:bg-[#00cbb9] text-onyx-dark rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </form>
        <div className="flex items-center gap-3 mt-2 px-1">
          <button className="text-onyx-text hover:text-white text-[10px] flex items-center gap-1 transition-colors">
            <Paperclip className="w-3 h-3" />
            Attach Context
          </button>
          <button className="text-onyx-text hover:text-white text-[10px] flex items-center gap-1 transition-colors">
            <Undo2 className="w-3 h-3" />
            Undo Last
          </button>
        </div>
      </div>
    </div>
  );
}
