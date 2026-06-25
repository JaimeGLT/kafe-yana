import React from 'react';
import { clsx } from 'clsx';
import type { Sale } from '../../types';
import { esEstadoAnuladaSiat, esEstadoValidadaSiat } from '../../types/siat';
import { StatusBadge, Badge } from '../ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, FileText, RotateCcw, Printer, ScrollText } from 'lucide-react';

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

/** Saldo efectivo = venta.MontoTotal - Σ(montoTotalDevuelto) de notas válidas.
 *  Si no hay notas, devuelve el total sin cambios. */
const calcularSaldoEfectivo = (sale: Sale): number => {
  const devuelto = sale.montoNotasAjuste ?? 0;
  return Math.max(0, sale.total - devuelto);
};

/** Tooltip y texto del badge "Con Nota" en la lista. */
const badgeNotaAjuste = (sale: Sale): { texto: string; tip: string } | null => {
  const n = sale.notasAjuste?.length ?? 0;
  if (n === 0) return null;
  if (n === 1) {
    const nota = sale.notasAjuste![0];
    return {
      texto: `Con Nota #${nota.numeroNotaCreditoDebito}`,
      tip: `Nota N° ${nota.numeroNotaCreditoDebito} · ${formatCurrency(nota.montoTotalDevuelto)} devueltos · ${nota.estadoSiat ?? '—'}`,
    };
  }
  return {
    texto: `Con ${n} notas`,
    tip: `${n} notas de crédito/débito válidas asociadas a esta venta.`,
  };
};

const PAYMENT_NAMES: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credit: 'Crédito',
  qr: 'QR',
};

/** Color de fondo de la fila/tarjeta según estado SIAT.
 *  - Anulada  → rojo
 *  - Validada → verde
 *  - Sin SIAT / Observada / Pendiente → normal (gris coffee en hover) */
const getSiatRowClass = (sale: Sale): string => {
  if (esEstadoAnuladaSiat(sale.estadoSiat)) return 'bg-red-200 hover:bg-red-300';
  if (esEstadoValidadaSiat(sale.estadoSiat)) return 'bg-green-200 hover:bg-green-300';
  return 'hover:bg-coffee-50';
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
          sales.map((sale) => {
            const notaBadge = badgeNotaAjuste(sale);
            const saldoEfectivo = notaBadge ? calcularSaldoEfectivo(sale) : sale.total;
            return (
            <div key={sale.id} className={clsx('px-4 py-4 space-y-3', getSiatRowClass(sale))}>
              {/* Fila 1: código + total (+ badge de nota si aplica) */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-coffee-400">{sale.code}</span>
                <div className="flex items-center gap-2">
                  {notaBadge && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold"
                      title={notaBadge.tip}
                    >
                      <ScrollText className="h-3 w-3" />
                      {notaBadge.texto}
                    </span>
                  )}
                  <span className={clsx(
                    'font-bold text-base',
                    notaBadge ? 'text-coffee-400 line-through' : 'text-coffee-900'
                  )}>
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              </div>

              {/* Si tiene nota, mostramos el saldo efectivo debajo del total */}
              {notaBadge && (
                <>
                  <p className="text-xs text-emerald-700 -mt-2">
                    Saldo efectivo: <strong>{formatCurrency(saldoEfectivo)}</strong>
                  </p>
                  {(sale.itemsAgotados ?? 0) > 0 && (
                    <p className="text-[10px] text-amber-700 -mt-1">
                      {sale.itemsAgotados} producto{sale.itemsAgotados === 1 ? '' : 's'} ya devuelto{sale.itemsAgotados === 1 ? '' : 's'} en su totalidad
                    </p>
                  )}
                </>
              )}

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
            );
          })
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
              sales.map((sale) => {
                const notaBadge = badgeNotaAjuste(sale);
                const saldoEfectivo = notaBadge ? calcularSaldoEfectivo(sale) : sale.total;
                return (
                <tr key={sale.id} className={clsx('transition-colors', getSiatRowClass(sale))}>
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
                    <div className="flex flex-col gap-0.5">
                      {notaBadge && (
                        <span
                          className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold"
                          title={notaBadge.tip}
                        >
                          <ScrollText className="h-3 w-3" />
                          {notaBadge.texto}
                        </span>
                      )}
                      <span className={clsx(
                        'font-semibold',
                        notaBadge ? 'text-coffee-400 line-through' : 'text-coffee-900'
                      )}>
                        {formatCurrency(sale.total)}
                      </span>
                      {notaBadge && (
                        <span className="text-[11px] text-emerald-700">
                          Saldo: <strong>{formatCurrency(saldoEfectivo)}</strong>
                        </span>
                      )}
                      {notaBadge && (sale.itemsAgotados ?? 0) > 0 && (
                        <span className="text-[10px] text-amber-700">
                          {sale.itemsAgotados} producto{sale.itemsAgotados === 1 ? '' : 's'} ya devuelto{sale.itemsAgotados === 1 ? '' : 's'} en su totalidad
                        </span>
                      )}
                    </div>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
