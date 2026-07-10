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
  numeroCompras: number;
  estado: boolean | string;
  id: number;
}

interface ClientesResponse {
  clientes: {
    items: ClienteNode[];
    totalCount: number;
  };
}

export interface UseCustomersPageOptions {
  page: number;
  pageSize: number;
  search?: string;
}

export interface UseCustomersPageReturn {
  clientes: Customer[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  totalCount: number;
}

export function useCustomersPage({
  page,
  pageSize,
  search,
}: UseCustomersPageOptions): UseCustomersPageReturn {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const variables: Record<string, unknown> = {
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: search || null,
      };
      const data = await gql<ClientesResponse>(GET_CLIENTES, variables);
      setClientes(
        data.clientes.items.map((n) => ({
          id: String(n.id),
          dni: n.dni,
          nombre: n.nombre,
          celular: n.celular,
          correo: n.correo,
          fecha_nacimiento: n.fecha_nacimiento,
          direccion: n.direccion,
          puntos: n.puntos,
          numeroCompras: n.numeroCompras,
          estado: n.estado === true || n.estado === '1' || n.estado === 'true',
        })),
      );
      setTotalCount(data.clientes.totalCount);
    } catch (e) {
      console.error('Error loading clientes:', e);
      setError('No se pudieron cargar los clientes.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { clientes, isLoading, error, refresh, totalCount };
}