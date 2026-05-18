export interface VentaNode {
  codigo: string;
  fecha: string;
  cliente: string;
  cajero: string;
  productos: number;
  estado: string;
  subtotal: string | number;
  total: string | number;
  pagoEfectivo: number;
  pagoTarjeta: number;
  pagoQr: number;
  detalles?: DetalleVentaNode[];
}

export interface DetalleVentaNode {
  nombre: string;
  cantidad: number;
  precio: string;
  total: string;
}

export interface VentaFilters {
  fecha?: {
    gte?: string;
    lte?: string;
  };
  estado?: {
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

