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

// Product
export interface Product extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  description?: string;
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
  isService: boolean;
  hasVariations: boolean;
}

export interface ProductInput {
  code?: string;
  name: string;
  description?: string;
  categoryId: UUID;
  brandId?: UUID;
  unit: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  locationId?: UUID;
  barcode?: string;
  image?: string;
  isActive?: boolean;
  isService?: boolean;
  variations?: ProductVariationInput[];
}

// Combo
export interface ComboProduct {
  id: UUID;
  productId: UUID;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Combo extends BaseEntity {
  id: UUID;
  name: string;
  description?: string;
  products: ComboProduct[];
  price: number;
  discount?: number;
  image?: string;
  isActive: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface ComboInput {
  name: string;
  description?: string;
  products: {
    productId: UUID;
    quantity: number;
    unitPrice: number;
  }[];
  price: number;
  discount?: number;
  image?: string;
  isActive?: boolean;
  validFrom?: Date;
  validTo?: Date;
}

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