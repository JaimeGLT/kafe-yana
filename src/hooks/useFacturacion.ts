// Hook para el módulo de Facturación SIAT.
// Centraliza las llamadas a /api/Facturacion/* y /api/NotaAjuste
// (imprimir, reenviar, anular, revertir, verificar-nit, crearNotaAjuste).
// Patrón: useCallback + try/catch + ApiError + toast (igual que useVenta.ts).

import { useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import { toast } from '../components/ui/Toast';
import { esEstadoAnuladaSiat, esEstadoValidadaSiat } from '../types/siat';
import type {
  AnularFacturaRespuesta,
  ImprimirFacturaRespuesta,
  ReenviarFacturaRespuesta,
  RevertirAnulacionFacturaRespuesta,
  VerificarNitRespuesta,
} from '../types/siat';
import type { CrearNotaAjusteRequest, CrearNotaAjusteRespuesta } from '../types/notaAjuste';
import { formatearPrimerErrorSiat } from '../lib/erroresSiat';

export interface UseFacturacionReturn {
  imprimirFactura: (ventaId: number) => Promise<ImprimirFacturaRespuesta | null>;
  reenviarFactura: (ventaId: number) => Promise<ReenviarFacturaRespuesta | null>;
  /**
   * Anula una factura en el SIAT.
   * `nota` es una nota/justificación libre opcional. El backend actual puede
   * ignorarla (forward-compat), pero la UI ya la envía en el body.
   */
  anularFactura: (ventaId: number, codigoMotivo: number, nota?: string | null) => Promise<AnularFacturaRespuesta | null>;
  /**
   * Revierte en el SIAT una anulación errónea. Solo se permite una vez por
   * factura (el backend rechaza llamadas posteriores). El endpoint no recibe
   * body; basta con el ventaId en la URL.
   */
  revertirAnulacionFactura: (ventaId: number) => Promise<RevertirAnulacionFacturaRespuesta | null>;
  verificarNit: (nit: number) => Promise<VerificarNitRespuesta | null>;
  /**
   * Emite una Nota de Crédito/Débito sobre una venta validada.
   * El `body.idVenta` ya viaja en el request; no hace falta pasarlo aparte.
   * Devuelve la respuesta del backend o `null` si falló. Los toasts se
   * disparan aquí mismo (no en el modal); el modal sólo recibe el boolean.
   */
  crearNotaAjuste: (body: CrearNotaAjusteRequest) => Promise<CrearNotaAjusteRespuesta | null>;
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

  const revertirAnulacionFactura = useCallback(async (ventaId: number) => {
    try {
      const res = await api.post<RevertirAnulacionFacturaRespuesta>(
        `/Facturacion/revertir-anulacion/${ventaId}`,
      );
      if (res.Siat?.Transaccion && esEstadoValidadaSiat(res.Siat.EstadoSiat)) {
        toast.success('Reversión aplicada', res.message);
      } else if (res.Siat?.Transaccion) {
        toast.info('SIAT', res.message);
      } else {
        toast.warning('SIAT', res.Siat?.ErrorMensaje ?? res.message);
      }
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo revertir la anulación en el SIAT.';
      toast.error('Error al revertir', msg);
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

  const crearNotaAjuste = useCallback(async (body: CrearNotaAjusteRequest) => {
    try {
      const res = await api.post<CrearNotaAjusteRespuesta>('/NotaAjuste', body);
      // Mismo criterio que `anularFactura`: éxito si Transaccion=true (independiente
      // del estado final; el backend garantiza que la nota quedó persistida).
      if (res.Siat?.Transaccion) {
        const numero = res.Siat.NumeroNotaCreditoDebito;
        toast.success(
          'Nota de ajuste emitida',
          numero != null
            ? `Nota N° ${numero} registrada en el SIAT.`
            : 'La nota fue registrada correctamente en el SIAT.',
        );
      } else if (res.Siat?.CodigosRespuesta?.length) {
        // Transaccion=false pero con detalle: el SIAT rechazó con un código conocido.
        toast.warning('SIAT rechazó la nota', formatearPrimerErrorSiat(res.Siat.CodigosRespuesta));
      } else {
        // Fallback genérico.
        toast.warning('SIAT', res.Siat?.ErrorMensaje ?? res.message ?? 'La nota no pudo procesarse.');
      }
      return res;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo emitir la nota de ajuste.';
      toast.error('Error al emitir la nota', msg);
      return null;
    }
  }, []);

  return { imprimirFactura, reenviarFactura, anularFactura, revertirAnulacionFactura, verificarNit, crearNotaAjuste };
}
