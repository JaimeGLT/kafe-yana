import React from 'react';
import { startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, DollarSign, TrendingUp, Package,
  Calendar, FileText,
} from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { formatCurrency } from '../../utils';
import { useSalesReportPage } from '../../hooks/useSalesReportPage';

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

const SalesReportPage: React.FC = () => {
  const today = new Date();
  const [dateFrom, setDateFrom] = React.useState<string>(
    format(startOfMonth(today), 'yyyy-MM-dd')
  );
  const [dateTo, setDateTo] = React.useState<string>(format(today, 'yyyy-MM-dd'));

  const {
    stats,
    dailySalesData,
    paymentMethodData,
    topProducts,
    topCustomers,
    isLoading,
    error,
  } = useSalesReportPage(dateFrom, dateTo);

  const dailyChartData = dailySalesData.map(d => ({
    ...d,
    fecha: format(new Date(d.fecha + 'T00:00:00'), 'dd MMM', { locale: es }),
  }));

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="text-coffee-500">Cargando reporte de ventas...</div>
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

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reporte de Ventas"
          subtitle="Análisis de ventas para el período seleccionado"
          breadcrumbs={[
            { label: 'Reportes', path: '/reports/sales' },
            { label: 'Ventas' },
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
            title="Total Ventas"
            value={stats.totalSalesCount}
            subtitle="Transacciones completadas"
            icon={<ShoppingCart className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Ingresos Totales"
            value={formatCurrency(stats.totalRevenue)}
            subtitle="Período seleccionado"
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Ticket Promedio"
            value={formatCurrency(stats.avgTicket)}
            subtitle="Por transacción"
            icon={<TrendingUp className="h-6 w-6" />}
            color="blue"
          />
          <KPICard
            title="Unidades Vendidas"
            value={stats.unitsSold}
            subtitle="Productos despachados"
            icon={<Package className="h-6 w-6" />}
            color="yellow"
          />
        </KPIGrid>

        {/* Area Chart - Daily Sales */}
        <PageSection title="Ventas Diarias" description="Ingresos por día en el período seleccionado">
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `S/${v}`} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value) => [formatCurrency(value as number), 'Ingresos']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos (S/)"
                  stroke={CHART_COLORS.primary}
                  fill="url(#colorIngresos)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay datos para el período seleccionado
            </div>
          )}
        </PageSection>

        {/* Bar Chart - Payment Methods */}
        <PageSection title="Ventas por Método de Pago" description="Distribución de ingresos por forma de pago">
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={paymentMethodData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="metodo" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `S/${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(value as number), 'Total']} />
                <Bar dataKey="total" name="Total (S/)" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay datos para el período seleccionado
            </div>
          )}
        </PageSection>

        {/* Top Products Table */}
        <PageSection title="Top Productos por Ingresos" description="Los productos más vendidos en el período">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Producto</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Unidades</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-coffee-400">
                      No hay datos para el período seleccionado
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr key={idx} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 text-coffee-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{p.name || '—'}</td>
                      <td className="py-3 px-4 text-right text-coffee-700">{p.qty}</td>
                      <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* Top Customers Table */}
        <PageSection title="Top Clientes por Compras" description="Los clientes con mayor volumen de compras">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Cliente</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Transacciones</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Total Comprado</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-coffee-400">
                      No hay datos para el período seleccionado
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((c, idx) => (
                    <tr key={idx} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 text-coffee-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{c.name}</td>
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
      </PageContainer>
    </MainLayout>
  );
};

export default SalesReportPage;