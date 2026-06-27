// Sales module types

import type { UUID, BaseEntity } from './common';
import type { NotaAjusteResumen } from './notaAjuste';

// Customer
export interface Customer {
  id: string;
  dni?: string;
  nombre: string;
  celular: string;
  correo?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  puntos: number;
  numeroCompras?: number;
  estado: boolean;
  /**
   * País de origen del documento, sólo presente para clientes extranjeros
   * (CEX / PAS). Bolivianos (CI / NIT / OD) lo tienen `undefined`.
   *
   * Se setea automáticamente cuando el cajero selecciona un cliente con
   * `IdPaisOrigen` persistido en BD — el dropdown de país en
   * `DatosFiscalesForm` se autocompleta con este valor.
   */
  paisOrigen?: {
    codigo: number;
    descripcion: string;
  };
}

export interface CustomerInput {
  dni?: number;
  nombre: string;
  celular: string;
  correo?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  estado?: boolean;
}

// Payment Method
export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'credit' | 'mixed' | 'qr';

export interface PaymentMethod {
  id: UUID;
  type: PaymentMethodType;
  name: string;
  amount: number;
  reference?: string;
}

// Refund
export interface RefundItem {
  saleItemId: UUID;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Refund {
  id: UUID;
  type: 'total' | 'partial';
  items: RefundItem[];
  amount: number;
  reason?: string;
  refundedBy: string;
  refundedAt: Date;
}

export interface RefundInput {
  type: 'total' | 'partial';
  items?: { saleItemId: UUID; quantity: number }[];
  reason?: string;
  force?: boolean;
}

// Sale Item
export interface SaleItem {
  id: UUID;
  productId: UUID;
  productName: string;
  productCode: string;
  variationId?: UUID;
  variationName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  isRedeemed?: boolean; // producto pagado con puntos de fidelidad
  ubicacion?: string;

  // ── SIAT (Facturación) ─────────────────────────────────────────────
  /** Id numérico del Detalle_Pago en la BD backend. Necesario para emitir
   *  notas de crédito/débito (cada `DtoNotaAjusteDetalle.IdDetallePagoOriginal`
   *  debe corresponder a una línea real de la venta). */
  idDetallePagoOriginal?: number;
  /** Código SIN del producto, requerido por el XSD de la nota. */
  codigoProductoSin?: number;
  /** Actividad económica declarada en la factura original. */
  actividadEconomica?: string;
  /** Cantidad ya devuelta en notas de ajuste válidas (estado SIAT = Validada).
   *  Se calcula en backend (resolver GraphQL `DetallePago.cantidadDevuelta`)
   *  y se usa para deshabilitar productos agotados y acotar el input del modal.
   *  Default 0 si la venta es nueva. */
  cantidadDevuelta?: number;
}

export interface SaleItemInput {
  productId: UUID;
  variationId?: UUID;
  quantity: number;
  discount?: number;
  notes?: string;
}

// Sale
export interface Sale extends BaseEntity {
  id: UUID;
  code: string;
  date: Date;
  customerId?: UUID;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  taxPercentage: number;
  total: number;
  paymentMethods: PaymentMethod[];
  status: 'completed' | 'refunded' | 'partially_refunded';
  refunds?: Refund[];
  notes?: string;
  cashierId: UUID;
  cashierName?: string;
  branchId: UUID;
  branchName?: string;
  pointsEarned?: number;    // puntos acreditados al cliente al completar
  pointsRedeemed?: number;  // puntos usados por el cliente en esta venta

  // ── SIAT (Facturación) ─────────────────────────────────────────────
  ventaId?: number;             // id numérico de la Venta en backend (para /Facturacion/*)
  estadoSiat?: string | null;   // 'Validada' | 'Observada' | 'Pendiente' | 'Anulada'
  codigoRecepcion?: string | null;
  siatAceptada?: boolean;
  errorSiat?: string | null;
  numeroFactura?: number | null;
  /** CUF (Código Único de Factura) generado por SIAT. Necesario para construir
   *  la URL del QR que se muestra en la preview de la factura. */
  cuf?: string | null;
  /** NIT/CI del cliente (mapea a Venta.NumeroDocumento en backend). */
  nitCliente?: string | null;
  /** True cuando la anulación en SIAT ya fue revertida (operación permitida una sola vez). */
  revertidaAnulacion?: boolean;

  // ── Notas de Crédito/Débito (derivado, TODOS los estados) ──────────
  /** Notas de ajuste SIAT que aplican a esta venta (incluye TODOS los
   *  estados: Validada / Anulada / Pendiente / Observada). Esto permite
   *  que el modal de detalle muestre también las notas anuladas con su
   *  badge "Anulada SIAT" y el botón "Revertir anulación".
   *  El backend las entrega vía el JOIN del resolver GraphQL `ventas`.
   *  Para cálculos monetarios (saldo efectivo, tachado) usar `montoNotasAjuste`,
   *  que ya excluye anuladas. */
  notasAjuste?: NotaAjusteResumen[];
  /** Σ(montoTotalDevuelto) de las notas válidas. Derivado: no se guarda en BD,
   *  lo calcula el mapper a partir de `notasAjuste`. */
  montoNotasAjuste?: number;
  /** Cantidad de líneas de detalle de la venta. Lo expone el backend como
   *  `cantidadProductos` en `GET_VENTAS` (lista) — sin necesidad de cargar
   *  `detalles`. El listado lo usa para el badge "N items". Cuando se carga
   *  el detalle con `GET_VENTA_CON_DETALLES`, `items.length === itemsCount`. */
  itemsCount?: number;
}

export interface SaleInput {
  customerId?: UUID;
  items: SaleItemInput[];
  discount?: number;
  taxPercentage?: number;
  paymentMethods: {
    type: PaymentMethodType;
    amount: number;
    reference?: string;
  }[];
  notes?: string;
}

// Quote
export interface Quote extends BaseEntity {
  id: UUID;
  code: string;
  date: Date;
  validUntil: Date;
  customerId?: UUID;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  convertedToSaleId?: UUID;
}

export interface QuoteInput {
  customerId?: UUID;
  items: SaleItemInput[];
  validUntil: Date;
  discount?: number;
  notes?: string;
}

// Invoice
export interface Invoice extends BaseEntity {
  id: UUID;
  code: string;
  saleId: UUID;
  saleCode?: string;
  date: Date;
  dueDate?: Date;
  customerId?: UUID;
  customerName?: string;
  nit?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: Date;
  notes?: string;
}

// Accounts Receivable
export interface AccountsReceivable extends BaseEntity {
  id: UUID;
  code: string;
  saleId: UUID;
  saleCode?: string;
  customerId: UUID;
  customerName?: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  date: Date;
  dueDate: Date;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  payments: ReceivablePayment[];
}

export interface ReceivablePayment {
  id: UUID;
  date: Date;
  amount: number;
  method: PaymentMethodType;
  reference?: string;
  notes?: string;
}

export interface ReceivablePaymentInput {
  receivableId: UUID;
  amount: number;
  method: PaymentMethodType;
  reference?: string;
  notes?: string;
}

// Sales Stats
export interface SalesStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  totalProductsSold: number;
  averageTicket: number;
  pendingQuotes: number;
  pendingReceivables: number;
}

// Facturación SIAT — los tipos de documento de identidad vienen del backend.
// La fuente es `GET /api/catalogos/tipos-documento-identidad`, consumido vía
// `useTiposDocumentoIdentidad` (ver `lib/queries/catalogos.ts`). No hardcodear
// acá: si el SIN agrega códigos nuevos, aparecen automáticamente después del
// sync diario a las 08:10 BOT.