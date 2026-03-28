import { gql } from '../lib/graphql';
import { COMBOS_QUERY, PRODUCTS_QUERY } from '../lib/queries/combos.queries';
import { mapCombo, mapProduct } from '../lib/mappers/combos.mappers';
import type { CombosResponse, ProductsResponse } from '../types/graphql';
import type { Combo, Product, Receta } from '../types';
import { useCallback, useState } from 'react';

async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let after: string | null = null;

  while (true) {
    const data: ProductsResponse = await gql<ProductsResponse>(PRODUCTS_QUERY, {
      first: 50,                          // ajusta al límite real del backend
      after: after ?? undefined,
    });

    const { nodes, pageInfo } = data.productos;
    all.push(...nodes.map(mapProduct));

    if (!pageInfo.hasNextPage) break;
    after = pageInfo.endCursor;
  }

  return all;
}

export function useCombosData() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mappedProducts, combosData] = await Promise.all([
        fetchAllProducts(),
        gql<CombosResponse>(COMBOS_QUERY),
      ]);

      const mappedCombos = combosData.combos.map((n) => mapCombo(n, mappedProducts));

      setProducts(mappedProducts);
      setCombos(mappedCombos);
      setRecetas([]);
    } catch (e) {
      console.error('Error cargando datos:', e);
      setError('No se pudieron cargar los combos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { combos, products, recetas, isLoading, error, loadData };
}