import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { formatCurrency } from '../../utils';
import type { PaymentMethod } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: { id: string; code: string; total: number; paymentMethods: PaymentMethod[] } | null;
  onConfirm: (id: string, amount: number, reason: string, paymentType: string) => Promise<void>;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  qr: 'QR',
  transfer: 'Transferencia',
  credit: 'Crédito',
  mixed: 'Mixto',
};

export const RefundModal: React.FC<Props> = ({ isOpen, onClose, sale, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale) {
      setAmount(String(sale.total));
      setReason('');
      setError(null);
      setPaymentType(sale.paymentMethods.length === 1 ? sale.paymentMethods[0].type : '');
    }
  }, [isOpen, sale]);

  const handleConfirm = async () => {
    if (!sale) return;
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }
    if (parsed > sale.total) {
      setError(`El monto no puede superar el total (${formatCurrency(sale.total)}).`);
      return;
    }
    if (!paymentType) {
      setError('Selecciona el tipo de pago a devolver.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm(sale.id, parsed, reason, paymentType);
    } catch {
      setError('No se pudo registrar el reembolso. Verifica que la caja esté abierta.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sale) return null;

  const paymentOptions = [
    { value: '', label: 'Seleccionar tipo de pago' },
    ...sale.paymentMethods.map(pm => ({
      value: pm.type,
      label: `${PAYMENT_LABELS[pm.type] ?? pm.type} — ${formatCurrency(pm.amount)}`,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reembolso — ${sale.code}`} size="sm" bottomSheet>
      <div className="space-y-4">
        <div className="bg-coffee-50 rounded-lg px-4 py-3 text-sm text-coffee-700">
          Total de la venta: <span className="font-semibold">{formatCurrency(sale.total)}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Tipo de pago</label>
          <Select
            value={paymentType}
            onChange={setPaymentType}
            options={paymentOptions}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Monto a devolver</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Motivo (opcional)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: producto dañado, error de cobro..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Confirmar reembolso
          </Button>
        </div>
      </div>
    </Modal>
  );
};
