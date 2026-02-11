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
  CheckCircle2,
  Code as CodeIcon,
  Folder,
  Layout, Cpu
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
  listFiles
} from '../services/webContainer';
import * as github from '../services/githubService';

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('activity'); // Match image default
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [, setLogs] = useState([]);
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
      <header className="h-16 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-6 shrink-0 relative z-30">
        {/* Left: Logo and Project */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-[#0A0A0A] shadow-lg shadow-primary/20">
              <Layout size={20} />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter">OnyxGPT</span>
          </div>

          <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <Folder size={14} className="text-gray-500" />
            <span className="text-xs font-mono text-gray-300">{project?.name || 'onyx-app'}</span>
          </div>
        </div>

        {/* Center: Tabs (Segmented Control) */}
        <div className="flex items-center bg-black border border-white/10 p-1 rounded-2xl">
          <TabButton
            active={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
            label="Preview"
          />
          <TabButton
            active={activeTab === 'code'}
            onClick={() => setActiveTab('code')}
            label="Code"
          />
          <TabButton
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            label="Activity"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/5 overflow-hidden">
             <IconButton icon={<RefreshCw size={16} />} onClick={handleRestartWC} title="Restart" />
             <IconButton icon={<Square size={16} />} onClick={handleStopWC} title="Stop" />
          </div>

          <button
            onClick={handleDeploy}
            disabled={!ghConnected || isDeploying}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${
              ghConnected
                ? 'bg-primary text-[#0A0A0A] shadow-primary/20 hover:brightness-110'
                : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            {isDeploying ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />}
            <span>{isDeploying ? 'Pushing...' : 'Push to Main'}</span>
          </button>

          <IconButton icon={<Settings size={18} />} onClick={() => setIsSettingsOpen(true)} />
          <IconButton icon={<LogOut size={18} />} onClick={signOut} className="text-red-400 hover:bg-red-500/10" />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A] relative overflow-hidden min-w-0">
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
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

          {activeTab === 'activity' && <ActivityView messages={messages} />}

          {activeTab === 'code' && (
            <div className="h-full flex items-center justify-center text-gray-500">
               <div className="text-center">
                  <CodeIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Source code explorer coming soon...</p>
               </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className="w-[400px] xl:w-[450px] flex flex-col bg-[#0A0A0A] border-l border-white/5 shrink-0 z-20">
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

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-white/5 bg-[#0A0A0A] flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Agent Online</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Cpu size={12} />
            <span className="text-[10px] font-mono uppercase">CPU: 12%</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Box size={12} />
            <span className="text-[10px] font-mono uppercase">DB: Connected</span>
          </div>
        </div>
        <div className="flex items-center space-x-6 text-gray-600">
           <span className="text-[10px] font-mono">UTF-8</span>
           <span className="text-[10px] font-mono uppercase">Line 42, Col 18</span>
           <div className="flex items-center space-x-2 text-primary/70">
             <RefreshCw size={10} className="animate-spin-slow" />
             <span className="text-[10px] font-bold uppercase tracking-widest">Synced</span>
           </div>
        </div>
      </footer>

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
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-1.5 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-primary text-[#0A0A0A] shadow-lg shadow-primary/20'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function IconButton({ icon, onClick, title, className = "" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 text-gray-500 hover:text-white hover:bg-white/5 transition-all ${className}`}
    >
      {icon}
    </button>
  );
}
