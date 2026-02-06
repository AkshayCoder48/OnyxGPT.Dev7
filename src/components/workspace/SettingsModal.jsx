import React, { useState, useEffect } from 'react';
import { X, Cpu, Info } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
  const [localModelId, setLocalModelId] = useState(settings.customModelId || '');

  useEffect(() => {
    if (isOpen) {
      setLocalModelId(settings.customModelId || '');
    }
  }, [isOpen, settings.customModelId]);

  if (!isOpen) return null;

  const handleSave = () => {
    setSettings({ ...settings, customModelId: localModelId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-background/50">
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
            <label className="block text-sm font-medium text-gray-300">Custom Model ID</label>
            <div className="relative">
              <input
                type="text"
                value={localModelId}
                onChange={(e) => setLocalModelId(e.target.value)}
                placeholder="e.g. openai/gpt-4o"
                className="w-full bg-background border border-gray-800 rounded-xl px-4 py-3 text-sm font-mono text-primary outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <div className="flex items-start space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
               <Info size={14} className="text-primary mt-0.5 shrink-0" />
               <p className="text-[11px] text-gray-400 leading-relaxed">
                 By default, Onyx uses the selected model from the dropdown. Providing a custom Model ID will override this and inject it directly into Puter.js API calls.
               </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Tool Verbosity</label>
            <div className="flex items-center justify-between p-3 bg-background border border-gray-800 rounded-xl">
               <span className="text-xs text-gray-500">Show detailed tool logs in chat</span>
               <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-not-allowed">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full"></div>
               </div>
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 bg-background/50 border-t border-gray-800 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,228,204,0.3)]"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
}
