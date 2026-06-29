import { useState, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, differenceInDays, format } from 'date-fns';
import { gql } from '../lib/graphql';
import { GET_VENTAS_REPORT } from '../lib/queries/ventas.queries';
import type {
  VentaNode,
  VentaFilters,
  VentaReportStats,
  VentaDailyData,
  VentaPaymentData,
  VentaTopProduct,
  ChartGranularity,
  UseSalesReportPageReturn,
} from '../types/ventas';

interface VentasResponse {
  ventas: {
    items: VentaNode[];
    totalCount: number;
  };
}

function parseDecimal(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
}

function countProductos(detalles: VentaNode['detalles']): number {
  return (detalles ?? []).reduce((sum, d) => sum + d.cantidad, 0);
}

function pagoMetodo(v: VentaNode): { efectivo: number; tarjeta: number; qr: number } {
  const total = parseDecimal(v.montoTotal);
  const esTarjeta = v.numeroTarjeta != null && v.numeroTarjeta !== '';
  return {
    efectivo: esTarjeta ? 0 : total,
    tarjeta: esTarjeta ? total : 0,
    qr: 0,
  };
}

export function useSalesReportPage(
  dateFrom: string,
  dateTo: string,
): UseSalesReportPageReturn {
  const [stats, setStats] = useState<VentaReportStats>({
    totalRevenue: 0,
    totalSalesCount: 0,
    avgTicket: 0,
    unitsSold: 0,
  });
  const [dailySalesData, setDailySalesData] = useState<VentaDailyData[]>([]);
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const [paymentMethodData, setPaymentMethodData] = useState<VentaPaymentData[]>([]);
  const [topProducts, setTopProducts] = useState<VentaTopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fromDate = startOfDay(new Date(dateFrom + 'T00:00:00')).toISOString();
      const toDate = endOfDay(new Date(dateTo + 'T00:00:00')).toISOString();

      const filters: VentaFilters = {
        fechaEmision: { gte: fromDate, lte: toDate },
        estadoSiat: { eq: 'VALIDADA' },
      };

      let allNodes: VentaNode[] = [];
      let skip = 0;
      const pageSize = 200; // MaxTake del backend
      let totalCount = Infinity;

      while (allNodes.length < totalCount) {
        const data = await gql<VentasResponse>(GET_VENTAS_REPORT, {
          where: filters,
          skip,
          take: pageSize,
        });

        allNodes = [...allNodes, ...data.ventas.items];
        totalCount = data.ventas.totalCount;
        if (data.ventas.items.length < pageSize) break;
        skip += pageSize;
      }

      const totalRevenue = allNodes.reduce((sum, v) => sum + parseDecimal(v.montoTotal), 0);
      const totalSalesCount = allNodes.length;
      const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
      const unitsSold = allNodes.reduce((sum, v) => sum + countProductos(v.detalles), 0);

      setStats({ totalRevenue, totalSalesCount, avgTicket, unitsSold });

      const days = differenceInDays(new Date(dateTo + 'T00:00:00'), new Date(dateFrom + 'T00:00:00'));
      const granularity: ChartGranularity = days <= 31 ? 'day' : days <= 90 ? 'week' : 'month';
      setChartGranularity(granularity);

      const periodMap: Record<string, VentaDailyData> = {};
      allNodes.forEach((v) => {
        const date = new Date(v.fechaEmision);
        let periodKey: string;
        if (granularity === 'day') {
          periodKey = v.fechaEmision.split('T')[0];
        } else if (granularity === 'week') {
          periodKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
          periodKey = format(startOfMonth(date), 'yyyy-MM-dd');
        }
        if (!periodMap[periodKey]) periodMap[periodKey] = { fecha: periodKey, ingresos: 0, ventas: 0 };
        periodMap[periodKey].ingresos += parseDecimal(v.montoTotal);
        periodMap[periodKey].ventas += 1;
      });
      setDailySalesData(
        Object.values(periodMap).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      );

      const paymentMap: Record<string, number> = {};
      allNodes.forEach((v) => {
        const p = pagoMetodo(v);
        if (p.efectivo > 0) paymentMap['Efectivo'] = (paymentMap['Efectivo'] || 0) + p.efectivo;
        if (p.tarjeta > 0) paymentMap['Tarjeta'] = (paymentMap['Tarjeta'] || 0) + p.tarjeta;
        if (p.qr > 0) paymentMap['QR'] = (paymentMap['QR'] || 0) + p.qr;
      });
      setPaymentMethodData(
        Object.entries(paymentMap).map(([metodo, total]) => ({ metodo, total })),
      );

      const productMap: Record<string, { qty: number; revenue: number }> = {};
      allNodes.forEach((v) => {
        v.detalles?.forEach((d) => {
          if (!productMap[d.descripcion]) productMap[d.descripcion] = { qty: 0, revenue: 0 };
          productMap[d.descripcion].qty += d.cantidad;
          productMap[d.descripcion].revenue += parseDecimal(d.subTotal);
        });
      });
      setTopProducts(
        Object.entries(productMap)
          .map(([name, { qty, revenue }]) => ({ name, qty, revenue }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10),
      );
    } catch (e) {
      console.error('Error loading sales report:', e);
      setError('No se pudo cargar el reporte de ventas.');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { stats, dailySalesData, chartGranularity, paymentMethodData, topProducts, isLoading, error, refresh };
}
