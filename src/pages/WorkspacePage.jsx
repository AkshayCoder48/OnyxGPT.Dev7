import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import ChatPanel from '../components/workspace/ChatPanel';
import Sidebar from '../components/layout/Sidebar';
import {
  Terminal as TerminalIcon,
  Monitor,
  History,
  LogOut,
  Loader2,
  AlertTriangle,
  Info,
  Folder,
  ArrowRight
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessages, getProjectMessages, saveProject, getProjects, getGitHubToken } from '../services/storage';
import { generateRandomName } from '../utils/names';
import { getWebContainer, listFiles, readFile as wcReadFile, teardown, restartWebContainer } from '../services/webContainer';
import CloudView from '../components/workspace/CloudView';
import * as github from '../services/githubService';

class ActivityErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-8 text-center bg-background">
          <div className="space-y-4 max-w-md">
            <AlertTriangle size={48} className="text-red-500 mx-auto" />
            <h3 className="text-xl font-bold text-white">Activity Feed Crashed</h3>
            <p className="text-gray-400 text-sm leading-relaxed">The activity log encountered an unexpected error. This is often caused by malformed log data.</p>
            <button onClick={() => this.setState({ hasError: false })} className="px-6 py-2 bg-primary text-background font-bold rounded-lg hover:brightness-110 transition-all">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('onyx_settings');
    return saved ? JSON.parse(saved) : { customModelId: 'gpt-4o' };
  });
  const [model, setModel] = useState(appSettings.customModelId);
  const [mode, setMode] = useState('execute');
  const [logs, setLogs] = useState(['Initializing Onyx Environment...', 'User authenticated.']);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);

  const hasInitialized = useRef(false);
  const webContainerStarted = useRef(false);
  const currentProjectId = useRef(code);

  useEffect(() => {
    if (code && code !== 'new' && code !== currentProjectId.current && webContainerStarted.current) {
      currentProjectId.current = code;
      handleRestartWebContainer();
    }
  }, [code]);

  useEffect(() => {
    setAppSettings(prev => ({ ...prev, customModelId: model }));
  }, [model]);

  useEffect(() => {
    const loadProject = async () => {
      const projects = await getProjects();
      setAllProjects(projects);
      if (code && code !== 'new') {
        const p = projects.find(proj => proj.id === code);
        if (p) setProject(p);
      }
    };
    loadProject();
    checkGitHub();
  }, [code]);

  const checkGitHub = async () => {
    const token = await getGitHubToken();
    setGhConnected(!!token);
  };

  useEffect(() => {
    const initWC = async () => {
      if (!webContainerStarted.current) {
        webContainerStarted.current = true;
        try {
          addLog('Booting WebContainer...');
          await getWebContainer();
          addLog('WebContainer ready.');
        } catch (err) {
          addLog(`WebContainer Error: ${err.message}`);
        }
      }
    };
    initWC();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (code && code !== 'new' && !hasInitialized.current) {
        const data = await getProjectMessages(code);
        if (data && data.length > 0) {
          setMessages(data);
          hasInitialized.current = true;
        }
      }
    };
    loadData();
  }, [code]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isGenerating && !hasInitialized.current) {
      handleSendMessage(initialPrompt);
      hasInitialized.current = true;
    } else if (messages.length === 0 && !hasInitialized.current && code !== 'new') {
      setMessages([{ role: 'assistant', content: "Hello! I'm Onyx. I've initialized your cloud environment. What would you like to build today?" }]);
    }
  }, [initialPrompt, messages.length, code]);

  const addLog = (log) => {
    setLogs(prev => [...prev, typeof log === 'string' ? log : JSON.stringify(log)]);
  };

  const handleSendMessage = async (content) => {
    if (isGenerating) return;
    setIsGenerating(true);

    let projectId = code;
    if (!projectId || projectId === 'new') {
      projectId = Math.random().toString(36).substring(2, 7).toUpperCase();
      const newProject = { id: projectId, name: generateRandomName(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await saveProject(newProject);
      setProject(newProject);
      navigate(`/project/${projectId}`, { replace: true });
    }

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveMessages(projectId, newMessages);

    try {
      let latestMsgs = newMessages;
      await chatWithAI(
        newMessages,
        {
          model: model,
          onUrlReady: (url) => {
            setPreviewUrl(url);
          },
          systemPrompt: PROMPTS[mode] || PROMPTS.execute
        },
        async (updatedAssistantMsg) => {
          const finalMsgs = [...newMessages, updatedAssistantMsg];
          setMessages(finalMsgs);
          latestMsgs = finalMsgs;
        },
        (log) => addLog(log)
      );
      await saveMessages(projectId, latestMsgs);
    } catch (err) {
      addLog(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndo = () => {
    if (messages.length > 0) {
      const newMsgs = messages.slice(0, -1);
      setMessages(newMsgs);
      saveMessages(code, newMsgs);
    }
  };
  const handleRestartWebContainer = async () => {
    try {
      addLog('Initiating WebContainer restart sequence...');
      setLogs(['Initializing Onyx Environment...', 'User authenticated.', 'Restarting WebContainer...']);
      await restartWebContainer();
      addLog('WebContainer restarted successfully.');
    } catch (err) {
      addLog(`WebContainer Restart Error: ${err.message}`);
    }
  };

  const handleStopWebContainer = async () => {
    try {
      addLog('Shutting down WebContainer...');
      await teardown();
      addLog('WebContainer stopped.');
    } catch (err) {
      addLog(`WebContainer Stop Error: ${err.message}`);
    }
  };

  const handleDeploy = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    addLog("Starting GitHub deployment...");
    try {
      const ghUser = await github.getUser();
      const rawName = project?.name || 'onyx-project';
      const repoName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(7);
      const repo = await github.createRepository(repoName, 'Created via OnyxGPT.dev');

      const filesToPush = [];
      const traverse = async (path) => {
        const entries = await listFiles(path);
        for (const entry of entries) {
          if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
          const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
          try {
            const content = await wcReadFile(fullPath);
            filesToPush.push({ path: fullPath.substring(1), content });
          } catch { await traverse(fullPath); }
        }
      };

      await traverse('/');
      await github.pushFiles(ghUser.login, repo.name, 'main', filesToPush);
      addLog("Deployment successful!");
      window.open(repo.html_url, '_blank');
    } catch (err) {
      addLog(`Deployment failed: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="flex-1 flex flex-col bg-background relative overflow-hidden min-w-0">
            <div className="flex-1 flex flex-col">
              <div className="bg-surface p-2 border-b border-onyx-border flex items-center px-4 shrink-0 justify-between">
                <div className="flex-1 max-w-xl bg-background border border-onyx-border rounded-md px-3 py-1.5 text-[11px] text-gray-500 font-mono overflow-hidden truncate">
                  {previewUrl || 'Waiting for development server to start...'}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                   <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">HMR Active</span>
                  </div>
                </div>
              </div>
              {previewUrl ? (
                <iframe src={previewUrl} className="flex-1 w-full bg-white shadow-2xl" title="Live Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 flex-col space-y-4">
                  <div className="animate-pulse bg-surface h-32 w-48 rounded-2xl border border-onyx-border relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white mb-1 tracking-tight">Booting Engine</p>
                    <p className="text-xs text-gray-600">Spinning up virtual runtime...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'projects':
        return (
          <div className="flex-1 flex flex-col bg-background p-12 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
            <header className="mb-12">
              <h2 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Project Hub</h2>
              <p className="text-gray-500 text-lg">Switch environments or start something new.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/project/${p.id}`)}
                  className="p-6 rounded-3xl bg-surface border border-onyx-border hover:border-primary/50 transition-all text-left group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={24} className="text-primary" />
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-primary mb-6 border border-onyx-border">
                    <Folder size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{p.name}</h4>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-4">Last modified: {new Date(p.updatedAt).toLocaleDateString()}</p>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 rounded bg-background border border-onyx-border text-[9px] font-bold text-gray-600">ID: {p.id}</span>
                    {p.id === code && <span className="px-2 py-1 rounded bg-primary/20 border border-primary/20 text-[9px] font-bold text-primary tracking-widest uppercase">Active Now</span>}
                  </div>
                </button>
              ))}
              <button
                onClick={() => navigate('/')}
                className="p-6 rounded-3xl bg-background border border-onyx-border border-dashed hover:border-primary\/50 transition-all text-center flex flex-col items-center justify-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white\/5 flex items-center justify-center text-gray-500 mb-4 group-hover:text-primary transition-colors">
                  <ArrowRight size={24} className="-rotate-45" />
                </div>
                <h4 className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">Create New Project</h4>
              </button>
            </div>
          </div>
        );
      case 'activity':
        return (
          <ActivityErrorBoundary>
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
               <div className="flex items-center justify-between px-8 py-6 border-b border-onyx-border bg-surface/30">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                      <Activity size={20} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl text-white tracking-tight">System Activity</h3>
                      <p className="text-xs text-gray-500">Real-time event stream from WebContainer.</p>
                    </div>
                  </div>
                  <button onClick={() => setLogs([])} className="px-4 py-2 rounded-xl bg-background border border-onyx-border text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-all">Clear Feed</button>
               </div>
               <div className="p-8 flex-1 font-mono text-[11px] overflow-y-auto custom-scrollbar space-y-3">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
                        <Info size={32} />
                      </div>
                      <p className="text-sm italic">Feed is empty.</p>
                    </div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex items-start space-x-4 group hover:bg-white/5 p-3 rounded-2xl transition-all border border-transparent hover:border-onyx-border">
                        <div className="w-2 h-2 rounded-full bg-primary/40 mt-1.5 shrink-0 group-hover:animate-ping"></div>
                        <div className="flex-1 space-y-1">
                          <span className="text-gray-300 whitespace-pre-wrap leading-relaxed block">{log}</span>
                          <div className="text-[9px] text-gray-600 font-bold opacity-40 group-hover:opacity-100 transition-opacity">0ms ago • system.event_log</div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </ActivityErrorBoundary>
        );
      case 'playwright':
        return (
          <div className="flex-1 flex flex-col bg-background items-center justify-center p-12 text-center">
             <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-secondary/5 blur-[150px] rounded-full pointer-events-none"></div>
            <div className="w-24 h-24 bg-secondary/10 rounded-[2.5rem] flex items-center justify-center text-secondary mb-8 border border-secondary/20 shadow-2xl shadow-secondary/20 relative z-10">
              <TestTube2 size={48} />
            </div>
            <h3 className="text-4xl font-display font-bold text-white mb-4 tracking-tight relative z-10">Playwright Test Runner</h3>
            <p className="text-gray-400 max-w-md text-lg leading-relaxed mb-12 relative z-10">
              Execute cross-browser tests against your Onyx deployments. High-fidelity E2E testing integrated directly into your IDE.
            </p>
            <div className="inline-flex items-center space-x-3 bg-secondary/10 px-6 py-3 rounded-full border border-secondary/20 text-xs font-bold text-secondary uppercase tracking-widest animate-pulse relative z-10">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span>Available in Onyx Enterprise</span>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 flex flex-col bg-background p-12 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar">
            <header className="mb-12">
              <h2 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Settings</h2>
              <p className="text-gray-500 text-lg">Manage your cloud environment and preferences.</p>
            </header>

            <div className="space-y-8">
              <section className="bg-surface p-8 rounded-[2rem] border border-onyx-border space-y-6">
                 <div>
                    <div className="flex items-center space-x-3 mb-2">
                       <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary"><Monitor size={16} /></div>
                       <h4 className="text-lg font-bold text-white">Inference Engine</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Select the LLM model used for code generation and task execution.</p>
                    <div className="flex items-center bg-background border border-onyx-border rounded-2xl px-5 py-4 group focus-within:border-primary transition-all">
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="e.g. gpt-4o"
                        className="bg-transparent text-base text-gray-200 outline-none w-full font-mono"
                      />
                    </div>
                 </div>
              </section>

              <section className="bg-surface p-8 rounded-[2rem] border border-onyx-border space-y-6">
                 <div>
                    <div className="flex items-center space-x-3 mb-2">
                       <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400"><TerminalIcon size={16} /></div>
                       <h4 className="text-lg font-bold text-white">Danger Zone</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Irreversible actions that affect your virtual project instance.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button
                        onClick={handleRestartWebContainer}
                        className="flex items-center justify-between p-6 rounded-[1.5rem] border border-onyx-border hover:bg-white/5 transition-all text-left group"
                      >
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Full Reboot</p>
                          <p className="text-xs text-gray-600">Restarts the WebContainer</p>
                        </div>
                        <History size={20} className="text-gray-700 group-hover:text-primary transition-colors" />
                      </button>
                      <button
                        onClick={handleStopWebContainer}
                        className="flex items-center justify-between p-6 rounded-[1.5rem] border border-onyx-border hover:bg-red-400/5 transition-all text-left group"
                      >
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">Teardown Instance</p>
                          <p className="text-xs text-gray-600">Stop all background tasks</p>
                        </div>
                        <LogOut size={20} className="text-gray-700 group-hover:text-red-400 transition-colors" />
                      </button>
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

  if (!user) {
     return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
        <div className="digital-glow p-12 bg-surface rounded-[2.5rem] border border-white/5 max-w-md w-full relative z-10">
           <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-background text-3xl font-bold mx-auto mb-8 shadow-2xl shadow-primary/20 animate-pulse">O</div>
           <h1 className="text-4xl font-display font-bold mb-4 text-white tracking-tight leading-tight">Project Isolated</h1>
           <p className="text-gray-500 mb-8 leading-relaxed text-sm">
             This workspace is encrypted and scoped to your Puter identity. Please sign in to resume building.
           </p>
           <button onClick={signIn} className="w-full bg-primary text-background font-bold px-8 py-5 rounded-2xl hover:brightness-110 transition-all shadow-[0_15px_35px_rgba(0,228,204,0.3)] text-lg">
             Resume Session
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background text-white overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectName={project?.name}
        onBack={() => navigate('/')}
        onSignOut={signOut}
        user={user}
        ghConnected={ghConnected}
        onDeploy={handleDeploy}
      />

      <main className="flex-1 flex overflow-hidden bg-background">
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderContent()}

          {/* Terminal Drawer (Enhanced) */}
          <div className="h-48 border-t border-onyx-border bg-surface/50 flex flex-col overflow-hidden shrink-0">
             <div className="flex items-center justify-between px-4 py-2 border-b border-onyx-border bg-black/20">
                <div className="flex items-center space-x-2">
                  <TerminalIcon size={14} className="text-primary" />
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Onyx Terminal Runtime</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[9px] text-gray-700 font-mono tracking-tight flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>ENGINE READY</span>
                  </span>
                  <div className="h-3 w-[1px] bg-onyx-border"></div>
                  <button onClick={handleRestartWebContainer} className="text-gray-500 hover:text-white transition-colors" title="Refresh Terminal"><History size={12} /></button>
                </div>
             </div>
             <div className="flex-1 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar bg-black/40">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-primary font-bold">onyx-app $</span>
                  <span className="text-gray-300">npm run dev</span>
                </div>
                <div className="text-gray-500 leading-relaxed">
                  {logs.slice(-5).map((l, i) => (
                    <div key={i} className="truncate opacity-50 flex items-center gap-2">
                      <span className="text-primary/30">➜</span>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center mt-2">
                   <span className="text-primary mr-2 font-bold">onyx-app $</span>
                   <span className="w-1.5 h-3 bg-primary animate-pulse"></span>
                </div>
             </div>
          </div>
        </div>

        <div className="w-[420px] 2xl:w-[480px] flex flex-col bg-surface shadow-2xl shrink-0 border-l border-onyx-border relative z-20">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            model={model}
            setModel={setModel}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating}
            onUndo={handleUndo}
            onAttachContext={() => {}}
          />
        </div>
      </main>
    </div>
  );
}

function Activity({ size, className }) { return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>; }
function TestTube2({ size, className }) { return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7 6.82 21.18a2.83 2.83 0 0 1-3.99-.01a2.83 2.83 0 0 1 0-4L17 3z"/><path d="m16 2 6 6"/><path d="M12 16H4"/></svg>; }
