// Hook para el módulo de Facturación SIAT.
// Centraliza las llamadas a /api/Facturacion/* (imprimir, reenviar, anular, verificar-nit).
// Patrón: useCallback + try/catch + ApiError + toast (igual que useVenta.ts).

import { useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import { toast } from '../components/ui/Toast';
import { esEstadoAnuladaSiat } from '../types/siat';
import type {
  AnularFacturaRespuesta,
  ImprimirFacturaRespuesta,
  ReenviarFacturaRespuesta,
  VerificarNitRespuesta,
} from '../types/siat';

export interface UseFacturacionReturn {
  imprimirFactura: (ventaId: number) => Promise<ImprimirFacturaRespuesta | null>;
  reenviarFactura: (ventaId: number) => Promise<ReenviarFacturaRespuesta | null>;
  /**
   * Anula una factura en el SIAT.
   * `nota` es una nota/justificación libre opcional. El backend actual puede
   * ignorarla (forward-compat), pero la UI ya la envía en el body.
   */
  anularFactura: (ventaId: number, codigoMotivo: number, nota?: string | null) => Promise<AnularFacturaRespuesta | null>;
  verificarNit: (nit: number) => Promise<VerificarNitRespuesta | null>;
}

export function useFacturacion(): UseFacturacionReturn {
  const imprimirFactura = useCallback(async (ventaId: number) => {
    try {
      const res = await api.post<ImprimirFacturaRespuesta>(`/Facturacion/imprimir/${ventaId}`);
      const ok = res.ImpresionFactura?.Ok === true;
      if (ok) {
        toast.success('Factura enviada', res.ImpresionFactura?.ErrorMensaje ?? res.message);
      } else {
        toast.error(
          'No se pudo imprimir',
          res.ImpresionFactura?.ErrorMensaje ?? res.message ?? 'La impresora no respondió.',
        );
      }
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo enviar la factura a la impresora.';
      toast.error('Error al imprimir', msg);
      return null;
    }
  }, []);

  const reenviarFactura = useCallback(async (ventaId: number) => {
    try {
      const res = await api.post<ReenviarFacturaRespuesta>(`/Facturacion/reenviar/${ventaId}`);
      if (res.Siat?.Transaccion) {
        toast.success('SIAT', res.message);
      } else {
        toast.warning('SIAT', res.Siat?.ErrorMensaje ?? res.message);
      }
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo reenviar al SIAT.';
      toast.error('Error al reenviar', msg);
      return null;
    }
  }, []);

  const anularFactura = useCallback(async (ventaId: number, codigoMotivo: number, nota?: string | null) => {
    try {
      const res = await api.post<AnularFacturaRespuesta>(`/Facturacion/anular/${ventaId}`, {
        CodigoMotivo: codigoMotivo,
        Nota: nota ?? null,
      });
      if (res.Siat?.Transaccion && esEstadoAnuladaSiat(res.Siat.EstadoSiat)) {
        toast.success('Factura anulada', res.message);
      } else if (res.Siat?.Transaccion) {
        toast.info('SIAT', res.message);
      } else {
        toast.warning('SIAT', res.Siat?.ErrorMensaje ?? res.message);
      }
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo anular la factura.';
      toast.error('Error al anular', msg);
      return null;
    }
  }, []);

  const verificarNit = useCallback(async (nit: number) => {
    try {
      const res = await api.get<VerificarNitRespuesta>(`/Facturacion/verificar-nit/${nit}`);
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo verificar el NIT.';
      toast.error('Error al verificar NIT', msg);
      return null;
    }
  }, []);

  return { imprimirFactura, reenviarFactura, anularFactura, verificarNit };
}
