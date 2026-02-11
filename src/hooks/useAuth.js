import { useState, useEffect, useCallback } from 'react';
import puter from '../services/puter';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const signedIn = await puter.auth.isSignedIn();
      if (signedIn) {
        const userData = await puter.auth.getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Check again when the window is focused (e.g. returning from a popup)
    window.addEventListener('focus', checkAuth);
    return () => window.removeEventListener('focus', checkAuth);
  }, [checkAuth]);

  const signIn = async () => {
    try {
      // In the browser, signIn() will usually open a popup or redirect.
      // If we are in an environment that requires a redirect, Puter handles it.
      await puter.auth.signIn();
      // After sign-in, re-check auth status
      await checkAuth();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const signOut = async () => {
    try {
      await puter.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return { user, loading, signIn, signOut, checkAuth };
}
