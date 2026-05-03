import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_PROVEEDORES } from '../lib/queries/proveedores.queries';
import type { Supplier } from '../types/purchases';

interface ProveedorNode {
  id: number;
  razon_Social: string;
  dni: string;
  telefono: string;
  celular: string;
  email: string;
  direccion: string;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface ProveedoresResponse {
  proveedores: {
    nodes: ProveedorNode[];
    totalCount: number;
    pageInfo: PageInfo;
  };
}

export interface UseSuppliersPageOptions {
  page: number;
  pageSize: number;
  afterCursor?: string;
}

export interface UseSuppliersPageReturn {
  proveedores: Supplier[];
  totalCount: number;
  endCursor: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSuppliersPage(options: UseSuppliersPageOptions): UseSuppliersPageReturn {
  const { page, pageSize, afterCursor } = options;
  const [proveedores, setProveedores] = useState<Supplier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<ProveedoresResponse>(GET_PROVEEDORES, {
        first: pageSize,
        after: afterCursor,
      });
      setProveedores(
        data.proveedores.nodes.map((n) => ({
          id: String(n.id),
          code: String(n.id),
          razon_Social: n.razon_Social,
          dni: n.dni,
          telefono: n.telefono,
          celular: n.celular,
          email: n.email,
          direccion: n.direccion,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      setTotalCount(data.proveedores.totalCount);
      setEndCursor(data.proveedores.pageInfo.endCursor);
    } catch (e) {
      console.error('Error loading proveedores:', e);
      setError('No se pudieron cargar los proveedores.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, afterCursor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { proveedores, totalCount, endCursor, isLoading, error, refresh };
}