import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_COMPRADOS_WITH_CATEGORIES_QUERY } from '../lib/queries/products.queries';
import { toast } from '../components/ui/Toast';
import type { Product, Category } from '../types';
import type { ProductDestino } from '../types';
interface CategoriaNode {
  id: number;
  nombre: string;
  estado: boolean;
  color: string;
}

interface CompradoListNode {
  codigo_barra: string;
  unidad_medida: string;
  ubicacion: string;
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
    urlImagen?: string;
    codigoSin?: string;
    categoria: CategoriaNode;
    detalles: { cantidad: number; opcional: boolean }[];
  };
}

interface CompradosWithCategoriesResponse {
  comprados: {
    items: CompradoListNode[];
    totalCount: number;
  };
  categorias: { items: CategoriaNode[] };
}

function mapNode(node: CompradoListNode): Product {
  const cat = node.producto.categoria;
  const rawUbicacion = node.ubicacion ?? '';
  const destino: ProductDestino =
    rawUbicacion === 'Barra' ? 'barra'
    : rawUbicacion === 'Cocina' ? 'cocina'
    : 'sin_destino';
  return {
    id: String(node.producto.id),
    code: String(node.producto.id),
    name: node.producto.nombre,
    description: node.producto.descripcion,
    tipo: 'comprado',
    categoryId: cat ? String(cat.id) : '',
    categoryName: cat ? cat.nombre : '',
    unit: node.unidad_medida,
    costPrice: node.costo_compra,
    salePrice: node.producto.precio,
    stock: node.stock_actual,
    minStock: node.stock_minimo,
    maxStock: 0,
    barcode: node.codigo_barra,
    locationId: rawUbicacion || undefined,
    destino,
    image: node.producto.urlImagen ?? undefined,
    codigoSin: node.producto.codigoSin ?? '',
    variations: [],
    hasVariations: false,
    isActive: node.disponible,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

interface UseProductsPageOptions {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
}

export interface UseProductsPageReturn {
  products: Product[];
  categories: Category[];
  totalCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useProductsPage({
  page,
  pageSize,
  search = '',
  category = '',
}: UseProductsPageOptions): UseProductsPageReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const variables: Record<string, unknown> = {
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: search || null,
        categoria: category || null,
      };

      const data = await gql<CompradosWithCategoriesResponse>(GET_COMPRADOS_WITH_CATEGORIES_QUERY, variables);
      setTotalCount(data.comprados.totalCount);
      setProducts(data.comprados.items.map(mapNode));
      setCategories(
        data.categorias.items.map((n) => ({
          id: String(n.id),
          name: n.nombre,
          description: '',
          isActive: n.estado,
          color: n.color,
          sortOrder: 0,
          productCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
    } catch (err) {
      toast.error('Error al cargar', err instanceof Error ? err.message : 'No se pudieron cargar los productos.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, category]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { products, categories, totalCount, isLoading, refresh };
}