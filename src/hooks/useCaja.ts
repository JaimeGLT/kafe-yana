import { useState, useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_CAJA_ESTADO, GET_CAJA_MOVIMIENTOS, GET_ULTIMA_CAJA_HISTORIAL } from '../lib/queries/caja.queries';
import { toast } from '../components/ui/Toast';
import { useSignalRSubscription } from './useSignalRSubscription';
import type { CajaHistorialNode } from '../types/cajaHistorial';

export interface CajaEstado {
  abierta: boolean;
  abiertaPor: string | null;
  cerradaPor: string | null;
  fechaApertura: string | null;
  fechaCierre: string | null;
  id: string;
  nombre: string;
  saldoEsperado: number;
  saldoInicial: number;
  totalEfectivo: number;
  totalEgresos: number;
  totalIngresos: number;
  totalQr: number;
  totalTarjeta: number;
  totalVentas: number;
}

export interface CajaMovimiento {
  id: string;
  id_Caja: string;
  categoria: string;
  descripcion: string;
  fecha: string;
  monto: number;
  nota: string | null;
  referencia: string;
  tipo: 'ingreso' | 'egreso';
}

interface UseCajaReturn {
  caja: CajaEstado | null;
  movimientos: CajaMovimiento[];
  ultimaSesion: CajaHistorialNode | null;
  loading: boolean;
  error: string | null;
  syncCaja: () => Promise<void>;
  abrirCaja: (saldoInicial: number) => Promise<boolean>;
  cerrarCaja: (montoFinal: number, nota?: string) => Promise<boolean>;
  agregarMovimiento: (data: {
    cantidad: number;
    categoria: string;
    concepto: string;
    referencia?: string;
    nota?: string;
    entrada: boolean;
  }) => Promise<boolean>;
}

export function useCaja(): UseCajaReturn {
  const [caja, setCaja] = useState<CajaEstado | null>(null);
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [ultimaSesion, setUltimaSesion] = useState<CajaHistorialNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncCaja = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [estadoData, movimientosData] = await Promise.all([
        gql<{ caja: CajaEstado }>(GET_CAJA_ESTADO),
        gql<{ cajaMoviminetos: { items: CajaMovimiento[] } }>(GET_CAJA_MOVIMIENTOS),
      ]);
      setCaja(estadoData.caja);
      setMovimientos(movimientosData.cajaMoviminetos.items.map(m => ({
        ...m,
        tipo: (m.tipo as string).toLowerCase() === 'ingreso' ? 'ingreso' : 'egreso',
      })) as CajaMovimiento[]);
      if (!estadoData.caja || !estadoData.caja.abierta) {
        const histData = await gql<{ cajaHistorial: { items: CajaHistorialNode[] } }>(GET_ULTIMA_CAJA_HISTORIAL);
        setUltimaSesion(histData.cajaHistorial.items[0] ?? null);
      } else {
        setUltimaSesion(null);
      }
    } catch (err) {
      setError('No se pudo cargar la información de caja');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const abrirCaja = useCallback(async (saldoInicial: number): Promise<boolean> => {
    try {
      setLoading(true);
      await api.post('/Caja/Abrir', { saldoInicial });
      await syncCaja();
      toast.success('Caja abierta', `Caja iniciada con S/ ${saldoInicial.toFixed(2)}.`);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo abrir la caja.';
      toast.error('Error', msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncCaja]);

  const cerrarCaja = useCallback(async (montoFinal: number, nota?: string): Promise<boolean> => {
    try {
      setLoading(true);
      await api.post('/Caja/cerrar', { montoFinal, nota: nota ?? '' });
      await syncCaja();
      toast.success('Caja cerrada', 'La caja fue cerrada exitosamente.');
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cerrar la caja.';
      toast.error('Error', msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncCaja]);

  const agregarMovimiento = useCallback(async (data: {
    cantidad: number;
    categoria: string;
    concepto: string;
    referencia?: string;
    nota?: string;
    entrada: boolean;
  }): Promise<boolean> => {
    try {
      setLoading(true);
      await api.post(`/Caja/movimiento?entrada=${data.entrada}`, {
        cantidad: data.cantidad,
        categoria: data.categoria,
        concepto: data.concepto,
        referencia: data.referencia ?? '',
        nota: data.nota ?? '',
      });
      await syncCaja();
      toast.success('Movimiento agregado', `${data.entrada ? 'Ingreso' : 'Egreso'} registrado correctamente.`);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento.';
      toast.error('Error', msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncCaja]);

  useSignalRSubscription(
    {
      VentaProcesada: (data: { Total: number }) => {
        setCaja(prev => prev ? { ...prev, totalVentas: prev.totalVentas + data.Total } : prev);
        syncCaja();
      },
    },
    {
      group: 'caja',
      onReconnect: () => { syncCaja(); },
    },
  );

  return {
    caja,
    movimientos,
    ultimaSesion,
    loading,
    error,
    syncCaja,
    abrirCaja,
    cerrarCaja,
    agregarMovimiento,
  };
}