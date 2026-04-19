import React, { useState, useMemo } from 'react';
import { AlertTriangle, XCircle, RotateCcw, Star, Gift, Minus, Plus, ChevronRight } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../../utils';
import type { Sale, RefundInput } from '../../types';

export interface RefundBlockedInfo {
  customerPoints: number;
  pointsNeeded: number;
}

type Step =
  | 'detail'
  | 'refund-type'
  | 'refund-partial'
  | 'confirm-refund-total'
  | 'confirm-refund-partial'
  | 'refund-blocked';

interface Props {
  sale: Sale | null;
  onClose: () => void;
  onRefund: (saleId: string, input: RefundInput, force?: boolean) => Promise<{ blocked?: RefundBlockedInfo } | void>;
}

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

interface PartialSelection {
  [itemId: string]: { selected: boolean; quantity: number };
}

export const SaleDetailModal: React.FC<Props> = ({ sale, onClose, onRefund }) => {
  const [step, setStep] = useState<Step>('detail');
  const [blocked, setBlocked] = useState<RefundBlockedInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialSel, setPartialSel] = useState<PartialSelection>({});
  const [refundReason, setRefundReason] = useState('');

  const refundableItems = useMemo(
    () => sale?.items.filter(i => !i.isRedeemed) ?? [],
    [sale],
  );

  const alreadyRefundedQty = (itemId: string): number => {
    if (!sale?.refunds) return 0;
    return sale.refunds.reduce((sum, r) => {
      const ri = r.items.find(ri => ri.saleItemId === itemId);
      return sum + (ri?.quantity ?? 0);
    }, 0);
  };

  const availableQty = (item: { id: string; quantity: number }): number =>
    item.quantity - alreadyRefundedQty(item.id);

  const partialTotal = useMemo(() => {
    return refundableItems.reduce((sum, item) => {
      const sel = partialSel[item.id];
      if (!sel?.selected) return sum;
      return sum + item.unitPrice * sel.quantity;
    }, 0);
  }, [partialSel, refundableItems]);

  if (!sale) return null;

  const hasPartialSelected = Object.values(partialSel).some(s => s.selected && s.quantity > 0);

  const reset = () => {
    setStep('detail');
    setBlocked(null);
    setPartialSel({});
    setRefundReason('');
  };

  const handleClose = () => { reset(); onClose(); };

  const initPartialSel = () => {
    const init: PartialSelection = {};
    refundableItems.forEach(item => {
      const avail = availableQty(item);
      if (avail > 0) init[item.id] = { selected: false, quantity: avail };
    });
    setPartialSel(init);
    setStep('refund-partial');
  };

  const executeRefund = async (input: RefundInput, force = false) => {
    setIsProcessing(true);
    try {
      const result = await onRefund(sale.id, { ...input, reason: refundReason || undefined, force });
      if (result?.blocked) { setBlocked(result.blocked); setStep('refund-blocked'); }
      else handleClose();
    } catch { reset(); }
    finally { setIsProcessing(false); }
  };

  const toggleItem = (itemId: string) => {
    setPartialSel(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected },
    }));
  };

  const setQty = (itemId: string, qty: number) => {
    const item = refundableItems.find(i => i.id === itemId)!;
    const max = availableQty(item);
    setPartialSel(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: Math.min(max, Math.max(1, qty)) },
    }));
  };

  const hasLoyalty = !!sale.customerId && ((sale.pointsEarned ?? 0) > 0 || (sale.pointsRedeemed ?? 0) > 0);
  const canRefund = sale.status === 'completed' || sale.status === 'partially_refunded';

  // ── Footer contextual ──────────────────────────────────────────────────────

  const renderFooter = () => {
    if (step === 'refund-type') return (
      <div className="border-t border-coffee-100 pt-4 mt-2 space-y-3">
        <p className="text-sm font-semibold text-coffee-800">Tipo de reembolso</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep('confirm-refund-total')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-coffee-200 hover:border-red-400 hover:bg-red-50 transition-all group"
          >
            <RotateCcw className="h-6 w-6 text-coffee-400 group-hover:text-red-500" />
            <div className="text-center">
              <p className="text-sm font-bold text-coffee-900">Total</p>
              <p className="text-xs text-coffee-500 mt-0.5">{formatCurrency(sale.total)}</p>
            </div>
          </button>
          <button
            onClick={initPartialSel}
            disabled={refundableItems.every(i => availableQty(i) === 0)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-coffee-200 hover:border-amber-400 hover:bg-amber-50 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-6 w-6 text-coffee-400 group-hover:text-amber-500" />
            <div className="text-center">
              <p className="text-sm font-bold text-coffee-900">Parcial</p>
              <p className="text-xs text-coffee-500 mt-0.5">Elegir productos</p>
            </div>
          </button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>Cancelar</Button>
        </div>
      </div>
    );

    if (step === 'refund-partial') return (
      <div className="border-t border-coffee-100 pt-4 mt-2 space-y-3">
        <p className="text-sm font-semibold text-coffee-800">Seleccionar productos a reembolsar</p>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {refundableItems.map(item => {
            const avail = availableQty(item);
            if (avail === 0) return null;
            const sel = partialSel[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sel?.selected ? 'border-amber-400 bg-amber-50' : 'border-coffee-100 hover:border-coffee-300'}`}
              >
                <input
                  type="checkbox"
                  checked={sel?.selected ?? false}
                  onChange={() => {}}
                  className="h-4 w-4 rounded accent-amber-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-coffee-900 truncate">{item.productName}</p>
                  <p className="text-xs text-coffee-500">{formatCurrency(item.unitPrice)} × disponible: {avail}</p>
                </div>
                {sel?.selected && (
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setQty(item.id, (sel.quantity) - 1)} className="h-6 w-6 rounded-md bg-white border border-coffee-200 flex items-center justify-center hover:bg-coffee-50">
                      <Minus className="h-3 w-3 text-coffee-600" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-coffee-900">{sel.quantity}</span>
                    <button onClick={() => setQty(item.id, (sel.quantity) + 1)} className="h-6 w-6 rounded-md bg-white border border-coffee-200 flex items-center justify-center hover:bg-coffee-50">
                      <Plus className="h-3 w-3 text-coffee-600" />
                    </button>
                    <span className="text-xs text-coffee-400 ml-1 w-16 text-right font-semibold">
                      {formatCurrency(item.unitPrice * sel.quantity)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Motivo del reembolso (opcional)"
          value={refundReason}
          onChange={e => setRefundReason(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-coffee-200 focus:border-amber-400 focus:outline-none text-coffee-900 placeholder:text-coffee-300"
        />
        <div className="flex items-center justify-between pt-1">
          <div className="text-sm">
            <span className="text-coffee-500">Reembolso: </span>
            <span className="font-bold text-coffee-900">{formatCurrency(partialTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('refund-type')} disabled={isProcessing}>Volver</Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!hasPartialSelected || partialTotal === 0}
              onClick={() => setStep('confirm-refund-partial')}
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    );

    if (step === 'confirm-refund-total') return (
      <div className="border-t border-coffee-100 pt-4 mt-2">
        <div className="flex items-start gap-3 bg-red-50 rounded-lg p-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-800">Reembolso total — {formatCurrency(sale.total)}</p>
            <p className="text-red-700 mt-0.5">
              Se revierte el stock de todos los productos. Se registra egreso en caja.
              {(sale.pointsEarned ?? 0) > 0 && ` Se quitarán ${sale.pointsEarned} pts al cliente.`}
            </p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Motivo del reembolso (opcional)"
          value={refundReason}
          onChange={e => setRefundReason(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-coffee-200 focus:border-amber-400 focus:outline-none text-coffee-900 placeholder:text-coffee-300 mb-3"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setStep('refund-type')} disabled={isProcessing}>Volver</Button>
          <Button variant="danger" onClick={() => executeRefund({ type: 'total' })} isLoading={isProcessing}>
            Confirmar reembolso total
          </Button>
        </div>
      </div>
    );

    if (step === 'confirm-refund-partial') return (
      <div className="border-t border-coffee-100 pt-4 mt-2">
        <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Reembolso parcial — {formatCurrency(partialTotal)}</p>
            <ul className="text-amber-700 mt-1 space-y-0.5">
              {refundableItems.filter(i => partialSel[i.id]?.selected).map(i => (
                <li key={i.id}>• {partialSel[i.id].quantity}× {i.productName} ({formatCurrency(i.unitPrice * partialSel[i.id].quantity)})</li>
              ))}
            </ul>
            <p className="text-amber-600 mt-1.5 text-xs">Stock revertido por productos seleccionados. Egreso registrado en caja.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setStep('refund-partial')} disabled={isProcessing}>Volver</Button>
          <Button
            variant="danger"
            onClick={() => executeRefund({
              type: 'partial',
              items: refundableItems
                .filter(i => partialSel[i.id]?.selected)
                .map(i => ({ saleItemId: i.id, quantity: partialSel[i.id].quantity })),
            })}
            isLoading={isProcessing}
          >
            Confirmar reembolso parcial
          </Button>
        </div>
      </div>
    );

    if (step === 'refund-blocked' && blocked) return (
      <div className="border-t border-red-100 pt-4 mt-2">
        <div className="flex items-start gap-3 bg-red-50 rounded-lg p-3 mb-4">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-800">El cliente ya gastó los puntos de esta venta</p>
            <p className="text-red-700 mt-1">
              Tiene <span className="font-semibold">{blocked.customerPoints} pts</span> pero se necesitan <span className="font-semibold">{blocked.pointsNeeded} pts</span> para revertir lo ganado.
            </p>
            <p className="text-xs text-red-500 mt-1">Puedes forzar el reembolso dejando el saldo negativo.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={reset} disabled={isProcessing}>Cancelar</Button>
          <Button variant="danger" onClick={() => executeRefund({ type: 'total', force: true })} isLoading={isProcessing}>
            Forzar reembolso (saldo negativo)
          </Button>
        </div>
      </div>
    );

    // ── Botones de acción por estado ─────────────────────────────────────────
    if (canRefund) return (
      <div className="flex gap-2 pt-4 mt-2 border-t border-coffee-100 justify-end">
        <Button variant="danger" onClick={() => setStep('refund-type')}>
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reembolso
        </Button>
      </div>
    );

    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={!!sale} onClose={handleClose} title={`Venta — ${sale.code}`} size="lg">
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

        {renderFooter()}
      </div>
    </Modal>
  );
};
