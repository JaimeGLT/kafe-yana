import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { GET_VENTA_DETALLE } from '../lib/queries/dashboard.queries';
import type { Sale } from '../types';

interface DetalleVentaNode {
  id_venta: number;
  nombre: string;
  cantidad: number;
  precio: string;
  total: string;
  id: number;
}

interface BackendVenta {
  id: number;
  codigo: string;
  fecha: string;
  cliente?: string;
  cajero?: string;
  productos: number;
  estado: string;
  subtotal: string | number;
  total: string | number;
  pagoEfectivo: number;
  pagoTarjeta: number;
  pagoQr: number;
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

      const paymentMethods: Sale['paymentMethods'] = [];
      if (v.pagoEfectivo > 0) paymentMethods.push({ id: `${v.codigo}-cash`, type: 'cash' as const, name: 'Efectivo', amount: Number(v.pagoEfectivo) });
      if (v.pagoTarjeta > 0) paymentMethods.push({ id: `${v.codigo}-card`, type: 'card' as const, name: 'Tarjeta', amount: Number(v.pagoTarjeta) });
      if (v.pagoQr > 0) paymentMethods.push({ id: `${v.codigo}-qr`, type: 'qr' as const, name: 'QR', amount: Number(v.pagoQr) });

      const saleData: Sale = {
        id: String(v.id),
        code: v.codigo,
        date: parseDate(v.fecha),
        customerId: undefined,
        customerName: v.cliente || undefined,
        cashierId: '',
        cashierName: v.cajero || undefined,
        branchId: '',
        branchName: '',
        status: 'completed',
        subtotal: parseDecimal(v.subtotal),
        discount: 0,
        tax: 0,
        taxPercentage: 18,
        total: parseDecimal(v.total),
        paymentMethods,
        items: (v.detalles ?? []).map((d, i) => ({
          id: `${v.codigo}-${i}`,
          productId: '',
          productName: d.nombre,
          productCode: '',
          quantity: d.cantidad,
          unit: 'unidad',
          unitPrice: parseDecimal(d.precio),
          discount: 0,
          subtotal: parseDecimal(d.total),
          tax: 0,
          total: parseDecimal(d.total),
        })),
        pointsEarned: undefined,
        pointsRedeemed: undefined,
        notes: undefined,
        refunds: [],
        createdAt: parseDate(v.fecha),
        updatedAt: parseDate(v.fecha),
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