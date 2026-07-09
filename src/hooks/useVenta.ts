import { useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_PARA_LLEVAR } from '../lib/queries/ventas.queries';
import { toast } from '../components/ui/Toast';
import { interpretarErrorCobro } from '../lib/errores';
import type { RondaCreatedResponse, DtoRondaEditar, DtoRondaDetalleEditar } from './useMesas';
import type { PedidoActualizado, ItemCubiertoInput } from '../types';

export interface ParaLlevarPedido {
  disponible: boolean;
  id: number;
  id_Pedido: number;
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
      direccion: string;
      fecha_nacimiento: string;
      puntos: number;
      estado: string;
    } | null;
    rondas: {
      id: number;
      id_Pedido: number;
      ronda_Descripcion: string;
      subTotal: number;
      detalle: {
        cantidad: number;
        cantidadDescontada?: number;
        id: number;
        id_Producto: number;
        id_Ronda: number;
        nombre_Producto: string;
        precio: number;
      }[];
    }[];
  } | null;
}

export interface RespuestaCobro {
  message: string;
  CodigoVenta: string;
  PuntosPorVenta: number;
  PuntosPromocionPermanente: number;
  PromocionPermanente: { NombrePromocion: string; PuntosExtra: number; Mensaje: string } | null;
  AplicoDescuento: boolean;
  MontoDescuento: number;
  PorcentajeDescuento: number | null;
  SubtotalPedido: number;
  TotalCobrado: number;
  PromocionDescuento: {
    IdPromocion: number;
    NombrePromocion: string;
    PorcentajeDescuento: number;
    MontoDescuento: number;
    TotalConDescuento: number;
    Mensaje: string;
  } | null;

  // ── SIAT (devueltos por VentaRespuestaHelper.ConstruirRespuestaCobro) ──
  VentaId: number;
  NumeroFactura: number | null;
  EstadoSiat: string | null;
  CodigoRecepcion: string | null;
  SiatAceptada: boolean;
  ErrorSiat: string | null;
  CodigoHash: string | null;
  Siat: import('../types/siat').SiatResultado | null;
  XmlGenerado: boolean;

  // ── Pago parcial ──
  /** `true` cuando el cobro fue un pago parcial (mesa/pedido sigue abierto). */
  EsAbono?: boolean | null;
  /** Estado del pedido tras el cobro (parcial o final). */
  pedidoActualizado?: PedidoActualizado | null;
}

interface UseVentaReturn {
  syncParaLlevar: () => Promise<ParaLlevarPedido[]>;
  createPedidoParaLlevar: (clienteId?: number | null) => Promise<number | null>;
  crearRondaParaLlevar: (pedidoId: number, detalles: { id_Producto: number; ids_Opcion: number[]; cantidad: number }[]) => Promise<RondaCreatedResponse | null>;
  editarRondaParaLlevar: (rondaId: number, data: DtoRondaEditar) => Promise<boolean>;
  eliminarRondaParaLlevar: (rondaId: number, pedidoId: number) => Promise<boolean>;
  editarDetalleParaLlevar: (detalleId: number, pedidoId: number, data: Omit<DtoRondaDetalleEditar, 'id_Detalle'>) => Promise<boolean>;
  eliminarDetalleParaLlevar: (detalleId: number, pedidoId: number) => Promise<boolean>;
  cobrarParaLlevar: (
    pedidoId: number,
    body: Record<string, unknown>,
  ) => Promise<RespuestaCobro | null>;
  /**
   * Registra un pago parcial sobre un pedido para llevar.
   * Body debe incluir `itemsCubiertos: ItemCubiertoInput[]` y
   * `mantenerMesaAbierta: true`. El backend deja el pedido abierto.
   */
  aplicarAbonoParaLlevar: (
    pedidoId: number,
    itemsCubiertos: ItemCubiertoInput[],
    body: Record<string, unknown>,
  ) => Promise<RespuestaCobro | null>;
  liberarPedido: () => Promise<boolean>;
}

export function useVenta(): UseVentaReturn {
  const syncParaLlevar = useCallback(async (): Promise<ParaLlevarPedido[]> => {
    try {
      const data = await gql<{ paraLlevar: { items: ParaLlevarPedido[] } }>(GET_PARA_LLEVAR);
      return data.paraLlevar.items;
    } catch (err) {
      console.error('Error syncing para llevar:', err);
      toast.error('Error', 'No se pudieron sincronizar los pedidos para llevar.');
      return [];
    }
  }, []);

  const createPedidoParaLlevar = useCallback(async (clienteId?: number | null): Promise<number | null> => {
    try {
      const response = await api.post<{ Id_Pedido: number }>('/Venta/pedido', {
        id_Cliente: clienteId ?? null,
      });
      return response.Id_Pedido ?? null;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo crear el pedido.';
      toast.error('Error', msg);
      return null;
    }
  }, []);

  const crearRondaParaLlevar = useCallback(async (
    pedidoId: number,
    detalles: { id_Producto: number; ids_Opcion: number[]; cantidad: number }[]
  ): Promise<RondaCreatedResponse | null> => {
    try {
      const response = await api.post<RondaCreatedResponse>('/Venta/ronda', {
        id_Pedido: pedidoId,
        detalles,
      });
      return response;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo crear la ronda.';
      toast.error('Error', msg);
      return null;
    }
  }, []);

  const editarRondaParaLlevar = useCallback(async (
    rondaId: number,
    data: DtoRondaEditar,
  ): Promise<boolean> => {
    try {
      await api.put(`/Venta/ronda/${rondaId}`, data);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo editar la ronda.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  const eliminarRondaParaLlevar = useCallback(async (
    rondaId: number,
    pedidoId: number,
  ): Promise<boolean> => {
    try {
      await api.delete(`/Venta/ronda/${rondaId}?idPedido=${pedidoId}`);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo eliminar la ronda.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  const editarDetalleParaLlevar = useCallback(async (
    detalleId: number,
    pedidoId: number,
    data: Omit<DtoRondaDetalleEditar, 'id_Detalle'>,
  ): Promise<boolean> => {
    try {
      await api.put(`/Venta/detalle/${detalleId}?idPedido=${pedidoId}`, data);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo editar el detalle.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  const eliminarDetalleParaLlevar = useCallback(async (
    detalleId: number,
    pedidoId: number,
  ): Promise<boolean> => {
    try {
      await api.delete(`/Venta/detalle/${detalleId}?idPedido=${pedidoId}`);
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo eliminar el detalle.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  const cobrarParaLlevar = useCallback(async (
    pedidoId: number,
    body: Record<string, unknown>,
  ): Promise<RespuestaCobro | null> => {
    try {
      const res = await api.post<RespuestaCobro>('/Venta/cobrar', { id_Pedido: pedidoId, ...body });
      return res;
    } catch (err) {
      const { title, message, nivel } = interpretarErrorCobro(err, 'No se pudo cobrar el pedido.');
      if (nivel === 'warning') toast.warning(title, message);
      else toast.error(title, message);
      return null;
    }
  }, []);

  const aplicarAbonoParaLlevar = useCallback(async (
    pedidoId: number,
    itemsCubiertos: ItemCubiertoInput[],
    body: Record<string, unknown>,
  ): Promise<RespuestaCobro | null> => {
    if (!itemsCubiertos.length) {
      toast.error('Sin selección', 'Selecciona al menos un item para cobrar.');
      return null;
    }
    try {
      const res = await api.post<RespuestaCobro>('/Venta/cobrar', {
        id_Pedido: pedidoId,
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
  }, []);

  const liberarPedido = useCallback(async (): Promise<boolean> => {
    try {
      await api.put('/Venta/liberar');
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo liberar el pedido.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  return {
    syncParaLlevar,
    createPedidoParaLlevar,
    crearRondaParaLlevar,
    editarRondaParaLlevar,
    eliminarRondaParaLlevar,
    editarDetalleParaLlevar,
    eliminarDetalleParaLlevar,
    cobrarParaLlevar,
    aplicarAbonoParaLlevar,
    liberarPedido,
  };
}