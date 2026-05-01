import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_COMBOS_WITH_PRODUCTS } from '../lib/queries/combos.queries';
import type { Combo, Product } from '../types';

interface ComboNode {
  producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string };
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

interface CombosPageResponse {
  combos: { nodes: ComboNode[] };
  comprados: { nodes: ProductsNode[] };
  elaborados: { nodes: ProductsNode[] };
}

export interface UseCombosPageReturn {
  combos: Combo[];
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCombosPage(): UseCombosPageReturn {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<CombosPageResponse>(GET_COMBOS_WITH_PRODUCTS);

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
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      setProducts(mappedProducts);
      setCombos(mappedCombos);
    } catch (e) {
      console.error('Error loading combos page:', e);
      setError('No se pudieron cargar los combos.');
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

  return { combos, products, isLoading, error, refresh };
}