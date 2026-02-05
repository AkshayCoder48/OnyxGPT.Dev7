import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Terminal, Code2 } from 'lucide-react';

export default function LandingPage({ user, signIn }) {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!user) {
      await signIn();
    }
    // Generate a 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000);
    navigate(`/project/${code}`, { state: { initialPrompt: prompt } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-4xl w-full space-y-8">
        <header className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-primary">
            <Code2 size={40} />
            <h1 className="text-5xl font-display font-bold tracking-tight">OnyxGPT.dev</h1>
          </div>
          <p className="text-xl text-gray-400 font-sans max-w-2xl mx-auto">
            Build React + Vite applications with natural language. AI as your operator, you as the supervisor.
          </p>
        </header>

        <main className="mt-12">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-surface border border-gray-800 rounded-xl p-2 pl-4">
              <input
                type="text"
                placeholder="Describe your project (e.g., 'Build a fitness tracker dashboard with charts')"
                className="flex-1 bg-transparent border-none focus:ring-0 text-lg p-4 outline-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button
                onClick={handleGenerate}
                className="bg-primary text-background font-bold px-8 py-4 rounded-lg flex items-center space-x-2 hover:brightness-110 transition-all"
              >
                <Sparkles size={20} />
                <span>Generate Project</span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <FeatureCard
              icon={<Terminal size={24} className="text-primary" />}
              title="Full Observability"
              description="Watch the AI execute commands, install packages, and manage your backend in real-time."
            />
            <FeatureCard
              icon={<Code2 size={24} className="text-primary" />}
              title="React + Vite"
              description="High-performance modern stack generated and previewed live in your browser."
            />
            <FeatureCard
              icon={<Sparkles size={24} className="text-primary" />}
              title="User-Pays Model"
              description="Scale effortlessly. AI execution and cloud costs are handled by your Puter account."
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-surface p-6 rounded-xl border border-gray-800 hover:border-primary/50 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2 font-display">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
