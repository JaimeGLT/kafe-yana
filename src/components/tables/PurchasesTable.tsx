import React from 'react';
import type { PurchaseOrder } from '../../types';
import { StatusBadge } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

interface PurchasesTableProps {
  orders: PurchaseOrder[];
  onView?: (order: PurchaseOrder) => void;
  onApprove?: (order: PurchaseOrder) => void;
  onCancel?: (order: PurchaseOrder) => void;
  isLoading?: boolean;
}

export const PurchasesTable: React.FC<PurchasesTableProps> = ({
  orders,
  onView,
  onApprove,
  onCancel,
  isLoading = false,
}) => {
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: es });
  };

  const columns = [
    {
      key: 'code',
      header: 'Código',
      width: '120px',
      render: (value: unknown) => (
        <span className="font-mono text-sm text-coffee-600">{String(value)}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      width: '120px',
      render: (value: unknown) => (
        <span className="text-sm text-coffee-700">{formatDate(value as Date)}</span>
      ),
    },
    {
      key: 'supplierName',
      header: 'Proveedor',
      render: (value: unknown) => (
        <span className="text-coffee-900">{String(value || 'N/A')}</span>
      ),
    },
    {
      key: 'items',
      header: 'Productos',
      width: '80px',
      render: (value: unknown) => (
        <span className="text-sm text-coffee-600">
          {(value as unknown[]).length} items
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      width: '120px',
      render: (value: unknown) => (
        <span className="font-semibold text-coffee-900">
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '100px',
      render: (value: unknown) => {
        return <StatusBadge status={value as PurchaseOrder['status'] === 'received' ? 'completed' : value as PurchaseOrder['status'] === 'cancelled' ? 'cancelled' : 'pending'} />;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (_: unknown, row: PurchaseOrder) => (
        <div className="flex items-center justify-end gap-1">
          {onView && (
            <button
              className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
              onClick={() => onView(row)}
              title="Ver detalles"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onApprove && row.status === 'pending' && (
            <button
              className="p-1.5 rounded-lg hover:bg-green-100 text-green-500 hover:text-green-700"
              onClick={() => onApprove(row)}
              title="Aprobar"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          {onCancel && (row.status === 'draft' || row.status === 'pending') && (
            <button
              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700"
              onClick={() => onCancel(row)}
              title="Cancelar"
            >
              <XCircle className="h-4 w-4" />
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
                className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
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
          ) : orders.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-coffee-500">
                No hay órdenes de compra
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="hover:bg-coffee-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render(order[column.key as keyof PurchaseOrder], order)}
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