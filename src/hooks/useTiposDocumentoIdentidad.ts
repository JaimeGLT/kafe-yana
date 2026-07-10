import { useCallback, useEffect, useState } from 'react';
import { getTiposDocumentoIdentidad } from '../lib/queries/catalogos';
import type { TipoDocumentoIdentidadItem } from '../lib/queries/catalogos';

export interface UseTiposDocumentoIdentidadResult {
  /** Catálogo sincronizado (o `[]` si todavía no se sincronizó o falló la carga). */
  items: TipoDocumentoIdentidadItem[];
  /** True mientras hay un fetch en curso. */
  loading: boolean;
  /** Mensaje de error si la última carga falló. `null` en caso contrario. */
  error: string | null;
  /**
   * True cuando el catálogo está cargado y fue sincronizado contra el SIAT.
   * False cuando el server está sirviendo el `FallbackHardcoded` (sync #9
   * todavía no corrió o falló en todos los PVs). La UI debe mostrar un aviso
   * pero NO bloquear el submit: el fallback del backend acepta los códigos
   * 1..5 que son los oficiales del SIN vigente a jun-2026.
   */
  sincronizado: boolean;
  /** True solo cuando ya terminó la carga, no hay error y `items` está vacío. */
  isEmpty: boolean;
  /** Helper para reintentar la carga manualmente. */
  refetch: () => Promise<void>;
}

/**
 * Hook que envuelve `getTiposDocumentoIdentidad` con manejo de loading/error/empty.
 *
 * Espejo de `usePaisesOrigen`. Consumido por `DatosFiscalesForm` para alimentar
 * el dropdown "Tipo de documento" del POS. La lista la persiste el backend vía
 * `SincronizadorCatTipoDocumentoIdentidad` (sync diario 08:10 BOT) y la sirve
 * el endpoint `GET /api/catalogos/tipos-documento-identidad`.
 *
 * El dropdown está siempre visible en el POS (a diferencia del de país, que
 * sólo aparece si el tipo es CEX/PAS), así que por defecto auto-fetchea al
 * montar. Pasarle `autoFetch=false` si querés controlar cuándo arrancar.
 *
 * @param autoFetch Si true (default), dispara la carga al montar.
 */
export function useTiposDocumentoIdentidad(autoFetch = true): UseTiposDocumentoIdentidadResult {
  const [items, setItems] = useState<TipoDocumentoIdentidadItem[]>([]);
  const [sincronizado, setSincronizado] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getTiposDocumentoIdentidad();
      setItems(resp.items);
      setSincronizado(resp.sincronizado);
    } catch (e) {
      // `api` tira ApiError con mensaje legible; cualquier otro Error también.
      const message =
        e instanceof Error ? e.message : 'Error al cargar catálogo de tipos de documento';
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
