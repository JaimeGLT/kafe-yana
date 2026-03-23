import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  /** Usuario autenticado. null = no autenticado o sesión aún no verificada. */
  user: User | null;
  /** true mientras se verifica la sesión al arrancar la app. */
  isCheckingSession: boolean;
  /** true una vez que checkSession terminó (exitoso o no). */
  isAuthenticated: boolean;

  /**
   * Verifica si hay una sesión activa en el backend.
   * Se llama una sola vez al montar la app.
   */
  checkSession: () => Promise<void>;

  /**
   * Envía credenciales al backend. El backend setea la cookie HttpOnly.
   * NUNCA almacenamos el password ni el token en estado.
   */
  login: (username: string, password: string) => Promise<void>;

  /**
   * Invalida la sesión en el backend y limpia el estado local.
   * Siempre limpia el estado aunque el request falle.
   */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isCheckingSession: true,
  isAuthenticated: false,

  checkSession: async () => {
    try {
      const user = await api.get<User>('/Aunth/Me');
      set({ user, isAuthenticated: true, isCheckingSession: false });
    } catch {
      // 401 u otro error — sesión inválida o no existe
      set({ user: null, isAuthenticated: false, isCheckingSession: false });
    }
  },

  login: async (email, password) => {
    // El backend recibe las credenciales y responde seteando la cookie HttpOnly.
    // La respuesta incluye el usuario autenticado.
    const user = await api.post<User>('/Aunth/Login', { email, password });
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      // Invalida la sesión en el backend (elimina la cookie de sesión server-side)
      await api.post('/Aunth/Logout');
    } catch {
      // Si el request falla, igual limpiamos el estado local
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
