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
import { useAuth } from '../../contexts/AuthContext';
import { gql } from '../../lib/graphql';
import { GET_VENTAS } from '../../lib/queries/ventas.queries';

interface SaleStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  averageTicket: number;
}

// ── Backend mapping ───────────────────────────────────────────────────────────

type PagoType = '1' | '2' | '3' | string;

const mapPagoToPaymentMethod = (pago: PagoType): { type: import('../../types').PaymentMethodType; name: string } => {
  switch (pago) {
    case '1': return { type: 'cash', name: 'Efectivo' };
    case '2': return { type: 'card', name: 'Tarjeta' };
    case '3': return { type: 'qr', name: 'QR' };
    default: return { type: 'cash', name: pago };
  }
};

const mapEstadoToStatus = (estado: string): Sale['status'] => {
  switch (estado) {
    case 'Finalizada': return 'completed';
    case 'Reembolsada': return 'refunded';
    case 'Parcialmente reembolsada': return 'partially_refunded';
    default: return 'completed';
  }
};

interface BackendVentaDetalle {
  id_venta: number;
  nombre: string;
  cantidad: number;
  precio: number;
  total: number;
  id: number;
}

interface BackendVenta {
  detalles: BackendVentaDetalle[];
  id: number;
  codigo: string;
  fecha: string;
  cliente: string;
  cajero: string;
  productos: number;
  pago: PagoType;
  estado: string;
  subtotal: number;
  total: number;
}

interface BackendVentasResponse {
  ventas: { nodes: BackendVenta[]; totalCount: number };
}

const mapBackendVentaToSale = (v: BackendVenta): Sale => {
  const payment = mapPagoToPaymentMethod(v.pago);
  return {
    id: String(v.id),
    code: v.codigo,
    date: new Date(v.fecha),
    customerId: undefined,
    customerName: v.cliente || undefined,
    cashierId: '',
    cashierName: v.cajero,
    branchId: '',
    branchName: '',
    status: mapEstadoToStatus(v.estado),
    subtotal: Number(v.subtotal),
    discount: 0,
    tax: 0,
    taxPercentage: 18,
    total: Number(v.total),
    paymentMethods: [{ id: String(v.id), type: payment.type, name: payment.name, amount: Number(v.total) }],
    items: v.detalles.map(d => ({
      id: String(d.id),
      productId: '',
      productName: d.nombre,
      productCode: '',
      quantity: d.cantidad,
      unit: 'unidad',
      unitPrice: Number(d.precio),
      discount: 0,
      subtotal: Number(d.total),
      tax: 0,
      total: Number(d.total),
    })),
    pointsEarned: undefined,
    pointsRedeemed: undefined,
    notes: undefined,
    refunds: [],
    createdAt: new Date(v.fecha),
    updatedAt: new Date(v.fecha),
  };
};

export const SalesListPage: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SaleStats>({ totalSalesToday: 0, totalSalesMonth: 0, averageTicket: 0 });
  const [_isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // ── Load from backend ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    gql<BackendVentasResponse>(GET_VENTAS)
      .then(data => {
        if (cancelled) return;
        setSales(data.ventas.nodes.map(mapBackendVentaToSale));
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Stats from real data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (sales.length === 0) {
      setStats({ totalSalesToday: 0, totalSalesMonth: 0, averageTicket: 0 });
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayCompleted = sales.filter(s => s.status === 'completed' && new Date(s.date) >= startOfToday);
    const monthCompleted = sales.filter(s => s.status === 'completed' && new Date(s.date) >= startOfMonth);

    const totalSalesToday = todayCompleted.reduce((sum, s) => sum + s.total, 0);
    const totalSalesMonth = monthCompleted.reduce((sum, s) => sum + s.total, 0);
    const countCompleted = monthCompleted.length;
    const averageTicket = countCompleted > 0 ? totalSalesMonth / countCompleted : 0;

    setStats({ totalSalesToday, totalSalesMonth, averageTicket });
  }, [sales]);

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
