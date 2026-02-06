import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import ChatPanel from '../components/workspace/ChatPanel';
import SettingsModal from '../components/workspace/SettingsModal';
import {
  LogOut,
  Settings,
  Terminal as TerminalIcon,
  Monitor,
  Cloud,
  ChevronLeft,
  Layout,
  History,
  FileCode,
  Box,
  Github,
  Globe,
  Loader2,
  RefreshCcw,
  Layers,
  Search,
  Activity,
  Cpu,
  Zap,
  Trash2
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessages, getProjectMessages, saveProject, getProjects, getGitHubToken } from '../services/storage';
import { generateRandomName } from '../utils/names';
import { getWebContainer, listFiles, readFile as wcReadFile } from '../services/webContainer';
import CloudView from '../components/workspace/CloudView';
import * as github from '../services/githubService';

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';

  const [activeAmenity, setActiveAmenity] = useState('preview');
  const [messages, setMessages] = useState([]);
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem(`onyx_settings_${code}`);
    return saved ? JSON.parse(saved) : {
        customModelId: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: ''
    };
  });
  const [model, setModel] = useState(appSettings.customModelId);
  const [mode, setMode] = useState('execute');
  const [logs, setLogs] = useState(['ONYX: Boot sequence initiated...', 'AUTH: Session verified.']);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);

  const hasInitialized = useRef(false);
  const webContainerStarted = useRef(false);

  useEffect(() => {
    const updated = { ...appSettings, customModelId: model };
    setAppSettings(updated);
    localStorage.setItem(`onyx_settings_${code}`, JSON.stringify(updated));
  }, [model, code]);

  useEffect(() => {
    localStorage.setItem(`onyx_settings_${code}`, JSON.stringify(appSettings));
  }, [appSettings, code]);

  useEffect(() => {
    const loadProject = async () => {
      if (code && code !== 'new') {
        const projects = await getProjects();
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
          addLog('RUNTIME: Provisioning WebContainer instance...');
          await getWebContainer();
          addLog('RUNTIME: Environment isolation complete.');
        } catch (err) {
          addLog(`RUNTIME ERROR: ${err.message}`);
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
      setMessages([{ role: 'assistant', content: "Hello! I'm Onyx. Neural engine is active and synced with Puter cloud resources. What would you like to construct today?" }]);
    }
  }, [initialPrompt, messages.length, code]);

  const addLog = (log) => {
    setLogs(prev => [...prev, typeof log === 'string' ? log : JSON.stringify(log)]);
  };

  const handleSendMessage = async (content) => {
    if (isGenerating) return;
    setIsGenerating(true);

    let projectId = code;
    if (projectId === 'new') {
      projectId = Math.random().toString(36).substring(7);
      const newProject = { id: projectId, name: generateRandomName(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await saveProject(newProject);
      setProject(newProject);
      navigate(`/workspace/${projectId}`, { replace: true });
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
          temperature: appSettings.temperature,
          maxTokens: appSettings.maxTokens,
          systemPrompt: appSettings.systemPrompt || PROMPTS[mode] || PROMPTS.execute,
          onUrlReady: (url) => {
            setPreviewUrl(url);
            setActiveAmenity('preview');
          }
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
      addLog(`AI CORE ERROR: ${err.message}`);
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

  const handleAttachContext = () => {
    addLog("ONYX: Neural context expanded with filesystem snapshot.");
  };

  const handlePushToGitHub = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    addLog("onyx-app $ github-push --initiate");
    try {
      const ghUser = await github.getUser();
      const rawName = project?.name || 'onyx-project';
      const repoName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(7);
      addLog(`Creating secure repository: ${repoName}...`);
      const repo = await github.createRepository(repoName, 'Provisioned via OnyxGPT.dev Neural Engine');

      addLog("Preparing source blobs...");
      const filesToPush = [];

      const traverse = async (path) => {
        const entries = await listFiles(path);
        for (const entry of entries) {
          if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
          const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
          try {
            const content = await wcReadFile(fullPath);
            filesToPush.push({ path: fullPath.substring(1), content });
          } catch (e) {
            await traverse(fullPath);
          }
        }
      };

      await traverse('/');

      addLog(`Uploading ${filesToPush.length} assets to main cluster...`);
      await github.pushFiles(ghUser.login, repo.name, 'main', filesToPush);
      addLog("SYNC SUCCESS: GitHub repository is now live.");
      window.open(repo.html_url, '_blank');
    } catch (err) {
      addLog(`VCS ERROR: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRefreshConsole = () => {
     addLog("CONSOLE: Clearing state and refreshing neural trace...");
     setLogs(['ONYX: Trace refreshed.', `TIME: ${new Date().toLocaleTimeString()}`]);
  };

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans selection:bg-primary/30">
      <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 relative z-30 shadow-2xl">
        <div className="flex items-center space-x-6 overflow-hidden">
          <button onClick={() => navigate('/dashboard')} className="p-2.5 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all shrink-0 active:scale-90">
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-black text-xs font-black shadow-lg shadow-primary/20">O</div>
            <h2 className="font-display font-bold text-xl tracking-tighter hidden sm:block">Onyx<span className="text-primary">GPT</span></h2>
          </div>
          <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0"></div>
          <div className="text-[10px] font-mono text-primary/80 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/20 truncate max-w-[250px] uppercase tracking-widest font-black">
            {project?.name || 'INITIALIZING_NEURAL_LINK'}
          </div>
        </div>

        <div className="flex items-center space-x-4 shrink-0">
          {ghConnected && (
            <button
              onClick={handlePushToGitHub}
              disabled={isDeploying}
              className="flex items-center space-x-2 px-5 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-2xl text-[10px] font-black text-primary uppercase tracking-[0.15em] transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/5"
            >
              {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} strokeWidth={3} />}
              <span className="hidden md:inline">{isDeploying ? 'Syncing_Data' : 'Push to GitHub'}</span>
            </button>
          )}
          <div className="h-6 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-500 hover:text-white transition-colors p-2.5 hover:bg-white/5 rounded-2xl active:scale-90"
            title="Agent Directives"
          >
            <Settings size={20} />
          </button>
          <button onClick={signOut} className="text-gray-500 hover:text-red-500 transition-colors p-2.5 hover:bg-red-500/5 rounded-2xl active:scale-90" title="Terminate Session">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-20 border-r border-white/5 bg-[#0a0a0a] flex flex-col items-center py-8 space-y-8 shrink-0 z-20">
          <AmenityButton active={activeAmenity === 'preview'} onClick={() => setActiveAmenity('preview')} icon={<Monitor size={22} />} label="Live Output" />
          <AmenityButton active={activeAmenity === 'terminal'} onClick={() => setActiveAmenity('terminal')} icon={<TerminalIcon size={22} />} label="Neural Console" />
          <AmenityButton active={activeAmenity === 'cloud'} onClick={() => setActiveAmenity('cloud')} icon={<Cloud size={22} />} label="Puter Resources" />
          <div className="flex-1"></div>
          <AmenityButton onClick={() => setIsSettingsOpen(true)} icon={<Cpu size={22} />} label="Agent Configuration" />
          <AmenityButton onClick={handleRefreshConsole} icon={<RefreshCcw size={20} />} label="Refresh Trace" />
        </div>

        <div className="flex-1 flex flex-col bg-[#050505] border-r border-white/5 relative overflow-hidden min-w-0">
          {/* Internal Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/[0.02] blur-[150px] pointer-events-none"></div>

          {activeAmenity === 'preview' && (
            <div className="h-full flex flex-col animate-in fade-in duration-500">
              <div className="bg-[#0a0a0a]/50 p-3 border-b border-white/5 flex items-center px-6 shrink-0 justify-between backdrop-blur-sm">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                   <div className="flex-1 max-w-2xl bg-black border border-white/5 rounded-xl px-4 py-1.5 text-[10px] text-gray-500 font-mono overflow-hidden truncate">
                     {previewUrl || 'waiting_for_neural_network_broadcast...'}
                   </div>
                </div>
                <button
                   onClick={() => { if(previewUrl) { const frame = document.getElementById('preview-frame'); if(frame) frame.src = frame.src; } }}
                   className="ml-6 p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-primary transition-all active:rotate-180 duration-500"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>
              {previewUrl ? (
                <iframe id="preview-frame" src={previewUrl} className="flex-1 w-full bg-white shadow-2xl" title="Live Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-600 flex-col space-y-8">
                  <div className="relative">
                     <div className="absolute inset-[-40px] bg-primary/20 blur-[80px] rounded-full animate-pulse"></div>
                     <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center relative">
                        <Box size={40} className="text-primary/40 animate-bounce" />
                     </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Neural Provisioning</p>
                    <p className="text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest">Isolated Runtime: WebContainer // Booting...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeAmenity === 'terminal' && (
            <div className="h-full flex flex-col bg-[#050505] overflow-hidden animate-in slide-in-from-left-4 duration-300">
               <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-primary/10 rounded-xl">
                        <TerminalIcon size={16} className="text-primary" />
                     </div>
                     <div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Trace Terminal</span>
                        <div className="text-[9px] text-gray-600 font-mono">kernel: v2.4.0-onyx</div>
                     </div>
                  </div>
                  <button
                    onClick={handleRefreshConsole}
                    className="p-2.5 hover:bg-white/5 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90"
                    title="Clear Trace"
                  >
                    <Trash2 size={18} />
                  </button>
               </header>
               <div className="p-8 flex-1 font-mono text-[12px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 selection:bg-primary selection:text-black">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-2 leading-relaxed flex items-start group">
                      <span className="text-primary/30 mr-4 select-none mt-0.5 shrink-0">➜</span>
                      <span className="text-gray-400 whitespace-pre-wrap break-all group-hover:text-gray-200 transition-colors">{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center mt-6">
                    <span className="text-primary mr-4 font-black select-none tracking-tighter underline">onyx-app $</span>
                    <span className="w-2.5 h-5 bg-primary animate-pulse shadow-[0_0_10px_rgba(0,228,204,0.8)]"></span>
                  </div>
               </div>
            </div>
          )}

          {activeAmenity === 'cloud' && <div className="h-full animate-in fade-in duration-300"><CloudView /></div>}
        </div>

        <div className="w-[480px] flex flex-col bg-[#0a0a0a] shadow-[-30px_0_60px_rgba(0,0,0,0.8)] shrink-0 z-30 relative border-l border-white/5">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            model={model}
            setModel={setModel}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating}
            onUndo={handleUndo}
            onAttachContext={handleAttachContext}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={appSettings}
        setSettings={setAppSettings}
      />
    </div>
  );
}

function AmenityButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all relative group ${
        active
          ? 'bg-primary text-black shadow-[0_0_25px_rgba(0,228,204,0.4)] scale-110'
          : 'text-gray-600 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>{icon}</div>
      <div className="absolute left-[130%] ml-4 px-4 py-2 bg-[#111] border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100] shadow-2xl translate-x-[-15px] group-hover:translate-x-0">
        {label}
      </div>
    </button>
  );
}
