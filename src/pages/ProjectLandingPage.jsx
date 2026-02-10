import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProjects, saveProject, getGitHubToken, deleteGitHubToken } from '../services/storage';
import * as github from '../services/githubService';
import { generateRandomName } from '../utils/names';
import { clearVirtualFS } from '../services/webContainer';
import {
  Plus,
  Search,
  Folder,
  Github,
  Settings,
  MoreVertical,
  Terminal,
  ExternalLink,
  Cpu,
  Zap,
  Layout,
  MessageSquare,
  ChevronRight,
  LogOut,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Command,
  ArrowRight
} from 'lucide-react';

export default function ProjectLandingPage() {
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [ghUser, setGhUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInitialData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [projs, token] = await Promise.all([
        getProjects(),
        getGitHubToken()
      ]);
      setProjects(Array.isArray(projs) ? projs : []);
      if (token) {
        try {
          const userData = await github.getUser();
          setGhUser(userData);
          setIsGitHubConnected(true);
        } catch (err) {
          console.error('GH Error', err);
          setIsGitHubConnected(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    if (e) e.preventDefault();
    if (!window.puter) {
      alert("Puter.js is not loaded. Please ensure you are in a Secure Context (HTTPS or localhost) and your browser is not blocking scripts.");
      return;
    }
    if (!user) {
      await signIn();
      return;
    }

    const id = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newProject = {
      id,
      name: generateRandomName(),
      initialPrompt: promptInput,
      template: 'react-vite', // Only React + Vite
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(newProject);
    // Ensure fresh WebContainer for new project
    clearVirtualFS();
    navigate(`/project/${id}`);
  };

  const handleConnectGitHub = async () => {
    if (!window.puter) {
      alert("Puter.js is not loaded.");
      return;
    }
    if (isGitHubConnected) {
       if (confirm("Disconnect GitHub account?")) {
         await deleteGitHubToken();
         setIsGitHubConnected(false);
         setGhUser(null);
       }
       return;
    }
    const token = prompt("Please enter your GitHub Personal Access Token (repo scope):");
    if (token) {
      try {
        await window.puter.kv.set('github_token', token);
        loadInitialData();
      } catch (err) {
        alert("Failed to save token: " + err.message);
      }
    }
  };

  const filteredProjects = projects.filter(p =>
    p?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col bg-[#0d0d0d] shrink-0">
        {/* Sidebar Header */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Terminal className="text-[#0A0A0A]" size={24} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Onyx<span className="text-primary">GPT</span></span>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          <div className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Recent Projects</div>
          {filteredProjects.length > 0 ? (
            filteredProjects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                  <Folder size={16} />
                </div>
                <div className="flex-1 text-left truncate">
                  <div className="text-sm font-medium truncate">{project.name}</div>
                  <div className="text-[10px] text-gray-600">{new Date(project.updatedAt).toLocaleDateString()}</div>
                </div>
                <ChevronRight size={14} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          ) : (
            <div className="px-2 py-4 text-xs text-gray-600 italic">No projects found</div>
          )}
        </div>

        {/* Sidebar Bottom */}
        <div className="p-4 border-t border-white/5 space-y-4">
          <button
            onClick={handleConnectGitHub}
            className="flex items-center space-x-3 w-full p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-all group"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isGitHubConnected ? 'bg-green-500/10 text-green-500' : 'bg-white/5 group-hover:bg-white/10'}`}>
              <Github size={20} />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-bold">{isGitHubConnected ? ghUser?.login : 'Connect GitHub'}</div>
              <div className="text-[10px] text-gray-500">{isGitHubConnected ? 'Connected' : 'Sync your projects'}</div>
            </div>
            {isGitHubConnected && <CheckCircle2 size={14} className="text-green-500" />}
          </button>

          {user ? (
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                {user.username?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <div className="text-xs font-bold truncate">{user.username}</div>
                <button onClick={signOut} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">Sign Out</button>
              </div>
              <Settings size={16} className="text-gray-500 cursor-pointer hover:text-white" />
            </div>
          ) : (
            <button
              onClick={signIn}
              className="w-full bg-primary text-[#0A0A0A] font-bold py-3 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
            >
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-5xl mx-auto w-full relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold mb-8 animate-pulse">
            <Sparkles size={12} />
            POWERED BY GEMINI 2.0 & WEB CONTAINERS
          </div>

          <h1 className="text-5xl md:text-6xl font-display font-bold text-center mb-6 leading-tight tracking-tight">
            Build your next big idea <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">in seconds.</span>
          </h1>

          <p className="text-gray-400 text-center mb-12 max-w-2xl leading-relaxed">
            The world's most advanced AI-native IDE. Describe your application and watch as OnyxGPT generates, builds, and deploys it in real-time.
          </p>

          {/* Prompt Box */}
          <div className="w-full max-w-3xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-focus-within:opacity-100 transition duration-500"></div>
            <form onSubmit={handleCreateProject} className="relative bg-[#121212] border border-white/5 rounded-2xl p-4 shadow-2xl focus-within:border-primary/30 transition-all">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                rows="4"
                className="w-full bg-transparent border-none outline-none text-lg resize-none placeholder:text-gray-700 text-white font-medium"
                placeholder="What do you want to build today?"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
              ></textarea>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    <Zap size={10} className="text-primary" />
                    <span>React + Vite</span>
                  </div>
                  <div className="hidden md:flex items-center space-x-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    <Command size={10} />
                    <span>Enter to generate</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!promptInput.trim()}
                  className="bg-primary text-[#0A0A0A] font-bold px-6 py-2.5 rounded-xl flex items-center space-x-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                >
                  <span>Build App</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Suggestions */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
            {[
              { title: 'SaaS Dashboard', icon: <Layout size={16} /> },
              { title: 'Portfolio Site', icon: <User size={16} /> },
              { title: 'E-commerce App', icon: <Zap size={16} /> }
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setPromptInput(`Build a ${suggestion.title} with modern UI and responsive design.`)}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-500 group-hover:text-primary transition-colors">
                    {suggestion.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">{suggestion.title}</span>
                </div>
                <Plus size={14} className="text-gray-700" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-8 text-center text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em] relative z-10">
          OnyxGPT v2.0 • Secured by Puter.js • Browser-native Runtime
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}} />
    </div>
  );
}
