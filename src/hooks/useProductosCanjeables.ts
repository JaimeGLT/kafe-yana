import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_PRODUCTOS_CANJEABLES, GET_PRODUCTOS_SELECTOR } from '../lib/queries/fidelizacion.queries';

export type Availability = 'mesas' | 'para_llevar' | 'ambos';
type BackendDisponible = 'Mesas' | 'ParaLlevar' | 'MesasYParaLlevar';

const TO_FRONTEND: Record<string, Availability> = {
  Mesas: 'mesas',
  ParaLlevar: 'para_llevar',
  MesasYParaLlevar: 'ambos',
};

const TO_BACKEND: Record<Availability, BackendDisponible> = {
  mesas: 'Mesas',
  para_llevar: 'ParaLlevar',
  ambos: 'MesasYParaLlevar',
};

export interface CatalogProduct {
  id: number;
  name: string;
  category: string;
  color: string;
}

export interface RedeemableProduct {
  id: number;
  catalogProductId: number;
  catalogProductName: string;
  catalogProductCategory: string;
  catalogProductColor: string;
  pointsCost: number;
  availability: Availability;
  isActive: boolean;
}

interface CanjeableNode {
  id: number;
  id_Producto: number;
  nombreProducto: string;
  categoria: string;
  puntos: number;
  disponible: string;
  activo: boolean;
}

interface CanjeablesResponse {
  productosCanjeables: { items: CanjeableNode[] };
}

interface ProductoBase {
  id: number;
  nombre: string;
  categoria?: { nombre: string; color: string };
}

interface SelectorResponse {
  comprados: { items: { producto: ProductoBase }[] };
  elaborados: { items: { producto: ProductoBase }[] };
  combos: { items: { producto: Omit<ProductoBase, 'categoria'> }[] };
}

export interface ProductoMutationPayload {
  catalogProductId: number;
  pointsCost: number;
  availability: Availability;
  isActive: boolean;
}

export function useProductosCanjeables() {
  const [products, setProducts] = useState<RedeemableProduct[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [canjeables, selector] = await Promise.all([
        gql<CanjeablesResponse>(GET_PRODUCTOS_CANJEABLES),
        gql<SelectorResponse>(GET_PRODUCTOS_SELECTOR),
      ]);

      const seen = new Set<number>();
      const allProducts: CatalogProduct[] = [];

      for (const { producto } of selector.comprados.items) {
        if (!seen.has(producto.id)) {
          seen.add(producto.id);
          allProducts.push({ id: producto.id, name: producto.nombre, category: producto.categoria?.nombre ?? '', color: producto.categoria?.color ?? '' });
        }
      }
      for (const { producto } of selector.elaborados.items) {
        if (!seen.has(producto.id)) {
          seen.add(producto.id);
          allProducts.push({ id: producto.id, name: producto.nombre, category: producto.categoria?.nombre ?? '', color: producto.categoria?.color ?? '' });
        }
      }
      for (const { producto } of selector.combos.items) {
        if (!seen.has(producto.id)) {
          seen.add(producto.id);
          allProducts.push({ id: producto.id, name: producto.nombre, category: 'Combo', color: '#8B5CF6' });
        }
      }

      setCatalog(allProducts);

      const colorById = new Map(allProducts.map((p) => [p.id, p.color]));

      setProducts(
        canjeables.productosCanjeables.items.map((n) => ({
          id: n.id,
          catalogProductId: n.id_Producto,
          catalogProductName: n.nombreProducto,
          catalogProductCategory: n.categoria,
          catalogProductColor: colorById.get(n.id_Producto) ?? '',
          pointsCost: n.puntos,
          availability: TO_FRONTEND[n.disponible] ?? 'ambos',
          isActive: n.activo,
        })),
      );
    } catch (e) {
      console.error('[useProductosCanjeables] load error:', e);
      setError('No se pudieron cargar los productos canjeables.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createProduct = useCallback(
    async (payload: ProductoMutationPayload) => {
      setIsSaving(true);
      try {
        await api.post('/ProductoCanjeable', {
          Id_Producto: payload.catalogProductId,
          Puntos: payload.pointsCost,
          Disponible: TO_BACKEND[payload.availability],
          Activo: payload.isActive,
        });
        await loadData();
      } finally {
        setIsSaving(false);
      }
    },
    [loadData],
  );

  const updateProduct = useCallback(
    async (id: number, payload: ProductoMutationPayload) => {
      setIsSaving(true);
      try {
        await api.put(`/ProductoCanjeable/${id}`, {
          Id_Producto: payload.catalogProductId,
          Puntos: payload.pointsCost,
          Disponible: TO_BACKEND[payload.availability],
          Activo: payload.isActive,
        });
        await loadData();
      } finally {
        setIsSaving(false);
      }
    },
    [loadData],
  );

  const deleteProduct = useCallback(
    async (id: number) => {
      setIsSaving(true);
      try {
        await api.delete(`/ProductoCanjeable/${id}`);
        await loadData();
      } finally {
        setIsSaving(false);
      }
    },
    [loadData],
  );

  return {
    products,
    catalog,
    isLoading,
    error,
    isSaving,
    refresh: loadData,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
