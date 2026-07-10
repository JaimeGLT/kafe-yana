import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_ELABORADOS_PAGE } from '../lib/queries/elaborados.queries';
import { toast } from '../components/ui/Toast';
import type { Product, Receta, Insumo, ProductDestino } from '../types';

interface ElaboradoNode {
  id_Producto: number;
  stock_actual: number;
  producible: boolean;
  unidad_medida: string;
  ubicacion: string;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    tipo: string;
    urlImagen?: string;
    codigoSin?: string;
    categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null;
  };
  receta: {
    id: number;
    nombre: string;
    nota: string | null;
    cantidadProducible: number;
    porciones: number;
    detalles: Array<{
      id_receta: number;
      id_insumo: number;
      cantidad: number;
      merma: number;
      subTotal: number;
      insumo: {
        id: number;
        nombre: string;
        categoria: string;
        unidad_min_uso: string;
        unidad_compra: string;
        factor_conversion: number;
        costo: number;
        stock_actual: number;
        stock_min: number;
      };
    }>;
  } | null;
}

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

interface CategoriaNode {
  id: number;
  nombre: string;
  color: string;
}

interface ElaboradosPageResponse {
  elaborados: { items: ElaboradoNode[]; totalCount: number };
  // Las side-queries insumos/categorias siguen en cursor-style (no migradas en este PR).
  insumos: { items: InsumoNode[] };
  categorias: { items: CategoriaNode[] };
}

interface UseElaboradosPageOptions {
  page: number;
  pageSize: number;
  search?: string;
}

export interface UseElaboradosPageReturn {
  elaborados: Product[];
  recetas: Receta[];
  insumos: Insumo[];
  categorias: Array<{ id: string; name: string; color: string }>;
  totalCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useElaboradosPage(options: UseElaboradosPageOptions): UseElaboradosPageReturn {
  const { page, pageSize, search } = options;
  const [elaborados, setElaborados] = useState<Product[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<Array<{ id: string; name: string; color: string }>>([]);
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

      const data = await gql<ElaboradosPageResponse>(GET_ELABORADOS_PAGE, variables);
      setTotalCount(data.elaborados.totalCount);

      const mappedElaborados = data.elaborados.items.map((n) => {
        const cat = n.producto.categoria;
        const rawUbicacion = n.ubicacion ?? '';
        const destino: ProductDestino =
          rawUbicacion === 'Barra' ? 'barra'
          : rawUbicacion === 'Cocina' ? 'cocina'
          : 'sin_destino';
        return {
          id: String(n.id_Producto),
          code: String(n.id_Producto),
          name: n.producto.nombre,
          description: n.producto.descripcion,
          codigoSin: n.producto.codigoSin ?? '',
          tipo: 'elaborado' as const,
          categoryId: cat ? String(cat.id) : '',
          categoryName: cat ? cat.nombre : '',
          unit: n.unidad_medida ?? 'unidad',
          costPrice: 0,
          salePrice: n.producto.precio,
          stock: n.stock_actual,
          minStock: 0,
          maxStock: n.receta?.cantidadProducible != null
            ? n.receta.cantidadProducible * (n.receta.porciones ?? 1)
            : 0,
          barcode: '',
          locationId: rawUbicacion || undefined,
          destino,
          image: n.producto.urlImagen ?? undefined,
          variations: [],
          hasVariations: false,
          isActive: Boolean(n.producible),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const mappedInsumos: Insumo[] = data.insumos.items.map((n) => ({
        id: String(n.id),
        code: String(n.id),
        name: n.nombre,
        categoriaInsumo: n.categoria,
        unidadMinima: n.unidad_min_uso,
        unidadCompra: n.unidad_compra,
        factorConversion: n.factor_conversion,
        costoCompra: n.costo,
        costoUnitario: n.factor_conversion > 0 ? n.costo / n.factor_conversion : 0,
        stock: n.stock_actual,
        stockMinimo: n.stock_min,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const mappedRecetas: Receta[] = data.elaborados.items
        .filter((n) => n.receta)
        .map((n) => {
          const receta = n.receta!;
          const ingredientes = receta.detalles.map((d) => ({
            id: String(d.id_insumo),
            insumoId: String(d.id_insumo),
            insumoName: d.insumo.nombre,
            unidadMinima: d.insumo.unidad_min_uso,
            quantity: d.cantidad,
            merma: d.merma,
            unitCost: d.insumo.factor_conversion > 0 ? d.insumo.costo / d.insumo.factor_conversion : 0,
            subtotal: d.subTotal,
          }));
          const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);
          const porciones = receta.porciones > 0 ? receta.porciones : 1;
          return {
            id: String(receta.id),
            productId: String(n.id_Producto),
            productName: n.producto.nombre,
            nombre: receta.nombre,
            porcionesBase: porciones,
            ingredientes,
            costoTotal,
            costoPorPorcion: costoTotal / porciones,
            notas: receta.nota ?? undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

      setElaborados(mappedElaborados as unknown as Product[]);
      setRecetas(mappedRecetas);
      setInsumos(mappedInsumos as unknown as Insumo[]);
      setCategorias(
        data.categorias.items.map((c) => ({
          id: String(c.id),
          name: c.nombre,
          color: c.color,
        })),
      );
    } catch (e) {
      toast.error('Error al cargar', e instanceof Error ? e.message : 'No se pudieron cargar los productos elaborados.');
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

  return {
    elaborados,
    recetas,
    insumos,
    categorias,
    totalCount,
    isLoading,
    refresh,
  };
}

export function mapRecetaFromNode(n: ElaboradoNode): Receta | null {
  if (!n.receta) return null;
  const ingredientes = n.receta.detalles.map((d) => ({
    id: String(d.id_insumo),
    insumoId: String(d.id_insumo),
    insumoName: d.insumo.nombre,
    unidadMinima: d.insumo.unidad_min_uso,
    quantity: d.cantidad,
    merma: d.merma,
    unitCost: d.insumo.factor_conversion > 0 ? d.insumo.costo / d.insumo.factor_conversion : 0,
    subtotal: d.subTotal,
  }));
  const costoTotal = ingredientes.reduce((sum, i) => sum + i.subtotal, 0);
  const porciones = n.receta.porciones > 0 ? n.receta.porciones : 1;
  return {
    id: String(n.receta.id),
    productId: String(n.id_Producto),
    productName: n.producto.nombre,
    nombre: n.receta.nombre,
    porcionesBase: porciones,
    ingredientes,
    costoTotal,
    costoPorPorcion: costoTotal / porciones,
    notas: n.receta.nota ?? undefined,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}