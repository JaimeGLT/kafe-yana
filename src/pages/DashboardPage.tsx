import React, { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  CreditCard,
} from 'lucide-react';
import { MainLayout } from '../components/layout';
import { PageHeader, PageContainer } from '../components/layout';
import { KPICard, KPIGrid } from '../components/dashboard/KPICard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { SalesChart } from '../components/dashboard/SalesChart';
import { TopProductsChart } from '../components/dashboard/TopProductsChart';
import { RecentActivity, LowStockAlert } from '../components/dashboard/RecentActivity';
import { useInventoryStore, useSalesStore, useCashStore } from '../stores';
import { formatCurrency } from '../utils';

const DashboardPage: React.FC = () => {
  const inventoryStore = useInventoryStore();
  const salesStore = useSalesStore();
  const cashStore = useCashStore();

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });

  // Revenue chart: last 7 days
  const revenueData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayLabel = format(date, 'EEE', { locale: es });
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const daySales = salesStore.sales.filter(
        (s) =>
          s.status === 'completed' &&
          new Date(s.date) >= dayStart &&
          new Date(s.date) < dayEnd
      );
      const revenue = daySales.reduce((sum, s) => sum + s.total, 0);

      // expenses: mock based on revenue
      const expenses = revenue > 0 ? revenue * 0.45 : Math.round(Math.random() * 200 + 50);
      const finalRevenue = revenue > 0 ? revenue : Math.round(Math.random() * 600 + 200);

      return {
        day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        revenue: finalRevenue,
        expenses: Math.round(expenses),
      };
    });
  }, [salesStore.sales]);

  // Sales by hour chart: 8am–8pm
  const salesData = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const todaySales = salesStore.sales.filter(
      (s) =>
        s.status === 'completed' && new Date(s.date) >= todayStart
    );

    return Array.from({ length: 13 }, (_, i) => {
      const hour = 8 + i;
      const hourSales = todaySales.filter((s) => new Date(s.date).getHours() === hour);
      const totalSales = hourSales.reduce((sum, s) => sum + s.total, 0);
      const mockSales = totalSales > 0 ? totalSales : Math.round(Math.random() * 400 + 50);

      return {
        hour: `${hour}:00`,
        sales: mockSales,
        orders: hourSales.length > 0 ? hourSales.length : Math.floor(Math.random() * 8 + 1),
      };
    });
  }, [salesStore.sales]);

  // Top 5 products for pie chart
  const topProductsData = useMemo(() => {
    const top5 = inventoryStore.products.slice(0, 5);
    const total = top5.reduce((sum, p) => sum + p.stock, 0) || 1;

    return top5.map((p) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
      value: p.stock > 0 ? p.stock : Math.floor(Math.random() * 50 + 10),
      percentage: total > 0 ? Math.round((p.stock / total) * 100) : 20,
    }));
  }, [inventoryStore.products]);

  // Recent activity from last 5 sales
  const recentActivities = useMemo(() => {
    const last5 = [...salesStore.sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return last5.map((sale) => ({
      id: sale.id,
      type: 'sale' as const,
      title: `Venta ${sale.code}`,
      description: sale.customerName
        ? `Cliente: ${sale.customerName}`
        : `${sale.items.length} producto(s)`,
      timestamp: new Date(sale.date),
      amount: sale.total,
    }));
  }, [salesStore.sales]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return inventoryStore.products
      .filter((p) => p.isActive && p.stock <= p.minStock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
      }));
  }, [inventoryStore.products]);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Dashboard"
          subtitle={todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
        />

        {/* KPI Row */}
        <KPIGrid columns={4}>
          <KPICard
            title="Ventas de Hoy"
            value={formatCurrency(salesStore.stats.totalSalesToday)}
            icon={<ShoppingCart className="h-6 w-6" />}
            color="coffee"
            subtitle="Ventas completadas hoy"
          />
          <KPICard
            title="Ventas del Mes"
            value={formatCurrency(salesStore.stats.totalSalesMonth)}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
            subtitle="Acumulado mensual"
          />
          <KPICard
            title="Productos en Stock"
            value={inventoryStore.stats.activeProducts}
            icon={<Package className="h-6 w-6" />}
            color="blue"
            subtitle={`${inventoryStore.stats.lowStockProducts} con bajo stock`}
          />
          <KPICard
            title="Cajas Abiertas"
            value={cashStore.stats.openRegisters}
            icon={<CreditCard className="h-6 w-6" />}
            color="yellow"
            subtitle="Registros activos"
          />
        </KPIGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart
            data={revenueData}
            title="Ingresos y Gastos (últimos 7 días)"
          />
          <TopProductsChart
            data={topProductsData}
            title="Productos Más Vendidos"
          />
        </div>

        {/* Sales by Hour + Sales Chart Row */}
        <SalesChart
          data={salesData}
          title="Ventas por Hora (Hoy)"
        />

        {/* Activity + Low Stock Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity
            activities={recentActivities}
            title="Actividad Reciente"
            maxItems={5}
          />
          <LowStockAlert products={lowStockProducts} />
        </div>
      </PageContainer>
    </MainLayout>
  );
};

export default DashboardPage;
