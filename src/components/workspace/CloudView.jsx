import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Network, Cpu, Terminal as TerminalIcon, Plus, RefreshCw, Trash2 } from 'lucide-react';

export default function CloudView() {
  const [subTab, setSubTab] = useState('kv');
  const [kvData, setKvData] = useState([]);
  const [files, setFiles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-52 bg-surface border-r border-gray-800 flex flex-col p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold px-3 mb-2">Puter Cloud</div>
        <SubTabButton active={subTab === 'kv'} onClick={() => setSubTab('kv')} icon={<Database size={16} />} label="KV Store" />
        <SubTabButton active={subTab === 'fs'} onClick={() => setSubTab('fs')} icon={<HardDrive size={16} />} label="File System" />
        <SubTabButton active={subTab === 'workers'} onClick={() => setSubTab('workers')} icon={<Cpu size={16} />} label="Workers" />
        <SubTabButton active={subTab === 'net'} onClick={() => setSubTab('net')} icon={<Network size={16} />} label="Networking" />

        <div className="mt-auto pt-4 border-t border-gray-800">
           <button
            onClick={fetchData}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs text-gray-400 hover:text-primary transition-colors"
           >
             <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
             <span>Refresh Data</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {subTab === 'kv' && <Database size={18} />}
                {subTab === 'fs' && <HardDrive size={18} />}
                {subTab === 'workers' && <Cpu size={18} />}
                {subTab === 'net' && <Network size={18} />}
             </div>
             <div>
                <h2 className="font-display font-bold text-lg">
                  {subTab === 'kv' && 'Key-Value Database'}
                  {subTab === 'fs' && 'Cloud Filesystem'}
                  {subTab === 'workers' && 'Serverless Workers'}
                  {subTab === 'net' && 'Network Manager'}
                </h2>
                <p className="text-xs text-gray-500 italic">Live data from your Puter.js account</p>
             </div>
          </div>

          <button className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-md text-xs hover:bg-primary/20 transition-all">
             <Plus size={14} />
             <span>New Entry</span>
          </button>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          {subTab === 'kv' && (
            <div className="digital-glow bg-surface rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-background/80 text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Key</th>
                    <th className="px-6 py-4">Value</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {kvData.length > 0 ? kvData.map((entry, i) => (
                    <tr key={i} className="group hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-primary">{entry.key}</td>
                      <td className="px-6 py-4 font-mono text-gray-300 truncate max-w-md">{entry.value}</td>
                      <td className="px-6 py-4 text-right">
                         <button className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                         </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="px-6 py-20 text-center text-gray-600 italic">No Key-Value entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {subTab === 'fs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file, i) => (
                <div key={i} className="group p-4 bg-surface border border-gray-800 rounded-xl flex items-center space-x-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                  <div className="p-3 bg-background rounded-lg text-gray-500 group-hover:text-primary transition-colors">
                    {file.is_dir ? <Database size={20} /> : <HardDrive size={20} />}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="font-medium truncate text-gray-200">{file.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {file.size ? (file.size / 1024).toFixed(1) + ' KB' : '--'} • {file.modified ? new Date(file.modified).toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                </div>
              ))}
              {files.length === 0 && <div className="col-span-full py-20 text-center text-gray-600 italic">Filesystem is empty</div>}
            </div>
          )}

          {subTab === 'workers' && (
            <div className="space-y-4">
               {workers.map((worker, i) => (
                 <div key={i} className="p-4 bg-surface border border-gray-800 rounded-xl flex items-center justify-between hover:border-primary/50 transition-all">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <Cpu size={20} />
                       </div>
                       <div>
                          <div className="font-bold text-gray-100">{worker.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{worker.id}</div>
                       </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold rounded uppercase border border-green-500/20">Active</span>
                       <button className="p-2 text-gray-500 hover:text-white transition-colors">
                          <RefreshCw size={14} />
                       </button>
                    </div>
                 </div>
               ))}
               {workers.length === 0 && <div className="py-20 text-center text-gray-600 italic">No workers deployed</div>}
            </div>
          )}

          {subTab === 'net' && (
            <div className="bg-surface border border-gray-800 rounded-xl p-8 text-center">
               <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mx-auto mb-4 border border-primary/10">
                  <Network size={32} />
               </div>
               <h3 className="font-display font-bold text-xl mb-2">Puter Proxy Active</h3>
               <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
                 Onyx is monitoring CORS-free network requests and raw TCP/TLS sockets initiated by your agent.
               </p>
               <div className="inline-flex items-center space-x-2 px-4 py-2 bg-background border border-gray-800 rounded-full text-xs font-mono text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>Status: Operational</span>
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
      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
        active
          ? 'bg-primary text-background font-bold shadow-[0_0_15px_rgba(0,228,204,0.4)]'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="tracking-tight">{label}</span>
    </button>
  );
}
