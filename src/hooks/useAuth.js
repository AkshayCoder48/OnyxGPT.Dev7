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
        const state = { user: userData, token: authToken };
        listenersRef.current.forEach(cb => cb(state));
      } else {
        setUser(null);
        setToken(null);
        listenersRef.current.forEach(cb => cb(null));
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Set up BroadcastChannel to listen for auth from the bridge
    const authChannel = new BroadcastChannel('puter_auth');

    authChannel.onmessage = async (event) => {
      if (event.data.type === 'AUTH_SUCCESS') {
        console.log("Onyx: Auth successful from bridge");

        // Try all possible ways to set the token in Puter.js
        if (puter.auth.setAuthToken) {
          await puter.auth.setAuthToken(event.data.token);
        }
        if (puter.auth.setToken) {
          await puter.auth.setToken(event.data.token);
        }

        // Update local state
        await checkAuth();

        // Force reload to ensure all services are initialized with the new token
        window.location.reload();
      } else if (event.data.type === 'AUTH_ERROR') {
        console.error("Onyx: Auth failed from bridge", event.data.error);
      }
    };

    // Poll for auth changes as a fallback
    const pollInterval = setInterval(checkAuth, 10000);

    return () => {
      authChannel.close();
      clearInterval(pollInterval);
    };
  }, [checkAuth]);

  const signIn = useCallback(() => {
    // Open the bridge file in a new window/popup.
    const width = 600;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      '/auth-bridge.html',
      'PuterAuthBridge',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }, []);

  const signOut = useCallback(async () => {
    try {
      await puter.auth.signOut();
      setUser(null);
      setToken(null);
      listenersRef.current.forEach(cb => cb(null));
      window.location.reload(); // Refresh to clear all sensitive states
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
