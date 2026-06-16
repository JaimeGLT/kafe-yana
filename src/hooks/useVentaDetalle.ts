import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_VENTA_DETALLE } from '../lib/queries/dashboard.queries';
import { esEstadoValidadaSiat } from '../types/siat';
import type { Sale } from '../types';

interface DetalleVentaNode {
  id: number;
  id_venta: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subTotal: number | string;
  codigoProducto?: string;
  unidadMedida?: number;
}

interface BackendVenta {
  id: number;
  numeroFactura: number;
  fechaEmision: string;
  nombreRazonSocial: string;
  usuario: string;
  estadoSiat: string;
  montoTotalSujetoIva: number | string;
  montoTotal: number | string;
  numeroTarjeta: string | null;
  detalles?: DetalleVentaNode[];
}

interface VentasDetalleResponse {
  ventas: {
    nodes: BackendVenta[];
  };
}

function parseDecimal(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value) || 0;
}

function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  return new Date(value);
}

function mapEstadoToStatus(estado: string): Sale['status'] {
  const e = estado.toLowerCase();
  if (e === 'validada' || e === 'finalizada' || e === 'finalizado') return 'completed';
  if (e === 'anulada' || e === 'reembolsada' || e === 'reembolsado') return 'refunded';
  return 'completed';
}

export function useVentaDetalle(saleId: string | null): {
  sale: Sale | null;
  isLoading: boolean;
  error: string | null;
} {
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVenta = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await gql<VentasDetalleResponse>(GET_VENTA_DETALLE, { id: parseInt(id, 10) });
      const v = data.ventas.nodes[0];

      if (!v) {
        setSale(null);
        return;
      }

      const monto = parseDecimal(v.montoTotal);
      const esTarjeta = v.numeroTarjeta != null && v.numeroTarjeta !== '';
      const codeLabel = `V-${v.numeroFactura}`;

      const paymentMethods: Sale['paymentMethods'] = [];
      if (esTarjeta) {
        paymentMethods.push({ id: `${codeLabel}-card`, type: 'card' as const, name: 'Tarjeta', amount: monto });
      } else {
        paymentMethods.push({ id: `${codeLabel}-cash`, type: 'cash' as const, name: 'Efectivo', amount: monto });
      }

      const saleData: Sale = {
        id: String(v.id),
        code: codeLabel,
        date: parseDate(v.fechaEmision),
        customerId: undefined,
        customerName: v.nombreRazonSocial || undefined,
        cashierId: '',
        cashierName: v.usuario || undefined,
        branchId: '',
        branchName: '',
        status: mapEstadoToStatus(v.estadoSiat),
        subtotal: parseDecimal(v.montoTotalSujetoIva),
        discount: 0,
        tax: 0,
        taxPercentage: 18,
        total: monto,
        paymentMethods,
        items: (v.detalles ?? []).map((d, i) => ({
          id: `${codeLabel}-${i}`,
          productId: d.codigoProducto ?? '',
          productCode: d.codigoProducto ?? '',
          productName: d.descripcion,
          quantity: d.cantidad,
          unit: d.unidadMedida != null ? String(d.unidadMedida) : 'unidad',
          unitPrice: parseDecimal(d.precioUnitario),
          discount: 0,
          subtotal: parseDecimal(d.subTotal),
          tax: 0,
          total: parseDecimal(d.subTotal),
        })),
        pointsEarned: undefined,
        pointsRedeemed: undefined,
        notes: undefined,
        refunds: [],
        createdAt: parseDate(v.fechaEmision),
        updatedAt: parseDate(v.fechaEmision),

        // SIAT
        ventaId: v.id,
        estadoSiat: v.estadoSiat,
        siatAceptada: esEstadoValidadaSiat(v.estadoSiat),
        errorSiat: null,
        numeroFactura: v.numeroFactura,
      };

      setSale(saleData);
    } catch (e) {
      console.error('Error loading venta detalle:', e);
      setError('No se pudo cargar el detalle de la venta.');
      setSale(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (saleId) {
      loadVenta(saleId);
    } else {
      setSale(null);
    }
  }, [saleId, loadVenta]);

  return { sale, isLoading, error };
}
