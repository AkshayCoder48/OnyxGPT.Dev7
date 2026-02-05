import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ResourcePanel from '../components/workspace/ResourcePanel';
import ChatPanel from '../components/workspace/ChatPanel';
import SettingsModal from '../components/workspace/SettingsModal';
import { LogOut, Settings, Cloud as CloudIcon, Terminal as TerminalIcon, Monitor } from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessage, getProjectMessages } from '../services/storage';
import { getWebContainer } from '../services/webContainer';

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';

  const [activeTab, setActiveTab] = useState('preview');
  const [messages, setMessages] = useState([]);
  const [model, setModel] = useState('gpt-4o');
  const [mode, setMode] = useState('execute');
  const [logs, setLogs] = useState(['Initializing Onyx Environment...', 'User authenticated.']);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({ customModelId: '' });

  const isGenerating = useRef(false);
  const hasInitialized = useRef(false);
  const webContainerStarted = useRef(false);

  // Initialize WebContainer immediately
  useEffect(() => {
    const initWC = async () => {
      if (!webContainerStarted.current) {
        webContainerStarted.current = true;
        try {
          setLogs(prev => [...prev, 'Booting WebContainer...']);
          await getWebContainer();
          setLogs(prev => [...prev, 'WebContainer ready.']);
        } catch (err) {
          setLogs(prev => [...prev, `WebContainer Error: ${err.message}`]);
        }
      }
    };
    initWC();
  }, []);

  // Load existing messages
  useEffect(() => {
    const loadData = async () => {
      if (code) {
        const data = await getProjectMessages(code);
        if (data && data.length > 0) {
          setMessages(data);
          hasInitialized.current = true;
        }
      }
    };
    loadData();
  }, [code]);

  // Initial prompt handling (Auto-start)
  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isGenerating.current && !hasInitialized.current) {
      handleSendMessage(initialPrompt);
      hasInitialized.current = true;
    } else if (messages.length === 0 && !hasInitialized.current) {
      setMessages([{ role: 'assistant', content: "Hello! I'm Onyx. I've initialized your cloud environment. What would you like to build today?" }]);
    }
  }, [initialPrompt, messages.length]);

  const handleSendMessage = async (content) => {
    if (isGenerating.current) return;
    isGenerating.current = true;

    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    await saveMessage(code, userMsg);

    let finalAssistantMsg = null;

    try {
      await chatWithAI(
        newMessages,
        {
          model: model,
          customModelId: appSettings.customModelId,
          onUrlReady: (url) => {
            setPreviewUrl(url);
            setActiveTab('preview');
          },
          systemPrompt: PROMPTS[mode] || PROMPTS.execute
        },
        async (updatedAssistantMsg) => {
          setMessages([...newMessages, updatedAssistantMsg]);
          finalAssistantMsg = updatedAssistantMsg;
        },
        (log) => {
          setLogs(prev => [...prev, typeof log === 'string' ? log : JSON.stringify(log)]);
        }
      );

      if (finalAssistantMsg) {
        await saveMessage(code, finalAssistantMsg);
      }
    } catch (err) {
      setLogs(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      isGenerating.current = false;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="digital-glow p-12 bg-surface rounded-2xl border border-gray-800 max-w-md w-full">
           <CloudIcon size={64} className="text-primary mx-auto mb-6 animate-pulse" />
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
      <header className="h-16 border-b border-gray-800 bg-surface flex items-center justify-between px-8 shrink-0 relative z-10 shadow-lg">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-background font-bold shadow-[0_0_10px_rgba(0,228,204,0.5)] group-hover:scale-105 transition-transform">O</div>
            <h2 className="font-display font-bold text-xl tracking-tighter">Onyx<span className="text-primary">GPT</span></h2>
          </div>
          <div className="h-4 w-[1px] bg-gray-800 mx-2"></div>
          <div className="text-xs font-mono text-gray-500 bg-background px-3 py-1 rounded-full border border-gray-800">
            project-{code}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-3 text-sm">
            <div className="flex -space-x-2">
               <div className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">AI</div>
               <div className="w-8 h-8 rounded-full border-2 border-surface bg-green-500/20 flex items-center justify-center text-green-500 text-[10px] font-bold">YOU</div>
            </div>
            <span className="text-gray-400 font-medium">Collaborative Session</span>
          </div>
          <div className="h-4 w-[1px] bg-gray-800 mx-2"></div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <Settings size={20} />
          </button>
          <button onClick={signOut} className="text-gray-400 hover:text-red-400 transition-colors p-2 hover:bg-red-400/5 rounded-lg">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[62%] flex flex-col border-r border-gray-800 bg-[#0a0a0a]">
          <ResourcePanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            previewUrl={previewUrl}
            logs={logs}
          />
        </div>

        <div className="w-[38%] flex flex-col bg-surface">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            model={model}
            setModel={setModel}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating.current}
          />
        </div>
      </main>

      <footer className="h-8 border-t border-gray-800 bg-surface px-4 flex items-center justify-between text-[10px] text-gray-500 font-mono">
         <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
               <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
               <span>Cloud Online</span>
            </div>
            <div className="flex items-center space-x-1">
               <TerminalIcon size={12} />
               <span>WebContainer Ready</span>
            </div>
         </div>
         <div className="flex items-center space-x-4 uppercase tracking-widest">
            <span>Region: Global (Puter.js)</span>
            <span>Vite Dev: {previewUrl ? 'Running' : 'Idle'}</span>
         </div>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={appSettings}
        setSettings={setAppSettings}
      />
    </div>
  );
}
