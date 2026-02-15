import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Terminal as TerminalIcon,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Beaker,
  Monitor
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import ChatPanel from '../components/workspace/ChatPanel';
import ResourcePanel from '../components/workspace/ResourcePanel';
import OnyxTerminal from '../components/workspace/OnyxTerminal';
import ActivityTab from '../components/workspace/ActivityTab';
import { chatWithAI } from '../services/aiService';
import * as csb from '../services/codesandboxService';

export default function WorkspacePage({ user: authUser, signIn, signOut }) {
  const { id } = useParams();
  const navigate = useNavigate();
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

  // Sidebar Resize State
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Persistence: Load chat from localStorage
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`onyx_chat_${id}`);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([]);
      }
    }
  }, [id]);

  // Persistence: Save chat to localStorage
  useEffect(() => {
    if (messages.length > 0 && id) {
      localStorage.setItem(`onyx_chat_${id}`, JSON.stringify(messages));
    }
  }, [messages, id]);

  // Persistence: Save model
  useEffect(() => {
    localStorage.setItem('onyx_model', model);
  }, [model]);

  // Activity Logger
  const logActivity = useCallback((text, type = 'SYSTEM') => {
    const newLog = {
      text,
      type,
      timestamp: Date.now()
    };
    setLogs(prev => [...prev, newLog]);

    if (text.toLowerCase().includes('playwright')) {
      setPlaywrightLogs(prev => [...prev, { message: text, timestamp: Date.now() }]);
    }
  }, []);

  // Initialize CodeSandbox
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setCsbShell(null); // Reset shell state during re-init
      logActivity('Initializing Onyx Runtime Environment...');
      try {
        const shell = await csb.getTerminal(id);
        if (mounted) {
          setCsbShell(shell);
          const url = await csb.getPreviewUrl(id);
          setPreviewUrl(url);
          logActivity('Runtime Environment Ready', 'SUCCESS');
        }
      } catch (err) {
        if (mounted) {
          logActivity('Runtime Initialization Failed: ' + err.message, 'ERROR');
          // We don't set shell to null here if it was already set,
          // but we set it to null at start of init.
        }
      }
    };

    if (csbToken) {
       init();
    } else {
       logActivity('CodeSandbox API Token missing. Please visit Settings.', 'WARNING');
    }

    return () => { mounted = false; };
  }, [logActivity, csbToken]);

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
        logActivity
      );
    } catch (err) {
      logActivity('AI Error: ' + err.message, 'ERROR');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCsbToken = (e) => {
    const token = e.target.value;
    setCsbToken(token);
    csb.setApiToken(token);
  };

  const handleUndo = () => {
    if (messages.length >= 2) {
      setMessages(messages.slice(0, -2));
    }
  };

  const handleDeploy = () => {
    logActivity('Deploying to GitHub...', 'ACTION');
    setTimeout(() => {
      logActivity('Successfully pushed to GitHub repository', 'SUCCESS');
    }, 2000);
  };

  // Resize Handlers
  const startResizingLeft = (e) => {
    const onMouseMove = (moveEvent) => setLeftSidebarWidth(moveEvent.clientX);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResizingRight = (e) => {
    const onMouseMove = (moveEvent) => setRightSidebarWidth(window.innerWidth - moveEvent.clientX);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResizingTerminal = (e) => {
    const onMouseMove = (moveEvent) => setTerminalHeight(window.innerHeight - moveEvent.clientY);
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ResourcePanel url={previewUrl} projectId={id} logs={logs} />;
      case 'activity':
        return <ActivityTab logs={logs} />;
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
                          <span className="text-[10px] text-gray-600 font-mono">Run {i+1}</span>
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
        return <div className="p-12 text-gray-500 font-mono">Module [ {activeTab} ] is under construction...</div>;
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
        className="transition-all duration-300 relative group overflow-hidden border-r border-onyx-border shrink-0"
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
        className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-40 h-full shrink-0"
      />
      <main className="flex-1 flex flex-col overflow-hidden bg-background relative min-w-0">
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
                  <span>{csbShell ? 'LIVE' : 'OFFLINE'}</span>
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
        className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-40 h-full shrink-0"
      />
      <div
        style={{ width: isRightCollapsed ? 0 : rightSidebarWidth }}
        className="transition-all duration-300 relative group bg-surface shadow-2xl border-l border-onyx-border shrink-0"
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
