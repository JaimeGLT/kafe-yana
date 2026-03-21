/**
 * useStockManager
 * Manages stock checking and deduction when a sale is processed.
 *
 * Logic per product tipo:
 *  - comprado  → deducts product.stock in inventoryStore
 *  - elaborado → finds recipe, deducts insumo.stock for each ingredient
 *  - combo     → iterates combo items; each item follows its own tipo logic
 */

import { useInventoryStore, useRecipesStore } from '../stores';
import type { Product, OpcionSeleccionada } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];  // selected variation options (if any)
  precioFinal?: number;             // override price if variations applied
}

export interface StockIssue {
  productName: string;
  issue: string;
  severity: 'error' | 'warning';
}

export interface StockCheckResult {
  canProceed: boolean;           // false only if a required recipe is MISSING
  issues: StockIssue[];          // warnings for low/missing insumos
}

/** How many portions of an elaborado can be made right now from insumo stock */
export const useStockManager = () => {
  const { products, combos, updateProduct } = useInventoryStore();
  const { insumos, recetas, updateInsumoStock, getRecetaByProductId } = useRecipesStore();

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

  /** Returns how many units of a combo can be sold right now (min across all required items) */
  const getComboAvailability = (comboId: string): number => {
    const combo = combos.find((c) => c.id === comboId);
    if (!combo || combo.items.length === 0) return 0;

    let minUnits = Infinity;
    for (const item of combo.items) {
      if (item.esOpcional) continue; // optional items don't block the combo

      const prod = products.find((p) => p.id === item.productId);
      if (!prod) { minUnits = 0; break; }

      let available: number;
      if (prod.tipo === 'elaborado') {
        available = Math.floor(getElaboradoAvailability(prod.id) / item.quantity);
      } else if (prod.tipo === 'comprado') {
        available = Math.floor(prod.stock / item.quantity);
      } else {
        available = Infinity; // otros tipos — sin límite
      }

      if (available < minUnits) minUnits = available;
    }
    return minUnits === Infinity ? 0 : minUnits;
  };

  /** Check stock for all items in cart before processing */
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
          const insumo = insumos.find((i) => i.id === ing.insumoId);
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
        // For combos: check each required component's stock
        const combo = combos.find((c) => c.id === product.id);
        if (!combo) continue;

        for (const item of combo.items) {
          if (item.esOpcional) continue;
          const compProd = products.find((p) => p.id === item.productId);
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
              const insumo = insumos.find((i) => i.id === ing.insumoId);
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

  /** Deduct stock for all items after a successful sale */
  const deductStock = (cart: CartItem[]) => {
    for (const { product, quantity, opciones } of cart) {
      if (product.tipo === 'elaborado') {
        const receta = getRecetaByProductId(product.id);
        if (!receta) continue;

        // Build set of insumo IDs that are replaced by variation options
        const replacedInsumoIds = new Set<string>();
        if (opciones && opciones.length > 0) {
          for (const opcion of opciones) {
            if (opcion.insumoReemplazadoId) {
              replacedInsumoIds.add(opcion.insumoReemplazadoId);
            }
          }
        }

        // Deduct base recipe ingredients (skip replaced ones)
        for (const ing of receta.ingredientes) {
          if (replacedInsumoIds.has(ing.insumoId)) continue;
          const needed = (ing.quantity / receta.porcionesBase) * (1 + ing.merma / 100) * quantity;
          updateInsumoStock(ing.insumoId, -needed);
        }

        // Deduct extra insumos from variation options
        if (opciones && opciones.length > 0) {
          for (const opcion of opciones) {
            if (opcion.insumoExtraId && opcion.cantidadExtra) {
              updateInsumoStock(opcion.insumoExtraId, -(opcion.cantidadExtra * quantity));
            }
          }
        }
      } else if (product.tipo === 'comprado') {
        const prod = products.find((p) => p.id === product.id);
        if (prod) {
          updateProduct(prod.id, { stock: Math.max(0, prod.stock - quantity) });
        }
      } else if (product.tipo === 'combo') {
        // Deduct each required component
        const combo = combos.find((c) => c.id === product.id);
        if (!combo) continue;

        for (const item of combo.items) {
          if (item.esOpcional) continue;
          const compProd = products.find((p) => p.id === item.productId);
          if (!compProd) continue;

          const neededQty = item.quantity * quantity;

          if (compProd.tipo === 'elaborado') {
            const receta = getRecetaByProductId(compProd.id);
            if (!receta) continue;
            for (const ing of receta.ingredientes) {
              const needed = (ing.quantity / receta.porcionesBase) * (1 + ing.merma / 100) * neededQty;
              updateInsumoStock(ing.insumoId, -needed);
            }
          } else if (compProd.tipo === 'comprado') {
            updateProduct(compProd.id, { stock: Math.max(0, compProd.stock - neededQty) });
          }
        }
      }
    }
  };

  return {
    getElaboradoAvailability,
    getComboAvailability,
    checkStock,
    deductStock,
    insumos,
    recetas,
    combos,
  };
};
