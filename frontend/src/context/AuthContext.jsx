import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiClient, { setAccessToken, setRefreshHandler } from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refreshPromise = useRef(null);

  const refreshSession = useCallback(async () => {
    refreshPromise.current ||= apiClient.post('/auth/refresh-token')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data;
      })
      .finally(() => { refreshPromise.current = null; });
    return refreshPromise.current;
  }, []);

  useEffect(() => {
    setRefreshHandler(refreshSession);
    refreshSession().catch(() => {
      setAccessToken(null);
      setUser(null);
    }).finally(() => setReady(true));
    return () => setRefreshHandler(null);
  }, [refreshSession]);

  const login = useCallback(async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await apiClient.post('/auth/register', details);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user, ready, login, register, logout, refreshSession,
    hasRole: (role) => Boolean(user?.roles?.includes(role))
  }), [user, ready, login, register, logout, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
