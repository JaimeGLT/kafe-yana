import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, CheckCircle, PackageCheck, XCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal, ConfirmModal, Select } from '../../components/ui';
import { PurchasesTable } from '../../components/tables/PurchasesTable';
import { PurchaseOrderModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import type { PurchaseOrder, Supplier, Product } from '../../types';

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'partial', label: 'Parcial' },
  { value: 'received', label: 'Recibida' },
  { value: 'cancelled', label: 'Cancelada' },
];

const statusBadgeConfig: Record<
  PurchaseOrder['status'],
  { variant: 'default' | 'warning' | 'info' | 'success' | 'danger'; label: string }
> = {
  draft: { variant: 'default', label: 'Borrador' },
  pending: { variant: 'warning', label: 'Pendiente' },
  approved: { variant: 'info', label: 'Aprobada' },
  partial: { variant: 'info', label: 'Parcial' },
  received: { variant: 'success', label: 'Recibida' },
  cancelled: { variant: 'danger', label: 'Cancelada' },
};

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [approvingOrder, setApprovingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<PurchaseOrder | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [ordersData, suppliersData, productsData] = await Promise.all([
        api.get<PurchaseOrder[]>('/PurchaseOrder'),
        api.get<Supplier[]>('/Supplier'),
        api.get<Product[]>('/Product'),
      ]);
      setPurchaseOrders(ordersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (error) {
      toast.error('Error', 'No se pudieron cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleApprove = async () => {
    if (!approvingOrder) return;
    setIsProcessing(true);
    try {
      await api.post(`/PurchaseOrder/${approvingOrder.id}/approve`);
      toast.success('Orden aprobada', `La orden ${approvingOrder.code} fue aprobada.`);
      setApprovingOrder(null);
      await loadData();
    } catch {
      toast.error('Error', 'No se pudo aprobar la orden.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceive = async () => {
    if (!receivingOrder) return;
    setIsProcessing(true);
    try {
      const receivedItems = receivingOrder.items.map((item) => ({
        productId: item.productId,
        quantity: item.pendingQuantity,
      }));
      await api.post(`/PurchaseOrder/${receivingOrder.id}/receive`, receivedItems);
      toast.success('Orden recibida', `La orden ${receivingOrder.code} fue marcada como recibida.`);
      setReceivingOrder(null);
      await loadData();
    } catch {
      toast.error('Error', 'No se pudo marcar la orden como recibida.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellingOrder) return;
    setIsProcessing(true);
    try {
      await api.post(`/PurchaseOrder/${cancellingOrder.id}/cancel`);
      toast.success('Orden cancelada', `La orden ${cancellingOrder.code} fue cancelada.`);
      setCancellingOrder(null);
      await loadData();
    } catch {
      toast.error('Error', 'No se pudo cancelar la orden.');
    } finally {
      setIsProcessing(false);
    }
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

        {/* Filters */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
              <input
                type="text"
                placeholder="Buscar por código o proveedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Table */}
        <PageSection>
          <PurchasesTable
            orders={filteredOrders}
            onView={(order) => setViewingOrder(order)}
            onApprove={(order) => setApprovingOrder(order)}
            onCancel={(order) => setCancellingOrder(order)}
          />
        </PageSection>

        {/* New Order Modal via PurchaseOrderModal component */}
        <PurchaseOrderModal
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          suppliers={suppliers}
          products={products}
          onSuccess={() => { setIsNewOrderOpen(false); loadData(); }}
        />

        {/* View Detail Modal */}
        {viewingOrder && (
          <Modal
            isOpen={!!viewingOrder}
            onClose={() => setViewingOrder(null)}
            title={`Orden — ${viewingOrder.code}`}
            size="lg"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500">Proveedor</p>
                  <p className="font-medium text-coffee-900">{viewingOrder.supplierName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Estado</p>
                  <Badge variant={statusBadgeConfig[viewingOrder.status].variant}>
                    {statusBadgeConfig[viewingOrder.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-coffee-500">Fecha</p>
                  <p className="font-medium text-coffee-900">{formatDate(viewingOrder.date)}</p>
                </div>
                {viewingOrder.expectedDate && (
                  <div>
                    <p className="text-coffee-500">Fecha Esperada</p>
                    <p className="font-medium text-coffee-900">{formatDate(viewingOrder.expectedDate)}</p>
                  </div>
                )}
                {viewingOrder.approvedByName && (
                  <div>
                    <p className="text-coffee-500">Aprobado por</p>
                    <p className="font-medium text-coffee-900">{viewingOrder.approvedByName}</p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div>
                <h4 className="text-sm font-semibold text-coffee-700 mb-3">Productos</h4>
                <div className="rounded-lg border border-coffee-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-coffee-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-coffee-600 uppercase">Producto</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Cant.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Recibido</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Costo U.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {viewingOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-coffee-900">{item.productName || item.productCode}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{item.receivedQuantity}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{formatCurrency(item.unitCost)}</td>
                          <td className="px-4 py-2 text-right font-medium text-coffee-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-52 space-y-1 text-sm">
                  <div className="flex justify-between text-coffee-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewingOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-coffee-600">
                    <span>IGV ({viewingOrder.taxPercentage}%):</span>
                    <span>{formatCurrency(viewingOrder.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(viewingOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2">
                {viewingOrder.status === 'pending' && (
                  <Button
                    variant="outline"
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                    onClick={() => {
                      setViewingOrder(null);
                      setApprovingOrder(viewingOrder);
                    }}
                  >
                    Aprobar
                  </Button>
                )}
                {viewingOrder.status === 'approved' && (
                  <Button
                    variant="outline"
                    leftIcon={<PackageCheck className="h-4 w-4" />}
                    onClick={() => {
                      setViewingOrder(null);
                      setReceivingOrder(viewingOrder);
                    }}
                  >
                    Marcar como Recibida
                  </Button>
                )}
                {(viewingOrder.status === 'draft' || viewingOrder.status === 'pending') && (
                  <Button
                    variant="danger"
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => {
                      setViewingOrder(null);
                      setCancellingOrder(viewingOrder);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Approve Confirm */}
        <ConfirmModal
          isOpen={!!approvingOrder}
          onClose={() => setApprovingOrder(null)}
          onConfirm={handleApprove}
          title="Aprobar Orden"
          message={`¿Deseas aprobar la orden "${approvingOrder?.code}" por ${formatCurrency(approvingOrder?.total || 0)}?`}
          confirmText="Aprobar"
          variant="info"
          isLoading={isProcessing}
        />

        {/* Receive Confirm */}
        <ConfirmModal
          isOpen={!!receivingOrder}
          onClose={() => setReceivingOrder(null)}
          onConfirm={handleReceive}
          title="Marcar como Recibida"
          message={`¿Confirmas que se recibieron todos los productos de la orden "${receivingOrder?.code}"?`}
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
