import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import ResourcePanel from '../components/workspace/ResourcePanel';
import ChatPanel from '../components/workspace/ChatPanel';
import Terminal from '../components/workspace/Terminal';
import { getProject, saveProjectChat } from '../services/storage';
import { chatWithAI } from '../services/aiService';
import { onServerReady } from '../services/webContainer';

export default function WorkspacePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState('files');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logs, setLogs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    onServerReady((url) => {
      setPreviewUrl(url);
    });
  }, []);

  useEffect(() => {
    const loadProject = async () => {
      const p = await getProject(projectId);
      if (!p) {
        navigate('/dashboard');
        return;
      }
      setProject(p);
      setMessages(p.chatHistory || []);
    };
    loadProject();
  }, [projectId, navigate]);

  const handleSendMessage = async (content) => {
    const newUserMessage = { role: 'user', content };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsProcessing(true);

    try {
      await chatWithAI(
        updatedMessages,
        {
          onUrlReady: (url) => setPreviewUrl(url)
        },
        (updatedAssistantMessage) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last.role === 'assistant') {
              return [...prev.slice(0, -1), updatedAssistantMessage];
            }
            return [...prev, updatedAssistantMessage];
          });
        },
        (log) => {
          setLogs(prev => [...prev, log]);
        }
      );

      const finalMessages = messages;
      await saveProjectChat(projectId, finalMessages);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!project) return null;

  return (
    <div className="h-screen flex flex-col bg-onyx-dark text-white overflow-hidden font-display">
      <Header project={project} />

      <main className="flex-1 flex overflow-hidden">
        {/* Leftmost Resource Bar (Files) */}
        <ResourcePanel
          activeView={activeView}
          setActiveView={setActiveView}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          project={project}
        />

        {/* Chat Interface (Middle Left) */}
        <section className="w-[400px] flex flex-col border-r border-onyx-border bg-onyx-dark shrink-0 z-10">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        </section>

        {/* Development Area (Right) */}
        <section className="flex-1 flex flex-col bg-[#0b1a19] overflow-hidden relative">
          {/* Live Preview (Top Right) */}
          <div className="flex-1 flex flex-col overflow-hidden m-2 mb-1 rounded-lg border border-onyx-border bg-[#121212] shadow-2xl">
            <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-[#333]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 mr-4">
                  <div className="size-3 rounded-full bg-red-500/80"></div>
                  <div className="size-3 rounded-full bg-yellow-500/80"></div>
                  <div className="size-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex items-center bg-[#252525] rounded px-3 py-1 gap-2 min-w-[300px] border border-[#333]">
                  <span className="text-gray-500 text-xs">🔒</span>
                  <span className="text-gray-400 text-xs font-mono overflow-hidden whitespace-nowrap text-ellipsis">
                    {previewUrl || 'localhost:3000'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-white overflow-hidden relative">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title="Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] text-slate-500">
                   <div className="w-12 h-12 border-4 border-slate-800 border-t-primary rounded-full animate-spin mb-4" />
                   <p className="font-mono text-sm">Waiting for Onyx to start development server...</p>
                </div>
              )}
            </div>
          </div>

          {/* Terminal (Bottom Right) */}
          <div className="h-[30%] m-2 mt-1 rounded-lg border border-onyx-border bg-black flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center bg-[#111] border-b border-[#333] px-2">
              <button className="px-4 py-2 text-xs font-medium text-white border-t-2 border-primary bg-black">Terminal</button>
              <button className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-white">Output</button>
            </div>
            <div className="flex-1">
              <Terminal logs={logs} />
            </div>
          </div>
        </section>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-onyx-dark border-t border-onyx-border flex items-center justify-between px-3 text-[11px] font-medium text-onyx-text select-none z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 hover:text-white cursor-pointer transition-colors">
            <span>main</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Agent Status:</span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {isProcessing ? 'Working...' : 'Idle'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
