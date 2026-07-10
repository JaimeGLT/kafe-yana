import { useState, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_HITOS_COMPRA, GET_PRODUCTOS_CANJEABLES } from '../lib/queries/fidelizacion.queries';

export interface HitoProductoCanjeable {
  id: number;
  nombreProducto: string;
  categoria: string;
  puntos: number;
  disponible: string;
  activo: boolean;
}

export interface HitoCompra {
  id: number;
  numeroCompras: number;
  idProductoCanjeable: number;
  descripcion: string;
  icono: string;
  activo: boolean;
  productoCanjeable: HitoProductoCanjeable;
}

export interface HitoInput {
  NumeroCompras: number;
  Id_ProductoCanjeable: number;
  Descripcion: string;
  Icono: string;
  Activo: boolean;
}

interface GqlHitoNode {
  id: number;
  numeroCompras: number;
  idProductoCanjeable: number;
  descripcion: string;
  icono: string;
  activo: boolean;
  productoCanjeable: HitoProductoCanjeable;
}

interface GqlCanjeableNode {
  id: number;
  nombreProducto: string;
  categoria: string;
  puntos: number;
  disponible: string;
  activo: boolean;
}

export function useHitosCompra() {
  const [hitos, setHitos] = useState<HitoCompra[]>([]);
  const [productosCanjeables, setProductosCanjeables] = useState<HitoProductoCanjeable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hitosRes, canjeablesRes] = await Promise.all([
        gql<{ hitosCompra: { items: GqlHitoNode[] } }>(GET_HITOS_COMPRA),
        gql<{ productosCanjeables: { items: GqlCanjeableNode[] } }>(GET_PRODUCTOS_CANJEABLES),
      ]);
      setHitos(hitosRes.hitosCompra.items);
      setProductosCanjeables(canjeablesRes.productosCanjeables.items.filter(n => n.activo));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(async (input: HitoInput) => {
    setIsSaving(true);
    try {
      await api.post('/HitoCompra', input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const update = useCallback(async (id: number, input: HitoInput) => {
    setIsSaving(true);
    try {
      await api.put(`/HitoCompra/${id}`, input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const toggle = useCallback(async (id: number) => {
    setIsSaving(true);
    try {
      await api.patch(`/HitoCompra/${id}/toggle`);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const remove = useCallback(async (id: number) => {
    setIsSaving(true);
    try {
      await api.delete(`/HitoCompra/${id}`);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  return { hitos, productosCanjeables, isLoading, isSaving, load, create, update, toggle, remove };
}
