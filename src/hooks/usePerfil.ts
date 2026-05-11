import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_ME } from '../lib/queries/settings.queries';
import type { User } from '../types/user';

export interface UpdatePerfilPayload {
  nombre: string;
  apellido: string;
  numeroPhone: string;
  rol: number;
}

export interface ChangePasswordPayload {
  passwordActual: string;
  passwordNueva: string;
  passwordConfirm: string;
}

export function usePerfil() {
  const [perfil, setPerfil] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerfil = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gql<{ me: User }>(GET_ME);
      setPerfil(data.me ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar el perfil.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePerfil = useCallback(async (email: string, payload: UpdatePerfilPayload): Promise<boolean> => {
    try {
      const body: Record<string, string | number | undefined> = {
        nombre: payload.nombre.trim(),
        apellido: payload.apellido.trim(),
        numeroPhone: payload.numeroPhone.trim(),
        rol: payload.rol,
      };
      await api.put(`/Aunth/${encodeURIComponent(email)}`, body);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el perfil.';
      setError(msg);
      return false;
    }
  }, []);

  const changePassword = useCallback(async (
    email: string,
    payload: ChangePasswordPayload
  ): Promise<boolean> => {
    try {
      await api.put('/Aunth/new-password', {
        email,
        passwordActual: payload.passwordActual,
        passwordNueva: payload.passwordNueva,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.';
      setError(msg);
      return false;
    }
  }, []);

  return {
    perfil,
    loading,
    error,
    fetchPerfil,
    updatePerfil,
    changePassword,
  };
}
