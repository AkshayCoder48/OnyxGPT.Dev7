import React, { useState, useEffect } from 'react';
import { X, Cpu, Info, Sliders, MessageSquare, Brain } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <header className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
               <Sliders size={24} />
            </div>
            <div>
               <h2 className="font-display font-bold text-xl text-white">Agent Configuration</h2>
               <p className="text-xs text-gray-500 font-mono">Tweak the Onyx core parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </header>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-thin">
          {/* System Prompt */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2 text-sm font-bold text-gray-400">
               <MessageSquare size={14} className="text-primary" />
               <span>Agent Directives (System Prompt)</span>
            </label>
            <textarea
              value={localSettings.systemPrompt || ''}
              onChange={(e) => setLocalSettings({...localSettings, systemPrompt: e.target.value})}
              placeholder="You are Onyx, an autonomous engineer..."
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-mono text-gray-300 outline-none focus:border-primary/50 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
             {/* Temperature */}
             <div className="space-y-3">
                <label className="flex items-center space-x-2 text-sm font-bold text-gray-400">
                   <Brain size={14} className="text-primary" />
                   <span>Creativity (Temp)</span>
                </label>
                <input
                   type="range"
                   min="0"
                   max="1"
                   step="0.1"
                   value={localSettings.temperature || 0.7}
                   onChange={(e) => setLocalSettings({...localSettings, temperature: parseFloat(e.target.value)})}
                   className="w-full accent-primary bg-white/5 rounded-lg h-1.5 appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-600">
                   <span>Precise (0.0)</span>
                   <span className="text-primary font-bold">{localSettings.temperature || 0.7}</span>
                   <span>Creative (1.0)</span>
                </div>
             </div>

             {/* Max Tokens */}
             <div className="space-y-3">
                <label className="flex items-center space-x-2 text-sm font-bold text-gray-400">
                   <Cpu size={14} className="text-primary" />
                   <span>Inference Limit</span>
                </label>
                <select
                   value={localSettings.maxTokens || 4096}
                   onChange={(e) => setLocalSettings({...localSettings, maxTokens: parseInt(e.target.value)})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-300 outline-none focus:border-primary/50"
                >
                   <option value={2048}>Short Output (2k)</option>
                   <option value={4096}>Balanced (4k)</option>
                   <option value={8192}>Deep Work (8k)</option>
                   <option value={16384}>Extended (16k)</option>
                </select>
             </div>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start space-x-3">
             <Info size={16} className="text-primary shrink-0 mt-0.5" />
             <p className="text-[10px] text-gray-500 leading-relaxed">
                Higher temperature values make the output more random and creative, while lower values make it more focused and deterministic. These settings are applied to every Puter.js AI call in this project.
             </p>
          </div>
        </div>

        <footer className="px-10 py-8 bg-white/[0.02] border-t border-white/5 flex justify-end space-x-4">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-white transition-colors">
            Discard
          </button>
          <button
            onClick={handleSave}
            className="px-10 py-3 bg-primary text-black font-black rounded-xl text-sm hover:shadow-[0_0_20px_rgba(0,228,204,0.3)] hover:scale-105 transition-all"
          >
            Apply Directives
          </button>
        </footer>
      </div>
    </div>
  );
}
