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

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);

    let puterDetected = false;
    // Poll for 30 seconds
    for (let i = 0; i < 300; i++) {
      if (window.puter && window.puter.auth) {
        puterDetected = true;
        console.log("ONYX: Puter.js and Auth module detected after", i * 100, "ms");
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    if (!puterDetected) {
      console.error("ONYX: Puter.js failed to load within 30 seconds.");
      setError("Puter Cloud connection timeout. Please check your internet or disable ad-blockers and refresh.");
      setLoading(false);
      return;
    }

    await checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    init();
  }, [init]);

  const signIn = async () => {
    console.log("ONYX: puter.auth.signIn() invoked");

    if (!window.puter || !window.puter.auth) {
      throw new Error("Puter.js not loaded yet. Please wait a moment.");
    }

    try {
      setError(null);
      // Initiate sign in process
      const res = await window.puter.auth.signIn();
      console.log("ONYX: Sign in successful", res);

      // Update local user state
      const userData = await window.puter.auth.getUser();
      setUser(userData);
      setLoading(false);

      return res;
    } catch (err) {
      console.error('ONYX: puter.auth.signIn() failed:', err);
      setError(err.message || "Sign-in failed.");
      throw err;
    }
  };

  const signOut = async () => {
    console.log("ONYX: puter.auth.signOut() invoked");
    if (window.puter && window.puter.auth) {
      try {
        await window.puter.auth.signOut();
        setUser(null);
      } catch (err) {
        console.error('ONYX: puter.auth.signOut() failed:', err);
      }
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    checkAuth,
    retry: init
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
