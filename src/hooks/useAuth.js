import { useState, useEffect, useCallback, useRef } from 'react';
import puter from '../services/puter';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const listenersRef = useRef([]);

  const checkAuth = useCallback(async () => {
    try {
      const isSignedIn = await puter.auth.isSignedIn();
      if (isSignedIn) {
        const [userData, authToken] = await Promise.all([
          puter.auth.getUser(),
          puter.auth.getAuthToken()
        ]);
        setUser(userData);
        setToken(authToken);

        // Notify listeners
        listenersRef.current.forEach(cb => cb({ user: userData, token: authToken }));
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Poll for auth changes as a fallback
    const pollInterval = setInterval(checkAuth, 5000);

    // Listen for auth change messages from potential popups/webhooks
    const handleMessage = (event) => {
      // Re-add the listener the user mentioned
      if (event.data && (event.data.type === 'PUTER_AUTH_SUCCESS' || event.data.type === 'AUTH_SUCCESS')) {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('message', handleMessage);
    };
  }, [checkAuth]);

  const signIn = useCallback(async () => {
    try {
      // In Puter.js v2, signIn() is usually very robust
      const result = await puter.auth.signIn();
      await checkAuth();
      return result;
    } catch (err) {
      console.error('Sign in failed:', err);
      
      // Secondary attempt if first fails or is blocked
      try {
        await checkAuth();
        if (user) return user;
      } catch { /* Ignore */ }

      throw err;
    }
  }, [checkAuth, user]);

  const signOut = useCallback(async () => {
    try {
      await puter.auth.signOut();
      setUser(null);
      setToken(null);
      listenersRef.current.forEach(cb => cb(null));
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, []);

  const onAuthChange = useCallback((callback) => {
    listenersRef.current.push(callback);
    return () => {
      listenersRef.current = listenersRef.current.filter(cb => cb !== callback);
    };
  }, []);

  return { user, token, loading, signIn, signOut, checkAuth, onAuthChange };
}
