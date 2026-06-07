// Inventory module types

import type { UUID, BaseEntity, Status } from './common';

// Category
export interface Category extends BaseEntity {
  id: UUID;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: UUID;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface CategoryInput {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: UUID;
  sortOrder?: number;
  isActive?: boolean;
}

// Brand
export interface Brand extends BaseEntity {
  id: UUID;
  name: string;
  description?: string;
  country?: string;
  isActive: boolean;
}

export interface BrandInput {
  name: string;
  description?: string;
  country?: string;
  isActive?: boolean;
}

// Location
export interface Location extends BaseEntity {
  id: UUID;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface LocationInput {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

// Product Variation
export interface ProductVariation {
  id: UUID;
  productId: UUID;
  name: string;
  sku: string;
  priceAdjustment: number;
  stock: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
}

export interface ProductVariationInput {
  name: string;
  sku?: string;
  priceAdjustment: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
}

// Product type enum
export type ProductTipo = 'comprado' | 'elaborado' | 'combo';

// Product destination
export type ProductDestino = 'barra' | 'cocina' | 'sin_destino';

// Product
export interface Product extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  description?: string;
  tipo: ProductTipo;
  categoryId: UUID;
  categoryName?: string;
  brandId?: UUID;
  brandName?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  stock: number;
  minStock: number;
  maxStock: number;
  locationId?: UUID;
  locationName?: string;
  variations: ProductVariation[];
  barcode?: string;
  image?: string;
  isActive: boolean;
  hasVariations: boolean;
  destino?: ProductDestino;
  producible?: boolean;
  /** Cantidad producible del elaborado (para al_momento) */
  cantidadProducible?: number;
  tieneReceta?: boolean;
  /** Used for elaborados: how many portions the recipe produces */
  porcionesBase?: number;
  /** For elaborados: ID of the associated recipe (recipeId) */
  recetaId?: string;
  comboComponentes?: Array<{ nombre: string; cantidad: number; tipo: string; ubicacion?: string }>;
  codigoSin?: string;
}

export interface ProductInput {
  code?: string;
  name: string;
  description?: string;
  tipo: ProductTipo;
  categoryId: string;
  brandId?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  locationId?: string;
  barcode?: string;
  imagen?: string;
  isActive?: boolean;
  variations?: unknown[];
  destino?: ProductDestino;
  codigoSin?: string;
}

// Combo
export interface ComboItem {
  id: UUID;
  productId: UUID;
  productName: string;
  productTipo: ProductTipo;
  quantity: number;
  /** Unit cost of this component (costPrice or costoPorPorcion for elaborados) */
  unitCost: number;
  /** Whether the client can skip this item (optional choice) */
  esOpcional: boolean;
}

export interface Combo extends BaseEntity {
  id: UUID;
  name: string;
  description?: string;
  items: ComboItem[];
  /** Special combo price shown to the customer */
  price: number;
  /** Auto-calculated: sum of each item's unitCost × quantity */
  costoTotal: number;
  /** Quantity producible today (from backend cantidadProducible) */
  availability: number;
  image?: string;
  isActive: boolean;
  codigoSin?: string;
}

export interface ComboItemInput {
  productId: UUID;
  quantity: number;
  esOpcional?: boolean;
}

export interface ComboInput {
  name: string;
  description?: string;
  items: ComboItemInput[];
  price: number;
  image?: string;
  isActive?: boolean;
  codigoSin?: string;
}

// Keep for backwards compat (old code may reference ComboProduct)
export type ComboProduct = ComboItem;

// Stock Adjustment
export interface StockAdjustmentItem {
  productId: UUID;
  productName: string;
  previousStock: number;
  adjustment: number;
  newStock: number;
  reason?: string;
}

export interface StockAdjustment extends BaseEntity {
  id: UUID;
  code: string;
  type: 'positive' | 'negative';
  date: Date;
  reason: string;
  notes?: string;
  items: StockAdjustmentItem[];
  userId: UUID;
  userName?: string;
  status: Status;
}

export interface StockAdjustmentInput {
  type: 'positive' | 'negative';
  reason: string;
  notes?: string;
  items: {
    productId: UUID;
    adjustment: number;
    reason?: string;
  }[];
}

// Kardex Movement
export interface KardexMovement {
  id: UUID;
  date: Date;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'initial';
  reference: string;
  referenceId?: UUID;
  quantity: number;
  unitCost: number;
  totalCost: number;
  stockAfter: number;
  notes?: string;
}

// Inventory Stats
export interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  categoriesCount: number;
}