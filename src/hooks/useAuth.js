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
    // This is a fallback for the WebSocket flow
    window.addEventListener('focus', checkAuth);
    return () => window.removeEventListener('focus', checkAuth);
  }, [checkAuth]);

  const signIn = async () => {
    try {
      // 1. Generate a unique session token
      const sessionToken = crypto.randomUUID();

      // 2. Prepare the popup URL
      // We pass session_token to the auth page. Puter.com will recognize this
      // and send the auth token to the WebSocket relay.
      const authUrl = `https://puter.com/action/sign-in?session_token=${sessionToken}&embedded_in_popup=true&msg_id=1${window.crossOriginIsolated ? '&cross_origin_isolated=true' : ''}`;

      const w = 600;
      const h = 700;
      const left = (window.screen.width / 2) - (w / 2);
      const top = (window.screen.height / 2) - (h / 2);

      const popup = window.open(authUrl, 'PuterAuth', `width=${w},height=${h},top=${top},left=${left}`);

      if (!popup) {
        console.error('Popup blocked');
        return;
      }

      // 3. Establish WebSocket connection to listen for the auth token
      // We connect to the Puter API's auth socket relay.
      const wsUrl = `wss://api.puter.com/v1/auth/socket?session_token=${sessionToken}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('ONYX: Auth WebSocket connected, waiting for token...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('ONYX: Received message from Auth WebSocket', data);

          if (data.token) {
            console.log('ONYX: Auth token received via WebSocket!');
            // 4. Set the auth token and update state
            puter.setAuthToken(data.token);
            checkAuth();

            // Clean up
            ws.close();
            if (popup && !popup.closed) popup.close();
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Auth WebSocket error:', err);
      };

      ws.onclose = () => {
        console.log('Auth WebSocket closed.');
      };

      // Set a timeout to close the socket and popup if it takes too long
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, 300000); // 5 minutes timeout

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
