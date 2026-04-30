import { gql } from '../lib/graphql';
import { GET_COMBOS_WITH_PRODUCTS } from '../lib/queries/combos.queries';
import { mapCombo, mapComprado, mapElaboradoProduct } from '../lib/mappers/combos.mappers';
import type { Combo, Product, Receta } from '../types';
import type { ComboNode, ProductsForComboResponse } from '../types/graphql';
import { useCallback, useState } from 'react';

interface CombosWithProductsResponse {
  combos: { nodes: ComboNode[] };
  comprados: { nodes: ProductsForComboResponse['comprados']['nodes'] };
  elaborados: { nodes: ProductsForComboResponse['elaborados']['nodes'] };
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
      const data = await gql<CombosWithProductsResponse>(GET_COMBOS_WITH_PRODUCTS);

      const mappedProducts = [
        ...data.comprados.nodes.map(mapComprado),
        ...data.elaborados.nodes.map(mapElaboradoProduct),
      ];
      const mappedCombos = data.combos.nodes.map((n) => mapCombo(n));

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