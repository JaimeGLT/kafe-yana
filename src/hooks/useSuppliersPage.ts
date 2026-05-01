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

interface ProveedoresResponse {
  proveedores: { nodes: ProveedorNode[] };
}

export interface UseSuppliersPageReturn {
  proveedores: Supplier[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSuppliersPage(): UseSuppliersPageReturn {
  const [proveedores, setProveedores] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<ProveedoresResponse>(GET_PROVEEDORES);
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
    } catch (e) {
      console.error('Error loading proveedores:', e);
      setError('No se pudieron cargar los proveedores.');
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

  return { proveedores, isLoading, error, refresh };
}