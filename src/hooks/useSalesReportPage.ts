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
    nodes: VentaNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
    totalCount: number;
  };
}

function parseDecimal(value: string | number): number {
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
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
        fecha: { gte: fromDate, lte: toDate },
        estado: { eq: 'Finalizada' },
      };

      let allNodes: VentaNode[] = [];
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const data = await gql<VentasResponse>(GET_VENTAS_REPORT, {
          where: filters,
          after: cursor,
        });

        allNodes = [...allNodes, ...data.ventas.nodes];
        hasNextPage = data.ventas.pageInfo.hasNextPage;
        cursor = data.ventas.pageInfo.endCursor;
      }

      const totalRevenue = allNodes.reduce((sum, v) => sum + parseDecimal(v.total), 0);
      const totalSalesCount = allNodes.length;
      const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
      const unitsSold = allNodes.reduce((sum, v) => sum + (v.productos ?? 0), 0);

      setStats({ totalRevenue, totalSalesCount, avgTicket, unitsSold });

      const days = differenceInDays(new Date(dateTo + 'T00:00:00'), new Date(dateFrom + 'T00:00:00'));
      const granularity: ChartGranularity = days <= 31 ? 'day' : days <= 90 ? 'week' : 'month';
      setChartGranularity(granularity);

      const periodMap: Record<string, VentaDailyData> = {};
      allNodes.forEach((v) => {
        const date = new Date(v.fecha);
        let periodKey: string;
        if (granularity === 'day') {
          periodKey = v.fecha.split('T')[0];
        } else if (granularity === 'week') {
          periodKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
          periodKey = format(startOfMonth(date), 'yyyy-MM-dd');
        }
        if (!periodMap[periodKey]) periodMap[periodKey] = { fecha: periodKey, ingresos: 0, ventas: 0 };
        periodMap[periodKey].ingresos += parseDecimal(v.total);
        periodMap[periodKey].ventas += 1;
      });
      setDailySalesData(
        Object.values(periodMap).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      );

      const paymentMap: Record<string, number> = {};
      allNodes.forEach((v) => {
        if (v.pagoEfectivo > 0) paymentMap['Efectivo'] = (paymentMap['Efectivo'] || 0) + parseDecimal(v.pagoEfectivo);
        if (v.pagoTarjeta > 0) paymentMap['Tarjeta'] = (paymentMap['Tarjeta'] || 0) + parseDecimal(v.pagoTarjeta);
        if (v.pagoQr > 0) paymentMap['QR'] = (paymentMap['QR'] || 0) + parseDecimal(v.pagoQr);
      });
      setPaymentMethodData(
        Object.entries(paymentMap).map(([metodo, total]) => ({ metodo, total })),
      );

      const productMap: Record<string, { qty: number; revenue: number }> = {};
      allNodes.forEach((v) => {
        v.detalles?.forEach((d) => {
          if (!productMap[d.nombre]) productMap[d.nombre] = { qty: 0, revenue: 0 };
          productMap[d.nombre].qty += d.cantidad;
          productMap[d.nombre].revenue += parseDecimal(d.total);
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
