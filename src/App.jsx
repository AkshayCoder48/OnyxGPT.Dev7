import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectLandingPage from './pages/ProjectLandingPage';
import WorkspacePage from './pages/WorkspacePage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, signIn, signOut } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProjectLandingPage />} />
        <Route path="/project/:code" element={<WorkspacePage user={user} signIn={signIn} signOut={signOut} />} />
      </Routes>
    </Router>
  );
}

export default App;
