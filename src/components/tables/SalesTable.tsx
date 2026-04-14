import React from 'react';
import { clsx } from 'clsx';
import type { Sale } from '../../types';
import { StatusBadge, Badge } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, FileText } from 'lucide-react';

interface SalesTableProps {
  sales: Sale[];
  onView?: (sale: Sale) => void;
  onInvoice?: (sale: Sale) => void;
  isLoading?: boolean;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onView,
  onInvoice,
  isLoading = false,
}) => {
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es });
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
      width: '160px',
      render: (value: unknown) => (
        <span className="text-sm text-coffee-700">{formatDate(value as Date)}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Cliente',
      render: (value: unknown) => (
        <span className="text-coffee-900">{String(value || 'Cliente General')}</span>
      ),
    },
    {
      key: 'items',
      header: 'Productos',
      width: '80px',
      render: (value: unknown) => (
        <Badge variant="info" size="sm">
          {(value as unknown[]).length} items
        </Badge>
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
      key: 'paymentMethods',
      header: 'Pago',
      width: '100px',
      render: (value: unknown) => {
        const methods = value as { type: string }[];
        const methodNames: Record<string, string> = {
          cash: 'Efectivo',
          card: 'Tarjeta',
          transfer: 'Transferencia',
          credit: 'Crédito',
        };
        return (
          <span className="text-sm text-coffee-600">
            {methods?.map(m => methodNames[m.type] || m.type).join(', ') || 'N/A'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      width: '100px',
      render: (value: unknown) => {
        return (
          <StatusBadge
            status={
              value === 'completed'  ? 'completed'  :
              value === 'pending'    ? 'pending'    :
              value === 'cancelled'  ? 'cancelled'  :
              value === 'refunded'   ? 'refunded'   :
              'active'
            }
          />
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (_: unknown, row: Sale) => (
        <div className="flex items-center justify-end gap-1">
          {onView && (
            <button
              className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
              onClick={() => onView(row)}
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {onInvoice && row.status === 'completed' && (
            <button
              className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
              onClick={() => onInvoice(row)}
            >
              <FileText className="h-4 w-4" />
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
                  'px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider'
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
          ) : sales.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-coffee-500">
                No hay ventas registradas
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-coffee-50 transition-colors">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render(sale[column.key as keyof Sale], sale)}
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