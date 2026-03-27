import React, { useState, useMemo, useEffect } from 'react';
import { startOfMonth, endOfDay, format, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Scale, BookOpen, Calendar, FileText } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Input, Badge, StatusBadge } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import type { CashMovement, CashRegister } from '../../types';

const CHART_COLORS = {
  primary: '#8B4513',
  secondary: '#D4A574',
  tertiary: '#C4883A',
  success: '#22c55e',
  warning: '#eab308',
};

const tooltipStyle = {
  contentStyle: {
    background: '#FFFBF5',
    border: '1px solid #E8D5C4',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

const CashReportPage: React.FC = () => {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movementsData, registersData] = await Promise.all([
          api.get<CashMovement[]>('/cash/movements'),
          api.get<CashRegister[]>('/cash/registers'),
        ]);
        setMovements(movementsData);
        setCashRegisters(registersData);
      } catch (error) {
        console.error('Error loading cash data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(today, 'yyyy-MM-dd'));

  const filteredMovements = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = endOfDay(new Date(dateTo + 'T00:00:00'));
    return movements.filter((m: CashMovement) => {
      const d = new Date(m.date);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [movements, dateFrom, dateTo]);

  const filteredRegisters = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = endOfDay(new Date(dateTo + 'T00:00:00'));
    return cashRegisters.filter((r: CashRegister) => {
      const d = new Date(r.openedAt);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [cashRegisters, dateFrom, dateTo]);

  // KPIs
  const totalIncome = useMemo(
    () => filteredMovements.filter((m: CashMovement) => m.type === 'income').reduce((sum: number, m: CashMovement) => sum + m.amount, 0),
    [filteredMovements]
  );
  const totalExpense = useMemo(
    () => filteredMovements.filter((m: CashMovement) => m.type === 'expense').reduce((sum: number, m: CashMovement) => sum + m.amount, 0),
    [filteredMovements]
  );
  const netBalance = totalIncome - totalExpense;
  const openRegistersCount = cashRegisters.filter((r: CashRegister) => r.status === 'open').length;

  // Daily income vs expense chart
  const dailyData = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T00:00:00');
    if (from > to) return [];
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayMovements = filteredMovements.filter(
        (m: CashMovement) => format(new Date(m.date), 'yyyy-MM-dd') === dayKey
      );
      return {
        fecha: format(day, 'dd MMM', { locale: es }),
        ingresos: dayMovements.filter((m: CashMovement) => m.type === 'income').reduce((sum: number, m: CashMovement) => sum + m.amount, 0),
        egresos: dayMovements.filter((m: CashMovement) => m.type === 'expense').reduce((sum: number, m: CashMovement) => sum + m.amount, 0),
      };
    });
  }, [filteredMovements, dateFrom, dateTo]);

  // Movements by category
  const movementsByCategory = useMemo(() => {
    const map: Record<string, { category: string; type: string; total: number; count: number }> = {};
    filteredMovements.forEach((m: CashMovement) => {
      const key = m.category;
      if (!map[key]) map[key] = { category: m.category, type: m.type, total: 0, count: 0 };
      map[key].total += m.amount;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredMovements]);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reporte de Caja"
          subtitle="Análisis de ingresos, egresos y sesiones de caja"
          breadcrumbs={[
            { label: 'Reportes', path: '/reports/cash' },
            { label: 'Caja' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-coffee-500" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-40"
                />
                <span className="text-coffee-500 text-sm">hasta</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
                Exportar
              </Button>
            </div>
          }
        />

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Total Ingresos"
            value={formatCurrency(totalIncome)}
            subtitle="Entradas de efectivo"
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Total Egresos"
            value={formatCurrency(totalExpense)}
            subtitle="Salidas de efectivo"
            icon={<TrendingDown className="h-6 w-6" />}
            color="red"
          />
          <KPICard
            title="Balance Neto"
            value={formatCurrency(netBalance)}
            subtitle={netBalance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
            icon={<Scale className="h-6 w-6" />}
            color={netBalance >= 0 ? 'green' : 'red'}
          />
          <KPICard
            title="Cajas Abiertas"
            value={openRegistersCount}
            subtitle="Registros activos"
            icon={<BookOpen className="h-6 w-6" />}
            color="coffee"
          />
        </KPIGrid>

        {/* Daily income vs expenses chart */}
        <PageSection title="Ingresos vs Egresos Diarios" description="Comparativo de entradas y salidas de efectivo por día">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `S/${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(Number(value))]} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay movimientos en el período seleccionado
            </div>
          )}
        </PageSection>

        {/* Movements by category */}
        <PageSection title="Movimientos por Categoría" description="Totales agrupados por categoría de movimiento">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Categoría</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Tipo</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Movimientos</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {movementsByCategory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-coffee-400">
                      No hay movimientos en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  movementsByCategory.map((m, idx) => (
                    <tr key={idx} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-coffee-900">{m.category}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={m.type === 'income' ? 'success' : 'danger'}>
                          {m.type === 'income' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-700">{m.count}</td>
                      <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                        {formatCurrency(m.total)}
                      </td>
                    </tr>
                  ))
                )}
                {movementsByCategory.length > 0 && (
                  <tr className="bg-coffee-50 border-t-2 border-coffee-200">
                    <td colSpan={2} className="py-3 px-4 font-bold text-coffee-900">TOTAL</td>
                    <td className="py-3 px-4 text-right font-bold text-coffee-900">
                      {filteredMovements.length}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-coffee-900">
                      {formatCurrency(totalIncome - totalExpense)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* Cash Register Sessions */}
        <PageSection title="Sesiones de Caja" description="Historial de aperturas y cierres de caja en el período">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Apertura</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Cierre</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Saldo Inicial</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ingresos</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Egresos</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Diferencia</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegisters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-coffee-400">
                      No hay sesiones de caja en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  filteredRegisters
                    .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
                    .map(r => {
                      const diff = r.difference ?? 0;
                      return (
                        <tr key={r.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-coffee-600">{r.code}</td>
                          <td className="py-3 px-4 text-coffee-700">{formatDate(r.openedAt)}</td>
                          <td className="py-3 px-4 text-coffee-700">
                            {r.closedAt ? formatDate(r.closedAt) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-coffee-700">
                            {formatCurrency(r.openingBalance)}
                          </td>
                          <td className="py-3 px-4 text-right text-green-700">
                            {formatCurrency(r.totalIncome)}
                          </td>
                          <td className="py-3 px-4 text-right text-red-700">
                            {formatCurrency(r.totalExpense)}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {r.closedAt ? formatCurrency(diff) : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StatusBadge status={r.status as 'open' | 'closed'} />
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </PageSection>
      </PageContainer>
    </MainLayout>
  );
};

export default CashReportPage;
