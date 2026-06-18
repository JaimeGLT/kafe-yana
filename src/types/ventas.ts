export interface VentaNode {
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  nombreRazonSocial: string;
  usuario: string;
  estadoSiat: string | null;
  montoTotalSujetoIva: number | string;
  montoTotal: number | string;
  numeroTarjeta: string | null;
  detalles?: DetalleVentaNode[];
}

export interface DetalleVentaNode {
  id: number;
  id_venta: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subTotal: number | string;
  codigoProducto?: string;
  unidadMedida?: number;
}

export interface VentaFilters {
  fechaEmision?: {
    gte?: string;
    lte?: string;
  };
  estadoSiat?: {
    eq?: string;
  };
}

export interface VentaReportStats {
  totalRevenue: number;
  totalSalesCount: number;
  avgTicket: number;
  unitsSold: number;
}

export interface VentaDailyData {
  fecha: string;
  ingresos: number;
  ventas: number;
}

export interface VentaPaymentData {
  metodo: string;
  total: number;
}

export interface VentaTopProduct {
  name: string;
  revenue: number;
  qty: number;
}

export interface VentaTopCustomer {
  name: string;
  total: number;
  count: number;
}

export type ChartGranularity = 'day' | 'week' | 'month';

export interface UseSalesReportPageReturn {
  stats: VentaReportStats;
  dailySalesData: VentaDailyData[];
  chartGranularity: ChartGranularity;
  paymentMethodData: VentaPaymentData[];
  topProducts: VentaTopProduct[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
