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
  estado: boolean | string;
  id: number;
}

interface ClientesResponse {
  clientes: {
    nodes: ClienteNode[];
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export interface UseCustomersPageOptions {
  page: number;
  pageSize: number;
  afterCursor?: string;
}

export interface UseCustomersPageReturn {
  clientes: Customer[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  totalCount: number;
  endCursor: string | null;
}

export function useCustomersPage({
  pageSize,
  afterCursor,
}: UseCustomersPageOptions): UseCustomersPageReturn {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [endCursor, setEndCursor] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (page > 1 && !afterCursor) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<ClientesResponse>(GET_CLIENTES, {
        first: pageSize,
        after: afterCursor,
      });
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
          estado: n.estado === true || n.estado === '1' || n.estado === 'true',
        })),
      );
      setTotalCount(data.clientes.totalCount);
      setEndCursor(data.clientes.pageInfo.endCursor);
    } catch (e) {
      console.error('Error loading clientes:', e);
      setError('No se pudieron cargar los clientes.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, afterCursor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { clientes, isLoading, error, refresh, totalCount, endCursor };
}