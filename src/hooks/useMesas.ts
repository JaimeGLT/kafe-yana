import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { gql } from '../lib/graphql';
import { GET_MESAS } from '../lib/queries/mesas.queries';
import { toast } from '../components/ui/Toast';

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
        nombre_Producto: string;
        cantidad: number;
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

interface UseMesasReturn {
  mesas: MesaBackend[];
  loading: boolean;
  error: string | null;
  createMesa: (nombre: string) => Promise<string | null>;
  updateMesa: (id: string, nombre: string) => Promise<boolean>;
  deleteMesa: (id: string) => Promise<boolean>;
  ocuparMesa: (id: string, clienteId: number | null) => Promise<number | null>;
  liberarMesa: (id: string) => Promise<boolean>;
  crearRonda: (mesaId: string, detalles: { id_Producto: number; ids_Opcion: number[]; cantidad: number }[]) => Promise<boolean>;
  cobrarMesa: (mesaId: string, data: { id_Pedido: number; id_Cliente: number | null; tipoPago: number; efectivoRecibido: number }) => Promise<boolean>;
  getActivePedidoId: (mesaId: string) => number | null;
  refreshMesas: () => Promise<void>;
}

export function useMesas(): UseMesasReturn {
  const [mesas, setMesas] = useState<MesaBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidoPorMesa, setPedidoPorMesa] = useState<Record<string, number>>({});

  const refreshMesas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gql<{ mesas: { nodes: MesaBackend[] } }>(GET_MESAS);
      setMesas(data.mesas.nodes);

      setPedidoPorMesa(prev => {
        const updated = { ...prev };
        for (const mesa of data.mesas.nodes) {
          if (mesa.id_Pedido != null) {
            updated[mesa.id] = mesa.id_Pedido;
          } else {
            delete updated[mesa.id];
          }
        }
        return updated;
      });
    } catch (err) {
      setError('No se pudieron cargar las mesas');
      console.error(err);
    } finally {
      setLoading(false);
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
    } catch {
      toast.error('Error', 'No se pudo crear la mesa.');
      return null;
    }
  }, [refreshMesas]);

  const updateMesa = useCallback(async (id: string, nombre: string): Promise<boolean> => {
    try {
      await api.put(`/Mesa/${id}`, { nombre });
      await refreshMesas();
      toast.success('Mesa actualizada', `${nombre} se modificó correctamente.`);
      return true;
    } catch {
      toast.error('Error', 'No se pudo actualizar la mesa.');
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
    } catch {
      toast.error('Error', 'No se pudo ocupar la mesa.');
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
  ): Promise<boolean> => {
    try {
      const id_Pedido = pedidoPorMesa[mesaId];
      if (!id_Pedido) {
        toast.error('Error', 'La mesa no tiene un pedido activo.');
        return false;
      }

      await api.post(`/Mesa/ronda/${mesaId}`, {
        id_Pedido,
        detalles,
      });
      await refreshMesas();
      return true;
    } catch {
      toast.error('Error', 'No se pudo crear la ronda.');
      return false;
    }
  }, [pedidoPorMesa, refreshMesas]);

  const cobrarMesa = useCallback(async (
    mesaId: string,
    data: { id_Pedido: number; id_Cliente: number | null; tipoPago: number; efectivoRecibido: number }
  ): Promise<boolean> => {
    try {
      await api.post(`/Mesa/cobrar/${mesaId}`, data);
      await refreshMesas();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cobrar la mesa.';
      toast.error('Error', message);
      return false;
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
    cobrarMesa,
    getActivePedidoId: (mesaId: string) => pedidoPorMesa[mesaId] ?? null,
    refreshMesas,
  };
}