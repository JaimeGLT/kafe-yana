import React from 'react';
import type { SaleInput, Customer } from '../../types';
import { Form, FormActions } from './FormField';
import { Input, Select, Button } from '../ui';
import { useInventoryStore } from '../../stores';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';

interface SaleFormProps {
  customers: Customer[];
  onSubmit: (data: SaleInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface SaleItem {
  productId: string;
  productName: string;
  variationId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export const SaleForm: React.FC<SaleFormProps> = ({
  customers,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { products } = useInventoryStore();
  const [customerId, setCustomerId] = React.useState('');
  const [items, setItems] = React.useState<SaleItem[]>([
    { productId: '', productName: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { productId: '', productName: '', quantity: 1, unitPrice: 0, discount: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof SaleItem, value: unknown) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      // If product changed, update price
      if (field === 'productId' && typeof value === 'string') {
        const product = products.find(p => p.id === value);
        newItems[index].productName = product?.name || '';
        newItems[index].unitPrice = product?.salePrice || 0;
      }

      return newItems;
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const tax = (subtotal - totalDiscount) * 0.18;
  const total = subtotal - totalDiscount + tax;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (items.some(item => !item.productId || item.quantity <= 0)) {
      newErrors.items = 'Todos los productos deben ser válidos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        customerId: customerId || undefined,
        items: items.map(item => ({
          productId: item.productId,
          variationId: item.variationId,
          quantity: item.quantity,
          discount: item.discount,
        })),
        discount: totalDiscount,
        taxPercentage: 18,
        paymentMethods: [{ type: paymentMethod, amount: total }],
        notes,
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Customer Selection */}
        <Select
          label="Cliente (opcional)"
          value={customerId}
          onChange={setCustomerId}
          options={customers
            .filter(c => c.isActive)
            .map(c => ({ value: c.id, label: `${c.name} - ${c.phone}` }))}
          placeholder="Seleccionar cliente"
        />

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-coffee-700 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Productos
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={addItem}
            >
              Agregar
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
                <div className="col-span-5">
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
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder="Precio"
                  />
                </div>
                <div className="col-span-2">
                  <div className="px-3 py-2.5 bg-white border border-coffee-200 rounded-lg text-coffee-700 font-medium">
                    S/ {(item.quantity * item.unitPrice).toFixed(2)}
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
        </div>

        {/* Payment Method */}
        <Select
          label="Método de Pago"
          value={paymentMethod}
          onChange={(value) => setPaymentMethod(value as 'cash' | 'card' | 'transfer' | 'credit')}
          options={[
            { value: 'cash', label: 'Efectivo' },
            { value: 'card', label: 'Tarjeta' },
            { value: 'transfer', label: 'Transferencia' },
            { value: 'credit', label: 'Crédito' },
          ]}
        />

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-coffee-600">Subtotal:</span>
              <span className="text-coffee-900">S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-coffee-600">IGV (18%):</span>
              <span className="text-coffee-900">S/ {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-coffee-200 pt-2">
              <span className="text-coffee-900">Total:</span>
              <span className="text-coffee-900">S/ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <Input
            label="Notas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas adicionales..."
          />
        </div>
      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Registrar Venta
        </Button>
      </FormActions>
    </Form>
  );
};