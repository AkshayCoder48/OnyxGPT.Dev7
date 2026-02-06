import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Plus, RefreshCw } from 'lucide-react';
import { listFiles } from '../../services/webContainer';
import { cn } from '../../lib/utils';

const FileItem = ({ item, path = '', level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const isDirectory = item.isDirectory();
  const name = item.name;
  const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;

  const toggle = async () => {
    if (isDirectory) {
      if (!isOpen) {
        const result = await listFiles(fullPath);
        setChildren(result);
      }
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      <div
        onClick={toggle}
        className={cn(
          "flex items-center py-1 px-2 hover:bg-zinc-800/50 cursor-pointer text-sm group",
          level > 0 && "ml-2"
        )}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1 text-zinc-500">
          {isDirectory ? (
            isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : null}
        </span>
        {isDirectory ? (
          <Folder className="w-4 h-4 text-sky-400 mr-2" />
        ) : (
          <File className="w-4 h-4 text-zinc-400 mr-2" />
        )}
        <span className="text-zinc-300 group-hover:text-white truncate">{name}</span>
      </div>

      {isOpen && isDirectory && (
        <div className="border-l border-zinc-800 ml-3 mt-1">
          {children.map((child, i) => (
            <FileItem key={i} item={child} path={fullPath} level={level + 1} />
          ))}
          {children.length === 0 && (
            <div className="py-1 px-8 text-xs text-zinc-600 italic">Empty</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function FileExplorer() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await listFiles('/');
      setFiles(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    listFiles('/').then(result => {
      if (mounted) {
        setFiles(result);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Explorer</span>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-1 hover:bg-zinc-800 rounded text-zinc-400">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
          </button>
          <button className="p-1 hover:bg-zinc-800 rounded text-zinc-400">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {files.map((item, i) => (
          <FileItem key={i} item={item} path="/" />
        ))}
      </div>
    </div>
  );
}
