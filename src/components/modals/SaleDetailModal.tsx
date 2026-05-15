import React from 'react';
import { RotateCcw, Star, Gift } from 'lucide-react';
import { Modal, Badge } from '../ui';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../../utils';
import type { Sale } from '../../types';

const STATUS_LABEL: Record<Sale['status'], string> = {
  completed:          'Completada',
  refunded:           'Reembolsada',
  partially_refunded: 'Parcialmente reembolsada',
};

const STATUS_VARIANT: Record<Sale['status'], 'warning' | 'success' | 'danger' | 'info'> = {
  completed:          'success',
  refunded:           'info',
  partially_refunded: 'warning',
};

interface Props {
  sale: Sale | null;
  onClose: () => void;
}

export const SaleDetailModal: React.FC<Props> = ({ sale, onClose }) => {
  if (!sale) return null;

  const alreadyRefundedQty = (itemId: string): number => {
    if (!sale.refunds) return 0;
    return sale.refunds.reduce((sum, r) => {
      const ri = r.items.find(ri => ri.saleItemId === itemId);
      return sum + (ri?.quantity ?? 0);
    }, 0);
  };

  const hasLoyalty = !!sale.customerId && ((sale.pointsEarned ?? 0) > 0 || (sale.pointsRedeemed ?? 0) > 0);

  return (
    <Modal isOpen={!!sale} onClose={onClose} title={`Venta — ${sale.code}`} size="lg" bottomSheet>
      <div className="space-y-5">

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-coffee-500">Fecha</p>
            <p className="font-medium text-coffee-900">{formatDateTime(sale.date)}</p>
          </div>
          <div>
            <p className="text-coffee-500">Estado</p>
            <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge>
          </div>
          <div>
            <p className="text-coffee-500">Cliente</p>
            <p className="font-medium text-coffee-900">{sale.customerName ?? 'Cliente General'}</p>
          </div>
          <div>
            <p className="text-coffee-500">Cajero</p>
            <p className="font-medium text-coffee-900">{sale.cashierName ?? 'N/A'}</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <h4 className="text-sm font-semibold text-coffee-700 mb-2">Productos</h4>
          <div className="rounded-lg border border-coffee-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-coffee-600 uppercase">Producto</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Cant.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Precio</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {sale.items.map((item) => {
                  const refundedQty = alreadyRefundedQty(item.id);
                  return (
                    <tr key={item.id} className={item.isRedeemed ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-2 text-coffee-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{item.productName ?? 'Producto'}</span>
                          {item.isRedeemed && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              <Gift className="h-3 w-3" /> Canjeado
                            </span>
                          )}
                          {refundedQty > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              <RotateCcw className="h-3 w-3" /> {refundedQty} reemb.
                            </span>
                          )}
                        </div>
                        {item.variationName && <p className="text-xs text-coffee-400 mt-0.5">{item.variationName}</p>}
                      </td>
                      <td className="px-4 py-2 text-right text-coffee-700">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-coffee-700">
                        {item.isRedeemed ? '—' : formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {item.isRedeemed
                          ? <span className="text-amber-600">0.00 (canje)</span>
                          : <span className="text-coffee-900">{formatCurrency(item.total)}</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-56 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-coffee-500">Subtotal:</span>
              <span className="text-coffee-900">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-coffee-200 pt-2">
              <span className="text-coffee-900">Total:</span>
              <span className="text-coffee-900">{formatCurrency(sale.total)}</span>
            </div>
            {(sale.refunds?.length ?? 0) > 0 && (
              <div className="flex justify-between text-red-600 text-sm">
                <span>Reembolsado:</span>
                <span>-{formatCurrency(sale.refunds!.reduce((s, r) => s + r.amount, 0))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Historial de reembolsos */}
        {(sale.refunds?.length ?? 0) > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-coffee-700 mb-2">Reembolsos aplicados</h4>
            <div className="space-y-2">
              {sale.refunds!.map((r, idx) => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                  <RotateCcw className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-red-800">
                        Reembolso #{idx + 1} — {r.type === 'total' ? 'Total' : 'Parcial'}
                      </span>
                      <span className="font-bold text-red-700">-{formatCurrency(r.amount)}</span>
                    </div>
                    <p className="text-xs text-red-600 mt-0.5">
                      {r.refundedBy} · {formatDateTime(r.refundedAt)}
                    </p>
                    {r.items.map(ri => (
                      <p key={ri.saleItemId} className="text-xs text-red-500">
                        • {ri.quantity}× {ri.productName}
                      </p>
                    ))}
                    {r.reason && <p className="text-xs text-red-400 italic mt-0.5">"{r.reason}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métodos de pago */}
        <div>
          <h4 className="text-sm font-semibold text-coffee-700 mb-2">Métodos de Pago</h4>
          <div className="flex flex-wrap gap-2">
            {sale.paymentMethods.map((pm) => (
              <Badge key={pm.id} variant="info">
                {getPaymentMethodLabel(pm.type)}: {formatCurrency(pm.amount)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Fidelidad */}
        {hasLoyalty && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-amber-800">Puntos de Fidelidad</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(sale.pointsEarned ?? 0) > 0 && (
                <div>
                  <p className="text-amber-600">Puntos ganados</p>
                  <p className="font-bold text-amber-900">+{sale.pointsEarned} pts</p>
                </div>
              )}
              {(sale.pointsRedeemed ?? 0) > 0 && (
                <div>
                  <p className="text-amber-600">Puntos canjeados</p>
                  <p className="font-bold text-amber-900">−{sale.pointsRedeemed} pts</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notas */}
        {sale.notes && (
          <div>
            <h4 className="text-sm font-semibold text-coffee-700 mb-1">Notas</h4>
            <p className="text-sm text-coffee-600">{sale.notes}</p>
          </div>
        )}

      </div>
    </Modal>
  );
};
