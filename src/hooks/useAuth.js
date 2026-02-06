import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
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

    // Puter doesn't have an easy "onAuthChange" listener in v2 docs sometimes,
    // but we can poll or rely on explicit actions.
  }, [checkAuth]);

  const signIn = async () => {
    if (window.puter) {
      try {
        const userData = await window.puter.auth.signIn();
        setUser(userData);
        return userData;
      } catch (err) {
        console.error('Sign in failed:', err);
      }
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
