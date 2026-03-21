import React from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  className?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  isLoading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  sortable = false,
  defaultSortField,
  defaultSortOrder = 'asc',
  onSort,
  className,
}: TableProps<T>): React.ReactElement {
  const [sortField, setSortField] = React.useState(defaultSortField);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(defaultSortOrder);

  const handleSort = (field: string) => {
    if (!sortable) return;

    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    onSort?.(field, newOrder);
  };

  const getValue = (row: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = row;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-coffee-200">
        <thead className="bg-coffee-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(
                  'px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider',
                  column.sortable !== false && sortable && 'cursor-pointer hover:bg-coffee-100'
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable !== false && sortable && sortField === column.key && (
                    sortOrder === 'asc' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-coffee-100">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-coffee-500" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-coffee-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                className={clsx(
                  'transition-colors hover:bg-coffee-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-coffee-900">
                    {column.render
                      ? column.render(getValue(row, column.key), row)
                      : String(getValue(row, column.key) ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-coffee-100">
      <div className="flex items-center text-sm text-coffee-600">
        {totalItems !== undefined && (
          <span>
            Mostrando {startItem} a {endItem} de {totalItems} resultados
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm text-coffee-600 hover:bg-coffee-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={clsx(
                'px-3 py-1 text-sm rounded',
                currentPage === pageNum
                  ? 'bg-coffee-500 text-white'
                  : 'text-coffee-600 hover:bg-coffee-50'
              )}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm text-coffee-600 hover:bg-coffee-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};