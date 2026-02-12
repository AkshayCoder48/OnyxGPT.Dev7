import React, { useState, useEffect } from 'react';
import {
  Bug, Globe, Terminal, AlertCircle, Shield,
  RefreshCw, CheckCircle2, XCircle, Search, ChevronRight,
  ExternalLink, Code, Activity, Lock
} from 'lucide-react';
import { playwright } from '../../services/playwrightService';

export default function PlaywrightPanel() {
  const [state, setState] = useState(playwright.state);
  const [urlInput, setUrlInput] = useState('http://localhost:5173');

  useEffect(() => {
    return playwright.subscribe(setState);
  }, []);

  const handleNavigate = () => {
    playwright.navigate_page(urlInput);
  };

  const handleReport = () => {
    playwright.generate_bug_report();
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] overflow-hidden">
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-black/20 shrink-0">
        <div className="flex items-center space-x-2">
          <Bug size={16} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Playwright Diagnostics</span>
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={() => playwright.reset()} className="p-1.5 text-gray-600 hover:text-white transition-colors">
              <RefreshCw size={14} />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <section className="p-6 border-b border-white/5">
           <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-all font-mono"
                  placeholder="Target URL..."
                />
              </div>
              <button
                onClick={handleNavigate}
                disabled={state.isNavigating}
                className="bg-primary text-[#0A0A0A] font-bold px-6 py-2.5 rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {state.isNavigating ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                <span>{state.isNavigating ? 'Analyzing...' : 'Run Diagnostics'}</span>
              </button>
           </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
           <Panel label="Network Inspection" icon={<Activity size={14} />}>
              <div className="space-y-1">
                 {state.networkLogs.length > 0 ? (
                    state.networkLogs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-[10px] font-mono">
                        <div className="flex items-center space-x-3 overflow-hidden">
                           <span className="text-primary font-bold">{log.method}</span>
                           <span className="text-gray-400 truncate">{log.url}</span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0 ml-4">
                           <span className="text-gray-600">{log.duration}</span>
                           <span className={log.status >= 400 ? 'text-red-400' : 'text-green-500'}>{log.status}</span>
                        </div>
                      </div>
                    ))
                 ) : (
                    <div className="py-10 text-center text-gray-700 italic text-[10px]">No network traffic recorded.</div>
                 )}
              </div>
           </Panel>

           <Panel label="Console & Errors" icon={<Terminal size={14} />}>
              <div className="space-y-2">
                 {state.consoleLogs.concat(state.runtimeErrors).length > 0 ? (
                    state.consoleLogs.map((log, i) => (
                       <div key={i} className="p-2 rounded-lg bg-white/5 text-[10px] font-mono border-l-2 border-primary/40">
                          {log.text}
                       </div>
                    ))
                 ) : (
                    <div className="py-10 text-center text-gray-700 italic text-[10px]">No logs detected.</div>
                 )}
              </div>
           </Panel>

           <Panel label="Security Checks" icon={<Shield size={14} />}>
              <div className="space-y-4">
                 <SecurityItem label="HTTPS Redirect" status={state.security.https ? 'pass' : 'fail'} />
                 <SecurityItem label="CSP Headers" status={state.security.csp === 'pass' ? 'pass' : 'warn'} sub={state.security.csp} />
                 <SecurityItem label="Secure Cookies" status={state.cookies.length > 0 ? 'pass' : 'warn'} />
              </div>
           </Panel>

           <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                 <Bug size={120} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                 <AlertCircle size={20} className="text-primary" />
                 <span>Automated Bug Report</span>
              </h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                 Generates an AI-powered summary of architectural flaws and browser-level errors found during the session.
              </p>

              {state.diagnosticReport ? (
                 <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-bottom-2">
                    {state.diagnosticReport.issues.map((issue, i) => (
                       <div key={i} className="flex items-start space-x-3">
                          <div className={`mt-0.5 ${issue.severity === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>
                             <AlertCircle size={14} />
                          </div>
                          <div>
                             <div className="text-[11px] font-bold text-white uppercase tracking-wider">{issue.severity} Severity</div>
                             <div className="text-xs text-gray-400">{issue.message}</div>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : null}

              <button
                onClick={handleReport}
                className="w-full bg-white text-black font-bold py-3 rounded-xl text-xs hover:brightness-90 transition-all flex items-center justify-center space-x-2"
              >
                <Code size={14} />
                <span>{state.diagnosticReport ? 'Regenerate Report' : 'Generate Full Report'}</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ label, icon, children }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
       <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center space-x-2">
             <div className="text-primary">{icon}</div>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</span>
          </div>
          <ChevronRight size={12} className="text-gray-700" />
       </div>
       <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {children}
       </div>
    </div>
  );
}

function SecurityItem({ label, status, sub }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
       <div className="flex items-center space-x-3">
          {status === 'pass' ? <CheckCircle2 size={16} className="text-green-500" /> :
           status === 'fail' ? <XCircle size={16} className="text-red-500" /> :
           <AlertCircle size={16} className="text-yellow-500" />}
          <div>
             <div className="text-xs font-bold text-white">{label}</div>
             {sub && <div className="text-[9px] text-gray-600 font-mono">{sub}</div>}
          </div>
       </div>
       <div className={`text-[9px] font-bold uppercase tracking-widest ${
          status === 'pass' ? 'text-green-500' : status === 'fail' ? 'text-red-500' : 'text-yellow-500'
       }`}>
          {status}
       </div>
    </div>
  );
}
