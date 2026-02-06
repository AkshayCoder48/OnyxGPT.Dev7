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
  Search
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
  const [logs, setLogs] = useState(['Initializing Onyx Environment...', 'User authenticated.']);
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

  const handleAttachContext = () => {
    addLog("Context attached: Filesystem snapshot taken.");
  };

  const handlePushToGitHub = async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    addLog("onyx-app $ github-push initiate");
    try {
      const ghUser = await github.getUser();
      const rawName = project?.name || 'onyx-project';
      const repoName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(7);
      addLog(`Creating repository: ${repoName}...`);
      const repo = await github.createRepository(repoName, 'Created via OnyxGPT.dev');

      addLog("Preparing files for upload...");
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

      addLog(`Pushing ${filesToPush.length} files to main branch...`);
      await github.pushFiles(ghUser.login, repo.name, 'main', filesToPush);
      addLog("Push successful! Repository live.");
      window.open(repo.html_url, '_blank');
    } catch (err) {
      addLog(`GitHub error: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans">
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center space-x-4 overflow-hidden">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all shrink-0">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-black text-[10px] font-black">O</div>
            <h2 className="font-display font-bold text-lg tracking-tighter">Onyx<span className="text-primary">GPT</span></h2>
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-1 shrink-0"></div>
          <div className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5 truncate max-w-[200px]">
            {project?.name || 'Initializing...'}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {ghConnected && (
            <button
              onClick={handlePushToGitHub}
              disabled={isDeploying}
              className="flex items-center space-x-2 px-4 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl text-[10px] font-black text-primary uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isDeploying ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
              <span className="hidden sm:inline">{isDeploying ? 'Syncing...' : 'Push to GitHub'}</span>
            </button>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
          >
            <Settings size={18} />
          </button>
          <button onClick={signOut} className="text-gray-500 hover:text-red-400 transition-colors p-2 hover:bg-red-400/5 rounded-xl">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-16 border-r border-white/5 bg-[#0a0a0a] flex flex-col items-center py-6 space-y-6 shrink-0">
          <AmenityButton active={activeAmenity === 'preview'} onClick={() => setActiveAmenity('preview')} icon={<Monitor size={20} />} label="Live Preview" />
          <AmenityButton active={activeAmenity === 'terminal'} onClick={() => setActiveAmenity('terminal')} icon={<TerminalIcon size={20} />} label="Console" />
          <AmenityButton active={activeAmenity === 'cloud'} onClick={() => setActiveAmenity('cloud')} icon={<Cloud size={20} />} label="Puter Resources" />
          <div className="flex-1"></div>
          <AmenityButton onClick={() => setIsSettingsOpen(true)} icon={<Layers size={20} />} label="Agent Settings" />
        </div>

        <div className="flex-1 flex flex-col bg-[#050505] border-r border-white/5 relative overflow-hidden min-w-0">
          {activeAmenity === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="bg-[#0a0a0a] p-2 border-b border-white/5 flex items-center px-4 shrink-0 justify-between">
                <div className="flex-1 max-w-xl bg-black border border-white/5 rounded-lg px-3 py-1 text-[10px] text-gray-500 font-mono overflow-hidden truncate">
                  {previewUrl || 'waiting for internal network...'}
                </div>
                <button className="ml-4 p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-primary transition-all">
                  <RefreshCcw size={14} />
                </button>
              </div>
              {previewUrl ? (
                <iframe src={previewUrl} className="flex-1 w-full bg-white shadow-2xl" title="Live Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-600 flex-col space-y-6">
                  <div className="relative">
                     <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                     <Box size={64} className="relative text-primary/40 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Provisioning Runtime</p>
                    <p className="text-[10px] text-gray-700 mt-1">WebContainer is booting in the background</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeAmenity === 'terminal' && (
            <div className="h-full flex flex-col bg-[#050505] overflow-hidden">
               <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <TerminalIcon size={14} className="text-primary" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">System Logs</span>
                  </div>
                  <button
                    onClick={() => setLogs(['Terminal cleared by operator.'])}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"
                  >
                    <RefreshCcw size={14} />
                  </button>
               </header>
               <div className="p-6 flex-1 font-mono text-[11px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 selection:bg-primary selection:text-black">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1.5 leading-relaxed">
                      <span className="text-primary/40 mr-3 select-none">➜</span>
                      <span className="text-gray-400 whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center mt-4">
                    <span className="text-primary mr-3 font-black select-none">onyx-app $</span>
                    <span className="w-2 h-4 bg-primary animate-pulse"></span>
                  </div>
               </div>
            </div>
          )}

          {activeAmenity === 'cloud' && <CloudView />}
        </div>

        <div className="w-[450px] flex flex-col bg-[#0a0a0a] shadow-[-20px_0_40px_rgba(0,0,0,0.5)] shrink-0 z-20">
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
      className={`p-3.5 rounded-2xl transition-all relative group ${
        active
          ? 'bg-primary text-black shadow-[0_0_20px_rgba(0,228,204,0.3)] scale-110'
          : 'text-gray-600 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <div className="absolute left-[120%] ml-4 px-3 py-1.5 bg-[#111] border border-white/10 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-[100] shadow-2xl translate-x-[-10px] group-hover:translate-x-0">
        {label}
      </div>
    </button>
  );
}
