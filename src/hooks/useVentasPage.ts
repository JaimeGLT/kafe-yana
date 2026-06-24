// Hook para la página del historial de ventas (paginada por número de página).
// Réplica del patrón de useProductsPage: el caller controla page/pageSize/where
// y guarda el mapa cursors[page] = endCursor para poder navegar hacia atrás.
//
// Por qué este hook existe:
//   - Centraliza el fetch + mapeo GraphQL → Sale (la página sólo orquesta UI).
//   - Recibe `where` ya construido por el caller (fecha, estado SIAT, búsqueda).
//   - Devuelve `sales` de la página actual y el `endCursor` que la página
//     guarda en su cache para poder volver.

import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_VENTAS } from '../lib/queries/ventas.queries';
import {
  mapBackendVentaToSale,
  type BackendVentasResponse,
} from '../pages/sales/sales.mapper';
import type { Sale } from '../types';
import type { VentaFilters } from '../types/ventas';

export interface UseVentasPageOptions {
  page: number;
  pageSize: number;
  afterCursor?: string;
  /** Filtro `where` ya construido por el caller (fecha, estado SIAT, búsqueda). */
  where?: VentaFilters;
}

export interface UseVentasPageReturn {
  ventas: Sale[];
  isLoading: boolean;
  totalCount: number;
  endCursor: string | null;
  refresh: () => Promise<void>;
}

export function useVentasPage({
  page,
  pageSize,
  afterCursor,
  where,
}: UseVentasPageOptions): UseVentasPageReturn {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [endCursor, setEndCursor] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    // Sin cursor no podemos cargar páginas siguientes — evitamos un fetch vacío.
    if (page > 1 && !afterCursor) return;
    setIsLoading(true);
    try {
      const variables: Record<string, unknown> = { first: pageSize };
      if (page > 1 && afterCursor) {
        variables.after = afterCursor;
      }
      if (where && Object.keys(where).length > 0) {
        variables.where = where;
      }

      const data = await gql<BackendVentasResponse>(GET_VENTAS, variables);
      setVentas(data.ventas.nodes.map(mapBackendVentaToSale));
      setTotalCount(data.ventas.totalCount);
      setEndCursor(data.ventas.pageInfo.endCursor);
    } catch (e) {
      console.error('[useVentasPage] Error cargando ventas:', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, afterCursor, where]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { ventas, isLoading, totalCount, endCursor, refresh };
}