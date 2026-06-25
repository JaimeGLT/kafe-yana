// Mappers entre el shape de GraphQL (Venta) y la entidad interna del frontend (Sale).
// Vive en pages/sales/ porque solo lo consume el módulo de ventas.

import { esEstadoValidadaSiat } from '../../types/siat';
import type { NotaAjusteResumen } from '../../types/notaAjuste';
import type { Sale } from '../../types';

const mapEstadoToStatus = (estado: string | null): Sale['status'] => {
  const e = (estado ?? '').toLowerCase();
  if (e === 'validada' || e === 'finalizada' || e === 'finalizado') return 'completed';
  if (e === 'anulada' || e === 'reembolsada' || e === 'reembolsado') return 'refunded';
  if (e.startsWith('parcialmente')) return 'partially_refunded';
  return 'completed';
};

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
}

export interface BackendVenta {
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  nombreRazonSocial: string;
  usuario: string;
  estadoSiat: string | null;
  revertidaAnulacion: boolean;
  montoTotalSujetoIva: number | string;
  montoTotal: number | string;
  numeroTarjeta: string | null;
  detalles: BackendVentaDetalle[];
  notasAjuste?: BackendVentaNotaAjuste[] | null;
}

export interface BackendVentasResponse {
  ventas: {
    nodes: BackendVenta[];
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export const mapBackendVentaToSale = (v: BackendVenta): Sale => {
  // numeroFactura llega null en ventas que aún no pasaron por SIAT
  // (o fueron anuladas localmente). Caemos al id interno para que el código
  // visible siga siendo único.
  const codeLabel = `V-${v.numeroFactura ?? v.id}`;
  const monto = Number(v.montoTotal);
  const esTarjeta = v.numeroTarjeta != null && v.numeroTarjeta !== '';

  const paymentMethods: Sale['paymentMethods'] = [];
  if (esTarjeta) {
    paymentMethods.push({ id: `${codeLabel}-card`, type: 'card', name: 'Tarjeta', amount: monto });
  } else {
    paymentMethods.push({ id: `${codeLabel}-cash`, type: 'cash', name: 'Efectivo', amount: monto });
  }

  // ── Notas de ajuste ─────────────────────────────────────────────────────
  // Sólo las que están en estado 'Validada' afectan el saldo efectivo. Las
  // 'Observada' / 'Pendiente' / 'Anulada' se ignoran — si después pasan a
  // 'Validada', basta refrescar para que aparezcan.
  const notasValidas: NotaAjusteResumen[] = (v.notasAjuste ?? [])
    .filter((n) => (n.estadoSiat ?? '').toLowerCase() === 'validada')
    .map((n) => ({
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
    }));
  const montoNotasAjuste = notasValidas.reduce(
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
    items: v.detalles.map((d) => ({
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
    siatAceptada: esEstadoValidadaSiat(v.estadoSiat),
    errorSiat: null,
    numeroFactura: v.numeroFactura,
    revertidaAnulacion: v.revertidaAnulacion === true,

    // Notas de Crédito/Débito (sólo las válidas)
    notasAjuste: notasValidas,
    montoNotasAjuste,

    // Conteo de items 100% devueltos (cantidadDevuelta >= quantity).
    // Útil para mostrar un aviso en la lista y deshabilitar el botón
    // "Emitir Nota" cuando la venta está completamente devuelta.
    itemsAgotados: v.detalles.filter(
      (d) => Number(d.cantidadDevuelta ?? 0) >= d.cantidad,
    ).length,
  };
};
