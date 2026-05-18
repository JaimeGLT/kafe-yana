import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Package, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Skeleton, SkeletonKpiCard } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { formatCurrency } from '../../utils';
import { useInventoryReportPage } from '../../hooks/useInventoryReportPage';
import { api } from '../../lib/api';
import { toast } from '../../components/ui/Toast';

const PIE_PALETTE = [
  '#8B4513', '#D4A574', '#C4883A', '#22c55e', '#eab308',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
];

const tooltipStyle = {
  contentStyle: {
    background: '#FFFBF5',
    border: '1px solid #E8D5C4',
    borderRadius: '8px',
    fontSize: '12px',
  },
};

const InventoryReportPage: React.FC = () => {
  const { stats, categoryData, criticalItems, expiringItems, isLoading, error } = useInventoryReportPage();
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await api.getBlob('/Reporte/inventario');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error', 'No se pudo descargar el reporte de inventario.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const getRatioColor = (ratio: number) => {
    const pct = ratio * 100;
    if (pct <= 25) return 'text-red-600';
    if (pct <= 50) return 'text-orange-500';
    if (pct <= 100) return 'text-yellow-600';
    return 'text-coffee-700';
  };

  const getRatioBadge = (ratio: number) => {
    const pct = ratio * 100;
    if (pct <= 25) return <Badge variant="danger">Crítico</Badge>;
    if (pct <= 50) return <Badge variant="warning">Urgente</Badge>;
    if (pct <= 100) return <Badge variant="warning">Stock Bajo</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock <= 0) return <Badge variant="danger">Agotado</Badge>;
    if (stock < minStock) return <Badge variant="warning">Stock Bajo</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="space-y-2 mb-6">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 mb-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
            <Skeleton className="h-5 w-48 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-coffee-50">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
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

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Reporte de Inventario"
          subtitle="Estado actual del inventario y niveles de stock"
          breadcrumbs={[
            { label: 'Reportes', path: '/reports/inventory' },
            { label: 'Inventario' },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={handleExportPdf}
              disabled={isLoading || isExportingPdf}
            >
              {isExportingPdf ? 'Descargando...' : 'Exportar PDF'}
            </Button>
          }
        />

        <KPIGrid columns={4}>
          <KPICard
            title="Total Productos"
            value={stats.totalProducts}
            subtitle="Comprados + Elaborados"
            icon={<Package className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Total Insumos"
            value={stats.totalInsumos}
            subtitle="Insumos registrados"
            icon={<Package className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Stock Bajo"
            value={stats.lowStockItems}
            subtitle="Items por debajo del mínimo"
            icon={<AlertTriangle className="h-6 w-6" />}
            color="yellow"
          />
          <KPICard
            title="Valor del Inventario"
            value={formatCurrency(stats.totalValue)}
            subtitle="Productos + Insumos"
            icon={<DollarSign className="h-6 w-6" />}
            color="blue"
          />
        </KPIGrid>

        <PageSection title="Productos por Categoría" description="Distribución de productos por categoría">
          {categoryData.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(value) => [value, 'Productos']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full px-2">
                {categoryData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-coffee-700">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_PALETTE[idx % PIE_PALETTE.length] }}
                    />
                    <span>{entry.name}</span>
                    <span className="text-coffee-400 font-medium">({entry.count})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay datos de categorías
            </div>
          )}
        </PageSection>

        <PageSection
          title="Stock Bajo Crítico"
          description="Insumos y productos que requieren reabastecimiento urgente"
          action={
            <Badge variant="danger">{criticalItems.length} items</Badge>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Tipo</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Categoría</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stock Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stock Mínimo</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {criticalItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-coffee-400">
                      No hay items con stock bajo
                    </td>
                  </tr>
                ) : (
                  criticalItems.map(item => (
                    <tr key={item.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant={item.tipo === 'insumo' ? 'info' : 'primary'}>
                          {item.tipo === 'insumo' ? 'Insumo' : 'Comprado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{item.name}</td>
                      <td className="py-3 px-4 text-coffee-600">{item.categoryName}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={item.stock <= 0 ? 'text-red-600 font-bold' : 'text-yellow-600 font-semibold'}>
                          {item.stock} {item.unidad || ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-600">
                        {item.minStock} {item.unidad || ''}
                      </td>
                      <td className="py-3 px-4 text-center">{getRatioBadge(item.ratio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        <PageSection title="Top 10 — Próximos a Agotarse" description="Ordenados por ratio stock/stock mínimo (menor = más urgente)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Categoría</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stock</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Mínimo</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Ratio</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {expiringItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-coffee-400">
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  expiringItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 text-coffee-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{item.name}</td>
                      <td className="py-3 px-4 text-coffee-600">{item.categoryName}</td>
                      <td className="py-3 px-4 text-right text-coffee-700">
                        {item.stock} {item.unidad || ''}
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-600">
                        {item.minStock} {item.unidad || ''}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${getRatioColor(item.ratio)}`}>
                          {(item.ratio * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{getStockBadge(item.stock, item.minStock)}</td>
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

export default InventoryReportPage;