import React, { useState } from 'react';
import { startOfMonth, format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Scale, BookOpen, Calendar, FileText, ShoppingCart } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Input, Badge } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { formatCurrency, formatDate } from '../../utils';
import { useCashReportPage } from '../../hooks/useCashReportPage';
import { generateCashReportPdf } from '../../lib/cashReportPdf';

const tooltipStyle = {
  contentStyle: {
    background: '#FFFBF5',
    border: '1px solid #E8D5C4',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

const CashReportPage: React.FC = () => {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(today, 'yyyy-MM-dd'));

  const { stats, dailyData, categoryData, filteredSessions, isLoading, error } =
    useCashReportPage(dateFrom, dateTo);

  const handleExportPdf = () => {
    generateCashReportPdf({ dateFrom, dateTo, stats, categoryData, filteredSessions });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="text-coffee-500">Cargando reporte de caja...</div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  const sortedSessions = [...filteredSessions].sort(
    (a, b) => new Date(b.apertura).getTime() - new Date(a.apertura).getTime(),
  );

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
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="h-4 w-4" />}
                onClick={handleExportPdf}
                disabled={isLoading}
              >
                Exportar PDF
              </Button>
            </div>
          }
        />

        <KPIGrid columns={4}>
          <KPICard
            title="Total Ingresos"
            value={formatCurrency(stats.totalIngresos)}
            subtitle="Entradas de efectivo"
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Total Egresos"
            value={formatCurrency(stats.totalEgresos)}
            subtitle="Salidas de efectivo"
            icon={<TrendingDown className="h-6 w-6" />}
            color="red"
          />
          <KPICard
            title="Ventas POS"
            value={formatCurrency(stats.totalVentas)}
            subtitle="Cobrado en caja"
            icon={<ShoppingCart className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Balance Neto"
            value={formatCurrency(stats.balanceNeto)}
            subtitle={stats.balanceNeto >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
            icon={<Scale className="h-6 w-6" />}
            color={stats.balanceNeto >= 0 ? 'green' : 'red'}
          />
          <KPICard
            title="Sesiones"
            value={stats.sesionesCount}
            subtitle="En el período"
            icon={<BookOpen className="h-6 w-6" />}
            color="blue"
          />
        </KPIGrid>

        <PageSection title="Ingresos vs Egresos por Día" description="Comparativo de entradas y salidas por sesión de apertura">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `S/${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(Number(value))]} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos" fill="#8B4513" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ventas" name="Ventas POS" fill="#D4A574" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay sesiones en el período seleccionado
            </div>
          )}
        </PageSection>

        <PageSection title="Movimientos por Categoría" description="Totales agrupados por categoría">
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
                {categoryData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-coffee-400">
                      No hay movimientos en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  categoryData.map((c, idx) => (
                    <tr key={idx} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-coffee-900">{c.category}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={c.tipo === 'Ingreso' ? 'success' : 'danger'}>
                          {c.tipo}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-700">{c.count}</td>
                      <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                        {formatCurrency(c.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        <PageSection title="Sesiones de Caja" description="Historial de aperturas y cierres en el período">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Apertura</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Cierre</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">S. Inicial</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ingresos</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Egresos</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ventas</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-coffee-400">
                      No hay sesiones en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  sortedSessions.map(s => (
                    <tr key={s.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-coffee-600">{s.codigo}</td>
                      <td className="py-3 px-4 text-coffee-700">{formatDate(s.apertura)}</td>
                      <td className="py-3 px-4 text-coffee-700">
                        {s.cierre ? formatDate(s.cierre) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-700">
                        {formatCurrency(s.saldoInicial)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-700">
                        {formatCurrency(s.totalIngresos)}
                      </td>
                      <td className="py-3 px-4 text-right text-red-700">
                        {formatCurrency(Math.abs(s.totalEgresos))}
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-900 font-semibold">
                        {formatCurrency(s.totalVentas)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.cierre ? 'default' : 'success'}>
                          {s.cierre ? s.estado : 'Abierta'}
                        </Badge>
                      </td>
                    </tr>
                  ))
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
