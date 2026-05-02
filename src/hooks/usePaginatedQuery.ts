import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';

export interface PaginatedFilters {
  search?: string;
  category?: string;
}

export interface UsePaginatedQueryOptions<TItem> {
  query: string;
  page: number;
  pageSize: number;
  filters?: PaginatedFilters;
  mapFn: (node: TItem) => TItem;
  dependencies?: unknown[];
}

export interface UsePaginatedQueryReturn<TItem> {
  items: TItem[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePaginatedQuery<TItem>({
  query,
  page,
  pageSize,
  filters,
  mapFn,
  dependencies = [],
}: UsePaginatedQueryOptions<TItem>): UsePaginatedQueryReturn<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const variables: Record<string, unknown> = {
        first: pageSize,
        skip: (page - 1) * pageSize,
      };
      if (filters?.search) variables.search = filters.search;
      if (filters?.category) variables.category = filters.category;

      const data = await gql<Record<string, unknown>>(query, variables);

      const dataKey = Object.keys(data).find((k) => k !== 'categorias');
      if (!dataKey) throw new Error('No se encontró la clave de datos en la respuesta');

      const result = data[dataKey] as { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: TItem[] };
      setTotalCount(result.totalCount);
      setItems(result.nodes.map(mapFn));
    } catch (e) {
      console.error('Error loading paginated data:', e);
      setError('No se pudieron cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  }, [query, page, pageSize, filters, mapFn, ...dependencies]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { items, totalCount, isLoading, error, refresh };
}
