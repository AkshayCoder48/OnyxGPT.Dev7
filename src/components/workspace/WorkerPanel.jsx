import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, RefreshCw, Play, Code, Globe, Zap } from 'lucide-react';
import { workers } from '../../services/puter';

export default function WorkerPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('// Puter Worker\nputer.ai.chat("Hello!");');

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const list = await workers.list();
      setItems(list);
    } catch (err) {
      console.error("Workers Load failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const handleCreate = async () => {
    if (!newName) return;
    try {
      await workers.create(newName, newCode);
      setNewName('');
      setShowCreate(false);
      loadWorkers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (name) => {
    await workers.delete(name);
    loadWorkers();
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/20">
        <div className="flex items-center space-x-2">
          <Zap size={16} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Puter Workers</span>
        </div>
        <div className="flex items-center space-x-2">
           <button onClick={() => setShowCreate(!showCreate)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all">
             <Plus size={14} />
           </button>
           <button onClick={loadWorkers} className="p-1.5 text-gray-600 hover:text-white transition-colors">
             <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-4 border-b border-white/5 bg-white/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
           <input
              placeholder="Worker Name"
              className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 transition-all font-mono"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <textarea
              placeholder="Worker Code"
              rows={5}
              className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] outline-none focus:border-primary/50 transition-all font-mono resize-none"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <button
              onClick={handleCreate}
              className="w-full bg-primary text-[#0A0A0A] font-bold py-2 rounded-lg text-xs hover:brightness-110 transition-all"
            >
              Deploy Worker
            </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {items.length > 0 ? (
          items.map(item => (
            <div key={item.name} className="bg-white/5 border border-white/5 rounded-2xl p-4 group hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Cpu size={20} />
                   </div>
                   <div>
                      <div className="text-sm font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Active • v1.0</div>
                   </div>
                </div>
                <div className="flex items-center space-x-1">
                   <button className="p-2 text-gray-600 hover:text-primary transition-colors">
                      <Play size={14} />
                   </button>
                   <button onClick={() => handleDelete(item.name)} className="p-2 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                   </button>
                </div>
              </div>
              <div className="flex items-center space-x-4 pt-3 border-t border-white/5">
                 <div className="flex items-center space-x-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                    <Globe size={10} />
                    <span>Public API</span>
                 </div>
                 <div className="flex items-center space-x-1.5 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                    <Code size={10} />
                    <span>Node.js</span>
                 </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
             <Cpu size={48} className="mb-4" />
             <p className="text-xs italic">No cloud workers deployed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
