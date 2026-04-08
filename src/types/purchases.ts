// Purchases module types

import type { UUID, BaseEntity } from './common';

// Supplier
export interface Supplier extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  ruc?: string;
  phone: string;
  mobile?: string;
  email?: string;
  address?: string;
  // legacy fields kept for backend compatibility
  contactName?: string;
  website?: string;
  notes?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currentDebt: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  isActive: boolean;
}

export interface SupplierInput {
  name: string;
  ruc?: string;
  phone: string;
  mobile?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

// Purchase Order Item
export interface PurchaseOrderItem {
  id: UUID;
  productId: UUID;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  receivedQuantity: number;
  pendingQuantity: number;
  notes?: string;
}

export interface PurchaseOrderItemInput {
  productId: UUID;
  quantity: number;
  unitCost: number;
  notes?: string;
}

// Purchase Order
export interface PurchaseOrder extends BaseEntity {
  id: UUID;
  code: string;
  date: Date;
  expectedDate?: Date;
  supplierId: UUID;
  supplierName?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  taxPercentage: number;
  total: number;
  status: 'draft' | 'pending' | 'approved' | 'partial' | 'received' | 'cancelled';
  notes?: string;
  approvedBy?: UUID;
  approvedByName?: string;
  approvedAt?: Date;
  receivedAt?: Date;
  userId: UUID;
  userName?: string;
  branchId: UUID;
  branchName?: string;
}

export interface PurchaseOrderInput {
  supplierId: UUID;
  expectedDate?: Date;
  items: PurchaseOrderItemInput[];
  taxPercentage?: number;
  notes?: string;
}

// Purchase Receipt
export interface PurchaseReceipt extends BaseEntity {
  id: UUID;
  code: string;
  date: Date;
  purchaseOrderId: UUID;
  purchaseOrderCode?: string;
  supplierId: UUID;
  supplierName?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  receivedBy: UUID;
  receivedByName?: string;
}

// Purchases Stats
export interface PurchasesStats {
  totalPurchasesMonth: number;
  pendingOrders: number;
  pendingPayments: number;
  totalSuppliers: number;
}