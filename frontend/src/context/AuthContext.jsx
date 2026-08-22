import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, login, setAuthToken } from '../api';

const USER_KEY = 'vehicle-tracking-auth-user';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isInitializing, setIsInitializing] = useState(Boolean(localStorage.getItem('vehicle-tracking-auth-token')));
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (!localStorage.getItem('vehicle-tracking-auth-token')) {
      setIsInitializing(false);
      return undefined;
    }

    fetchCurrentUser()
      .then(currentUser => {
        if (isMounted) {
          setUser(currentUser);
          localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthToken(null);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async ({ username, password }) => {
    const response = await login(username, password);
    setAuthToken(response.token);
    setUser(response.user);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setError(null);
    return response.user;
  }, []);

  const signOut = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    error,
    isAdmin: user?.role === 'ADMIN',
    isDispatcher: user?.role === 'DISPATCHER',
    isDriver: user?.role === 'DRIVER',
    isInitializing,
    isSignedIn: Boolean(user),
    setError,
    signIn,
    signOut,
    user
  }), [error, isInitializing, signIn, signOut, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
