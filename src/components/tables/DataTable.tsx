import React from 'react';
import { clsx } from 'clsx';
import { Table, Pagination } from '../ui';

interface DataTableProps<T> {
  columns: Array<{
    key: string;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
  }>;
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  pagination,
  className,
}: DataTableProps<T>): React.ReactElement {
  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden', className)}>
      <Table
        columns={columns}
        data={data}
        keyField={keyField}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
      />
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}