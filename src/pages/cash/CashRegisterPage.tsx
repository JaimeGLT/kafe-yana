import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Minus,
  Lock,
  Unlock,
  Clock,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge, Modal } from '../../components/ui';
import { CashMovementModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { gql } from '../../lib/graphql';
import { formatCurrency, formatDateTime } from '../../utils';
import type { CashRegister, CashMovement } from '../../types';

interface CloseRegisterFormState {
  actualBalance: string;
  notes: string;
}

// GraphQL query to get current cash register
const GET_CURRENT_REGISTER = `
  query {
    currentCashRegister {
      id
      code
      openedAt
      closedAt
      openingBalance
      expectedBalance
      actualBalance
      difference
      status
      totalSales
      totalIncome
      totalExpense
      movements {
        id
        type
        category
        concept
        amount
        date
        reference
      }
    }
  }
`;

const OPEN_CASH_REGISTER = `
  mutation($openingBalance: Float!) {
    openCashRegister(openingBalance: $openingBalance) {
      id
      code
      openedAt
      status
    }
  }
`;

const CLOSE_CASH_REGISTER = `
  mutation($registerId: String!, $actualBalance: Float!, $notes: String) {
    closeCashRegister(registerId: $registerId, actualBalance: $actualBalance, notes: $notes) {
      id
      status
    }
  }
`;

interface CurrentRegisterResponse {
  currentCashRegister: CashRegister | null;
}

interface OpenRegisterResponse {
  openCashRegister: CashRegister;
}

interface CloseRegisterResponse {
  closeCashRegister: { id: string; status: string };
}

export const CashRegisterPage: React.FC = () => {
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);

  const [openingBalance, setOpeningBalance] = useState('');
  const [openingError, setOpeningError] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income');

  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [closeForm, setCloseForm] = useState<CloseRegisterFormState>({
    actualBalance: '',
    notes: '',
  });
  const [isClosing, setIsClosing] = useState(false);

  // Fetch current register
  const fetchCurrentRegister = useCallback(async () => {
    try {
      const data = await gql<CurrentRegisterResponse>(GET_CURRENT_REGISTER);
      // Transform dates from string to Date objects
      if (data.currentCashRegister) {
        const reg = data.currentCashRegister;
        setRegister({
          ...reg,
          openedAt: new Date(reg.openedAt as unknown as string),
          closedAt: reg.closedAt ? new Date(reg.closedAt as unknown as string) : undefined,
          movements: (reg.movements || []).map((m: CashMovement) => ({
            ...m,
            date: new Date(m.date as unknown as string),
          })),
        } as CashRegister);
      } else {
        setRegister(null);
      }
    } catch (error) {
      console.error('Error fetching cash register:', error);
      toast.error('Error', 'No se pudo obtener el estado de la caja.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRegister();
  }, [fetchCurrentRegister]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      setOpeningError('Ingresa un saldo inicial valido');
      return;
    }
    setIsOpening(true);
    try {
      await gql<OpenRegisterResponse>(OPEN_CASH_REGISTER, { openingBalance: balance });
      toast.success('Caja abierta', `Caja iniciada con ${formatCurrency(balance)}.`);
      setOpeningBalance('');
      setOpeningError('');
      await fetchCurrentRegister();
    } catch (err: unknown) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo abrir la caja.');
    } finally {
      setIsOpening(false);
    }
  };

  const openMovementModal = (type: 'income' | 'expense') => {
    setMovementType(type);
    setIsMovementOpen(true);
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!register) return;
    const balance = parseFloat(closeForm.actualBalance);
    if (isNaN(balance) || balance < 0) return;
    setIsClosing(true);
    try {
      await gql<CloseRegisterResponse>(CLOSE_CASH_REGISTER, {
        registerId: register.id,
        actualBalance: balance,
        notes: closeForm.notes || undefined,
      });
      toast.success('Caja cerrada', 'La caja fue cerrada exitosamente.');
      setIsCloseOpen(false);
      await fetchCurrentRegister();
    } catch {
      toast.error('Error', 'No se pudo cerrar la caja.');
    } finally {
      setIsClosing(false);
    }
  };

  const handleMovementSuccess = () => {
    setIsMovementOpen(false);
    fetchCurrentRegister();
  };

  const actualBalance = parseFloat(closeForm.actualBalance);
  const difference =
    !isNaN(actualBalance) && register ? actualBalance - register.expectedBalance : null;

  if (loading) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Caja" subtitle="Control de apertura y cierre de caja" />
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-600"></div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  // Closed / No Register: Show open screen
  if (!register) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Caja" subtitle="Control de apertura y cierre de caja" />
          <div className="flex items-center justify-center py-20">
            <div className="bg-white rounded-2xl border border-coffee-100 shadow-lg p-8 max-w-sm w-full text-center">
              <div className="h-20 w-20 rounded-full bg-coffee-100 flex items-center justify-center mx-auto mb-5">
                <Wallet className="h-10 w-10 text-coffee-500" />
              </div>
              <h2 className="font-display font-bold text-coffee-900 text-2xl mb-2">Caja Cerrada</h2>
              <p className="text-coffee-500 text-sm mb-6">
                No hay una caja abierta. Ingresa el saldo inicial para comenzar.
              </p>
              <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 mb-1">
                    Saldo Inicial
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 font-medium text-sm">
                      S/
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingBalance}
                      onChange={(e) => {
                        setOpeningBalance(e.target.value);
                        setOpeningError('');
                      }}
                      className="w-full pl-9 pr-4 py-3 border border-coffee-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-coffee-400 text-center"
                      placeholder="0.00"
                    />
                  </div>
                  {openingError && (
                    <p className="text-xs text-red-500 mt-1">{openingError}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isOpening}
                  leftIcon={<Unlock className="h-5 w-5" />}
                >
                  Abrir Caja
                </Button>
              </form>
            </div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  // Open Register: Dashboard
  return (
    <MainLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold text-coffee-900">{register.code}</h1>
              <Badge variant="success" dot>
                Abierta
              </Badge>
            </div>
            <p className="text-sm text-coffee-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Abierta el {formatDateTime(register.openedAt)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-green-400 text-green-700 hover:bg-green-50"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => openMovementModal('income')}
            >
              Agregar Ingreso
            </Button>
            <Button
              variant="outline"
              className="border-red-400 text-red-600 hover:bg-red-50"
              leftIcon={<Minus className="h-4 w-4" />}
              onClick={() => openMovementModal('expense')}
            >
              Agregar Egreso
            </Button>
            <Button
              variant="danger"
              leftIcon={<Lock className="h-4 w-4" />}
              onClick={() => {
                setCloseForm({
                  actualBalance: String(register.expectedBalance.toFixed(2)),
                  notes: '',
                });
                setIsCloseOpen(true);
              }}
            >
              Cerrar Caja
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: 'Saldo Inicial',
              value: formatCurrency(register.openingBalance),
              icon: <Wallet className="h-5 w-5 text-coffee-500" />,
              bg: 'bg-coffee-100',
              highlight: false,
            },
            {
              label: 'Total Ventas',
              value: formatCurrency(register.totalSales),
              icon: <DollarSign className="h-5 w-5 text-blue-500" />,
              bg: 'bg-blue-100',
              highlight: false,
            },
            {
              label: 'Ingresos',
              value: formatCurrency(register.totalIncome),
              icon: <TrendingUp className="h-5 w-5 text-green-500" />,
              bg: 'bg-green-100',
              highlight: false,
            },
            {
              label: 'Egresos',
              value: formatCurrency(register.totalExpense),
              icon: <TrendingDown className="h-5 w-5 text-red-500" />,
              bg: 'bg-red-100',
              highlight: false,
            },
            {
              label: 'Saldo Esperado',
              value: formatCurrency(register.expectedBalance),
              icon: <Wallet className="h-5 w-5 text-coffee-700" />,
              bg: 'bg-coffee-200',
              highlight: true,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={clsx(
                'bg-white rounded-xl border border-coffee-100 shadow-sm p-4',
                kpi.highlight && 'ring-2 ring-coffee-300'
              )}
            >
              <div
                className={clsx(
                  'h-9 w-9 rounded-lg flex items-center justify-center mb-3',
                  kpi.bg
                )}
              >
                {kpi.icon}
              </div>
              <p className="text-xs text-coffee-500 mb-0.5">{kpi.label}</p>
              <p className="text-lg font-display font-bold text-coffee-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Movements Table */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-coffee-100">
            <h2 className="font-display font-semibold text-coffee-900">
              Movimientos de esta Caja
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Fecha', 'Tipo', 'Categoria', 'Concepto', 'Referencia', 'Monto'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {register.movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-coffee-400">
                      No hay movimientos en esta caja
                    </td>
                  </tr>
                ) : (
                  [...register.movements].reverse().map((mov) => (
                    <tr key={mov.id} className="hover:bg-coffee-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-coffee-700">
                        {formatDateTime(mov.date)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <Badge variant={mov.type === 'income' ? 'success' : 'danger'} size="sm">
                          {mov.type === 'income' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-coffee-700">
                        {mov.category}
                      </td>
                      <td className="px-6 py-3 text-sm text-coffee-900">{mov.concept}</td>
                      <td className="px-6 py-3 text-sm text-coffee-500">
                        {mov.reference || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span
                          className={clsx(
                            'font-semibold',
                            mov.type === 'income' ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {mov.type === 'income' ? '+' : '-'}
                          {formatCurrency(mov.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cash Movement Modal */}
        <CashMovementModal
          isOpen={isMovementOpen}
          onClose={() => setIsMovementOpen(false)}
          type={movementType}
          onSuccess={handleMovementSuccess}
        />

        {/* Close Register Modal */}
        <Modal
          isOpen={isCloseOpen}
          onClose={() => setIsCloseOpen(false)}
          title="Cerrar Caja"
          size="md"
        >
          <form onSubmit={handleCloseRegister} className="space-y-5">
            <div className="bg-coffee-50 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between text-coffee-700">
                <span>Saldo Inicial:</span>
                <span className="font-medium">{formatCurrency(register.openingBalance)}</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Ingresos:</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(register.totalIncome)}
                </span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Egresos:</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(register.totalExpense)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-2">
                <span>Saldo Esperado:</span>
                <span>{formatCurrency(register.expectedBalance)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                Saldo Real en Caja <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 text-sm font-medium">
                  S/
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closeForm.actualBalance}
                  onChange={(e) =>
                    setCloseForm((p) => ({ ...p, actualBalance: e.target.value }))
                  }
                  className="w-full pl-9 pr-4 py-3 border border-coffee-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  placeholder="0.00"
                />
              </div>
            </div>

            {difference !== null && (
              <div
                className={clsx(
                  'rounded-xl p-3 text-sm font-semibold flex justify-between',
                  difference === 0
                    ? 'bg-green-50 text-green-700'
                    : difference > 0
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-red-50 text-red-700'
                )}
              >
                <span>Diferencia:</span>
                <span>
                  {difference >= 0 ? '+' : ''}
                  {formatCurrency(difference)}
                  {difference === 0 && ' — Sin diferencia'}
                  {difference > 0 && ' (Sobrante)'}
                  {difference < 0 && ' (Faltante)'}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-coffee-700 mb-1">
                Notas de Cierre
              </label>
              <textarea
                value={closeForm.notes}
                onChange={(e) => setCloseForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                rows={3}
                placeholder="Observaciones del cierre..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCloseOpen(false)}
                disabled={isClosing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="danger"
                isLoading={isClosing}
                leftIcon={<Lock className="h-4 w-4" />}
              >
                Cerrar Caja
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </MainLayout>
  );
};