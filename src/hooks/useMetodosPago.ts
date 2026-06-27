import { useCallback, useEffect, useState } from 'react';
import { getMetodosPago } from '../lib/queries/catalogos';
import type { MetodoPagoItem } from '../lib/queries/catalogos';

export interface UseMetodosPagoResult {
  /** Catálogo sincronizado (o `[]` si todavía no se sincronizó o falló la carga). */
  items: MetodoPagoItem[];
  /** True mientras hay un fetch en curso. */
  loading: boolean;
  /** Mensaje de error si la última carga falló. `null` en caso contrario. */
  error: string | null;
  /**
   * True cuando el catálogo está cargado pero el server reporta que NO fue
   * sincronizado contra el SIAT (la tabla `CatMetodosPago` está vacía o solo
   * trae el `FallbackHardcoded`). La UI debe mostrar un aviso pero NO
   * bloquear el submit — los códigos 1=EFECTIVO y 7=TRANSFERENCIA siguen
   * siendo válidos porque arrancan `Activo=true` por default.
   */
  sincronizado: boolean;
  /** True solo cuando ya terminó la carga, no hay error y `items` está vacío. */
  isEmpty: boolean;
  /** Helper para reintentar la carga manualmente. */
  refetch: () => Promise<void>;
}

/**
 * Hook que envuelve `getMetodosPago` con manejo de loading/error/empty.
 *
 * Espejo de `usePaisesOrigen` y `useMotivosAnulacion`. Consumido por
 * `PagoPanel` para alimentar los botones de método de pago en el POS.
 *
 * El server devuelve SOLO los métodos con `activo=true` (los que el operador
 * habilitó para KafeYana), por lo que `items.length` es lo que se muestra
 * directamente en la UI sin filtrar adicional.
 *
 * @param autoFetch Si true (default), dispara la carga al montar. Pasarlo a `false`
 *                  si querés controlar cuándo arrancar (ej. lazy load cuando
 *                  el usuario abre el panel de pago).
 */
export function useMetodosPago(autoFetch = true): UseMetodosPagoResult {
  const [items, setItems] = useState<MetodoPagoItem[]>([]);
  const [sincronizado, setSincronizado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getMetodosPago();
      setItems(resp.items);
      setSincronizado(resp.sincronizado);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Error al cargar catálogo de métodos de pago';
      setError(message);
      setItems([]);
      setSincronizado(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetch();
    }
  }, [autoFetch, fetch]);

  return {
    items,
    loading,
    error,
    sincronizado,
    isEmpty: !loading && !error && items.length === 0,
    refetch: fetch,
  };
}