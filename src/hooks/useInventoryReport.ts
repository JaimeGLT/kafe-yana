import { useMemo } from 'react';
import { useFullInventory } from '../contexts';
import type { InventoryReportItem, ReporteStats, CriticalStockItem, ExpiringItem } from '../types/reports';

export function useInventoryReport() {
  const { products, insumos, isLoading } = useFullInventory();

  const items = useMemo<InventoryReportItem[]>(() => {
    const comprados: InventoryReportItem[] = products
      .filter(p => p.tipo === 'comprado')
      .map(p => ({
        id: `comprado-${p.id}`,
        code: p.barcode || p.code,
        name: p.name,
        tipo: 'comprado' as const,
        categoryName: p.categoryName || 'Sin categoría',
        categoryColor: '#8B4513',
        stock: p.stock,
        minStock: p.minStock,
        costPrice: p.costPrice,
        available: p.isActive,
      }));

    const elaborados: InventoryReportItem[] = products
      .filter(p => p.tipo === 'elaborado')
      .map(p => ({
        id: `elaborado-${p.id}`,
        code: p.code,
        name: p.name,
        tipo: 'elaborado' as const,
        categoryName: p.categoryName || 'Sin categoría',
        categoryColor: '#8B4513',
        stock: p.stock,
        minStock: 0,
        costPrice: 0,
        available: p.isActive,
      }));

    const insumosReport: InventoryReportItem[] = (insumos as any[]).map(n => ({
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

    return [...comprados, ...elaborados, ...insumosReport];
  }, [products, insumos]);

  const stats = useMemo<ReporteStats>(() => {
    const comprados = items.filter(i => i.tipo === 'comprado');
    const elaborados = items.filter(i => i.tipo === 'elaborado');
    const insumosItems = items.filter(i => i.tipo === 'insumo');

    const totalProducts = comprados.length + elaborados.length;
    const totalInsumos = insumosItems.length;
    const lowStockItems = [...comprados, ...insumosItems].filter(i => i.stock <= i.minStock).length;

    const valorComprados = comprados.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
    const valorInsumos = insumosItems.reduce((sum, i) => {
      const stockEnUnidadCompra = i.stock / (i.factorConversion || 1);
      return sum + stockEnUnidadCompra * i.costPrice;
    }, 0);
    const totalValue = valorComprados + valorInsumos;

    return { totalProducts, totalInsumos, lowStockItems, totalValue };
  }, [items]);

  const criticalItems = useMemo<CriticalStockItem[]>(() => {
    const comprados = items.filter(i => i.tipo === 'comprado' && i.stock < i.minStock);
    const insumosItems = items.filter(i => i.tipo === 'insumo' && i.stock < i.minStock);

    return [...insumosItems.map(i => ({
      id: i.id,
      name: i.name,
      tipo: 'insumo' as const,
      categoryName: i.categoryName,
      stock: i.stock,
      minStock: i.minStock,
      unidad: i.unidad,
      ratio: i.minStock > 0 ? i.stock / i.minStock : 1,
    })), ...comprados.map(i => ({
      id: i.id,
      name: i.name,
      tipo: 'comprado' as const,
      categoryName: i.categoryName,
      stock: i.stock,
      minStock: i.minStock,
      unidad: undefined,
      ratio: i.minStock > 0 ? i.stock / i.minStock : 1,
    }))].sort((a, b) => a.ratio - b.ratio);
  }, [items]);

  const expiringItems = useMemo<ExpiringItem[]>(() => {
    return [...items.filter(i => (i.tipo === 'comprado' || i.tipo === 'insumo') && i.minStock > 0)]
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
  }, [items]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, { name: string; count: number }> = {};
    items.filter(i => i.tipo === 'comprado' || i.tipo === 'elaborado').forEach(item => {
      if (!catMap[item.categoryName]) catMap[item.categoryName] = { name: item.categoryName, count: 0 };
      catMap[item.categoryName].count += 1;
    });
    return Object.values(catMap).sort((a, b) => b.count - a.count);
  }, [items]);

  return { items, stats, categoryData, criticalItems, expiringItems, isLoading, error: null };
}