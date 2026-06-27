import { useCallback, useEffect, useState } from 'react';
import { getPaisesOrigen } from '../lib/queries/catalogos';
import type { PaisOrigenItem } from '../lib/queries/catalogos';

export interface UsePaisesOrigenResult {
  /** Catálogo sincronizado (o `[]` si todavía no se sincronizó o falló la carga). */
  items: PaisOrigenItem[];
  /** True mientras hay un fetch en curso. */
  loading: boolean;
  /** Mensaje de error si la última carga falló. `null` en caso contrario. */
  error: string | null;
  /**
   * True cuando el catálogo está cargado pero el server reporta que NO fue sincronizado
   * contra el SIAT (la tabla `CatPaisOrigen` está vacía). La UI debe mostrar un aviso
   * y bloquear el submit del cobro cuando el tipo de documento es CEX/PAS.
   */
  sincronizado: boolean;
  /** True solo cuando ya terminó la carga, no hay error y `items` está vacío. */
  isEmpty: boolean;
  /** Helper para reintentar la carga manualmente. */
  refetch: () => Promise<void>;
}

/**
 * Hook que envuelve `getPaisesOrigen` con manejo de loading/error/empty.
 *
 * Espejo de `useMotivosAnulacion`. Consumido por `DatosFiscalesForm` para
 * alimentar el dropdown "País de origen del documento" cuando el cajero
 * elige tipo de documento CEX (2) o PAS (3).
 *
 * @param autoFetch Si true (default), dispara la carga al montar. Pasarlo a `false`
 *                  si querés controlar cuándo arrancar (ej. lazy load cuando
 *                  el usuario selecciona CEX/PAS).
 */
export function usePaisesOrigen(autoFetch = true): UsePaisesOrigenResult {
  const [items, setItems] = useState<PaisOrigenItem[]>([]);
  const [sincronizado, setSincronizado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getPaisesOrigen();
      setItems(resp.items);
      setSincronizado(resp.sincronizado);
    } catch (e) {
      // `api` tira ApiError con mensaje legible; cualquier otro Error también.
      const message =
        e instanceof Error ? e.message : 'Error al cargar catálogo de países de origen';
      setError(message);
      setItems([]);
      // Si falló la request asumimos que no sabemos el estado de sync;
      // el `error` ya bloquea la UI por su cuenta, así que `sincronizado` da igual.
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