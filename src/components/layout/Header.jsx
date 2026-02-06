import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Share2,
  Rocket,
  Layout,
  BookOpen,
  MessageSquare
} from 'lucide-react';

export default function Header({ project }) {
  const navigate = useNavigate();

  return (
    <header className="h-14 shrink-0 flex items-center justify-between border-b border-onyx-border bg-onyx-dark px-4 z-20">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-white cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="size-6 text-primary">
            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h1 className="text-white text-lg font-bold tracking-tight">OnyxGPT.Dev</h1>
        </div>

        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 px-4 border-l border-onyx-border h-6">
          <span className="text-onyx-text text-sm font-medium">Projects</span>
          <span className="text-onyx-border text-sm">/</span>
          <span className="text-white text-sm font-medium">{project?.title || 'Untitled Project'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-6 mr-4">
          <button className="text-onyx-text hover:text-white text-sm font-medium transition-colors">Docs</button>
          <button className="text-onyx-text hover:text-white text-sm font-medium transition-colors">Feedback</button>
        </div>

        <button className="flex items-center gap-2 h-9 px-4 bg-onyx-light/50 hover:bg-onyx-light border border-onyx-border text-white text-sm font-bold rounded-lg transition-all">
          <Share2 className="w-[18px] h-[18px]" />
          <span>Share</span>
        </button>

        <button className="flex items-center gap-2 h-9 px-4 bg-primary text-onyx-dark hover:bg-[#00cbb9] text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(0,230,210,0.3)]">
          <Rocket className="w-[18px] h-[18px]" />
          <span>Deploy</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-500 ml-2 border border-white/10" title="User Profile"></div>
      </div>
    </header>
  );
}
