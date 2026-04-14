import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, RotateCcw, Star, Gift } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from '../../utils';
import type { Sale } from '../../types';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface RefundBlockedInfo {
  customerPoints: number;
  pointsNeeded: number;
}

type Step =
  | 'detail'
  | 'confirm-complete'
  | 'confirm-cancel'
  | 'confirm-refund'
  | 'refund-blocked';

interface Props {
  sale: Sale | null;
  onClose: () => void;
  /** Devuelve { blocked } si el reembolso no puede procesarse por puntos insuficientes. */
  onStatusChange: (
    saleId: string,
    newStatus: Sale['status'],
    force?: boolean,
  ) => Promise<{ blocked?: RefundBlockedInfo } | void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Sale['status'], string> = {
  pending:   'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
  refunded:  'Reembolsada',
};

const STATUS_VARIANT: Record<Sale['status'], 'warning' | 'success' | 'danger' | 'info'> = {
  pending:   'warning',
  completed: 'success',
  cancelled: 'danger',
  refunded:  'info',
};

// ── Componente ────────────────────────────────────────────────────────────────

export const SaleDetailModal: React.FC<Props> = ({ sale, onClose, onStatusChange }) => {
  const [step, setStep] = useState<Step>('detail');
  const [blocked, setBlocked] = useState<RefundBlockedInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!sale) return null;

  const hasLoyalty =
    !!sale.customerId &&
    ((sale.pointsEarned ?? 0) > 0 || (sale.pointsRedeemed ?? 0) > 0);

  const reset = () => {
    setStep('detail');
    setBlocked(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const executeStatusChange = async (newStatus: Sale['status'], force = false) => {
    setIsProcessing(true);
    try {
      const result = await onStatusChange(sale.id, newStatus, force);
      if (result?.blocked) {
        setBlocked(result.blocked);
        setStep('refund-blocked');
      } else {
        handleClose();
      }
    } catch {
      reset();
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Footer contextual ──────────────────────────────────────────────────────

  const renderFooter = () => {
    if (step === 'confirm-complete') {
      return (
        <div className="border-t border-coffee-100 pt-4 mt-2">
          <div className="flex items-start gap-3 bg-green-50 rounded-lg p-3 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-800">¿Completar esta venta?</p>
              <p className="text-green-700 mt-0.5">
                {(sale.pointsRedeemed ?? 0) > 0
                  ? `Se descontarán ${sale.pointsRedeemed} pts canjeados y se acreditarán ${sale.pointsEarned ?? 0} pts ganados al cliente.`
                  : 'Se acreditarán los puntos ganados al cliente por el monto pagado.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={reset} disabled={isProcessing}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => executeStatusChange('completed')}
              isLoading={isProcessing}
            >
              Sí, completar
            </Button>
          </div>
        </div>
      );
    }

    if (step === 'confirm-cancel') {
      return (
        <div className="border-t border-coffee-100 pt-4 mt-2">
          <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">¿Cancelar esta venta?</p>
              <p className="text-amber-700 mt-0.5">
                {(sale.pointsRedeemed ?? 0) > 0
                  ? `Se devolverán ${sale.pointsRedeemed} pts canjeados al cliente.`
                  : 'No se modificarán puntos de fidelidad.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={reset} disabled={isProcessing}>Volver</Button>
            <Button
              variant="danger"
              onClick={() => executeStatusChange('cancelled')}
              isLoading={isProcessing}
            >
              Sí, cancelar venta
            </Button>
          </div>
        </div>
      );
    }

    if (step === 'confirm-refund') {
      return (
        <div className="border-t border-coffee-100 pt-4 mt-2">
          <div className="flex items-start gap-3 bg-amber-50 rounded-lg p-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">¿Reembolsar esta venta completa?</p>
              <p className="text-amber-700 mt-0.5">
                No se puede reembolsar solo un producto — se revierte toda la orden.
                {(sale.pointsEarned ?? 0) > 0 &&
                  ` Se quitarán ${sale.pointsEarned} pts ganados al cliente.`}
                {(sale.pointsRedeemed ?? 0) > 0 &&
                  ` Se devolverán ${sale.pointsRedeemed} pts canjeados.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={reset} disabled={isProcessing}>Volver</Button>
            <Button
              variant="danger"
              onClick={() => executeStatusChange('refunded')}
              isLoading={isProcessing}
            >
              Sí, reembolsar
            </Button>
          </div>
        </div>
      );
    }

    if (step === 'refund-blocked' && blocked) {
      return (
        <div className="border-t border-red-100 pt-4 mt-2">
          <div className="flex items-start gap-3 bg-red-50 rounded-lg p-3 mb-4">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-800">El cliente ya gastó los puntos de esta venta</p>
              <p className="text-red-700 mt-1">
                Tiene{' '}
                <span className="font-semibold">{blocked.customerPoints} pts</span> pero se
                necesitan{' '}
                <span className="font-semibold">{blocked.pointsNeeded} pts</span> para revertir lo
                ganado.
              </p>
              <p className="text-xs text-red-500 mt-1">
                Puedes forzar el reembolso dejando el saldo negativo, o resolverlo directamente con
                el cliente.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={reset} disabled={isProcessing}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => executeStatusChange('refunded', true)}
              isLoading={isProcessing}
            >
              Forzar reembolso (saldo negativo)
            </Button>
          </div>
        </div>
      );
    }

    // ── Botones de acción por estado ───────────────────────────────────────
    if (sale.status === 'pending') {
      return (
        <div className="flex gap-2 pt-4 mt-2 border-t border-coffee-100 justify-end">
          <Button variant="ghost" onClick={() => setStep('confirm-cancel')}>
            <XCircle className="h-4 w-4 mr-1.5" /> Cancelar venta
          </Button>
          <Button variant="primary" onClick={() => setStep('confirm-complete')}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Completar
          </Button>
        </div>
      );
    }

    if (sale.status === 'completed') {
      return (
        <div className="flex gap-2 pt-4 mt-2 border-t border-coffee-100 justify-end">
          <Button variant="danger" onClick={() => setStep('confirm-refund')}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reembolsar
          </Button>
        </div>
      );
    }

    return null; // cancelled / refunded — sin acciones
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={!!sale}
      onClose={handleClose}
      title={`Venta — ${sale.code}`}
      size="lg"
    >
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
                {sale.items.map((item) => (
                  <tr key={item.id} className={item.isRedeemed ? 'bg-amber-50/50' : ''}>
                    <td className="px-4 py-2 text-coffee-900">
                      <div className="flex items-center gap-2">
                        <span>{item.productName ?? 'Producto'}</span>
                        {item.isRedeemed && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            <Gift className="h-3 w-3" /> Canjeado
                          </span>
                        )}
                      </div>
                      {item.variationName && (
                        <p className="text-xs text-coffee-400 mt-0.5">{item.variationName}</p>
                      )}
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
                ))}
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
          </div>
        </div>

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
