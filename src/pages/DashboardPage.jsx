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
  Box,
  Cpu,
  LogOut,
  Globe,
  Grid,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  History
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
        console.error('GitHub token invalid', err);
        setIsGitHubConnected(false);
      }
    }
  };

  const handleConnectGitHub = async () => {
    const token = prompt("Enter your GitHub Personal Access Token:");
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="relative">
           <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <Zap size={20} className="text-primary animate-pulse" />
           </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
         <div className="relative mb-8">
            <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full"></div>
            <Terminal size={80} className="text-primary relative" />
         </div>
         <h1 className="text-4xl font-display font-bold mb-4 text-white">Access Restricted</h1>
         <p className="text-gray-400 mb-8 max-w-sm">
           The Onyx cloud infrastructure requires a verified Puter identity to provision project resources.
         </p>
         <button onClick={signIn} className="bg-primary text-black font-bold px-10 py-4 rounded-xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,228,204,0.3)]">
           Authenticate Session
         </button>
      </div>
    );
  }

  const filteredProjects = projects.filter(p =>
    p?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] flex text-white font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0">
        <div className="p-8 flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black font-black shadow-lg shadow-primary/20">O</div>
          <span className="font-display font-bold text-2xl tracking-tighter">Onyx<span className="text-primary">GPT</span></span>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-1">
          <SidebarButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Folder size={18} />} label="Workspace" />
          <SidebarButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<TrendingUp size={18} />} label="Activity" />
          <SidebarButton active={activeTab === 'github'} onClick={() => setActiveTab('github')} icon={<Github size={18} />} label="GitHub" />
        </nav>

        <div className="p-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
             <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {user.username?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="text-xs font-bold truncate text-gray-200">{user.username}</div>
                   <div className="text-[9px] text-primary/60 font-mono">Pro Agent</div>
                </div>
             </div>
             <button onClick={signOut} className="w-full py-2 bg-white/5 hover:bg-red-500/10 text-[10px] font-bold text-gray-400 hover:text-red-400 rounded-lg transition-all flex items-center justify-center space-x-2">
                <LogOut size={12} />
                <span>Disconnect</span>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex flex-col">
             <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
               {activeTab === 'projects' && 'Active Projects'}
               {activeTab === 'activity' && 'Cloud Activity'}
               {activeTab === 'github' && 'Version Control'}
             </h2>
             <div className="text-xs text-gray-600 font-mono">env: production-global</div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
              <input
                type="text"
                placeholder="Find resources..."
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-primary/50 transition-all w-72"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleCreateProject}
              className="bg-primary text-black font-bold px-6 py-2.5 rounded-xl text-xs hover:shadow-[0_0_20px_rgba(0,228,204,0.4)] hover:scale-105 transition-all flex items-center space-x-2"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Initialize Project</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === 'projects' && (
            <div className="space-y-10">
               {/* Stats Overview */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard icon={<Box size={16}/>} label="Allocated Resources" value={projects.length} />
                  <StatCard icon={<Cpu size={16}/>} label="AI Processing" value="High Performance" />
                  <StatCard icon={<Globe size={16}/>} label="Network Status" value="Online" color="text-green-500" />
               </div>

               <div>
                  <h3 className="text-xl font-display font-bold mb-6 flex items-center space-x-2">
                     <span>Your Sandbox</span>
                     <Sparkles size={18} className="text-primary" />
                  </h3>
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
                      <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
                        <Folder size={48} className="mx-auto text-white/10 mb-6" />
                        <p className="text-gray-500 font-medium">No projects detected in this region.</p>
                        <button onClick={handleCreateProject} className="mt-4 text-primary text-xs font-bold hover:underline">Start your first build</button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="max-w-3xl mx-auto space-y-6">
               <h3 className="text-2xl font-bold mb-8">Recent Cloud Activity</h3>
               {[1,2,3].map(i => (
                 <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                          <History size={20} />
                       </div>
                       <div>
                          <div className="font-bold text-sm">System snapshot completed</div>
                          <div className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">project-alpha-99 • 2 hours ago</div>
                       </div>
                    </div>
                    <div className="text-[10px] font-mono text-green-500/60">OK</div>
                 </div>
               ))}
               <div className="text-center py-10">
                  <p className="text-gray-600 text-xs italic">Historical logs are limited to the current session.</p>
               </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="max-w-2xl mx-auto bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
              <Github size={80} className="mx-auto text-white mb-8 relative" />
              {isGitHubConnected ? (
                <div className="space-y-8 relative">
                   <div className="flex items-center justify-center space-x-4">
                      {ghUser?.avatar_url && <img src={ghUser.avatar_url} className="w-16 h-16 rounded-2xl border-2 border-primary/50 shadow-2xl" alt="GH Avatar" />}
                      <div className="text-left">
                        <div className="flex items-center space-x-2 text-green-400 font-bold text-2xl">
                          <CheckCircle2 size={24} />
                          <span>Linked to {ghUser?.login}</span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{ghUser?.bio || 'Infrastructure engineer'}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Repositories</div>
                         <div className="text-lg font-bold">{ghUser?.public_repos || 0} Public</div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                         <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Followers</div>
                         <div className="text-lg font-bold">{ghUser?.followers || 0}</div>
                      </div>
                   </div>
                   <button
                    onClick={async () => {
                      await window.puter.kv.del('github_token');
                      setIsGitHubConnected(false);
                      setGhUser(null);
                    }}
                    className="flex items-center space-x-2 mx-auto text-red-500/60 hover:text-red-400 transition-all text-xs font-bold pt-4"
                   >
                     <XCircle size={14} />
                     <span>Revoke Access Token</span>
                   </button>
                </div>
              ) : (
                <div className="relative">
                  <h2 className="text-3xl font-display font-bold mb-4">Connect GitHub</h2>
                  <p className="text-gray-400 mb-10 leading-relaxed text-sm max-w-md mx-auto">
                    Automate repo creation and deployment by linking your GitHub account.
                    Tokens are stored exclusively in your Puter KV space.
                  </p>
                  <button
                    onClick={handleConnectGitHub}
                    className="bg-white text-black font-black px-10 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl flex items-center space-x-3 mx-auto"
                  >
                    <Github size={20} />
                    <span>Authorize Connector</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-white" }) {
   return (
      <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] flex flex-col space-y-4">
         <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
            {icon}
         </div>
         <div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</div>
            <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
         </div>
      </div>
   );
}

function SidebarButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all ${
        active
          ? 'bg-primary/10 text-primary border border-primary/10 font-bold'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] border border-transparent'
      }`}
    >
      {icon}
      <span className="text-sm tracking-tight">{label}</span>
    </button>
  );
}

function ProjectCard({ project, onClick, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="bg-white/[0.03] border border-white/5 rounded-[2rem] overflow-hidden group hover:border-primary/20 hover:bg-white/[0.05] transition-all cursor-pointer relative"
      onClick={onClick}
    >
      <div className="h-32 bg-black/40 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <Folder size={48} className="text-white/10 group-hover:text-primary/30 group-hover:scale-110 transition-all duration-500" />
      </div>
      <div className="p-6 flex items-center justify-between">
        <div className="overflow-hidden">
          <h3 className="font-bold truncate text-gray-200 group-hover:text-white transition-colors">{project?.name || 'Untitled'}</h3>
          <p className="text-[9px] text-gray-600 font-mono mt-1 uppercase tracking-tighter flex items-center space-x-1">
             <Clock size={10} />
             <span>{new Date(project?.updatedAt || project?.createdAt || Date.now()).toLocaleDateString()}</span>
          </p>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-full mb-3 w-40 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
               <MenuButton icon={<Pin size={14} />} label="Pin to Top" />
               <MenuButton icon={<Download size={14} />} label="Export Config" />
               <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
               <MenuButton
                  icon={<Trash2 size={14} />}
                  label="Destroy"
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
      className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-medium transition-all ${
        danger ? 'text-red-400 hover:bg-red-400/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
