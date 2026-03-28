import type { UUID, BaseEntity } from './common';

// ── Insumo ────────────────────────────────────────────────────────────────
export interface Insumo extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  categoriaInsumo: string;       // Lácteos, Cafés, Harinas, etc.
  // Unidades
  unidadMinima: string;          // g, ml, unidad — la que se usa en recetas
  unidadCompra: string;          // bolsa, caja, kg — la que se compra
  factorConversion: number;      // cuántas unidades mínimas hay en 1 unidad de compra
  // Costos
  costoCompra: number;           // precio por unidad de compra
  costoUnitario: number;         // CALCULADO: costoCompra / factorConversion
  // Stock
  stock: number;                 // en unidades mínimas
  stockMinimo: number;           // alerta cuando baje de este nivel
  // Opcional
  proveedorId?: UUID;
  isActive: boolean;
}

export interface InsumoInput {
  name: string;
  categoriaInsumo: string;
  unidadMinima: string;
  unidadCompra: string;
  factorConversion: number;
  costoCompra: number;
  stock: number;
  stockMinimo: number;
  proveedorId?: UUID;
  isActive?: boolean;
}

// ── Receta ────────────────────────────────────────────────────────────────
export interface RecetaIngrediente {
  id: UUID;
  insumoId: UUID;
  insumoName: string;
  unidadMinima: string;          // heredada del insumo, no editable
  quantity: number;              // cuántas unidades mínimas usa la receta
  merma: number;                 // % de merma estimada (0-100)
  unitCost: number;              // costoUnitario actual del insumo
  subtotal: number;              // quantity * unitCost * (1 + merma/100)
}

export interface Receta extends BaseEntity {
  id: UUID;
  productId: UUID;
  productName: string;
  nombre?: string;
  porcionesBase: number;         // cuántas porciones produce esta receta
  ingredientes: RecetaIngrediente[];
  costoTotal: number;            // suma de todos los subtotales
  costoPorPorcion: number;       // costoTotal / porcionesBase
  notas?: string;
  isActive: boolean;
}

export interface RecetaInput {
  productId: UUID;
  nombre?: string;
  porcionesBase: number;
  ingredientes: {
    insumoId: UUID;
    quantity: number;
    merma?: number;
  }[];
  notas?: string;
  isActive?: boolean;
}
