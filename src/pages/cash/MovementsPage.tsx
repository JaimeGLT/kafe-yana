import React from 'react';
import { clsx } from 'clsx';
import { Plus, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Select } from '../../components/ui';
import { CashMovementModal } from '../../components/modals';
import { useCashStore } from '../../stores';
import { formatCurrency, formatDateTime } from '../../utils';

export const MovementsPage: React.FC = () => {
  const { movements, categories, currentRegister } = useCashStore();

  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'' | 'income' | 'expense'>('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const filteredMovements = React.useMemo(() => {
    return movements.filter((mov) => {
      if (typeFilter && mov.type !== typeFilter) return false;
      if (categoryFilter && mov.category !== categoryFilter) return false;
      if (dateFrom && new Date(mov.date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(mov.date) > to) return false;
      }
      return true;
    });
  }, [movements, typeFilter, categoryFilter, dateFrom, dateTo]);

  const summaryKpis = React.useMemo(() => {
    const totalIncome = filteredMovements
      .filter((m) => m.type === 'income')
      .reduce((s, m) => s + m.amount, 0);
    const totalExpense = filteredMovements
      .filter((m) => m.type === 'expense')
      .reduce((s, m) => s + m.amount, 0);
    const net = totalIncome - totalExpense;
    return { totalIncome, totalExpense, net };
  }, [filteredMovements]);

  const activeCategories = React.useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...activeCategories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'income', label: 'Ingresos' },
    { value: 'expense', label: 'Egresos' },
  ];

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Movimientos de Caja"
          subtitle="Historial de todos los ingresos y egresos"
          actions={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
              disabled={!currentRegister}
              title={!currentRegister ? 'Debes abrir una caja primero' : undefined}
            >
              Agregar Movimiento
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Total Ingresos</p>
              <p className="text-2xl font-display font-bold text-green-700">
                {formatCurrency(summaryKpis.totalIncome)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Total Egresos</p>
              <p className="text-2xl font-display font-bold text-red-600">
                {formatCurrency(summaryKpis.totalExpense)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div
              className={clsx(
                'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                summaryKpis.net >= 0 ? 'bg-blue-100' : 'bg-red-100'
              )}
            >
              <BarChart2
                className={clsx(
                  'h-6 w-6',
                  summaryKpis.net >= 0 ? 'text-blue-600' : 'text-red-600'
                )}
              />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Neto</p>
              <p
                className={clsx(
                  'text-2xl font-display font-bold',
                  summaryKpis.net >= 0 ? 'text-blue-700' : 'text-red-600'
                )}
              >
                {summaryKpis.net >= 0 ? '+' : ''}
                {formatCurrency(summaryKpis.net)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
            <Select
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as '' | 'income' | 'expense')}
              options={typeOptions}
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions}
            />
          </div>
        </div>

        {/* Table */}
        <PageSection>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Fecha', 'Tipo', 'Categoría', 'Concepto', 'Referencia', 'Monto', 'Usuario'].map(
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
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-coffee-400">
                      No hay movimientos registrados
                    </td>
                  </tr>
                ) : (
                  [...filteredMovements]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((mov) => (
                      <tr key={mov.id} className="hover:bg-coffee-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                          {formatDateTime(mov.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={mov.type === 'income' ? 'success' : 'danger'}
                            size="sm"
                            dot
                          >
                            {mov.type === 'income' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                          {mov.category}
                        </td>
                        <td className="px-6 py-4 text-sm text-coffee-900">{mov.concept}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-500">
                          {mov.reference || <span className="text-coffee-300">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                          {mov.userName || 'N/A'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* CashMovementModal */}
        <CashMovementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      </PageContainer>
    </MainLayout>
  );
};
