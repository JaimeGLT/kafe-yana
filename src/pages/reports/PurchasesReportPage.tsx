import React, { useState, useMemo, useEffect } from 'react';
import { startOfMonth, endOfDay, format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ShoppingBag, Clock, CreditCard, Users, Calendar, FileText } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Input, Badge } from '../../components/ui';
import { KPICard, KPIGrid } from '../../components/dashboard/KPICard';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import type { PurchaseOrder, Supplier, AccountsPayable } from '../../types';

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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  received: 'Recibido',
  partial: 'Parcial',
  cancelled: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'info',
  received: 'success',
  partial: 'warning',
  cancelled: 'danger',
};

const PurchasesReportPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, suppliersData, payablesData] = await Promise.all([
          api.get<PurchaseOrder[]>('/purchases/orders'),
          api.get<Supplier[]>('/purchases/suppliers'),
          api.get<AccountsPayable[]>('/purchases/payables'),
        ]);
        setPurchaseOrders(ordersData);
        setSuppliers(suppliersData);
        setAccountsPayable(payablesData);
      } catch (error) {
        console.error('Error loading purchases data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(format(today, 'yyyy-MM-dd'));

  const filteredOrders = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = endOfDay(new Date(dateTo + 'T00:00:00'));
    return purchaseOrders.filter((o: PurchaseOrder) => {
      const d = new Date(o.date);
      return isWithinInterval(d, { start: from, end: to });
    });
  }, [purchaseOrders, dateFrom, dateTo]);

  // KPIs
  const totalPurchasesValue = useMemo(
    () => filteredOrders
      .filter((o: PurchaseOrder) => o.status !== 'cancelled' && o.status !== 'draft')
      .reduce((sum: number, o: PurchaseOrder) => sum + o.total, 0),
    [filteredOrders]
  );
  const pendingOrdersCount = useMemo(
    () => filteredOrders.filter((o: PurchaseOrder) => o.status === 'pending' || o.status === 'approved' || o.status === 'partial').length,
    [filteredOrders]
  );
  const pendingPaymentsAmount = useMemo(
    () => accountsPayable
      .filter((p: AccountsPayable) => p.status === 'pending' || p.status === 'partial')
      .reduce((sum: number, p: AccountsPayable) => sum + p.pendingAmount, 0),
    [accountsPayable]
  );
  const activeSuppliers = useMemo(() => suppliers.filter((s: Supplier) => s.isActive).length, [suppliers]);

  // Monthly breakdown chart
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o: PurchaseOrder) => {
      if (o.status === 'cancelled' || o.status === 'draft') return;
      const key = format(new Date(o.date), 'MMM yyyy', { locale: es });
      map[key] = (map[key] || 0) + o.total;
    });
    return Object.entries(map).map(([mes, total]) => ({ mes, total }));
  }, [filteredOrders]);

  // Top suppliers by purchase value
  const topSuppliers = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {};
    filteredOrders.forEach((o: PurchaseOrder) => {
      if (o.status === 'cancelled') return;
      const key = o.supplierId;
      const name = o.supplierName || 'Proveedor desconocido';
      if (!map[key]) map[key] = { name, total: 0, count: 0 };
      map[key].total += o.total;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredOrders]);

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
              <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
                Exportar
              </Button>
            </div>
          }
        />

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="Total Compras"
            value={formatCurrency(totalPurchasesValue)}
            subtitle="En el período seleccionado"
            icon={<ShoppingBag className="h-6 w-6" />}
            color="coffee"
          />
          <KPICard
            title="Órdenes Pendientes"
            value={pendingOrdersCount}
            subtitle="Por recibir o aprobar"
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <KPICard
            title="Pagos Pendientes"
            value={formatCurrency(pendingPaymentsAmount)}
            subtitle="Cuentas por pagar"
            icon={<CreditCard className="h-6 w-6" />}
            color="red"
          />
          <KPICard
            title="Proveedores Activos"
            value={activeSuppliers}
            subtitle="Proveedores habilitados"
            icon={<Users className="h-6 w-6" />}
            color="green"
          />
        </KPIGrid>

        {/* Monthly Bar Chart */}
        <PageSection title="Compras por Mes" description="Monto total de compras agrupado por mes">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8D5C4" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B4F3B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B4F3B' }} tickFormatter={v => `S/${v}`} />
                <Tooltip {...tooltipStyle} formatter={(value) => [formatCurrency(value as number), 'Total']} />
                <Legend />
                <Bar dataKey="total" name="Total Compras (S/)" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-coffee-400">
              No hay datos para el período seleccionado
            </div>
          )}
        </PageSection>

        {/* Top Suppliers */}
        <PageSection title="Top Proveedores por Monto de Compra" description="Proveedores con mayor volumen de compras en el período">
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

        {/* Recent Purchase Orders */}
        <PageSection title="Órdenes de Compra en el Período" description="Historial de órdenes en el rango de fechas seleccionado">
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-coffee-400">
                      No hay órdenes en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  [...filteredOrders]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(o => (
                      <tr key={o.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-coffee-600">{o.code}</td>
                        <td className="py-3 px-4 font-medium text-coffee-900">{o.supplierName || '—'}</td>
                        <td className="py-3 px-4 text-coffee-600">{formatDate(o.date)}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={STATUS_VARIANTS[o.status] || 'default'}>
                            {STATUS_LABELS[o.status] || o.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-coffee-900">
                          {formatCurrency(o.total)}
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

export default PurchasesReportPage;
