import { useCallback, useEffect, useState } from 'react';
import { getMotivosAnulacion } from '../lib/queries/catalogos';
import type { MotivoAnulacionItem } from '../lib/queries/catalogos';

export interface UseMotivosAnulacionResult {
  /** Catálogo sincronizado (o `[]` si todavía no se sincronizó o falló la carga). */
  items: MotivoAnulacionItem[];
  /** True mientras hay un fetch en curso. */
  loading: boolean;
  /** Mensaje de error si la última carga falló. `null` en caso contrario. */
  error: string | null;
  /**
   * True cuando el catálogo está cargado pero el server reporta que NO fue sincronizado
   * contra el SIAT (sigue con el fallback hardcoded). La UI debe mostrar un aviso
   * y bloquear el submit de anulación.
   */
  sincronizado: boolean;
  /** True solo cuando ya terminó la carga, no hay error y `items` está vacío. */
  isEmpty: boolean;
  /** Helper para reintentar la carga manualmente. */
  refetch: () => Promise<void>;
}

/**
 * Hook que envuelve `getMotivosAnulacion` con manejo de loading/error/empty.
 *
 * Pensado para ser invocado una vez por modal al abrirse (`isOpen` → `true`).
 * Si varios modales lo invocan al mismo tiempo, el refetch redundante es barato
 * (la respuesta son 4 códigos).
 *
 * @param autoFetch Si true (default), dispara la carga al montar. Pasarlo a `false`
 *                  si querés controlar cuándo arrancar (ej. lazy load después de
 *                  confirmar que el usuario quiere anular).
 */
export function useMotivosAnulacion(autoFetch = true): UseMotivosAnulacionResult {
  const [items, setItems] = useState<MotivoAnulacionItem[]>([]);
  const [sincronizado, setSincronizado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getMotivosAnulacion();
      setItems(resp.items);
      setSincronizado(resp.sincronizado);
    } catch (e) {
      // `api` tira ApiError con mensaje legible; cualquier otro Error también.
      const message =
        e instanceof Error ? e.message : 'Error al cargar catálogo de motivos de anulación';
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
