import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Insumo, InsumoInput, Receta, RecetaInput } from '../types';

const generateCode = (prefix: string, num: number): string =>
  `${prefix}${String(num).padStart(4, '0')}`;

interface RecipesState {
  insumos: Insumo[];
  recetas: Receta[];

  // Insumo actions
  addInsumo: (input: InsumoInput) => Insumo;
  updateInsumo: (id: string, input: Partial<InsumoInput>) => void;
  deleteInsumo: (id: string) => void;
  getInsumo: (id: string) => Insumo | undefined;

  // Receta actions
  addReceta: (input: RecetaInput, productName: string) => Receta;
  updateReceta: (id: string, input: RecetaInput, productName: string) => void;
  deleteReceta: (id: string) => void;
  getRecetaByProductId: (productId: string) => Receta | undefined;

  // Calculations
  calcularCostoReceta: (recetaId: string) => number;
  recalcularTodasRecetas: () => void;
}

export const useRecipesStore = create<RecipesState>((set, get) => ({
  insumos: [],
  recetas: [],

  // ── Insumos ──────────────────────────────────────────────────────────────
  addInsumo: (input) => {
    const state = get();
    const insumo: Insumo = {
      id: uuidv4(),
      code: generateCode('INS', state.insumos.length + 1),
      name: input.name,
      unit: input.unit,
      unitCost: input.unitCost,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((s) => ({ insumos: [...s.insumos, insumo] }));
    return insumo;
  },

  updateInsumo: (id, input) => {
    set((s) => ({
      insumos: s.insumos.map((ins) =>
        ins.id === id ? { ...ins, ...input, updatedAt: new Date() } : ins
      ),
    }));
    // Recalculate all recipes that use this insumo
    get().recalcularTodasRecetas();
  },

  deleteInsumo: (id) => {
    set((s) => ({ insumos: s.insumos.filter((ins) => ins.id !== id) }));
  },

  getInsumo: (id) => get().insumos.find((ins) => ins.id === id),

  // ── Recetas ──────────────────────────────────────────────────────────────
  addReceta: (input, productName) => {
    const state = get();

    const ingredientes = input.ingredientes.map((ing) => {
      const insumo = state.insumos.find((ins) => ins.id === ing.insumoId);
      const unitCost = insumo?.unitCost ?? 0;
      return {
        id: uuidv4(),
        insumoId: ing.insumoId,
        insumoName: insumo?.name ?? '',
        unit: insumo?.unit ?? '',
        quantity: ing.quantity,
        unitCost,
        subtotal: ing.quantity * unitCost,
      };
    });

    const receta: Receta = {
      id: uuidv4(),
      productId: input.productId,
      productName,
      ingredientes,
      costoTotal: ingredientes.reduce((sum, ing) => sum + ing.subtotal, 0),
      notas: input.notas,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((s) => ({ recetas: [...s.recetas, receta] }));
    return receta;
  },

  updateReceta: (id, input, productName) => {
    const state = get();

    const ingredientes = input.ingredientes.map((ing) => {
      const insumo = state.insumos.find((ins) => ins.id === ing.insumoId);
      const unitCost = insumo?.unitCost ?? 0;
      return {
        id: uuidv4(),
        insumoId: ing.insumoId,
        insumoName: insumo?.name ?? '',
        unit: insumo?.unit ?? '',
        quantity: ing.quantity,
        unitCost,
        subtotal: ing.quantity * unitCost,
      };
    });

    set((s) => ({
      recetas: s.recetas.map((r) =>
        r.id === id
          ? {
              ...r,
              productId: input.productId,
              productName,
              ingredientes,
              costoTotal: ingredientes.reduce((sum, ing) => sum + ing.subtotal, 0),
              notas: input.notas,
              isActive: input.isActive ?? r.isActive,
              updatedAt: new Date(),
            }
          : r
      ),
    }));
  },

  deleteReceta: (id) => {
    set((s) => ({ recetas: s.recetas.filter((r) => r.id !== id) }));
  },

  getRecetaByProductId: (productId) =>
    get().recetas.find((r) => r.productId === productId && r.isActive),

  // ── Calculations ─────────────────────────────────────────────────────────
  calcularCostoReceta: (recetaId) => {
    const state = get();
    const receta = state.recetas.find((r) => r.id === recetaId);
    if (!receta) return 0;

    return receta.ingredientes.reduce((sum, ing) => {
      const insumo = state.insumos.find((ins) => ins.id === ing.insumoId);
      return sum + ing.quantity * (insumo?.unitCost ?? ing.unitCost);
    }, 0);
  },

  recalcularTodasRecetas: () => {
    const state = get();
    set({
      recetas: state.recetas.map((receta) => {
        const ingredientes = receta.ingredientes.map((ing) => {
          const insumo = state.insumos.find((ins) => ins.id === ing.insumoId);
          const unitCost = insumo?.unitCost ?? ing.unitCost;
          return { ...ing, unitCost, subtotal: ing.quantity * unitCost };
        });
        return {
          ...receta,
          ingredientes,
          costoTotal: ingredientes.reduce((sum, ing) => sum + ing.subtotal, 0),
          updatedAt: new Date(),
        };
      }),
    });
  },
}));
