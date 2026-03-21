// Cash module types

import type { UUID, BaseEntity } from './common';

// Cash Movement
export interface CashMovement {
  id: UUID;
  type: 'income' | 'expense';
  category: string;
  concept: string;
  amount: number;
  date: Date;
  reference?: string;
  notes?: string;
  userId: UUID;
  userName?: string;
}

export interface CashMovementInput {
  type: 'income' | 'expense';
  category: string;
  concept: string;
  amount: number;
  date?: Date;
  reference?: string;
  notes?: string;
}

// Cash Register
export interface CashRegister extends BaseEntity {
  id: UUID;
  code: string;
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;
  expectedBalance: number;
  actualBalance?: number;
  difference?: number;
  status: 'open' | 'closed';
  movements: CashMovement[];
  sales: UUID[];
  totalSales: number;
  totalIncome: number;
  totalExpense: number;
  userId: UUID;
  userName?: string;
  branchId: UUID;
  branchName?: string;
}

export interface CashRegisterInput {
  openingBalance: number;
}

export interface CashRegisterCloseInput {
  actualBalance: number;
  notes?: string;
}

// Cash Movement Category
export interface CashCategory {
  id: UUID;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  isActive: boolean;
}

// Cash Summary
export interface CashSummary {
  openingBalance: number;
  totalSales: number;
  totalIncome: number;
  totalExpense: number;
  expectedBalance: number;
}

// Cash Stats
export interface CashStats {
  cashInRegisters: number;
  todaySales: number;
  todayIncome: number;
  todayExpense: number;
  openRegisters: number;
}

// Denominations for cash count
export interface CashDenomination {
  value: number;
  type: 'bill' | 'coin';
  quantity: number;
  total: number;
}

export interface CashCount {
  denominations: CashDenomination[];
  total: number;
}