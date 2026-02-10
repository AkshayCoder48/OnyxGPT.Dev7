import { useState, useEffect, useCallback } from 'react';
import { waitForPuter } from '../utils/puter';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    console.log("[useAuth] Checking auth status...");
    try {
      const puter = await waitForPuter(5000);
      const isSignedIn = await puter.auth.isSignedIn();
      console.log("[useAuth] Is signed in:", isSignedIn);
      if (isSignedIn) {
        const userData = await puter.auth.getUser();
        console.log("[useAuth] User data received:", userData.username);
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[useAuth] Auth check failed or Puter.js timeout:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Puter doesn't have an easy "onAuthChange" listener in v2 docs sometimes,
    // but we can poll or rely on explicit actions.
  }, [checkAuth]);

  const signIn = async () => {
    console.log("[useAuth] Initiating sign-in...");
    if (window.puter) {
      try {
        const userData = await window.puter.auth.signIn();
        console.log("[useAuth] Sign-in successful:", userData.username);
        setUser(userData);
        return userData;
      } catch (err) {
        console.error('[useAuth] Sign-in failed:', err);
        alert("Sign-in failed. If a popup didn't appear, check if it was blocked by Cross-Origin Isolation (COOP).");
      }
    } else {
      alert("Puter.js is not loaded. Cannot sign in.");
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
