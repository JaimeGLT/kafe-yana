import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { gql } from '../lib/graphql';
import { GET_APP_INITIAL_DATA } from '../lib/queries/inventory.queries';
import type { Combo, Product, Receta } from '../types';
import type { Supplier } from '../types/purchases';
import type { Customer } from '../types/sales';

interface AppInitialDataResponse {
  clientes: { nodes: Customer[] };
  proveedores: { nodes: Supplier[] };
  combos: { nodes: Record<string, unknown>[] };
  comprados: { nodes: Record<string, unknown>[] };
  elaborados: { nodes: Record<string, unknown>[] };
  insumos: { nodes: Record<string, unknown>[] };
  categorias: { nodes: { id: number; nombre: string; color: string }[] };
}

interface InventoryContextType {
  combos: Combo[];
  products: Product[];
  recetas: Receta[];
  categorias: { id: string; name: string; color: string }[];
  insumos: Record<string, unknown>[];
  clientes: Customer[];
  proveedores: Supplier[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

function mapComboNode(n: Record<string, unknown>): Combo {
  const producto = n.producto as Record<string, unknown>;
  const detalles = n.detalles as Record<string, unknown>[] | undefined;
  return {
    id: String((producto.id as number) ?? ''),
    name: String(producto.nombre ?? ''),
    description: String(producto.descripcion ?? ''),
    items: (detalles ?? []).map((d, i) => {
      const prod = d.producto as Record<string, unknown>;
      return {
        id: `det-${i}`,
        productId: String(prod.id ?? ''),
        productName: String(prod.nombre ?? ''),
        productTipo: 'comprado' as const,
        quantity: (d.cantidad as number) ?? 1,
        unitCost: 0,
        esOpcional: Boolean(d.opcional),
      };
    }),
    price: (producto.precio as number) ?? 0,
    costoTotal: 0,
    availability: (n.cantidadProducible as number) ?? 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapInsumoNode(n: Record<string, unknown>) {
  return {
    id: String(n.id ?? ''),
    name: String(n.nombre ?? ''),
    categoria: String(n.categoria ?? ''),
    stock_actual: (n.stock_actual as number) ?? 0,
    stock_min: (n.stock_min as number) ?? 0,
    costo: (n.costo as number) ?? 0,
    unidad_min_uso: String(n.unidad_min_uso ?? ''),
    unidad_compra: String(n.unidad_compra ?? ''),
    factor_conversion: (n.factor_conversion as number) ?? 1,
    isActive: true,
  };
}

function mapCompradoNode(n: Record<string, unknown>): Product {
  const producto = n.producto as Record<string, unknown>;
  const categoria = producto.categoria as Record<string, unknown> | undefined;
  return {
    id: String(producto.id ?? ''),
    code: String(producto.id ?? ''),
    name: String(producto.nombre ?? ''),
    description: String(producto.descripcion ?? ''),
    tipo: 'comprado',
    categoryId: String(categoria?.id ?? ''),
    categoryName: String(categoria?.nombre ?? ''),
    unit: '',
    costPrice: (n.costo_compra as number) ?? 0,
    salePrice: (producto.precio as number) ?? 0,
    stock: (n.stock_actual as number) ?? 0,
    minStock: (n.stock_minimo as number) ?? 0,
    maxStock: 0,
    barcode: String(n.codigo_barra ?? ''),
    variations: [],
    hasVariations: false,
    isActive: Boolean(n.disponible),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapElaboradoNode(n: Record<string, unknown>): Product {
  const producto = n.producto as Record<string, unknown>;
  const categoria = producto.categoria as Record<string, unknown> | undefined;
  const variaciones = n.variaciones as Record<string, unknown>[] | undefined;
  return {
    id: String(n.id_Producto ?? ''),
    code: String(n.id_Producto ?? ''),
    name: String(producto.nombre ?? ''),
    description: String(producto.descripcion ?? ''),
    tipo: 'elaborado',
    categoryId: String(categoria?.id ?? ''),
    categoryName: String(categoria?.nombre ?? ''),
    unit: String(n.unidad_medida ?? ''),
    costPrice: 0,
    salePrice: (producto.precio as number) ?? 0,
    stock: (n.stock_actual as number) ?? 0,
    minStock: 0,
    maxStock: 0,
    barcode: '',
    variations: (variaciones ?? []).map((v: Record<string, unknown>) => ({
      id: String(v.id ?? ''),
      name: String(v.nombre ?? ''),
      requerido: Boolean(v.requerido),
      opciones: (v.opciones as Record<string, unknown>[] ?? []).map((o: Record<string, unknown>) => ({
        id: String(o.id ?? ''),
        nombre: String(o.nombre ?? ''),
        ajustePrecio: (o.ajustePrecio as number) ?? 0,
        id_variacion: String(o.id_variacion ?? ''),
      })),
    })) as unknown as Product['variations'],
    hasVariations: (variaciones ?? []).length > 0,
    isActive: Boolean(n.producible),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapRecetaFromElaborado(n: Record<string, unknown>): Receta | null {
  const producto = n.producto as Record<string, unknown>;
  const receta = n.receta as Record<string, unknown> | undefined;
  if (!receta) return null;

  const detalles = receta.detalles as Record<string, unknown>[] | undefined;
  const ingredientes = (detalles ?? []).map((d: Record<string, unknown>) => {
    const insumo = d.insumo as Record<string, unknown>;
    return {
      id: String(d.id_insumo ?? ''),
      insumoId: String(d.id_insumo ?? ''),
      insumoName: String(insumo?.nombre ?? ''),
      unidadMinima: String(insumo?.unidad_min_uso ?? ''),
      quantity: (d.cantidad as number) ?? 0,
      merma: (d.merma as number) ?? 0,
      unitCost: (insumo?.costo as number) ?? 0,
      subtotal: (d.subTotal as number) ?? 0,
    };
  });

  const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);
  const porciones = (receta.porciones as number) > 0 ? (receta.porciones as number) : 1;

  return {
    id: String(receta.id ?? ''),
    productId: String(n.id_Producto ?? ''),
    productName: String(producto?.nombre ?? ''),
    nombre: String(receta.nombre ?? ''),
    porcionesBase: porciones,
    ingredientes,
    costoTotal,
    costoPorPorcion: costoTotal / porciones,
    notas: receta.nota ? String(receta.nota) : undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; name: string; color: string }[]>([]);
  const [insumos, setInsumos] = useState<Record<string, unknown>[]>([]);
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [proveedores, setProveedores] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await gql<AppInitialDataResponse>(GET_APP_INITIAL_DATA);

      setCombos(data.combos.nodes.map(mapComboNode));

      const elaboradosNodes = data.elaborados.nodes;
      setProducts([
        ...data.comprados.nodes.map(mapCompradoNode),
        ...elaboradosNodes.map(mapElaboradoNode),
      ]);

      setRecetas(elaboradosNodes.map(mapRecetaFromElaborado).filter((r): r is Receta => r !== null));

      setInsumos(data.insumos.nodes.map(mapInsumoNode));
      setCategorias(
        data.categorias.nodes.map((c) => ({
          id: String(c.id),
          name: c.nombre,
          color: c.color,
        })),
      );

      setClientes(data.clientes.nodes);
      setProveedores(data.proveedores.nodes);
    } catch (e) {
      console.error('Error loading inventory:', e);
      setError('No se pudo cargar el inventario.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <InventoryContext.Provider value={{ combos, products, recetas, categorias, insumos, clientes, proveedores, isLoading, isRefreshing, error, refresh }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useFullInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useFullInventory must be used within an InventoryProvider');
  }
  return context;
}