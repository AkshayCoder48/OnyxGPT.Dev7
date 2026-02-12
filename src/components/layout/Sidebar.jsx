import React from 'react';
import {
  LayoutDashboard,
  Folder,
  Activity,
  Beaker,
  Settings,
  ChevronLeft,
  LogOut,
  Github
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  projectName,
  onBack,
  onSignOut,
  user,
  ghConnected,
  onDeploy
}) {
  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'projects', icon: <Folder size={20} />, label: 'Projects' },
    { id: 'activity', icon: <Activity size={20} />, label: 'Activity' },
    { id: 'playwright', icon: <Beaker size={20} />, label: 'Playwright' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <aside className="w-64 border-r border-onyx-border bg-surface flex flex-col shrink-0 h-full">
      <div className="p-6 border-b border-onyx-border">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-background font-bold text-xl shadow-lg shadow-primary/20">O</div>
          <h2 className="font-display font-bold text-xl tracking-tight text-white">Onyx<span className="text-primary">GPT</span></h2>
        </div>

        <button
          onClick={onBack}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-background border border-onyx-border hover:border-primary/50 transition-all text-gray-400 hover:text-white group overflow-hidden"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform shrink-0" />
          <span className="text-xs font-medium truncate">{projectName || 'New Project'}</span>
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {item.icon}
            <span className="text-sm font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-onyx-border space-y-3">
        {ghConnected && (
          <button
            onClick={onDeploy}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-background border border-onyx-border hover:border-primary/50 text-xs font-bold text-gray-400 hover:text-white transition-all"
          >
            <Github size={16} />
            <span>Deploy to GitHub</span>
          </button>
        )}

        <div className="flex items-center justify-between p-3 bg-background/50 rounded-2xl border border-onyx-border">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 shrink-0">
              {user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-bold text-white truncate">{user?.username || 'User'}</div>
              <button onClick={onSignOut} className="text-[9px] text-gray-500 hover:text-red-400 transition-colors">Sign Out</button>
            </div>
          </div>
          <button onClick={() => setActiveTab('settings')} className="text-gray-500 hover:text-white transition-colors shrink-0">
            <Settings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
