import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (window.puter) {
      try {
        const isSignedIn = await window.puter.auth.isSignedIn();
        if (isSignedIn) {
          const userData = await window.puter.auth.getUser();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    }
    setLoading(false);
  }, []);

  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      // More aggressive polling initially
      let puterDetected = false;
      for (let i = 0; i < 150; i++) {
        if (window.puter) {
          puterDetected = true;
          console.log("ONYX: Puter.js detected after", i * 100, "ms");
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      if (!puterDetected && mounted) {
        console.error("ONYX: Puter.js failed to load within 15 seconds.");
        setError("Puter Cloud is taking too long to respond. Please check your connection or refresh.");
      }

      if (mounted) checkAuth();
    };
    init();
    return () => { mounted = false; };
  }, [checkAuth]);

  const signIn = async () => {
    console.log("ONYX: Auth.signIn requested");

    if (!window.puter) {
      // One last attempt to wait
      for (let i = 0; i < 30; i++) {
        if (window.puter) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (!window.puter) {
      const errMsg = "Onyx is having trouble connecting to Puter Cloud. Please refresh the page.";
      setError(errMsg);
      throw new Error(errMsg);
    }

    try {
      setError(null);

      // Check if already signed in first to avoid popup
      const alreadySignedIn = await window.puter.auth.isSignedIn();
      if (alreadySignedIn) {
        const userData = await window.puter.auth.getUser();
        setUser(userData);
        return userData;
      }

      const userData = await window.puter.auth.signIn();

      if (userData) {
        setUser(userData);
        return userData;
      } else {
        await checkAuth();
      }
    } catch (err) {
      console.error('ONYX: Sign in failed error:', err);
      if (err.message && (err.message.includes('popup') || err.message.includes('blocked'))) {
        setError("Sign-in popup was blocked. Please allow popups for this site.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
      throw err;
    }
  };

  const signOut = async () => {
    if (window.puter) {
      try {
        await window.puter.auth.signOut();
        setUser(null);
      } catch (err) {
        console.error('Sign out failed:', err);
      }
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
