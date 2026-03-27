import React, { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { Plus, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Select } from '../../components/ui';
import { CashMovementModal } from '../../components/modals';
import { gql } from '../../lib/graphql';
import { formatCurrency, formatDateTime } from '../../utils';
import type { CashMovement, CashCategory } from '../../types';

// GraphQL queries
const GET_CASH_MOVEMENTS = `
  query($dateFrom: String, $dateTo: String) {
    cashMovements(dateFrom: $dateFrom, dateTo: $dateTo) {
      id
      type
      category
      concept
      amount
      date
      reference
      userName
    }
  }
`;

const GET_CASH_CATEGORIES = `
  query {
    cashCategories {
      id
      name
      type
      isActive
    }
  }
`;

const GET_CURRENT_REGISTER = `
  query {
    currentCashRegister {
      id
      code
      status
    }
  }
`;

interface MovementsResponse {
  cashMovements: CashMovement[];
}

interface CategoriesResponse {
  cashCategories: CashCategory[];
}

interface CurrentRegisterResponse {
  currentCashRegister: { id: string; code: string; status: string } | null;
}

export const MovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [currentRegister, setCurrentRegister] = useState<{ id: string; code: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch movements
  const fetchMovements = async () => {
    try {
      const variables: Record<string, string | undefined> = {};
      if (dateFrom) variables.dateFrom = dateFrom;
      if (dateTo) variables.dateTo = dateTo;
      const data = await gql<MovementsResponse>(GET_CASH_MOVEMENTS, variables);
      setMovements(
        (data.cashMovements || []).map((m: CashMovement) => ({
          ...m,
          date: new Date(m.date as unknown as string),
        }))
      );
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const data = await gql<CategoriesResponse>(GET_CASH_CATEGORIES);
      setCategories(data.cashCategories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch current register
  const fetchCurrentRegister = async () => {
    try {
      const data = await gql<CurrentRegisterResponse>(GET_CURRENT_REGISTER);
      setCurrentRegister(data.currentCashRegister);
    } catch (error) {
      console.error('Error fetching current register:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchCurrentRegister()]);
      setLoading(false);
    };
    load();
  }, []);

  // Fetch movements when filters change
  useEffect(() => {
    fetchMovements();
  }, [dateFrom, dateTo]);

  const filteredMovements = useMemo(() => {
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

  const summaryKpis = useMemo(() => {
    const totalIncome = filteredMovements
      .filter((m) => m.type === 'income')
      .reduce((s, m) => s + m.amount, 0);
    const totalExpense = filteredMovements
      .filter((m) => m.type === 'expense')
      .reduce((s, m) => s + m.amount, 0);
    const net = totalIncome - totalExpense;
    return { totalIncome, totalExpense, net };
  }, [filteredMovements]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const categoryOptions = [
    { value: '', label: 'Todas las categorias' },
    ...activeCategories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'income', label: 'Ingresos' },
    { value: 'expense', label: 'Egresos' },
  ];

  const handleMovementSuccess = () => {
    setIsModalOpen(false);
    fetchMovements();
  };

  if (loading) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader
            title="Movimientos de Caja"
            subtitle="Historial de todos los ingresos y egresos"
          />
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-600"></div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

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
                  {['Fecha', 'Tipo', 'Categoria', 'Concepto', 'Referencia', 'Monto', 'Usuario'].map(
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
          onSuccess={handleMovementSuccess}
        />
      </PageContainer>
    </MainLayout>
  );
};