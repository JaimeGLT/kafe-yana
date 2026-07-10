import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import { gql } from '../lib/graphql';
import { ME_QUERY } from '../lib/queries/auth.queries';
import type { SessionUser } from '../types/user';

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
}

interface AuthContextType extends AuthState {
  login: (identificador: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isCheckingSession: true,
  });

  const checkSession = useCallback(async () => {
    try {
      const data = await gql<{ me: SessionUser }>(ME_QUERY);
      if (data?.me?.nombre && data?.me?.rol) {
        setState({ user: data.me, isAuthenticated: true, isCheckingSession: false });
      } else {
        setState({ user: null, isAuthenticated: false, isCheckingSession: false });
      }
    } catch {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      await api.post('/Aunth/RefreshToken');
      const data = await gql<{ me: SessionUser }>(ME_QUERY);
      if (data?.me?.nombre && data?.me?.rol) {
        setState((prev) => ({ ...prev, user: data.me, isAuthenticated: true }));
      }
    } catch {
    }
  }, []);

  const login = useCallback(async (identificador: string, password: string) => {
    await api.post('/Aunth/Login', { identificador, password });
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/Aunth/Logout');
    } catch {
      // ignorar errores de logout
    } finally {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, checkSession, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { ApiError };
