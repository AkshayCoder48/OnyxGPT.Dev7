import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Cpu,
  MessageSquare,
  Zap,
  History,
  ArrowRight,
  Check,
  Trash2,
  Shield,
  Gauge,
  Terminal,
  Save,
  Command
} from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
  const [modelHistory, setModelHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('model');
  const [newModel, setNewModel] = useState('');

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('onyx_model_history') || '["gemini-1.5-pro", "gemini-1.5-flash"]');
    setModelHistory(history);
  }, []);

  if (!isOpen) return null;

  const handleAddModel = (e) => {
    e.preventDefault();
    if (!newModel.trim()) return;
    const updated = [...new Set([newModel.trim(), ...modelHistory])];
    setModelHistory(updated);
    localStorage.setItem('onyx_model_history', JSON.stringify(updated));
    setSettings({ ...settings, modelId: newModel.trim() });
    setNewModel('');
  };

  const removeHistory = (m) => {
    const updated = modelHistory.filter(h => h !== m);
    setModelHistory(updated);
    localStorage.setItem('onyx_model_history', JSON.stringify(updated));
  };

  const tabs = [
    { id: 'model', label: 'Neural Engine', icon: <Cpu size={14} /> },
    { id: 'inference', label: 'Inference', icon: <Gauge size={14} /> },
    { id: 'system', label: 'Core Directives', icon: <Terminal size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-3xl" onClick={onClose} />

      <div className="bg-[#0a0a0a] w-full max-w-4xl max-h-[85vh] rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Animated background detail */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <header className="px-12 py-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl relative">
              <div className="absolute inset-2 border border-primary/20 rounded-[1.5rem] animate-pulse"></div>
              <Settings size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black tracking-tight text-white uppercase">Agent Directives</h2>
              <div className="flex items-center space-x-3 mt-1">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                 <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase font-black">Subsystem: Neural Configuration</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 hover:bg-white/5 rounded-3xl text-gray-500 hover:text-white transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Tabs Sidebar */}
          <div className="w-64 border-r border-white/5 p-8 flex flex-col space-y-2 bg-white/[0.005]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all text-xs font-black uppercase tracking-widest ${
                  activeTab === tab.id
                    ? 'bg-primary text-black shadow-lg shadow-primary/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            {activeTab === 'model' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 block mb-6">Active Model Identifier</label>
                  <form onSubmit={handleAddModel} className="flex space-x-4">
                    <div className="flex-1 relative">
                       <Command className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                       <input
                         type="text"
                         value={newModel}
                         onChange={(e) => setNewModel(e.target.value)}
                         placeholder="Provision custom model identifier..."
                         className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-xs font-mono outline-none focus:border-primary/50 focus:bg-white/10 transition-all shadow-inner"
                       />
                    </div>
                    <button type="submit" className="bg-white text-black font-black px-8 rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-3 text-[10px] uppercase tracking-widest">
                       <ArrowRight size={16} />
                       <span>Provision</span>
                    </button>
                  </form>
                </section>

                <section>
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 block mb-6">Neural History Cluster</label>
                  <div className="grid grid-cols-1 gap-4">
                    {modelHistory.map(m => (
                      <button
                        key={m}
                        onClick={() => setSettings({ ...settings, modelId: m })}
                        className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${
                          settings.modelId === m
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center space-x-5">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                             settings.modelId === m ? 'bg-primary text-black' : 'bg-black text-gray-600 border border-white/5 group-hover:text-gray-300'
                           }`}>
                              <History size={20} />
                           </div>
                           <div className="text-left">
                              <div className={`font-bold text-sm tracking-tight ${settings.modelId === m ? 'text-primary' : 'text-gray-300'}`}>{m}</div>
                              <div className="text-[10px] text-gray-600 font-mono mt-1 uppercase tracking-widest">Type: Neural_Processor</div>
                           </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {settings.modelId === m && <div className="p-2 bg-primary/20 rounded-full text-primary"><Check size={16} strokeWidth={4} /></div>}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeHistory(m); }}
                            className="p-3 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'inference' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <section>
                    <div className="flex justify-between items-end mb-6">
                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Neural Temperature</label>
                       <span className="text-primary font-mono font-black text-lg">{settings.temperature || 0.7}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.temperature || 0.7}
                      onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-4 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                       <span>Logical Precision</span>
                       <span>Creative Divergence</span>
                    </div>
                 </section>

                 <section>
                    <div className="flex justify-between items-end mb-6">
                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Max Token Throughput</label>
                       <span className="text-primary font-mono font-black text-lg">{settings.maxTokens || 4096}</span>
                    </div>
                    <input
                      type="range"
                      min="1024"
                      max="32768"
                      step="1024"
                      value={settings.maxTokens || 4096}
                      onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                      className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-4 text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                       <span>Optimized Burst</span>
                       <span>Deep Analysis</span>
                    </div>
                 </section>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                 <section className="flex-1 flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 block mb-6">Core System Directives</label>
                    <textarea
                      value={settings.systemPrompt || ''}
                      onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
                      placeholder="Define the core behavioral parameters of the Onyx neural engine..."
                      className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-xs font-mono outline-none focus:border-primary/50 focus:bg-white/10 transition-all shadow-inner resize-none custom-scrollbar min-h-[300px]"
                    />
                    <div className="mt-6 p-6 bg-primary/5 border border-primary/10 rounded-2xl flex items-start space-x-4">
                       <Shield className="text-primary shrink-0 mt-1" size={18} />
                       <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-widest">
                         Directives are injected at the root of every inference chain. Modifying these will fundamentally alter the agent's problem-solving architecture.
                       </p>
                    </div>
                 </section>
              </div>
            )}
          </div>
        </div>

        <footer className="px-12 py-10 border-t border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-3xl shrink-0">
           <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                 <Zap size={18} />
              </div>
              <p className="text-[9px] text-gray-600 font-mono leading-relaxed uppercase tracking-widest">
                Directives are project-specific<br/>and persisted in Puter KV storage.
              </p>
           </div>
           <button
             onClick={onClose}
             className="bg-primary text-black font-black px-12 py-4 rounded-3xl hover:shadow-[0_0_40px_rgba(0,228,204,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center space-x-4 text-[11px] uppercase tracking-[0.2em]"
           >
             <Save size={18} />
             <span>Commit Changes</span>
           </button>
        </footer>
      </div>
    </div>
  );
}
