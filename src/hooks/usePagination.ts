import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Pagination primitive compartido por todas las páginas del módulo.
 *
 * La URL almacena `?page=N&size=M` (1-based). Esto permite al usuario escribir
 * directamente `?page=3` en la barra de dirección y llegar a esa página.
 * Los data-hooks reciben `page`/`pageSize` y calculan el `skip`/`take` para
 * el backend: `skip = (page - 1) * pageSize`.
 *
 * Internamente, `setSearchParams` se accede via ref para que los callbacks
 * derivados (setPage, setSearch, resetPage, setPageSize) sean estables entre
 * renders, evitando loops de useEffect en páginas con filtros adicionales.
 */
export interface UsePaginationOptions {
  /** Tamaño de página inicial (default 15). Se sobrescribe si la URL trae `?size=`. */
  pageSize?: number;
  /** Debounce del texto de búsqueda. Default 300ms. */
  debounceMs?: number;
}

export interface UsePaginationReturn {
  /** Página actual (1-based). */
  page: number;
  /** Cantidad de items por página. */
  pageSize: number;
  /** Estado del input de búsqueda (no se sincroniza a la URL). */
  search: string;
  /** Estado debounced del input de búsqueda. */
  debouncedSearch: string;
  /** Salta a la página `n` (1-based) — escribe `?page=n` a la URL. */
  setPage: (page: number) => void;
  /** Cambia el tamaño de página — resetea `page=1`. */
  setPageSize: (size: number) => void;
  /** Cambia el texto de búsqueda y resetea `page=1`. */
  setSearch: (search: string) => void;
  /** Resetea a la primera página sin tocar `search` ni `size`. */
  resetPage: () => void;
}

const DEFAULT_PAGE_SIZE = 15;
const ALLOWED_PAGE_SIZES = [5, 15, 25, 50, 100];

const parsePage = (raw: string | null): number => {
  if (raw == null) return 1;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

const parseSize = (raw: string | null, fallback: number): number => {
  if (raw == null) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return ALLOWED_PAGE_SIZES.includes(n) ? n : fallback;
};

export function usePagination({
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  debounceMs = 300,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePage(searchParams.get('page'));
  const pageSize = parseSize(searchParams.get('size'), initialPageSize);

  // Ref para que los callbacks de escritura a la URL no dependan de
  // setSearchParams en su dep-array. setSearchParams se recrea en React Router
  // cada vez que cambia location.search, lo que propagaría inestabilidad a
  // setPage/setSearch/resetPage y causaría loops en useEffects externos.
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  // writeUrl es permanentemente estable (dep-array vacío + acceso via ref).
  const writeUrl = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParamsRef.current((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      }, { replace: true });
    },
    [],
  );

  const setPage = useCallback(
    (n: number) => {
      writeUrl({ page: String(Math.max(1, Math.floor(n))) });
    },
    [writeUrl],
  );

  const setPageSize = useCallback(
    (n: number) => {
      writeUrl({ size: String(n), page: '1' });
    },
    [writeUrl],
  );

  const setSearch = useCallback(
    (text: string) => {
      setSearchState(text);
      writeUrl({ page: '1' });
    },
    [writeUrl],
  );

  const resetPage = useCallback(() => {
    writeUrl({ page: '1' });
  }, [writeUrl]);

  return {
    page,
    pageSize,
    search,
    debouncedSearch,
    setPage,
    setPageSize,
    setSearch,
    resetPage,
  };
}
