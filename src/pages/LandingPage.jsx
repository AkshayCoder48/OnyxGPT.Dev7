import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Terminal,
  Zap,
  Code2,
  Cpu,
  Globe,
  Github,
  ArrowRight,
  Monitor,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  const handleStartBuilding = async () => {
    if (!user) {
      await signIn();
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-primary/30 selection:text-white">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:32px_32px]"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-6 backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,228,204,0.4)] group-hover:scale-110 transition-transform">O</div>
            <span className="font-display font-bold text-2xl tracking-tighter">Onyx<span className="text-primary">GPT</span></span>
          </div>
          <div className="flex items-center space-x-8">
            <button
              onClick={handleStartBuilding}
              className="bg-primary text-black font-black px-8 py-3 rounded-2xl text-xs hover:shadow-[0_0_30px_rgba(0,228,204,0.4)] hover:scale-105 active:scale-95 transition-all uppercase tracking-widest flex items-center space-x-3"
            >
              <span>{user ? 'Go to Dashboard' : 'Initialize Session'}</span>
              <ChevronRight size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-40">
        {/* Hero Section */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center space-x-3 px-6 py-2 bg-white/5 border border-white/10 rounded-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Neural Infrastructure Active</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter text-white mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
               Code at the <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_auto] animate-gradient-flow">speed of thought.</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-16 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              The elite autonomous software architect for building, deploying, and scaling complex neural-grade applications in seconds.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
              <button
                onClick={handleStartBuilding}
                className="w-full sm:w-auto bg-primary text-black font-black px-12 py-6 rounded-[2.5rem] text-sm hover:shadow-[0_0_50px_rgba(0,228,204,0.4)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center space-x-4 group"
              >
                <span>Start Building Now</span>
                <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-6 py-40 border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <FeatureCard
                  icon={<MessageSquare className="text-primary" size={32} />}
                  title="Neural Synthesis"
                  desc="Describe complex architectural patterns and watch Onyx generate modular, type-safe code in real-time."
                />
                <FeatureCard
                  icon={<Monitor className="text-blue-400" size={32} />}
                  title="Isolated Runtimes"
                  desc="Execute full-stack applications in secure, browser-based WebContainers with zero configuration overhead."
                />
                <FeatureCard
                  icon={<Github className="text-purple-400" size={32} />}
                  title="Cloud Handshake"
                  desc="Direct integration with GitHub for autonomous repository provisioning and continuous neural delivery."
                />
             </div>
          </div>
        </section>

        {/* Technical Specification Section */}
        <section className="px-6 py-40 bg-black/40">
           <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                 <h2 className="text-xs font-black text-primary uppercase tracking-[0.4em] mb-6">Technical Specifications</h2>
                 <h3 className="text-4xl md:text-5xl font-display font-bold text-white mb-8 tracking-tight">The Core Architecture</h3>
                 <p className="text-lg text-gray-400 leading-relaxed mb-10">
                   OnyxGPT leverages the Puter neural proxy and isolated WebContainer technology to provide a desktop-grade development experience entirely in the browser.
                 </p>
                 <ul className="space-y-6">
                    <SpecItem label="Inference Engine" value="Gemini 1.5 Pro & Flash Support" />
                    <SpecItem label="Runtime Isolation" value="P3 Neural Gated Sandboxing" />
                    <SpecItem label="Version Control" value="Bidirectional GitHub Sync" />
                    <SpecItem label="System Uptime" value="99.99% Neural Availability" />
                 </ul>
              </div>
              <div className="relative group">
                 <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                 <div className="relative bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-4 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                    <Terminal size={120} className="text-primary/20 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-12">
                       <div className="text-[10px] font-mono text-primary/60 uppercase tracking-[0.3em] mb-2">status: optimized</div>
                       <div className="text-xl font-bold text-white">Advanced Neural Command Interface</div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Call to Action */}
        <section className="px-6 py-40 text-center relative overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/[0.03] blur-[150px] pointer-events-none"></div>
           <div className="max-w-4xl mx-auto">
              <h2 className="text-5xl md:text-7xl font-display font-black tracking-tighter text-white mb-10">Ready to build the future?</h2>
              <button
                onClick={handleStartBuilding}
                className="bg-white text-black font-black px-16 py-6 rounded-[3rem] text-sm hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.3em]"
              >
                Establish Neural Link
              </button>
           </div>
        </section>
      </main>

      <footer className="px-8 py-20 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-10 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-primary border border-white/10">O</div>
            <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">OnyxGPT.Dev © 2025</span>
          </div>
          <div className="flex items-center space-x-12">
             <FooterLink label="Twitter" />
             <FooterLink label="Discord" />
             <FooterLink label="GitHub" />
          </div>
          <div className="px-6 py-2 bg-primary/5 border border-primary/20 rounded-full">
             <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">System Operational</span>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[3rem] hover:bg-white/[0.04] hover:border-primary/20 transition-all group shadow-xl">
       <div className="w-16 h-16 bg-black rounded-[1.5rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <h4 className="text-2xl font-bold text-white mb-4 tracking-tight">{title}</h4>
       <p className="text-gray-500 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function SpecItem({ label, value }) {
  return (
    <li className="flex items-center justify-between py-4 border-b border-white/5 group">
       <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-primary transition-colors">{label}</span>
       <span className="text-sm font-bold text-gray-300">{value}</span>
    </li>
  );
}

function FooterLink({ label }) {
  return (
    <a href="#" className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">
       {label}
    </a>
  );
}

export default LandingPage;
