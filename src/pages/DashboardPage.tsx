import React, { useMemo } from 'react';
import { format, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShoppingCart, TrendingUp, Package, CreditCard } from 'lucide-react';
import { MainLayout } from '../components/layout';
import { PageHeader, PageContainer } from '../components/layout';
import { KPICard, KPIGrid } from '../components/dashboard/KPICard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { SalesChart } from '../components/dashboard/SalesChart';
import { TopProductsChart } from '../components/dashboard/TopProductsChart';
import { RecentActivity, LowStockAlert } from '../components/dashboard/RecentActivity';
import { formatCurrency } from '../utils';
import {
  MOCK_SALES,
  MOCK_PRODUCTS,
  MOCK_INVENTORY_STATS,
  MOCK_CASH_REGISTERS,
  MOCK_CASH_MOVEMENTS,
} from '../data/reportsMocks';
import type { Sale, Product } from '../types';

const today = new Date(2026, 3, 17);

const DashboardPage: React.FC = () => {
  const todayLabel = format(today, "EEEE, d 'de' MMMM yyyy", { locale: es });

  const completedSales = useMemo(
    () => MOCK_SALES.filter((s: Sale) => s.status === 'completed'),
    []
  );

  // KPIs
  const totalSalesToday = useMemo(
    () => completedSales
      .filter((s: Sale) => isSameDay(new Date(s.date), today))
      .reduce((sum, s) => sum + s.total, 0),
    [completedSales]
  );

  const totalSalesMonth = useMemo(
    () => completedSales.reduce((sum, s) => sum + s.total, 0),
    [completedSales]
  );

  const openRegisters = MOCK_CASH_REGISTERS.filter(r => r.status === 'open').length;

  // Revenue chart: last 7 days
  const revenueData = useMemo(() => {
    const expensesByDay: Record<string, number> = {};
    MOCK_CASH_MOVEMENTS.forEach(m => {
      if (m.type === 'expense') {
        const key = format(new Date(m.date), 'yyyy-MM-dd');
        expensesByDay[key] = (expensesByDay[key] ?? 0) + m.amount;
      }
    });

    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const key = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'EEE', { locale: es });

      const revenue = completedSales
        .filter((s: Sale) => isSameDay(new Date(s.date), date))
        .reduce((sum, s) => sum + s.total, 0);

      const expenses = expensesByDay[key] ?? 0;

      return {
        day: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        revenue,
        expenses,
      };
    });
  }, [completedSales]);

  // Sales by hour chart: 8am–8pm (today)
  const salesData = useMemo(() => {
    const todaySales = completedSales.filter((s: Sale) => isSameDay(new Date(s.date), today));

    return Array.from({ length: 13 }, (_, i) => {
      const hour = 8 + i;
      const hourSales = todaySales.filter((s: Sale) => new Date(s.date).getHours() === hour);
      return {
        hour: `${hour}:00`,
        sales: hourSales.reduce((sum, s) => sum + s.total, 0),
        orders: hourSales.length,
      };
    });
  }, [completedSales]);

  // Top 5 products by revenue
  const topProductsData = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    completedSales.forEach(s => {
      s.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, value: 0 };
        map[item.productId].value += item.quantity;
      });
    });
    const sorted = Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
    const total = sorted.reduce((s, p) => s + p.value, 0) || 1;
    return sorted.map(p => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
      value: p.value,
      percentage: Math.round((p.value / total) * 100),
    }));
  }, [completedSales]);

  // Recent activity: last 5 sales
  const recentActivities = useMemo(() => {
    return [...completedSales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((s: Sale) => ({
        id: s.id,
        type: 'sale' as const,
        title: `Venta ${s.code}`,
        description: s.customerName ? `Cliente: ${s.customerName}` : `${s.items.length} producto(s)`,
        timestamp: new Date(s.date),
        amount: s.total,
      }));
  }, [completedSales]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return MOCK_PRODUCTS
      .filter((p: Product) => p.isActive && p.minStock > 0 && p.stock <= p.minStock)
      .map((p: Product) => ({ id: p.id, name: p.name, stock: p.stock, minStock: p.minStock }));
  }, []);

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
            value={formatCurrency(totalSalesToday)}
            icon={<ShoppingCart className="h-6 w-6" />}
            color="coffee"
            subtitle="Ventas completadas hoy"
          />
          <KPICard
            title="Ventas del Mes"
            value={formatCurrency(totalSalesMonth)}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
            subtitle="Acumulado mensual"
          />
          <KPICard
            title="Productos Activos"
            value={MOCK_INVENTORY_STATS.activeProducts}
            icon={<Package className="h-6 w-6" />}
            color="blue"
            subtitle={`${MOCK_INVENTORY_STATS.lowStockProducts} con bajo stock`}
          />
          <KPICard
            title="Cajas Abiertas"
            value={openRegisters}
            icon={<CreditCard className="h-6 w-6" />}
            color="yellow"
            subtitle="Registros activos"
          />
        </KPIGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart data={revenueData} title="Ingresos y Gastos (últimos 7 días)" />
          <TopProductsChart data={topProductsData} title="Productos Más Vendidos" />
        </div>

        {/* Sales by Hour */}
        <SalesChart data={salesData} title="Ventas por Hora (Hoy)" />

        {/* Activity + Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity activities={recentActivities} title="Actividad Reciente" maxItems={5} />
          <LowStockAlert products={lowStockProducts} />
        </div>
      </PageContainer>
    </MainLayout>
  );
};

export default DashboardPage;
