import React from 'react';
import { X, Cpu, Info } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-onyx-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <header className="px-6 py-4 border-b border-onyx-border flex items-center justify-between bg-background/50">
          <div className="flex items-center space-x-2">
            <Cpu size={18} className="text-primary" />
            <h2 className="font-display font-bold text-lg">Agent Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-start space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
               <Info size={14} className="text-primary mt-0.5 shrink-0" />
               <p className="text-[11px] text-gray-400 leading-relaxed">
                 Model configuration has been moved directly to the Chat Interface for quicker access.
                 Use the Model ID input in the chat header to switch between different AI models.
               </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Tool Verbosity</label>
            <div className="flex items-center justify-between p-3 bg-background border border-onyx-border rounded-xl">
               <span className="text-xs text-gray-500">Show detailed tool logs in chat</span>
               <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-not-allowed">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full"></div>
               </div>
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 bg-background/50 border-t border-onyx-border flex justify-end space-x-3">
          <button onClick={onClose} className="px-6 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,228,204,0.3)]">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
