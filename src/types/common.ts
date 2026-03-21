// Common types used across the application

export type UUID = string;

export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface FilterOption {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}