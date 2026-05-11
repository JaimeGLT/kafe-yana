import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { gql } from '../lib/graphql';
import { GET_ORDENES_COMPRA } from '../lib/queries/compras.queries';
import type {
  OrdenCompraNode,
  PurchasesReportStats,
  PurchasesMonthlyData,
  PurchasesSupplierData,
  UsePurchasesReportPageReturn,
} from '../types/ordenesCompra';

interface OrdenesResponse {
  ordenes: {
    nodes: OrdenCompraNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    totalCount: number;
  };
}

const CANCELLED = 'cancelado';

export function usePurchasesReportPage(
  dateFrom: string,
  dateTo: string,
): UsePurchasesReportPageReturn {
  const [allOrders, setAllOrders] = useState<OrdenCompraNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let nodes: OrdenCompraNode[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;

      while (hasNextPage) {
        const result: OrdenesResponse = await gql<OrdenesResponse>(
          GET_ORDENES_COMPRA,
          cursor ? { first: 50, after: cursor } : { first: 50 },
        );
        nodes = [...nodes, ...result.ordenes.nodes];
        hasNextPage = result.ordenes.pageInfo.hasNextPage;
        cursor = result.ordenes.pageInfo.endCursor;
      }

      setAllOrders(nodes);
    } catch (e) {
      console.error('Error loading purchases report:', e);
      setError('No se pudo cargar el reporte de compras.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const from = startOfDay(new Date(dateFrom + 'T00:00:00'));
    const to = endOfDay(new Date(dateTo + 'T00:00:00'));
    return allOrders.filter(o =>
      isWithinInterval(new Date(o.fecha), { start: from, end: to }),
    );
  }, [allOrders, dateFrom, dateTo]);

  const stats = useMemo<PurchasesReportStats>(() => {
    const active = filteredOrders.filter(
      o => o.estado?.toLowerCase() !== CANCELLED,
    );
    const totalValue = active.reduce((sum, o) => sum + o.total, 0);
    const pendingCount = filteredOrders.filter(
      o => o.estado?.toLowerCase() === 'pendiente',
    ).length;
    const uniqueSuppliers = new Set(filteredOrders.map(o => o.id_Proveedor)).size;
    return { totalValue, totalOrders: filteredOrders.length, pendingCount, uniqueSuppliers };
  }, [filteredOrders]);

  const monthlyData = useMemo<PurchasesMonthlyData[]>(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach(o => {
      if (o.estado?.toLowerCase() === CANCELLED) return;
      const key = format(new Date(o.fecha), 'MMM yyyy', { locale: es });
      map[key] = (map[key] || 0) + o.total;
    });
    return Object.entries(map).map(([mes, total]) => ({ mes, total }));
  }, [filteredOrders]);

  const topSuppliers = useMemo<PurchasesSupplierData[]>(() => {
    const map: Record<number, PurchasesSupplierData> = {};
    filteredOrders.forEach(o => {
      if (o.estado?.toLowerCase() === CANCELLED) return;
      if (!map[o.id_Proveedor]) {
        map[o.id_Proveedor] = { name: o.nombre_Proveedor, total: 0, count: 0 };
      }
      map[o.id_Proveedor].total += o.total;
      map[o.id_Proveedor].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredOrders]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { stats, monthlyData, topSuppliers, filteredOrders, isLoading, error, refresh };
}
