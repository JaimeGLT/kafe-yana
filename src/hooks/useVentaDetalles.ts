// Hook + helper para cargar UNA venta con sus detalles y notas de ajuste completas.
//
// ¿Por qué existe?
//   La lista de ventas (`useVentasPage` → `GET_VENTAS`) ya NO trae `detalles`
//   para mantener el payload liviano. Cuando el usuario abre el modal de
//   detalle de una venta, este hook dispara una query puntual por id para
//   obtener las líneas (`detalles`) y re-mapear la entidad `Sale` con los
//   items poblados.
//
// Patrón: idéntico al de `useFidelizacion.ts` (fetch puntual + useEffect
// reactivo al id + cleanup con AbortController para evitar setState tras
// unmount).

import { useCallback, useEffect, useState } from 'react';
import { gql } from '../lib/graphql';
import { GET_VENTA_CON_DETALLES } from '../lib/queries/ventas.queries';
import {
  mapBackendVentaToSale,
  type BackendVentasResponse,
} from '../pages/sales/sales.mapper';
import type { Sale } from '../types';

/**
 * Helper reutilizable: trae una venta con detalles por id y la mapea a `Sale`.
 *
 * Se usa desde `useVentaDetalles` y desde handlers puntuales de la página
 * (ej. reimprimir factura/comanda desde la fila de la tabla cuando la lista
 * no trae `detalles`). Devuelve `null` si no se encuentra.
 */
export async function fetchVentaById(
  ventaId: number,
): Promise<Sale | null> {
  const data = await gql<BackendVentasResponse>(
    GET_VENTA_CON_DETALLES,
    { id: ventaId },
  );
  const first = data.ventas.items[0];
  return first ? mapBackendVentaToSale(first) : null;
}

export interface UseVentaDetallesReturn {
  /** Venta mapeada con `items` poblados. `null` si no se ha cargado o el id es null. */
  venta: Sale | null;
  /** True mientras se está ejecutando la query puntual. */
  isLoading: boolean;
  /** Mensaje de error si la query falló (GraphQL o red). */
  error: string | null;
  /** Re-ejecuta la query (útil después de acciones SIAT que modifican la venta). */
  refresh: () => Promise<void>;
}

export function useVentaDetalles(ventaId: number | null): UseVentaDetallesReturn {
  const [venta, setVenta] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: number, signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const ventaCargada = await fetchVentaById(id);
      if (signal.aborted) return;
      setVenta(ventaCargada);
      if (!ventaCargada) {
        setError(`No se encontró la venta con id ${id}.`);
      }
    } catch (e) {
      if (signal.aborted) return;
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      console.error('[useVentaDetalles] Error cargando venta:', e);
      setError(msg);
      setVenta(null);
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sin id seleccionado → limpiamos estado y no hacemos fetch.
    if (ventaId == null) {
      setVenta(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    void load(ventaId, controller.signal);
    return () => controller.abort();
  }, [ventaId, load]);

  const refresh = useCallback(async () => {
    if (ventaId == null) return;
    const controller = new AbortController();
    await load(ventaId, controller.signal);
  }, [ventaId, load]);

  return { venta, isLoading, error, refresh };
}
