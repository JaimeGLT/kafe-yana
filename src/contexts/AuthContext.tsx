import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { SessionUser } from '../types/user';

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
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
      const userData = await api.post<SessionUser>('/Aunth/RefreshToken');
      if (userData?.nombre && userData?.rol) {
        setState({ user: userData, isAuthenticated: true, isCheckingSession: false });
      } else {
        setState({ user: null, isAuthenticated: false, isCheckingSession: false });
      }
    } catch {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const userData = await api.post<SessionUser>('/Aunth/Login', { email, password });
    if (userData?.nombre && userData?.rol) {
      setState({ user: userData, isAuthenticated: true, isCheckingSession: false });
    } else {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    }
  }, []);

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

  useEffect(() => {
    const handleUserRefreshed = (e: Event) => {
      const userData = (e as CustomEvent<SessionUser>).detail;
      if (userData?.nombre && userData?.rol) {
        setState((prev) => ({ ...prev, user: userData, isAuthenticated: true }));
      }
    };
    window.addEventListener('auth:user-refreshed', handleUserRefreshed);
    return () => window.removeEventListener('auth:user-refreshed', handleUserRefreshed);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, checkSession }}>
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
