// Mappers entre el shape de GraphQL (Venta) y la entidad interna del frontend (Sale).
// Vive en pages/sales/ porque solo lo consume el módulo de ventas.

import { esEstadoValidadaSiat } from '../../types/siat';
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
  };
};
