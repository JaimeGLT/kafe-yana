import { useState, useCallback, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_MESAS } from '../lib/queries/mesas.queries';
import { toast } from '../components/ui/Toast';
import { interpretarErrorCobro, interpretarErrorEdicion } from '../lib/errores';
import type { ItemCubiertoInput } from '../types';
import type { RespuestaCobro } from './useVenta';

export interface MesaBackend {
  id: string;
  nombre: string;
  disponible: boolean;
  id_Pedido: number | null;
  pedido: {
    id: number;
    id_Cliente: number | null;
    total: number;
    cliente: {
      id: number;
      dni: string;
      nombre: string;
      celular: string;
      correo: string;
      fecha_nacimiento: string;
      direccion: string;
      puntos: number;
      estado: string;
    } | null;
    rondas: {
      id: number;
      id_Pedido: number;
      ronda_Descripcion: string;
      subTotal: number;
      detalle: {
        id: number;
        id_Producto: number;
        nombre_Producto: string;
        cantidad: number;
        cantidadDescontada?: number;
        precio: number;
        opciones: RondaDetalleOpcion[];
      }[];
    }[];
  } | null;
}

export interface RondaDetalleOpcion {
  id_Opcion: number;
  tipoOpcion: string;
  valorAnterior: string | null;
  costoExtra: number | null;
  opcion: {
    id: number;
    nombre: string;
    ajustePrecio: number;
    variacion: {
      id: number;
      nombre: string;
      requerido: boolean;
    };
    ajustes?: {
      cantidad: number;
      tipoAjuste: string;
      insumoBase?: { nombre: string } | null;
      insumoNuevo?: { nombre: string } | null;
    }[];
  };
}

export interface RondaDetalle {
  id: number;
  nombre_Producto: string;
  cantidad: number;
  precio: number;
  opciones: RondaDetalleOpcion[];
}

export interface RondaBackend {
  id: number;
  id_Pedido: number;
  ronda_Descripcion: string;
  subTotal: number;
  detalle: RondaDetalle[];
}

export interface DtoRondaDetalleEditar {
  id_Detalle: number | null;
  id_Producto: number;
  cantidad: number;
  ids_Opcion: number[];
  nota: string;
}

export interface DtoRondaEditar {
  id_Pedido: number;
  detalles: DtoRondaDetalleEditar[];
}

export interface RondaCreatedCambio {
  tipo: 'Reemplazo' | 'Modificacion';
  sale?: string;
  entra?: string;
  cantidad: number;
  unidad: string;
}

export interface RondaCreatedOpcion {
  nombre: string;
  cambios?: RondaCreatedCambio[];
}

export interface RondaCreatedItem {
  cantidad: number;
  nombre: string;
  ubicacion: string;
  opciones?: RondaCreatedOpcion[];
  items_combo?: Array<{ cantidad: number; nombre: string; ubicacion: string }>;
}

export interface RondaCreatedResponse {
  nombre_mesa: string;
  ronda: {
    Ronda_Descripcion: string;
    detalles: RondaCreatedItem[];
  };
}

interface UseMesasReturn {
  mesas: MesaBackend[];
  loading: boolean;
  error: string | null;
  createMesa: (nombre: string) => Promise<string | null>;
  updateMesa: (id: string, nombre: string) => Promise<boolean>;
  deleteMesa: (id: string) => Promise<boolean>;
  ocuparMesa: (id: string, clienteId: number | null) => Promise<number | null>;
  liberarMesa: (id: string) => Promise<boolean>;
  crearRonda: (mesaId: string, detalles: { id_Producto: number; ids_Opcion: number[]; cantidad: number }[]) => Promise<RondaCreatedResponse | null>;
  editarRonda: (mesaId: string, rondaId: number, data: DtoRondaEditar) => Promise<boolean>;
  eliminarRonda: (mesaId: string, rondaId: number, pedidoId: number) => Promise<boolean>;
  editarDetalle: (detalleId: number, pedidoId: number, data: Omit<DtoRondaDetalleEditar, 'id_Detalle'>) => Promise<boolean>;
  eliminarDetalle: (detalleId: number, pedidoId: number) => Promise<boolean>;
  cobrarMesa: (mesaId: string, data: { id_Pedido: number; id_Cliente: number | null; pagos: { efectivo: number; tarjeta: number; qr: number; total: number } }) => Promise<boolean>;
  /**
   * Registra un pago parcial sobre una mesa.
   * El body debe incluir `itemsCubiertos: ItemCubiertoInput[]` y
   * `mantenerMesaAbierta: true` para que la mesa no se libere.
   * Devuelve la respuesta completa (incluye `EsAbono` y `pedidoActualizado`)
   * para que el caller aplique el nuevo estado a `LocalMesa`.
   */
  aplicarAbonoMesa: (
    mesaId: string,
    itemsCubiertos: ItemCubiertoInput[],
    body: Record<string, unknown>,
  ) => Promise<RespuestaCobro | null>;
  revertirAbono: (abonoId: number) => Promise<import('../types/sales').PedidoActualizado | null>;
  getActivePedidoId: (mesaId: string) => number | null;
  refreshMesas: (silent?: boolean) => Promise<void>;
}

export function useMesas(): UseMesasReturn {
  const [mesas, setMesas] = useState<MesaBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidoPorMesa, setPedidoPorMesa] = useState<Record<string, number>>({});

  const refreshMesas = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await gql<{ mesas: { items: MesaBackend[] } }>(GET_MESAS);
      setMesas(data.mesas.items);

      setPedidoPorMesa(prev => {
        const updated = { ...prev };
        for (const mesa of data.mesas.items) {
          if (mesa.id_Pedido != null) {
            updated[mesa.id] = mesa.id_Pedido;
          } else {
            delete updated[mesa.id];
          }
        }
        return updated;
      });
    } catch (err) {
      if (!silent) setError('No se pudieron cargar las mesas');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMesas();
  }, [refreshMesas]);

  const createMesa = useCallback(async (nombre: string): Promise<string | null> => {
    try {
      const result = await api.post<{ id: number }>('/Mesa', { nombre });
      await refreshMesas();
      toast.success('Mesa creada', `${nombre} se agregó correctamente.`);
      return String(result.id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo crear la mesa.';
      toast.error('Error', msg);
      return null;
    }
  }, [refreshMesas]);

  const updateMesa = useCallback(async (id: string, nombre: string): Promise<boolean> => {
    try {
      await api.put(`/Mesa/${id}`, { nombre });
      await refreshMesas();
      toast.success('Mesa actualizada', `${nombre} se modificó correctamente.`);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo actualizar la mesa.';
      toast.error('Error', msg);
      return false;
    }
  }, [refreshMesas]);

  const deleteMesa = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/Mesa/${id}`);
      await refreshMesas();
      toast.success('Mesa eliminada', 'La mesa fue eliminada.');
      return true;
    } catch {
      toast.error('Error', 'No se pudo eliminar la mesa.');
      return false;
    }
  }, [refreshMesas]);

  const ocuparMesa = useCallback(async (id: string, clienteId: number | null): Promise<number | null> => {
    try {
      const response = await api.post<{ id_Pedido: number }>(`/Mesa/Ocupar/${id}`, { id_Cliente: clienteId });
      if (response.id_Pedido != null) {
        setPedidoPorMesa(prev => ({ ...prev, [id]: response.id_Pedido }));
      }
      await refreshMesas();
      return response.id_Pedido ?? null;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo ocupar la mesa.';
      toast.error('Error al iniciar mesa', msg);
      return null;
    }
  }, [refreshMesas]);

  const liberarMesa = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.put(`/Mesa/Liberar/${id}`);
      setPedidoPorMesa(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      await refreshMesas();
      return true;
    } catch {
      toast.error('Error', 'No se pudo liberar la mesa.');
      return false;
    }
  }, [refreshMesas]);

  const crearRonda = useCallback(async (
    mesaId: string,
    detalles: { id_Producto: number; ids_Opcion: number[]; cantidad: number }[]
  ): Promise<RondaCreatedResponse | null> => {
    try {
      const id_Pedido = pedidoPorMesa[mesaId];
      if (!id_Pedido) {
        toast.error('Error', 'La mesa no tiene un pedido activo.');
        return null;
      }

      const response = await api.post<RondaCreatedResponse>(`/Mesa/ronda/${mesaId}`, {
        id_Pedido,
        detalles,
      });
      await refreshMesas();
      return response;
    } catch {
      toast.error('Error', 'No se pudo crear la ronda.');
      return null;
    }
  }, [pedidoPorMesa, refreshMesas]);

  const editarRonda = useCallback(async (
    mesaId: string,
    rondaId: number,
    data: DtoRondaEditar,
  ): Promise<boolean> => {
    try {
      await api.put(`/Mesa/${mesaId}/ronda/${rondaId}`, data);
      await refreshMesas(true);
      return true;
    } catch (err) {
      const msg = interpretarErrorEdicion(err, 'No se pudo editar la ronda.');
      toast.error(msg.title, msg.message);
      return false;
    }
  }, [refreshMesas]);

  const eliminarRonda = useCallback(async (
    mesaId: string,
    rondaId: number,
    pedidoId: number,
  ): Promise<boolean> => {
    try {
      await api.delete(`/Mesa/${mesaId}/ronda/${rondaId}?idPedido=${pedidoId}`);
      await refreshMesas(true);
      return true;
    } catch (err) {
      const msg = interpretarErrorEdicion(err, 'No se pudo eliminar la ronda.');
      toast.error(msg.title, msg.message);
      return false;
    }
  }, [refreshMesas]);

  const editarDetalle = useCallback(async (
    detalleId: number,
    pedidoId: number,
    data: Omit<DtoRondaDetalleEditar, 'id_Detalle'>,
  ): Promise<boolean> => {
    try {
      await api.put(`/Mesa/detalle/${detalleId}?idPedido=${pedidoId}`, data);
      await refreshMesas(true);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo editar el detalle.';
      toast.error('Error', msg);
      return false;
    }
  }, [refreshMesas]);

  const eliminarDetalle = useCallback(async (
    detalleId: number,
    pedidoId: number,
  ): Promise<boolean> => {
    try {
      await api.delete(`/Mesa/detalle/${detalleId}?idPedido=${pedidoId}`);
      await refreshMesas(true);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo eliminar el detalle.';
      toast.error('Error', msg);
      return false;
    }
  }, [refreshMesas]);

  const cobrarMesa = useCallback(async (
    mesaId: string,
    data: { id_Pedido: number; id_Cliente: number | null; pagos: { efectivo: number; tarjeta: number; qr: number; total: number } }
  ): Promise<boolean> => {
    try {
      await api.post(`/Mesa/cobrar/${mesaId}`, data);
      await refreshMesas();
      return true;
    } catch (err) {
      const { title, message, nivel } = interpretarErrorCobro(err, 'No se pudo cobrar la mesa.');
      if (nivel === 'warning') toast.warning(title, message);
      else toast.error(title, message);
      return false;
    }
  }, [refreshMesas]);

  const revertirAbono = useCallback(async (abonoId: number) => {
    try {
      const res = await api.delete<{ message: string; pedidoActualizado: import('../types/sales').PedidoActualizado }>(`/Mesa/abono/${abonoId}`);
      await refreshMesas(true);
      return res.pedidoActualizado;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo revertir el pago parcial.';
      toast.error('Error', message);
      return null;
    }
  }, [refreshMesas]);

  const aplicarAbonoMesa = useCallback(async (
    mesaId: string,
    itemsCubiertos: ItemCubiertoInput[],
    body: Record<string, unknown>,
  ): Promise<RespuestaCobro | null> => {
    if (!itemsCubiertos.length) {
      toast.error('Sin selección', 'Selecciona al menos un item para cobrar.');
      return null;
    }
    try {
      const res = await api.post<RespuestaCobro>(`/Mesa/cobrar/${mesaId}`, {
        ...body,
        itemsCubiertos,
        mantenerMesaAbierta: true,
      });
      return res;
    } catch (err) {
      const { title, message, nivel } = interpretarErrorCobro(err, 'No se pudo registrar el pago parcial.');
      if (nivel === 'warning') toast.warning(title, message);
      else toast.error(title, message);
      return null;
    }
  }, [refreshMesas]);

  return {
    mesas,
    loading,
    error,
    createMesa,
    updateMesa,
    deleteMesa,
    ocuparMesa,
    liberarMesa,
    crearRonda,
    editarRonda,
    eliminarRonda,
    editarDetalle,
    eliminarDetalle,
    cobrarMesa,
    aplicarAbonoMesa,
    revertirAbono,
    getActivePedidoId: (mesaId: string) => pedidoPorMesa[mesaId] ?? null,
    refreshMesas,
  };
}