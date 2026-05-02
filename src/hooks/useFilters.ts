import { useState, useEffect, useCallback } from 'react';

export interface FiltersState {
  search: string;
  category: string;
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: FiltersState = {
  search: '',
  category: '',
  page: 1,
  pageSize: 15,
};

function readFilters(storageKey: string): FiltersState {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<FiltersState>;
    return {
      search: parsed.search ?? DEFAULT_FILTERS.search,
      category: parsed.category ?? DEFAULT_FILTERS.category,
      page: parsed.page ?? DEFAULT_FILTERS.page,
      pageSize: parsed.pageSize ?? DEFAULT_FILTERS.pageSize,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function writeFilters(storageKey: string, filters: FiltersState): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(filters));
  } catch {
    // sessionStorage no disponible
  }
}

export interface UseFiltersReturn {
  filters: FiltersState;
  setSearch: (v: string) => void;
  setCategory: (v: string) => void;
  setPage: (v: number) => void;
  setPageSize: (v: number) => void;
  resetPage: () => void;
  resetAll: () => void;
}

export function useFilters(storageKey: string): UseFiltersReturn {
  const [filters, setFilters] = useState<FiltersState>(() => readFilters(storageKey));

  useEffect(() => {
    writeFilters(storageKey, filters);
  }, [storageKey, filters]);

  const setSearch = useCallback((v: string) => {
    setFilters((f) => ({ ...f, search: v, page: 1 }));
  }, []);

  const setCategory = useCallback((v: string) => {
    setFilters((f) => ({ ...f, category: v, page: 1 }));
  }, []);

  const setPage = useCallback((v: number) => {
    setFilters((f) => ({ ...f, page: v }));
  }, []);

  const setPageSize = useCallback((v: number) => {
    setFilters((f) => ({ ...f, pageSize: v, page: 1 }));
  }, []);

  const resetPage = useCallback(() => {
    setFilters((f) => ({ ...f, page: 1 }));
  }, []);

  const resetAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return { filters, setSearch, setCategory, setPage, setPageSize, resetPage, resetAll };
}