// Mappers entre el shape de GraphQL (Venta) y la entidad interna del frontend (Sale).
// Vive en pages/sales/ porque solo lo consume el módulo de ventas.

import { esEstadoValidadaSiat } from '../../types/siat';
import type { NotaAjusteResumen } from '../../types/notaAjuste';
import type { PaymentMethodType, Sale } from '../../types';
import { sinCodeToPaymentType } from '../../lib/mappers/metodosPago';
import { getPaymentMethodLabel } from '../../utils/formatters';

const mapEstadoToStatus = (estado: string | null): Sale['status'] => {
  const e = (estado ?? '').toLowerCase();
  if (e === 'validada' || e === 'finalizada' || e === 'finalizado') return 'completed';
  if (e === 'anulada' || e === 'reembolsada' || e === 'reembolsado') return 'refunded';
  if (e.startsWith('parcialmente')) return 'partially_refunded';
  return 'completed';
};

/**
 * Nombre legible de un `PaymentMethodType` para mostrar en UI (lista + modal
 * de detalle). Consume directamente los labels ya centralizados en
 * `utils/formatters.ts` para no duplicar strings.
 */
const getPaymentMethodName = (type: PaymentMethodType): string => getPaymentMethodLabel(type);

export interface BackendVentaDetalle {
  id: number;
  id_venta: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subTotal: number | string;
  codigoProducto?: string;
  unidadMedida?: number;
  codigoProductoSin?: number;
  actividadEconomica?: string;
  /**
   * Cantidad ya devuelta en notas de ajuste VÁLIDAS (estado SIAT = Validada).
   * Lo calcula el resolver GraphQL `DetallePago.cantidadDevuelta` en backend.
   * Si no viene (datos legacy, error de schema, etc.) se asume 0.
   */
  cantidadDevuelta?: number | string;
}

export interface BackendVentaNotaAjuste {
  id: number;
  idVenta: number;
  numeroNotaCreditoDebito: number;
  estadoSiat: string | null;
  codigoRecepcion: string | null;
  codigoMotivoAjuste: number;
  fechaEmision: string;
  montoTotalOriginal: number | string;
  montoTotalDevuelto: number | string;
  montoEfectivoCreditoDebito: number | string;
  cuf?: string | null;
  revertidaAnulacion?: boolean | null;
}

export interface BackendVenta {
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  nombreRazonSocial: string;
  usuario: string;
  estadoSiat: string | null;
  /** `Venta.Facturado` en backend: false mientras la venta nunca fue confirmada
   * por el SIAT (aunque haya tenido intentos rechazados). Se usa para decidir
   * si el modal de detalle ofrece "Facturar" (editable) o "Reenviar al SIAT". */
  facturado: boolean;
  revertidaAnulacion: boolean;
  montoTotalSujetoIva: number | string;
  montoTotal: number | string;
  numeroTarjeta?: string | null;
  /**
   * Código SIN del método de pago principal (el de mayor monto) que el backend
   * persiste en `Venta.CodigoMetodoPago`. Lo emite el SIAT en el XML y se usa
   * como respaldo cuando `pagos` no está disponible.
   */
  codigoMetodoPago?: number | null;
  /**
   * Líneas de pago individuales (`VentaPagos.CodigoMetodoPago` + `Monto`).
   * Permite representar pagos mixtos (ej: 50 Bs efectivo + 30 Bs QR) sin
   * perder la granularidad. Sólo la emite la lista si el query lo pide.
   */
  pagos?: Array<{ codigoMetodoPago: number; monto: number | string }> | null;
  cuf?: string | null;
  numeroDocumento?: string | null;
  complemento?: string | null;
  codigoTipoDocumentoIdentidad?: number | null;
  /**
   * Cantidad de líneas de detalle. Lo expone el backend como campo derivado
   * (`Detalles.Count`) y siempre viene en la respuesta. Se usa en la lista
   * para mostrar el badge "N items" sin cargar las líneas completas.
   */
  cantidadProductos: number;
  /**
   * Leyenda obligatoria del CUFD vigente, persistida en `Venta.Leyenda` por
   * el SIAT preparer. Se imprime al pie de la factura. Si la venta aún no
   * pasó por SIAT (sin facturar) viene `undefined`.
   */
  leyenda?: string | null;
  /**
   * Líneas de detalle completas. Sólo las trae `GET_VENTA_CON_DETALLES`
   * (modal de detalle). En la lista (`GET_VENTAS`) viene `undefined` —
   * usamos `itemsCount` en su lugar.
   */
  detalles?: BackendVentaDetalle[];
  notasAjuste?: BackendVentaNotaAjuste[] | null;
}

export interface BackendVentasResponse {
  ventas: {
    items: BackendVenta[];
    totalCount: number;
  };
}

export const mapBackendVentaToSale = (v: BackendVenta): Sale => {
  // numeroFactura llega null en ventas que aún no pasaron por SIAT
  // (o fueron anuladas localmente). Caemos al id interno para que el código
  // visible siga siendo único.
  const codeLabel = `V-${v.numeroFactura ?? v.id}`;
  const monto = Number(v.montoTotal);

  // ── Métodos de pago ──────────────────────────────────────────────────
  // Fuente de verdad: `VentaPagos` (cada línea con su método y monto). Permite
  // reflejar pagos mixtos (ej: 50 Bs efectivo + 30 Bs QR) sin perder
  // granularidad. Si el query no trajo `pagos`, caemos a `CodigoMetodoPago`
  // único (el de mayor monto, que es lo que se emite al SIAT); como última
  // defensa histórica mantenemos el fallback por `numeroTarjeta` (siempre
  // null en producción desde que se centralizó en `CodigoMetodoPago`).
  const buildPaymentMethod = (
    type: PaymentMethodType,
    amount: number,
    suffix: string,
  ): Sale['paymentMethods'][number] => ({
    id: `${codeLabel}-${suffix}`,
    type,
    name: getPaymentMethodName(type),
    amount,
  });

  const pagosLines = (v.pagos ?? []).filter(
    (p) => Number(p.monto) > 0,
  );

  let paymentMethods: Sale['paymentMethods'];
  if (pagosLines.length > 0) {
    paymentMethods = pagosLines.map((p, idx) => {
      const tipo = sinCodeToPaymentType(p.codigoMetodoPago);
      return buildPaymentMethod(tipo, Number(p.monto), `${tipo}-${idx}`);
    });
  } else if (v.codigoMetodoPago != null) {
    const tipo = sinCodeToPaymentType(v.codigoMetodoPago);
    paymentMethods = [buildPaymentMethod(tipo, monto, tipo)];
  } else if (v.numeroTarjeta != null && v.numeroTarjeta !== '') {
    paymentMethods = [buildPaymentMethod('card', monto, 'card')];
  } else {
    paymentMethods = [buildPaymentMethod('cash', monto, 'cash')];
  }

  // ── Notas de ajuste ─────────────────────────────────────────────────────
  // Devolvemos TODAS las notas (Validada / Anulada / Observada / Pendiente)
  // para que el modal de detalle pueda:
  //   • Mostrar el badge "Anulada SIAT" + botón "Revertir anulación" en las
  //     notas anuladas (necesario desde que se implementó reversión).
  //   • Mantener la coherencia visual: la lista del modal muestra la historia
  //     completa de la venta.
  // Para el cálculo monetario (saldo efectivo, tachado, barra lateral de la
  // tabla) SÓLO cuentan las notas Validada — una nota anulada no representa
  // dinero efectivamente devuelto. Por eso derivamos `notasValidadas` aparte.
  const mapNota = (n: BackendVentaNotaAjuste): NotaAjusteResumen => ({
    id: n.id,
    idVenta: n.idVenta,
    numeroNotaCreditoDebito: n.numeroNotaCreditoDebito,
    estadoSiat: n.estadoSiat,
    codigoRecepcion: n.codigoRecepcion,
    codigoMotivoAjuste: n.codigoMotivoAjuste,
    fechaEmision: n.fechaEmision,
    montoTotalOriginal: Number(n.montoTotalOriginal),
    montoTotalDevuelto: Number(n.montoTotalDevuelto),
    montoEfectivoCreditoDebito: Number(n.montoEfectivoCreditoDebito),
    cuf: n.cuf ?? null,
    revertidaAnulacion: n.revertidaAnulacion === true,
  });

  const todasNotas: NotaAjusteResumen[] = (v.notasAjuste ?? []).map(mapNota);
  const notasValidadas: NotaAjusteResumen[] = todasNotas.filter(
    (n) => (n.estadoSiat ?? '').toLowerCase() === 'validada',
  );
  const montoNotasAjuste = notasValidadas.reduce(
    (acc, n) => acc + (Number.isFinite(n.montoTotalDevuelto) ? n.montoTotalDevuelto : 0),
    0,
  );

  return {
    id: String(v.id),
    code: codeLabel,
    date: new Date(v.fechaEmision),
    customerId: undefined,
    customerName: v.nombreRazonSocial || undefined,
    cashierId: '',
    cashierName: v.usuario,
    branchId: '',
    branchName: '',
    status: mapEstadoToStatus(v.estadoSiat),
    subtotal: Number(v.montoTotalSujetoIva),
    discount: 0,
    tax: 0,
    taxPercentage: 18,
    total: monto,
    paymentMethods,
    // Items: la lista (`GET_VENTAS`) NO trae `detalles` para mantener el
    // payload liviano — `items` queda vacío y `itemsCount` lleva la cuenta.
    // El modal dispara `GET_VENTA_CON_DETALLES` (on-demand) y re-mappea la
    // venta con `detalles` poblados.
    items: (v.detalles ?? []).map((d) => ({
      // Antes se inventaba un id sintético `${codeLabel}-${i}`, lo que rompía
      // cualquier flujo que necesitara el `Detalle_Pago.Id` real (notas de
      // ajuste SIAT). Ahora se usa el id numérico de BD como string (la
      // property `id: UUID` exige string, pero el contenido es el PK real).
      id: String(d.id),
      productId: d.codigoProducto ?? '',
      productCode: d.codigoProducto ?? '',
      productName: d.descripcion,
      quantity: d.cantidad,
      unit: d.unidadMedida != null ? String(d.unidadMedida) : 'unidad',
      unitPrice: Number(d.precioUnitario),
      discount: 0,
      subtotal: Number(d.subTotal),
      tax: 0,
      total: Number(d.subTotal),

      // SIAT (necesarios para emitir notas de crédito/débito)
      idDetallePagoOriginal: d.id,
      codigoProductoSin: d.codigoProductoSin,
      actividadEconomica: d.actividadEconomica,

      // Cantidad ya devuelta en notas válidas (GraphQL backend).
      // Defensivo: si no viene (legacy), se asume 0.
      cantidadDevuelta: Number(d.cantidadDevuelta ?? 0),
    })),
    pointsEarned: undefined,
    pointsRedeemed: undefined,
    notes: undefined,
    refunds: [],
    createdAt: new Date(v.fechaEmision),
    updatedAt: new Date(v.fechaEmision),

    // SIAT
    ventaId: v.id,
    estadoSiat: v.estadoSiat,
    facturado: v.facturado,
    siatAceptada: esEstadoValidadaSiat(v.estadoSiat),
    errorSiat: null,
    numeroFactura: v.numeroFactura,
    cuf: v.cuf ?? null,
    nitCliente: v.numeroDocumento ?? null,
    complemento: v.complemento ?? null,
    codigoTipoDocumentoIdentidad: v.codigoTipoDocumentoIdentidad ?? null,
    revertidaAnulacion: v.revertidaAnulacion === true,

    // Notas de Crédito/Débito (TODAS — el modal filtra por estado al renderizar;
    // `montoNotasAjuste` ya excluye anuladas para no distorsionar el saldo).
    notasAjuste: todasNotas,
    montoNotasAjuste,

    // Conteo de líneas de detalle. Lo usa el badge "N items" del listado.
    // Preferimos `detalles.length` (local, siempre presente desde que la
    // query `GET_VENTAS` lo incluye). Si por alguna razón no viniera,
    // caemos al campo derivado `cantidadProductos` del backend.
    itemsCount: (v.detalles ?? []).length || v.cantidadProductos,

    // Leyenda obligatoria del CUFD — al pie de la factura.
    leyenda: v.leyenda ?? null,
  };
};
