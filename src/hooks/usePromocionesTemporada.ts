import { useState, useCallback } from 'react';
import { gql } from '../lib/graphql';
import { api } from '../lib/api';
import { GET_PROMOCIONES_TEMPORADA, GET_PRODUCTOS_CANJEABLES } from '../lib/queries/fidelizacion.queries';

export interface ProductoCanjeableItem {
  id: number;
  nombreProducto: string;
  categoria: string;
  puntos: number;
  disponible: string;
  activo: boolean;
}

export interface PromocionTemporada {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  productosCanjeables: ProductoCanjeableItem[];
}

export interface PromocionInput {
  Nombre: string;
  FechaInicio: string;
  FechaFin: string;
  Activo: boolean;
  IdsProductosCanjeables: number[];
}

interface GqlPromocionNode {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  productosCanjeables: {
    idProductoCanjeable: number;
    productoCanjeable: {
      id: number;
      nombreProducto: string;
      categoria: string;
      puntos: number;
      disponible: string;
      activo: boolean;
    };
  }[];
}

interface GqlCanjeableNode {
  id: number;
  nombreProducto: string;
  categoria: string;
  puntos: number;
  disponible: string;
  activo: boolean;
}

export function usePromocionesTemporada() {
  const [promociones, setPromociones] = useState<PromocionTemporada[]>([]);
  const [productosCanjeables, setProductosCanjeables] = useState<ProductoCanjeableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promosRes, canjeablesRes] = await Promise.all([
        gql<{ promocionTemporadas: { items: GqlPromocionNode[] } }>(GET_PROMOCIONES_TEMPORADA),
        gql<{ productosCanjeables: { items: GqlCanjeableNode[] } }>(GET_PRODUCTOS_CANJEABLES),
      ]);

      setPromociones(
        promosRes.promocionTemporadas.items.map(n => ({
          id: n.id,
          nombre: n.nombre,
          fechaInicio: n.fechaInicio,
          fechaFin: n.fechaFin,
          activo: n.activo,
          productosCanjeables: n.productosCanjeables.map(pc => ({
            id: pc.productoCanjeable.id,
            nombreProducto: pc.productoCanjeable.nombreProducto,
            categoria: pc.productoCanjeable.categoria,
            puntos: pc.productoCanjeable.puntos,
            disponible: pc.productoCanjeable.disponible,
            activo: pc.productoCanjeable.activo,
          })),
        }))
      );

      setProductosCanjeables(
        canjeablesRes.productosCanjeables.items.filter(n => n.activo)
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(async (input: PromocionInput) => {
    setIsSaving(true);
    try {
      await api.post('/PromocionTemporada', input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const update = useCallback(async (id: number, input: PromocionInput) => {
    setIsSaving(true);
    try {
      await api.put(`/PromocionTemporada/${id}`, input);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const remove = useCallback(async (id: number) => {
    setIsSaving(true);
    try {
      await api.delete(`/PromocionTemporada/${id}`);
      await load();
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  const toggle = useCallback(async (promo: PromocionTemporada) => {
    await update(promo.id, {
      Nombre: promo.nombre,
      FechaInicio: promo.fechaInicio,
      FechaFin: promo.fechaFin,
      Activo: !promo.activo,
      IdsProductosCanjeables: promo.productosCanjeables.map(pc => pc.id),
    });
  }, [update]);

  return { promociones, productosCanjeables, isLoading, isSaving, load, create, update, remove, toggle };
}
