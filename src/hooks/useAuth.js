import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (window.puter) {
        const isSignedIn = await window.puter.auth.isSignedIn();
        if (isSignedIn) {
          const userData = await window.puter.auth.getUser();
          setUser(userData);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async () => {
    if (window.puter) {
      const userData = await window.puter.auth.signIn();
      setUser(userData);
      return userData;
    }
  };

  const signOut = async () => {
    if (window.puter) {
      await window.puter.auth.signOut();
      setUser(null);
    }
  };

  return { user, loading, signIn, signOut };
}
