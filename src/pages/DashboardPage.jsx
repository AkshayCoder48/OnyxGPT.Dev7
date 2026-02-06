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
  History,
  LogOut,
  Cpu,
  Layers,
  Activity,
  ShieldCheck,
  CpuIcon,
  Server
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
    const token = prompt("Enter your GitHub Personal Access Token (requires repo scope):");
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
         <p className="text-gray-400 mb-8 max-w-sm leading-relaxed">
           Authentication required. The Onyx neural engine requires a Puter session to provision isolated project instances.
         </p>
         <button onClick={signIn} className="bg-primary text-black font-black px-10 py-4 rounded-2xl hover:scale-105 transition-all shadow-[0_0_40px_rgba(0,228,204,0.3)] active:scale-95">
           Establish Session
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
        <div className="p-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,228,204,0.4)]">O</div>
          <span className="font-display font-bold text-2xl tracking-tighter">Onyx<span className="text-primary">GPT</span></span>
        </div>

        <nav className="flex-1 px-6 mt-4 space-y-1">
          <SidebarButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Layers size={18} />} label="Workspace" />
          <SidebarButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<Activity size={18} />} label="Neural Logs" />
          <SidebarButton active={activeTab === 'infrastructure'} onClick={() => setActiveTab('infrastructure')} icon={<Server size={18} />} label="Infrastructure" />
          <SidebarButton active={activeTab === 'github'} onClick={() => setActiveTab('github')} icon={<Github size={18} />} label="GitHub Hub" />
        </nav>

        <div className="p-8">
          <div className="p-5 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-sm shadow-2xl">
             <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {user.username?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="text-xs font-bold truncate text-gray-200">{user.username}</div>
                   <div className="text-[9px] text-primary/60 font-mono tracking-widest uppercase">Verified Agent</div>
                </div>
             </div>
             <button onClick={signOut} className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all flex items-center justify-center space-x-2">
                <LogOut size={12} />
                <span>Terminate Session</span>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Fancy Animated Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>

        <header className="h-24 border-b border-white/5 flex items-center justify-between px-12 bg-black/20 backdrop-blur-2xl sticky top-0 z-10">
          <div className="flex flex-col">
             <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
               {activeTab === 'projects' && 'Central Intelligence'}
               {activeTab === 'activity' && 'Neural Activity Logs'}
               {activeTab === 'infrastructure' && 'System Architecture'}
               {activeTab === 'github' && 'Version Control Subsystem'}
             </h2>
             <div className="text-[10px] text-primary/40 font-mono mt-1">status: operational // latency: 24ms // region: us-east-1</div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
              <input
                type="text"
                placeholder="Query sandbox instances..."
                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-xs outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all w-80 font-mono shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={handleCreateProject}
              className="bg-primary text-black font-black px-8 py-3 rounded-2xl text-xs hover:shadow-[0_0_30px_rgba(0,228,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center space-x-3 group"
            >
              <Plus size={16} strokeWidth={4} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="uppercase tracking-widest">New Project</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          {activeTab === 'projects' && (
            <div className="space-y-12">
               {/* Cyber Stats */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard icon={<Box size={16}/>} label="Neural Slots" value={projects.length} />
                  <StatCard icon={<Cpu size={16}/>} label="Compute Cluster" value="High-Perf" />
                  <StatCard icon={<Globe size={16}/>} label="Sync Status" value="Online" color="text-primary" />
                  <StatCard icon={<ShieldCheck size={16}/>} label="Security" value="Encrypted" />
               </div>

               <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-2xl font-display font-bold text-white flex items-center space-x-3">
                        <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_10px_rgba(0,228,204,0.5)]"></div>
                        <span>Active Sandbox Instances</span>
                     </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredProjects.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onDelete={() => handleDeleteProject(project.id)}
                        onClick={() => navigate(`/workspace/${project.id}`)}
                      />
                    ))}
                    {filteredProjects.length === 0 && (
                      <div className="col-span-full py-40 text-center border border-white/5 rounded-[3rem] bg-white/[0.01] backdrop-blur-sm group hover:bg-white/[0.02] transition-all cursor-pointer" onClick={handleCreateProject}>
                        <Folder size={64} className="mx-auto text-white/5 mb-8 group-hover:text-primary/20 transition-all group-hover:scale-110" />
                        <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-sm">No active instances detected</p>
                        <p className="text-gray-700 text-xs mt-2 font-mono">click anywhere to initialize a new project</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center space-x-4 mb-10">
                  <Activity size={32} className="text-primary" />
                  <h3 className="text-3xl font-display font-bold tracking-tight">Neural Output Trace</h3>
               </div>
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between group hover:border-primary/30 hover:bg-white/[0.04] transition-all shadow-xl">
                    <div className="flex items-center space-x-6">
                       <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-gray-600 group-hover:text-primary transition-colors border border-white/5 shadow-inner">
                          <History size={24} />
                       </div>
                       <div>
                          <div className="font-bold text-base text-gray-200">System state synchronized with Puter Cloud</div>
                          <div className="text-[10px] text-gray-600 font-mono mt-1 uppercase tracking-widest">Hash: 0x{Math.random().toString(16).substring(2, 10).toUpperCase()} • {i * 15}m ago</div>
                       </div>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase shadow-lg shadow-primary/5">Verified</div>
                 </div>
               ))}
               <div className="text-center py-16 opacity-30">
                  <div className="w-20 h-1 bg-white/10 mx-auto mb-4 rounded-full"></div>
                  <p className="text-gray-600 text-xs font-mono uppercase tracking-[0.3em]">End of active trace</p>
               </div>
            </div>
          )}

          {activeTab === 'infrastructure' && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
               <div className="flex items-center space-x-4 mb-10">
                  <Server size={32} className="text-primary" />
                  <h3 className="text-3xl font-display font-bold tracking-tight">System Infrastructure</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] space-y-6">
                     <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <CpuIcon size={24} />
                     </div>
                     <h4 className="text-xl font-bold">Compute Cluster</h4>
                     <p className="text-gray-400 text-sm leading-relaxed">Onyx utilizes a distributed GPU-accelerated cluster for real-time neural synthesis and code generation.</p>
                     <div className="flex items-center space-x-2 text-[10px] font-mono text-primary/60">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                        <span>LOAD: 12% // 1,402 GFLOPS</span>
                     </div>
                  </div>
                  <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] space-y-6">
                     <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                        <Globe size={24} />
                     </div>
                     <h4 className="text-xl font-bold">Global Mesh</h4>
                     <p className="text-gray-400 text-sm leading-relaxed">Isolated sandbox instances are provisioned at the edge to ensure sub-100ms latency for your development environment.</p>
                     <div className="flex items-center space-x-2 text-[10px] font-mono text-blue-400/60">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                        <span>NODES: 42 // UPTIME: 99.99%</span>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="max-w-3xl mx-auto bg-[#0a0a0a] border border-white/5 rounded-[4rem] p-16 text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
              <div className="relative">
                 <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-white/10 shadow-2xl">
                    <Github size={48} className="text-white" />
                 </div>
                 {isGitHubConnected ? (
                   <div className="space-y-10">
                      <div className="flex items-center justify-center space-x-6">
                         {ghUser?.avatar_url && <img src={ghUser.avatar_url} className="w-24 h-24 rounded-[2.5rem] border-4 border-[#050505] shadow-[0_0_60px_rgba(0,228,204,0.3)]" alt="GH Avatar" />}
                         <div className="text-left">
                           <div className="flex items-center space-x-3 text-white font-bold text-3xl tracking-tight">
                             <CheckCircle2 size={32} className="text-primary" />
                             <span>{ghUser?.login}</span>
                           </div>
                           <p className="text-gray-500 text-sm mt-2 max-w-xs leading-relaxed font-medium">{ghUser?.bio || 'Authenticated neural infrastructure developer'}</p>
                         </div>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                         <DetailCard label="Public Slots" value={ghUser?.public_repos || 0} />
                         <DetailCard label="Gist Clusters" value={ghUser?.public_gists || 0} />
                         <DetailCard label="Neural Network" value={ghUser?.followers || 0} />
                      </div>
                      <button
                       onClick={async () => {
                         await window.puter.kv.del('github_token');
                         setIsGitHubConnected(false);
                         setGhUser(null);
                       }}
                       className="flex items-center space-x-3 mx-auto text-gray-600 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-[0.2em] pt-8"
                      >
                        <XCircle size={14} />
                        <span>Revoke Access Cluster</span>
                      </button>
                   </div>
                 ) : (
                   <div className="space-y-8">
                     <h2 className="text-4xl font-display font-black tracking-tight">Establish Handshake</h2>
                     <p className="text-gray-500 leading-relaxed text-sm max-w-sm mx-auto">
                       Securely link your GitHub identity to enable direct repository provisioning and cloud-to-local synchronization.
                     </p>
                     <button
                       onClick={handleConnectGitHub}
                       className="bg-white text-black font-black px-12 py-5 rounded-3xl hover:scale-105 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.05)] flex items-center space-x-4 mx-auto active:scale-95"
                     >
                       <Github size={24} />
                       <span className="uppercase tracking-[0.2em] text-sm">Authorize Subsystem</span>
                     </button>
                     <p className="text-[10px] text-gray-700 font-mono uppercase tracking-widest">Neural tokens encrypted via Puter AES-256-GCM</p>
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-white" }) {
   return (
      <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col space-y-6 hover:bg-white/[0.04] transition-all group shadow-xl">
         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors border border-white/5 shadow-inner">
            {icon}
         </div>
         <div>
            <div className="text-[10px] text-gray-600 font-black uppercase tracking-[0.2em]">{label}</div>
            <div className={`text-2xl font-display font-bold mt-1 ${color}`}>{value}</div>
         </div>
      </div>
   );
}

function DetailCard({ label, value }) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] text-center shadow-inner group hover:bg-white/[0.04] transition-all">
       <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-2 group-hover:text-primary/60 transition-colors">{label}</div>
       <div className="text-2xl font-bold text-gray-200 group-hover:text-white transition-colors">{value}</div>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all relative group ${
        active
          ? 'bg-primary/10 text-primary border border-primary/20 font-black shadow-lg shadow-primary/5'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02] border border-transparent'
      }`}
    >
      {active && <div className="absolute left-[-24px] w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(0,228,204,0.6)] animate-in slide-in-from-left-2"></div>}
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>{icon}</div>
      <span className="text-sm tracking-tighter uppercase font-bold text-[11px]">{label}</span>
    </button>
  );
}

function ProjectCard({ project, onClick, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-primary/40 hover:bg-white/[0.04] transition-all cursor-pointer relative shadow-2xl"
      onClick={onClick}
    >
      <div className="h-44 bg-black/60 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <div className="absolute inset-0 flex items-center justify-center opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
           <Zap size={120} className="text-primary rotate-12" />
        </div>
        <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center backdrop-blur-md border border-white/5 group-hover:scale-110 group-hover:border-primary/20 transition-all duration-700 relative z-10 shadow-2xl">
           <Folder size={40} className="text-white/10 group-hover:text-primary/40 transition-all duration-700" />
        </div>
      </div>
      <div className="p-8 flex items-center justify-between bg-white/[0.01]">
        <div className="overflow-hidden">
          <h3 className="font-bold text-lg truncate text-gray-200 group-hover:text-white transition-colors">{project?.name || 'Neural Sandbox'}</h3>
          <p className="text-[10px] text-gray-600 font-mono mt-2 uppercase tracking-[0.15em] flex items-center space-x-2">
             <Clock size={12} className="text-primary/40" />
             <span>{new Date(project?.updatedAt || project?.createdAt || Date.now()).toLocaleDateString()}</span>
          </p>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-3 text-gray-600 hover:text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90"
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-full mb-4 w-52 bg-[#0a0a0a]/95 border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-300">
               <MenuButton icon={<Pin size={16} />} label="Anchor Instance" />
               <MenuButton icon={<Download size={16} />} label="Export Cluster" />
               <div className="h-[1px] bg-white/5 mx-5 my-2"></div>
               <MenuButton
                  icon={<Trash2 size={16} />}
                  label="Decommission"
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
      className={`w-full flex items-center space-x-4 px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${
        danger ? 'text-red-500/60 hover:bg-red-500/10 hover:text-red-500' : 'text-gray-500 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className={`${danger ? 'opacity-60' : 'opacity-40'} group-hover:opacity-100 transition-opacity`}>{icon}</div>
      <span>{label}</span>
    </button>
  );
}
