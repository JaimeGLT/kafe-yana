import React, { useState } from 'react';
import { startOfMonth, format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ShoppingBag, Clock, Users, Calendar, FileText, DollarSign } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Input, Badge, Skeleton, SkeletonKpiCard } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { formatCurrency, formatDate } from '../../utils';
import { usePurchasesReportPage } from '../../hooks/usePurchasesReportPage';
import { generatePurchasesReportPdf } from '../../lib/purchasesReportPdf';
import { ESTADO_VARIANTS } from '../../types/ordenesCompra';

const tooltipStyle = {
  contentStyle: {
    background: '#FFFBF5',
    border: '1px solid #E8D5C4',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

const PurchasesReportPage: React.FC = () => {
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(today, 'yyyy-MM-dd'));

  const { stats, monthlyData, topSuppliers, filteredOrders, isLoading, error } =
    usePurchasesReportPage(dateFrom, dateTo);

  const handleExportPdf = () => {
    generatePurchasesReportPdf({ dateFrom, dateTo, stats, monthlyData, topSuppliers, filteredOrders });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 mb-6">
            <Skeleton className="h-5 w-36 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 mb-6">
            <Skeleton className="h-5 w-40 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-coffee-50">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-10 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
            <Skeleton className="h-5 w-44 mb-4" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-coffee-50">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full mx-auto" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
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

  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reporte de Compras"
          subtitle="Análisis de órdenes de compra y proveedores"
          breadcrumbs={[
            { label: 'Reportes', path: '/reports/purchases' },
            { label: 'Compras' },
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
            title="Total Compras"
            value={formatCurrency(stats.totalValue)}
            subtitle="En el período seleccionado"
            icon={<DollarSign className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Órdenes Totales"
            value={stats.totalOrders}
            subtitle="En el período"
            icon={<ShoppingBag className="h-6 w-6" />}
            color="blue"
          />
          <KPICard
            title="Órdenes Pendientes"
            value={stats.pendingCount}
            subtitle="Por recibir"
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <KPICard
            title="Proveedores"
            value={stats.uniqueSuppliers}
            subtitle="Con órdenes en el período"
            icon={<Users className="h-6 w-6" />}
            color="green"
          />
        </KPIGrid>

        <PageSection title="Compras por Mes" description="Monto total agrupado por mes">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `S/${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(value as number), 'Total']} />
                <Legend />
                <Bar dataKey="total" name="Total Compras (S/)" fill="#8B4513" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay datos para el período seleccionado
            </div>
          )}
        </PageSection>

        <PageSection title="Top Proveedores" description="Proveedores con mayor volumen de compras">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Proveedor</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Órdenes</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Total Comprado</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-coffee-400">
                      No hay datos para el período seleccionado
                    </td>
                  </tr>
                ) : (
                  topSuppliers.map((s, idx) => (
                    <tr key={idx} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 text-coffee-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{s.name}</td>
                      <td className="py-3 px-4 text-right text-coffee-700">{s.count}</td>
                      <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                        {formatCurrency(s.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        <PageSection title="Órdenes de Compra" description="Historial de órdenes en el período seleccionado">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Proveedor</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Fecha</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-coffee-400">
                      No hay órdenes en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map(o => {
                    const estadoLabel = o.estado ?? (o.recibido ? 'Recibido' : 'Pendiente');
                    const variant = ESTADO_VARIANTS[estadoLabel] ?? 'default';
                    return (
                      <tr key={o.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-coffee-600">{o.codigo}</td>
                        <td className="py-3 px-4 font-medium text-coffee-900">{o.nombre_Proveedor}</td>
                        <td className="py-3 px-4 text-coffee-600">{formatDate(o.fecha)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={variant}>{estadoLabel}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                          {formatCurrency(o.total)}
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

export default PurchasesReportPage;
