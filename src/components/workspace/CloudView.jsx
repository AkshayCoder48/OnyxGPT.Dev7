import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  ExternalLink,
  Key,
  RefreshCw,
  Lock,
  Globe,
  HardDrive,
  Cpu,
  ShieldCheck,
  Server,
  Activity,
  Box,
  Layers,
  Zap,
  ChevronRight,
  Search
} from 'lucide-react';

export default function CloudView() {
  const [stats, setStats] = useState({
    storageUsed: '124MB',
    storageTotal: '10GB',
    computeStatus: 'Optimal',
    latency: '18ms',
    uptime: '99.99%',
    nodes: 4
  });

  return (
    <div className="h-full bg-[#050505] flex flex-col overflow-hidden">
      <header className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
         <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/5">
               <Cloud size={24} />
            </div>
            <div>
               <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Neural Cluster Management</h2>
               <div className="text-[9px] text-gray-600 font-mono mt-0.5">provider: puter_cloud_v3 // status: synchronized</div>
            </div>
         </div>
         <button className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all active:scale-90">
            <RefreshCw size={18} />
         </button>
      </header>

      <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
         {/* System Dashboard */}
         <div className="grid grid-cols-2 gap-6">
            <StatCard icon={<HardDrive size={18} />} label="Neural Storage" value={stats.storageUsed} sub={stats.storageTotal} />
            <StatCard icon={<Cpu size={18} />} label="Inference Cluster" value={stats.computeStatus} sub="Standard_NV_V100" />
            <StatCard icon={<Globe size={18} />} label="Global Mesh" value={stats.latency} sub="Region: Auto" />
            <StatCard icon={<ShieldCheck size={18} />} label="Isolation Layer" value="Active" sub="Sandbox_Gated" />
         </div>

         {/* Resources */}
         <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Active Resources</h3>
               <Search size={14} className="text-gray-700" />
            </div>

            <ResourceItem icon={<Database size={18}/>} name="Project KV Store" type="Key-Value Cluster" status="Linked" color="text-primary" />
            <ResourceItem icon={<Box size={18}/>} name="WebContainer Runtime" type="Isolated Node" status="Executing" color="text-blue-400" />
            <ResourceItem icon={<Layers size={18}/>} name="Neural Memory Buffer" type="Cache Layer" status="Online" color="text-purple-400" />
         </div>

         {/* Advanced Logs */}
         <div className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Handshake Trace</h4>
               <span className="text-[9px] font-mono text-gray-600">v1.24.2</span>
            </div>
            <div className="space-y-3 font-mono text-[9px]">
               <LogLine time="14:02:11" msg="ESTABLISHING_PUTER_BRIDGE..." />
               <LogLine time="14:02:12" msg="ENCRYPTING_NEURAL_PACKETS_AES256" />
               <LogLine time="14:02:14" msg="AUTH_CLUSTER_ACKNOWLEDGED" />
               <LogLine time="14:02:15" msg="PROVISIONING_ISOLATED_SANDBOX" />
            </div>
         </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex flex-col space-y-4 group hover:bg-white/[0.04] transition-all">
       <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors border border-white/5 shadow-inner">
          {icon}
       </div>
       <div>
          <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{label}</div>
          <div className="text-xl font-bold mt-1 text-gray-200">{value}</div>
          <div className="text-[9px] text-gray-600 font-mono mt-1 uppercase tracking-tight">{sub}</div>
       </div>
    </div>
  );
}

function ResourceItem({ icon, name, type, status, color }) {
  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 hover:bg-white/[0.03] transition-all cursor-pointer">
       <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/5 ${color} opacity-60 group-hover:opacity-100 transition-opacity`}>
             {icon}
          </div>
          <div>
             <div className="text-[11px] font-bold text-gray-300">{name}</div>
             <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mt-0.5">{type}</div>
          </div>
       </div>
       <div className="flex items-center space-x-3">
          <div className={`text-[9px] font-black uppercase tracking-tighter ${color}`}>{status}</div>
          <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
       </div>
    </div>
  );
}

function LogLine({ time, msg }) {
  return (
    <div className="flex space-x-4 text-gray-600 group hover:text-gray-400 transition-colors">
       <span className="shrink-0 opacity-40">{time}</span>
       <span className="truncate">{msg}</span>
    </div>
  );
}
