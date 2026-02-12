import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, RefreshCw, Key, Tag } from 'lucide-react';
import { kv } from '../../services/puter';

export default function KVPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const loadKV = async () => {
    setLoading(true);
    try {
      const list = await kv.list();
      const detailedItems = [];
      for (const key of list) {
        const value = await kv.get(key);
        detailedItems.push({ key, value });
      }
      setItems(detailedItems);
    } catch (err) {
      console.error("KV Load failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKV();
  }, []);

  const handleAdd = async () => {
    if (!newKey) return;
    await kv.set(newKey, newValue);
    setNewKey('');
    setNewValue('');
    loadKV();
  };

  const handleDelete = async (key) => {
    await kv.del(key);
    loadKV();
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/20">
        <div className="flex items-center space-x-2">
          <Database size={16} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Puter KV Store</span>
        </div>
        <button onClick={loadKV} className="text-gray-600 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4 border-b border-white/5 bg-white/5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
            <input
              placeholder="Key"
              className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-primary/50 transition-all"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
            <input
              placeholder="Value"
              className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-primary/50 transition-all"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="w-full bg-primary text-[#0A0A0A] font-bold py-2 rounded-lg text-xs hover:brightness-110 transition-all flex items-center justify-center space-x-2"
        >
          <Plus size={14} />
          <span>Add Entry</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {items.length > 0 ? (
          items.map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/[0.07] transition-all">
              <div className="overflow-hidden">
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{item.key}</div>
                <div className="text-xs text-gray-400 font-mono truncate">{typeof item.value === 'object' ? JSON.stringify(item.value) : item.value}</div>
              </div>
              <button
                onClick={() => handleDelete(item.key)}
                className="p-2 text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
             <Database size={48} className="mb-4" />
             <p className="text-xs italic">No KV entries found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
