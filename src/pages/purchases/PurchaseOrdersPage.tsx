import React, { useState, useMemo } from 'react';
import { Plus, Search, PackageCheck, XCircle, ShoppingCart, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Modal, ConfirmModal, Select, SkeletonKpiCard } from '../../components/ui';
import { PurchasesTable } from '../../components/tables/PurchasesTable';
import { PurchaseOrderModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils';
import { MOCK_PURCHASE_ORDERS, MOCK_SUPPLIERS, MOCK_PRODUCTS, MOCK_INSUMOS } from '../../data/reportsMocks';
import type { PurchaseOrder, Supplier, Product, PurchaseOrderInput } from '../../types';
import type { Insumo } from '../../types/recipes';

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
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(MOCK_PURCHASE_ORDERS);
  const [isLoading, _setIsLoading] = useState(false);
  const suppliers: Supplier[] = MOCK_SUPPLIERS;
  const products: Product[] = MOCK_PRODUCTS;
  const insumos: Insumo[] = MOCK_INSUMOS;
  const [isProcessing, setIsProcessing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<PurchaseOrder | null>(null);

  const stats = useMemo(() => {
    const pending = purchaseOrders.filter((o) => o.status === 'pending').length;
    const received = purchaseOrders.filter((o) => o.status === 'received').length;
    const totalValue = purchaseOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.total, 0);
    return { total: purchaseOrders.length, pending, received, totalValue };
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !order.code.toLowerCase().includes(q) &&
          !(order.supplierName || '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [purchaseOrders, search, statusFilter]);

  const handleSaveOrder = (input: PurchaseOrderInput) => {
    const id = `mock-${Date.now()}`;
    const supplier = suppliers.find((s) => s.id === input.supplierId);
    const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const newOrder: PurchaseOrder = {
      id,
      code: `OC-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      date: new Date(),
      expectedDate: input.expectedDate,
      supplierId: input.supplierId,
      supplierName: supplier?.razon_Social,
      items: input.items.map((item, idx) => {
        const product = products.find((p) => p.id === item.productId);
        const insumo = insumos.find((i) => i.id === item.insumoId);
        return {
          id: `${id}-item-${idx}`,
          productId: item.productId || item.insumoId || '',
          productName: product?.name || insumo?.name || '',
          productCode: product?.code || insumo?.code || '',
          quantity: item.quantity,
          unit: product?.unit || insumo?.unidadCompra || 'unidad',
          unitCost: item.unitCost,
          subtotal: item.quantity * item.unitCost,
          receivedQuantity: 0,
          pendingQuantity: item.quantity,
        };
      }),
      subtotal, tax: 0, taxPercentage: 0, total: subtotal,
      status: 'pending',
      notes: input.notes,
      userId: 'u1', userName: 'Jaime G.', branchId: 'b1',
      createdAt: new Date(), updatedAt: new Date(),
    };
    setPurchaseOrders((prev) => [newOrder, ...prev]);
  };

  const handleReceive = () => {
    if (!receivingOrder) return;
    setIsProcessing(true);
    setPurchaseOrders((prev) =>
      prev.map((o) =>
        o.id === receivingOrder.id
          ? { ...o, status: 'received', items: o.items.map((i) => ({ ...i, receivedQuantity: i.quantity, pendingQuantity: 0 })) }
          : o
      )
    );
    toast.success('Orden recibida', `La orden ${receivingOrder.code} fue marcada como recibida.`);
    setReceivingOrder(null);
    setIsProcessing(false);
  };

  const handleCancel = () => {
    if (!cancellingOrder) return;
    setIsProcessing(true);
    setPurchaseOrders((prev) =>
      prev.map((o) => o.id === cancellingOrder.id ? { ...o, status: 'cancelled' } : o)
    );
    toast.success('Orden cancelada', `La orden ${cancellingOrder.code} fue cancelada.`);
    setCancellingOrder(null);
    setIsProcessing(false);
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
            {filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Table */}
        <PurchasesTable
          orders={filteredOrders}
          onView={(order) => setViewingOrder(order)}
          onReceive={(order) => setReceivingOrder(order)}
          onCancel={(order) => setCancellingOrder(order)}
        />

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
