import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Input, Select } from '../../components/ui';
import { SalesTable } from '../../components/tables/SalesTable';
import { SaleDetailModal } from '../../components/modals/SaleDetailModal';
import type { RefundBlockedInfo } from '../../components/modals/SaleDetailModal';
import { toast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils';
import type { Sale, RefundInput, Refund, RefundItem } from '../../types';
// RefundBlockedInfo re-exported from modal
import { useAuth } from '../../contexts/AuthContext';

interface SaleStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  averageTicket: number;
}


export const SalesListPage: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SaleStats>({ totalSalesToday: 0, totalSalesMonth: 0, averageTicket: 0 });
  const [_isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // TODO: reemplazar con gql() cuando el backend esté listo:
  //
  //   gql<{ ventas: Sale[]; ventasStats: SaleStats }>(GET_VENTAS_QUERY).then(({ ventas, ventasStats }) => {
  //     setSales(ventas); setStats(ventasStats);
  //   })
  //
  useEffect(() => {
    const now = Date.now();
    const MOCK_SALES: Sale[] = [
      {
        id: '2', code: 'VTA-00100',
        date: new Date(now - 2 * 60 * 60 * 1000),
        customerId: 'c2', customerName: 'Carlos Mendoza',
        cashierId: 'u1', cashierName: 'Luis Quispe',
        branchId: 'b1', branchName: 'Local Principal',
        status: 'completed',
        subtotal: 101.69, tax: 18.31, discount: 0, taxPercentage: 18, total: 120,
        pointsEarned: 120, pointsRedeemed: 50,
        paymentMethods: [{ id: 'pm2', type: 'card', name: 'Tarjeta', amount: 120 }],
        items: [
          { id: 'i2', productId: 'p2', productName: 'Latte con vainilla', productCode: 'LAT01', quantity: 1, unit: 'taza', unitPrice: 52, discount: 0, subtotal: 52, tax: 0, total: 52 },
          { id: 'i3', productId: 'p3', productName: 'Croissant de mantequilla', productCode: 'CRO01', quantity: 1, unit: 'unidad', unitPrice: 18, discount: 0, subtotal: 18, tax: 0, total: 18, isRedeemed: true },
          { id: 'i4', productId: 'p4', productName: 'Combo desayuno clásico', productCode: 'KIT01', quantity: 1, unit: 'combo', unitPrice: 50, discount: 0, subtotal: 50, tax: 0, total: 50 },
        ],
        createdAt: new Date(now - 2 * 60 * 60 * 1000), updatedAt: new Date(now - 2 * 60 * 60 * 1000),
      },
      {
        id: '3', code: 'VTA-00099',
        date: new Date(now - 5 * 60 * 60 * 1000),
        cashierId: 'u2', cashierName: 'María Salas',
        branchId: 'b1', branchName: 'Local Principal',
        status: 'completed',
        subtotal: 67.80, tax: 12.20, discount: 0, taxPercentage: 18, total: 80,
        paymentMethods: [{ id: 'pm4', type: 'cash', name: 'Efectivo', amount: 80 }],
        items: [
          { id: 'i5', productId: 'p5', productName: 'Americano grande', productCode: 'AME01', quantity: 2, unit: 'taza', unitPrice: 35, discount: 0, subtotal: 70, tax: 0, total: 70 },
          { id: 'i6', productId: 'p6', productName: 'Muffin de arándanos', productCode: 'MUF01', quantity: 1, unit: 'unidad', unitPrice: 10, discount: 0, subtotal: 10, tax: 0, total: 10 },
        ],
        createdAt: new Date(now - 5 * 60 * 60 * 1000), updatedAt: new Date(now - 5 * 60 * 60 * 1000),
      },
      {
        id: '5', code: 'VTA-00097',
        date: new Date(now - 2 * 24 * 60 * 60 * 1000),
        customerId: 'c2', customerName: 'Carlos Mendoza',
        cashierId: 'u2', cashierName: 'María Salas',
        branchId: 'b1', branchName: 'Local Principal',
        status: 'refunded',
        subtotal: 101.69, tax: 18.31, discount: 0, taxPercentage: 18, total: 120,
        pointsEarned: 120, pointsRedeemed: 0,
        notes: 'Cliente insatisfecho con el pedido',
        paymentMethods: [{ id: 'pm6', type: 'card', name: 'Tarjeta', amount: 120 }],
        items: [
          { id: 'i8', productId: 'p7', productName: 'Frappé caramelo', productCode: 'FRA01', quantity: 2, unit: 'vaso', unitPrice: 55, discount: 0, subtotal: 110, tax: 0, total: 110 },
          { id: 'i9', productId: 'p6', productName: 'Muffin de arándanos', productCode: 'MUF01', quantity: 1, unit: 'unidad', unitPrice: 10, discount: 0, subtotal: 10, tax: 0, total: 10 },
        ],
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000), updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    const MOCK_STATS: SaleStats = {
      totalSalesToday: 290,
      totalSalesMonth: 18450,
      averageTicket: 87.5,
    };

    setTimeout(() => {
      setSales(MOCK_SALES);
      setStats(MOCK_STATS);
      setIsLoading(false);
    }, 400);
  }, []);

  // ── Reembolso ─────────────────────────────────────────────────────────────
  const handleRefund = useCallback(async (
    saleId: string,
    input: RefundInput,
    force = false,
  ): Promise<{ blocked?: RefundBlockedInfo } | void> => {
    await new Promise(r => setTimeout(r, 350));

    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    // Simula bloqueo por puntos igual que antes (solo reembolso total)
    if (input.type === 'total' && !force) {
      const pointsNeeded = sale.pointsEarned ?? 0;
      const customerPoints = Math.floor(pointsNeeded * 0.3);
      if (pointsNeeded > 0 && customerPoints < pointsNeeded) {
        return { blocked: { customerPoints, pointsNeeded } };
      }
    }

    const refundedBy = user?.nombre ?? 'Sistema';
    const now = new Date();

    // Construir el objeto Refund
    let refundItems: RefundItem[];
    let refundAmount: number;

    if (input.type === 'total') {
      refundItems = sale.items
        .filter(i => !i.isRedeemed)
        .map(i => ({ saleItemId: i.id, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.total }));
      refundAmount = sale.total;
    } else {
      refundItems = (input.items ?? []).map(ri => {
        const item = sale.items.find(i => i.id === ri.saleItemId)!;
        return { saleItemId: ri.saleItemId, productName: item.productName, quantity: ri.quantity, unitPrice: item.unitPrice, amount: item.unitPrice * ri.quantity };
      });
      refundAmount = refundItems.reduce((s, i) => s + i.amount, 0);
    }

    const newRefund: Refund = {
      id: `ref_${Date.now()}`,
      type: input.type,
      items: refundItems,
      amount: refundAmount,
      reason: input.reason,
      refundedBy,
      refundedAt: now,
    };

    // Determinar nuevo status
    const allRefundedQty = (itemId: string) => {
      const prev = (sale.refunds ?? []).reduce((s, r) => {
        return s + (r.items.find(ri => ri.saleItemId === itemId)?.quantity ?? 0);
      }, 0);
      return prev + (refundItems.find(ri => ri.saleItemId === itemId)?.quantity ?? 0);
    };
    const allItemsFullyRefunded = sale.items
      .filter(i => !i.isRedeemed)
      .every(i => allRefundedQty(i.id) >= i.quantity);

    const newStatus: Sale['status'] = (input.type === 'total' || allItemsFullyRefunded) ? 'refunded' : 'partially_refunded';

    setSales(prev => prev.map(s => s.id === saleId ? {
      ...s,
      status: newStatus,
      refunds: [...(s.refunds ?? []), newRefund],
    } : s));

    toast.success('Reembolso registrado', `${input.type === 'total' ? 'Total' : 'Parcial'} — ${new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(refundAmount)}`);
  }, [sales, user]);

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !sale.code.toLowerCase().includes(q) &&
          !(sale.customerName ?? '').toLowerCase().includes(q)
        ) return false;
      }
      if (dateFrom && new Date(sale.date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(sale.date) > to) return false;
      }
      if (statusFilter && sale.status !== statusFilter) return false;
      return true;
    });
  }, [sales, search, dateFrom, dateTo, statusFilter]);

  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales.filter((s) => s.status === 'completed' && new Date(s.date) >= today);
  }, [sales]);

  const statusOptions = [
    { value: '',                   label: 'Todos los estados' },
    { value: 'completed',          label: 'Completada' },
    { value: 'refunded',           label: 'Reembolsada' },
    { value: 'partially_refunded', label: 'Parcialmente reembolsada' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Historial de Ventas"
          subtitle="Consulta y filtra todas las ventas realizadas"
        />

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-6 w-6 text-coffee-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas Hoy</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(stats.totalSalesToday)}
              </p>
              <p className="text-xs text-coffee-400">{todaySales.length} transacciones</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas del Mes</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(stats.totalSalesMonth)}
              </p>
              <p className="text-xs text-coffee-400">Ticket promedio: {formatCurrency(stats.averageTicket)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas Hoy (conteo)</p>
              <p className="text-2xl font-display font-bold text-coffee-900">{todaySales.length}</p>
              <p className="text-xs text-coffee-400">Transacciones completadas</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Input
              type="date"
              label="Desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              label="Hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Tabla */}
        <PageSection>
          <SalesTable
            sales={filteredSales}
            onView={(sale) => setSelectedSale(sale)}
          />
        </PageSection>

        {/* Modal de detalle */}
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onRefund={handleRefund}
        />
      </PageContainer>
    </MainLayout>
  );
};
