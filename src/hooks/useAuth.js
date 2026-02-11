import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    if (!window.puter) return;
    try {
      if (window.puter.auth.isSignedIn()) {
        const userData = await window.puter.auth.getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  }, []);

  useEffect(() => {
    // Check immediately if puter is already there
    if (window.puter) {
        checkAuth();
    } else {
        // Fallback for script load delay, but don't set global loading state
        const interval = setInterval(() => {
            if (window.puter) {
                clearInterval(interval);
                checkAuth();
            }
        }, 50);
        setTimeout(() => clearInterval(interval), 2000);
    }
  }, [checkAuth]);

  const signIn = async () => {
    if (!window.puter) return;
    try {
      const res = await window.puter.auth.signIn();
      if (res) {
          const userData = await window.puter.auth.getUser();
          setUser(userData);
      }
      return res;
    } catch (err) {
      console.error('Sign in failed:', err);
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

  return { user, loading, signIn, signOut, checkAuth };
}
