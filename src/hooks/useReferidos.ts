import { useState, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_HISTORIAL_REFERIDOS } from '../lib/queries/fidelizacion.queries';
import { GET_CLIENTES } from '../lib/queries/clientes.queries';

export interface ReferidosConfig {
  Id: number;
  PuntosReferidor: number;
  PuntosReferido: number;
  Activo: boolean;
}

export interface HistorialReferido {
  id: number;
  nombreReferidor: string;
  nombreReferido: string;
  puntosReferidor: number;
  puntosReferido: number;
  fecha: string;
}

export interface ClienteOption {
  id: number;
  nombre: string;
  celular: string;
  estado: boolean;
}

export interface ReferidoInput {
  Nombre: string;
  Celular: string;
  Dni?: number | null;
  Correo?: string;
  Fecha_nacimiento?: string;
  Direccion?: string;
  Estado: boolean;
  IdReferidor: number;
}

interface GqlClienteNode {
  id: number;
  nombre: string;
  celular: string;
  estado: boolean;
}

export function useReferidos() {
  const [config, setConfig] = useState<ReferidosConfig | null>(null);
  const [historial, setHistorial] = useState<HistorialReferido[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configRes, historialRes, clientesRes] = await Promise.all([
        api.get<ReferidosConfig>('/Referidos/config'),
        gql<{ historialReferidos: { items: HistorialReferido[] } }>(GET_HISTORIAL_REFERIDOS),
        gql<{ clientes: { items: GqlClienteNode[] } }>(GET_CLIENTES, { skip: 0, take: 500 }),
      ]);
      setConfig(configRes);
      setHistorial(historialRes.historialReferidos.items);
      setClientes(clientesRes.clientes.items.filter(c => c.estado));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (input: Pick<ReferidosConfig, 'PuntosReferidor' | 'PuntosReferido' | 'Activo'>) => {
    setIsSaving(true);
    try {
      await api.put('/Referidos/config', input);
      setConfig(prev => prev ? { ...prev, ...input } : prev);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const createReferido = useCallback(async (input: ReferidoInput) => {
    setIsSaving(true);
    try {
      const res = await api.post<{ message: string; Id: number; puntosOtorgadosReferidor: number; puntosOtorgadosReferido: number }>(
        '/Referidos/cliente',
        input
      );
      await Promise.all([
        gql<{ historialReferidos: { items: HistorialReferido[] } }>(GET_HISTORIAL_REFERIDOS).then(r =>
          setHistorial(r.historialReferidos.items)
        ),
        gql<{ clientes: { items: GqlClienteNode[] } }>(GET_CLIENTES, { skip: 0, take: 500 }).then(r =>
          setClientes(r.clientes.items.filter(c => c.estado))
        ),
      ]);
      return res;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { config, historial, clientes, isLoading, isSaving, load, updateConfig, createReferido };
}
