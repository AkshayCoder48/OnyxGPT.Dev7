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
    console.log("ONYX: Auth.signIn requested");

    if (!window.puter || !window.puter.auth) {
      // One last attempt to wait for 5 seconds
      for (let i = 0; i < 50; i++) {
        if (window.puter && window.puter.auth) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (!window.puter || !window.puter.auth) {
      const errMsg = "Onyx cannot connect to Puter Cloud. Please check your connection and refresh the page.";
      setError(errMsg);
      throw new Error(errMsg);
    }

    try {
      setError(null);

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
