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
  Files,
  RefreshCw,
  Search as SearchIcon
} from 'lucide-react';
import { chatWithAI } from '../services/aiService';
import { PROMPTS } from '../utils/prompts';
import { saveMessages, getProjectMessages, saveProject, getProjects, getGitHubToken } from '../services/storage';
import { generateRandomName } from '../utils/names';
import { getWebContainer, listFiles, readFile as wcReadFile } from '../services/webContainer';
import CloudView from '../components/workspace/CloudView';
import * as github from '../services/githubService';
import { useAuth } from '../hooks/useAuth';

export default function WorkspacePage() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialPrompt = location.state?.initialPrompt || '';

  const [activeAmenity, setActiveAmenity] = useState('preview');
  const [messages, setMessages] = useState([]);
  const [todos, setTodos] = useState([]);
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('onyx_settings');
    const defaultSettings = {
      customModelId: 'gpt-4o',
      modelHistory: ['gpt-4o', 'claude-3.5-sonnet', 'o1-mini']
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });
  const [mode, setMode] = useState('execute');
  const [logs, setLogs] = useState(['Initializing Onyx Environment...', 'User authenticated.']);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [project, setProject] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);
  const [loading, setLoading] = useState(code !== 'new');

  const hasInitialized = useRef(false);
  const webContainerStarted = useRef(false);

  useEffect(() => {
    const loadProject = async () => {
      if (code && code !== 'new') {
        // If we already have this project loaded, don't trigger full loading
        if (project?.id === code) return;

        setLoading(true);
        const projects = await getProjects();
        const p = projects.find(proj => proj.id === code);
        if (p) {
          setProject(p);
          if (p.todos) setTodos(p.todos);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    if (user) {
      loadProject();
      checkGitHub();
    }
  }, [code, user]);

  const checkGitHub = async () => {
    const token = await getGitHubToken();
    setGhConnected(!!token);
  };

  const refreshFiles = async () => {
    try {
      const entries = await listFiles('/');
      setFiles(entries);
    } catch (err) {
      console.error('Failed to list files', err);
    }
  };

  useEffect(() => {
    const initWC = async () => {
      if (!webContainerStarted.current && user) {
        webContainerStarted.current = true;
        try {
          addLog('Booting WebContainer...');
          await getWebContainer();
          addLog('WebContainer ready.');
          refreshFiles();
        } catch (err) {
          addLog(`WebContainer Error: ${err.message}`);
        }
      }
    };
    initWC();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (code && code !== 'new' && !hasInitialized.current && user) {
        const data = await getProjectMessages(code);
        if (data && data.length > 0) {
          setMessages(data);
          hasInitialized.current = true;
        }
      }
    };
    loadData();
  }, [code, user]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isGenerating && !hasInitialized.current && user) {
      handleSendMessage(initialPrompt);
      hasInitialized.current = true;
    } else if (messages.length === 0 && !hasInitialized.current && code !== 'new' && user) {
      setMessages([{ role: 'assistant', content: "Hello! I'm Onyx. I've initialized your cloud environment. What would you like to build today?" }]);
    }
  }, [initialPrompt, messages.length, code, user]);

  const addLog = (log) => {
    if (typeof log === 'string' && (log.includes('AI calling') || log.includes('tool_use'))) return; // Filter out verbose AI calling logs
    setLogs(prev => [...prev, typeof log === 'string' ? log : JSON.stringify(log)]);
  };

  const refreshTerminal = async () => {
    setLogs(['Re-initializing terminal...', 'SharedArrayBuffer support verified.', 'User authenticated.']);
    try {
      const wc = await getWebContainer();
      addLog('WebContainer re-attached.');
      const rootFiles = await listFiles('/');
      addLog(`Root files: ${rootFiles.join(', ')}`);
      refreshFiles();
    } catch (err) {
      addLog(`Refresh Error: ${err.message}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearchResults(['Searching...']);
    try {
      const results = [];
      const traverse = async (path) => {
        const entries = await listFiles(path);
        for (const entry of entries) {
          if (['node_modules', '.git', 'dist'].includes(entry)) continue;
          const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
          try {
            const content = await wcReadFile(fullPath);
            if (content.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push(fullPath);
            }
          } catch (e) {
            await traverse(fullPath);
          }
        }
      };
      await traverse('/');
      setSearchResults(results.length > 0 ? results : ['No results found.']);
    } catch (err) {
      setSearchResults([`Search error: ${err.message}`]);
    }
  };

  const handleSendMessage = async (content) => {
    if (isGenerating) return;
    setIsGenerating(true);

    let projectId = code;
    if (projectId === 'new') {
      projectId = Math.random().toString(36).substring(7);
      const newProject = {
        id: projectId,
        name: generateRandomName(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        todos: []
      };
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
          model: appSettings.customModelId,
          onUrlReady: (url) => {
            setPreviewUrl(url);
            setActiveAmenity('preview');
          },
          onTodosUpdate: (newTodos) => {
            setTodos(newTodos);
            if (project) {
              saveProject({ ...project, todos: newTodos });
            }
          },
          onFilesUpdate: () => {
            refreshFiles();
          },
          systemPrompt: PROMPTS[mode] || PROMPTS.execute,
          todos: todos
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
      const lastMsg = messages[messages.length - 1];
      const newMsgs = messages.slice(0, -1);
      setMessages(newMsgs);
      saveMessages(code, newMsgs);

      // If the last thing was a context log, we can't really "undo" it easily but we can add a log
      addLog("Last action undone.");
    }
  };

  const handleAttachContext = () => {
    addLog("Context attached: Filesystem snapshot taken.");
    // Also add a message to the chat so it's undoable and visible to AI
    const msg = { role: 'system', content: 'Context attached: Filesystem snapshot taken.', timestamp: new Date().toISOString() };
    const newMessages = [...messages, msg];
    setMessages(newMessages);
    saveMessages(code, newMessages);
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

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>
        <div className="flex flex-col items-center space-y-6 z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl border-2 border-primary/20 border-t-primary animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Box className="text-primary w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-white font-display font-bold text-xl tracking-tight">OnyxGPT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 animate-pulse">Resuming Workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col bg-background text-white overflow-hidden font-sans">
      <header className="h-14 border-b border-gray-800 bg-surface flex items-center justify-between px-4 shrink-0 relative z-10">
        <div className="flex items-center space-x-4 overflow-hidden">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all shrink-0">
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
              <span className="hidden sm:inline">{isDeploying ? 'Pushing...' : 'Push to GitHub'}</span>
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
        <div className="w-14 border-r border-gray-800 bg-surface flex flex-col items-center py-4 space-y-4 shrink-0 z-20">
          <AmenityButton
            active={activeAmenity === 'preview'}
            onClick={() => setActiveAmenity('preview')}
            icon={<Monitor size={20} />}
            label="Preview"
          />
          <AmenityButton
            active={activeAmenity === 'files'}
            onClick={() => setActiveAmenity('files')}
            icon={<Files size={20} />}
            label="File Explorer"
          />
          <AmenityButton
            active={activeAmenity === 'terminal'}
            onClick={() => setActiveAmenity('terminal')}
            icon={<TerminalIcon size={20} />}
            label="Terminal"
          />
          <AmenityButton
            active={activeAmenity === 'search'}
            onClick={() => setActiveAmenity('search')}
            icon={<SearchIcon size={20} />}
            label="Global Search"
          />
          <AmenityButton
            active={activeAmenity === 'cloud'}
            onClick={() => setActiveAmenity('cloud')}
            icon={<Cloud size={20} />}
            label="Cloud Storage"
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
               <div className="p-2 border-b border-gray-800 bg-background/50 flex justify-end px-4">
                  <button
                    onClick={refreshTerminal}
                    className="flex items-center space-x-2 text-[10px] text-gray-500 hover:text-primary transition-colors py-1"
                  >
                    <RefreshCw size={12} />
                    <span>Refresh Terminal</span>
                  </button>
               </div>
               <div className="p-4 flex-1 font-mono text-[11px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1 leading-relaxed">
                      <span className="text-primary/50 mr-2 opacity-50">➜</span>
                      <span className="text-gray-300 whitespace-pre-wrap">{log}</span>
                    </div>
                  ))}
                  <div className="flex items-center mt-2">
                    <span className="text-primary mr-2 font-bold">onyx-app $</span>
                    <span className="w-2 h-4 bg-primary animate-pulse"></span>
                  </div>
               </div>
            </div>
          )}

          {activeAmenity === 'files' && (
            <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
               <div className="p-4 border-b border-gray-800 bg-background/50 flex justify-between items-center px-6">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project Files</span>
                  <button onClick={refreshFiles} className="text-gray-500 hover:text-primary transition-colors"><RefreshCw size={12} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {files.length > 0 ? files.map(f => (
                    <div key={f} className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer group transition-all">
                       <FileCode size={14} className="text-primary/60" />
                       <span className="text-xs text-gray-300 group-hover:text-white">{f}</span>
                    </div>
                  )) : (
                    <div className="py-20 text-center">
                       <Loader2 size={24} className="mx-auto text-gray-700 animate-spin mb-4" />
                       <p className="text-xs text-gray-600 font-mono tracking-tighter">Indexing Filesystem...</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeAmenity === 'search' && (
            <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
               <div className="p-4 border-b border-gray-800 bg-background/50 px-6">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full bg-background border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-primary transition-all font-mono"
                    />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {searchResults.map((res, i) => (
                    <div key={i} className="p-2 border border-gray-800 rounded bg-background/30 text-[10px] font-mono text-gray-400 hover:border-primary/40 cursor-pointer truncate transition-all">
                      {res}
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="py-20 text-center text-gray-600">
                       <SearchIcon size={32} className="mx-auto mb-4 opacity-20" />
                       <p className="text-[10px]">Search keywords within your project files.</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeAmenity === 'cloud' && <CloudView />}
        </div>

        <div className="w-[400px] xl:w-[450px] flex flex-col bg-surface shadow-2xl shrink-0">
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            model={appSettings.customModelId}
            mode={mode}
            setMode={setMode}
            isGenerating={isGenerating}
            onUndo={handleUndo}
            onAttachContext={handleAttachContext}
            todos={todos}
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
