// Purchases module types

import type { UUID, BaseEntity } from './common';

// Supplier
export interface Supplier extends BaseEntity {
  id: string;
  code: string;
  razon_Social: string;
  dni?: string;
  telefono: string;
  celular?: string;
  email?: string;
  direccion?: string;
  isActive: boolean;
}

export interface SupplierInput {
  razon_Social: string;
  telefono: string;
  dni?: string;
  celular?: string;
  email?: string;
  direccion?: string;
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
  productId?: UUID;
  insumoId?: UUID;
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