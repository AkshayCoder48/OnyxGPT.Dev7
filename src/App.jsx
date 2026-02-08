import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectLandingPage from './pages/ProjectLandingPage';
import WorkspacePage from './pages/WorkspacePage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, signIn, signOut } = useAuth();
  const [showLoading, setShowLoading] = React.useState(false);

  React.useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowLoading(true), 500);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A] text-primary flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Initializing Secure Environment...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectLandingPage />} />
        <Route path="/project/:code" element={<WorkspacePage user={user} signIn={signIn} signOut={signOut} />} />
        <Route path="/project" element={<WorkspacePage user={user} signIn={signIn} signOut={signOut} />} />
      </Routes>
    </Router>
  );
}

export default App;
