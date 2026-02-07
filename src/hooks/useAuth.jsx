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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = async () => {
    if (!window.puter) {
      console.error("ONYX: Puter.js not loaded yet.");
      return;
    }
    try {
      console.log("ONYX: Calling puter.auth.signIn()...");
      const userData = await window.puter.auth.signIn();
      console.log("ONYX: puter.auth.signIn() resolved with:", userData);
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Sign in failed:', err);
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
