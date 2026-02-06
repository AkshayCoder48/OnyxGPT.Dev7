import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getWebContainer } from '../../services/webContainer';

export default function Terminal() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const shellProcessRef = useRef(null);
  const inputWriterRef = useRef(null);

  useEffect(() => {
    const initTerminal = async () => {
      if (!terminalRef.current) return;

      const term = new XTerm({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#000000',
          foreground: '#00e6d2',
          cursor: '#00e6d2',
          selectionBackground: 'rgba(0, 228, 204, 0.3)',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;

      const wc = await getWebContainer();

      // Spawn a jsh shell
      const process = await wc.spawn('jsh', {
          terminal: {
              cols: term.cols,
              rows: term.rows,
          }
      });

      shellProcessRef.current = process;
      const writer = process.input.getWriter();
      inputWriterRef.current = writer;

      process.output.pipeTo(new WritableStream({
        write(data) {
          term.write(data);
        }
      }));

      term.onData(data => {
        writer.write(data);
      });

      window.addEventListener('resize', () => fitAddon.fit());
    };

    initTerminal();

    return () => {
      if (xtermRef.current) xtermRef.current.dispose();
      if (shellProcessRef.current) shellProcessRef.current.kill();
    };
  }, []);

  return (
    <div className="h-full bg-[#0a0a0a] overflow-hidden p-2">
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}
