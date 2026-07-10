import { useState, useEffect, useCallback } from 'react';
import { subDays, isSameDay, format } from 'date-fns';
import { gql } from '../lib/graphql';
import { GET_DASHBOARD_DATA } from '../lib/queries/dashboard.queries';
import type { VentaNode } from '../types/ventas';

interface CajaEstadoNode {
  id: number;
  nombre: string;
  abierta: boolean;
  fechaApertura: string;
  fechaCierre: string | null;
  abiertaPor: string;
  cerradaPor: string | null;
  saldoInicial: number;
  totalVentas: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoEsperado: number;
}

interface CajaMovimientoNode {
  id: string;
  fecha: string;
  tipo: string;
  categoria: string;
  monto: number;
  referencia?: string;
}

interface CompradoNode {
  stock_actual: number;
  stock_minimo: number;
  producto: { id: number; nombre: string };
}

interface ElaboradoNode {
  stock_actual: number;
  producible: boolean;
  producto: { id: number; nombre: string };
}

interface DashboardResponse {
  caja: CajaEstadoNode | null;
  cajaMoviminetos: { items: CajaMovimientoNode[] };
  ventas: { items: VentaNode[] };
  comprados: { items: CompradoNode[] };
  elaborados: { items: ElaboradoNode[] };
}

function parseDecimal(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
}

function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  return new Date(value);
}

function countProductos(detalles: VentaNode['detalles']): number {
  return (detalles ?? []).reduce((sum, d) => sum + d.cantidad, 0);
}

export interface DashboardStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  activeProducts: number;
  lowStockProducts: number;
  openRegisters: number;
}

export interface RevenueDataPoint {
  day: string;
  revenue: number;
  expenses: number;
}

export interface SalesDataPoint {
  hour: string;
  sales: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  value: number;
  percentage: number;
}

export interface RecentActivity {
  id: string;
  type: 'sale';
  title: string;
  description: string;
  timestamp: Date;
  amount: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

export interface UseDashboardReturn {
  stats: DashboardStats;
  revenueData: RevenueDataPoint[];
  salesData: SalesDataPoint[];
  topProductsData: TopProduct[];
  recentActivities: RecentActivity[];
  lowStockProducts: LowStockProduct[];
  rawVentas: VentaNode[];
  isLoading: boolean;
  error: string | null;
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats>({
    totalSalesToday: 0,
    totalSalesMonth: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    openRegisters: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [topProductsData, setTopProductsData] = useState<TopProduct[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [rawVentas, setRawVentas] = useState<VentaNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');

      const data = await gql<DashboardResponse>(GET_DASHBOARD_DATA, {
        fechaDesde: new Date(`${monthStart}T00:00:00`).toISOString(),
        fechaHasta: new Date(`${todayStr}T23:59:59`).toISOString(),
      });

      const allSales = data.ventas.items;
      setRawVentas(allSales);
      // Cuenta ventas facturadas (null = sin factura, Validada/Observada = con factura) y
      // excluye solo las anuladas/pendientes de confirmación SIAT.
      const completedSales = allSales.filter(
        (s) => s.estadoSiat == null || s.estadoSiat === 'VALIDADA' || s.estadoSiat === 'OBSERVADA',
      );

      const totalSalesToday = completedSales
        .filter((s) => isSameDay(parseDate(s.fechaEmision), today))
        .reduce((sum, s) => sum + parseDecimal(s.montoTotal), 0);

      const totalSalesMonth = completedSales.reduce((sum, s) => sum + parseDecimal(s.montoTotal), 0);

      const openRegisters = data.caja?.fechaCierre == null ? 1 : 0;

      const lowStockComprados = data.comprados.items.filter(
        (p) => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo,
      ).length;
      const lowStockElaborados = data.elaborados.items.filter(
        (p) => p.stock_actual <= 0,
      ).length;

      setStats({
        totalSalesToday,
        totalSalesMonth,
        activeProducts: data.comprados.items.length + data.elaborados.items.length,
        lowStockProducts: lowStockComprados + lowStockElaborados,
        openRegisters,
      });

      const expensesByDay: Record<string, number> = {};
      data.cajaMoviminetos.items
        .filter((m) => m.tipo === 'Egreso')
        .forEach((m) => {
          const key = parseDate(m.fecha).toISOString().split('T')[0];
          expensesByDay[key] = (expensesByDay[key] ?? 0) + m.monto;
        });

      const revenueDataPoints: RevenueDataPoint[] = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, 6 - i);
        const key = format(date, 'yyyy-MM-dd');
        const dayLabel = format(date, 'EEE', { locale: undefined });

        const revenue = completedSales
          .filter((s) => isSameDay(parseDate(s.fechaEmision), date))
          .reduce((sum, s) => sum + parseDecimal(s.montoTotal), 0);

        const expenses = expensesByDay[key] ?? 0;

        return {
          day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
          revenue,
          expenses,
        };
      });
      setRevenueData(revenueDataPoints);

      const todaySales = completedSales.filter((s) => isSameDay(parseDate(s.fechaEmision), today));
      const salesDataPoints: SalesDataPoint[] = Array.from({ length: 13 }, (_, i) => {
        const hour = 8 + i;
        const hourSales = todaySales.filter((s) => parseDate(s.fechaEmision).getHours() === hour);
        return {
          hour: `${hour}:00`,
          sales: hourSales.reduce((sum, s) => sum + parseDecimal(s.montoTotal), 0),
          orders: hourSales.length,
        };
      });
      setSalesData(salesDataPoints);

      const productMap: Record<string, { name: string; value: number }> = {};
      completedSales.forEach((s) => {
        (s.detalles ?? []).forEach((d) => {
          if (!productMap[d.descripcion]) productMap[d.descripcion] = { name: d.descripcion, value: 0 };
          productMap[d.descripcion].value += d.cantidad;
        });
      });
      const sortedProducts = Object.values(productMap).sort((a, b) => b.value - a.value).slice(0, 5);
      const totalTop = sortedProducts.reduce((s, p) => s + p.value, 0) || 1;
      setTopProductsData(
        sortedProducts.map((p) => ({
          name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
          value: p.value,
          percentage: Math.round((p.value / totalTop) * 100),
        })),
      );

      const recent = [...completedSales]
        .sort((a, b) => parseDate(b.fechaEmision).getTime() - parseDate(a.fechaEmision).getTime())
        .slice(0, 5)
        .map((s) => ({
          id: String(s.id),
          type: 'sale' as const,
          title: `Venta #${s.numeroFactura}`,
          description: `${countProductos(s.detalles)} producto(s)`,
          timestamp: parseDate(s.fechaEmision),
          amount: parseDecimal(s.montoTotal),
        }));
      setRecentActivities(recent);

      const allProducts: LowStockProduct[] = [
        ...data.comprados.items
          .filter((p) => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)
          .map((p) => ({ id: String(p.producto.id), name: p.producto.nombre, stock: p.stock_actual, minStock: p.stock_minimo })),
        ...data.elaborados.items
          .filter((p) => p.stock_actual <= 0)
          .map((p) => ({ id: String(p.producto.id), name: p.producto.nombre, stock: p.stock_actual, minStock: 0 })),
      ];
      setLowStockProducts(allProducts.slice(0, 10));
    } catch (e) {
      console.error('Error loading dashboard:', e);
      setError('No se pudo cargar el dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    stats,
    revenueData,
    salesData,
    topProductsData,
    recentActivities,
    lowStockProducts,
    rawVentas,
    isLoading,
    error,
  };
}
