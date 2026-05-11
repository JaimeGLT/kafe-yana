export interface VentaNode {
  id: number;
  codigo: string;
  fecha: string;
  cliente: string;
  cajero: string;
  productos: number;
  pago: string;
  estado: string;
  subtotal: string | number;
  total: string | number;
  detalles?: DetalleVentaNode[];
}

export interface DetalleVentaNode {
  id_venta: number;
  nombre: string;
  cantidad: number;
  precio: string;
  total: string;
  id: number;
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

export interface UseSalesReportPageReturn {
  stats: VentaReportStats;
  dailySalesData: VentaDailyData[];
  paymentMethodData: VentaPaymentData[];
  // topProducts: VentaTopProduct[];     // pendiente
  // topCustomers: VentaTopCustomer[];   // pendiente
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PAYMENT_TEXT: Record<string, string> = {
  '0': 'Efectivo',
  '1': 'Tarjeta',
  '2': 'QR',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  qr: 'QR',
};

export function normalizePaymentLabel(pago: string | number): string {
  const key = String(pago).toLowerCase().trim();
  return PAYMENT_TEXT[key] ?? String(pago);
}
