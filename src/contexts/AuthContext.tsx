import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { User } from '../types';
import { ME_QUERY } from '../lib/queries/auth.queries';
import { gql } from '../lib/graphql';

interface AuthState {
  user: User | null;
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
      const { me } = await gql<{ me: User }>(ME_QUERY);
      setState({ user: me, isAuthenticated: true, isCheckingSession: false });
    } catch {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await api.post('/Aunth/Login', { email, password });
    await checkSession();
  }, [checkSession]);

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

  // Cuando api.ts o graphql.ts no pueden renovar el token, despachan este evento
  // para que el contexto fuerce el logout sin importar en qué página esté el usuario.
  useEffect(() => {
    const handleUnauthorized = () => {
      setState({ user: null, isAuthenticated: false, isCheckingSession: false });
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
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