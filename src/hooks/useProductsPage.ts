import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_COMPRADOS_WITH_CATEGORIES_QUERY } from '../lib/queries/products.queries';
import type { Product, Category } from '../types';

interface CategoriaNode {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  estado: boolean;
}

interface ProductoNode {
  codigo_barra: string;
  unidad_medida: string;
  costo_compra: number;
  stock_actual: number;
  stock_minimo: number;
  disponible: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    categoria: CategoriaNode | null;
    detalles: { cantidad: number; opcional: boolean }[];
  };
}

interface ProductsPageResponse {
  comprados: { nodes: ProductoNode[] };
  categorias: { nodes: CategoriaNode[] };
}

export interface UseProductsPageReturn {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProductsPage(): UseProductsPageReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<ProductsPageResponse>(GET_COMPRADOS_WITH_CATEGORIES_QUERY);

      const mappedProducts: Product[] = data.comprados.nodes.map((n) => {
        const cat = n.producto.categoria;
        return {
          id: String(n.producto.id),
          code: n.codigo_barra || String(n.producto.id),
          name: n.producto.nombre,
          description: n.producto.descripcion,
          tipo: 'comprado' as const,
          categoryId: cat ? String(cat.id) : '',
          categoryName: cat ? cat.nombre : '',
          unit: n.unidad_medida,
          costPrice: n.costo_compra,
          salePrice: n.producto.precio,
          stock: n.stock_actual,
          minStock: n.stock_minimo,
          maxStock: 0,
          barcode: n.codigo_barra,
          variations: [],
          hasVariations: false,
          isActive: Boolean(n.disponible),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const mappedCategories: Category[] = data.categorias.nodes.map((c) => ({
        id: String(c.id),
        name: c.nombre,
        description: c.descripcion,
        color: c.color,
        isActive: Boolean(c.estado),
        productCount: data.comprados.nodes.filter((p) => p.producto.categoria?.id === c.id).length,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setProducts(mappedProducts);
      setCategories(mappedCategories);
    } catch (e) {
      console.error('Error loading products page:', e);
      setError('No se pudieron cargar los productos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { products, categories, isLoading, error, refresh };
}