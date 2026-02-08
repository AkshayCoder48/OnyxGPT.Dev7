import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [puterLoaded, setPuterLoaded] = useState(!!window.puter);

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
      setLoading(false);
    } else {
      // If puter is not loaded, we wait a bit and retry
      let retries = 0;
      const interval = setInterval(async () => {
        if (window.puter) {
          clearInterval(interval);
          setPuterLoaded(true);
          try {
            const isSignedIn = await window.puter.auth.isSignedIn();
            if (isSignedIn) {
              const userData = await window.puter.auth.getUser();
              setUser(userData);
            }
          } catch (e) {}
          setLoading(false);
        } else if (retries > 20) {
          clearInterval(interval);
          setLoading(false);
        }
        retries++;
      }, 200);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = async () => {
    if (window.puter) {
      try {
        // Redirecting auth as requested
        return window.puter.auth.signIn();
      } catch (err) {
        console.error('Sign in failed:', err);
      }
    } else {
        alert("Puter.js is still loading. Please wait a moment.");
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
