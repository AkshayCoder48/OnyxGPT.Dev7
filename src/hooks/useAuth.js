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

    // Listen for auth success/error from the Auth Bridge
    const channel = new BroadcastChannel('puter_auth');
    channel.onmessage = (event) => {
      if (event.data.type === 'AUTH_SUCCESS') {
        console.log('ONYX: Authentication successful via Bridge!');
        puter.setAuthToken(event.data.token);
        checkAuth();
      } else if (event.data.type === 'AUTH_ERROR') {
        console.error('ONYX: Authentication failed via Bridge:', event.data.error);
      }
    };

    // Keep the window focus listener as a fallback
    window.addEventListener('focus', checkAuth);
    return () => {
      window.removeEventListener('focus', checkAuth);
      channel.close();
    };
  }, [checkAuth]);

  const signIn = async () => {
    try {
      // Open the Auth Bridge file
      const w = 600;
      const h = 700;
      const left = (window.screen.width / 2) - (w / 2);
      const top = (window.screen.height / 2) - (h / 2);

      const bridgeUrl = '/auth-bridge.html';
      const popup = window.open(bridgeUrl, 'PuterAuthBridge', `width=${w},height=${h},top=${top},left=${left}`);

      if (!popup) {
        // Fallback to direct sign-in if popup blocked or fails
        console.warn('Bridge popup blocked, falling back to direct sign-in');
        await puter.auth.signIn();
        await checkAuth();
      }
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
