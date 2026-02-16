import React, { useEffect, useRef, useState } from 'react';

export default function OnyxTerminal({ shell }) {
  const [lines, setLines] = useState([{ text: 'Onyx Terminal v1.4', type: 'system' }]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const disposersRef = useRef([]);

  useEffect(() => {
    if (!shell) {
      if (lines.length === 0 || lines[lines.length - 1]?.text !== 'Waiting for terminal connection...') {
         setLines(prev => [...prev, { text: 'Waiting for terminal connection...', type: 'system' }]);
      }
      return;
    }

    const setupOutput = () => {
      try {
        // Clear previous disposers
        disposersRef.current.forEach(d => d.dispose && d.dispose());
        disposersRef.current = [];

        // Handle shell.onOutput (Standard interactive shell)
        if (shell.onOutput) {
          const d = shell.onOutput((data) => {
            setLines(prev => [...prev, { text: data, type: 'output' }]);
          });
          disposersRef.current.push(d);
        }
        // Handle shell.stdout/stderr streams (Commands API)
        else if (shell.stdout && shell.stderr) {
          const d1 = shell.stdout.on('data', (data) => {
             setLines(prev => [...prev, { text: data.toString(), type: 'output' }]);
          });
          const d2 = shell.stderr.on('data', (data) => {
             setLines(prev => [...prev, { text: data.toString(), type: 'error' }]);
          });
          disposersRef.current.push({ dispose: () => { d1.dispose?.(); d2.dispose?.(); } });
        } else {
          throw new Error("Terminal interface not recognized (no onOutput or stdout).");
        }

        setLines(prev => [...prev, { text: 'Terminal session synchronized.', type: 'system' }]);
        setError(null);
      } catch (err) {
        setError(err.message);
        setLines(prev => [...prev, { text: 'Terminal Binding Error: ' + err.message, type: 'error' }]);
      }
    };

    setupOutput();

    return () => {
      disposersRef.current.forEach(d => d.dispose && d.dispose());
    };
  }, [shell]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!shell) {
      setLines(prev => [...prev, { text: 'Terminal disconnected.', type: 'error' }]);
      return;
    }

    const cmd = input;
    setInput('');

    try {
      // Standard shells have .write(), commands tasks have .stdin.write()
      if (shell.write) {
        await shell.write(cmd + '\n');
      } else if (shell.stdin && shell.stdin.write) {
        await shell.stdin.write(cmd + '\n');
      } else {
        throw new Error("Shell does not support input.");
      }
    } catch (err) {
      setLines(prev => [...prev, { text: 'Input Error: ' + err.message, type: 'error' }]);
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

        {error && (
          <div className="mt-2 p-3 bg-red-950/30 border border-red-900/50 rounded text-red-400 text-[10px]">
             {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-2 border-t border-white/5 pt-2">
           <span className="text-primary font-bold shrink-0">onyx-app $</span>
           <form onSubmit={handleSubmit} className="flex-1">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder={shell ? "Run command..." : "Terminal Offline"}
               className="w-full bg-transparent outline-none border-none text-white caret-primary placeholder:text-gray-800"
               disabled={!shell}
               autoFocus
             />
           </form>
        </div>
      </div>
    </div>
  );
}
