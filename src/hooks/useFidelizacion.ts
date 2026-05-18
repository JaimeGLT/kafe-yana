import { useState, useEffect, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_CLIENTES, GET_CLIENTES_SEARCH } from '../lib/queries/clientes.queries';
import { GET_PRODUCTOS_CANJEABLES, GET_VENTAS_CLIENTE } from '../lib/queries/fidelizacion.queries';
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
  nombre: string;
  cantidad: number;
  precio: number;
  total: number;
}

export interface VentaResumen {
  id: string;
  codigo: string;
  fecha: string;
  total: number;
  cliente: string;
  detalles: VentaDetalle[];
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
    estado: n.estado === true || n.estado === '1' || n.estado === 'true',
  };
}

export function useFidelizacion() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [productosCanjeables, setProductosCanjeables] = useState<ProductoCanjeable[]>([]);
  const [ventasCliente, setVentasCliente] = useState<VentaResumen[]>([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  const [isLoadingVentas, setIsLoadingVentas] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadClientes = useCallback(async () => {
    setIsLoadingClientes(true);
    try {
      const data = await gql<{ clientes: { nodes: ClienteNode[] } }>(GET_CLIENTES, { first: 500 });
      setClientes(data.clientes.nodes.map(mapClienteNode));
    } catch (e) {
      console.error('Error loading clientes:', e);
    } finally {
      setIsLoadingClientes(false);
    }
  }, []);

  const loadProductosCanjeables = useCallback(async () => {
    try {
      const data = await gql<{ productosCanjeables: { nodes: ProductoCanjeable[] } }>(GET_PRODUCTOS_CANJEABLES);
      setProductosCanjeables(data.productosCanjeables.nodes);
    } catch (e) {
      console.error('Error loading productos canjeables:', e);
    }
  }, []);

  const fetchVentasCliente = useCallback(async (clienteNombre: string) => {
    if (!clienteNombre) return;
    setIsLoadingVentas(true);
    setVentasCliente([]);
    try {
      const data = await gql<{ ventas: { nodes: VentaResumen[] } }>(
        GET_VENTAS_CLIENTE,
        { nombre: clienteNombre },
      );
      setVentasCliente(data.ventas.nodes);
    } catch (e) {
      console.error('Error loading ventas cliente:', e);
    } finally {
      setIsLoadingVentas(false);
    }
  }, []);

  const searchClientes = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const data = await gql<{ clientes: { nodes: ClienteNode[] } }>(GET_CLIENTES_SEARCH, { q });
      setSearchResults(data.clientes.nodes.map(mapClienteNode));
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
  }, [loadClientes, loadProductosCanjeables]);

  return {
    clientes,
    productosCanjeables,
    ventasCliente,
    isLoadingClientes,
    isLoadingVentas,
    searchResults,
    isSearching,
    refreshClientes: loadClientes,
    fetchVentasCliente,
    searchClientes,
    createCliente,
  };
}
