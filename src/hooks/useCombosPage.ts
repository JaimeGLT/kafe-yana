import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_COMBOS_WITH_PRODUCTS } from '../lib/queries/combos.queries';
import { toast } from '../components/ui/Toast';
import type { Combo, Product } from '../types';

interface ComboNode {
  producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string };
  detalles: Array<{
    producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string };
    cantidad: number;
    opcional: boolean;
  }>;
  cantidadProducible: number;
}

interface ProductsNode {
  costo_compra: number;
  stock_actual: number;
  producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string };
}

interface ElaboradoNode {
  costo_compra: number;
  stock_actual: number;
  producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string };
  receta?: { id: number };
}

interface CombosPageResponse {
  combos: { nodes: ComboNode[]; totalCount: number; pageInfo?: { endCursor?: string | null } };
  comprados: { nodes: ProductsNode[] };
  elaborados: { nodes: ElaboradoNode[] };
}

interface UseCombosPageOptions {
  page: number;
  pageSize: number;
  afterCursor?: string;
  search?: string;
}

export interface UseCombosPageReturn {
  combos: Combo[];
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  endCursor: string | null;
}

export function useCombosPage(options: UseCombosPageOptions): UseCombosPageReturn {
  const { page, pageSize, afterCursor, search } = options;
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [endCursor, setEndCursor] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (page > 1 && !afterCursor) return;
    setIsLoading(true);
    try {
      const variables: Record<string, unknown> = { first: pageSize };
      if (page > 1 && afterCursor) {
        variables.after = afterCursor;
      }
      if (search) {
        variables.where = { producto: { nombre: { contains: search } } };
      }

      const data = await gql<CombosPageResponse>(GET_COMBOS_WITH_PRODUCTS, variables);
      setTotalCount(data.combos.totalCount);
      setEndCursor(data.combos.pageInfo?.endCursor ?? null);

      const mappedProducts: Product[] = [
        ...data.comprados.nodes.map((n) => ({
          id: String(n.producto.id),
          code: String(n.producto.id),
          name: n.producto.nombre,
          description: n.producto.descripcion,
          tipo: 'comprado' as const,
          categoryId: '',
          categoryName: '',
          unit: '',
          costPrice: n.costo_compra,
          salePrice: n.producto.precio,
          stock: n.stock_actual,
          minStock: 0,
          maxStock: 0,
          barcode: '',
          variations: [],
          hasVariations: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        ...data.elaborados.nodes.map((n) => ({
          id: String(n.producto.id),
          code: String(n.producto.id),
          name: n.producto.nombre,
          description: n.producto.descripcion,
          tipo: 'elaborado' as const,
          categoryId: '',
          categoryName: '',
          unit: '',
          costPrice: 0,
          salePrice: n.producto.precio,
          stock: 0,
          minStock: 0,
          maxStock: 0,
          barcode: '',
          variations: [],
          hasVariations: false,
          isActive: true,
          recetaId: n.receta?.id ? String(n.receta.id) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      ];

      const tipoMap: Record<string, 'comprado' | 'elaborado' | 'combo'> = {
        Comprado: 'comprado', comprado: 'comprado',
        Elaborado: 'elaborado', elaborado: 'elaborado',
        Combo: 'combo', combo: 'combo',
      };

      const mappedCombos: Combo[] = data.combos.nodes.map((n) => ({
        id: String(n.producto.id),
        name: n.producto.nombre,
        description: n.producto.descripcion ?? '',
        items: n.detalles.map((d) => ({
          id: String(d.producto.id),
          productId: String(d.producto.id),
          productName: d.producto.nombre,
          productTipo: tipoMap[d.producto.tipo] ?? 'comprado',
          quantity: d.cantidad,
          unitCost: d.producto.precio,
          esOpcional: d.opcional,
        })),
        price: n.producto.precio,
        costoTotal: n.detalles.reduce((s, d) => s + d.producto.precio * d.cantidad, 0),
        availability: n.cantidadProducible,
        image: n.producto.urlImagen ?? undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setProducts(mappedProducts);
      setCombos(mappedCombos);
    } catch (e) {
      toast.error('Error al cargar', e instanceof Error ? e.message : 'No se pudieron cargar los combos.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, afterCursor, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { combos, products, totalCount, isLoading, refresh, endCursor };
}