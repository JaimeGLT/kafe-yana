import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Calendar } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Input, Select, SkeletonSalesTable } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { SalesTable } from '../../components/tables/SalesTable';
import { SaleDetailModal } from '../../components/modals/SaleDetailModal';
import { RefundModal } from '../../components/modals/RefundModal';
import { AnularFacturaModal } from '../../components/modals/AnularFacturaModal';
import { FacturarSinFacturarModal } from '../../components/modals/FacturarSinFacturarModal';
import { RevertirAnulacionFacturaModal } from '../../components/modals/RevertirAnulacionFacturaModal';
import { NotaAjusteModal } from '../../components/modals/NotaAjusteModal';
import { AnularNotaAjusteModal } from '../../components/modals/AnularNotaAjusteModal';
import { RevertirAnulacionNotaAjusteModal } from '../../components/modals/RevertirAnulacionNotaAjusteModal';
import type { NotaAjusteParaAnular } from '../../components/modals/AnularNotaAjusteModal';
import { PrintFacturaModal } from '../../components/pos/PrintFacturaModal';
import type { PrintFacturaData } from '../../components/pos/PrintFacturaModal';
import { PrintComandaModal } from '../../components/pos/PrintComandaModal';
import type { PrintComandaData } from '../../components/pos/PrintComandaModal';
import { api } from '../../lib/api';
import { toast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils';
import { consolidarItemsPorNombre } from '../../utils/consolidarItems';
import type { Sale } from '../../types';
import type { CrearNotaAjusteRequest } from '../../types/notaAjuste';
import type { NotaAjusteResumen } from '../../types/notaAjuste';
import { useFacturacion } from '../../hooks/useFacturacion';
import type { DtoDatosFiscalesReenvio } from '../../hooks/useFacturacion';
import { usePagination } from '../../hooks/usePagination';
import { useVentasPage } from '../../hooks/useVentasPage';
import { useVentasStats } from '../../hooks/useVentasStats';
import { fetchVentaById, useVentaDetalles } from '../../hooks/useVentaDetalles';
import type { VentaFilters } from '../../types/ventas';
import { startOfDay, endOfDay } from 'date-fns';

// ── Page-level filter state ────────────────────────────────────────────────

type StatusFilter = '' | 'completed' | 'refunded' | 'partially_refunded';
type EstadoSiatFiltro = 'todos' | 'validada' | 'observada' | 'pendiente' | 'anulada' | 'sin_facturar';

const isStatusFilter = (v: string): v is StatusFilter =>
  v === '' || v === 'completed' || v === 'refunded' || v === 'partially_refunded';

const isEstadoSiatFiltro = (v: string): v is EstadoSiatFiltro =>
  v === 'todos' || v === 'validada' || v === 'observada' || v === 'pendiente' || v === 'anulada' || v === 'sin_facturar';

const mapEstadoSiatToApi = (f: EstadoSiatFiltro): string => {
  switch (f) {
    case 'validada':  return 'VALIDADA';
    case 'observada': return 'OBSERVADA';
    case 'pendiente': return 'PENDIENTE';
    case 'anulada':   return 'ANULADA';
    case 'todos':
    default:          return '';
  }
};

/** Construye el `where: VentaFilterInput` desde los inputs de la página. */
function buildWhere(opts: {
  dateFrom: string;
  dateTo: string;
  estadoSiatFilter: EstadoSiatFiltro;
  search: string;
}): VentaFilters {
  const where: VentaFilters = {};

  if (opts.dateFrom || opts.dateTo) {
    where.fechaEmision = {};
    if (opts.dateFrom) where.fechaEmision.gte = startOfDay(new Date(opts.dateFrom + 'T00:00:00')).toISOString();
    if (opts.dateTo)   where.fechaEmision.lte = endOfDay(new Date(opts.dateTo + 'T00:00:00')).toISOString();
  }

  if (opts.estadoSiatFilter === 'sin_facturar') {
    where.facturado = { eq: false };
  } else if (opts.estadoSiatFilter !== 'todos') {
    where.estadoSiat = { eq: mapEstadoSiatToApi(opts.estadoSiatFilter) };
  }

  const trimmed = opts.search.trim();
  if (trimmed.length > 0) {
    const num = Number(trimmed);
    const clauses: NonNullable<VentaFilters['or']>[number][] = [
      { nombreRazonSocial: { contains: trimmed } },
      { usuario: { contains: trimmed } },
    ];
    if (Number.isFinite(num)) {
      clauses.push({ numeroFactura: { eq: num } });
    }
    where.or = clauses;
  }

  return where;
}

// ── Page ────────────────────────────────────────────────────────────────────

export const SalesListPage: React.FC = () => {
  const location = useLocation();
  const initialState = (location.state as { dateFrom?: string; dateTo?: string } | null) ?? {};

  // ── Filtros (UI state) ────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState<string>(initialState.dateFrom ?? '');
  const [dateTo, setDateTo] = useState<string>(initialState.dateTo ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [estadoSiatFilter, setEstadoSiatFilter] = useState<EstadoSiatFiltro>('todos');

  // ── Paginación (patrón usePagination como ProductsPage) ───────────────
  const { page, pageSize, search: debouncedSearch, setSearch, setPageSize, setPage, resetPage } =
    usePagination({ pageSize: 15 });

  // El `search` del hook de paginación se sincroniza con el input de la página.
  // `setSearch` ya hace skip=0 al cambiar de texto, no hace falta reset manual.
  useEffect(() => {
    setSearch(searchInput);
  }, [searchInput, setSearch]);

  // Filtros que NO son search: reset explícito a la primera página.
  useEffect(() => {
    resetPage();
  }, [dateFrom, dateTo, estadoSiatFilter, statusFilter, resetPage]);

  // `where` efectivo: usa el search debounced para evitar una query por tecla.
  // El useMemo garantiza que la referencia del objeto es estable mientras los
  // valores no cambien — si pasáramos `JSON.parse(JSON.stringify(where))` o un
  // objeto nuevo en cada render, los hooks abajo entrarían en loop infinito
  // porque sus useCallback/useEffect detectarían una "nueva" dependencia.
  const where = useMemo<VentaFilters>(
    () => buildWhere({ dateFrom, dateTo, estadoSiatFilter, search: debouncedSearch }),
    [dateFrom, dateTo, estadoSiatFilter, debouncedSearch],
  );

  // ── Data fetching (delegado a hooks) ─────────────────────────────────
  // Lista y KPIs usan su propia query y su propio hook, pero comparten el
  // mismo `where` (estable vía useMemo). Si los filtros cambian, ambos se
  // re-fetchean juntos; si sólo cambia la página, sólo la lista.
  const { ventas, isLoading, totalCount, refresh: refreshPage } = useVentasPage({
    page,
    pageSize,
    where,
  });

  const { stats, refresh: refreshStats } = useVentasStats(where);

  // ── Modal state ──────────────────────────────────────────────────────
  // El modal de detalle abre on-demand (`selectedVentaId`) y los detalles
  // se cargan con `useVentaDetalles`. La lista NO trae `detalles` para
  // mantener el payload liviano — sólo el conteo (`itemsCount`).
  const [selectedVentaId, setSelectedVentaId] = useState<number | null>(null);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [anularSale, setAnularSale] = useState<Sale | null>(null);
  const [facturarSinFacturarSale, setFacturarSinFacturarSale] = useState<Sale | null>(null);
  const [revertirAnulacionSale, setRevertirAnulacionSale] = useState<Sale | null>(null);
  const [notaAjusteSale, setNotaAjusteSale] = useState<Sale | null>(null);
  const [notaParaAnular, setNotaParaAnular] = useState<NotaAjusteParaAnular | null>(null);
  const [notaParaRevertirAnulacion, setNotaParaRevertirAnulacion] = useState<NotaAjusteParaAnular | null>(null);
  const [printFacturaData, setPrintFacturaData] = useState<PrintFacturaData | null>(null);
  const [printComandaData, setPrintComandaData] = useState<PrintComandaData | null>(null);

  // SIAT
  const {
    imprimirFactura,
    reenviarFactura,
    anularFactura,
    revertirAnulacionFactura,
    crearNotaAjuste,
    anularNotaAjuste,
    revertirAnulacionNotaAjuste,
  } = useFacturacion();

  // Carga lazy del detalle: la lista sólo trae cabecera; al abrir el modal
  // disparamos `GET_VENTA_CON_DETALLES` para obtener `detalles` + `notasAjuste`.
  const {
    venta: selectedVentaDetalle,
    isLoading: isLoadingDetalles,
    refresh: refreshDetalles,
  } = useVentaDetalles(selectedVentaId);

  // `selectedSale` que consume el modal: prioriza la versión con detalles
  // ya cargados; mientras carga, usa la versión "ligera" del listado para
  // que el header (código, fecha, total) se vea de inmediato.
  const selectedSale = useMemo<Sale | null>(() => {
    if (selectedVentaDetalle) return selectedVentaDetalle;
    if (selectedVentaId == null) return null;
    return ventas.find((v) => v.ventaId === selectedVentaId) ?? null;
  }, [selectedVentaDetalle, selectedVentaId, ventas]);

  // Refresca lista + KPIs + (si el modal está abierto) el detalle de la venta.
  const refresh = async () => {
    await Promise.all([refreshPage(), refreshStats()]);
    if (selectedVentaId != null) {
      await refreshDetalles();
    }
  };

  // ── Post-filter client-side (statusFilter: derivado de estadoSiat) ───
  // El backend ya filtra por estadoSiat cuando hay valor; statusFilter es un
  // refinamiento secundario (completada vs reembolsada) sobre la página actual.
  const filteredVentas = useMemo(() => {
    if (!statusFilter) return ventas;
    return ventas.filter((s) => s.status === statusFilter);
  }, [ventas, statusFilter]);

  // ── Reembolso ────────────────────────────────────────────────────────
  const handleSimpleRefund = async (id: string, amount: number, reason: string, paymentType: string) => {
    if (!refundingSale) return;
    await api.post(`/Venta/reembolso/${id}`, {
      monto: amount,
      nota: reason,
      tipoPago: paymentType,
    });
    toast.success('Reembolso registrado', `${formatCurrency(amount)} reembolsados.`);
    await refresh();
    setRefundingSale(null);
  };

  // ── SIAT handlers (delegados a useFacturacion) ───────────────────────

  const handleOpenFacturaModal = () => {
    if (!selectedSale?.ventaId) return;
    setPrintFacturaData({
      ventaId: selectedSale.ventaId,
      numeroFactura: selectedSale.numeroFactura ?? null,
      codigoRecepcion: selectedSale.codigoRecepcion ?? null,
      cuf: selectedSale.cuf ?? null,
      nitCliente: selectedSale.nitCliente ?? null,
      razonSocialCliente: selectedSale.customerName ?? null,
      fechaEmision: selectedSale.date ? new Date(selectedSale.date).toISOString() : null,
      total: selectedSale.total,
      subtotal: selectedSale.subtotal,
      descuentoAdicional: selectedSale.discount,
      leyenda: selectedSale.leyenda ?? null,
      items: selectedSale.items.map((it) => ({
        cantidad: it.quantity,
        nombre: it.productName ?? 'Producto',
        precio: it.unitPrice,
        total: it.total,
      })),
    });
  };

  /**
   * Abre el modal de factura desde la fila de la tabla (no desde el detalle).
   * Construye el `PrintFacturaData` directamente desde la `sale` recibida.
   * NO setea `selectedSale`: si lo hiciéramos, el `SaleDetailModal` se abriría
   * junto al modal de impresión (doble modal apilado). El usuario debe abrir
   * el detalle explícitamente desde el botón "Ver".
   *
   * Como la lista ya NO trae `detalles` (lazy load), si `sale.items` está
   * vacío disparamos `fetchVentaById` para obtener las líneas antes de abrir
   * el modal de impresión.
   */
  const handlePrintFacturaSiat = async (sale: Sale) => {
    if (!sale.ventaId) {
      toast.error('Sin identificador SIAT', 'Esta venta no tiene un id válido para reimprimir.');
      return;
    }
    let items = sale.items;
    if (!items.length) {
      try {
        const ventaCompleta = await fetchVentaById(sale.ventaId);
        if (ventaCompleta) items = ventaCompleta.items;
      } catch (e) {
        toast.error('Error al cargar items', 'No se pudieron obtener las líneas para reimprimir.');
        return;
      }
    }
    if (!items.length) {
      toast.error('Sin items', 'Esta venta no tiene items para reimprimir.');
      return;
    }
    const itemsCrudos = items.map((it) => ({
      cantidad: it.quantity,
      nombre: it.productName ?? 'Producto',
      precio: it.unitPrice,
      total: it.total,
    }));
    // Consolidar items por nombre: si la venta histórica tiene el mismo
    // producto en múltiples rondas, la preview muestra una sola línea.
    // El ticket físico usa `Venta.Detalles` de la BD (consolidado en backend).
    setPrintFacturaData({
      ventaId: sale.ventaId,
      numeroFactura: sale.numeroFactura ?? null,
      codigoRecepcion: sale.codigoRecepcion ?? null,
      cuf: sale.cuf ?? null,
      nitCliente: sale.nitCliente ?? null,
      razonSocialCliente: sale.customerName ?? null,
      fechaEmision: sale.date ? new Date(sale.date).toISOString() : null,
      total: sale.total,
      subtotal: sale.subtotal,
      descuentoAdicional: sale.discount,
      leyenda: sale.leyenda ?? null,
      items: consolidarItemsPorNombre(itemsCrudos),
    });
  };

  /**
   * Abre el modal de comanda desde la fila de la tabla.
   * Construye un `PrintComandaData` a partir de la venta (que no tiene
   * metadata de ronda original — usamos placeholders neutros).
   * NO setea `selectedSale` por la misma razón que `handlePrintFacturaSiat`.
   *
   * Lazy fetch de items si la lista los trae vacíos (mismo motivo que arriba).
   */
  const handlePrintComanda = async (sale: Sale) => {
    if (!sale.ventaId) {
      toast.error('Sin identificador', 'Esta venta no tiene un id válido para reimprimir como comanda.');
      return;
    }
    let items = sale.items;
    if (!items.length) {
      try {
        const ventaCompleta = await fetchVentaById(sale.ventaId);
        if (ventaCompleta) items = ventaCompleta.items;
      } catch (e) {
        toast.error('Error al cargar items', 'No se pudieron obtener las líneas para reimprimir.');
        return;
      }
    }
    if (!items.length) {
      toast.error('Sin items', 'Esta venta no tiene items para reimprimir como comanda.');
      return;
    }
    const itemsCrudos = items.map((it) => ({
      cantidad: it.quantity,
      nombre: it.productName ?? 'Producto',
      nota: '',
      // Por defecto enviamos a cocina; el cajero puede ajustar destinos
      // desde el modal antes de confirmar.
      ubicacion: 'cocina' as const,
      precio: it.unitPrice,
    }));
    // Consolidar items por nombre para que la comanda reimpresa no duplique
    // líneas cuando el producto aparece en varias rondas.
    setPrintComandaData({
      mesaName: sale.branchName && sale.branchName.trim() !== '' ? sale.branchName : 'Venta',
      roundNumber: 1,
      rondaDesc: 'Comanda',
      items: consolidarItemsPorNombre(itemsCrudos),
    });
  };
  const handleAnularSiatById = (ventaId: number) => {
    const target = ventas.find((s) => s.ventaId === ventaId) ?? selectedSale;
    if (target) setAnularSale(target);
  };

  const handleFacturarSinFacturarById = (ventaId: number) => {
    const target = ventas.find((s) => s.ventaId === ventaId) ?? selectedSale;
    if (target) setFacturarSinFacturarSale(target);
  };

  const handleConfirmFacturarSinFacturar = async (ventaId: number, datosFiscales: DtoDatosFiscalesReenvio) => {
    const res = await reenviarFactura(ventaId, datosFiscales);
    if (res) {
      await refresh();
      return true;
    }
    return false;
  };

  // Confirma la anulación: basta con Transaccion=true (el backend garantiza
  // que la factura quedó Anulada o ya lo estaba).
  const handleConfirmAnularSiat = async (ventaId: number, codigoMotivo: number, nota?: string) => {
    const res = await anularFactura(ventaId, codigoMotivo, nota);
    if (res?.Siat?.Transaccion) {
      await refresh();
      return true;
    }
    return false;
  };

  const handleRevertirAnulacionSiatById = (ventaId: number) => {
    const target = ventas.find((s) => s.ventaId === ventaId) ?? selectedSale;
    if (target) setRevertirAnulacionSale(target);
  };

  const handleConfirmRevertirAnulacionSiat = async (ventaId: number) => {
    const res = await revertirAnulacionFactura(ventaId);
    if (res?.Siat?.Transaccion) {
      await refresh();
      return true;
    }
    return false;
  };

  // ── Nota de Crédito/Débito ───────────────────────────────────────────
  const handleNotaAjusteSiatById = (ventaId: number) => {
    // Priorizar selectedSale: tiene los `detalles` poblados desde
    // GET_VENTA_CON_DETALLES. `ventas` (lista) NO trae detalles por diseño
    // (ver comentario en líneas 151-152), y si NotaAjusteModal recibe una
    // venta sin items muestra "Esta venta no tiene productos".
    const target =
      selectedSale?.ventaId === ventaId
        ? selectedSale
        : ventas.find((s) => s.ventaId === ventaId) ?? null;
    if (target) setNotaAjusteSale(target);
  };

  const handleConfirmNotaAjuste = async (body: CrearNotaAjusteRequest) => {
    const res = await crearNotaAjuste(body);
    if (res?.Siat?.Transaccion) {
      await refresh();
      return true;
    }
    return false;
  };

  // ── Anulación / reversión de notas C/D ────────────────────────────────
  const notaToAnularDto = (nota: NotaAjusteResumen): NotaAjusteParaAnular => ({
    id: nota.id,
    numeroNotaCreditoDebito: nota.numeroNotaCreditoDebito,
    estadoSiat: nota.estadoSiat,
    montoTotalDevuelto: nota.montoTotalDevuelto,
  });

  const handleAnularNotaAjusteSiatByNota = (nota: NotaAjusteResumen) => {
    setNotaParaAnular(notaToAnularDto(nota));
  };

  const handleConfirmAnularNotaAjusteSiat = async (
    notaId: number,
    codigoMotivo: number,
    nota?: string,
  ) => {
    const res = await anularNotaAjuste(notaId, codigoMotivo, nota);
    if (res?.Siat?.Transaccion) {
      await refresh();
      return true;
    }
    return false;
  };

  const handleRevertirAnulacionNotaAjusteSiatByNota = (nota: NotaAjusteResumen) => {
    setNotaParaRevertirAnulacion(notaToAnularDto(nota));
  };

  const handleConfirmRevertirAnulacionNotaAjusteSiat = async (notaId: number) => {
    const res = await revertirAnulacionNotaAjuste(notaId);
    if (res?.Siat?.Transaccion) {
      await refresh();
      return true;
    }
    return false;
  };

  // ── Static options ───────────────────────────────────────────────────
  const statusOptions = [
    { value: '',                   label: 'Todos los estados' },
    { value: 'completed',          label: 'Completada' },
    { value: 'refunded',           label: 'Reembolsada' },
    { value: 'partially_refunded', label: 'Parcialmente reembolsada' },
  ];

  const estadoSiatOptions: { value: EstadoSiatFiltro; label: string }[] = [
    { value: 'todos',         label: 'Todos los estados SIAT' },
    { value: 'sin_facturar',  label: 'Sin facturar' },
    { value: 'validada',  label: 'SIAT: Validada' },
    { value: 'observada', label: 'SIAT: Observada' },
    { value: 'pendiente', label: 'SIAT: Pendiente' },
    { value: 'anulada',   label: 'SIAT: Anulada' },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Historial de Ventas"
          subtitle="Consulta y filtra todas las ventas realizadas"
        />

        {/* KPI Strip — agregados reales desde el backend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-6 w-6 text-coffee-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas Hoy</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(stats.totalHoy)}
              </p>
              <p className="text-xs text-coffee-400">{stats.conteoHoy} transacciones</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas del Mes</p>
              <p className="text-2xl font-display font-bold text-coffee-900">
                {formatCurrency(stats.totalMes)}
              </p>
              <p className="text-xs text-coffee-400">
                Ticket promedio: {formatCurrency(stats.ticketPromedioMes)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-coffee-500">Ventas Hoy (conteo)</p>
              <p className="text-2xl font-display font-bold text-coffee-900">{stats.conteoHoy}</p>
              <p className="text-xs text-coffee-400">{stats.conteoMes} en el mes</p>
            </div>
          </div>
        </div>

        {/* Filtros — van al backend */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar por código o cliente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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
              onChange={(v) => isStatusFilter(v) && setStatusFilter(v)}
              options={statusOptions}
            />
            <Select
              value={estadoSiatFilter}
              onChange={(v) => isEstadoSiatFiltro(v) && setEstadoSiatFilter(v)}
              options={estadoSiatOptions}
            />
          </div>
        </div>

        {/* Tabla */}
        <PageSection>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <SkeletonSalesTable />
            ) : (
              <>
                <SalesTable
                  sales={filteredVentas}
                  onView={(sale) => setSelectedVentaId(sale.ventaId ?? null)}
                  onRefund={(sale) => setRefundingSale(sale)}
                  onPrint={handlePrintComanda}
                  onPrintFacturaSiat={handlePrintFacturaSiat}
                />
                <Pagination
                  totalCount={totalCount}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  isLoading={isLoading}
                />
              </>
            )}
          </div>
        </PageSection>

        {/* Modales */}
        <SaleDetailModal
          sale={selectedSale}
          isLoading={isLoadingDetalles}
          onClose={() => setSelectedVentaId(null)}
          onOpenFacturaModal={handleOpenFacturaModal}
          onFacturarSinFacturar={handleFacturarSinFacturarById}
          onAnularSiat={handleAnularSiatById}
          onRevertirAnulacionSiat={handleRevertirAnulacionSiatById}
          onNotaAjusteSiat={handleNotaAjusteSiatById}
          onAnularNotaAjusteSiat={handleAnularNotaAjusteSiatByNota}
          onRevertirAnulacionNotaAjusteSiat={handleRevertirAnulacionNotaAjusteSiatByNota}
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

        <FacturarSinFacturarModal
          key={facturarSinFacturarSale?.ventaId ?? 'closed'}
          isOpen={!!facturarSinFacturarSale}
          onClose={() => setFacturarSinFacturarSale(null)}
          sale={facturarSinFacturarSale}
          onConfirm={handleConfirmFacturarSinFacturar}
        />

        <RevertirAnulacionFacturaModal
          isOpen={!!revertirAnulacionSale}
          onClose={() => setRevertirAnulacionSale(null)}
          sale={revertirAnulacionSale}
          onConfirm={handleConfirmRevertirAnulacionSiat}
        />

        <NotaAjusteModal
          isOpen={!!notaAjusteSale}
          onClose={() => setNotaAjusteSale(null)}
          sale={notaAjusteSale}
          onConfirm={handleConfirmNotaAjuste}
        />

        <AnularNotaAjusteModal
          isOpen={!!notaParaAnular}
          onClose={() => setNotaParaAnular(null)}
          nota={notaParaAnular}
          onConfirm={handleConfirmAnularNotaAjusteSiat}
        />

        <RevertirAnulacionNotaAjusteModal
          isOpen={!!notaParaRevertirAnulacion}
          onClose={() => setNotaParaRevertirAnulacion(null)}
          nota={notaParaRevertirAnulacion}
          onConfirm={handleConfirmRevertirAnulacionNotaAjusteSiat}
        />

        <PrintComandaModal
          data={printComandaData}
          onClose={() => setPrintComandaData(null)}
        />

        <PrintFacturaModal
          data={printFacturaData}
          onConfirm={async (destinos, ancho) => {
            if (!printFacturaData) return;
            await imprimirFactura(printFacturaData.ventaId, destinos, ancho);
          }}
          onClose={() => setPrintFacturaData(null)}
        />
      </PageContainer>
    </MainLayout>
  );
};