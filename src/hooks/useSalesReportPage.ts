import { useState, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, differenceInDays, format } from 'date-fns';
import { gql } from '../lib/graphql';
import { GET_VENTAS_REPORT } from '../lib/queries/ventas.queries';
import { SIN_CODIGO } from '../lib/mappers/metodosPago';
import type {
  VentaNode,
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

/**
 * Suma los montos por cada código SIN presente en `VentaPagos`. Soporta
 * pagos mixtos (la lista `pagos` tiene una entrada por método). Si no
 * hay líneas, cae a `codigoMetodoPago` único y, en última instancia, a
 * `numeroTarjeta` (legacy) → Efectivo.
 */
function agregarPagosPorCodigo(
  v: VentaNode,
  acumulador: Record<number, number>,
): void {
  const lineas = (v.pagos ?? []).filter((p) => parseDecimal(p.monto) > 0);
  if (lineas.length > 0) {
    lineas.forEach((p) => {
      acumulador[p.codigoMetodoPago] = (acumulador[p.codigoMetodoPago] ?? 0) + parseDecimal(p.monto);
    });
    return;
  }
  const codigo =
    v.codigoMetodoPago ??
    (v.numeroTarjeta != null && v.numeroTarjeta !== '' ? SIN_CODIGO.TARJETA : SIN_CODIGO.EFECTIVO);
  acumulador[codigo] = (acumulador[codigo] ?? 0) + parseDecimal(v.montoTotal);
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

      let allNodes: VentaNode[] = [];
      let skip = 0;
      const pageSize = 200; // MaxTake del backend
      let totalCount = Infinity;

      while (allNodes.length < totalCount) {
        const data = await gql<VentasResponse>(GET_VENTAS_REPORT, {
          fechaDesde: fromDate,
          fechaHasta: toDate,
          skip,
          take: pageSize,
        });

        allNodes = [...allNodes, ...data.ventas.items];
        totalCount = data.ventas.totalCount;
        if (data.ventas.items.length < pageSize) break;
        skip += pageSize;
      }

      // Cuenta ventas facturadas (null = sin factura) y sin facturar; excluye
      // solo anuladas/pendientes de confirmación SIAT.
      allNodes = allNodes.filter(
        (v) => v.estadoSiat == null || v.estadoSiat === 'VALIDADA' || v.estadoSiat === 'OBSERVADA',
      );

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

      const paymentAccum: Record<number, number> = {};
      allNodes.forEach((v) => agregarPagosPorCodigo(v, paymentAccum));

      // Mapea cada código SIN acumulado a su etiqueta legible para el gráfico.
      // Mantener el orden del catálogo SIN para que el render sea estable.
      const labelForCode: Record<number, string> = {
        [SIN_CODIGO.EFECTIVO]: 'Efectivo',
        [SIN_CODIGO.TARJETA]: 'Tarjeta',
        [SIN_CODIGO.OTROS]: 'Otros',
        [SIN_CODIGO.TRANSFERENCIA]: 'QR',
      };
      const paymentEntries = Object.entries(paymentAccum)
        .map(([codigo, total]) => ({
          metodo: labelForCode[Number(codigo)] ?? `Método ${codigo}`,
          total,
        }))
        .sort((a, b) => b.total - a.total);
      setPaymentMethodData(paymentEntries);

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
