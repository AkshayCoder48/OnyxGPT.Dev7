import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getProjects, saveProject, saveGitHubToken, getGitHubToken } from '../services/storage';
import * as github from '../services/githubService';
import { generateRandomName } from '../utils/names';
import {
  Plus,
  Search,
  Layout,
  Folder,
  Settings as SettingsIcon,
  Github,
  MoreVertical,
  Pin,
  Trash2,
  Download,
  Terminal,
  Grid,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [ghUser, setGhUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInitialData();
    } else if (!authLoading) {
      // If auth finished and no user, we will redirect via the other useEffect
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProjects(),
        checkGitHub()
      ]);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(Array.isArray(data) ? data : []);
  };

  const checkGitHub = async () => {
    const token = await getGitHubToken();
    if (token) {
      try {
        const user = await github.getUser();
        setGhUser(user);
        setIsGitHubConnected(true);
      } catch (err) {
        console.error('GitHub token invalid or API error', err);
        setIsGitHubConnected(false);
      }
    }
  };

  const handleConnectGitHub = async () => {
    const token = prompt("Please enter your GitHub Personal Access Token (with repo scope):");
    if (token) {
      await saveGitHubToken(token);
      await checkGitHub();
    }
  };

  const handleCreateProject = async () => {
    const id = Math.random().toString(36).substring(7);
    const newProject = {
      id,
      name: generateRandomName(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      todos: []
    };
    await saveProject(newProject);
    navigate(`/workspace/${id}`);
  };

  const handleDeleteProject = async (id) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (window.puter) {
      await window.puter.kv.set('onyx_projects', JSON.stringify(updated));
    }
  };

  // Redirection logic
  useEffect(() => {
    if (!authLoading && !user) {
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
              <Grid className="text-primary w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-white font-display font-bold text-xl tracking-tight">OnyxGPT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 animate-pulse">Synchronizing Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
     return <div className="min-h-screen bg-background"></div>; // Prevents flash of content before redirect
  }

  const filteredProjects = projects.filter(p =>
    p?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex text-white font-sans relative overflow-hidden">
      {/* Fancy Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-surface/80 backdrop-blur-xl flex flex-col shrink-0 z-10">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-background font-bold">O</div>
          <span className="font-display font-bold text-xl">Onyx<span className="text-primary">GPT</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarButton
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            icon={<Folder size={18} />}
            label="Projects"
          />
          <SidebarButton
            active={activeTab === 'github'}
            onClick={() => setActiveTab('github')}
            icon={<Github size={18} />}
            label="Connect GitHub"
          />
        </nav>

        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="flex items-center space-x-3 p-2 bg-background/50 rounded-xl border border-gray-800">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {user.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-bold truncate">{user.username}</div>
              <button onClick={signOut} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">Sign Out</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden z-10">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-surface/30 backdrop-blur-md sticky top-0 z-10">
          <h2 className="font-display font-bold text-xl uppercase tracking-widest text-gray-400">
            {activeTab === 'projects' && 'Your Projects'}
            {activeTab === 'github' && 'GitHub Integration'}
          </h2>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search..."
                className="bg-background border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary transition-all w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => handleCreateProject()}
              className="bg-primary text-background font-bold px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>New Project</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => handleDeleteProject(project.id)}
                  onClick={() => navigate(`/workspace/${project.id}`)}
                />
              ))}
              {filteredProjects.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-800 rounded-3xl">
                  <Folder size={48} className="mx-auto text-gray-700 mb-4" />
                  <p className="text-gray-500">No projects found. Create your first one!</p>
                </div>
              )}
            </div>
          )}


          {activeTab === 'github' && (
            <div className="max-w-2xl mx-auto bg-surface border border-gray-800 rounded-2xl p-12 text-center">
              <Github size={64} className="mx-auto text-white mb-6" />
              {isGitHubConnected ? (
                <div className="space-y-6">
                   <div className="flex items-center justify-center space-x-3">
                      {ghUser?.avatar_url && <img src={ghUser.avatar_url} className="w-12 h-12 rounded-full border-2 border-primary" alt="GH Avatar" />}
                      <div className="text-left">
                        <div className="flex items-center space-x-2 text-green-500 font-bold text-xl">
                          <CheckCircle2 size={24} />
                          <span>Connected as {ghUser?.login}</span>
                        </div>
                        <p className="text-gray-500 text-sm">{ghUser?.bio || 'No bio available'}</p>
                      </div>
                   </div>
                   <div className="p-4 bg-background/50 border border-gray-800 rounded-xl text-left space-y-2">
                      <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Permissions</div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                         <CheckCircle2 size={12} className="text-primary" />
                         <span>Create public and private repositories</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                         <CheckCircle2 size={12} className="text-primary" />
                         <span>Push code updates to main branch</span>
                      </div>
                   </div>
                   <button
                    onClick={async () => {
                      await window.puter.kv.del('github_token');
                      setIsGitHubConnected(false);
                      setGhUser(null);
                    }}
                    className="flex items-center space-x-2 mx-auto text-red-400 hover:text-red-300 transition-colors text-sm"
                   >
                     <XCircle size={16} />
                     <span>Disconnect Account</span>
                   </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-4">Connect to GitHub</h2>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    Link your GitHub account to OnyxGPT to enable automatic repository creation,
                    code pushing, and seamless deployments.
                  </p>
                  <button
                    onClick={handleConnectGitHub}
                    className="bg-white text-background font-bold px-8 py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center space-x-3 mx-auto shadow-lg"
                  >
                    <Github size={20} />
                    <span>Authorize with Token</span>
                  </button>
                  <p className="mt-6 text-[10px] text-gray-600 italic">
                    Note: Your token is stored securely in your private Puter.js Key-Value storage.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function ProjectCard({ project, onClick, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPinned, setIsPinned] = useState(project.isPinned || false);

  const handleExport = (e) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name || 'project'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowMenu(false);
  };

  const togglePin = (e) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
    // Ideally we'd save this to Puter KV here too
    setShowMenu(false);
  };

  return (
    <div
      className={`bg-surface border ${isPinned ? 'border-primary/40 shadow-[0_0_15px_rgba(0,228,204,0.1)]' : 'border-gray-800'} rounded-2xl overflow-hidden group hover:border-primary/30 transition-all cursor-pointer relative hover:translate-y-[-4px] duration-300`}
      onClick={onClick}
    >
      <div className="h-32 bg-background/50 flex items-center justify-center relative">
        <Folder size={40} className={`${isPinned ? 'text-primary' : 'text-gray-700'} group-hover:text-primary/50 transition-colors`} />
        {isPinned && <Pin size={14} className="absolute top-4 right-4 text-primary fill-primary" />}
      </div>
      <div className="p-4 flex items-center justify-between bg-surface">
        <div>
          <h3 className="font-bold truncate w-40 text-gray-200 group-hover:text-white transition-colors">{project?.name || 'Untitled'}</h3>
          <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-tighter">
            Updated {new Date(project?.updatedAt || project?.createdAt || Date.now()).toLocaleDateString()}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-32 bg-background border border-gray-800 rounded-xl shadow-2xl z-20 overflow-hidden backdrop-blur-md">
               <MenuButton icon={<Pin size={12} className={isPinned ? 'fill-primary text-primary' : ''} />} label={isPinned ? "Unpin" : "Pin"} onClick={togglePin} />
               <MenuButton icon={<Download size={12} />} label="Export" onClick={handleExport} />
               <MenuButton
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuButton({ icon, label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-2 px-3 py-2 text-xs transition-colors ${
        danger ? 'text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
