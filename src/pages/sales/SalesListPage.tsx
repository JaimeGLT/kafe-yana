import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Input, Select, SkeletonSalesTable } from '../../components/ui';
import { SalesTable } from '../../components/tables/SalesTable';
import { SaleDetailModal } from '../../components/modals/SaleDetailModal';
import { RefundModal } from '../../components/modals/RefundModal';
import { AnularFacturaModal } from '../../components/modals/AnularFacturaModal';
import { SaleReceiptModal } from '../../components/modals/SaleReceiptModal';
import { api } from '../../lib/api';
import { toast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils';
import type { Sale } from '../../types';
import { esEstadoValidadaSiat } from '../../types/siat';
import { gql } from '../../lib/graphql';
import { GET_VENTAS } from '../../lib/queries/ventas.queries';
import { useFacturacion } from '../../hooks/useFacturacion';

interface SaleStats {
  totalSalesToday: number;
  totalSalesMonth: number;
  averageTicket: number;
}

// ── Backend mapping ───────────────────────────────────────────────────────────

const mapEstadoToStatus = (estado: string | null): Sale['status'] => {
  const e = (estado ?? '').toLowerCase();
  if (e === 'validada' || e === 'finalizada' || e === 'finalizado') return 'completed';
  if (e === 'anulada' || e === 'reembolsada' || e === 'reembolsado') return 'refunded';
  if (e.startsWith('parcialmente')) return 'partially_refunded';
  return 'completed';
};

interface BackendVentaDetalle {
  id: number;
  id_venta: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | string;
  subTotal: number | string;
  codigoProducto?: string;
  unidadMedida?: number;
}

interface BackendVenta {
  id: number;
  numeroFactura: number | null;
  fechaEmision: string;
  nombreRazonSocial: string;
  usuario: string;
  estadoSiat: string | null;
  montoTotalSujetoIva: number | string;
  montoTotal: number | string;
  numeroTarjeta: string | null;
  detalles: BackendVentaDetalle[];
}

interface BackendVentasResponse {
  ventas: {
    nodes: BackendVenta[];
    totalCount: number;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const mapBackendVentaToSale = (v: BackendVenta): Sale => {
  // numeroFactura llega null en ventas que aún no pasaron por SIAT
  // (o fueron anuladas localmente). Caemos al id interno para que el código
  // visible siga siendo único.
  const codeLabel = `V-${v.numeroFactura ?? v.id}`;
  const monto = Number(v.montoTotal);
  const esTarjeta = v.numeroTarjeta != null && v.numeroTarjeta !== '';

  const paymentMethods: Sale['paymentMethods'] = [];
  if (esTarjeta) {
    paymentMethods.push({ id: `${codeLabel}-card`, type: 'card', name: 'Tarjeta', amount: monto });
  } else {
    paymentMethods.push({ id: `${codeLabel}-cash`, type: 'cash', name: 'Efectivo', amount: monto });
  }

  return {
    id: String(v.id),
    code: codeLabel,
    date: new Date(v.fechaEmision),
    customerId: undefined,
    customerName: v.nombreRazonSocial || undefined,
    cashierId: '',
    cashierName: v.usuario,
    branchId: '',
    branchName: '',
    status: mapEstadoToStatus(v.estadoSiat),
    subtotal: Number(v.montoTotalSujetoIva),
    discount: 0,
    tax: 0,
    taxPercentage: 18,
    total: monto,
    paymentMethods,
    items: v.detalles.map((d, i) => ({
      id: `${codeLabel}-${i}`,
      productId: d.codigoProducto ?? '',
      productCode: d.codigoProducto ?? '',
      productName: d.descripcion,
      quantity: d.cantidad,
      unit: d.unidadMedida != null ? String(d.unidadMedida) : 'unidad',
      unitPrice: Number(d.precioUnitario),
      discount: 0,
      subtotal: Number(d.subTotal),
      tax: 0,
      total: Number(d.subTotal),
    })),
    pointsEarned: undefined,
    pointsRedeemed: undefined,
    notes: undefined,
    refunds: [],
    createdAt: new Date(v.fechaEmision),
    updatedAt: new Date(v.fechaEmision),

    // SIAT
    ventaId: v.id,
    estadoSiat: v.estadoSiat,
    siatAceptada: esEstadoValidadaSiat(v.estadoSiat),
    errorSiat: null,
    numeroFactura: v.numeroFactura,
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
  const [estadoSiatFilter, setEstadoSiatFilter] = useState<'todos'|'validada'|'observada'|'pendiente'|'anulada'>('todos');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const [anularSale, setAnularSale] = useState<Sale | null>(null);

  // SIAT
  const { imprimirFactura, reenviarFactura, anularFactura } = useFacturacion();

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

        // Si el modal de detalle está abierto, sincronizarlo con la versión
        // recién cargada (importante tras anular en SIAT para que el badge
        // y el botón "Anular en SIAT" reflejen el estado real sin recargar).
        setSelectedSale(prev => {
          if (!prev || prev.ventaId == null) return prev;
          const updated = nodes.find(n => n.ventaId === prev.ventaId);
          return updated ?? prev;
        });
      })
      .catch((err) => {
        // Si el mapper explota (p.ej. un null inesperado del backend) lo
        // registramos para que no se pierda silenciosamente y bloquee la lista.
        console.error('[SalesListPage] Error cargando ventas:', err);
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
      if (estadoSiatFilter !== 'todos') {
        const e = String(sale.estadoSiat ?? '').toLowerCase();
        if (estadoSiatFilter === 'validada'  && !(e === 'validada'  || e === 'finalizada'  || e === 'finalizado')) return false;
        if (estadoSiatFilter === 'anulada'   && !(e === 'anulada'   || e === 'reembolsada' || e === 'reembolsado')) return false;
        if (estadoSiatFilter === 'pendiente' && e !== 'pendiente') return false;
        if (estadoSiatFilter === 'observada' && e !== 'observada') return false;
      }
      return true;
    });
  }, [sales, search, dateFrom, dateTo, statusFilter, estadoSiatFilter]);

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

  const estadoSiatOptions = [
    { value: 'todos',     label: 'Todos los estados SIAT' },
    { value: 'validada',  label: 'SIAT: Validada' },
    { value: 'observada', label: 'SIAT: Observada' },
    { value: 'pendiente', label: 'SIAT: Pendiente' },
    { value: 'anulada',   label: 'SIAT: Anulada' },
  ];

  const handlePrintComanda = (sale: Sale) => setPrintSale(sale);

  // ── SIAT: imprimir y reenviar factura ────────────────────────────────────────

  const handleImprimirSiat = async (sale: Sale) => {
    if (!sale.ventaId) {
      toast.error('Sin identificador SIAT', 'Esta venta no tiene un id válido para reimprimir.');
      return;
    }
    await imprimirFactura(sale.ventaId);
  };

  const handleImprimirSiatById = async (ventaId: number) => {
    await imprimirFactura(ventaId);
  };

  const handleReenviarSiatById = async (ventaId: number) => {
    await reenviarFactura(ventaId);
    loadVentas(null, false);
  };

  // Abre el modal de anulación con la venta que coincida con el ventaId.
  const handleAnularSiatById = (ventaId: number) => {
    const target = sales.find((s) => s.ventaId === ventaId) ?? selectedSale;
    if (target) setAnularSale(target);
  };

  // Confirma la anulación: llama al backend y refresca si la transacción fue exitosa.
  // Nos basta con Transaccion=true (el backend ya garantiza que el estado final es Anulada
  // o que la factura ya estaba anulada). Comparar el string 'Anulada' era frágil porque
  // el backend serializa el enum FacturaEstado como número (no usa JsonStringEnumConverter).
  const handleConfirmAnularSiat = async (ventaId: number, codigoMotivo: number, nota?: string) => {
    const res = await anularFactura(ventaId, codigoMotivo, nota);
    if (res?.Siat?.Transaccion) {
      loadVentas(null, false);
      return true;
    }
    return false;
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <Select
              value={estadoSiatFilter}
              onChange={(v) => setEstadoSiatFilter(v as typeof estadoSiatFilter)}
              options={estadoSiatOptions}
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
                onInvoice={handleImprimirSiat}
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
          onImprimirSiat={handleImprimirSiatById}
          onReenviarSiat={handleReenviarSiatById}
          onAnularSiat={handleAnularSiatById}
        />

        <RefundModal
          isOpen={!!refundingSale}
          onClose={() => setRefundingSale(null)}
          sale={refundingSale}
          onConfirm={handleSimpleRefund}
        />

        <AnularFacturaModal
          isOpen={!!anularSale}
          onClose={() => setAnularSale(null)}
          sale={anularSale}
          onConfirm={handleConfirmAnularSiat}
        />

        <SaleReceiptModal
          sale={printSale}
          onClose={() => setPrintSale(null)}
        />
      </PageContainer>
    </MainLayout>
  );
};
