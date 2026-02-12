import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Folder, RefreshCw, Square, Settings, LogOut,
  Github, Loader2, Code as CodeIcon, Cpu, Box,
  Zap, Brain, Bug, Send, Sparkles, CheckCircle2, ChevronRight, Search,
  Terminal, User, Plus, ArrowRight, MessageSquare, Play, StopCircle, FileText, Check, AlertCircle, XCircle
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { puter } from '../services/puter';
import * as wc from '../services/webContainer';
import { chatWithAI } from '../services/aiService';
import * as github from '../services/githubService';
import ChatPanel from '../components/workspace/ChatPanel';
import ActivityView from '../components/workspace/ActivityView';
import SettingsModal from '../components/workspace/SettingsModal';
import FileExplorer from '../components/workspace/FileExplorer';

export default function WorkspacePage({ user, signIn, signOut }) {
  const { code } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState([]);
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [model, setModel] = useState('gpt-4o');
  const [mode, setMode] = useState('execute');
  const [ghConnected, setGhConnected] = useState(false);
  const [ghUser, setGhUser] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // File Explorer & Editor State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem("onyx_settings");
    return saved ? JSON.parse(saved) : { theme: "dark", autoDeploy: false };
  });

  const abortControllerRef = useRef(null);

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
      wc.getWebContainer().catch(err => console.error("WC Boot failed", err));
    }
  }, [code, user]);

  useEffect(() => {
    if (project && project.initialPrompt && messages.length === 0 && !isGenerating) {
      handleSendMessage(project.initialPrompt);
    }
  }, [project, messages.length, isGenerating]);

  // Persist messages
  useEffect(() => {
    if (project && messages.length > 0) {
      puter.kv.set(`project_${code}`, {
        ...project,
        messages: messages,
        updatedAt: new Date().toISOString()
      });
    }
  }, [messages, project, code]);

  const addLog = useCallback((log) => {
    setLogs(prev => [...prev.slice(-100), log]);
  }, []);

  const handleSendMessage = async (content) => {
    if (isGenerating) return;
    const newMessages = [...messages, { role: 'user', content, timestamp: new Date().toISOString() }];
    setMessages(newMessages);
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      await chatWithAI(
        newMessages,
        {
          model,
          signal: abortControllerRef.current.signal,
          onUrlReady: (url) => setPreviewUrl(url),
        },
        (updatedMessages) => {
          setMessages(updatedMessages);
        },
        (log) => addLog(log)
      );
    } catch (err) {
      if (err.name !== 'AbortError') addLog(`AI Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopAI = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleFileSelect = async (path) => {
    setSelectedFile(path);
    try {
      const content = await wc.readFile(path);
      setFileContent(content);
    } catch (err) {
      console.error("Failed to read file", err);
    }
  };

  const handleEditorChange = (value) => {
    setFileContent(value);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await wc.writeFile(selectedFile, fileContent);
      addLog(`Saved ${selectedFile}`);
    } catch (err) {
      addLog(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-white overflow-hidden font-sans">
      <header className="h-16 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-[#0A0A0A] shadow-lg shadow-primary/20 font-bold">
              <Layout size={20} />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter">OnyxGPT</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <Folder size={14} className="text-gray-500" />
            <span className="text-xs font-mono text-gray-300">{project?.name || 'onyx-app'}</span>
          </div>
        </div>

        <div className="flex items-center bg-black border border-white/10 p-1 rounded-2xl">
          <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} label="Preview" />
          <TabButton active={activeTab === 'code'} onClick={() => setActiveTab('code')} label="Code" />
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} label="Activity" />
        </div>

        <div className="flex items-center space-x-4">
          <IconButton icon={<RefreshCw size={16} />} onClick={() => wc.getWebContainer()} title="Restart Engine" />
          <IconButton icon={<Settings size={18} />} onClick={() => setIsSettingsOpen(true)} />
          <IconButton icon={<LogOut size={18} />} onClick={signOut} className="text-red-400 hover:bg-red-500/10" />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#0A0A0A] relative overflow-hidden min-w-0">
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
              {previewUrl ? (
                <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Live Preview" />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-600 flex-col space-y-4">
                  <div className="animate-pulse bg-white/5 h-32 w-48 rounded-lg border border-white/5"></div>
                  <p className="text-sm italic">Engine running... Waiting for dev server.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && <ActivityView messages={messages} logs={logs} />}

          {activeTab === 'code' && (
            <div className="h-full flex overflow-hidden">
              <FileExplorer onFileSelect={handleFileSelect} activeFile={selectedFile} />
              <div className="flex-1 flex flex-col min-w-0">
                <div className="h-10 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
                  <div className="flex items-center space-x-2">
                    <FileText size={14} className="text-primary" />
                    <span className="text-xs font-mono text-gray-400 truncate">{selectedFile || 'No file selected'}</span>
                  </div>
                  {selectedFile && (
                    <button
                      onClick={saveFile}
                      disabled={isSaving}
                      className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-3 py-1 rounded hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    path={selectedFile}
                    defaultLanguage="javascript"
                    value={fileContent}
                    onChange={handleEditorChange}
                    options={{
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      padding: { top: 16 }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-[400px] xl:w-[450px] flex flex-col bg-[#0A0A0A] border-l border-white/5 shrink-0 z-20">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            onStop={handleStopAI}
            model={model}
            setModel={setModel}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating}
          />
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={appSettings} setSettings={setAppSettings} />
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-1.5 rounded-xl text-xs font-bold transition-all ${
        active ? 'bg-primary text-[#0A0A0A] shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function IconButton({ icon, onClick, title, className = "" }) {
  return (
    <button onClick={onClick} title={title} className={`p-2 text-gray-500 hover:text-white hover:bg-white/5 transition-all ${className}`}>
      {icon}
    </button>
  );
}
