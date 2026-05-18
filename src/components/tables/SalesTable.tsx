import React from 'react';
import { clsx } from 'clsx';
import type { Sale } from '../../types';
import { StatusBadge, Badge } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, FileText, RotateCcw, Printer } from 'lucide-react';

interface SalesTableProps {
  sales: Sale[];
  onView?: (sale: Sale) => void;
  onInvoice?: (sale: Sale) => void;
  onRefund?: (sale: Sale) => void;
  onPrint?: (sale: Sale) => void;
  isLoading?: boolean;
}

const formatCurrency = (amount: number) => `S/ ${amount.toFixed(2)}`;
const formatDate = (date: Date) => format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es });
const formatDateShort = (date: Date) => format(new Date(date), 'dd MMM · HH:mm', { locale: es });

const PAYMENT_NAMES: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  qr: 'QR',
};

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onView,
  onInvoice,
  onRefund,
  onPrint,
  isLoading = false,
}) => {
  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">

      {/* ── Mobile: cards ───────────────────────────────────────────── */}
      <div className="sm:hidden divide-y divide-coffee-50">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4 space-y-2 animate-pulse">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-coffee-200 rounded" />
                <div className="h-4 w-16 bg-coffee-100 rounded" />
              </div>
              <div className="h-4 w-40 bg-coffee-200 rounded" />
              <div className="h-3 w-28 bg-coffee-100 rounded" />
            </div>
          ))
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-coffee-500 text-sm">No hay ventas registradas</div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="px-4 py-4 space-y-3">
              {/* Fila 1: código + total */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-coffee-400">{sale.code}</span>
                <span className="font-bold text-coffee-900 text-base">{formatCurrency(sale.total)}</span>
              </div>

              {/* Fila 2: cliente + estado */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-coffee-800 truncate">
                  {sale.customerName || 'Cliente General'}
                </p>
                <StatusBadge status={
                  sale.status === 'completed'          ? 'completed' :
                  sale.status === 'refunded'           ? 'refunded'  :
                  sale.status === 'partially_refunded' ? 'refunded'  : 'active'
                } />
              </div>

              {/* Fila 3: fecha + pago */}
              <p className="text-xs text-coffee-400">
                {formatDateShort(sale.date)} · {sale.paymentMethods?.map(m => PAYMENT_NAMES[m.type] || m.type).join(', ') || 'N/A'}
              </p>

              {/* Fila 4: acciones */}
              <div className="flex gap-2 pt-1">
                {onView && (
                  <button
                    onClick={() => onView(sale)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 text-xs font-medium transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver detalle
                  </button>
                )}
                {onPrint && (
                  <button
                    onClick={() => onPrint(sale)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 text-xs font-medium transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" /> Comanda
                  </button>
                )}
                {onRefund && sale.status === 'completed' && (
                  <button
                    onClick={() => onRefund(sale)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reembolso
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: tabla ──────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-coffee-200">
          <thead className="bg-coffee-50">
            <tr>
              {['Código', 'Fecha', 'Cliente', 'Productos', 'Total', 'Pago', 'Estado', ''].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-coffee-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-coffee-500" />
                  </div>
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-coffee-500">
                  No hay ventas registradas
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className={clsx('hover:bg-coffee-50 transition-colors')}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-coffee-600">{sale.code}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-coffee-700">{formatDate(sale.date)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-coffee-900">{sale.customerName || 'Cliente General'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="info" size="sm">{(sale.items as unknown[]).length} items</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-semibold text-coffee-900">{formatCurrency(sale.total)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-coffee-600">
                      {sale.paymentMethods?.map(m => PAYMENT_NAMES[m.type] || m.type).join(', ') || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={
                      sale.status === 'completed'           ? 'completed' :
                      sale.status === 'refunded'            ? 'refunded'  :
                      sale.status === 'partially_refunded'  ? 'refunded'  : 'active'
                    } />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {onView && (
                        <button className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700" onClick={() => onView(sale)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {onPrint && (
                        <button className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700" onClick={() => onPrint(sale)} title="Imprimir comanda">
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                      {onInvoice && sale.status === 'completed' && (
                        <button className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700" onClick={() => onInvoice(sale)} title="Factura">
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                      {onRefund && sale.status === 'completed' && (
                        <button className="p-1.5 rounded-lg hover:bg-amber-50 text-coffee-400 hover:text-amber-600" onClick={() => onRefund(sale)} title="Reembolso">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
