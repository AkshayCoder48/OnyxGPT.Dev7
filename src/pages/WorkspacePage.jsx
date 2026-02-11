import puter from "../services/puter";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Settings,
  LogOut,
  RefreshCw,
  Square,
  Monitor,
  Terminal as TerminalIcon,
  Cloud,
  Activity,
  Github,
  Box,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import ChatPanel from '../components/workspace/ChatPanel';
import CloudView from '../components/workspace/CloudView';
import ActivityView from '../components/workspace/ActivityView';
import SettingsModal from '../components/workspace/SettingsModal';
import { chatWithAI } from '../services/aiService';
import {
  getWebContainer as bootWebContainer,
  runCommand,
  readFile as wcReadFile,
  listFiles,

} from '../services/webContainer';
import * as github from '../services/githubService';

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [activeAmenity, setActiveAmenity] = useState('preview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [project, setProject] = useState(null);
  const [ghConnected, setGhConnected] = useState(false);
  const [ghUser, setGhUser] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [mode, setMode] = useState('execute');

  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('onyx_settings');
    return saved ? JSON.parse(saved) : { theme: 'dark', autoDeploy: false };
  });

  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Load project data from KV using 'code'
    const loadProject = async () => {
      try {
        const data = await puter.kv.get(`project_${code}`);
        if (data) {
          setProject(data);
          if (data.messages) setMessages(data.messages);
        } else {
          setProject({ id: code, name: 'new-onyx-app', createdAt: new Date().toISOString() });
        }
      } catch (err) {
        console.error("Failed to load project", err);
      }
    };

    const checkGitHub = async () => {
      const token = await puter.kv.get('gh_token');
      if (token) {
        setGhConnected(true);
        const user = await github.getUser(token);
        setGhUser(user);
      }
    };

    if (user) {
      loadProject();
      checkGitHub();
      bootWebContainer();
    }
  }, [code, user]);

  useEffect(() => {
    if (project && project.initialPrompt && messages.length === 0 && !isGenerating) {
      handleSendMessage(project.initialPrompt);
    }
  }, [project, messages.length, isGenerating]);

  const addLog = (log) => {
    setLogs(prev => [...prev.slice(-100), log]);
    setTimeout(() => terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
  };

  const handleSendMessage = async (content) => {
    const newMessages = [...messages, { role: 'user', content, timestamp: new Date().toISOString() }];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      await chatWithAI(
        newMessages,
        {
          model,
          onUrlReady: (url) => setPreviewUrl(url),
        },
        (updatedMessage) => {
          setMessages([...newMessages, { ...updatedMessage, timestamp: new Date().toISOString() }]);
        },
        (log) => addLog(log)
      );
    } catch (err) {
      addLog(`AI Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
      // Persist to KV
      puter.kv.set(`project_${code}`, {
        ...project,
        messages: messages,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleRestartWC = async () => {
    addLog("Restarting WebContainer...");
    setPreviewUrl('');
    await bootWebContainer();
    addLog("WebContainer ready.");
  };

  const handleStopWC = () => {
    addLog("Stopping WebContainer...");
    // WebContainer doesn't have a direct stop, but we can clear state
    setPreviewUrl('');
  };

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const [cmd, ...args] = terminalInput.split(' ');
    addLog(`onyx-app $ ${terminalInput}`);
    runCommand(cmd, args, (data) => addLog(data));
    setTerminalInput('');
  };

  const handleDeploy = async () => {
    if (!ghConnected || isDeploying) return;
    setIsDeploying(true);
    try {
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
             // We need to differentiate between file and directory.
             // listFiles returns an array of names.
             // This is a simplification.
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

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-12 bg-white/5 rounded-2xl border border-white/5 max-w-md w-full shadow-2xl">
           <Box size={64} className="text-primary mx-auto mb-6 animate-pulse" />
           <h1 className="text-3xl font-display font-bold mb-4 text-white">Project Isolated</h1>
           <p className="text-gray-400 mb-8 leading-relaxed">
             This workspace is encrypted and scoped to your Puter identity. Please sign in to resume.
           </p>
           <button onClick={signIn} className="w-full bg-primary text-[#0A0A0A] font-bold px-8 py-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20">
             Sign In with Puter
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden font-sans">
      <header className="h-14 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center space-x-4 overflow-hidden">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all shrink-0">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-[#0A0A0A] text-xs font-bold">O</div>
            <h2 className="font-display font-bold text-lg tracking-tighter">Onyx<span className="text-primary">GPT</span></h2>
          </div>
          <div className="h-4 w-[1px] bg-white/5 mx-1 shrink-0"></div>
          <div className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[200px]">
            {project?.name || 'New Project'}
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center bg-white/5 border border-white/5 rounded-lg overflow-hidden mr-2">
            <button
              onClick={handleRestartWC}
              title="Restart WebContainer"
              className="p-2 hover:bg-white/10 text-gray-500 hover:text-primary transition-all border-r border-white/5"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={handleStopWC}
              title="Stop WebContainer"
              className="p-2 hover:bg-white/10 text-gray-500 hover:text-red-400 transition-all"
            >
              <Square size={16} />
            </button>
          </div>

          {ghConnected && (
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/5 hover:border-primary/50 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
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
        {/* Amenity Sidebar */}
        <div className="w-16 border-r border-white/5 bg-[#0A0A0A] flex flex-col items-center py-4 space-y-4 shrink-0">
          <AmenityButton
            active={activeAmenity === 'preview'}
            onClick={() => setActiveAmenity('preview')}
            icon={<Monitor size={20} />}
            label="Preview"
          />
          <AmenityButton
            active={activeAmenity === 'activity'}
            onClick={() => setActiveAmenity('activity')}
            icon={<Activity size={20} />}
            label="Activity"
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

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A] border-r border-white/5 relative overflow-hidden min-w-0">
          {activeAmenity === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="bg-[#0D0D0D] p-2 border-b border-white/5 flex items-center px-4 shrink-0">
                <div className="flex-1 max-w-xl bg-black border border-white/5 rounded-md px-3 py-1 text-[10px] text-gray-500 font-mono overflow-hidden truncate">
                  {previewUrl || 'Waiting for dev server...'}
                </div>
              </div>
              {previewUrl ? (
                <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Live Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-600 flex-col space-y-4">
                  <div className="animate-pulse bg-white/5 h-32 w-48 rounded-lg border border-white/5"></div>
                  <p className="text-sm italic">Initializing environment...</p>
                </div>
              )}
            </div>
          )}

          {activeAmenity === 'activity' && <ActivityView messages={messages} />}

          {activeAmenity === 'terminal' && (
            <div className="h-full flex flex-col bg-[#0d0d0d] overflow-hidden">
               <div className="p-6 flex-1 font-mono text-[11px] overflow-y-auto custom-scrollbar">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 leading-relaxed animate-in fade-in duration-300">
                      <span className="text-primary/50 mr-2 opacity-50">➜</span>
                      <span className="text-gray-300 whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                  <form onSubmit={handleTerminalSubmit} className="flex items-center mt-2 group relative">
                    <span className="text-primary mr-2 font-bold shrink-0">onyx-app $</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-gray-300 font-mono relative z-10"
                      autoFocus
                    />
                    {!terminalInput && <div className="absolute left-[85px] w-2 h-4 bg-primary animate-pulse group-focus-within:block"></div>}
                  </form>
                  <div ref={terminalEndRef} />
               </div>
            </div>
          )}

          {activeAmenity === 'cloud' && <CloudView />}
        </div>

        {/* Chat Sidebar */}
        <div className="w-[400px] xl:w-[450px] flex flex-col bg-[#0A0A0A] shrink-0 shadow-2xl z-20">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            model={model}
            setModel={setModel}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={appSettings}
        setSettings={setAppSettings}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #222;
        }
      `}} />
    </div>
  );
}

function AmenityButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all relative group ${
        active
          ? 'bg-primary text-[#0A0A0A] shadow-lg shadow-primary/20 scale-105'
          : 'text-gray-600 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] text-white text-[10px] rounded border border-white/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </div>
    </button>
  );
}
