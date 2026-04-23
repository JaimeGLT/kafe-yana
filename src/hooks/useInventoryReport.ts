import { useState, useEffect } from 'react';
import { gql } from '../lib/graphql';
import { GET_REPORTE_INVENTARIO } from '../lib/queries/inventory.queries';
import type { ReporteInventarioResponse, InventoryReportItem, ReporteStats, CriticalStockItem, ExpiringItem } from '../types/reports';

export function useInventoryReport() {
  const [items, setItems] = useState<InventoryReportItem[]>([]);
  const [criticalItems, setCriticalItems] = useState<CriticalStockItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [stats, setStats] = useState<ReporteStats>({
    totalProducts: 0,
    totalInsumos: 0,
    lowStockItems: 0,
    totalValue: 0,
  });
  const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    gql<ReporteInventarioResponse>(GET_REPORTE_INVENTARIO)
      .then(data => {
        if (cancelled) return;

        const comprados: InventoryReportItem[] = data.comprados.nodes.map(n => ({
          id: `comprado-${n.producto.id}`,
          code: n.codigo_barra || String(n.producto.id),
          name: n.producto.nombre,
          tipo: 'comprado' as const,
          categoryName: n.producto.categoria?.nombre || 'Sin categoría',
          categoryColor: n.producto.categoria?.color || '#8B4513',
          stock: n.stock_actual,
          minStock: n.stock_minimo,
          costPrice: n.costo_compra,
          available: n.disponible,
        }));

        const elaborados: InventoryReportItem[] = data.elaborados.nodes.map(n => ({
          id: `elaborado-${n.id_Producto}`,
          code: String(n.id_Producto),
          name: n.producto.nombre,
          tipo: 'elaborado' as const,
          categoryName: n.producto.categoria?.nombre || 'Sin categoría',
          categoryColor: n.producto.categoria?.color || '#8B4513',
          stock: n.stock_actual,
          minStock: 0,
          costPrice: 0,
          available: n.producible,
        }));

        const insumos: InventoryReportItem[] = data.insumos.nodes.map(n => ({
          id: `insumo-${n.id}`,
          code: String(n.id),
          name: n.nombre,
          tipo: 'insumo' as const,
          categoryName: n.categoria || 'Sin categoría',
          categoryColor: '#8B4513',
          stock: n.stock_actual,
          minStock: n.stock_min * n.factor_conversion,
          costPrice: n.costo,
          available: true,
          unidad: n.unidad_min_uso,
          factorConversion: n.factor_conversion,
        }));

        const allItems = [...comprados, ...elaborados, ...insumos];
        setItems(allItems);

        const totalProducts = comprados.length + elaborados.length;
        const totalInsumos = insumos.length;

        const insumosCriticos: CriticalStockItem[] = insumos
          .filter(i => i.stock < i.minStock)
          .map(i => ({
            id: i.id,
            name: i.name,
            tipo: 'insumo' as const,
            categoryName: i.categoryName,
            stock: i.stock,
            minStock: i.minStock,
            unidad: i.unidad,
            ratio: i.minStock > 0 ? i.stock / i.minStock : 1,
          }));

        const compradosCriticos: CriticalStockItem[] = comprados
          .filter(i => i.stock < i.minStock)
          .map(i => ({
            id: i.id,
            name: i.name,
            tipo: 'comprado' as const,
            categoryName: i.categoryName,
            stock: i.stock,
            minStock: i.minStock,
            unidad: undefined,
            ratio: i.minStock > 0 ? i.stock / i.minStock : 1,
          }));

        const allCritical = [...insumosCriticos, ...compradosCriticos].sort((a, b) => a.ratio - b.ratio);
        setCriticalItems(allCritical);

        const allLowStockItems = [...comprados, ...insumos].filter(i => i.stock <= i.minStock);
        const lowStockItems = allLowStockItems.length;

        const expiring: ExpiringItem[] = [...comprados, ...insumos]
          .filter(i => i.minStock > 0)
          .map(i => ({
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
          .slice(0, 10);
        setExpiringItems(expiring);

        const valorComprados = comprados.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
        const valorInsumos = insumos.reduce((sum, i) => {
          const stockEnUnidadCompra = i.stock / (i.factorConversion || 1);
          return sum + stockEnUnidadCompra * i.costPrice;
        }, 0);
        const totalValue = valorComprados + valorInsumos;

        setStats({ totalProducts, totalInsumos, lowStockItems, totalValue });

        const catMap: Record<string, { name: string; count: number }> = {};
        [...comprados, ...elaborados].forEach(item => {
          if (!catMap[item.categoryName]) catMap[item.categoryName] = { name: item.categoryName, count: 0 };
          catMap[item.categoryName].count += 1;
        });
        setCategoryData(Object.values(catMap).sort((a, b) => b.count - a.count));

        setIsLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Error al cargar datos');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, stats, categoryData, criticalItems, expiringItems, isLoading, error };
}