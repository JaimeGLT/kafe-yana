/**
 * useStockManager
 * Manages stock checking and deduction when a sale is processed.
 *
 * This is a simplified version that works with data passed as parameters
 * instead of using global Zustand stores.
 */

import { useMemo } from 'react';
import type { Product, Insumo, Receta, Combo, OpcionSeleccionada } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];
  precioFinal?: number;
}

export interface StockIssue {
  productName: string;
  issue: string;
  severity: 'error' | 'warning';
}

export interface StockCheckResult {
  canProceed: boolean;
  issues: StockIssue[];
}

interface UseStockManagerProps {
  products: Product[];
  combos: Combo[];
  insumos: Insumo[];
  recetas: Receta[];
}

export const useStockManager = ({ products, combos, insumos, recetas }: UseStockManagerProps) => {
  const getRecetaByProductId = useMemo(() => {
    return (productId: string) => recetas.find((r: any) => r.productoId === productId);
  }, [recetas]);

  /** Returns how many portions of `productId` (elaborado) are possible given current insumo stock */
  const getElaboradoAvailability = (productId: string): number => {
    const receta = getRecetaByProductId(productId);
    if (!receta || receta.ingredientes.length === 0) return 0;

    let minPortions = Infinity;
    for (const ing of receta.ingredientes) {
      const insumo = insumos.find((i) => i.id === ing.insumoId);
      if (!insumo) { minPortions = 0; break; }
      const qtyPerPorcion = (ing.quantity / receta.porcionesBase) * (1 + ing.merma / 100);
      if (qtyPerPorcion <= 0) continue;
      const possible = Math.floor(insumo.stock / qtyPerPorcion);
      if (possible < minPortions) minPortions = possible;
    }
    return minPortions === Infinity ? 0 : minPortions;
  };

  /** Returns how many units of a combo can be sold right now */
  const getComboAvailability = (comboId: string): number => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo || combo.items.length === 0) return 0;

    let minUnits = Infinity;
    for (const item of combo.items) {
      if (item.esOpcional) continue;

      const prod = products.find((p) => p.id === item.productId);
      if (!prod) { minUnits = 0; break; }

      let available: number;
      if (prod.tipo === 'elaborado') {
        available = Math.floor(getElaboradoAvailability(prod.id) / item.quantity);
      } else if (prod.tipo === 'comprado') {
        available = Math.floor(prod.stock / item.quantity);
      } else {
        available = Infinity;
      }

      if (available < minUnits) minUnits = available;
    }
    return minUnits === Infinity ? 0 : minUnits;
  };

  /** Check stock for all items in cart */
  const checkStock = (cart: CartItem[]): StockCheckResult => {
    const issues: StockIssue[] = [];
    let canProceed = true;

    for (const { product, quantity } of cart) {
      if (product.tipo === 'elaborado') {
        const receta = getRecetaByProductId(product.id);
        if (!receta) {
          issues.push({
            productName: product.name,
            issue: 'No tiene receta asignada. No se puede calcular el consumo de ingredientes.',
            severity: 'error',
          });
          canProceed = false;
          continue;
        }

        for (const ing of receta.ingredientes) {
          const insumo = insumos.find((i: Insumo) => i.id === ing.insumoId);
          if (!insumo) {
            issues.push({
              productName: product.name,
              issue: `Insumo "${ing.insumoName}" no encontrado en el inventario.`,
              severity: 'warning',
            });
            continue;
          }
          const needed = (ing.quantity / receta.porcionesBase) * (1 + ing.merma / 100) * quantity;
          if (insumo.stock < needed) {
            issues.push({
              productName: product.name,
              issue: `Stock insuficiente de "${insumo.name}": necesitas ${needed.toFixed(1)} ${insumo.unidadMinima}, disponible: ${insumo.stock} ${insumo.unidadMinima}.`,
              severity: 'warning',
            });
          }
        }
      } else if (product.tipo === 'comprado') {
        if (product.stock < quantity) {
          issues.push({
            productName: product.name,
            issue: `Stock insuficiente: necesitas ${quantity}, disponible: ${product.stock}.`,
            severity: 'warning',
          });
        }
      } else if (product.tipo === 'combo') {
        const combo = combos.find((c: Combo) => c.id === product.id);
        if (!combo) continue;

        for (const item of combo.items) {
          if (item.esOpcional) continue;
          const compProd = products.find((p: Product) => p.id === item.productId);
          if (!compProd) continue;

          const neededQty = item.quantity * quantity;

          if (compProd.tipo === 'elaborado') {
            const receta = getRecetaByProductId(compProd.id);
            if (!receta) {
              issues.push({
                productName: product.name,
                issue: `Componente "${compProd.name}" no tiene receta asignada.`,
                severity: 'error',
              });
              canProceed = false;
              continue;
            }
            for (const ing of receta.ingredientes) {
              const insumo = insumos.find((i: Insumo) => i.id === ing.insumoId);
              if (!insumo) continue;
              const needed = (ing.quantity / receta.porcionesBase) * (1 + ing.merma / 100) * neededQty;
              if (insumo.stock < needed) {
                issues.push({
                  productName: product.name,
                  issue: `Componente "${compProd.name}": stock insuficiente de "${insumo.name}".`,
                  severity: 'warning',
                });
              }
            }
          } else if (compProd.tipo === 'comprado') {
            if (compProd.stock < neededQty) {
              issues.push({
                productName: product.name,
                issue: `Componente "${compProd.name}": necesitas ${neededQty}, disponible: ${compProd.stock}.`,
                severity: 'warning',
              });
            }
          }
        }
      }
    }

    return { canProceed, issues };
  };

  return {
    getElaboradoAvailability,
    getComboAvailability,
    checkStock,
  };
};