import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { FormField, Form, FormRow, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import { usePurchasesStore } from '../../stores';
import type { Supplier, Product, PurchaseOrderInput } from '../../types';

interface OrderItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  onSuccess: () => void;
}

const TAX_RATE = 0.18;

const emptyItem = (): OrderItem => ({ productId: '', quantity: '', unitCost: '' });

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  products,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { addPurchaseOrder } = usePurchasesStore();

  const [supplierId, setSupplierId] = React.useState('');
  const [expectedDate, setExpectedDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState<OrderItem[]>([emptyItem()]);

  React.useEffect(() => {
    if (isOpen) {
      setSupplierId('');
      setExpectedDate('');
      setNotes('');
      setItems([emptyItem()]);
      setErrors({});
    }
  }, [isOpen]);

  const activeSuppliers = suppliers.filter((s) => s.isActive);
  const activeProducts = products.filter((p) => p.isActive);

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    const key = `item_${index}_${field}`;
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getItemSubtotal = (item: OrderItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    return qty * cost;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!supplierId) {
      newErrors.supplierId = 'Debe seleccionar un proveedor';
    }

    const filledItems = items.filter(
      (item) => item.productId || item.quantity || item.unitCost
    );
    if (filledItems.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto';
    }

    items.forEach((item, index) => {
      const hasAnyValue = item.productId || item.quantity || item.unitCost;
      if (!hasAnyValue) return;

      if (!item.productId) {
        newErrors[`item_${index}_productId`] = 'Seleccione un producto';
      }
      const qty = parseFloat(item.quantity);
      if (!item.quantity || isNaN(qty) || qty <= 0) {
        newErrors[`item_${index}_quantity`] = 'Cantidad inválida';
      }
      const cost = parseFloat(item.unitCost);
      if (!item.unitCost || isNaN(cost) || cost < 0) {
        newErrors[`item_${index}_unitCost`] = 'Costo inválido';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const validItems = items.filter((item) => item.productId && item.quantity && item.unitCost);

      const input: PurchaseOrderInput = {
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
        })),
        taxPercentage: 18,
        notes: notes.trim() || undefined,
      };

      addPurchaseOrder(input);
      toast.success('Orden de compra creada', 'La orden de compra fue registrada correctamente.');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error', 'No se pudo crear la orden de compra. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Orden de Compra"
      size="full"
    >
      <Form onSubmit={handleSubmit}>
        <FormRow>
          <FormField label="Proveedor" required error={errors.supplierId}>
            <Select
              value={supplierId}
              onChange={(value) => {
                setSupplierId(value);
                if (errors.supplierId) setErrors((prev) => ({ ...prev, supplierId: '' }));
              }}
              options={activeSuppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Seleccionar proveedor"
              error={errors.supplierId}
            />
          </FormField>
          <FormField label="Fecha esperada de entrega">
            <Input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </FormField>
        </FormRow>

        {/* Items section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-coffee-800">Productos</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addItem}
            >
              Agregar producto
            </Button>
          </div>

          {errors.items && (
            <p className="text-sm text-red-600">{errors.items}</p>
          )}

          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 bg-coffee-50 rounded-lg">
            <div className="col-span-5 text-xs font-medium text-coffee-600">Producto</div>
            <div className="col-span-2 text-xs font-medium text-coffee-600">Cantidad</div>
            <div className="col-span-2 text-xs font-medium text-coffee-600">Costo unit.</div>
            <div className="col-span-2 text-xs font-medium text-coffee-600 text-right">Subtotal</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border border-coffee-100 bg-white hover:border-coffee-200 transition-colors"
              >
                {/* Product select */}
                <div className="col-span-12 md:col-span-5">
                  <Select
                    value={item.productId}
                    onChange={(value) => handleItemChange(index, 'productId', value)}
                    options={activeProducts.map((p) => ({
                      value: p.id,
                      label: `${p.name} (Stock: ${p.stock})`,
                    }))}
                    placeholder="Seleccionar producto"
                    error={errors[`item_${index}_productId`]}
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-5 md:col-span-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="0"
                    error={errors[`item_${index}_quantity`]}
                  />
                </div>

                {/* Unit cost */}
                <div className="col-span-5 md:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                    placeholder="0.00"
                    error={errors[`item_${index}_unitCost`]}
                  />
                </div>

                {/* Subtotal */}
                <div className="col-span-10 md:col-span-2 flex items-center justify-end">
                  <span className="text-sm font-medium text-coffee-800">
                    S/ {formatCurrency(getItemSubtotal(item))}
                  </span>
                </div>

                {/* Remove button */}
                <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-1.5 text-coffee-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto w-full max-w-xs space-y-2 p-4 bg-coffee-50 rounded-xl border border-coffee-100">
          <div className="flex items-center justify-between text-sm text-coffee-700">
            <span>Subtotal</span>
            <span>S/ {formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-coffee-700">
            <span>IGV (18%)</span>
            <span>S/ {formatCurrency(tax)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold text-coffee-900 border-t border-coffee-200 pt-2">
            <span>Total</span>
            <span>S/ {formatCurrency(total)}</span>
          </div>
        </div>

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones u instrucciones para el proveedor"
            rows={3}
          />
        </FormField>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Crear Orden de Compra
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
