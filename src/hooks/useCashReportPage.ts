import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfDay, endOfDay, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { gql } from '../lib/graphql';
import { GET_CAJA_HISTORIAL } from '../lib/queries/caja.queries';
import type {
  CajaHistorialNode,
  CashReportStats,
  CashDailyData,
  CashCategoryData,
  UseCashReportPageReturn,
} from '../types/cajaHistorial';

interface CajaHistorialResponse {
  cajaHistorial: {
    totalCount: number;
    items: CajaHistorialNode[];
  };
}

export function useCashReportPage(
  dateFrom: string,
  dateTo: string,
): UseCashReportPageReturn {
  const [allSessions, setAllSessions] = useState<CajaHistorialNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gql<CajaHistorialResponse>(GET_CAJA_HISTORIAL);
      setAllSessions(data.cajaHistorial.items);
    } catch (e) {
      console.error('Error loading cash report:', e);
      setError('No se pudo cargar el reporte de caja.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSessions = useMemo(() => {
    const from = startOfDay(new Date(dateFrom + 'T00:00:00'));
    const to = endOfDay(new Date(dateTo + 'T00:00:00'));
    return allSessions.filter(s =>
      isWithinInterval(new Date(s.apertura), { start: from, end: to }),
    );
  }, [allSessions, dateFrom, dateTo]);

  const stats = useMemo<CashReportStats>(() => {
    const totalIngresos = filteredSessions.reduce((sum, s) => sum + s.totalIngresos, 0);
    const totalEgresos = filteredSessions.reduce((sum, s) => sum + Math.abs(s.totalEgresos), 0);
    const totalVentas = filteredSessions.reduce((sum, s) => sum + s.totalVentas, 0);
    return {
      totalIngresos,
      totalEgresos,
      totalVentas,
      balanceNeto: totalIngresos - totalEgresos,
      sesionesCount: filteredSessions.length,
    };
  }, [filteredSessions]);

  const dailyData = useMemo<CashDailyData[]>(() => {
    const map: Record<string, CashDailyData> = {};
    filteredSessions.forEach(s => {
      const key = s.apertura.split('T')[0];
      const label = format(new Date(s.apertura), 'dd MMM', { locale: es });
      if (!map[key]) map[key] = { fecha: label, ingresos: 0, egresos: 0, ventas: 0 };
      map[key].ingresos += s.totalIngresos;
      map[key].egresos += Math.abs(s.totalEgresos);
      map[key].ventas += s.totalVentas;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filteredSessions]);

  const categoryData = useMemo<CashCategoryData[]>(() => {
    const map: Record<string, CashCategoryData> = {};
    filteredSessions.forEach(s => {
      (s.movimientos ?? []).forEach(m => {
        const key = `${m.tipo}__${m.categoria}`;
        if (!map[key]) map[key] = { category: m.categoria, tipo: m.tipo, total: 0, count: 0 };
        map[key].total += Math.abs(m.monto);
        map[key].count += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredSessions]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return { stats, dailyData, categoryData, filteredSessions, isLoading, error, refresh };
}
