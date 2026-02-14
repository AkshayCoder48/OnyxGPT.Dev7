import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileType,
  RefreshCw
} from 'lucide-react';
import * as csb from '../../services/codesandboxService';

export default function FileExplorer() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({ '/': true });

  const loadFiles = async (path = '/') => {
    setLoading(true);
    const result = await csb.listFiles(path);
    setFiles(result);
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  return (
    <div className="flex flex-col h-full bg-surface/50 border-t border-onyx-border mt-4">
      <div className="flex items-center justify-between p-4 border-b border-onyx-border/50">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">File Explorer</h4>
        <button
          onClick={() => loadFiles()}
          className="text-gray-500 hover:text-primary transition-colors"
          title="Refresh Files"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {files.length === 0 && !loading ? (
          <div className="p-4 text-center text-[10px] text-gray-600 italic">
            No files found or SDK not connected.
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map(file => (
              <FileItem
                key={file.name}
                file={file}
                level={0}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileItem({ file, level, expandedFolders, toggleFolder }) {
  const isFolder = file.type === 'directory';
  const isExpanded = expandedFolders[file.name];

  const getIcon = () => {
    if (isFolder) {
      return isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />;
    }
    const ext = file.name.split('.').pop();
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return <FileCode size={14} className="text-blue-400" />;
    if (ext === 'json') return <FileJson size={14} className="text-amber-400" />;
    if (['css', 'scss'].includes(ext)) return <FileType size={14} className="text-pink-400" />;
    return <File size={14} className="text-gray-400" />;
  };

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => isFolder && toggleFolder(file.name)}
      >
        <span className="shrink-0">
          {isFolder ? (isExpanded ? <Folder size={14} className="text-primary" /> : <Folder size={14} className="text-primary/60" />) : getIcon()}
        </span>
        <span className="text-[11px] text-gray-400 group-hover:text-gray-200 truncate">{file.name}</span>
      </div>

      {/* For nested folders, we would need to fetch their content.
          The SDK readdir usually takes a path.
          For simplicity in this task, I'll assume we list the root for now,
          or I can implement recursive fetching if needed.
          Actually, the current SDK readdir call in codesandboxService only does the root.
      */}
    </div>
  );
}
