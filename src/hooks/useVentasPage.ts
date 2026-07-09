// Hook para la página del historial de ventas (paginada por número de página).
// El caller controla page/pageSize/where; el backend hace skip/take directamente,
// por lo que NO necesitamos guardar cursors[page] como antes.
//
// Por qué este hook existe:
//   - Centraliza el fetch + mapeo GraphQL → Sale (la página sólo orquesta UI).
//   - Recibe `where` ya construido por el caller (fecha, estado SIAT, búsqueda).
//   - Devuelve `ventas` de la página actual y `totalCount` para los KPIs.

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
  /** Filtro `where` ya construido por el caller (fecha, estado SIAT, búsqueda). */
  where?: VentaFilters;
}

export interface UseVentasPageReturn {
  ventas: Sale[];
  isLoading: boolean;
  totalCount: number;
  refresh: () => Promise<void>;
}

export function useVentasPage({
  page,
  pageSize,
  where,
}: UseVentasPageOptions): UseVentasPageReturn {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const variables: Record<string, unknown> = {
        skip: (page - 1) * pageSize,
        take: pageSize,
        fechaDesde: where?.fechaEmision?.gte ?? null,
        fechaHasta: where?.fechaEmision?.lte ?? null,
        estadoSiat: where?.estadoSiat?.eq ?? null,
        facturado: where?.facturado?.eq ?? null,
        search: where?.or?.[0]?.nombreRazonSocial?.contains ?? null,
      };

      const data = await gql<BackendVentasResponse>(GET_VENTAS, variables);
      setVentas(data.ventas.items.map(mapBackendVentaToSale));
      setTotalCount(data.ventas.totalCount);
    } catch (e) {
      console.error('[useVentasPage] Error cargando ventas:', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, where]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { ventas, isLoading, totalCount, refresh };
}