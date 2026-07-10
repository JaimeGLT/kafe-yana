import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_COMBOS_WITH_PRODUCTS } from '../lib/queries/combos.queries';
import { toast } from '../components/ui/Toast';
import type { Combo, Product } from '../types';

interface ComboNode {
  producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; urlImagen?: string; codigoSin?: string };
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
  combos: { items: ComboNode[]; totalCount: number };
  comprados: { items: ProductsNode[] };
  elaborados: { items: ElaboradoNode[] };
}

interface UseCombosPageOptions {
  page: number;
  pageSize: number;
  search?: string;
}

export interface UseCombosPageReturn {
  combos: Combo[];
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useCombosPage(options: UseCombosPageOptions): UseCombosPageReturn {
  const { page, pageSize, search } = options;
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const variables: Record<string, unknown> = {
        skip: (page - 1) * pageSize,
        take: pageSize,
        search: search || null,
      };

      const data = await gql<CombosPageResponse>(GET_COMBOS_WITH_PRODUCTS, variables);
      setTotalCount(data.combos.totalCount);

      const mappedProducts: Product[] = [
        ...data.comprados.items.map((n) => ({
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
        ...data.elaborados.items.map((n) => ({
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

      const mappedCombos: Combo[] = data.combos.items.map((n) => ({
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
        codigoSin: n.producto.codigoSin ?? '',
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
  }, [page, pageSize, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { combos, products, totalCount, isLoading, refresh };
}