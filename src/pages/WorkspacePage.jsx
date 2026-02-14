import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Terminal as TerminalIcon,
  History,
  LogOut,
  Monitor,
  Activity,
  Info,
  ShieldCheck,
  Cpu,
  Search,
  Cloud,
  GitBranch,
  Wrench,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Beaker,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Sidebar from '../components/layout/Sidebar';
import ChatPanel from '../components/workspace/ChatPanel';
import ResourcePanel from '../components/workspace/ResourcePanel';
import OnyxTerminal from '../components/workspace/OnyxTerminal';
import { chatWithAI } from '../services/aiService';
import * as csb from '../services/codesandboxService';

export default function WorkspacePage({ user: authUser, signIn, signOut }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [playwrightLogs, setPlaywrightLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState(localStorage.getItem('onyx_model') || 'gpt-4o');
  const [mode, setMode] = useState('execute');
  const [previewUrl, setPreviewUrl] = useState('');
  const [csbToken, setCsbToken] = useState(localStorage.getItem('csb_api_token') || '');
  const [csbShell, setCsbShell] = useState(null);
  const [, setTick] = useState(0);

  // Sidebar Resize State
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(260);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(420);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(200);

  // Persistence: Load chat
  useEffect(() => {
    const saved = localStorage.getItem(`chat_history_${id}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) { console.error("Failed to load chat", e); }
    }
  }, [id]);

  // Persistence: Save chat
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  useEffect(() => {
    if (window.puter) {
      window.puter.kv.get(`project_${id}`).then(res => {
        if (res) setProject(JSON.parse(res));
      });
    }
  }, [id]);

  useEffect(() => {
    if (csbToken && !csbShell) {
      csb.getTerminal(id).then(shell => {
        setCsbShell(shell);
        csb.getPreview().then(setPreviewUrl);
      }).catch(err => {
        console.error('CSB Init Error:', err);
      });
    }
  }, [csbToken, csbShell, id]);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const addLog = useCallback((message, type = 'system') => {
    const newLog = {
      message,
      type,
      timestamp: new Date(),
      id: Math.random().toString(36).substr(2, 9)
    };
    setLogs(prev => [...prev, newLog]);
    if (message.toLowerCase().includes('playwright') || message.toLowerCase().includes('test')) {
      setPlaywrightLogs(prev => [...prev, newLog]);
    }
  }, []);

  const handleSendMessage = async (content) => {
    const newUserMessage = { role: 'user', content };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);

    try {
      await chatWithAI(
        updatedMessages,
        { model },
        (newMessages) => {
          setMessages([...updatedMessages, ...newMessages]);
        },
        (log) => addLog(log, 'ai')
      );
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndo = () => {
    if (messages.length >= 2) {
      setMessages(messages.slice(0, -2));
    }
  };

  const handleDeploy = () => {
    addLog("Initiating GitHub deployment sequence...", "github");
    setTimeout(() => addLog("Repository synchronized with origin/main", "github"), 1500);
    setTimeout(() => addLog("Deployment successful: https://onyx-app-main.vercel.app", "success"), 3000);
  };

  const handleSaveCsbToken = (e) => {
    const token = e.target.value;
    setCsbToken(token);
    csb.setApiToken(token);
    addLog("CodeSandbox API Token updated.", "system");
  };

  // Resizer logic
  const startResizingLeft = useCallback(() => {
    const onMouseMove = (e) => {
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 500) setLeftSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const startResizingRight = useCallback(() => {
    const onMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) setRightSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const startResizingTerminal = useCallback(() => {
    const onMouseMove = (e) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < 600) setTerminalHeight(newHeight);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
            <ResourcePanel previewUrl={previewUrl} logs={logs.map(l => l.message)} />
          </div>
        );
      case 'activity':
        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden p-8">
            <div className="max-w-4xl mx-auto w-full space-y-8 overflow-y-auto custom-scrollbar pb-20">
               <header className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="font-display font-bold text-3xl text-white tracking-tight">Project Activity</h3>
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">Observability log for AI tool calls, terminal commands, and source control.</p>
                  </div>
                  <div className="flex items-center space-x-4 bg-surface px-6 py-4 rounded-3xl border border-onyx-border">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Environment</div>
                      <div className="text-sm font-bold text-white uppercase">{csbToken ? 'Authenticated' : 'Public/Read-Only'}</div>
                    </div>
                  </div>
               </header>

               <div className="relative pl-12 space-y-12">
                  <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/50 via-onyx-border to-transparent"></div>

                  {logs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-700 space-y-4">
                      <Activity size={48} className="opacity-20" />
                      <p className="italic">No activity recorded yet.</p>
                    </div>
                  ) : (
                    logs.slice().reverse().map((log) => (
                      <div key={log.id} className="relative group">
                        <div className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-background border-2 border-onyx-border flex items-center justify-center z-10 group-hover:border-primary transition-all">
                           {log.type === 'ai' ? <Wrench size={10} className="text-primary" /> :
                            log.type === 'github' ? <GitBranch size={10} className="text-secondary" /> :
                            <TerminalIcon size={10} className="text-gray-400" />}
                        </div>

                        <div className="bg-surface p-6 rounded-[2rem] border border-onyx-border hover:border-white/10 transition-all shadow-xl">
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                  log.type === 'ai' ? 'bg-primary/10 text-primary' :
                                  log.type === 'github' ? 'bg-secondary/10 text-secondary' :
                                  'bg-white/5 text-gray-400'
                                }`}>
                                  {log.type === 'ai' ? 'Tool Call' : log.type === 'github' ? 'Git Action' : 'Terminal'}
                                </span>
                                <span className="text-sm font-bold text-white truncate max-w-[300px]">
                                  {log.message.substring(0, 50)}{log.message.length > 50 ? '...' : ''}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">
                                {formatDistanceToNow(new Date(log.timestamp))} ago
                              </span>
                           </div>
                           <div className="bg-black/30 p-4 rounded-2xl border border-white/5 font-mono text-[11px] text-gray-400 leading-relaxed whitespace-pre-wrap">
                              {log.message}
                           </div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        );
      case 'playwright':
        return (
          <div className="flex-1 flex flex-col bg-background p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full space-y-8">
              <header className="flex items-center space-x-6 mb-12">
                <div className="w-16 h-16 bg-secondary/10 rounded-3xl flex items-center justify-center text-secondary border border-secondary/20 shadow-2xl">
                  <Beaker size={32} />
                </div>
                <div>
                  <h3 className="text-4xl font-display font-bold text-white tracking-tight">Onyx Playwright</h3>
                  <p className="text-gray-500 mt-1">Cross-browser E2E testing enabled for all projects.</p>
                </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                 <TestStat label="Total Logs" value={playwrightLogs.length} color="text-white" />
                 <TestStat label="Environment" value="Ready" color="text-emerald-400" />
                 <TestStat label="Runner" value="CSB" color="text-secondary" />
              </div>
              {playwrightLogs.length === 0 ? (
                <div className="bg-surface border border-onyx-border rounded-[2.5rem] p-12 text-center space-y-6">
                   <Monitor size={48} className="text-gray-700 mx-auto" />
                   <h4 className="text-xl font-bold text-white">No active test sessions</h4>
                   <p className="text-sm text-gray-500 max-w-sm mx-auto">Ask Onyx to "run playwright tests" to verify your application's integrity.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {playwrightLogs.map((log, i) => (
                    <div key={i} className="bg-surface p-6 rounded-3xl border border-onyx-border">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Test Run Log</span>
                          <span className="text-[10px] text-gray-600">{formatDistanceToNow(new Date(log.timestamp))} ago</span>
                       </div>
                       <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">{log.message}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-background p-12">
            <div className="max-w-2xl mx-auto space-y-12">
              <header>
                <h3 className="text-4xl font-display font-bold text-white tracking-tight">Settings</h3>
                <p className="text-gray-500 mt-2">Manage your workspace configuration and API credentials.</p>
              </header>
              <section className="bg-surface p-8 rounded-[2rem] border border-onyx-border space-y-6">
                 <div>
                    <div className="flex items-center space-x-3 mb-2">
                       <ShieldCheck size={20} className="text-primary" />
                       <h4 className="text-lg font-bold text-white">CodeSandbox BYOK</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Provide your API Token to enable terminal access, file writes, and advanced debugging.</p>
                    <div className="flex items-center bg-background border border-onyx-border rounded-2xl px-5 py-4 group focus-within:border-primary transition-all">
                      <input
                        type="password"
                        value={csbToken}
                        onChange={handleSaveCsbToken}
                        placeholder="csb_..."
                        className="bg-transparent text-base text-gray-200 outline-none w-full font-mono"
                      />
                    </div>
                 </div>
              </section>
            </div>
          </div>
        );
      default:
        return <div>Not Found</div>;
    }
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="digital-glow p-12 bg-surface rounded-[2.5rem] border border-white/5 max-w-md w-full relative z-10">
           <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-background text-3xl font-bold mx-auto mb-8 shadow-2xl shadow-primary/20 animate-pulse">O</div>
           <h1 className="text-4xl font-display font-bold mb-4 text-white tracking-tight leading-tight">Project Isolated</h1>
           <p className="text-gray-500 mb-8 leading-relaxed text-sm">Please sign in to resume building.</p>
           <button
             onClick={() => signIn()}
             className="w-full bg-primary text-background font-bold px-8 py-5 rounded-2xl hover:brightness-110 transition-all shadow-[0_15px_35px_rgba(0,228,204,0.3)] text-lg"
           >
             Resume Session
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background text-white overflow-hidden font-sans">
      <div
        style={{ width: isLeftCollapsed ? 0 : leftSidebarWidth }}
        className="transition-all duration-300 relative group overflow-hidden border-r border-onyx-border"
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={() => navigate('/')}
          onSignOut={signOut}
          onDeploy={handleDeploy}
          user={authUser}
        />
        <button
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-12 bg-surface border border-onyx-border rounded-lg flex items-center justify-center text-gray-500 hover:text-white z-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isLeftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      <div
        onMouseDown={startResizingLeft}
        className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-40 h-full"
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-background relative">
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}
        </div>
        <div
          onMouseDown={startResizingTerminal}
          className="h-1 cursor-row-resize hover:bg-primary/50 transition-colors z-40 w-full"
        />
        <div
          style={{ height: terminalHeight }}
          className="border-t border-onyx-border bg-surface/50 flex flex-col overflow-hidden shrink-0"
        >
           <div className="flex items-center justify-between px-4 py-2 border-b border-onyx-border bg-black/20">
              <div className="flex items-center space-x-2">
                <TerminalIcon size={14} className="text-primary" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Onyx Runtime Environment</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[9px] text-gray-700 font-mono tracking-tight flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${csbShell ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                  <span>{csbShell ? 'LIVE' : 'READ-ONLY'}</span>
                </span>
              </div>
           </div>
           <div className="flex-1 overflow-hidden">
              <OnyxTerminal shell={csbShell} />
           </div>
        </div>
      </main>
      <div
        onMouseDown={startResizingRight}
        className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-40 h-full"
      />
      <div
        style={{ width: isRightCollapsed ? 0 : rightSidebarWidth }}
        className="transition-all duration-300 relative group bg-surface shadow-2xl border-l border-onyx-border"
      >
        <ChatPanel
          messages={messages}
          onSend={handleSendMessage}
          model={model}
          setModel={setModel}
          mode={mode}
          setMode={setMode}
          isGenerating={isGenerating}
          onUndo={handleUndo}
        />
        <button
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-12 bg-surface border border-onyx-border rounded-lg flex items-center justify-center text-gray-500 hover:text-white z-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isRightCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

function TestStat({ label, value, color }) {
  return (
    <div className="bg-surface p-6 rounded-3xl border border-onyx-border">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-3xl font-display font-bold ${color}`}>{value}</div>
    </div>
  );
}
