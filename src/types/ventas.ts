export interface VentaNode {
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  nombreRazonSocial: string;
  usuario: string;
  estadoSiat: string | null;
  montoTotalSujetoIva: number | string;
  montoTotal: number | string;
  numeroTarjeta?: string | null;
  /** Código SIN del método principal (el de mayor monto) persistido en
   * `Venta.CodigoMetodoPago`. Lo emite el SIAT en el XML. */
  codigoMetodoPago?: number | null;
  /** Líneas de pago (`VentaPagos`) para soportar pagos mixtos. */
  pagos?: Array<{ codigoMetodoPago: number; monto: number | string }> | null;
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
  /** Código SIN del producto (requerido por XSD de nota de crédito/débito). */
  codigoProductoSin?: number;
  /** Actividad económica declarada en la factura (requerida por XSD de nota). */
  actividadEconomica?: string;
}

export interface VentaFilters {
  fechaEmision?: {
    gte?: string;
    lte?: string;
  };
  estadoSiat?: {
    eq?: string;
    in?: string[];
  };
  facturado?: {
    eq?: boolean;
  };
  /** Búsqueda por OR — usado para matchear nombre de cliente o usuario. */
  or?: Array<{
    nombreRazonSocial?: { contains?: string };
    usuario?: { contains?: string };
    numeroFactura?: { eq?: number };
  }>;
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
