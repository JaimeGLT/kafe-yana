import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import type { AccountsPayable, PayablePaymentInput } from '../../types';

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check';

interface PaymentFormState {
  amount: string;
  method: PaymentMethod;
  reference: string;
  notes: string;
}

const payableStatusConfig: Record<
  AccountsPayable['status'],
  { variant: 'warning' | 'info' | 'success' | 'danger'; label: string }
> = {
  pending: { variant: 'warning', label: 'Pendiente' },
  partial: { variant: 'info', label: 'Parcial' },
  paid: { variant: 'success', label: 'Pagado' },
  overdue: { variant: 'danger', label: 'Vencido' },
};

export const PayablesPage: React.FC = () => {
  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [payingPayable, setPayingPayable] = useState<AccountsPayable | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: '',
    method: 'cash',
    reference: '',
    notes: '',
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  const loadPayables = useCallback(async () => {
    try {
      const data = await api.get<AccountsPayable[]>('/AccountsPayable');
      setAccountsPayable(data);
    } catch (error) {
      toast.error('Error', 'No se pudieron cargar las cuentas por pagar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayables();
  }, [loadPayables]);

  const kpis = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalPending = accountsPayable
      .filter((p) => p.status === 'pending' || p.status === 'partial')
      .reduce((s, p) => s + p.pendingAmount, 0);

    const totalOverdue = accountsPayable
      .filter((p) => (p.status === 'pending' || p.status === 'partial') && new Date(p.dueDate) < now)
      .reduce((s, p) => s + p.pendingAmount, 0);

    const paidThisMonth = accountsPayable
      .filter((p) => p.status === 'paid' && new Date(p.updatedAt) >= startOfMonth)
      .reduce((s, p) => s + p.paidAmount, 0);

    return { totalPending, totalOverdue, paidThisMonth };
  }, [accountsPayable]);

  const openPayment = (payable: AccountsPayable) => {
    setPayingPayable(payable);
    setPaymentForm({
      amount: String(payable.pendingAmount.toFixed(2)),
      method: 'cash',
      reference: '',
      notes: '',
    });
    setPaymentErrors({});
  };

  const validatePayment = (): boolean => {
    const errs: Record<string, string> = {};
    const amt = parseFloat(paymentForm.amount);
    if (!paymentForm.amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Monto inválido';
    } else if (payingPayable && amt > payingPayable.pendingAmount) {
      errs.amount = `El monto no puede superar ${formatCurrency(payingPayable.pendingAmount)}`;
    }
    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayable || !validatePayment()) return;

    setIsProcessing(true);
    try {
      const input: PayablePaymentInput = {
        payableId: payingPayable.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      };
      await api.post('/AccountsPayable/payment', input);
      toast.success('Pago registrado', `Se registró el pago de ${formatCurrency(input.amount)}.`);
      setPayingPayable(null);
      await loadPayables();
    } catch {
      toast.error('Error', 'No se pudo registrar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isOverdue = (payable: AccountsPayable) =>
    (payable.status === 'pending' || payable.status === 'partial') &&
    new Date(payable.dueDate) < new Date();

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Cuentas por Pagar"
          subtitle="Gestiona los pagos pendientes a proveedores"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Total Pendiente</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(kpis.totalPending)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Vencido</p>
              <p className="text-2xl font-display font-bold text-red-600">
                {formatCurrency(kpis.totalOverdue)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Pagado este Mes</p>
              <p className="text-2xl font-display font-bold text-green-700">
                {formatCurrency(kpis.paidThisMonth)}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <PageSection>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Código', 'Proveedor', 'Orden de Compra', 'Total', 'Pagado', 'Pendiente', 'Vencimiento', 'Estado', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {accountsPayable.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-coffee-400">
                      No hay cuentas por pagar registradas
                    </td>
                  </tr>
                ) : (
                  accountsPayable.map((payable) => {
                    const effectiveStatus: AccountsPayable['status'] = isOverdue(payable)
                      ? 'overdue'
                      : payable.status;
                    const statusCfg = payableStatusConfig[effectiveStatus];

                    return (
                      <tr key={payable.id} className="hover:bg-coffee-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-coffee-600">{payable.code}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-coffee-900">
                          {payable.supplierName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-coffee-500">
                            {payable.purchaseOrderCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-coffee-900">
                          {formatCurrency(payable.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-700 font-medium">
                          {formatCurrency(payable.paidAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={
                              payable.pendingAmount > 0
                                ? 'font-bold text-coffee-900'
                                : 'text-coffee-400'
                            }
                          >
                            {formatCurrency(payable.pendingAmount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={
                              isOverdue(payable) ? 'text-red-600 font-medium' : 'text-coffee-700'
                            }
                          >
                            {formatDate(payable.dueDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {payable.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<DollarSign className="h-3.5 w-3.5" />}
                              onClick={() => openPayment(payable)}
                            >
                              Pagar
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* Payment Modal */}
        {payingPayable && (
          <Modal
            isOpen={!!payingPayable}
            onClose={() => setPayingPayable(null)}
            title={`Registrar Pago — ${payingPayable.code}`}
            size="md"
          >
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="bg-coffee-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between text-coffee-700">
                  <span>Proveedor:</span>
                  <span className="font-medium">{payingPayable.supplierName}</span>
                </div>
                <div className="flex justify-between text-coffee-700">
                  <span>Monto Total:</span>
                  <span className="font-medium">{formatCurrency(payingPayable.amount)}</span>
                </div>
                <div className="flex justify-between text-coffee-700">
                  <span>Ya Pagado:</span>
                  <span className="font-medium text-green-600">{formatCurrency(payingPayable.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-1">
                  <span>Pendiente:</span>
                  <span>{formatCurrency(payingPayable.pendingAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">
                  Monto a Pagar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  placeholder="0.00"
                />
                {paymentErrors.amount && (
                  <p className="text-xs text-red-500 mt-1">{paymentErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Método de Pago</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm((p) => ({ ...p, method: e.target.value as PaymentMethod }))
                  }
                  className="w-full px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="check">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">
                  Referencia / N° Operación
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 mb-1">Notas</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  rows={3}
                  placeholder="Notas opcionales..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setPayingPayable(null)} disabled={isProcessing}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isProcessing} leftIcon={<DollarSign className="h-4 w-4" />}>
                  Registrar Pago
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </PageContainer>
    </MainLayout>
  );
};
