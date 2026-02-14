import React, { useEffect, useRef, useState } from 'react';

export default function OnyxTerminal({ shell }) {
  const [lines, setLines] = useState([{ text: 'Onyx Terminal v1.2', type: 'system' }]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const disposerRef = useRef(null);

  useEffect(() => {
    if (!shell) {
      setLines(prev => [...prev, { text: 'Waiting for terminal connection...', type: 'system' }]);
      return;
    }

    const init = async () => {
      try {
        if (disposerRef.current) disposerRef.current.dispose();

        disposerRef.current = shell.onOutput((data) => {
          setLines(prev => [...prev, { text: data, type: 'output' }]);
        });

        setLines(prev => [...prev, { text: 'Terminal session established.', type: 'system' }]);
      } catch (err) {
        setLines(prev => [...prev, { text: 'Error: ' + err.message, type: 'error' }]);
      }
    };

    init();

    return () => {
      if (disposerRef.current) disposerRef.current.dispose();
    };
  }, [shell]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !shell) return;

    const cmd = input;
    setInput('');

    try {
      await shell.write(cmd + '\n');
    } catch (err) {
      setLines(prev => [...prev, { text: 'Failed to send: ' + err.message, type: 'error' }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] font-mono text-[11px] overflow-hidden group">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-0.5 scroll-smooth">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            {line.type === 'system' && <span className="text-amber-500 font-bold shrink-0">[SYS]</span>}
            {line.type === 'error' && <span className="text-red-500 font-bold shrink-0">[ERR]</span>}
            <pre className={`whitespace-pre-wrap break-all ${
              line.type === 'error' ? 'text-red-400' :
              line.type === 'system' ? 'text-amber-200/50' :
              'text-gray-300'
            }`}>
              {line.text}
            </pre>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-2">
           <span className="text-primary font-bold shrink-0">onyx-app $</span>
           <form onSubmit={handleSubmit} className="flex-1">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Type a command..."
               className="w-full bg-transparent outline-none border-none text-white caret-primary placeholder:text-gray-800"
               autoFocus
             />
           </form>
           <div className="w-1.5 h-3 bg-primary animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
