import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_CLIENTES, GET_CLIENTES_SEARCH } from '../lib/queries/clientes.queries';
import {
  GET_PRODUCTOS_CANJEABLES,
  GET_VENTAS_CLIENTE,
  GET_HISTORIAL_PUNTOS,
  GET_PROMOCIONES_PERMANENTES,
  GET_PROMOCIONES_TEMPORADA,
} from '../lib/queries/fidelizacion.queries';
import type { Customer, CustomerInput } from '../types';

export interface ProductoCanjeable {
  id: string;
  id_Producto: string;
  nombreProducto: string;
  categoria: string;
  puntos: number;
  disponible: string;
  activo: boolean;
}

export interface VentaDetalle {
  id: number;
  id_venta: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subTotal: number | string;
}

export interface VentaResumen {
  id: string;
  numeroFactura: number;
  fechaEmision: string;
  montoTotal: number | string;
  nombreRazonSocial: string;
  detalles: VentaDetalle[];
}

export interface HistorialPuntosItem {
  id: number;
  id_Cliente: number;
  codigoVenta: string;
  puntosBase: number;
  puntosFinales: number;
  desglose: string | null;
  fecha: string;
}

export interface PromocionPermanenteApi {
  id: number;
  nombre: string;
  descripcion: string;
  tipoCondicion: string;
  valorCondicion: number;
  tipoRecompensa: string;
  valorRecompensa: number;
  activo: boolean;
  id_ProductoCanjeable: number | null;
}

export interface DtoPromocionGratisItem {
  IdPromocionPermanente: number;
  NombrePromocion: string;
  TipoCondicion: 'NCompras' | 'MontoMinimo';
  ValorCondicion: number;
  ProgresoActual: number | null;
  IdProductoCanjeable: number;
  NombreProducto: string;
  Categoria: string;
}

export interface DtoPromocionesGratisCliente {
  Id_Cliente: number;
  Disponibles: DtoPromocionGratisItem[];
  EnProgreso: DtoPromocionGratisItem[];
}

export interface HitoReclamado {
  IdHitoCompra: number;
  NumeroComprasRequerido: number;
  NumeroComprasAlReclamar: number;
  CodigoReclamo: string;
  Fecha: string;
  Descripcion: string;
  Icono: string;
  IdProductoCanjeable: number;
  NombreProducto: string;
  Categoria: string;
}

export interface HitosReclamadosResponse {
  Id_Cliente: number;
  Reclamados: HitoReclamado[];
}

export interface PromocionTemporadaApi {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  productosCanjeables: Array<{
    id_ProductoCanjeable: number;
    productoCanjeable: {
      id: number;
      nombreProducto: string;
      categoria: string;
      puntos: number;
      disponible: string;
      activo: boolean;
    };
  }>;
}

interface ClienteNode {
  id: number;
  nombre: string;
  celular: string;
  correo: string;
  dni: string;
  fecha_nacimiento: string;
  direccion: string;
  puntos: number;
  numeroCompras: number;
  estado: boolean | string;
}

function mapClienteNode(n: ClienteNode): Customer {
  return {
    id: String(n.id),
    nombre: n.nombre,
    celular: n.celular,
    correo: n.correo,
    dni: n.dni,
    fecha_nacimiento: n.fecha_nacimiento,
    direccion: n.direccion,
    puntos: n.puntos,
    numeroCompras: n.numeroCompras,
    estado: n.estado === true || n.estado === '1' || n.estado === 'true',
  };
}

export function useFidelizacion() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [productosCanjeables, setProductosCanjeables] = useState<ProductoCanjeable[]>([]);
  const [ventasCliente, setVentasCliente] = useState<VentaResumen[]>([]);
  const [historialPuntos, setHistorialPuntos] = useState<HistorialPuntosItem[]>([]);
  const [promocionesPermanentes, setPromocionesPermanentes] = useState<PromocionPermanenteApi[]>([]);
  const [promocionesTemporada, setPromocionesTemporada] = useState<PromocionTemporadaApi[]>([]);
  const [promosGratisCliente, setPromosGratisCliente] = useState<DtoPromocionesGratisCliente | null>(null);
  const [hitosReclamados, setHitosReclamados] = useState<HitoReclamado[]>([]);
  const [isLoadingHitosReclamados, setIsLoadingHitosReclamados] = useState(false);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isLoadingVentas, setIsLoadingVentas] = useState(false);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [isLoadingPromosGratis, setIsLoadingPromosGratis] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadClientes = useCallback(async () => {
    setIsLoadingClientes(true);
    try {
      const data = await gql<{ clientes: { items: ClienteNode[] } }>(GET_CLIENTES, { skip: 0, take: 500 });
      setClientes(data.clientes.items.map(mapClienteNode));
    } catch (e) {
      console.error('Error loading clientes:', e);
    } finally {
      setIsLoadingClientes(false);
    }
  }, []);

  const loadProductosCanjeables = useCallback(async () => {
    try {
      const data = await gql<{ productosCanjeables: { items: ProductoCanjeable[] } }>(GET_PRODUCTOS_CANJEABLES);
      setProductosCanjeables(data.productosCanjeables.items);
    } catch (e) {
      console.error('Error loading productos canjeables:', e);
    }
  }, []);

  const loadPromociones = useCallback(async () => {
    try {
      const [permData, tempData] = await Promise.all([
        gql<{ promocionPermanentes: { items: PromocionPermanenteApi[] } }>(GET_PROMOCIONES_PERMANENTES),
        gql<{ promocionTemporadas: { items: PromocionTemporadaApi[] } }>(GET_PROMOCIONES_TEMPORADA),
      ]);
      setPromocionesPermanentes(permData.promocionPermanentes.items);
      setPromocionesTemporada(tempData.promocionTemporadas.items);
    } catch (e) {
      console.error('Error loading promociones:', e);
    }
  }, []);

  const fetchVentasCliente = useCallback(async (clienteNombre: string) => {
    if (!clienteNombre) return;
    setIsLoadingVentas(true);
    setVentasCliente([]);
    try {
      const data = await gql<{ ventas: { items: VentaResumen[] } }>(
        GET_VENTAS_CLIENTE,
        { nombre: clienteNombre },
      );
      setVentasCliente(data.ventas.items);
    } catch (e) {
      console.error('Error loading ventas cliente:', e);
    } finally {
      setIsLoadingVentas(false);
    }
  }, []);

  const fetchHistorialPuntos = useCallback(async (clienteId: number) => {
    setIsLoadingHistorial(true);
    setHistorialPuntos([]);
    try {
      const data = await gql<{ historialPuntos: { items: HistorialPuntosItem[] } }>(
        GET_HISTORIAL_PUNTOS,
        { clienteId },
      );
      setHistorialPuntos(data.historialPuntos.items);
    } catch (e) {
      console.error('Error loading historial puntos:', e);
    } finally {
      setIsLoadingHistorial(false);
    }
  }, []);

  const fetchPromosGratisCliente = useCallback(async (idCliente: number) => {
    setIsLoadingPromosGratis(true);
    setPromosGratisCliente(null);
    try {
      const data = await api.get<DtoPromocionesGratisCliente>(
        `/ProductoCanjeable/promociones-gratis-disponibles?Id_Cliente=${idCliente}`,
      );
      setPromosGratisCliente(data);
    } catch (e) {
      console.error('Error loading promos gratis:', e);
    } finally {
      setIsLoadingPromosGratis(false);
    }
  }, []);

  const fetchHitosReclamados = useCallback(async (idCliente: number) => {
    setIsLoadingHitosReclamados(true);
    setHitosReclamados([]);
    try {
      const data = await api.get<HitosReclamadosResponse>(
        `/ProductoCanjeable/hitos-reclamados?Id_Cliente=${idCliente}`,
      );
      console.log('[hitos-reclamados] respuesta:', data);
      setHitosReclamados(data.Reclamados ?? []);
    } catch (e) {
      console.error('[hitos-reclamados] ERROR:', e);
    } finally {
      setIsLoadingHitosReclamados(false);
    }
  }, []);

  const searchClientes = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await gql<{ clientes: { items: ClienteNode[] } }>(GET_CLIENTES_SEARCH, { q });
      setSearchResults(data.clientes.items.map(mapClienteNode));
    } catch (e) {
      console.error('Error searching clientes:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const createCliente = useCallback(async (input: CustomerInput): Promise<void> => {
    await api.post('/Cliente', input);
    await loadClientes();
  }, [loadClientes]);

  useEffect(() => {
    loadClientes();
    loadProductosCanjeables();
    loadPromociones();
  }, [loadClientes, loadProductosCanjeables, loadPromociones]);

  return {
    clientes,
    productosCanjeables,
    ventasCliente,
    historialPuntos,
    promocionesPermanentes,
    promocionesTemporada,
    promosGratisCliente,
    isLoadingClientes,
    isLoadingVentas,
    isLoadingHistorial,
    isLoadingPromosGratis,
    searchResults,
    isSearching,
    refreshClientes: loadClientes,
    fetchVentasCliente,
    fetchHistorialPuntos,
    fetchPromosGratisCliente,
    hitosReclamados,
    isLoadingHitosReclamados,
    fetchHitosReclamados,
    searchClientes,
    createCliente,
  };
}
