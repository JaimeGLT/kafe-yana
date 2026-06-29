import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Search, PackageCheck, XCircle, ShoppingCart, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Modal, ConfirmModal, Select, SkeletonKpiCard } from '../../components/ui';
import { PurchasesTable } from '../../components/tables/PurchasesTable';
import { PurchaseOrderModal } from '../../components/modals';
import { Pagination } from '../../components/ui/Pagination';
import { toast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils';
import { MOCK_SUPPLIERS } from '../../data/reportsMocks';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { usePagination } from '../../hooks/usePagination';
import { GET_ORDENES_COMPRA } from '../../lib/queries/compras.queries';
import { GET_PROVEEDORES } from '../../lib/queries/proveedores.queries';
import { GET_COMPRADOS, GET_INSUMOS_QUERY } from '../../lib/queries/inventory.queries';
import type { PurchaseOrder, Supplier, PurchaseOrderInput } from '../../types';
import type { Product } from '../../types/inventory';
import type { Insumo } from '../../types/recipes';

// ── Backend types ─────────────────────────────────────────────────────────────

interface BackendOrdenItem {
  id: number;
  id_Insumo: number;
  id_Orden: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  nombre: string;
}

interface BackendOrdenProducto {
  id: number;
  id_Producto: number;
  id_Orden: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  nombre: string;
}

interface BackendOrden {
  id: number;
  codigo: string;
  fecha: string;
  id_Proveedor: number;
  nombre_Proveedor: string;
  nota: string;
  recibido: boolean;
  total: number;
  proveedor: {
    id: number;
    razon_Social: string;
    dni: string;
    telefono: string;
    celular: string;
    email: string;
    direccion: string;
  };
  insumos: BackendOrdenItem[];
  productos: BackendOrdenProducto[];
}

interface BackendOrdenesResponse {
  ordenes: {
    items: BackendOrden[];
    totalCount: number;
  };
}

const mapBackendOrdenToPurchaseOrder = (o: BackendOrden): PurchaseOrder => {
  const allItems = [
    ...o.insumos.map(i => ({
      id: String(i.id),
      productId: '',
      insumoId: String(i.id_Insumo),
      productName: i.nombre,
      productCode: '',
      quantity: i.cantidad,
      unit: 'unidad',
      unitCost: Number(i.precio),
      subtotal: Number(i.subtotal),
      receivedQuantity: 0,
      pendingQuantity: i.cantidad,
    })),
    ...o.productos.map(p => ({
      id: String(p.id),
      productId: String(p.id_Producto),
      insumoId: '',
      productName: p.nombre,
      productCode: '',
      quantity: p.cantidad,
      unit: 'unidad',
      unitCost: Number(p.precio),
      subtotal: Number(p.subtotal),
      receivedQuantity: 0,
      pendingQuantity: p.cantidad,
    })),
  ];

  return {
    id: String(o.id),
    code: o.codigo,
    date: new Date(o.fecha),
    supplierId: String(o.id_Proveedor),
    supplierName: o.nombre_Proveedor,
    items: allItems,
    subtotal: Number(o.total),
    tax: 0,
    taxPercentage: 0,
    total: Number(o.total),
    status: o.recibido ? 'received' : 'pending',
    notes: o.nota || undefined,
    userId: '',
    userName: '',
    branchId: '',
    branchName: '',
    createdAt: new Date(o.fecha),
    updatedAt: new Date(o.fecha),
  };
};

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'received', label: 'Recibida' },
  { value: 'cancelled', label: 'Cancelada' },
];

const STATUS_PILL: Record<PurchaseOrder['status'], { label: string; cls: string }> = {
  draft:     { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  pending:   { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  partial:   { label: 'Parcial',    cls: 'bg-blue-100 text-blue-700' },
  received:  { label: 'Recibida',   cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-100 text-red-600' },
};

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [products, setProducts] = useState<Product[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<PurchaseOrder | null>(null);

  // ── Paginación skip/take sincronizada a URL ───────────────────────────────
  const { page, pageSize, search, debouncedSearch, setPage, setPageSize, setSearch } = usePagination({ pageSize: 15 });
  const [totalCount, setTotalCount] = useState(0);

  const skip = (page - 1) * pageSize;

  // ── Load ordenes from backend ───────────────────────────────────────────────

  const loadOrdenes = useCallback(() => {
    setIsLoading(true);

    const variables: Record<string, unknown> = {
      skip,
      take: pageSize,
      search: debouncedSearch || null,
    };

    gql<BackendOrdenesResponse>(GET_ORDENES_COMPRA, variables)
      .then(data => {
        const mapped = data.ordenes.items.map(mapBackendOrdenToPurchaseOrder);
        setPurchaseOrders(mapped);
        setTotalCount(data.ordenes.totalCount ?? 0);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [skip, pageSize, debouncedSearch]);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  // ── Load suppliers for modal ─────────────────────────────────────────────────

  useEffect(() => {
    gql<{ proveedores: { items: Supplier[] } }>(GET_PROVEEDORES, { skip: 0, take: 50 })
      .then(data => setSuppliers(data.proveedores.items.map(n => ({
        id: String(n.id),
        code: String(n.id),
        razon_Social: n.razon_Social,
        telefono: n.telefono ?? '',
        celular: n.celular ?? '',
        email: n.email ?? '',
        direccion: n.direccion ?? '',
        dni: n.dni ?? '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))))
      .catch(() => {});
  }, []);

  // ── Load products (comprados only) ─────────────────────────────────────────
  useEffect(() => {
    gql<{ comprados: { items: Array<{ id_Producto: number; producto: { id: number; nombre: string; descripcion?: string; precio: number; tipo: string }; stock_actual: number; stock_minimo: number; unidad_medida?: string; costo_compra: number; disponible: boolean }> } }>(GET_COMPRADOS, { skip: 0, take: 50 })
      .then(data => setProducts(data.comprados.items.map(n => ({
        id: String(n.producto.id),
        code: String(n.id_Producto),
        name: n.producto.nombre,
        description: n.producto.descripcion,
        tipo: 'comprado' as const,
        categoryId: '',
        categoryName: '',
        unit: n.unidad_medida ?? 'unidad',
        costPrice: n.costo_compra ?? 0,
        salePrice: n.producto.precio ?? 0,
        stock: n.stock_actual ?? 0,
        minStock: n.stock_minimo ?? 0,
        maxStock: 0,
        isActive: n.disponible ?? true,
        hasVariations: false,
        variations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }))))
      .catch(() => {});
  }, []);

  // ── Load insumos ────────────────────────────────────────────────────────────
  useEffect(() => {
    gql<{ insumos: { items: Array<{ id: number; nombre: string; categoria: string; stock_actual: number; stock_min: number; costo: number; unidad_min_uso: string; unidad_compra: string; factor_conversion: number }> } }>(GET_INSUMOS_QUERY, { skip: 0, take: 200 })
      .then(data => setInsumos(data.insumos.items.map(n => ({
        id: String(n.id),
        code: String(n.id),
        name: n.nombre,
        categoriaInsumo: n.categoria,
        unidadMinima: n.unidad_min_uso,
        unidadCompra: n.unidad_compra,
        factorConversion: n.factor_conversion,
        costoCompra: n.costo,
        costoUnitario: 0,
        stock: n.stock_actual,
        stockMinimo: n.stock_min,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const pending = purchaseOrders.filter((o) => o.status === 'pending').length;
    const received = purchaseOrders.filter((o) => o.status === 'received').length;
    const totalValue = purchaseOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.total, 0);
    return { total: purchaseOrders.length, pending, received, totalValue };
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
    if (!statusFilter) return purchaseOrders;
    return purchaseOrders.filter((order) => order.status === statusFilter);
  }, [purchaseOrders, statusFilter]);

  const handleSaveOrder = async (input: PurchaseOrderInput) => {
    const insumos = input.items
      .filter(i => i.insumoId)
      .map(i => ({
        id_Insumo: Number(i.insumoId),
        cantidad: i.quantity,
        precio: i.unitCost,
      }));

    const productos = input.items
      .filter(i => i.productId)
      .map(i => ({
        id_Producto: Number(i.productId),
        cantidad: i.quantity,
        precio: i.unitCost,
      }));

    const body = {
      id_Proveedor: Number(input.supplierId),
      fechaEntrega: input.expectedDate!.toISOString().split('T')[0],
      nota: input.notes ?? '',
      insumos,
      productos,
    };

    try {
      const result = await api.post<{ Id: number; Codigo: string } | undefined>('/OrdenCompra', body);
      toast.success('Orden creada', result?.Codigo ? `Orden ${result.Codigo} creada exitosamente.` : 'Orden de compra creada exitosamente.');
      loadOrdenes();
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'No se pudo crear la orden de compra.');
    }
  };

  const handleReceive = async () => {
    if (!receivingOrder) return;
    setIsProcessing(true);
    try {
      await api.put(`/OrdenCompra/recibir/${receivingOrder.id}`);
      setPurchaseOrders(prev =>
        prev.map(o =>
          o.id === receivingOrder.id
            ? { ...o, status: 'received' as const, items: o.items.map(i => ({ ...i, receivedQuantity: i.quantity, pendingQuantity: 0 })) }
            : o
        )
      );
      toast.success('Orden recibida', `La orden ${receivingOrder.code} fue marcada como recibida.`);
      setReceivingOrder(null);
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'No se pudo marcar la orden como recibida.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellingOrder) return;
    setIsProcessing(true);
    try {
      await api.delete(`/OrdenCompra/${cancellingOrder.id}`);
      setPurchaseOrders(prev =>
        prev.map(o => o.id === cancellingOrder.id ? { ...o, status: 'cancelled' as const } : o)
      );
      toast.success('Orden cancelada', `La orden ${cancellingOrder.code} fue cancelada.`);
      setCancellingOrder(null);
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'No se pudo cancelar la orden.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pill = (status: PurchaseOrder['status']) => {
    const s = STATUS_PILL[status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Órdenes de Compra"
          subtitle="Gestiona las órdenes de compra con proveedores"
          actions={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsNewOrderOpen(true)}>
              Nueva Orden
            </Button>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)
          ) : (
            <>
              <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-coffee-100 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-coffee-600" />
                </div>
                <div>
                  <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-coffee-900">{stats.total}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Pendientes</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Recibidas</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.received}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Valor total</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <input
              type="text"
              placeholder="Buscar por código o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 bg-white"
            />
          </div>
          <div className="w-44">
            <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          </div>
          <div className="flex items-center gap-2 text-sm text-coffee-500 bg-white border border-coffee-100 rounded-lg px-3 py-2">
            <ShoppingCart className="h-4 w-4" />
            {totalCount} orden{totalCount !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-coffee-100 rounded animate-pulse" />)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <PurchasesTable
              orders={filteredOrders}
              onView={(order) => setViewingOrder(order)}
              onReceive={(order) => setReceivingOrder(order)}
              onCancel={(order) => setCancellingOrder(order)}
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

        {/* New Order Modal */}
        <PurchaseOrderModal
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          suppliers={suppliers}
          products={products}
          insumos={insumos}
          onSave={handleSaveOrder}
          onSuccess={() => setIsNewOrderOpen(false)}
        />

        {/* View Detail Modal */}
        {viewingOrder && (
          <Modal
            isOpen={!!viewingOrder}
            onClose={() => setViewingOrder(null)}
            title=""
            size="lg"
          >
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-coffee-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-coffee-400">{viewingOrder.code}</span>
                    {pill(viewingOrder.status)}
                  </div>
                  <p className="text-lg font-bold text-coffee-900">{viewingOrder.supplierName || 'Sin proveedor'}</p>
                  <p className="text-sm text-coffee-500 mt-0.5">{formatDate(viewingOrder.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-coffee-400 mb-0.5">Total</p>
                  <p className="text-2xl font-bold text-coffee-900">{formatCurrency(viewingOrder.total)}</p>
                </div>
              </div>

              {/* Meta row */}
              {viewingOrder.expectedDate && (
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-coffee-400 text-xs font-medium uppercase tracking-wide mb-0.5">Entrega esperada</p>
                    <p className="text-coffee-800 font-medium">{formatDate(viewingOrder.expectedDate)}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-coffee-500 uppercase tracking-wide mb-2">
                  Ítems — {viewingOrder.items.length}
                </p>
                <div className="rounded-xl border border-coffee-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-coffee-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Ítem</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Cant.</th>
                        {viewingOrder.status === 'received' && (
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Recibido</th>
                        )}
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Costo u.</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-coffee-500 uppercase tracking-wide">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-50">
                      {viewingOrder.items.map((item) => (
                        <tr key={item.id} className="hover:bg-coffee-50/40 transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-coffee-900">{item.productName || item.productCode}</p>
                            {item.unit && <p className="text-xs text-coffee-400">{item.unit}</p>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-coffee-700">{item.quantity}</td>
                          {viewingOrder.status === 'received' && (
                            <td className="px-4 py-2.5 text-right">
                              <span className="text-emerald-600 font-medium">{item.receivedQuantity}</span>
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right text-coffee-500">{formatCurrency(item.unitCost)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-coffee-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="bg-coffee-50 rounded-xl px-5 py-3 flex items-center justify-between gap-12">
                  <span className="text-sm font-medium text-coffee-600">Total</span>
                  <span className="text-lg font-bold text-coffee-900">{formatCurrency(viewingOrder.total)}</span>
                </div>
              </div>

              {/* Notes */}
              {viewingOrder.notes && (
                <div className="bg-coffee-50 rounded-xl px-4 py-3 text-sm text-coffee-600 italic">
                  {viewingOrder.notes}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-1">
                {(viewingOrder.status === 'pending' || viewingOrder.status === 'approved') && (
                  <Button
                    variant="outline"
                    leftIcon={<PackageCheck className="h-4 w-4" />}
                    onClick={() => { setViewingOrder(null); setReceivingOrder(viewingOrder); }}
                  >
                    Marcar como Recibida
                  </Button>
                )}
                {(viewingOrder.status === 'pending' || viewingOrder.status === 'draft' || viewingOrder.status === 'approved') && (
                  <Button
                    variant="danger"
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => { setViewingOrder(null); setCancellingOrder(viewingOrder); }}
                  >
                    Cancelar orden
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Receive Confirm */}
        <ConfirmModal
          isOpen={!!receivingOrder}
          onClose={() => setReceivingOrder(null)}
          onConfirm={handleReceive}
          title="Marcar como Recibida"
          message={`¿Confirmas que se recibieron todos los ítems de la orden "${receivingOrder?.code}"?`}
          confirmText="Confirmar recepción"
          variant="info"
          isLoading={isProcessing}
        />

        {/* Cancel Confirm */}
        <ConfirmModal
          isOpen={!!cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onConfirm={handleCancel}
          title="Cancelar Orden"
          message={`¿Estás seguro de que deseas cancelar la orden "${cancellingOrder?.code}"? Esta acción no se puede deshacer.`}
          confirmText="Cancelar orden"
          variant="danger"
          isLoading={isProcessing}
        />
      </PageContainer>
    </MainLayout>
  );
};