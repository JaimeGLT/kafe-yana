import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_ME } from '../lib/queries/settings.queries';
import type { User } from '../types/user';

export interface UpdatePerfilPayload {
  nombre: string;
  apellido: string;
  telefono: string;
  usuario: string;
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
      await api.put('/Aunth/info', {
        nombre: payload.nombre.trim(),
        apellido: payload.apellido.trim(),
        email,
        usuario: payload.usuario.trim(),
        telefono: payload.telefono.trim(),
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el perfil.';
      setError(msg);
      return false;
    }
  }, []);

  const changePassword = useCallback(async (
    payload: ChangePasswordPayload
  ): Promise<boolean> => {
    try {
      await api.put('/Aunth/new-password', {
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
