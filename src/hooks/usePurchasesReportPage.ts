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
    items: OrdenCompraNode[];
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
      // Reporte: pedimos el máximo permitido por página y agregamos si hace
      // falta (en la práctica las compras anuales suelen caber en una sola
      // página con take=200). Evita el walk cursor→cursor del esquema viejo.
      const PAGE_SIZE = 200;
      let items: OrdenCompraNode[] = [];
      let skip = 0;
      let totalCount = Infinity;

      while (items.length < totalCount) {
        const result: OrdenesResponse = await gql<OrdenesResponse>(
          GET_ORDENES_COMPRA,
          { skip, take: PAGE_SIZE },
        );
        items = [...items, ...result.ordenes.items];
        totalCount = result.ordenes.totalCount;
        if (result.ordenes.items.length < PAGE_SIZE) break;
        skip += PAGE_SIZE;
      }

      setAllOrders(items);
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
    const map: Record<string, { display: string; total: number }> = {};
    filteredOrders.forEach(o => {
      if (o.estado?.toLowerCase() === CANCELLED) return;
      const sortKey = format(new Date(o.fecha), 'yyyy-MM');
      const display = format(new Date(o.fecha), 'MMM yyyy', { locale: es });
      if (!map[sortKey]) map[sortKey] = { display, total: 0 };
      map[sortKey].total += o.total;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { display, total }]) => ({ mes: display, total }));
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