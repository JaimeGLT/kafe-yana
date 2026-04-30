import type { UUID } from './common';

export interface AjusteCantidad {
  insumoId: UUID;
  cantidad: number;
}

export interface VariacionOpcion {
  id: UUID;
  atributoId: UUID;
  nombre: string;
  precioAjuste: number;
  tipoOpcion?: string;
  valorAnterior?: string;
  // Ingredient substitution (reemplazar)
  insumoExtraId?: UUID;
  cantidadExtra?: number;
  insumoReemplazadoId?: UUID;
  // Ingredient quantity overrides (modifica cantidad)
  ajustesCantidad?: AjusteCantidad[];
  // Display info: what ingredient is being swapped/added
  insumoBaseNombre?: string;
  insumoNuevoNombre?: string;
  tipoAjuste?: string;
  ajusteCantidad?: number;
  isActive: boolean;
}

export interface VariacionAtributo {
  id: UUID;
  productId: UUID;
  nombre: string;
  esRequerido: boolean;
  opciones: VariacionOpcion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariacionAtributoInput {
  productId: UUID;
  nombre: string;
  esRequerido?: boolean;
}

export interface VariacionOpcionInput {
  nombre: string;
  precioAjuste?: number;
  insumoExtraId?: UUID;
  cantidadExtra?: number;
  insumoReemplazadoId?: UUID;
  ajustesCantidad?: AjusteCantidad[];
  isActive?: boolean;
  tipoOpcion?: string;
  valorAnterior?: string;
}

// Used in cart when customer has selected options
export interface OpcionSeleccionada {
  atributoId: UUID;
  atributoNombre: string;
  opcionId: UUID;
  opcionNombre: string;
  precioAjuste: number;
  insumoExtraId?: UUID;
  cantidadExtra?: number;
  insumoReemplazadoId?: UUID;
  ajustesCantidad?: AjusteCantidad[];
  insumoBaseNombre?: string;
  insumoNuevoNombre?: string;
  tipoAjuste?: string;
  ajusteCantidad?: number;
  tipoOpcion?: string;
  valorAnterior?: string | null;
  costoExtra?: number | null;
  opcionRaw?: {
    ajustes?: {
      cantidad: number;
      tipoAjuste: string;
      insumoBase?: { nombre: string } | null;
      insumoNuevo?: { nombre: string } | null;
    }[];
  };
}
