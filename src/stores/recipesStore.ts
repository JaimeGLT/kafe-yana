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

  // Stock management
  updateInsumoStock: (id: string, delta: number) => void; // delta can be negative (consumption)

  // Calculations
  recalcularTodasRecetas: () => void;
}

const buildIngredientes = (
  input: RecetaInput['ingredientes'],
  insumos: Insumo[]
) =>
  input.map((ing) => {
    const insumo = insumos.find((i) => i.id === ing.insumoId);
    const unitCost = insumo?.costoUnitario ?? 0;
    const merma = ing.merma ?? 0;
    const subtotal = ing.quantity * unitCost * (1 + merma / 100);
    return {
      id: uuidv4(),
      insumoId: ing.insumoId,
      insumoName: insumo?.name ?? '',
      unidadMinima: insumo?.unidadMinima ?? '',
      quantity: ing.quantity,
      merma,
      unitCost,
      subtotal,
    };
  });

const costoTotal = (ingredientes: Receta['ingredientes']) =>
  ingredientes.reduce((s, i) => s + i.subtotal, 0);

export const useRecipesStore = create<RecipesState>((set, get) => ({
  insumos: [],
  recetas: [],

  // ── Insumos ──────────────────────────────────────────────────────────────
  addInsumo: (input) => {
    const state = get();
    const costoUnitario =
      input.factorConversion > 0 ? input.costoCompra / input.factorConversion : 0;

    const insumo: Insumo = {
      id: uuidv4(),
      code: generateCode('INS', state.insumos.length + 1),
      name: input.name,
      categoriaInsumo: input.categoriaInsumo,
      unidadMinima: input.unidadMinima,
      unidadCompra: input.unidadCompra,
      factorConversion: input.factorConversion,
      costoCompra: input.costoCompra,
      costoUnitario,
      stock: input.stock,
      stockMinimo: input.stockMinimo,
      proveedorId: input.proveedorId,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((s) => ({ insumos: [...s.insumos, insumo] }));
    return insumo;
  },

  updateInsumo: (id, input) => {
    set((s) => ({
      insumos: s.insumos.map((ins) => {
        if (ins.id !== id) return ins;
        const updated = { ...ins, ...input, updatedAt: new Date() };
        // Recalculate costoUnitario whenever cost or factor changes
        if (input.costoCompra !== undefined || input.factorConversion !== undefined) {
          const costo = input.costoCompra ?? ins.costoCompra;
          const factor = input.factorConversion ?? ins.factorConversion;
          updated.costoUnitario = factor > 0 ? costo / factor : 0;
        }
        return updated;
      }),
    }));
    // Propagate cost change to all recipes
    get().recalcularTodasRecetas();
  },

  deleteInsumo: (id) => {
    set((s) => ({ insumos: s.insumos.filter((i) => i.id !== id) }));
  },

  getInsumo: (id) => get().insumos.find((i) => i.id === id),

  // ── Recetas ──────────────────────────────────────────────────────────────
  addReceta: (input, productName) => {
    const { insumos } = get();
    const porcionesBase = input.porcionesBase > 0 ? input.porcionesBase : 1;
    const ingredientes = buildIngredientes(input.ingredientes, insumos);
    const total = costoTotal(ingredientes);

    const receta: Receta = {
      id: uuidv4(),
      productId: input.productId,
      productName,
      porcionesBase,
      ingredientes,
      costoTotal: total,
      costoPorPorcion: total / porcionesBase,
      notas: input.notas,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((s) => ({ recetas: [...s.recetas, receta] }));
    return receta;
  },

  updateReceta: (id, input, productName) => {
    const { insumos } = get();
    const porcionesBase = input.porcionesBase > 0 ? input.porcionesBase : 1;
    const ingredientes = buildIngredientes(input.ingredientes, insumos);
    const total = costoTotal(ingredientes);

    set((s) => ({
      recetas: s.recetas.map((r) =>
        r.id === id
          ? {
              ...r,
              productId: input.productId,
              productName,
              porcionesBase,
              ingredientes,
              costoTotal: total,
              costoPorPorcion: total / porcionesBase,
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

  // ── Stock management ─────────────────────────────────────────────────────
  updateInsumoStock: (id, delta) => {
    set((s) => ({
      insumos: s.insumos.map((ins) =>
        ins.id === id
          ? { ...ins, stock: Math.max(0, ins.stock + delta), updatedAt: new Date() }
          : ins
      ),
    }));
  },

  // ── Recalculate all recipes when insumo costs change ─────────────────────
  recalcularTodasRecetas: () => {
    const { insumos, recetas } = get();
    set({
      recetas: recetas.map((receta) => {
        const ingredientes = receta.ingredientes.map((ing) => {
          const insumo = insumos.find((i) => i.id === ing.insumoId);
          const unitCost = insumo?.costoUnitario ?? ing.unitCost;
          const subtotal = ing.quantity * unitCost * (1 + ing.merma / 100);
          return { ...ing, unitCost, subtotal };
        });
        const total = costoTotal(ingredientes);
        return {
          ...receta,
          ingredientes,
          costoTotal: total,
          costoPorPorcion: total / receta.porcionesBase,
          updatedAt: new Date(),
        };
      }),
    });
  },
}));
