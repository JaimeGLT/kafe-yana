import React from 'react';
import { clsx } from 'clsx';
import type { Product } from '../../types';
import { Badge, StatusBadge } from '../ui';
import { Edit, Trash2, Package } from 'lucide-react';

interface InventoryTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onRowClick?: (product: Product) => void;
  isLoading?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onEdit,
  onDelete,
  onRowClick,
  isLoading = false,
}) => {
  const columns = [
    {
      key: 'code',
      header: 'Código',
      width: '100px',
      render: (value: unknown) => (
        <span className="font-mono text-sm text-coffee-600">{String(value)}</span>
      ),
    },
    {
      key: 'name',
      header: 'Producto',
      render: (_value: unknown, row: Product) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img
              src={row.image}
              alt={row.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-coffee-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-coffee-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-coffee-900">{row.name}</p>
            {row.hasVariations && (
              <p className="text-xs text-coffee-500">
                {row.variations.length} variaciones
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Categoría',
      render: (value: unknown) => (
        <Badge variant="default" size="sm">
          {String(value || 'Sin categoría')}
        </Badge>
      ),
    },
    {
      key: 'unit',
      header: 'Unidad',
      width: '80px',
    },
    {
      key: 'salePrice',
      header: 'Precio',
      width: '100px',
      render: (value: unknown) => (
        <span className="font-medium text-coffee-900">
          S/ {Number(value).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      width: '100px',
      render: (value: unknown, row: Product) => {
        const stock = Number(value);
        const stockStatus = stock <= 0 ? 'danger' : stock <= row.minStock ? 'warning' : 'success';
        return (
          <div className="text-center">
            <span
              className={clsx(
                'font-medium',
                stockStatus === 'danger' && 'text-red-600',
                stockStatus === 'warning' && 'text-yellow-600',
                stockStatus === 'success' && 'text-green-600'
              )}
            >
              {stock}
            </span>
            {stock <= row.minStock && (
              <p className="text-xs text-coffee-500">Mín: {row.minStock}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'isActive',
      header: 'Estado',
      width: '100px',
      render: (value: unknown) => (
        <StatusBadge status={value ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (_: unknown, row: Product) => (
        <div className="flex items-center justify-end gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
              className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-coffee-200">
        <thead className="bg-coffee-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(
                  'px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider',
                  column.width && `w-[${column.width}]`
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-coffee-100">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-coffee-500" />
                </div>
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-coffee-500">
                No hay productos disponibles
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr
                key={product.id}
                className={clsx(
                  'transition-colors hover:bg-coffee-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(product)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render
                      ? column.render(product[column.key as keyof Product], product)
                      : String(product[column.key as keyof Product] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};