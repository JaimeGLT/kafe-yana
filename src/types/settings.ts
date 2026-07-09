// Settings module types

import type { UUID, BaseEntity } from './common';

// User
export interface User extends BaseEntity {
  id: UUID;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  roleId: UUID;
  roleName?: string;
  branchId?: UUID;
  branchName?: string;
  isActive: boolean;
  lastLogin?: Date;
}

export interface UserInput {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  roleId: UUID;
  branchId?: UUID;
  isActive?: boolean;
}

// Role & Permissions
export type Permission =
  | 'dashboard.view'
  | 'inventory.view' | 'inventory.create' | 'inventory.edit' | 'inventory.delete'
  | 'sales.view' | 'sales.create' | 'sales.edit' | 'sales.delete' | 'sales.pos'
  | 'purchases.view' | 'purchases.create' | 'purchases.edit' | 'purchases.delete'
  | 'cash.view' | 'cash.create' | 'cash.edit' | 'cash.delete'
  | 'reports.view'
  | 'settings.view' | 'settings.edit';

export interface Role extends BaseEntity {
  id: UUID;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  isActive: boolean;
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: Permission[];
  isActive?: boolean;
}

// Branch
export interface Branch extends BaseEntity {
  id: UUID;
  code: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  managerId?: UUID;
  managerName?: string;
  isActive: boolean;
}

export interface BranchInput {
  code: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  managerId?: UUID;
  isActive?: boolean;
}

// System Settings
export interface SystemSettings {
  companyName: string;
  companyLogo?: string;
  companyRuc?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  currency: string;
  currencySymbol: string;
  taxPercentage: number;
  invoicePrefix: string;
  purchaseOrderPrefix: string;
  receiptPrefix: string;
  defaultPaymentTerms: number;
  lowStockAlert: boolean;
  lowStockThreshold: number;
}

export interface SystemSettingsInput {
  companyName?: string;
  companyLogo?: string;
  companyRuc?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  currency?: string;
  currencySymbol?: string;
  taxPercentage?: number;
  invoicePrefix?: string;
  purchaseOrderPrefix?: string;
  receiptPrefix?: string;
  defaultPaymentTerms?: number;
  lowStockAlert?: boolean;
  lowStockThreshold?: number;
}

// App State
export interface AppState {
  currentUser: User | null;
  currentBranch: Branch | null;
  settings: SystemSettings;
  isLoading: boolean;
  error: string | null;
}