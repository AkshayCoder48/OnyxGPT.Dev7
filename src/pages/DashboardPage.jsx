import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Github,
  LayoutGrid,
  List,
  Clock,
  Star,
  ExternalLink,
  MoreVertical,
  Terminal,
  ChevronRight
} from 'lucide-react';
import { listProjects, createProject } from '../services/storage';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('projects');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const all = await listProjects();
      setProjects(all);
    };
    load();
  }, []);

  const handleCreate = async () => {
    const title = prompt('Project name?');
    if (!title) return;
    const project = await createProject(title);
    navigate(`/project/${project.id}`);
  };

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top Navbar */}
      <nav className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0a0a0a]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-[#00E4CC] rounded-lg flex items-center justify-center">
              <Terminal className="text-black w-5 h-5" />
            </div>
            <span>ONYX</span>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <button className="text-white">Dashboard</button>
            <button className="hover:text-white transition-colors">Templates</button>
            <button className="hover:text-white transition-colors">Docs</button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#00E4CC] w-64"
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-zinc-400">Manage your projects and deployments</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-[#00E4CC] text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-[#00c9b5] transition-all"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </header>

        {/* Tabs & Controls */}
        <div className="flex items-center justify-between border-b border-zinc-800 mb-6">
          <div className="flex gap-8">
            {[
              { id: 'projects', label: 'Your projects', icon: LayoutGrid },
              { id: 'recent', label: 'Recent', icon: Clock },
              { id: 'starred', label: 'Starred', icon: Star },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-4 text-sm font-medium transition-colors relative",
                  activeTab === tab.id ? "text-[#00E4CC]" : "text-zinc-500 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00E4CC]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-4">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-1.5 rounded", viewMode === 'grid' ? "bg-zinc-800 text-white" : "text-zinc-500")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded", viewMode === 'list' ? "bg-zinc-800 text-white" : "text-zinc-500")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="col-span-9">
            {filteredProjects.length > 0 ? (
              <div className={cn(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}>
                {filteredProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="group bg-[#0a0a0a] border border-zinc-800 rounded-xl p-5 hover:border-[#00E4CC]/50 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-[#00E4CC]" />
                      </div>
                      <button className="text-zinc-500 hover:text-white">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-[#00E4CC] transition-colors">{project.title}</h3>
                    <p className="text-zinc-500 text-sm mb-4">Last edited {new Date(project.updatedAt).toLocaleDateString()}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                      <div className="flex -space-x-2">
                        {[1, 2].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-[#0a0a0a]" />
                        ))}
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0a0a0a] border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-zinc-500 mb-6">Create your first project to get started with Onyx.</p>
                <button
                  onClick={handleCreate}
                  className="bg-white text-black px-6 py-2 rounded-lg font-semibold"
                >
                  Create Project
                </button>
              </div>
            )}
          </div>

          {/* Sidebar / Sidebar Widgets */}
          <div className="col-span-3 space-y-6">
            <div className="bg-gradient-to-br from-[#00E4CC]/10 to-transparent border border-[#00E4CC]/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-black rounded-lg">
                  <Github className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">GitHub Integration</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-6">Connect your GitHub account to import repositories and enable continuous deployment.</p>
              <button className="w-full bg-black border border-zinc-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2">
                Connect GitHub
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Onyx News</h3>
              <div className="space-y-4">
                {[
                  { title: "New AI models added", date: "2d ago" },
                  { title: "KV Storage limit increased", date: "1w ago" },
                ].map((news, i) => (
                  <div key={i} className="group cursor-pointer">
                    <p className="text-sm font-medium group-hover:text-[#00E4CC] transition-colors">{news.title}</p>
                    <p className="text-xs text-zinc-500">{news.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
