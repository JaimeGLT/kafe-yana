import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_REPORTE_CAJA_DIARIO } from '../lib/queries/reports.queries';
import { api } from '../lib/api';
import type { ReporteCajaDiario, CajaDelDia } from '../types/reports';

interface ReporteCajaDiarioResponse {
  reporteCajaDiario: ReporteCajaDiario;
}

export interface UseDailyCashReportReturn {
  data: ReporteCajaDiario | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  downloadPdf: () => Promise<void>;
}

export function useDailyCashReport(fecha: string): UseDailyCashReportReturn {
  const [data, setData] = useState<ReporteCajaDiario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const isoDate = new Date(`${fecha}T12:00:00`).toISOString();
      const res = await gql<ReporteCajaDiarioResponse>(GET_REPORTE_CAJA_DIARIO, {
        fecha: isoDate,
      });
      setData(res.reporteCajaDiario);
    } catch (e) {
      console.error('Error cargando reporte diario de caja:', e);
      setError('No se pudo cargar el reporte diario de caja.');
    } finally {
      setIsLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadPdf = useCallback(async () => {
    try {
      const isoDate = new Date(`${fecha}T12:00:00`).toISOString();
      const blob = await api.getBlob(`/api/Reporte/caja-diario?fecha=${encodeURIComponent(isoDate)}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caja-diario_${fecha}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error descargando PDF:', e);
      throw e;
    }
  }, [fecha]);

  return { data, isLoading, error, refresh: load, downloadPdf };
}

export type { CajaDelDia };
