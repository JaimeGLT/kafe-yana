import { useState, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_PROMOCIONES_PERMANENTES, GET_PRODUCTOS_CANJEABLES } from '../lib/queries/fidelizacion.queries';

export type TipoCondicion = 'NCompras' | 'MontoMinimo' | 'Requeridos';
export type TipoRecompensa = 'PuntosExtra' | 'Descuento' | 'ProductoGratis';

export interface PromocionPermanente {
  id: number;
  nombre: string;
  descripcion: string;
  tipoCondicion: TipoCondicion;
  valorCondicion: number;
  tipoRecompensa: TipoRecompensa;
  valorRecompensa: number;
  activo: boolean;
  id_ProductoCanjeable: number | null;
}

export interface PromocionPermanenteInput {
  Nombre: string;
  Descripcion: string;
  TipoCondicion: TipoCondicion;
  ValorCondicion: number;
  TipoRecompensa: TipoRecompensa;
  ValorRecompensa: number;
  Activo: boolean;
  Id_ProductoCanjeable: number | null;
}

export interface ProductoCanjeable {
  id: number;
  nombreProducto: string;
  puntos: number;
  activo: boolean;
}

interface GqlPromoNode {
  id: number;
  nombre: string;
  descripcion: string;
  tipoCondicion: TipoCondicion;
  valorCondicion: number;
  tipoRecompensa: TipoRecompensa;
  valorRecompensa: number;
  activo: boolean;
  id_ProductoCanjeable: number | null;
}

interface GqlCanjeableNode {
  id: number;
  nombreProducto: string;
  puntos: number;
  activo: boolean;
}

export function usePromocionesPermanentes() {
  const [promociones, setPromociones] = useState<PromocionPermanente[]>([]);
  const [productosCanjeables, setProductosCanjeables] = useState<ProductoCanjeable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promosRes, canjeablesRes] = await Promise.all([
        gql<{ promocionPermanentes: { items: GqlPromoNode[] } }>(GET_PROMOCIONES_PERMANENTES),
        gql<{ productosCanjeables: { items: GqlCanjeableNode[] } }>(GET_PRODUCTOS_CANJEABLES),
      ]);
      setPromociones(promosRes.promocionPermanentes.items);
      setProductosCanjeables(canjeablesRes.productosCanjeables.items.filter(n => n.activo));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(async (input: PromocionPermanenteInput) => {
    setIsSaving(true);
    try {
      await api.post('/PromocionPermanente', input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const update = useCallback(async (id: number, input: PromocionPermanenteInput) => {
    setIsSaving(true);
    try {
      await api.put(`/PromocionPermanente/${id}`, input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const toggle = useCallback(async (promo: PromocionPermanente) => {
    setIsSaving(true);
    try {
      const input: PromocionPermanenteInput = {
        Nombre: promo.nombre,
        Descripcion: promo.descripcion,
        TipoCondicion: promo.tipoCondicion,
        ValorCondicion: promo.valorCondicion,
        TipoRecompensa: promo.tipoRecompensa,
        ValorRecompensa: promo.valorRecompensa,
        Activo: !promo.activo,
        Id_ProductoCanjeable: promo.id_ProductoCanjeable,
      };
      await api.put(`/PromocionPermanente/${promo.id}`, input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const remove = useCallback(async (id: number) => {
    setIsSaving(true);
    try {
      await api.delete(`/PromocionPermanente/${id}`);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  return { promociones, productosCanjeables, isLoading, isSaving, load, create, update, toggle, remove };
}
