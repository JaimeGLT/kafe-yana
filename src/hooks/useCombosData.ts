import { gql } from '../lib/graphql';
import { COMBOS_QUERY, GET_PRODUCTS_FOR_COMBO } from '../lib/queries/combos.queries';
import { mapCombo, mapComprado, mapElaboradoProduct } from '../lib/mappers/combos.mappers';
import type { CombosResponse, ProductsForComboResponse } from '../types/graphql';
import type { Combo, Product, Receta } from '../types';
import { useCallback, useState } from 'react';

async function fetchAllProducts(): Promise<Product[]> {
  const data = await gql<ProductsForComboResponse>(GET_PRODUCTS_FOR_COMBO);
  return [
    ...data.comprados.nodes.map(mapComprado),
    ...data.elaborados.nodes.map(mapElaboradoProduct),
  ];
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
      
      const mappedCombos = combosData.combos.nodes.map((n) => mapCombo(n));

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