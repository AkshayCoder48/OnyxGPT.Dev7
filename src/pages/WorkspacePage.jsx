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
  Loader2
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessages, getProjectMessages, saveProject, getProjects, getGitHubToken } from '../services/storage';
import { generateRandomName } from '../utils/names';
import { getWebContainer, listFiles, readFile as wcReadFile, teardown, restartWebContainer } from '../services/webContainer';
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
    const saved = localStorage.getItem('onyx_settings');
    return saved ? JSON.parse(saved) : { customModelId: 'gpt-4o' };
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
          if (err.message.includes('Security Error')) {
            addLog('Tip: WebContainer requires a cross-origin isolated environment. Ensure the server sends COOP/COEP headers.');
          } else if (err.message.includes('already running')) {
            addLog('Tip: Only one WebContainer can run per origin. Close other tabs or use the "Restart" button above.');
          }
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
            setActiveAmenity('preview');
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

  const handleAttachContext = () => {
    addLog("Context attached: Filesystem snapshot taken.");
  };

  const handleRestartWebContainer = async () => {
    try {
      addLog('Initiating WebContainer restart sequence...');
      await restartWebContainer();
      addLog('WebContainer restarted successfully. Environment is fresh.');
    } catch (err) {
      addLog(`WebContainer Restart Error: ${err.message}`);
    }
  };

  const handleStopWebContainer = async () => {
    try {
      addLog('Shutting down WebContainer...');
      await teardown();
      addLog('WebContainer stopped. Instance and references cleared.');
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
      addLog("Deployment successful!");
      window.open(repo.html_url, '_blank');
    } catch (err) {
      addLog(`Deployment failed: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('onyx_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="digital-glow p-12 bg-surface rounded-2xl border border-gray-800 max-w-md w-full">
           <Box size={64} className="text-primary mx-auto mb-6 animate-pulse" />
           <h1 className="text-3xl font-display font-bold mb-4 text-white">Project Isolated</h1>
           <p className="text-gray-400 mb-8 leading-relaxed">
             This workspace is encrypted and scoped to your Puter identity. Please sign in to resume.
           </p>
           <button onClick={signIn} className="w-full bg-primary text-background font-bold px-8 py-4 rounded-xl hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,228,204,0.3)]">
             Sign In with Puter
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-white overflow-hidden font-sans">
      <header className="h-14 border-b border-gray-800 bg-surface flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center space-x-4 overflow-hidden">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all shrink-0">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-background text-xs font-bold">O</div>
            <h2 className="font-display font-bold text-lg tracking-tighter">Onyx<span className="text-primary">GPT</span></h2>
          </div>
          <div className="h-4 w-[1px] bg-gray-800 mx-1 shrink-0"></div>
          <div className="text-[10px] font-mono text-gray-500 bg-background px-2 py-0.5 rounded border border-gray-800 truncate max-w-[200px]">
            {project?.name || 'New Project'}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {ghConnected && (
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="flex items-center space-x-2 px-3 py-1.5 bg-background border border-gray-800 hover:border-primary/50 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {isDeploying ? <Loader2 size={14} className="animate-spin text-primary" /> : <Github size={14} className="text-primary" />}
              <span className="hidden sm:inline">{isDeploying ? 'Deploying...' : 'Deploy to GitHub'}</span>
            </button>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <Settings size={18} />
          </button>
          <button onClick={signOut} className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-400/5 rounded-lg">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-14 border-r border-gray-800 bg-surface flex flex-col items-center py-4 space-y-4 shrink-0">
          <AmenityButton
            active={activeAmenity === 'preview'}
            onClick={() => setActiveAmenity('preview')}
            icon={<Monitor size={20} />}
            label="Preview"
          />
          <AmenityButton
            active={activeAmenity === 'terminal'}
            onClick={() => setActiveAmenity('terminal')}
            icon={<TerminalIcon size={20} />}
            label="Terminal"
          />
          <AmenityButton
            active={activeAmenity === 'cloud'}
            onClick={() => setActiveAmenity('cloud')}
            icon={<Cloud size={20} />}
            label="Cloud"
          />
        </div>

        <div className="flex-1 flex flex-col bg-[#0a0a0a] border-r border-gray-800 relative overflow-hidden min-w-0">
          {activeAmenity === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="bg-surface p-2 border-b border-gray-800 flex items-center px-4 shrink-0">
                <div className="flex-1 max-w-xl bg-background border border-gray-700 rounded-md px-3 py-1 text-[10px] text-gray-400 font-mono overflow-hidden truncate">
                  {previewUrl || 'Waiting for dev server...'}
                </div>
              </div>
              {previewUrl ? (
                <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Live Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 flex-col space-y-4">
                  <div className="animate-pulse bg-gray-800 h-32 w-48 rounded-lg border border-gray-700"></div>
                  <p className="text-sm">Starting WebContainer...</p>
                </div>
              )}
            </div>
          )}

          {activeAmenity === 'terminal' && (
            <div className="h-full flex flex-col bg-[#0d0d0d] overflow-hidden">
               <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-surface/50">
                  <div className="flex items-center space-x-2">
                    <TerminalIcon size={14} className="text-gray-500" />
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold">Terminal Output</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleRestartWebContainer}
                      className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-primary transition-colors flex items-center space-x-1"
                      title="Restart WebContainer"
                    >
                      <History size={14} />
                      <span className="text-[10px]">Restart</span>
                    </button>
                    <button
                      onClick={handleStopWebContainer}
                      className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-red-400 transition-colors flex items-center space-x-1"
                      title="Stop WebContainer"
                    >
                      <LogOut size={14} />
                      <span className="text-[10px]">Stop</span>
                    </button>
                  </div>
               </div>
               <div className="p-4 flex-1 font-mono text-[11px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 leading-relaxed">
                      <span className="text-primary/50 mr-2 opacity-50">➜</span>
                      <span className="text-gray-300 whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center mt-2 group">
                    <span className="text-primary mr-2 font-bold">onyx-app $</span>
                    <span className="w-2 h-4 bg-primary animate-pulse mr-4"></span>
                    <button
                      onClick={handleRestartWebContainer}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-primary text-[9px] font-mono transition-opacity flex items-center space-x-1"
                    >
                      <History size={10} />
                      <span>refresh terminal</span>
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeAmenity === 'cloud' && <CloudView />}
        </div>

        <div className="w-[400px] xl:w-[450px] flex flex-col bg-surface shadow-2xl shrink-0">
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
      className={`p-3 rounded-xl transition-all relative group ${
        active
          ? 'bg-primary text-background shadow-lg shadow-primary/20 scale-105'
          : 'text-gray-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );
}
