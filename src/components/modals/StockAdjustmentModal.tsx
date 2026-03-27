import React from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { FormField, Form, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import type { Product, StockAdjustmentInput } from '../../types';

interface AdjustmentItem {
  productId: string;
  adjustment: string;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  onSave: (input: StockAdjustmentInput) => void;
}

const emptyItem = (): AdjustmentItem => ({ productId: '', adjustment: '' });

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  onSave,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [type, setType] = React.useState<'positive' | 'negative'>('positive');
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState<AdjustmentItem[]>([emptyItem()]);

  React.useEffect(() => {
    if (isOpen) {
      setType('positive');
      setReason('');
      setNotes('');
      setItems([emptyItem()]);
      setErrors({});
    }
  }, [isOpen]);

  const activeProducts = products.filter((p) => p.isActive);

  const getProductById = (id: string): Product | undefined =>
    products.find((p) => p.id === id);

  const getNewStock = (item: AdjustmentItem): number | null => {
    const product = getProductById(item.productId);
    if (!product) return null;
    const adj = parseFloat(item.adjustment);
    if (isNaN(adj) || adj < 0) return null;
    return type === 'positive'
      ? product.stock + adj
      : Math.max(0, product.stock - adj);
  };

  const handleItemChange = (index: number, field: keyof AdjustmentItem, value: string) => {
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!reason.trim()) {
      newErrors.reason = 'El motivo es requerido';
    }

    const filledItems = items.filter((item) => item.productId || item.adjustment);
    if (filledItems.length === 0) {
      newErrors.items = 'Agregue al menos un producto';
    }

    items.forEach((item, index) => {
      const hasAnyValue = item.productId || item.adjustment;
      if (!hasAnyValue) return;

      if (!item.productId) {
        newErrors[`item_${index}_productId`] = 'Seleccione un producto';
      }
      const adj = parseFloat(item.adjustment);
      if (!item.adjustment || isNaN(adj) || adj <= 0) {
        newErrors[`item_${index}_adjustment`] = 'Ingrese una cantidad válida';
      }

      // Check for duplicate products
      const duplicates = items.filter((other, otherIdx) => otherIdx !== index && other.productId === item.productId && item.productId !== '');
      if (duplicates.length > 0) {
        newErrors[`item_${index}_productId`] = 'Este producto ya fue agregado';
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
      const validItems = items.filter((item) => item.productId && item.adjustment && parseFloat(item.adjustment) > 0);

      const input: StockAdjustmentInput = {
        type,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        items: validItems.map((item) => ({
          productId: item.productId,
          adjustment: parseFloat(item.adjustment),
        })),
      };

      onSave(input);

      const typeLabel = type === 'positive' ? 'Entrada' : 'Salida';
      toast.success(
        `Ajuste de stock registrado`,
        `${typeLabel} aplicada a ${validItems.length} producto(s).`
      );
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error', 'No se pudo registrar el ajuste. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste de Stock"
      size="xl"
    >
      <Form onSubmit={handleSubmit}>
        {/* Type toggle */}
        <div className="space-y-1">
          <span className="block text-sm font-medium text-coffee-700">Tipo de ajuste</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('positive')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                type === 'positive'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Entrada (Sumar stock)
            </button>
            <button
              type="button"
              onClick={() => setType('negative')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                type === 'negative'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Salida (Restar stock)
            </button>
          </div>
        </div>

        <FormField label="Motivo del ajuste" required error={errors.reason}>
          <Input
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) setErrors((prev) => ({ ...prev, reason: '' }));
            }}
            placeholder="Ej: Merma, inventario físico, devolución de proveedor"
            error={errors.reason}
          />
        </FormField>

        {/* Items section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-coffee-800">Productos a ajustar</h4>
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

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 bg-coffee-50 rounded-lg">
            <div className="col-span-5 text-xs font-medium text-coffee-600">Producto</div>
            <div className="col-span-2 text-xs font-medium text-coffee-600">Stock actual</div>
            <div className="col-span-2 text-xs font-medium text-coffee-600">Cantidad</div>
            <div className="col-span-2 text-xs font-medium text-coffee-600">Nuevo stock</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-2">
            {items.map((item, index) => {
              const product = getProductById(item.productId);
              const newStock = getNewStock(item);
              const isNegativeResult = newStock !== null && newStock <= 0;

              return (
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
                        label: `${p.name} — Stock: ${p.stock}`,
                      }))}
                      placeholder="Seleccionar producto"
                      error={errors[`item_${index}_productId`]}
                    />
                  </div>

                  {/* Current stock */}
                  <div className="col-span-4 md:col-span-2 flex items-center">
                    <span className="text-sm text-coffee-700 font-medium">
                      {product != null ? product.stock : '—'}
                    </span>
                  </div>

                  {/* Adjustment quantity */}
                  <div className="col-span-6 md:col-span-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.adjustment}
                      onChange={(e) => handleItemChange(index, 'adjustment', e.target.value)}
                      placeholder="0"
                      error={errors[`item_${index}_adjustment`]}
                    />
                  </div>

                  {/* New stock preview */}
                  <div className="col-span-10 md:col-span-2 flex items-center">
                    {newStock !== null ? (
                      <span
                        className={`text-sm font-semibold ${
                          isNegativeResult ? 'text-red-600' : type === 'positive' ? 'text-green-600' : 'text-orange-600'
                        }`}
                      >
                        {newStock}
                      </span>
                    ) : (
                      <span className="text-sm text-coffee-400">—</span>
                    )}
                  </div>

                  {/* Remove */}
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
              );
            })}
          </div>
        </div>

        <FormField label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones adicionales sobre el ajuste"
            rows={3}
          />
        </FormField>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className={
              type === 'positive'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }
          >
            {type === 'positive' ? 'Aplicar Entrada' : 'Aplicar Salida'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
