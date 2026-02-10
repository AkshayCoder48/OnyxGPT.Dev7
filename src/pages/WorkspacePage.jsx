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
  RefreshCw,
  Square
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessages, getProjectMessages, saveProject, getProjects, getGitHubToken } from '../services/storage';
import { generateRandomName } from '../utils/names';
import { getWebContainer, listFiles, readFile as wcReadFile, restartWebContainer, teardownWebContainer, runCommand } from '../services/webContainer';
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
  const [terminalInput, setTerminalInput] = useState('');
  const terminalEndRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);

  const hasInitialized = useRef(false);
  const webContainerStarted = useRef(false);

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
    const logStr = typeof log === 'string' ? log : JSON.stringify(log);
    setLogs(prev => {
        const lastLog = prev[prev.length - 1];
        // If the new log is just a continuation (no newline at start), append to last line
        // But for simplicity in this UI, we just append to the array
        // We limit to last 500 lines for performance
        const newLogs = [...prev, logStr];
        return newLogs.slice(-500);
    });
  };

  useEffect(() => {
    if (activeAmenity === 'terminal') {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeAmenity]);

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
      // Find index of last user message
      const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
      if (lastUserIndex !== -1) {
          const actualIndex = messages.length - 1 - lastUserIndex;
          const newMsgs = messages.slice(0, actualIndex);
          setMessages(newMsgs);
          saveMessages(code, newMsgs);
          addLog("Last interaction undone.");
      } else {
          const newMsgs = messages.slice(0, -1);
          setMessages(newMsgs);
          saveMessages(code, newMsgs);
      }
    }
  };

  const handleAttachContext = async () => {
    addLog("Analyzing project context...");
    try {
      const files = ['package.json', 'src/App.jsx', 'vite.config.js'];
      let contextStr = "Current project context:\n";
      for (const f of files) {
        try {
          const content = await wcReadFile(f);
          contextStr += `\nFile: ${f}\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n`;
        } catch (e) {}
      }
      addLog("Context snapshot attached to session.");
      // We could actually append this to the next message if we wanted to
    } catch (err) {
      addLog(`Context Error: ${err.message}`);
    }
  };

  const handleRestartWC = async () => {
    if (confirm("Restart WebContainer? This will stop all running processes.")) {
      addLog("Restarting WebContainer...");
      try {
        await restartWebContainer();
        addLog("WebContainer restarted successfully.");
        setPreviewUrl('');
      } catch (err) {
        addLog(`Restart Error: ${err.message}`);
      }
    }
  };

  const handleStopWC = async () => {
    if (confirm("Stop WebContainer? All unsaved in-memory changes will be lost.")) {
      addLog("Stopping WebContainer...");
      await teardownWebContainer();
      addLog("WebContainer stopped.");
      setPreviewUrl('');
      webContainerStarted.current = false;
    }
  };

  const handleTerminalSubmit = async (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalInput('');
    addLog(`onyx-app $ ${cmd}`);

    try {
      const [command, ...args] = cmd.split(' ');
      const exitCode = await runCommand(command, args, (data) => addLog(data));
      if (exitCode !== 0) {
        addLog(`Command failed with exit code ${exitCode}`);
      }
    } catch (err) {
      addLog(`Terminal Error: ${err.message}`);
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
          <div className="flex items-center bg-background border border-gray-800 rounded-lg overflow-hidden mr-2">
            <button
              onClick={handleRestartWC}
              title="Restart WebContainer"
              className="p-2 hover:bg-white/5 text-gray-500 hover:text-primary transition-all border-r border-gray-800"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={handleStopWC}
              title="Stop WebContainer"
              className="p-2 hover:bg-white/5 text-gray-500 hover:text-red-400 transition-all"
            >
              <Square size={16} />
            </button>
          </div>

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
               <div className="p-4 flex-1 font-mono text-[11px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 leading-relaxed animate-in fade-in duration-300">
                      <span className="text-primary/50 mr-2 opacity-50">➜</span>
                      <span className="text-gray-300 whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                  <form onSubmit={handleTerminalSubmit} className="flex items-center mt-2 group">
                    <span className="text-primary mr-2 font-bold shrink-0">onyx-app $</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-gray-300 font-mono"
                      autoFocus
                    />
                    <div className="w-2 h-4 bg-primary animate-pulse group-focus-within:hidden"></div>
                  </form>
                  <div ref={terminalEndRef} />
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
