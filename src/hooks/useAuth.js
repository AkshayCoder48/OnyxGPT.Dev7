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

        const state = { user: userData, token: authToken };
        listenersRef.current.forEach(cb => cb(state));
      } else {
        setUser(null);
        setToken(null);
        listenersRef.current.forEach(cb => cb(null));
      }
    } catch (err) {
      console.error('Onyx: Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = useCallback(async (authToken) => {
    console.log("Onyx: Received auth token from bridge");
    try {
      // Set token in the local Puter instance
      if (puter.auth.setAuthToken) {
        await puter.auth.setAuthToken(authToken);
      } else if (puter.auth.setToken) {
        await puter.auth.setToken(authToken);
      }

      // Important: Puter.js might need a tick to process the token
      await checkAuth();

      // If we now have a user, reload to ensure all singleton services are re-initialized
      const finalCheck = await puter.auth.isSignedIn();
      if (finalCheck) {
         console.log("Onyx: Authentication confirmed. Reloading...");
         setTimeout(() => window.location.reload(), 300);
      }
    } catch (err) {
      console.error("Onyx: Error handling bridge auth success", err);
    }
  }, [checkAuth]);

  useEffect(() => {
    checkAuth();

    // 1. BroadcastChannel (Modern)
    const authChannel = new BroadcastChannel('puter_auth');
    authChannel.onmessage = (event) => {
      if (event.data.type === 'AUTH_SUCCESS') {
        handleAuthSuccess(event.data.token);
      }
    };

    // 2. Storage Events (Fallback for across-tab reliability)
    const handleStorage = (e) => {
      if (e.key === 'puter_auth_sync' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'AUTH_SUCCESS') {
            handleAuthSuccess(data.token);
            localStorage.removeItem('puter_auth_sync');
          }
        } catch (err) {
          console.error("Onyx: Failed to parse auth result from storage", err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Regular polling for auth changes (fallback for cross-origin redirects)
    const pollInterval = setInterval(checkAuth, 10000);

    return () => {
      authChannel.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
    };
  }, [checkAuth, handleAuthSuccess]);

  const signIn = useCallback(() => {
    const width = 600;
    const height = 750;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    // Open our non-isolated bridge window
    window.open(
      '/auth-bridge.html',
      'PuterAuthBridge',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }, []);

  const signOut = useCallback(async () => {
    try {
      await puter.auth.signOut();
      setUser(null);
      setToken(null);
      listenersRef.current.forEach(cb => cb(null));
      // Refresh to ensure all persistent state is cleared
      window.location.reload();
    } catch (err) {
      console.error('Onyx: Sign out failed:', err);
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
