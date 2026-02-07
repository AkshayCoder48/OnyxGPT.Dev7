import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import WorkspacePage from './pages/WorkspacePage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { loading } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={loading ? <LoadingScreen message="Redirecting to Dashboard..." /> : <DashboardPage />}
        />
        <Route
          path="/workspace/:code"
          element={loading ? <LoadingScreen message="Resuming Workspace..." /> : <WorkspacePage />}
        />
        <Route
          path="/workspace"
          element={loading ? <LoadingScreen message="Initializing Workspace..." /> : <WorkspacePage />}
        />
      </Routes>
    </Router>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-primary space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="text-xs font-mono uppercase tracking-widest text-gray-500 animate-pulse">{message}</p>
    </div>
  );
}

export default App;
