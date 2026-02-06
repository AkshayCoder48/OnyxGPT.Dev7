import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Network, Cpu, Terminal as TerminalIcon, Plus, RefreshCw, Trash2, X, Check } from 'lucide-react';

export default function CloudView() {
  const [subTab, setSubTab] = useState('kv');
  const [kvData, setKvData] = useState([]);
  const [files, setFiles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddingKV, setIsAddingKV] = useState(false);
  const [newKV, setNewKV] = useState({ key: '', value: '' });

  const fetchData = async () => {
    if (!window.puter) return;
    setLoading(true);
    try {
      if (subTab === 'kv') {
        const list = await window.puter.kv.list();
        const entries = await Promise.all(list.map(async (key) => {
          const val = await window.puter.kv.get(key);
          return { key, value: typeof val === 'object' ? JSON.stringify(val) : String(val) };
        }));
        setKvData(entries);
      } else if (subTab === 'fs') {
        const items = await window.puter.fs.readdir('/');
        setFiles(items);
      } else if (subTab === 'workers') {
        const workerList = await window.puter.workers.list();
        setWorkers(workerList);
      }
    } catch (e) {
      console.error('Puter Cloud Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [subTab]);

  const handleAddKV = async () => {
    if (!newKV.key) return;
    try {
      await window.puter.kv.set(newKV.key, newKV.value);
      setNewKV({ key: '', value: '' });
      setIsAddingKV(false);
      fetchData();
    } catch (err) {
      alert('Error adding KV: ' + err.message);
    }
  };

  const handleDeleteKV = async (key) => {
    if (window.confirm(`Are you sure you want to delete key: ${key}?`)) {
      try {
        await window.puter.kv.del(key);
        fetchData();
      } catch (err) {
        alert('Error deleting KV: ' + err.message);
      }
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-44 bg-surface border-r border-gray-800 flex flex-col p-3 space-y-1 shrink-0">
        <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold px-3 mb-2">Puter Cloud</div>
        <SubTabButton active={subTab === 'kv'} onClick={() => setSubTab('kv')} icon={<Database size={14} />} label="KV Store" />
        <SubTabButton active={subTab === 'fs'} onClick={() => setSubTab('fs')} icon={<HardDrive size={14} />} label="Filesystem" />
        <SubTabButton active={subTab === 'workers'} onClick={() => setSubTab('workers')} icon={<Cpu size={14} />} label="Workers" />
        <SubTabButton active={subTab === 'net'} onClick={() => setSubTab('net')} icon={<Network size={14} />} label="Network" />

        <div className="mt-auto pt-4 border-t border-gray-800">
           <button
            onClick={fetchData}
            className="w-full flex items-center justify-center space-x-2 py-2 text-[10px] text-gray-400 hover:text-primary transition-colors"
           >
             <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
             <span>Refresh</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
             <div className="p-1.5 bg-primary/10 rounded text-primary">
                {subTab === 'kv' && <Database size={14} />}
                {subTab === 'fs' && <HardDrive size={14} />}
                {subTab === 'workers' && <Cpu size={14} />}
                {subTab === 'net' && <Network size={14} />}
             </div>
             <h2 className="font-display font-bold text-sm truncate">
               {subTab === 'kv' && 'KV Database'}
               {subTab === 'fs' && 'Filesystem'}
               {subTab === 'workers' && 'Workers'}
               {subTab === 'net' && 'Networking'}
             </h2>
          </div>

          {subTab === 'kv' && (
            <button
              onClick={() => setIsAddingKV(true)}
              className="p-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-all"
              title="New Entry"
            >
              <Plus size={14} />
            </button>
          )}
        </header>

        <div className="flex-1 p-4 overflow-auto min-w-0">
          {subTab === 'kv' && (
            <div className="space-y-4">
              {isAddingKV && (
                <div className="p-3 bg-surface border border-primary/30 rounded-lg flex flex-col space-y-3">
                  <input
                    type="text"
                    placeholder="Key"
                    className="bg-background border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:border-primary outline-none"
                    value={newKV.key}
                    onChange={e => setNewKV({...newKV, key: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    className="bg-background border border-gray-700 rounded px-2 py-1 text-xs font-mono focus:border-primary outline-none"
                    value={newKV.value}
                    onChange={e => setNewKV({...newKV, value: e.target.value})}
                  />
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => setIsAddingKV(false)} className="px-2 py-1 text-[10px] text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleAddKV} className="px-2 py-1 bg-primary text-background rounded text-[10px] font-bold">Add Entry</button>
                  </div>
                </div>
              )}
              <div className="bg-surface rounded-lg border border-gray-800 overflow-hidden">
                <table className="w-full text-left table-fixed">
                  <thead className="bg-background/80 text-gray-500 text-[9px] uppercase font-bold tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-2 w-1/3">Key</th>
                      <th className="px-4 py-2 w-1/2">Value</th>
                      <th className="px-4 py-2 w-16 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-[11px]">
                    {kvData.length > 0 ? kvData.map((entry, i) => (
                      <tr key={i} className="group hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-mono text-primary truncate">{entry.key}</td>
                        <td className="px-4 py-2 font-mono text-gray-300 truncate">{entry.value}</td>
                        <td className="px-4 py-2 text-right">
                           <button
                            onClick={() => handleDeleteKV(entry.key)}
                            className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <Trash2 size={12} />
                           </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="3" className="px-4 py-10 text-center text-gray-600 italic">No entries</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'fs' && (
            <div className="grid grid-cols-1 gap-2">
              {files.map((file, i) => (
                <div key={i} className="group p-2 bg-surface border border-gray-800 rounded-lg flex items-center space-x-3 hover:border-primary/50 transition-all">
                  <div className="p-1.5 bg-background rounded text-gray-500">
                    {file.is_dir ? <Database size={14} /> : <HardDrive size={14} />}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="text-xs truncate text-gray-200">{file.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono">
                      {file.size ? (file.size / 1024).toFixed(1) + ' KB' : '--'}
                    </div>
                  </div>
                </div>
              ))}
              {files.length === 0 && <div className="py-10 text-center text-gray-600 italic text-xs">Filesystem is empty</div>}
            </div>
          )}

          {subTab === 'workers' && (
            <div className="space-y-2">
               {workers.map((worker, i) => (
                 <div key={i} className="p-3 bg-surface border border-gray-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                       <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                          <Cpu size={14} />
                       </div>
                       <div className="overflow-hidden">
                          <div className="font-bold text-gray-100 text-xs truncate">{worker.name}</div>
                          <div className="text-[9px] text-gray-500 font-mono truncate">{worker.id}</div>
                       </div>
                    </div>
                    <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-bold rounded uppercase border border-green-500/20">Active</span>
                 </div>
               ))}
               {workers.length === 0 && <div className="py-10 text-center text-gray-600 italic text-xs">No workers</div>}
            </div>
          )}

          {subTab === 'net' && (
            <div className="bg-surface border border-gray-800 rounded-lg p-6 text-center">
               <Network size={24} className="text-primary mx-auto mb-3 opacity-50" />
               <h3 className="font-display font-bold text-sm mb-1 text-white">Proxy Active</h3>
               <p className="text-gray-400 text-[10px] leading-relaxed mb-4">
                 CORS-free networking enabled via Puter.js
               </p>
               <div className="inline-flex items-center space-x-2 px-3 py-1 bg-background border border-gray-800 rounded-full text-[9px] font-mono text-primary">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                  <span>Operational</span>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubTabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs transition-all ${
        active
          ? 'bg-primary text-background font-bold shadow-lg shadow-primary/10'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
