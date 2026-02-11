import { useState, useEffect, useCallback } from 'react';
import puter from '../services/puter';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      // In the ESM version, isSignedIn is an async function
      const signedIn = await puter.auth.isSignedIn();
      if (signedIn) {
        const userData = await puter.auth.getUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signIn = async () => {
    setLoading(true);
    try {
      const res = await puter.auth.signIn();
      if (res) {
          const userData = await puter.auth.getUser();
          setUser(userData);
      }
      return res;
    } catch (err) {
      console.error('Sign in failed:', err);
    } finally {
      setLoading(false);
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
