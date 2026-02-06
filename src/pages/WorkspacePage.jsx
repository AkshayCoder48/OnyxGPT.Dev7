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
  Box
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessage, getProjectMessages, saveProject, getProjects } from '../services/storage';
import { getWebContainer } from '../services/webContainer';
import CloudView from '../components/workspace/CloudView';

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';

  const [activeAmenity, setActiveAmenity] = useState('preview');
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState('gpt-4o');
  const [mode, setMode] = useState('execute');
  const [logs, setLogs] = useState(['Initializing Onyx Environment...', 'User authenticated.']);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('onyx_settings');
    return saved ? JSON.parse(saved) : { customModelId: '' };
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState(null);

  const hasInitialized = useRef(false);
  const webContainerStarted = useRef(false);

  // Load project metadata
  useEffect(() => {
    const loadProject = async () => {
      if (code && code !== 'new') {
        const projects = await getProjects();
        const p = projects.find(proj => proj.id === code);
        if (p) setProject(p);
      }
    };
    loadProject();
  }, [code]);

  // Initialize WebContainer
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

  // Load existing messages
  useEffect(() => {
    const loadData = async () => {
      if (code && code !== 'new') {
        const data = await getProjectMessages(code);
        if (data && data.length > 0) {
          setMessages(data);
          hasInitialized.current = true;
        }
      }
    };
    loadData();
  }, [code]);

  // Initial prompt handling
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
      const newProject = { id: projectId, name: content.substring(0, 20) + '...', createdAt: new Date().toISOString() };
      await saveProject(newProject);
      setProject(newProject);
      navigate(`/workspace/${projectId}`, { replace: true });
    }

    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    await saveMessage(projectId, userMsg);

    let finalAssistantMsg = null;

    try {
      await chatWithAI(
        newMessages,
        {
          model: model,
          customModelId: appSettings.customModelId,
          onUrlReady: (url) => {
            setPreviewUrl(url);
            setActiveAmenity('preview');
          },
          systemPrompt: PROMPTS[mode] || PROMPTS.execute
        },
        async (updatedAssistantMsg) => {
          setMessages([...newMessages, updatedAssistantMsg]);
          finalAssistantMsg = updatedAssistantMsg;
        },
        (log) => addLog(log)
      );

      if (finalAssistantMsg) {
        await saveMessage(projectId, finalAssistantMsg);
      }
    } catch (err) {
      addLog(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndo = () => {
    if (messages.length > 0) {
      setMessages(messages.slice(0, -1));
    }
  };

  const handleAttachContext = () => {
    addLog("Context attached: Filesystem snapshot taken.");
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
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-background text-xs font-bold">O</div>
            <h2 className="font-display font-bold text-lg tracking-tighter">Onyx<span className="text-primary">GPT</span></h2>
          </div>
          <div className="h-4 w-[1px] bg-gray-800 mx-1"></div>
          <div className="text-[10px] font-mono text-gray-500 bg-background px-2 py-0.5 rounded border border-gray-800">
            {project?.name || 'New Project'}
          </div>
        </div>

        <div className="flex items-center space-x-3">
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
        <div className="w-14 border-r border-gray-800 bg-surface flex flex-col items-center py-4 space-y-4">
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

        {/* Left Panel: Content */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] border-r border-gray-800">
          {activeAmenity === 'preview' && (
            <div className="h-full flex flex-col">
              <div className="bg-surface p-2 border-b border-gray-800 flex items-center px-4">
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
            <div className="h-full flex flex-col bg-[#0d0d0d]">
               <div className="p-4 flex-1 font-mono text-xs overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-primary mr-2">➜</span>
                      <span className="text-gray-300">{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center mt-2">
                    <span className="text-primary mr-2">onyx-app $</span>
                    <span className="w-2 h-4 bg-primary animate-pulse"></span>
                  </div>
               </div>
            </div>
          )}

          {activeAmenity === 'cloud' && <CloudView />}
        </div>

        {/* Right Panel: Chat */}
        <div className="w-[400px] xl:w-[450px] flex flex-col bg-surface">
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
          ? 'bg-primary text-background'
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
