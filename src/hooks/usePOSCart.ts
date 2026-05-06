import { useState, useCallback } from 'react';
import type { Product, OpcionSeleccionada } from '../types';
import type { Reward } from '../types/loyalty';
import type { ElaboradoIngrediente } from '../components/modals/ElaboradoDetailModal';

export interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];
  precioFinal: number;
  cartKey: string;
  redeemRewardId?: string;
  notes?: string;
  roundNumber?: number;
}

export interface RondaRecord {
  number: number;
  sentAt: number;
  subTotal: number;
}

export function usePOSCart() {
  const [tempCart, setTempCart] = useState<CartItem[]>([]);
  const [varPickerProduct, setVarPickerProduct] = useState<Product | null>(null);
  const [varPickerDirect, setVarPickerDirect] = useState(false);
  const [varPickerRewardId, setVarPickerRewardId] = useState<string | null>(null);
  const [redeemQtyState, setRedeemQtyState] = useState<{ product: Product; reward: Reward } | null>(null);
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
  ) => {
    const price = precioFinal ?? product.salePrice;
    const key = buildCartKey(product.id, opciones);
    setTempCart(prev => {
      const ex = prev.find(i => i.cartKey === key);
      if (ex) return prev.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, opciones, precioFinal: price, cartKey: key }];
    });
  }, []);

  const addRedeemToTempCart = useCallback((
    product: Product,
    rewardId: string,
    opciones: OpcionSeleccionada[] | undefined,
    qty = 1,
  ) => {
    const newItems = Array.from({ length: qty }, (_, i) => ({
      product,
      quantity: 1,
      precioFinal: 0,
      cartKey: `${product.id}__canje__${Date.now()}_${i}`,
      redeemRewardId: rewardId,
      ...(opciones ? { opciones } : {}),
    }));
    setTempCart(prev => [...prev, ...newItems]);
  }, []);

  const addDirectToMesa = useCallback((
    order: CartItem[],
    activeMesaId: string | null,
    product: Product,
    opciones?: OpcionSeleccionada[],
    precioFinal?: number,
  ): CartItem[] => {
    if (!activeMesaId) return order;
    const price = precioFinal ?? product.salePrice;
    const key = buildCartKey(product.id, opciones);
    const ex = order.find(i => i.cartKey === key);
    if (ex) {
      return order.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + 1 } : i);
    }
    return [...order, { product, quantity: 1, opciones, precioFinal: price, cartKey: key }];
  }, []);

  const incTempQty = useCallback((cartKey: string) => {
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i));
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
    varPickerRewardId,
    setVarPickerRewardId,
    redeemQtyState,
    setRedeemQtyState,
    comboDetailProduct,
    setComboDetailProduct,
    elaboradoDetailProduct,
    setElaboradoDetailProduct,
    elaboradoIngredientes,
    setElaboradoIngredientes,
    buildCartKey,
    addTempDirect,
    addRedeemToTempCart,
    addDirectToMesa,
    incTempQty,
    decTempQty,
    removeTempItem,
    getTempQty,
    updateTempItemNote,
    clearTempCart,
  };
}
