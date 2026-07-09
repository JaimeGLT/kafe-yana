import { useCallback, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { toast } from '../components/ui/Toast';
import type { SubVentaPendiente } from '../types';

export interface DtoFacturarSubVenta {
  id_Cliente?: number | null;
  codigoTipoDocumento?: number | null;
  nombre?: string | null;
  dni?: number | null;
  complemento?: string | null;
  codigoSucursal?: number | null;
  codigoPuntoVenta?: number | null;
  codigoPaisOrigen?: number | null;
}

interface UseSubVentaReturn {
  pendientes: SubVentaPendiente[];
  historial: SubVentaPendiente[];
  loading: boolean;
  loadingHistorial: boolean;
  listarPendientes: (idMesa?: number, idParaLlevar?: number) => Promise<void>;
  /** Historial completo (facturadas y no) de un pedido — fuente de verdad en BD. */
  listarPorPedido: (idPedido: number) => Promise<void>;
  facturar: (id: number, datos: DtoFacturarSubVenta) => Promise<boolean>;
}

export function useSubVenta(): UseSubVentaReturn {
  const [pendientes, setPendientes] = useState<SubVentaPendiente[]>([]);
  const [historial, setHistorial] = useState<SubVentaPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const listarPendientes = useCallback(async (idMesa?: number, idParaLlevar?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (idMesa != null) params.set('idMesa', String(idMesa));
      if (idParaLlevar != null) params.set('idParaLlevar', String(idParaLlevar));
      const qs = params.toString();
      const res = await api.get<SubVentaPendiente[]>(`/SubVenta/pendientes${qs ? `?${qs}` : ''}`);
      setPendientes(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudieron cargar las sub-ventas pendientes.';
      toast.error('Error', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const listarPorPedido = useCallback(async (idPedido: number) => {
    setLoadingHistorial(true);
    try {
      const res = await api.get<SubVentaPendiente[]>(`/SubVenta/pedido/${idPedido}`);
      setHistorial(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cargar el historial de cobros.';
      toast.error('Error', msg);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  const facturar = useCallback(async (id: number, datos: DtoFacturarSubVenta): Promise<boolean> => {
    try {
      await api.post(`/SubVenta/${id}/facturar`, datos);
      toast.success('Sub-venta facturada', 'La factura se generó correctamente.');
      setPendientes(prev => prev.filter(p => p.id !== id));
      setHistorial(prev => prev.map(p => p.id === id ? { ...p, facturada: true } : p));
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo facturar la sub-venta.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  return { pendientes, historial, loading, loadingHistorial, listarPendientes, listarPorPedido, facturar };
}
