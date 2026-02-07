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
    let mounted = true;
    const init = async () => {
      // Wait for Puter.js to be available (max 10s, but checking frequently)
      for (let i = 0; i < 100; i++) {
        if (window.puter) {
          console.log("ONYX: Puter.js detected after", i * 100, "ms");
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      if (mounted) checkAuth();
    };
    init();
    return () => { mounted = false; };
  }, [checkAuth]);

  const signIn = async () => {
    console.log("ONYX: Auth.signIn requested");

    // Wait for Puter to be ready if it isn't yet
    if (!window.puter) {
      console.warn("ONYX: Puter.js not ready, waiting...");
      for (let i = 0; i < 20; i++) {
        if (window.puter) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (!window.puter) {
      console.error("ONYX: Puter.js failed to load after timeout.");
      alert("Onyx is having trouble connecting to Puter Cloud. Please refresh the page.");
      return;
    }

    try {
      console.log("ONYX: Calling window.puter.auth.signIn()...");
      // Some browsers block popups if not a direct result of user interaction.
      // We ensure this is called within the same stack as the click.
      const userData = await window.puter.auth.signIn();

      if (userData) {
        console.log("ONYX: Sign-in successful:", userData.username);
        setUser(userData);
        return userData;
      } else {
        console.warn("ONYX: Sign-in resolved but no user data returned.");
        // Re-check auth state as a fallback
        await checkAuth();
      }
    } catch (err) {
      console.error('ONYX: Sign in failed error:', err);
      // If it's a popup blocked error, we might want to inform the user
      if (err.message && (err.message.includes('popup') || err.message.includes('blocked'))) {
        alert("Sign-in popup was blocked. Please allow popups for this site.");
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
