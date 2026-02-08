import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import WorkspacePage from './pages/WorkspacePage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { loading, user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={(loading && !user) ? <LoadingScreen message="Redirecting to Dashboard..." /> : <DashboardPage />}
        />
        <Route
          path="/workspace/:code"
          element={(loading && !user) ? <LoadingScreen message="Resuming Workspace..." /> : <WorkspacePage />}
        />
        <Route
          path="/workspace"
          element={(loading && !user) ? <LoadingScreen message="Initializing Workspace..." /> : <WorkspacePage />}
        />
      </Routes>
    </Router>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] text-primary relative overflow-hidden">
      {/* Decorative background elements to avoid "pure black" look */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] rounded-full"></div>

      <div className="relative z-10 flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-xl border-2 border-primary/20 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-xl animate-pulse">terminal</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-white font-display font-bold text-xl tracking-tight">OnyxGPT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 animate-pulse">{message}</p>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 right-0 text-center">
         <p className="text-[9px] text-gray-700 font-mono">Initializing Secure Environment...</p>
      </div>
    </div>
  );
}

export default App;
