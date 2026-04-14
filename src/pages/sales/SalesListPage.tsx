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
import type { Sale } from '../../types';

interface SaleStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  averageTicket: number;
}

const STATUS_LABEL: Record<Sale['status'], string> = {
  pending:   'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
  refunded:  'Reembolsada',
};

export const SalesListPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SaleStats>({ totalSalesToday: 0, totalSalesMonth: 0, averageTicket: 0 });
  const [isLoading, setIsLoading] = useState(false);

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
        id: '1', code: 'VTA-00101',
        date: new Date(now - 20 * 60 * 1000),
        customerId: 'c1', customerName: 'Ana Torres',
        cashierId: 'u1', cashierName: 'Luis Quispe',
        branchId: 'b1', branchName: 'Local Principal',
        status: 'pending',
        subtotal: 76.27, tax: 13.73, discount: 0, taxPercentage: 18, total: 90,
        pointsEarned: 90, pointsRedeemed: 0,
        paymentMethods: [{ id: 'pm1', type: 'cash', name: 'Efectivo', amount: 90 }],
        items: [
          { id: 'i1', productId: 'p1', productName: 'Cappuccino 12oz', productCode: 'CAP12', quantity: 2, unit: 'taza', unitPrice: 45, discount: 0, subtotal: 90, tax: 0, total: 90 },
        ],
        createdAt: new Date(now - 20 * 60 * 1000), updatedAt: new Date(now - 20 * 60 * 1000),
      },
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
        id: '4', code: 'VTA-00098',
        date: new Date(now - 1 * 24 * 60 * 60 * 1000),
        customerId: 'c3', customerName: 'Sofía Ramos',
        cashierId: 'u1', cashierName: 'Luis Quispe',
        branchId: 'b1', branchName: 'Local Principal',
        status: 'cancelled',
        subtotal: 42.37, tax: 7.63, discount: 0, taxPercentage: 18, total: 50,
        pointsEarned: 0, pointsRedeemed: 50,
        paymentMethods: [{ id: 'pm5', type: 'cash', name: 'Efectivo', amount: 50 }],
        items: [
          { id: 'i7', productId: 'p1', productName: 'Cappuccino 12oz', productCode: 'CAP12', quantity: 1, unit: 'taza', unitPrice: 45, discount: 0, subtotal: 45, tax: 0, total: 45, isRedeemed: true },
        ],
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000), updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
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

  // ── Cambio de estado ───────────────────────────────────────────────────────
  //
  // TODO: reemplazar con mutación GraphQL cuando el backend lo implemente:
  //
  //   mutation CambiarEstadoVenta($saleId: ID!, $status: SaleStatus!, $force: Boolean) {
  //     cambiarEstadoVenta(saleId: $saleId, status: $status, force: $force) {
  //       success
  //       sale { id status }
  //       refundBlocked { customerPoints pointsNeeded }
  //     }
  //   }
  //
  // — MOCK — simula la lógica de puntos del backend —
  const handleStatusChange = useCallback(async (
    saleId: string,
    newStatus: Sale['status'],
    force = false,
  ): Promise<{ blocked?: RefundBlockedInfo } | void> => {
    await new Promise((r) => setTimeout(r, 350)); // simula latencia

    const sale = sales.find((s) => s.id === saleId);

    // Simula bloqueo de reembolso: si la venta tiene puntos ganados y el cliente
    // no tiene suficientes para revertirlos, el backend bloquea (a menos que sea forzado).
    if (newStatus === 'refunded' && !force && sale) {
      const pointsNeeded = sale.pointsEarned ?? 0;
      const customerPoints = Math.floor(pointsNeeded * 0.3); // simula que ya gastó el 70%
      if (pointsNeeded > 0 && customerPoints < pointsNeeded) {
        return { blocked: { customerPoints, pointsNeeded } };
      }
    }

    setSales((prev) => prev.map((s) => s.id === saleId ? { ...s, status: newStatus } : s));
    toast.success('Estado actualizado', `Venta marcada como ${STATUS_LABEL[newStatus]}.`);
  }, [sales]);

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
    { value: '',           label: 'Todos los estados' },
    { value: 'completed',  label: 'Completada' },
    { value: 'pending',    label: 'Pendiente' },
    { value: 'cancelled',  label: 'Cancelada' },
    { value: 'refunded',   label: 'Reembolsada' },
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
          onStatusChange={handleStatusChange}
        />
      </PageContainer>
    </MainLayout>
  );
};
