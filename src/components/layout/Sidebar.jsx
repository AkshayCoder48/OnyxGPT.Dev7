import React from 'react';
import {
  LayoutDashboard,
  Folder,
  Activity,
  Settings,
  ChevronLeft,
  LogOut,
  Github,
  Beaker
} from 'lucide-react';
import FileExplorer from '../workspace/FileExplorer';

export default function Sidebar({
  activeTab,
  setActiveTab,

  onBack,
  onSignOut,
  onDeploy,
  user
}) {
  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { id: 'projects', icon: <Folder size={18} />, label: 'Projects' },
    { id: 'activity', icon: <Activity size={18} />, label: 'Activity' },
    { id: 'playwright', icon: <Beaker size={18} />, label: 'Playwright' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <div className="w-full h-full bg-surface flex flex-col border-r border-onyx-border">
      {/* Brand */}
      <div className="p-6 mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-background font-bold text-xl shadow-lg shadow-primary/20">O</div>
          <span className="font-display font-bold text-lg tracking-tight">Onyx<span className="text-primary">GPT</span></span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 flex flex-col overflow-hidden">
        <button
          onClick={onBack}
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-500 hover:text-white transition-all rounded-xl hover:bg-white/5 mb-4 shrink-0"
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">Back to Projects</span>
        </button>

        <div className="space-y-1 shrink-0">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all group ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary shadow-inner border border-primary/20'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <div className={`transition-colors ${activeTab === item.id ? 'text-primary' : 'group-hover:text-gray-300'}`}>
                {item.icon}
              </div>
              <span className="text-sm font-bold tracking-tight uppercase text-[11px] tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>

        {/* File Explorer Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <FileExplorer />
        </div>
      </nav>

      {/* Footer / User */}
      <div className="p-4 mt-auto space-y-4 shrink-0">
         <button
           onClick={onDeploy}
           className="w-full bg-background border border-onyx-border hover:border-primary/50 transition-all px-4 py-4 rounded-2xl flex items-center justify-center space-x-3 group"
         >
            <Github size={18} className="text-gray-500 group-hover:text-white transition-colors" />
            <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">Deploy to GitHub</span>
         </button>

         <div className="p-4 bg-background/50 rounded-2xl border border-onyx-border flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/30 shadow-xl shadow-primary/10">
               {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-sm font-bold truncate text-white">{user?.username || 'Anonymous'}</div>
               <button onClick={onSignOut} className="text-[10px] font-bold text-gray-600 hover:text-red-400 transition-colors uppercase tracking-widest">Sign Out</button>
            </div>
            <button onClick={() => setActiveTab('settings')} className="text-gray-700 hover:text-white transition-colors">
               <Settings size={16} />
            </button>
         </div>
      </div>
    </div>
  );
}
