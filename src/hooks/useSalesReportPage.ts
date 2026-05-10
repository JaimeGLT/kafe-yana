import { useState, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import { gql } from '../lib/graphql';
import { GET_VENTAS } from '../lib/queries/ventas.queries';
import type {
  VentaNode,
  VentaFilters,
  VentaReportStats,
  VentaDailyData,
  VentaPaymentData,
  VentaTopProduct,
  VentaTopCustomer,
  UseSalesReportPageReturn,
} from '../types/ventas';
import { getPaymentMethodLabel } from '../types/ventas';

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
  const [topProducts, setTopProducts] = useState<VentaTopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<VentaTopCustomer[]>([]);
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
        estado: { eq: 'completed' },
      };

      let allNodes: VentaNode[] = [];
      let cursor: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const data = await gql<VentasResponse>(GET_VENTAS, {
          where: filters,
          after: cursor,
        });

        allNodes = [...allNodes, ...data.ventas.nodes];
        hasNextPage = data.ventas.pageInfo.hasNextPage;
        cursor = data.ventas.pageInfo.endCursor;
      }

      const nodes = allNodes;

      const totalRevenue = nodes.reduce((sum, v) => sum + parseDecimal(v.total), 0);
      const totalSalesCount = nodes.length;
      const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
      const unitsSold = nodes.reduce(
        (sum, v) => sum + v.detalles.reduce((s, d) => s + d.cantidad, 0),
        0,
      );

      setStats({ totalRevenue, totalSalesCount, avgTicket, unitsSold });

      const dailyMap: Record<string, VentaDailyData> = {};
      nodes.forEach((v) => {
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

      const paymentMap: Record<number, number> = {};
      nodes.forEach((v) => {
        paymentMap[v.pago] = (paymentMap[v.pago] || 0) + parseDecimal(v.total);
      });
      setPaymentMethodData(
        Object.entries(paymentMap).map(([pago, total]) => ({
          metodo: getPaymentMethodLabel(parseInt(pago)),
          total,
        })),
      );

      const productMap: Record<string, VentaTopProduct> = {};
      nodes.forEach((v) => {
        v.detalles.forEach((d) => {
          if (!productMap[d.nombre]) {
            productMap[d.nombre] = { name: d.nombre, revenue: 0, qty: 0 };
          }
          productMap[d.nombre].revenue += parseDecimal(d.total);
          productMap[d.nombre].qty += d.cantidad;
        });
      });
      setTopProducts(
        Object.values(productMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
      );

      const customerMap: Record<string, VentaTopCustomer> = {};
      nodes.forEach((v) => {
        const key = v.cliente || '__guest__';
        const name = v.cliente || 'Cliente General';
        if (!customerMap[key]) {
          customerMap[key] = { name, total: 0, count: 0 };
        }
        customerMap[key].total += parseDecimal(v.total);
        customerMap[key].count += 1;
      });
      setTopCustomers(
        Object.values(customerMap)
          .sort((a, b) => b.total - a.total)
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

  return { stats, dailySalesData, paymentMethodData, topProducts, topCustomers, isLoading, error, refresh };
}