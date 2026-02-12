import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import * as wc from '../../services/webContainer';

export default function FileExplorer({ onFileSelect, activeFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({ '/': true });

  const loadFiles = async () => {
    setLoading(true);
    try {
      const tree = await getFileTree('/');
      setFiles(tree);
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoading(false);
    }
  };

  const getFileTree = async (path) => {
    const entries = await wc.listFiles(path);
    const nodes = [];

    for (const name of entries) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;

      const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
      // Check if it's a directory by trying to list its contents
      try {
        await wc.listFiles(fullPath);
        nodes.push({ name, path: fullPath, type: 'directory' });
      } catch {
        nodes.push({ name, path: fullPath, type: 'file' });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  useEffect(() => {
    loadFiles();
    // Refresh periodically or on certain events?
    const interval = setInterval(loadFiles, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (path) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-r border-white/5 w-64 shrink-0">
      <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-black/20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Explorer</span>
        <button onClick={loadFiles} className="text-gray-600 hover:text-white transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {files.map(node => (
          <FileNode
            key={node.path}
            node={node}
            expanded={expanded}
            toggleExpand={toggleExpand}
            onFileSelect={onFileSelect}
            activeFile={activeFile}
            getFileTree={getFileTree}
          />
        ))}
      </div>
    </div>
  );
}

function FileNode({ node, expanded, toggleExpand, onFileSelect, activeFile, getFileTree }) {
  const [children, setChildren] = useState([]);
  const isExpanded = expanded[node.path];

  useEffect(() => {
    if (node.type === 'directory' && isExpanded) {
      getFileTree(node.path).then(setChildren);
    }
  }, [isExpanded, node.path]);

  if (node.type === 'file') {
    return (
      <button
        onClick={() => onFileSelect(node.path)}
        className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
          activeFile === node.path ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
        }`}
      >
        <File size={14} className={activeFile === node.path ? 'text-primary' : 'text-gray-600'} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => toggleExpand(node.path)}
        className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Folder size={14} className="text-blue-500/60" />
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && (
        <div className="ml-4 border-l border-white/5 pl-1 mt-1 space-y-1">
          {children.map(child => (
            <FileNode
              key={child.path}
              node={child}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onFileSelect={onFileSelect}
              activeFile={activeFile}
              getFileTree={getFileTree}
            />
          ))}
        </div>
      )}
    </div>
  );
}
