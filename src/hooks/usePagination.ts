import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface UsePaginationOptions {
  pageSize?: number;
  debounceMs?: number;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  search: string;
  debouncedSearch: string;
  cursors: Record<number, string>;
  maxReachablePage: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setCursors: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  resetPage: () => void;
}

export function usePagination({
  pageSize: initialPageSize = 15,
  debounceMs = 300,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursors, setCursors] = useState<Record<number, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  useEffect(() => {
    setCursors({});
    setPage(1);
  }, [debouncedSearch]);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const cursorsRef = useRef<Record<number, string>>({});
  cursorsRef.current = cursors;

  const maxReachablePage = useMemo(() => {
    let max = 1;
    while (cursors[max]) max++;
    return max;
  }, [cursors]);

  return {
    page,
    pageSize,
    search,
    debouncedSearch,
    cursors,
    maxReachablePage,
    setPage,
    setPageSize,
    setSearch,
    setCursors,
    resetPage,
  };
}