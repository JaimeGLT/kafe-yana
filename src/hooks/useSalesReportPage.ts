import { useState, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import { gql } from '../lib/graphql';
import { GET_VENTAS_REPORT } from '../lib/queries/ventas.queries';
import type {
  VentaNode,
  VentaFilters,
  VentaReportStats,
  VentaDailyData,
  VentaPaymentData,
  UseSalesReportPageReturn,
} from '../types/ventas';
import { normalizePaymentLabel } from '../types/ventas';

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
  const [paymentMethodData, setPaymentMethodData] = useState<VentaPaymentData[]>([]);
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

      const dailyMap: Record<string, VentaDailyData> = {};
      allNodes.forEach((v) => {
        const dayKey = v.fecha.split('T')[0];
        if (!dailyMap[dayKey]) {
          dailyMap[dayKey] = { fecha: dayKey, ingresos: 0, ventas: 0 };
        }
        dailyMap[dayKey].ingresos += parseDecimal(v.total);
        dailyMap[dayKey].ventas += 1;
      });
      setDailySalesData(
        Object.values(dailyMap).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      );

      const paymentMap: Record<string, number> = {};
      allNodes.forEach((v) => {
        const label = normalizePaymentLabel(v.pago);
        paymentMap[label] = (paymentMap[label] || 0) + parseDecimal(v.total);
      });
      setPaymentMethodData(
        Object.entries(paymentMap).map(([metodo, total]) => ({ metodo, total })),
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

  return { stats, dailySalesData, paymentMethodData, isLoading, error, refresh };
}
