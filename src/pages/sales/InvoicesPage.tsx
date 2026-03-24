import React from 'react';
import { FileText, Eye, CheckCircle, XCircle, Trash2, Plus, ShoppingCart } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Badge, ConfirmModal, Modal, Select, Input } from '../../components/ui';
import { Button } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { BillingModal } from '../../components/modals/BillingModal';
import { useSalesStore } from '../../stores';
import { useInventoryStore } from '../../stores';
import { formatCurrency, formatDate } from '../../utils';
import type { Invoice } from '../../types';
import type { InvoiceItemInput, InvoiceCreateInput } from '../../stores/salesStore';

// ── Types ────────────────────────────────────────────────────────────────────

const invoiceStatusConfig: Record<
  Invoice['status'],
  { variant: 'warning' | 'success' | 'danger' | 'default'; label: string }
> = {
  pending: { variant: 'warning', label: 'Pendiente' },
  paid: { variant: 'success', label: 'Pagada' },
  overdue: { variant: 'danger', label: 'Vencida' },
  cancelled: { variant: 'default', label: 'Cancelada' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Crédito (pago posterior)' },
] as const;

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

type PendingInvoiceData = Omit<InvoiceCreateInput, 'customerName' | 'customerId' | 'nit'>;

interface FormItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const emptyItem = (): FormItem => ({
  productId: '',
  productName: '',
  productCode: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
});

// ── InvoiceForm ───────────────────────────────────────────────────────────────
// Collects products + payment info. Billing data (NIT/name) is handled later.

const InvoiceForm: React.FC<{
  onSubmit: (data: PendingInvoiceData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ onSubmit, onCancel, isLoading }) => {
  const { products } = useInventoryStore();

  const [items, setItems] = React.useState<FormItem[]>([emptyItem()]);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const activeProducts = products.filter((p) => p.isActive);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'productId' && typeof value === 'string') {
        const p = activeProducts.find((p) => p.id === value);
        next[index].productName = p?.name ?? '';
        next[index].productCode = p?.code ?? '';
        next[index].unitPrice = p?.salePrice ?? 0;
      }
      return next;
    });
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalDiscount = items.reduce((s, i) => s + (i.discount || 0), 0);
  const taxable = subtotal - totalDiscount;
  const tax = taxable * 0.18;
  const total = taxable + tax;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (items.some((i) => !i.productId || i.quantity <= 0 || i.unitPrice <= 0)) {
      errs.items = 'Todos los productos deben tener producto, cantidad y precio válidos.';
    }
    if (paymentMethod === 'credit' && !dueDate) {
      errs.dueDate = 'Ingresa la fecha de vencimiento para pagos a crédito.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      items: items.map(
        (i): InvoiceItemInput => ({
          productId: i.productId,
          productName: i.productName,
          productCode: i.productCode,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })
      ),
      paymentMethod,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: notes || undefined,
    });
  };

  const productOptions = [
    { value: '', label: 'Selecciona un producto...' },
    ...activeProducts.map((p) => ({
      value: p.id,
      label: `${p.code} — ${p.name}`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Productos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-coffee-700 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Productos
          </h4>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addItem}>
            Agregar línea
          </Button>
        </div>

        {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}

        <div className="hidden md:grid grid-cols-12 gap-2 px-3 text-xs font-medium text-coffee-500 uppercase">
          <div className="col-span-5">Producto</div>
          <div className="col-span-2 text-center">Cantidad</div>
          <div className="col-span-2 text-center">Precio Unit.</div>
          <div className="col-span-2 text-right">Subtotal</div>
          <div className="col-span-1" />
        </div>

        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 bg-coffee-50 rounded-lg">
            <div className="col-span-12 md:col-span-5">
              <Select
                value={item.productId}
                onChange={(v) => updateItem(idx, 'productId', v)}
                options={productOptions}
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="Cant."
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.unitPrice}
                onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                placeholder="Precio"
              />
            </div>
            <div className="col-span-3 md:col-span-2 text-right px-2 py-2.5 text-sm font-medium text-coffee-800">
              {formatCurrency(item.quantity * item.unitPrice)}
            </div>
            <div className="col-span-1 flex justify-center">
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
                className="p-1.5 rounded hover:bg-red-100 text-coffee-400 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Método de pago + fecha vencimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Método de Pago"
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
          options={PAYMENT_METHODS}
        />
        <div>
          <Input
            type="date"
            label="Fecha de Vencimiento"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {errors.dueDate && <p className="text-xs text-red-600 mt-1">{errors.dueDate}</p>}
        </div>
      </div>

      {/* Notas */}
      <Input
        label="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas adicionales..."
      />

      {/* Totales */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-coffee-600">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Descuento:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-coffee-600">
            <span>IGV (18%):</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-coffee-900 text-base border-t border-coffee-200 pt-2">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {paymentMethod !== 'credit' ? (
            <p className="text-xs text-green-600 text-right">Factura se registrará como Pagada</p>
          ) : (
            <p className="text-xs text-amber-600 text-right">Factura quedará como Pendiente</p>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2 border-t border-coffee-100">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Continuar →
        </Button>
      </div>
    </form>
  );
};

// ── InvoicesPage ──────────────────────────────────────────────────────────────

export const InvoicesPage: React.FC = () => {
  const {
    invoices,
    createInvoiceFromItems,
    markInvoicePaid,
    cancelInvoice,
    deleteInvoice,
  } = useSalesStore();

  const [viewingInvoice, setViewingInvoice] = React.useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = React.useState<Invoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = React.useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = React.useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [pendingData, setPendingData] = React.useState<PendingInvoiceData | null>(null);

  // Form → stores pending data → closes form → BillingModal appears
  const handleFormSubmit = (data: PendingInvoiceData) => {
    setIsFormOpen(false);
    setPendingData(data);
  };

  // BillingModal → creates sale + invoice
  const handleBillingDone = (billing: { nit: string; name: string }) => {
    if (!pendingData) return;
    try {
      const invoice = createInvoiceFromItems({
        ...pendingData,
        customerName: billing.name,
        nit: billing.nit,
      });
      toast.success('Factura emitida', `Se generó la factura ${invoice.code} a "${billing.name}".`);
    } catch {
      toast.error('Error', 'No se pudo emitir la factura.');
    } finally {
      setPendingData(null);
    }
  };

  const handleMarkPaid = () => {
    if (!payingInvoice) return;
    markInvoicePaid(payingInvoice.id);
    toast.success('Factura pagada', `La factura ${payingInvoice.code} fue marcada como pagada.`);
    setPayingInvoice(null);
  };

  const handleCancel = () => {
    if (!cancellingInvoice) return;
    cancelInvoice(cancellingInvoice.id);
    toast.success('Factura cancelada', `La factura ${cancellingInvoice.code} fue cancelada.`);
    setCancellingInvoice(null);
  };

  const handleDelete = () => {
    if (!deletingInvoice) return;
    deleteInvoice(deletingInvoice.id);
    toast.success('Factura eliminada', 'La factura fue eliminada correctamente.');
    setDeletingInvoice(null);
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Facturas"
          subtitle="Emite y gestiona las facturas de ventas"
          actions={
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-coffee-500 text-white text-sm font-medium rounded-lg hover:bg-coffee-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva Factura
            </button>
          }
        />

        <PageSection>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Código', 'Fecha', 'Venta Ref.', 'Cliente / NIT', 'Total', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-coffee-400">
                        <FileText className="h-12 w-12 opacity-30" />
                        <p className="text-base font-medium">No hay facturas registradas</p>
                        <p className="text-sm">Usa el botón "Nueva Factura" para emitir una.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => {
                    const statusCfg = invoiceStatusConfig[invoice.status];
                    return (
                      <tr key={invoice.id} className="hover:bg-coffee-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-coffee-600">{invoice.code}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-coffee-500">{invoice.saleCode}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-coffee-900 text-sm">{invoice.customerName || 'Consumidor Final'}</p>
                          {invoice.nit && (
                            <p className="text-coffee-400 text-xs">NIT: {invoice.nit}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-coffee-900">
                            {formatCurrency(invoice.total)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingInvoice(invoice)}
                              className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {invoice.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => setPayingInvoice(invoice)}
                                  className="p-1.5 rounded-lg hover:bg-green-100 text-green-500 hover:text-green-700"
                                  title="Marcar como pagada"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setCancellingInvoice(invoice)}
                                  className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-400 hover:text-orange-600"
                                  title="Cancelar factura"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setDeletingInvoice(invoice)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-coffee-400 hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </PageSection>

        {/* New Invoice Form Modal */}
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title="Nueva Factura"
          size="full"
        >
          <InvoiceForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>

        {/* Billing Modal — shown after form, before creating invoice */}
        <BillingModal
          isOpen={!!pendingData}
          onDone={handleBillingDone}
        />

        {/* View Detail Modal */}
        {viewingInvoice && (
          <Modal
            isOpen={!!viewingInvoice}
            onClose={() => setViewingInvoice(null)}
            title={`Factura — ${viewingInvoice.code}`}
            size="lg"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500">Fecha</p>
                  <p className="font-medium text-coffee-900">{formatDate(viewingInvoice.date)}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Venta Referencia</p>
                  <p className="font-mono font-medium text-coffee-900">{viewingInvoice.saleCode}</p>
                </div>
                <div>
                  <p className="text-coffee-500">Cliente</p>
                  <p className="font-medium text-coffee-900">
                    {viewingInvoice.customerName || 'Consumidor Final'}
                  </p>
                  {viewingInvoice.nit && (
                    <p className="text-coffee-400 text-xs">NIT: {viewingInvoice.nit}</p>
                  )}
                </div>
                <div>
                  <p className="text-coffee-500">Estado</p>
                  <Badge variant={invoiceStatusConfig[viewingInvoice.status].variant}>
                    {invoiceStatusConfig[viewingInvoice.status].label}
                  </Badge>
                </div>
                {viewingInvoice.dueDate && (
                  <div>
                    <p className="text-coffee-500">Vencimiento</p>
                    <p className="font-medium text-coffee-900">{formatDate(viewingInvoice.dueDate)}</p>
                  </div>
                )}
                {viewingInvoice.paymentDate && (
                  <div>
                    <p className="text-coffee-500">Fecha de Pago</p>
                    <p className="font-medium text-coffee-900">{formatDate(viewingInvoice.paymentDate)}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-coffee-700 mb-3">Productos</h4>
                <div className="rounded-lg border border-coffee-100 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-coffee-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-coffee-600 uppercase">Producto</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Cant.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Precio</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-coffee-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-100">
                      {viewingInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-coffee-900">{item.productName || 'Producto'}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-coffee-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-right font-medium text-coffee-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-52 space-y-1 text-sm">
                  <div className="flex justify-between text-coffee-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewingInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-coffee-600">
                    <span>IGV (18%):</span>
                    <span>{formatCurrency(viewingInvoice.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-coffee-900 border-t border-coffee-200 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(viewingInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {viewingInvoice.notes && (
                <p className="text-sm text-coffee-600 bg-coffee-50 rounded-lg p-3">
                  {viewingInvoice.notes}
                </p>
              )}

              {viewingInvoice.status === 'pending' && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setViewingInvoice(null);
                      setPayingInvoice(viewingInvoice);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Marcar como Pagada
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

        <ConfirmModal
          isOpen={!!payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onConfirm={handleMarkPaid}
          title="Marcar como Pagada"
          message={`¿Confirmas que la factura "${payingInvoice?.code}" ha sido pagada?`}
          confirmText="Confirmar Pago"
          variant="info"
        />

        <ConfirmModal
          isOpen={!!cancellingInvoice}
          onClose={() => setCancellingInvoice(null)}
          onConfirm={handleCancel}
          title="Cancelar Factura"
          message={`¿Estás seguro de que deseas cancelar la factura "${cancellingInvoice?.code}"?`}
          confirmText="Cancelar Factura"
          variant="danger"
        />

        <ConfirmModal
          isOpen={!!deletingInvoice}
          onClose={() => setDeletingInvoice(null)}
          onConfirm={handleDelete}
          title="Eliminar Factura"
          message={`¿Estás seguro de que deseas eliminar la factura "${deletingInvoice?.code}"?`}
          confirmText="Eliminar"
          variant="danger"
        />
      </PageContainer>
    </MainLayout>
  );
};
