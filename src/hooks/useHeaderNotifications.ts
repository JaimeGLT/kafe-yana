import { useState, useCallback, useEffect, useRef } from 'react';
import { gql } from '../lib/graphql';
import { GET_HEADER_NOTIFICATIONS } from '../lib/queries/inventory.queries';
import type { Product } from '../types';

interface InsumoNode {
  id: number;
  nombre: string;
  categoria: string;
  unidad_min_uso: string;
  unidad_compra: string;
  factor_conversion: number;
  costo: number;
  stock_actual: number;
  stock_min: number;
}

interface ProductNode {
  costo_compra: number;
  stock_actual: number;
  disponible: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    categoria: { id: number; nombre: string; color: string } | null;
  };
}

interface ElaboradoNode {
  id_Producto: number;
  stock_actual: number;
  producible: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    categoria: { id: number; nombre: string; color: string } | null;
  };
}

interface HeaderNotificationsResponse {
  comprados: { items: ProductNode[] };
  elaborados: { items: ElaboradoNode[] };
  insumos: { items: InsumoNode[] };
}

export interface HeaderInsumo {
  id: string;
  name: string;
  categoria: string;
  stock_actual: number;
  stock_min: number;
  unidad_compra: string;
  unidad_min_uso: string;
  factor_conversion: number;
}

export interface UseHeaderNotificationsReturn {
  products: Product[];
  insumos: HeaderInsumo[];
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
}

export function useHeaderNotifications(): UseHeaderNotificationsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [insumos, setInsumos] = useState<HeaderInsumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<HeaderNotificationsResponse>(GET_HEADER_NOTIFICATIONS);

      const mappedProducts: Product[] = [
        ...data.comprados.items.map((n) => {
          const cat = n.producto.categoria;
          return {
            id: String(n.producto.id),
            code: String(n.producto.id),
            name: n.producto.nombre,
            description: n.producto.descripcion,
            tipo: 'comprado' as const,
            categoryId: cat ? String(cat.id) : '',
            categoryName: cat ? cat.nombre : '',
            unit: '',
            costPrice: n.costo_compra,
            salePrice: n.producto.precio,
            stock: n.stock_actual,
            minStock: 0,
            maxStock: 0,
            barcode: '',
            variations: [],
            hasVariations: false,
            isActive: Boolean(n.disponible),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
        ...data.elaborados.items.map((n) => {
          const cat = n.producto.categoria;
          return {
            id: String(n.id_Producto),
            code: String(n.id_Producto),
            name: n.producto.nombre,
            description: n.producto.descripcion,
            tipo: 'elaborado' as const,
            categoryId: cat ? String(cat.id) : '',
            categoryName: cat ? cat.nombre : '',
            unit: '',
            costPrice: 0,
            salePrice: n.producto.precio,
            stock: n.stock_actual,
            minStock: 0,
            maxStock: 0,
            barcode: '',
            variations: [],
            hasVariations: false,
            isActive: Boolean(n.producible),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
      ];

      const mappedInsumos: HeaderInsumo[] = data.insumos.items.map((n) => ({
        id: String(n.id),
        name: n.nombre,
        categoria: n.categoria,
        stock_actual: n.stock_actual,
        stock_min: n.stock_min,
        unidad_compra: n.unidad_compra,
        unidad_min_uso: n.unidad_min_uso,
        factor_conversion: n.factor_conversion,
      }));

      setProducts(mappedProducts);
      setInsumos(mappedInsumos);
      setHasLoaded(true);
    } catch (e) {
      console.error('Error loading header notifications:', e);
      setError('No se pudieron cargar los datos de notificaciones.');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return { products, insumos, isLoading, hasLoaded, error, loadNotifications };
}