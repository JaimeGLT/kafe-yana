import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
import { formatCurrency } from '../utils';
import { useDashboard } from '../hooks/useDashboard';
import { useVentaDetalle } from '../hooks/useVentaDetalle';

const today = new Date(2026, 3, 17);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, revenueData, salesData, topProductsData, recentActivities, lowStockProducts, isLoading, error } = useDashboard();
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const { sale: selectedSale, isLoading: isLoadingSale, error: errorSale } = useVentaDetalle(selectedSaleId);

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
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Cargando...</p>
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
            onClick={() => navigate('/sales')}
          />
          <KPICard
            title="Ventas del Mes"
            value={formatCurrency(stats.totalSalesMonth)}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
            subtitle="Acumulado mensual"
            onClick={() => navigate('/sales')}
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
          <RevenueChart data={revenueData} title="Ingresos y Gastos (últimos 7 días)" />
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
          isLoading={isLoadingSale}
          error={errorSale}
        />
      </PageContainer>
    </MainLayout>
  );
};

export default DashboardPage;