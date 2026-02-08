import React from 'react';
import { X, Cpu, Info } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
  if (!isOpen) return null;

  const handleClose = () => {
    // Save to history if not already there
    if (settings.customModelId && !settings.modelHistory.includes(settings.customModelId)) {
      const newHistory = [settings.customModelId, ...settings.modelHistory].slice(0, 10);
      setSettings({ ...settings, modelHistory: newHistory });
    }
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
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">AI Model ID</label>
            <div className="relative group">
              <input
                type="text"
                value={settings.customModelId}
                onChange={(e) => setSettings({ ...settings, customModelId: e.target.value })}
                className="w-full bg-background border border-gray-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary transition-all font-mono"
                placeholder="e.g. gpt-4o"
              />
            </div>

            {settings.modelHistory && settings.modelHistory.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.modelHistory.map(m => (
                  <button
                    key={m}
                    onClick={() => setSettings({ ...settings, customModelId: m })}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${
                      settings.customModelId === m
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-background border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-800">
            <label className="block text-sm font-medium text-gray-300">Environment</label>
            <div className="flex items-center justify-between p-3 bg-background border border-gray-800 rounded-xl opacity-50 grayscale">
               <span className="text-xs text-gray-500">Auto-save to Puter Cloud</span>
               <div className="w-10 h-5 bg-primary/20 rounded-full relative">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full"></div>
               </div>
            </div>
            <p className="text-[10px] text-gray-600 italic px-1">Persistence is handled automatically via Puter KV.</p>
          </div>
        </div>

        <footer className="px-6 py-4 bg-background/50 border-t border-gray-800 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-6 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,228,204,0.3)]">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
