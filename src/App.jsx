import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectLandingPage from './pages/ProjectLandingPage';
import WorkspacePage from './pages/WorkspacePage';
import { useAuth } from './hooks/useAuth';
import { getWebContainer } from './services/webContainer';

function App() {
  // Pre-boot WebContainer in the background for faster project opening
  React.useEffect(() => {
    getWebContainer().catch(() => {});
  }, []);

  const { user, loading, signIn, signOut } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectLandingPage />} />
        <Route path="/project/:code" element={<WorkspacePage user={user} loading={loading} signIn={signIn} signOut={signOut} />} />
        <Route path="/project" element={<WorkspacePage user={user} loading={loading} signIn={signIn} signOut={signOut} />} />
      </Routes>
    </Router>
  );
}

export default App;
