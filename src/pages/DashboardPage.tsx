import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShoppingCart, TrendingUp, Package, CreditCard } from 'lucide-react';
import { MainLayout } from '../components/layout';
import { PageHeader, PageContainer } from '../components/layout';
import { KPICard, KPIGrid } from '../components/dashboard/KPICard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { SalesChart } from '../components/dashboard/SalesChart';
import { TopProductsChart } from '../components/dashboard/TopProductsChart';
import { RecentActivity, LowStockAlert } from '../components/dashboard/RecentActivity';
import { SaleDetailModal } from '../components/modals/SaleDetailModal';
import { SkeletonKpiCard, SkeletonChart, SkeletonActivityList } from '../components/ui';
import { formatCurrency } from '../utils';
import { useDashboard } from '../hooks/useDashboard';
import type { Sale } from '../types';

const today = new Date(2026, 3, 17);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, revenueData, salesData, topProductsData, recentActivities, lowStockProducts, rawVentas, isLoading, error } = useDashboard();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const selectedSale = useMemo<Sale | null>(() => {
    if (!selectedSaleId) return null;
    const v = rawVentas.find((s) => String(s.id) === selectedSaleId);
    if (!v) return null;
    const paymentMethods: Sale['paymentMethods'] = [];
    if (v.pagoEfectivo > 0) paymentMethods.push({ id: `${v.codigo}-cash`, type: 'cash', name: 'Efectivo', amount: Number(v.pagoEfectivo) });
    if (v.pagoTarjeta > 0) paymentMethods.push({ id: `${v.codigo}-card`, type: 'card', name: 'Tarjeta', amount: Number(v.pagoTarjeta) });
    if (v.pagoQr > 0) paymentMethods.push({ id: `${v.codigo}-qr`, type: 'qr', name: 'QR', amount: Number(v.pagoQr) });
    const parseDecimal = (val: string | number | null | undefined) => (val == null ? 0 : typeof val === 'number' ? val : parseFloat(val) || 0);
    const parseDate = (val: string | null | undefined) => (val ? new Date(val) : new Date());
    return {
      id: String(v.id),
      code: v.codigo,
      date: parseDate(v.fecha),
      customerId: undefined,
      customerName: v.cliente || undefined,
      cashierId: '',
      cashierName: v.cajero || undefined,
      branchId: '',
      branchName: '',
      status: 'completed',
      subtotal: parseDecimal(v.subtotal),
      discount: 0,
      tax: 0,
      taxPercentage: 18,
      total: parseDecimal(v.total),
      paymentMethods,
      items: (v.detalles ?? []).map((d, i) => ({
        id: `${v.codigo}-${i}`,
        productId: '',
        productName: d.nombre,
        productCode: '',
        quantity: d.cantidad,
        unit: 'unidad',
        unitPrice: parseDecimal(d.precio),
        discount: 0,
        subtotal: parseDecimal(d.total),
        tax: 0,
        total: parseDecimal(d.total),
      })),
      pointsEarned: undefined,
      pointsRedeemed: undefined,
      notes: undefined,
      refunds: [],
      createdAt: parseDate(v.fecha),
      updatedAt: parseDate(v.fecha),
    };
  }, [selectedSaleId, rawVentas]);

  const handleViewSaleDetail = (saleId: string) => {
    setSelectedSaleId(saleId);
  };

  const handleCloseSaleDetail = () => {
    setSelectedSaleId(null);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Dashboard" subtitle="" />
          <KPIGrid columns={4}>
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </KPIGrid>
          <div className="grid grid-cols-1 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonChart />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonActivityList rows={5} />
            <SkeletonActivityList rows={4} />
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader title="Dashboard" subtitle="" />
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">{error}</p>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  const todayLabel = format(today, "EEEE, d 'de' MMMM yyyy", { locale: es });

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          subtitle={todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
        />

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Ventas de Hoy"
            value={formatCurrency(stats.totalSalesToday)}
            icon={<ShoppingCart className="h-6 w-6" />}
            color="coffee"
            subtitle="Ventas completadas hoy"
            onClick={() => {
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              navigate('/sales', { state: { dateFrom: todayStr, dateTo: todayStr } });
            }}
          />
          <KPICard
            title="Ventas del Mes"
            value={formatCurrency(stats.totalSalesMonth)}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
            subtitle="Acumulado mensual"
            onClick={() => navigate('/sales', { state: {
              dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
              dateTo: format(new Date(), 'yyyy-MM-dd'),
            } })}
          />
          <KPICard
            title="Productos Activos"
            value={stats.activeProducts}
            icon={<Package className="h-6 w-6" />}
            color="blue"
            subtitle={`${stats.lowStockProducts} con bajo stock`}
            onClick={() => navigate('/reports/inventory')}
          />
          <KPICard
            title="Cajas Abiertas"
            value={stats.openRegisters} 
            icon={<CreditCard className="h-6 w-6" />}
            color="yellow"
            subtitle="Registros activos"
            onClick={() => navigate('/reports/cash')}
          />
        </KPIGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6">
          <RevenueChart data={revenueData} title="Ingresos y Gastos (últimos 1537 días)" />
          <TopProductsChart data={topProductsData} title="Productos Más Vendidos" />
        </div>

        {/* Sales by Hour */}
        <SalesChart data={salesData} title="Ventas por Hora (Hoy)" />

        {/* Activity + Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity activities={recentActivities} title="Actividad Reciente" maxItems={5} onViewSaleDetail={handleViewSaleDetail} />
          <LowStockAlert products={lowStockProducts} />
        </div>

        <SaleDetailModal
          sale={selectedSale}
          onClose={handleCloseSaleDetail}
          isLoading={false}
          error={selectedSaleId && !selectedSale ? 'No se encontró el detalle de la venta.' : null}
        />
      </PageContainer>
    </MainLayout>
  );
};

export default DashboardPage;