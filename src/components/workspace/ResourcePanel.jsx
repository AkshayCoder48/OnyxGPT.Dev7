import React from 'react';
import {
  Files,
  ChevronLeft,
  Settings,
  Database
} from 'lucide-react';
import FileExplorer from './FileExplorer';
import { cn } from '../../lib/utils';

export default function ResourcePanel({
  activeView,
  setActiveView,
  isCollapsed,
  setIsCollapsed
}) {
  const views = [
    { id: 'files', icon: Files, label: 'Files' },
    { id: 'cloud', icon: Database, label: 'Cloud' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'files':
        return <FileExplorer />;
      case 'cloud':
        return (
          <div className="p-4 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-onyx-text mb-4">Cloud Resources</h2>
            <div className="space-y-4">
              <div className="p-4 bg-onyx-light/20 border border-onyx-border rounded-lg">
                <div className="flex items-center gap-3 mb-2 text-primary">
                  <Database className="w-5 h-5" />
                  <span className="font-medium text-white">KV Store</span>
                </div>
                <p className="text-xs text-onyx-text">Manage project metadata and global state.</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "h-full flex flex-row border-r border-onyx-border bg-onyx-dark transition-all duration-300",
      isCollapsed ? "w-12" : "w-[280px]"
    )}>
      {/* Mini Sidebar */}
      <div className="w-12 border-r border-onyx-border flex flex-col items-center py-4 gap-4 shrink-0">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => {
              setActiveView(view.id);
              setIsCollapsed(false);
            }}
            className={cn(
              "p-2 rounded-lg transition-colors relative group",
              activeView === view.id && !isCollapsed
                ? "text-primary bg-primary/10"
                : "text-onyx-text hover:text-white"
            )}
            title={view.label}
          >
            <view.icon className="w-5 h-5" />
          </button>
        ))}

        <div className="mt-auto flex flex-col items-center gap-4">
          <button className="text-onyx-text hover:text-white p-2">
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-onyx-text hover:text-white p-2"
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", isCollapsed && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Panel Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
