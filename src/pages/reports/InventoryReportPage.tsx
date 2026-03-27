import React, { useMemo, useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Package, CheckCircle, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils';
import type { Product } from '../../types';
import type { InventoryStats } from '../../types';

const CHART_COLORS = {
  primary: '#8B4513',
  secondary: '#D4A574',
  tertiary: '#C4883A',
  success: '#22c55e',
  warning: '#eab308',
};

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
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, statsData] = await Promise.all([
          api.get<Product[]>('/products'),
          api.get<InventoryStats>('/inventory/stats'),
        ]);
        setProducts(productsData);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading inventory data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Category pie data
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    products.forEach((p: Product) => {
      const catName = p.categoryName || 'Sin categoría';
      if (!map[catName]) map[catName] = { name: catName, count: 0 };
      map[catName].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [products]);

  // Top 10 products by stock level
  const topStockProducts = useMemo(() =>
    [...products]
      .filter((p: Product) => p.isActive)
      .sort((a: Product, b: Product) => b.stock - a.stock)
      .slice(0, 10)
      .map((p: Product) => ({ nombre: p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name, stock: p.stock, minStock: p.minStock })),
    [products]
  );

  // Low stock products
  const lowStockProducts = useMemo(() =>
    products.filter((p: Product) => p.isActive && p.stock > 0 && p.stock <= p.minStock)
      .sort((a: Product, b: Product) => a.stock - b.stock),
    [products]
  );

  // Top 10 products by value (stock * costPrice)
  const topValueProducts = useMemo(() =>
    [...products]
      .filter((p: Product) => p.isActive)
      .map((p: Product) => ({ ...p, inventoryValue: p.stock * p.costPrice }))
      .sort((a: Product & { inventoryValue: number }, b: Product & { inventoryValue: number }) => b.inventoryValue - a.inventoryValue)
      .slice(0, 10),
    [products]
  );

  const getStockBadge = (stock: number, minStock: number) => {
    if (stock <= 0) return <Badge variant="danger">Agotado</Badge>;
    if (stock <= minStock) return <Badge variant="warning">Stock Bajo</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

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
            <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
              Exportar
            </Button>
          }
        />

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Total Productos"
            value={stats.totalProducts}
            subtitle="Registrados en el sistema"
            icon={<Package className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Productos Activos"
            value={stats.activeProducts}
            subtitle="Disponibles para venta"
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <KPICard
            title="Stock Bajo"
            value={stats.lowStockProducts}
            subtitle="Por debajo del mínimo"
            icon={<AlertTriangle className="h-6 w-6" />}
            color="yellow"
          />
          <KPICard
            title="Valor del Inventario"
            value={formatCurrency(stats.totalValue)}
            subtitle="Valorizado al costo"
            icon={<DollarSign className="h-6 w-6" />}
            color="blue"
          />
        </KPIGrid>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - By Category */}
          <PageSection title="Productos por Categoría" description="Distribución de productos por categoría">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_PALETTE[idx % PIE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(value) => [value, 'Productos']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-coffee-400">
                No hay datos de categorías
              </div>
            )}
          </PageSection>

          {/* Bar Chart - Stock Levels */}
          <PageSection title="Niveles de Stock (Top 10)" description="Stock actual de los 10 principales productos">
            {topStockProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topStockProducts} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B4F3B' }} />
                  <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11, fill: '#6B4F3B' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Bar dataKey="stock" name="Stock Actual" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="minStock" name="Stock Mínimo" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-coffee-400">
                No hay datos de stock
              </div>
            )}
          </PageSection>
        </div>

        {/* Low Stock Table */}
        <PageSection
          title="Productos con Stock Bajo"
          description="Productos que requieren reabastecimiento"
          action={
            <Badge variant="warning">{lowStockProducts.length} productos</Badge>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Código</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Categoría</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stock Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stock Mínimo</th>
                  <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-coffee-400">
                      No hay productos con stock bajo
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map(p => (
                    <tr key={p.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-coffee-600">{p.code}</td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{p.name}</td>
                      <td className="py-3 px-4 text-coffee-600">{p.categoryName}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={p.stock <= 0 ? 'text-red-600 font-bold' : 'text-yellow-600 font-semibold'}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-coffee-600">{p.minStock}</td>
                      <td className="py-3 px-4 text-center">{getStockBadge(p.stock, p.minStock)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* Top Value Products Table */}
        <PageSection title="Top 10 Productos por Valor de Inventario" description="Productos con mayor valor en stock">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100">
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Producto</th>
                  <th className="text-left py-3 px-4 font-semibold text-coffee-700">Categoría</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Stock</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Costo Unit.</th>
                  <th className="text-right py-3 px-4 font-semibold text-coffee-700">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {topValueProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-coffee-400">
                      No hay datos de inventario
                    </td>
                  </tr>
                ) : (
                  topValueProducts.map((p, idx) => (
                    <tr key={p.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                      <td className="py-3 px-4 text-coffee-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-coffee-900">{p.name}</td>
                      <td className="py-3 px-4 text-coffee-600">{p.categoryName}</td>
                      <td className="py-3 px-4 text-right text-coffee-700">{p.stock}</td>
                      <td className="py-3 px-4 text-right text-coffee-700">{formatCurrency(p.costPrice)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                        {formatCurrency(p.inventoryValue)}
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

export default InventoryReportPage;
