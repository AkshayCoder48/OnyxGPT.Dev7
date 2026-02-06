import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as ai from '../services/aiService';
import { getWebContainer } from '../services/webContainer';
import {
  getProjectMessages,
  saveProjectMessages,
  getProjects,
  saveProject,
  getGitHubToken
} from '../services/storage';
import * as github from '../services/githubService';
import { generateRandomName } from '../utils/names';
import ChatPanel from '../components/workspace/ChatPanel';
import SettingsModal from '../components/workspace/SettingsModal';
import CloudView from '../components/workspace/CloudView';
import {
  ChevronLeft,
  Monitor,
  Terminal as TerminalIcon,
  Cloud,
  Settings,
  LogOut,
  Github,
  Box,
  Cpu,
  RefreshCcw,
  Loader2,
  Trash2
} from 'lucide-react';

export default function WorkspacePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAmenity, setActiveAmenity] = useState('preview');
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem(`onyx_settings_${id}`);
    return saved ? JSON.parse(saved) : {
      modelId: 'gemini-1.5-pro',
      temperature: 0.7,
      systemPrompt: '',
      maxTokens: 4096
    };
  });

  const [todos, setTodos] = useState([]);

  const webContainerStarted = useRef(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    localStorage.setItem(`onyx_settings_${id}`, JSON.stringify(appSettings));
  }, [appSettings, id]);

  useEffect(() => {
    const loadProject = async () => {
      const projects = await getProjects();
      const p = projects.find(item => item.id === id);
      if (p) {
        setProject(p);
        setTodos(p.todos || []);
      }
      const token = await getGitHubToken();
      setGhConnected(!!token);
    };
    loadProject();
  }, [id]);

  useEffect(() => {
    const initWC = async () => {
      if (!webContainerStarted.current) {
        webContainerStarted.current = true;
        try {
          addLog('RUNTIME: Provisioning WebContainer instance...');
          const wc = await getWebContainer();
          addLog('RUNTIME: Environment isolation complete.');

          wc.on('server-ready', (port, url) => {
            setPreviewUrl(url);
            addLog(`RUNTIME: Server active on port ${port}`);
          });
        } catch (err) {
          addLog(`RUNTIME ERROR: ${err.message}`);
        }
      }
    };
    initWC();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (id && !hasInitialized.current) {
        const data = await getProjectMessages(id);
        if (data && data.length > 0) {
          setMessages(data);
          hasInitialized.current = true;
        }
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isGenerating && !hasInitialized.current) {
      handleSendMessage(initialPrompt);
      hasInitialized.current = true;
    } else if (messages.length === 0 && !hasInitialized.current) {
      setMessages([{ role: 'assistant', content: "Hello! I'm Onyx. Neural engine is active and synced with Puter cloud resources. What would you like to construct today?" }]);
    }
  }, [initialPrompt, messages.length, id]);

  useEffect(() => {
    if (messages.length > 0) {
      saveProjectMessages(id, messages);
    }
  }, [messages, id]);

  const addLog = (log) => {
    setLogs(prev => [...prev, typeof log === 'string' ? log : JSON.stringify(log)]);
  };

  const executeTool = async (call) => {
    const { name, arguments: argsString } = call.function;
    const args = JSON.parse(argsString);
    const wc = await getWebContainer();

    try {
      if (name === 'run_terminal_command') {
        addLog(`onyx-app $ ${args.command}`);
        const [cmd, ...cmdArgs] = args.command.split(' ');
        const process = await wc.spawn(cmd, cmdArgs);

        let output = '';
        const decoder = new TextDecoder();
        process.stdout.pipeTo(new WritableStream({
          write(chunk) {
            const text = decoder.decode(chunk);
            output += text;
            addLog(text);
          }
        }));

        process.stderr.pipeTo(new WritableStream({
          write(chunk) {
            const text = decoder.decode(chunk);
            output += text;
            addLog(text);
          }
        }));

        const exitCode = await process.exit;
        return { role: 'tool', tool_call_id: call.id, content: output || `Process exited with code ${exitCode}` };
      }

      if (name === 'write_file') {
        addLog(`FS: Writing to ${args.path}...`);
        await wc.fs.writeFile(args.path, args.content);
        return { role: 'tool', tool_call_id: call.id, content: `Successfully written to ${args.path}` };
      }
    } catch (err) {
      addLog(`TOOL ERROR: ${err.message}`);
      return { role: 'tool', tool_call_id: call.id, content: `Error: ${err.message}` };
    }
  };

  const handleSendMessage = async (content) => {
    if (isGenerating) return;

    let currentMessages = [...messages];
    if (content) {
      currentMessages.push({ role: 'user', content });
      setMessages(currentMessages);
    }

    setIsGenerating(true);

    try {
      while (true) {
        const response = await ai.generateResponse({
          messages: currentMessages,
          projectId: id,
          modelId: appSettings.modelId,
          settings: appSettings,
          tools: availableTools,
          onToolCall: (name, data) => {
            if (name === 'manage_roadmap') {
              setTodos(data);
            }
          }
        });

        currentMessages.push(response);
        setMessages([...currentMessages]);

        if (response.tool_calls) {
          const toolResults = [];
          for (const call of response.tool_calls) {
            if (call.function.name === 'manage_roadmap') continue;
            const result = await executeTool(call);
            toolResults.push(result);
          }
          if (toolResults.length > 0) {
            currentMessages.push(...toolResults);
            setMessages([...currentMessages]);
            continue; // Go for another round of generation
          }
        }
        break;
      }
    } catch (err) {
      console.error('Inference Failure:', err);
      addLog(`NEURAL ERROR: ${err.message}`);
      setMessages(prev => [...prev, { role: 'assistant', content: `Handshake failure: ${err.message}. Please check your connection or model settings.` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndo = () => {
    if (messages.length > 1) {
      setMessages(prev => prev.slice(0, -1));
    }
  };

  const handleAttachContext = () => {
    addLog('SYSTEM: Context buffer attached to next inference chain.');
  };

  const handleRefreshConsole = () => {
    setLogs([]);
    addLog('SYSTEM: Console trace cleared.');
  };

  const handlePushToGitHub = async () => {
    setIsDeploying(true);
    addLog('GH_SYNC: Initiating recursive file traversal...');
    try {
      const wc = await getWebContainer();
      const files = await getFilesRecursive(wc, '/');

      let repoName = project?.name?.toLowerCase().replace(/\s+/g, '-') || `onyx-project-${id}`;
      addLog(`GH_SYNC: Provisioning repository ${repoName}...`);

      const repo = await github.createRepo(repoName);
      addLog(`GH_SYNC: Repository provisioned. Syncing ${Object.keys(files).length} objects...`);

      await github.pushToRepo(repo.owner.login, repo.name, files);
      addLog('GH_SYNC: Handshake successful. Cluster synchronized.');
      window.open(repo.html_url, '_blank');
    } catch (err) {
      addLog(`GH_SYNC ERROR: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const getFilesRecursive = async (wc, dir) => {
    const entries = await wc.fs.readdir(dir, { withFileTypes: true });
    const files = {};
    for (const entry of entries) {
      const path = dir === '/' ? entry.name : `${dir}/${entry.name}`;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      if (entry.isDirectory()) {
        const subFiles = await getFilesRecursive(wc, path);
        Object.assign(files, subFiles);
      } else {
        const content = await wc.fs.readFile(path, 'utf-8');
        files[path.startsWith('/') ? path.substring(1) : path] = content;
      }
    }
    return files;
  };

  const availableTools = [
    {
      name: 'run_terminal_command',
      description: 'Execute a command in the isolated shell',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The command to execute' }
        },
        required: ['command']
      }
    },
    {
      name: 'write_file',
      description: 'Write or update a file in the sandbox',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Destination path' },
          content: { type: 'string', description: 'Buffer content' }
        },
        required: ['path', 'content']
      }
    }
  ];

  return (
    <div className="h-screen bg-[#050505] flex flex-col text-white font-sans selection:bg-primary/30">
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
            className="text-gray-400 hover:text-white transition-colors p-2.5 hover:bg-white/5 rounded-2xl active:scale-90"
            title="Agent Directives"
          >
            <Settings size={20} />
          </button>
          <button onClick={signOut} className="text-gray-400 hover:text-red-400 transition-colors p-2.5 hover:bg-red-400/5 rounded-2xl active:scale-90" title="Terminate Session">
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
