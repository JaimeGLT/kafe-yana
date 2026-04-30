import React from 'react';
import type { PurchaseOrderInput, Supplier, Product } from '../../types';
import { Form, FormField, FormRow, FormActions } from './FormField';
import { Input, Textarea, Select, DatePicker, Button } from '../ui';
import { Plus, Trash2 } from 'lucide-react';

interface PurchaseFormProps {
  suppliers: Supplier[];
  products: Product[];
  onSubmit: (data: PurchaseOrderInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  notes?: string;
}

export const PurchaseForm: React.FC<PurchaseFormProps> = ({
  suppliers,
  products,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState({
    supplierId: '',
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    taxPercentage: 18,
    notes: '',
  });

  const [items, setItems] = React.useState<PurchaseItem[]>([
    { productId: '', productName: '', quantity: 1, unitCost: 0 },
  ]);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSupplierChange = (value: string) => {
    setFormData(prev => ({ ...prev, supplierId: value }));
    if (errors.supplierId) {
      setErrors(prev => ({ ...prev, supplierId: '' }));
    }
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { productId: '', productName: '', quantity: 1, unitCost: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: unknown) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      // If product changed, update product name
      if (field === 'productId' && typeof value === 'string') {
        const product = products.find(p => p.id === value);
        newItems[index].productName = product?.name || '';
        newItems[index].unitCost = product?.costPrice || 0;
      }

      return newItems;
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const tax = subtotal * (formData.taxPercentage / 100);
  const total = subtotal + tax;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'El proveedor es requerido';
    }

    if (items.some(item => !item.productId || item.quantity <= 0)) {
      newErrors.items = 'Todos los productos deben tener nombre y cantidad válida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        supplierId: formData.supplierId,
        expectedDate: formData.expectedDate,
        taxPercentage: formData.taxPercentage,
        notes: formData.notes,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          notes: item.notes,
        })),
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <FormRow>
          <FormField label="Proveedor" required error={errors.supplierId}>
            <Select
              value={formData.supplierId}
              onChange={handleSupplierChange}
              options={suppliers
                .filter(s => s.isActive)
                .map(s => ({ value: s.id, label: s.razon_Social }))}
              placeholder="Seleccionar proveedor"
            />
          </FormField>
          <FormField label="Fecha Esperada">
            <DatePicker
              value={formData.expectedDate}
              onChange={(date) => date && setFormData(prev => ({ ...prev, expectedDate: date }))}
              minDate={new Date()}
            />
          </FormField>
        </FormRow>

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-coffee-700">Productos</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addItem}
            >
              Agregar Producto
            </Button>
          </div>

          {errors.items && (
            <p className="text-sm text-red-600">{errors.items}</p>
          )}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 p-3 bg-coffee-50 rounded-lg"
              >
                <div className="col-span-4">
                  <Select
                    value={item.productId}
                    onChange={(value) => updateItem(index, 'productId', value)}
                    options={products
                      .filter(p => p.isActive)
                      .map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                    placeholder="Producto"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="Cant."
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitCost}
                    onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                    placeholder="Costo Unit."
                  />
                </div>
                <div className="col-span-2">
                  <div className="px-3 py-2.5 bg-white border border-coffee-200 rounded-lg text-coffee-700">
                    S/ {(item.quantity * item.unitCost).toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-coffee-600">Subtotal:</span>
                <span className="text-coffee-900">S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-coffee-600">IGV ({formData.taxPercentage}%):</span>
                <span className="text-coffee-900">S/ {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-coffee-200 pt-2">
                <span className="text-coffee-900">Total:</span>
                <span className="text-coffee-900">S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <FormField label="Notas">
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas adicionales..."
            rows={3}
          />
        </FormField>
      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Crear Orden de Compra
        </Button>
      </FormActions>
    </Form>
  );
};