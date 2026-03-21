import type { UUID, BaseEntity } from './common';

// ── Insumo ────────────────────────────────────────────────────────────────
export interface Insumo extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  unit: string;       // ml, g, unidad, kg, l, etc.
  unitCost: number;   // costo por 1 unidad
  isActive: boolean;
}

export interface InsumoInput {
  name: string;
  unit: string;
  unitCost: number;
  isActive?: boolean;
}

// ── Receta ────────────────────────────────────────────────────────────────
export interface RecetaIngrediente {
  id: UUID;
  insumoId: UUID;
  insumoName: string;
  unit: string;
  quantity: number;   // cuántas unidades del insumo
  unitCost: number;   // costo/unidad al momento de guardar
  subtotal: number;   // quantity * unitCost (recalculado siempre desde insumo)
}

export interface Receta extends BaseEntity {
  id: UUID;
  productId: UUID;
  productName: string;
  ingredientes: RecetaIngrediente[];
  costoTotal: number; // suma de todos los subtotales
  notas?: string;
  isActive: boolean;
}

export interface RecetaInput {
  productId: UUID;
  ingredientes: {
    insumoId: UUID;
    quantity: number;
  }[];
  notas?: string;
  isActive?: boolean;
}
