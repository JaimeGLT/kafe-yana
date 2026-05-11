import { useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_PARA_LLEVAR } from '../lib/queries/ventas.queries';
import { toast } from '../components/ui/Toast';

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
        id: number;
        id_Ronda: number;
        nombre_Producto: string;
        precio: number;
      }[];
    }[];
  } | null;
}

interface UseVentaReturn {
  syncParaLlevar: () => Promise<ParaLlevarPedido[]>;
  createPedidoParaLlevar: (clienteId?: number | null) => Promise<number | null>;
  crearRondaParaLlevar: (pedidoId: number, detalles: { id_Producto: number; ids_Opcion: number[]; cantidad: number }[]) => Promise<boolean>;
  cobrarParaLlevar: (pedidoId: number, clienteId: number | null, tipoPago: number, efectivoRecibido: number) => Promise<boolean>;
  liberarPedido: () => Promise<boolean>;
}

export function useVenta(): UseVentaReturn {
  const syncParaLlevar = useCallback(async (): Promise<ParaLlevarPedido[]> => {
    try {
      const data = await gql<{ paraLlevar: { nodes: ParaLlevarPedido[] } }>(GET_PARA_LLEVAR);
      return data.paraLlevar.nodes;
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
  ): Promise<boolean> => {
    try {
      await api.post('/Venta/ronda', {
        id_Pedido: pedidoId,
        detalles,
      });
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo crear la ronda.';
      toast.error('Error', msg);
      return false;
    }
  }, []);

  const cobrarParaLlevar = useCallback(async (
    pedidoId: number,
    clienteId: number | null,
    tipoPago: number,
    efectivoRecibido: number
  ): Promise<boolean> => {
    try {
      await api.post('/Venta/cobrar', {
        id_Pedido: pedidoId,
        id_Cliente: clienteId,
        tipoPago,
        efectivoRecibido,
      });
      return true;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo cobrar el pedido.';
      toast.error('Error', msg);
      return false;
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
    cobrarParaLlevar,
    liberarPedido,
  };
}