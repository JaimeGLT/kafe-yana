// Hook para los KPIs del header en Historial de Ventas.
// Llama a `ventasEstadisticas(where)` del backend, que agrega los totales sobre
// TODAS las ventas coincidentes (no sólo la página cargada en la tabla) y respeta
// el mismo `where` que se pasa a la lista. "Hoy" y "Mes" los calcula el backend
// en zona horaria local (La Paz o UTC fallback).

import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_VENTAS_STATS } from '../lib/queries/ventas.queries';
import type { VentaFilters } from '../types/ventas';

export interface VentasEstadisticas {
  totalHoy: number;
  totalMes: number;
  conteoHoy: number;
  conteoMes: number;
  ticketPromedioMes: number;
}

const DEFAULT_STATS: VentasEstadisticas = {
  totalHoy: 0,
  totalMes: 0,
  conteoHoy: 0,
  conteoMes: 0,
  ticketPromedioMes: 0,
};

export interface UseVentasStatsReturn {
  stats: VentasEstadisticas;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/** Sube sólo los campos del `where` que el backend entiende en `VentasEstadisticasFiltroInput`. */
function toStatsWhere(listWhere?: VentaFilters): Record<string, unknown> | undefined {
  if (!listWhere) return undefined;
  const out: Record<string, unknown> = {};
  if (listWhere.fechaEmision?.gte) out.fechaDesde = listWhere.fechaEmision.gte;
  if (listWhere.fechaEmision?.lte) out.fechaHasta = listWhere.fechaEmision.lte;
  if (listWhere.estadoSiat?.eq)    out.estadoSiat  = listWhere.estadoSiat.eq;
  if (listWhere.facturado?.eq !== undefined) out.facturado = listWhere.facturado.eq;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function useVentasStats(where?: VentaFilters): UseVentasStatsReturn {
  const [stats, setStats] = useState<VentasEstadisticas>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const statsWhere = toStatsWhere(where);
      const data = await gql<{ ventasEstadisticas: VentasEstadisticas }>(
        GET_VENTAS_STATS,
        statsWhere ? { where: statsWhere } : {},
      );
      setStats(data.ventasEstadisticas);
    } catch (e) {
      console.error('[useVentasStats] Error cargando estadísticas:', e);
      // Mantenemos los stats anteriores en lugar de quedar en 0 hardcodeados.
    } finally {
      setIsLoading(false);
    }
  }, [where]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, isLoading, refresh };
}