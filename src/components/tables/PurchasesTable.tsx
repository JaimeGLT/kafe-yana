import React from 'react';
import type { PurchaseOrder } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, PackageCheck, XCircle, ShoppingCart } from 'lucide-react';

interface PurchasesTableProps {
  orders: PurchaseOrder[];
  onView?: (order: PurchaseOrder) => void;
  onReceive?: (order: PurchaseOrder) => void;
  onCancel?: (order: PurchaseOrder) => void;
  isLoading?: boolean;
}

const STATUS_PILL: Record<PurchaseOrder['status'], { label: string; cls: string }> = {
  draft:     { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  pending:   { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  partial:   { label: 'Parcial',   cls: 'bg-blue-100 text-blue-700' },
  received:  { label: 'Recibida',  cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-600' },
};

export const PurchasesTable: React.FC<PurchasesTableProps> = ({
  orders,
  onView,
  onReceive,
  onCancel,
  isLoading = false,
}) => {
  const fmtDate = (date: Date) => format(new Date(date), 'dd MMM yyyy', { locale: es });
  const fmtCurrency = (n: number) => `S/ ${n.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
        <table className="min-w-full">
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-coffee-50">
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 bg-coffee-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-coffee-100 shadow-sm flex flex-col items-center justify-center py-16 text-coffee-400">
        <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
        <p className="font-medium text-coffee-600">Sin órdenes de compra</p>
        <p className="text-sm mt-1">Crea tu primera orden con el botón Nueva Orden.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-coffee-100">
        <thead className="bg-coffee-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Código</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Fecha</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Proveedor</th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-coffee-500 uppercase tracking-wide">Ítems</th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Total</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Estado</th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-coffee-50">
          {orders.map((order) => {
            const sp = STATUS_PILL[order.status];
            const canReceive = order.status === 'pending' || order.status === 'approved';
            const canCancel = order.status === 'pending' || order.status === 'draft' || order.status === 'approved';
            return (
              <tr
                key={order.id}
                className="hover:bg-coffee-50/60 transition-colors cursor-pointer"
                onClick={() => onView?.(order)}
              >
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="font-mono text-sm font-semibold text-coffee-700">{order.code}</span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-sm text-coffee-600">
                  {fmtDate(order.date)}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <p className="text-sm font-medium text-coffee-900">{order.supplierName || '—'}</p>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-center">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-coffee-100 text-coffee-600 text-xs font-bold">
                    {order.items.length}
                  </span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-right">
                  <span className="text-sm font-bold text-coffee-900">{fmtCurrency(order.total)}</span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sp.cls}`}>
                    {sp.label}
                  </span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {onView && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-400 hover:text-coffee-700 transition-colors"
                        onClick={() => onView(order)}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {onReceive && canReceive && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-coffee-400 hover:text-emerald-600 transition-colors"
                        onClick={() => onReceive(order)}
                        title="Marcar como recibida"
                      >
                        <PackageCheck className="h-4 w-4" />
                      </button>
                    )}
                    {onCancel && canCancel && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-red-50 text-coffee-400 hover:text-red-500 transition-colors"
                        onClick={() => onCancel(order)}
                        title="Cancelar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
