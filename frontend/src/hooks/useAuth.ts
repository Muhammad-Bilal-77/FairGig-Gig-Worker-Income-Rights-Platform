import { useState, useEffect } from 'react';
import { getUser, isLoggedIn, type User } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => {
      setUser(getUser());
      setAuthenticated(isLoggedIn());
      setLoading(false);
    };

    sync();

    window.addEventListener('fairgig:auth', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('fairgig:auth', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { user, authenticated, loading };
}
