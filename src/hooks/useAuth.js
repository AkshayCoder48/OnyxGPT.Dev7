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
        const userData = await puter.auth.getUser();

        let authToken = null;
        if (typeof puter.auth.getAuthToken === 'function') {
          authToken = await puter.auth.getAuthToken();
        } else if (typeof puter.auth.getToken === 'function') {
          authToken = puter.auth.getToken();
        } else if (puter.auth.authToken) {
          authToken = puter.auth.authToken;
        }

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
      if (puter.auth.setAuthToken) {
        await puter.auth.setAuthToken(authToken);
      } else if (puter.auth.setToken) {
        await puter.auth.setToken(authToken);
      }

      await checkAuth();

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

    const authChannel = new BroadcastChannel('puter_auth');
    authChannel.onmessage = (event) => {
      if (event.data.type === 'AUTH_SUCCESS') {
        handleAuthSuccess(event.data.token);
      }
    };

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

    const pollInterval = setInterval(checkAuth, 15000);

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
