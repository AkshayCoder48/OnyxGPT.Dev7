import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import * as wc from '../../services/webContainer';

export default function TerminalPanel() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerminal({
      cursorBlink: true,
      theme: {
        background: '#0A0A0A',
        foreground: '#FFFFFF',
        cursor: '#3B82F6',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
      },
      fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace',
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    // Connect to WebContainer shell
    let shellProcess;
    const startShell = async () => {
      try {
        const instance = await wc.getWebContainer();
        shellProcess = await instance.spawn('jsh', {
           terminal: {
             cols: term.cols,
             rows: term.rows,
           }
        });

        shellProcess.output.pipeTo(new WritableStream({
          write(data) {
            term.write(data);
          }
        }));

        const input = shellProcess.input.getWriter();
        term.onData((data) => {
          input.write(data);
        });

        window.addEventListener('resize', () => fitAddon.fit());
      } catch (err) {
        term.write('\r\n\x1b[31mError connecting to shell: ' + err.message + '\x1b[0m\r\n');
      }
    };

    startShell();

    return () => {
      if (shellProcess) shellProcess.kill();
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full w-full bg-[#0A0A0A] p-2 overflow-hidden">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
  );
}
