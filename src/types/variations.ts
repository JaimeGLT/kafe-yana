import type { UUID } from './common';

export interface VariacionOpcion {
  id: UUID;
  atributoId: UUID;
  nombre: string;
  precioAjuste: number;
  // Optional ingredient override for this option
  insumoExtraId?: UUID;
  cantidadExtra?: number;
  insumoReemplazadoId?: UUID; // which base recipe ingredient this replaces
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
  isActive?: boolean;
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
}
