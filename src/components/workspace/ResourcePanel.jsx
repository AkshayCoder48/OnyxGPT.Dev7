import React from 'react';
import { Monitor, ExternalLink, RefreshCw, Lock, Unlock, Globe } from 'lucide-react';

export default function ResourcePanel({ url, projectId, logs }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
    // Logic to refresh iframe would go here if needed
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header Bar */}
      <div className="h-12 bg-surface border-b border-onyx-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-gray-500">
             <Globe size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest">Environment Preview</span>
          </div>
          <div className="h-6 w-[1px] bg-onyx-border mx-2"></div>
          <div className="flex items-center bg-black/40 border border-white/5 rounded-full px-4 py-1 space-x-3 max-w-md">
            <Unlock size={10} className="text-primary" />
            <span className="text-[10px] text-gray-400 font-mono truncate">{url || 'https://onyx-runtime-env.local'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
           <button
             onClick={handleRefresh}
             className="p-2 text-gray-500 hover:text-primary hover:bg-white/5 rounded-lg transition-all"
           >
             <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
           </button>
           <a
             href={url}
             target="_blank"
             rel="noreferrer"
             className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
           >
             <ExternalLink size={14} />
           </a>
        </div>
      </div>

      {/* Main Preview */}
      <div className="flex-1 bg-white relative">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full border-none"
            title="Onyx Preview"
            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />
        ) : (
          <div className="absolute inset-0 bg-background flex flex-col items-center justify-center space-y-8">
             <div className="relative">
                <div className="w-24 h-24 bg-primary/5 rounded-[2rem] border-2 border-primary/20 flex items-center justify-center animate-pulse">
                   <Monitor size={48} className="text-primary/30" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-background border border-onyx-border rounded-xl flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                </div>
             </div>
             <div className="text-center space-y-2">
                <h4 className="text-xl font-bold text-white tracking-tight">Initializing Preview Engine</h4>
                <p className="text-sm text-gray-500">Connecting to CodeSandbox via OXP Protocol...</p>
             </div>

             {/* Progress simulation bar */}
             <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress-indeterminate"></div>
             </div>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="h-8 bg-surface border-t border-onyx-border px-4 flex items-center justify-between shrink-0">
         <div className="flex items-center space-x-4">
            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Instance Status:</span>
            <div className="flex items-center space-x-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
               <span className="text-[9px] text-gray-400 font-mono">NODE_V18_RUNNING</span>
            </div>
         </div>
         <div className="text-[9px] text-gray-600 font-mono">ID: {projectId?.substring(0, 8)}...</div>
      </div>
    </div>
  );
}
