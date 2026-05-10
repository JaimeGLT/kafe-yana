export interface VentaNode {
  id: number;
  codigo: string;
  fecha: string;
  cliente: string;
  cajero: string;
  productos: number;
  pago: number;
  estado: string;
  subtotal: string;
  total: string;
  detalles: DetalleVentaNode[];
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
  topProducts: VentaTopProduct[];
  topCustomers: VentaTopCustomer[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function getPaymentMethodLabel(pago: number): string {
  switch (pago) {
    case 1: return 'Efectivo';
    case 2: return 'Tarjeta';
    case 3: return 'QR';
    default: return `Método ${pago}`;
  }
}