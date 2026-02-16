import { useState, useEffect, useCallback, useRef } from 'react';

export function useAuth() {
  useEffect(() => {
    if (window.puter) console.log('Puter.js loaded');
    else console.warn('Puter.js NOT loaded');
  }, []);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const listenersRef = useRef([]);

  const checkAuth = useCallback(async () => {
    if (window.puter) {
      try {
        const isSignedIn = await window.puter.auth.isSignedIn();
        if (isSignedIn) {
          const userData = await window.puter.auth.getUser();
          setUser(userData);
          // Notify all listeners
          listenersRef.current.forEach(cb => cb(userData));
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

    // Poll for auth changes every 2 seconds as a fallback
    const pollInterval = setInterval(checkAuth, 2000);

    // Listen for auth change messages from popups
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'PUTER_AUTH_SUCCESS') {
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
    if (!window.puter) {
      console.error('Puter.js not loaded');
      return null;
    }

    try {
      // Try the standard signIn method first
      const result = await window.puter.auth.signIn();
      
      // If it returns user data directly (works), use it
      if (result && result.username) {
        setUser(result);
        listenersRef.current.forEach(cb => cb(result));
        return result;
      }

      // If signIn() returns but no user, check auth state
      await checkAuth();
      return user;
    } catch (err) {
      console.error('Sign in failed:', err);
      
      // Fallback: Try to open Puter auth page in a popup
      if (window.puter && window.puter.kv) {
        return new Promise((resolve, reject) => {
          const popup = window.open(
            'https://puter.com/',
            'puter-auth',
            'width=600,height=700,left=100,top=100'
          );

          if (!popup) {
            reject(new Error('Popup blocked. Please allow popups for this site.'));
            return;
          }

          // Wait for the popup to communicate auth status
          let attempts = 0;
          const checkPopup = setInterval(() => {
            attempts++;
            if (attempts > 150) { // 30 seconds timeout
              clearInterval(checkPopup);
              popup.close();
              reject(new Error('Authentication timeout'));
              return;
            }

            try {
              // Check if popup was closed
              if (popup.closed) {
                clearInterval(checkPopup);
                checkAuth().then(user => {
                  if (user) resolve(user);
                  else reject(new Error('Authentication cancelled'));
                });
                return;
              }

              // Try to communicate with popup (will fail cross-origin but that's ok)
              // This is just to detect if the popup is still open
            } catch (e) {
              // Cross-origin access expected
            }

            // Poll for auth state change
            checkAuth();
          }, 200);

          // Also listen for messages from popup
          const handleAuthMessage = (event) => {
            if (event.data && event.data.type === 'AUTH_SUCCESS') {
              window.removeEventListener('message', handleAuthMessage);
              clearInterval(checkPopup);
              checkAuth().then(resolve);
            }
          };
          window.addEventListener('message', handleAuthMessage);
        });
      }
      throw err;
    }
  }, [checkAuth, user]);

  const signOut = useCallback(async () => {
    if (window.puter) {
      try {
        await window.puter.auth.signOut();
        setUser(null);
        listenersRef.current.forEach(cb => cb(null));
      } catch (err) {
        console.error('Sign out failed:', err);
      }
    }
  }, []);

  // Subscribe to auth changes
  const onAuthChange = useCallback((callback) => {
    listenersRef.current.push(callback);
    return () => {
      listenersRef.current = listenersRef.current.filter(cb => cb !== callback);
    };
  }, []);

  return { user, loading, signIn, signOut, checkAuth, onAuthChange };
}
