/**
 * AuthContext — holds the current user and provides login/logout/register.
 *
 * On mount, calls GET /api/auth/me to restore the session from the httpOnly cookie.
 * Exposes: { user, loading, login, register, logout }
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session
  const [sessionError, setSessionError] = useState('');

  // Restore the session. Only an explicit 401 means the user is anonymous;
  // network/5xx failures must not be presented as a logged-out session.
  const restoreSession = useCallback(async () => {
    setLoading(true);
    setSessionError('');
    try {
      const res = await api.get('/auth/me');
      setUser(res.data?.user || null);
    } catch (err) {
      if (err.status === 401) {
        setUser(null);
      } else {
        setSessionError('SamajX could not verify your session. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (fields) => {
    const res = await api.post('/auth/register', fields);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const registerLeader = useCallback(async (fields) => {
    const res = await api.post('/auth/register/leader', fields);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Always clear in-memory auth state, even when the network request fails.
      // The server-side httpOnly cookie is cleared when the logout request reaches it.
      setUser(null);
    }
  }, []);

  const value = { user, loading, sessionError, retrySession: restoreSession, login, register, registerLeader, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook for consuming auth state. Throws if used outside AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
