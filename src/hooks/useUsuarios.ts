import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_USUARIOS } from '../lib/queries/settings.queries';
import type { User } from '../types/user';

export interface CreateUserPayload {
  nombre: string;
  apellido: string;
  email: string;
  usuario: string;
  password: string;
  numeroPhone: string;
  rol: number;
}

export interface UpdateUserPayload {
  nombre: string;
  apellido: string;
  numeroPhone: string;
  rol: number;
  password?: string;
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gql<{ usuarios: User[] }>(GET_USUARIOS);
      setUsuarios(data.usuarios ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar los usuarios.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createUsuario = useCallback(async (payload: CreateUserPayload): Promise<string | null> => {
    try {
      await api.post('/Aunth/Registro', {
        nombre: payload.nombre.trim(),
        apellido: payload.apellido.trim(),
        email: payload.email.trim(),
        usuario: payload.usuario.trim(),
        password: payload.password,
        numeroPhone: payload.numeroPhone.trim(),
        rol: payload.rol,
      });
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear el usuario.';
      setError(msg);
      return msg;
    }
  }, []);

  const updateUsuario = useCallback(async (email: string, payload: UpdateUserPayload): Promise<string | null> => {
    try {
      const body: Record<string, string | number | undefined> = {
        nombre: payload.nombre.trim(),
        apellido: payload.apellido.trim(),
        numeroPhone: payload.numeroPhone.trim(),
        rol: payload.rol,
      };
      if (payload.password) {
        body.password = payload.password;
      }
      await api.put(`/Aunth/${encodeURIComponent(email)}`, body);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el usuario.';
      setError(msg);
      return msg;
    }
  }, []);

  const deleteUsuario = useCallback(async (email: string): Promise<string | null> => {
    try {
      await api.delete(`/Aunth/${encodeURIComponent(email)}`);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar el usuario.';
      setError(msg);
      return msg;
    }
  }, []);

  const blockUsuario = useCallback(async (email: string): Promise<string | null> => {
    try {
      await api.put(`/Aunth/bloquear/${encodeURIComponent(email)}`);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo bloquear el usuario.';
      setError(msg);
      return msg;
    }
  }, []);

  const unblockUsuario = useCallback(async (email: string): Promise<string | null> => {
    try {
      await api.put(`/Aunth/desbloquear/${encodeURIComponent(email)}`);
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo desbloquear el usuario.';
      setError(msg);
      return msg;
    }
  }, []);

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    blockUsuario,
    unblockUsuario,
  };
}
