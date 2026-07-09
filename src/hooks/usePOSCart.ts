import { useState, useCallback } from 'react';
import type { Product, OpcionSeleccionada } from '../types';
import type { ElaboradoIngrediente } from '../components/modals/ElaboradoDetailModal';
import { toast } from '../components/ui';
import { formatStockQty } from '../utils';

export interface ConsumoInsumo {
  insumoId: string;
  nombre: string;
  cantidad: number;
  tipo: 'base' | 'reemplazo' | 'extra';
}

export interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];
  precioFinal: number;
  cartKey: string;
  notes?: string;
  roundNumber?: number;
  consumoInsumos: ConsumoInsumo[];
  /** Cantidad de este ítem ya descontada por sub-ventas (cobro parcial). */
  cantidadDescontada?: number;
}

export interface RondaRecord {
  number: number;
  sentAt: number;
  subTotal: number;
  rondaId?: number;
}

interface AjusteInfo {
  tipoAjuste: string;
  cantidad: number;
  insumoBase: { id: string; nombre?: string };
  insumoNuevo: { id: string; nombre?: string } | null;
}

export function calcularConsumo(
  recetaDetalles: Array<{ insumo: { id: string; nombre: string }; cantidad: number; merma?: number }>,
  porciones: number,
  opciones: OpcionSeleccionada[],
  ajustesMap: Record<string, AjusteInfo[]>
): ConsumoInsumo[] {
  const p = porciones > 0 ? porciones : 1;
  const consumo: Record<string, { cantidad: number; nombre: string; tipo: 'base' | 'reemplazo' | 'extra' }> = {};

  for (const det of recetaDetalles) {
    const cantidadEfectiva = (det.cantidad / p) * (1 + (det.merma ?? 0) / 100);
    consumo[det.insumo.id] = { cantidad: cantidadEfectiva, nombre: det.insumo.nombre, tipo: 'base' };
  }

  for (const opcion of opciones) {
    const ajustes = ajustesMap[opcion.opcionId] ?? [];
    for (const aj of ajustes) {
      if (aj.tipoAjuste === 'Reemplazo') {
        if (consumo[aj.insumoBase.id]) consumo[aj.insumoBase.id].cantidad = 0;
        if (aj.insumoNuevo) {
          consumo[aj.insumoNuevo.id] = {
            cantidad: aj.cantidad / p,
            nombre: aj.insumoNuevo.nombre ?? aj.insumoNuevo.id,
            tipo: 'reemplazo',
          };
        }
      } else if (aj.tipoAjuste === 'Modificacion') {
        if (consumo[aj.insumoBase.id]) {
          consumo[aj.insumoBase.id].cantidad = aj.cantidad / p;
          consumo[aj.insumoBase.id].tipo = 'reemplazo';
        }
      } else if (aj.tipoAjuste === 'Extra' || aj.tipoAjuste === 'extra') {
        if (aj.insumoNuevo) {
          if (consumo[aj.insumoNuevo.id]) {
            consumo[aj.insumoNuevo.id].cantidad += aj.cantidad / p;
            consumo[aj.insumoNuevo.id].tipo = 'extra';
          } else {
            consumo[aj.insumoNuevo.id] = {
              cantidad: aj.cantidad / p,
              nombre: aj.insumoNuevo.nombre ?? aj.insumoNuevo.id,
              tipo: 'extra',
            };
          }
        }
      }
    }
  }

  return Object.entries(consumo)
    .filter(([, v]) => v.cantidad > 0)
    .map(([insumoId, v]) => ({
      insumoId,
      nombre: v.nombre,
      cantidad: v.cantidad,
      tipo: v.tipo,
    }));
}

export function validarStockDisponible(
  item: CartItem,
  carrito: CartItem[],
  stockInsumos: Record<string, number>
): { valido: boolean; insumoBloqueado?: string; disponible?: number; requerido?: number } {
  const consumoTotal: Record<string, number> = {};

  for (const c of item.consumoInsumos) {
    consumoTotal[c.insumoId] = (consumoTotal[c.insumoId] ?? 0) + c.cantidad * item.quantity;
  }

  for (const i of carrito) {
    if (i.cartKey === item.cartKey) continue;
    for (const c of i.consumoInsumos) {
      consumoTotal[c.insumoId] = (consumoTotal[c.insumoId] ?? 0) + c.cantidad * i.quantity;
    }
  }

  for (const [insumoId, requerido] of Object.entries(consumoTotal)) {
    const disponible = stockInsumos[insumoId] ?? 0;
    if (requerido > disponible) {
      const nombre = item.consumoInsumos.find(c => c.insumoId === insumoId)?.nombre ?? insumoId;
      return { valido: false, insumoBloqueado: nombre, disponible, requerido };
    }
  }

  return { valido: true };
}

export function usePOSCart() {
  const [tempCart, setTempCart] = useState<CartItem[]>([]);
  const [varPickerProduct, setVarPickerProduct] = useState<Product | null>(null);
  const [varPickerDirect, setVarPickerDirect] = useState(false);
  const [comboDetailProduct, setComboDetailProduct] = useState<Product | null>(null);
  const [elaboradoDetailProduct, setElaboradoDetailProduct] = useState<Product | null>(null);
  const [elaboradoIngredientes, setElaboradoIngredientes] = useState<Record<string, ElaboradoIngrediente[]>>({});

  const buildCartKey = (productId: string, opciones?: OpcionSeleccionada[]): string => {
    if (!opciones?.length) return productId;
    const part = [...opciones]
      .sort((a, b) => a.atributoId.localeCompare(b.atributoId))
      .map(o => `${o.atributoId}:${o.opcionId}`)
      .join('|');
    return `${productId}__${part}`;
  };

  const addTempDirect = useCallback((
    product: Product,
    opciones?: OpcionSeleccionada[],
    precioFinal?: number,
    qty = 1,
    consumoInsumos: ConsumoInsumo[] = [],
  ) => {
    const price = precioFinal ?? product.salePrice;
    const key = buildCartKey(product.id, opciones);
    setTempCart(prev => {
      const ex = prev.find(i => i.cartKey === key);
      if (ex) return prev.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { product, quantity: qty, opciones, precioFinal: price, cartKey: key, consumoInsumos }];
    });
  }, []);

  const addDirectToMesa = useCallback((
    order: CartItem[],
    activeMesaId: string | null,
    product: Product,
    opciones?: OpcionSeleccionada[],
    precioFinal?: number,
    consumoInsumos: ConsumoInsumo[] = [],
  ): CartItem[] => {
    if (!activeMesaId) return order;
    const price = precioFinal ?? product.salePrice;
    const key = buildCartKey(product.id, opciones);
    const ex = order.find(i => i.cartKey === key);
    if (ex) {
      return order.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + 1 } : i);
    }
    return [...order, { product, quantity: 1, opciones, precioFinal: price, cartKey: key, consumoInsumos }];
  }, []);

  const incTempQty = useCallback((cartKey: string) => {
    setTempCart(prev => {
      const item = prev.find(i => i.cartKey === cartKey);
      if (!item) return prev;

      if (item.product.tipo === 'elaborado' && !item.product.tieneReceta) {
        return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }

      const stockMax = item.product.tipo === 'elaborado' && !item.product.producible
        ? (item.product.cantidadProducible ?? Number.POSITIVE_INFINITY)
        : item.product.stock;

      const totalInCart = prev
        .filter(i => i.product.id === item.product.id)
        .reduce((s, i) => s + i.quantity, 0);

      if (totalInCart >= stockMax) {
        toast.error('Stock insuficiente', `Solo hay ${formatStockQty(stockMax)} unidad(es) de ${item.product.name}.`);
        return prev;
      }

      return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
    });
  }, []);

  const decTempQty = useCallback((cartKey: string) => {
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  }, []);

  const removeTempItem = useCallback((cartKey: string) => {
    setTempCart(prev => prev.filter(i => i.cartKey !== cartKey));
  }, []);

  const getTempQty = useCallback((productId: string) => {
    return tempCart.filter(i => i.product.id === productId).reduce((s, i) => s + i.quantity, 0);
  }, [tempCart]);

  const updateTempItemNote = useCallback((cartKey: string, notes: string) => {
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, notes } : i));
  }, []);

  const clearTempCart = useCallback(() => {
    setTempCart([]);
  }, []);

  return {
    tempCart,
    setTempCart,
    varPickerProduct,
    setVarPickerProduct,
    varPickerDirect,
    setVarPickerDirect,
    comboDetailProduct,
    setComboDetailProduct,
    elaboradoDetailProduct,
    setElaboradoDetailProduct,
    elaboradoIngredientes,
    setElaboradoIngredientes,
    buildCartKey,
    addTempDirect,
    addDirectToMesa,
    incTempQty,
    decTempQty,
    removeTempItem,
    getTempQty,
    updateTempItemNote,
    clearTempCart,
    validarStockDisponible,
    calcularConsumo,
  };
}
