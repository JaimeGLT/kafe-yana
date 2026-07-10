import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_REPORTE_PRODUCTOS_MENSUAL } from '../lib/queries/reports.queries';
import { api } from '../lib/api';
import type { ReporteProductosMensual } from '../types/reports';

interface ReporteProductosMensualResponse {
  reporteProductosMensual: ReporteProductosMensual;
}

export interface UseMonthlyProductsReportReturn {
  data: ReporteProductosMensual | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  downloadPdf: () => Promise<void>;
}

export function useMonthlyProductsReport(mes: number, anio: number): UseMonthlyProductsReportReturn {
  const [data, setData] = useState<ReporteProductosMensual | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await gql<ReporteProductosMensualResponse>(GET_REPORTE_PRODUCTOS_MENSUAL, {
        mes,
        anio,
      });
      setData(res.reporteProductosMensual);
    } catch (e) {
      console.error('Error cargando reporte mensual de productos:', e);
      setError('No se pudo cargar el reporte mensual de productos.');
    } finally {
      setIsLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadPdf = useCallback(async () => {
    try {
      const blob = await api.getBlob(`/api/Reporte/productos-mensual?mes=${mes}&anio=${anio}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos-mensual_${anio}-${String(mes).padStart(2, '0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error descargando PDF:', e);
      throw e;
    }
  }, [mes, anio]);

  return { data, isLoading, error, refresh: load, downloadPdf };
}
