import React, { useState } from 'react';
import { Monitor, Terminal, Cloud, Database, HardDrive, Network } from 'lucide-react';
import CloudView from './CloudView';

export default function ResourcePanel({ activeTab, setActiveTab, previewUrl, logs }) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tabs */}
      <div className="flex items-center px-4 bg-surface border-b border-gray-800">
        <TabButton
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
          icon={<Monitor size={16} />}
          label="Live Preview"
        />
        <TabButton
          active={activeTab === 'terminal'}
          onClick={() => setActiveTab('terminal')}
          icon={<Terminal size={16} />}
          label="Terminal"
        />
        <TabButton
          active={activeTab === 'cloud'}
          onClick={() => setActiveTab('cloud')}
          icon={<Cloud size={16} />}
          label="Cloud"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'preview' && (
          <div className="h-full flex flex-col">
            <div className="bg-surface p-2 border-b border-gray-800 flex items-center justify-between px-4">
              <div className="flex-1 max-w-xl bg-background border border-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 font-mono overflow-hidden whitespace-nowrap">
                {previewUrl || 'Waiting for dev server...'}
              </div>
            </div>
            {previewUrl ? (
              <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Live Preview" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 flex-col space-y-4">
                <div className="animate-pulse bg-gray-800 h-32 w-48 rounded-lg border border-gray-700"></div>
                <p>Starting WebContainer...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="h-full bg-[#0d0d0d] font-mono text-sm p-4 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                <span className="text-primary mr-2">➜</span>
                <span className="text-gray-300">{log}</span>
              </div>
            ))}
            <div className="flex items-center mt-2">
              <span className="text-primary mr-2">onyx-app $</span>
              <span className="w-2 h-5 bg-primary animate-pulse"></span>
            </div>
          </div>
        )}

        {activeTab === 'cloud' && <CloudView />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-all ${
        active
          ? 'border-primary text-primary bg-primary/5'
          : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
