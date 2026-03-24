// Sales module types

import type { UUID, BaseEntity } from './common';

// Customer
export interface Customer extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  ruc?: string;
  notes?: string;
  creditLimit?: number;
  currentCredit?: number;
  totalPurchases: number;
  lastPurchaseDate?: Date;
  isActive: boolean;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  ruc?: string;
  notes?: string;
  creditLimit?: number;
  isActive?: boolean;
}

// Payment Method
export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'credit' | 'mixed';

export interface PaymentMethod {
  id: UUID;
  type: PaymentMethodType;
  name: string;
  amount: number;
  reference?: string;
}

// Sale Item
export interface SaleItem {
  id: UUID;
  productId: UUID;
  productName: string;
  productCode: string;
  variationId?: UUID;
  variationName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface SaleItemInput {
  productId: UUID;
  variationId?: UUID;
  quantity: number;
  discount?: number;
  notes?: string;
}

// Sale
export interface Sale extends BaseEntity {
  id: UUID;
  code: string;
  date: Date;
  customerId?: UUID;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  taxPercentage: number;
  total: number;
  paymentMethods: PaymentMethod[];
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  cashierId: UUID;
  cashierName?: string;
  branchId: UUID;
  branchName?: string;
}

export interface SaleInput {
  customerId?: UUID;
  items: SaleItemInput[];
  discount?: number;
  taxPercentage?: number;
  paymentMethods: {
    type: PaymentMethodType;
    amount: number;
    reference?: string;
  }[];
  notes?: string;
}

// Quote
export interface Quote extends BaseEntity {
  id: UUID;
  code: string;
  date: Date;
  validUntil: Date;
  customerId?: UUID;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  convertedToSaleId?: UUID;
}

export interface QuoteInput {
  customerId?: UUID;
  items: SaleItemInput[];
  validUntil: Date;
  discount?: number;
  notes?: string;
}

// Invoice
export interface Invoice extends BaseEntity {
  id: UUID;
  code: string;
  saleId: UUID;
  saleCode?: string;
  date: Date;
  dueDate?: Date;
  customerId?: UUID;
  customerName?: string;
  nit?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: Date;
  notes?: string;
}

// Accounts Receivable
export interface AccountsReceivable extends BaseEntity {
  id: UUID;
  code: string;
  saleId: UUID;
  saleCode?: string;
  customerId: UUID;
  customerName?: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  date: Date;
  dueDate: Date;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  payments: ReceivablePayment[];
}

export interface ReceivablePayment {
  id: UUID;
  date: Date;
  amount: number;
  method: PaymentMethodType;
  reference?: string;
  notes?: string;
}

export interface ReceivablePaymentInput {
  receivableId: UUID;
  amount: number;
  method: PaymentMethodType;
  reference?: string;
  notes?: string;
}

// Sales Stats
export interface SalesStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  totalProductsSold: number;
  averageTicket: number;
  pendingQuotes: number;
  pendingReceivables: number;
}