import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_CLIENTES } from '../lib/queries/clientes.queries';
import type { Customer } from '../types';

interface ClienteNode {
  dni: string;
  nombre: string;
  celular: string;
  correo: string;
  fecha_nacimiento: string;
  direccion: string;
  puntos: number;
  estado: string;
  id: number;
}

interface ClientesResponse {
  clientes: { nodes: ClienteNode[] };
}

export interface UseCustomersPageReturn {
  clientes: Customer[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCustomersPage(): UseCustomersPageReturn {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<ClientesResponse>(GET_CLIENTES);
      setClientes(
        data.clientes.nodes.map((n) => ({
          id: String(n.id),
          dni: n.dni,
          nombre: n.nombre,
          celular: n.celular,
          correo: n.correo,
          fecha_nacimiento: n.fecha_nacimiento,
          direccion: n.direccion,
          puntos: n.puntos,
          estado: n.estado === '1' || n.estado === 'true',
        })),
      );
    } catch (e) {
      console.error('Error loading clientes:', e);
      setError('No se pudieron cargar los clientes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { clientes, isLoading, error, refresh };
}