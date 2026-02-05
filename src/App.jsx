import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import WorkspacePage from './pages/WorkspacePage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace/:code" element={<WorkspacePage user={user} signIn={signIn} signOut={signOut} />} />
        <Route path="/workspace" element={<WorkspacePage user={user} signIn={signIn} signOut={signOut} />} />
      </Routes>
    </Router>
  );
}

export default App;
