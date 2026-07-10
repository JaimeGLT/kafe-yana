import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_REPORTE_INVENTARIO } from '../lib/queries/inventory.queries';
import type { InventoryReportItem, ReporteStats, CriticalStockItem, ExpiringItem } from '../types/reports';

interface CategoriaNode {
  id: number;
  nombre: string;
  color: string;
}

interface InsumoNode {
  id: number;
  nombre: string;
  categoria: string;
  stock_actual: number;
  stock_min: number;
  costo: number;
  unidad_min_uso: string;
  unidad_compra: string;
  factor_conversion: number;
}

interface CompradoNode {
  codigo_barra: string;
  stock_actual: number;
  stock_minimo: number;
  costo_compra: number;
  disponible: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: { id: number; nombre: string; color: string } | null;
  };
}

interface ElaboradoNode {
  id_Producto: number;
  stock_actual: number;
  producible: boolean;
  unidad_medida: string;
  producto: {
    id: number;
    nombre: string;
    categoria: { nombre: string; color: string } | null;
  };
}

interface InventarioReportResponse {
  comprados: { items: CompradoNode[] };
  elaborados: { items: ElaboradoNode[] };
  insumos: { items: InsumoNode[] };
  categorias: { nodes: CategoriaNode[] };
}

export interface UseInventoryReportPageReturn {
  items: InventoryReportItem[];
  stats: ReporteStats;
  categoryData: Array<{ name: string; count: number }>;
  criticalItems: CriticalStockItem[];
  expiringItems: ExpiringItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useInventoryReportPage(): UseInventoryReportPageReturn {
  const [items, setItems] = useState<InventoryReportItem[]>([]);
  const [stats, setStats] = useState<ReporteStats>({ totalProducts: 0, totalInsumos: 0, lowStockItems: 0, totalValue: 0 });
  const [categoryData, setCategoryData] = useState<Array<{ name: string; count: number }>>([]);
  const [criticalItems, setCriticalItems] = useState<CriticalStockItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<InventarioReportResponse>(GET_REPORTE_INVENTARIO);

      const comprados: InventoryReportItem[] = data.comprados.items.map((n) => {
        const cat = n.producto.categoria;
        return {
          id: `comprado-${n.producto.id}`,
          code: n.codigo_barra || String(n.producto.id),
          name: n.producto.nombre,
          tipo: 'comprado' as const,
          categoryName: cat?.nombre || 'Sin categoría',
          categoryColor: cat?.color || '#8B4513',
          stock: n.stock_actual,
          minStock: n.stock_minimo,
          costPrice: n.costo_compra,
          available: Boolean(n.disponible),
        };
      });

      const elaborados: InventoryReportItem[] = data.elaborados.items.map((n) => {
        const cat = n.producto.categoria;
        return {
          id: `elaborado-${n.id_Producto}`,
          code: String(n.id_Producto),
          name: n.producto.nombre,
          tipo: 'elaborado' as const,
          categoryName: cat?.nombre || 'Sin categoría',
          categoryColor: cat?.color || '#8B4513',
          stock: n.stock_actual,
          minStock: 0,
          costPrice: 0,
          available: Boolean(n.producible),
        };
      });

      const insumosReport: InventoryReportItem[] = data.insumos.items.map((n) => ({
        id: `insumo-${n.id}`,
        code: String(n.id),
        name: n.nombre,
        tipo: 'insumo' as const,
        categoryName: n.categoria || 'Sin categoría',
        categoryColor: '#8B4513',
        stock: n.stock_actual,
        minStock: n.stock_min,
        costPrice: n.costo,
        available: true,
        unidad: n.unidad_min_uso,
        factorConversion: n.factor_conversion,
      }));

      const allItems: InventoryReportItem[] = [...comprados, ...elaborados, ...insumosReport];
      setItems(allItems);

      const totalProducts = comprados.length + elaborados.length;
      const totalInsumos = insumosReport.length;
      const lowStockItems = [...comprados, ...insumosReport].filter((i) => i.stock <= i.minStock).length;

      const valorComprados = comprados.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
      const valorInsumos = insumosReport.reduce((sum, i) => {
        const stockEnUnidadCompra = i.stock / (i.factorConversion || 1);
        return sum + stockEnUnidadCompra * i.costPrice;
      }, 0);
      const totalValue = valorComprados + valorInsumos;

      setStats({ totalProducts, totalInsumos, lowStockItems, totalValue });

      const catMap: Record<string, { name: string; count: number }> = {};
      allItems
        .filter((i) => i.tipo === 'comprado' || i.tipo === 'elaborado')
        .forEach((item) => {
          if (!catMap[item.categoryName]) catMap[item.categoryName] = { name: item.categoryName, count: 0 };
          catMap[item.categoryName].count += 1;
        });
      setCategoryData(Object.values(catMap).sort((a, b) => b.count - a.count));

      const compradosCriticos = comprados.filter((i) => i.stock < i.minStock);
      const insumosCriticos = insumosReport.filter((i) => i.stock < i.minStock);

      setCriticalItems(
        [...insumosCriticos.map((i) => ({
          id: i.id,
          name: i.name,
          tipo: 'insumo' as const,
          categoryName: i.categoryName,
          stock: i.stock,
          minStock: i.minStock,
          unidad: i.unidad,
          ratio: i.minStock > 0 ? i.stock / i.minStock : 1,
        })), ...compradosCriticos.map((i) => ({
          id: i.id,
          name: i.name,
          tipo: 'comprado' as const,
          categoryName: i.categoryName,
          stock: i.stock,
          minStock: i.minStock,
          unidad: undefined,
          ratio: i.minStock > 0 ? i.stock / i.minStock : 1,
        }))].sort((a, b) => a.ratio - b.ratio),
      );

      setExpiringItems(
        allItems
          .filter((i) => (i.tipo === 'comprado' || i.tipo === 'insumo') && i.minStock > 0)
          .map((i) => ({
            id: i.id,
            name: i.name,
            tipo: i.tipo as 'comprado' | 'insumo',
            categoryName: i.categoryName,
            stock: i.stock,
            minStock: i.minStock,
            unidad: i.unidad,
            ratio: i.stock / i.minStock,
          }))
          .sort((a, b) => a.ratio - b.ratio)
          .slice(0, 10),
      );
    } catch (e) {
      console.error('Error loading inventory report:', e);
      setError('No se pudo cargar el reporte de inventario.');
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

  return { items, stats, categoryData, criticalItems, expiringItems, isLoading, error, refresh };
}