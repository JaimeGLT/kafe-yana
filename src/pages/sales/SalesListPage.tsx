import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Input, Select, SkeletonSalesTable } from '../../components/ui';
import { SalesTable } from '../../components/tables/SalesTable';
import { SaleDetailModal } from '../../components/modals/SaleDetailModal';
import { RefundModal } from '../../components/modals/RefundModal';
import { SaleReceiptModal } from '../../components/modals/SaleReceiptModal';
import { api } from '../../lib/api';
import { toast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils';
import type { Sale } from '../../types';
import { gql } from '../../lib/graphql';
import { GET_VENTAS } from '../../lib/queries/ventas.queries';

interface SaleStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  averageTicket: number;
}

// ── Backend mapping ───────────────────────────────────────────────────────────

const mapEstadoToStatus = (estado: string): Sale['status'] => {
  const e = estado.toLowerCase();
  if (e === 'finalizada' || e === 'finalizado') return 'completed';
  if (e === 'reembolsada' || e === 'reembolsado') return 'refunded';
  if (e.startsWith('parcialmente')) return 'partially_refunded';
  return 'completed';
};

interface BackendVentaDetalle {
  nombre: string;
  cantidad: number;
  precio: number;
  total: number;
  ubicacion?: string;
}

interface BackendVenta {
  id: number;
  detalles: BackendVentaDetalle[];
  codigo: string;
  fecha: string;
  cliente: string;
  cajero: string;
  productos: number;
  estado: string;
  subtotal: number;
  total: number;
  pagoEfectivo: number;
  pagoTarjeta: number;
  pagoQr: number;
}

interface BackendVentasResponse {
  ventas: {
    nodes: BackendVenta[];
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const mapBackendVentaToSale = (v: BackendVenta): Sale => {
  const paymentMethods: Sale['paymentMethods'] = [];
  if (v.pagoEfectivo > 0) paymentMethods.push({ id: `${v.codigo}-cash`, type: 'cash', name: 'Efectivo', amount: Number(v.pagoEfectivo) });
  if (v.pagoTarjeta > 0) paymentMethods.push({ id: `${v.codigo}-card`, type: 'card', name: 'Tarjeta', amount: Number(v.pagoTarjeta) });
  if (v.pagoQr > 0) paymentMethods.push({ id: `${v.codigo}-qr`, type: 'qr', name: 'QR', amount: Number(v.pagoQr) });

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
    paymentMethods,
    items: v.detalles.map((d, i) => ({
      id: `${v.codigo}-${i}`,
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
      ubicacion: d.ubicacion?.toLowerCase(),
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
  const location = useLocation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SaleStats>({ totalSalesToday: 0, totalSalesMonth: 0, averageTicket: 0 });
  const [_isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string>(() => (location.state as any)?.dateFrom ?? '');
  const [dateTo, setDateTo] = useState<string>(() => (location.state as any)?.dateTo ?? '');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const [afterCursor, setAfterCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Load from backend ────────────────────────────────────────────────────────

  const loadVentas = useCallback((cursor: string | null, append: boolean) => {
    if (cursor === null) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    gql<BackendVentasResponse>(GET_VENTAS, cursor ? { after: cursor } : {})
      .then(data => {
        if (!data.ventas) return;
        const nodes = data.ventas.nodes.map(mapBackendVentaToSale);
        if (append) {
          setSales(prev => [...prev, ...nodes]);
        } else {
          setSales(nodes);
        }
        setAfterCursor(data.ventas.pageInfo.endCursor ?? null);
        setHasNextPage(data.ventas.pageInfo.hasNextPage ?? false);
        setTotalCount(data.ventas.totalCount ?? 0);
      })
      .finally(() => {
        setIsLoading(false);
        setIsLoadingMore(false);
      });
  }, []);

  useEffect(() => {
    loadVentas(null, false);
  }, [loadVentas]);

  const handleLoadMore = () => {
    if (afterCursor && !isLoadingMore) {
      loadVentas(afterCursor, true);
    }
  };

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

  const handleSimpleRefund = async (id: string, amount: number, reason: string, paymentType: string) => {
    if (!refundingSale) return;
    await api.post(`/Venta/reembolso/${id}`, {
      monto: amount,
      nota: reason,
      tipoPago: paymentType,
    });
    setSales(prev => prev.map(s =>
      s.id === refundingSale.id ? { ...s, status: 'refunded' as const } : s
    ));
    toast.success('Reembolso registrado', `${formatCurrency(amount)} reembolsados.`);
    setRefundingSale(null);
  };

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
      if (dateFrom || dateTo) {
        const saleDate = sale.date instanceof Date && !isNaN(sale.date.getTime())
          ? sale.date.toLocaleDateString('en-CA')
          : '';
        if (dateFrom && saleDate < dateFrom) return false;
        if (dateTo   && saleDate > dateTo)   return false;
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

  const handlePrintComanda = (sale: Sale) => setPrintSale(sale);

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
          {_isLoading ? (
            <SkeletonSalesTable />
          ) : (
            <>
              <SalesTable
                sales={filteredSales}
                onView={(sale) => setSelectedSale(sale)}
                onRefund={(sale) => setRefundingSale(sale)}
                onPrint={handlePrintComanda}
              />
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2.5 bg-coffee-100 hover:bg-coffee-200 text-coffee-700 font-semibold text-sm rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="h-4 w-4 border-2 border-coffee-400 border-t-transparent rounded-full animate-spin" />
                        Cargando más...
                      </>
                    ) : (
                      <>Ver más ({sales.length} de {totalCount})</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </PageSection>

        {/* Modal de detalle */}
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />

        <RefundModal
          isOpen={!!refundingSale}
          onClose={() => setRefundingSale(null)}
          sale={refundingSale}
          onConfirm={handleSimpleRefund}
        />

        <SaleReceiptModal
          sale={printSale}
          onClose={() => setPrintSale(null)}
        />
      </PageContainer>
    </MainLayout>
  );
};
