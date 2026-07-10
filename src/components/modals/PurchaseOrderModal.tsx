import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { SearchableSelect } from '../ui/Select';
import { FormField, Form, FormRow, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import { SupplierModal } from './SupplierModal';
import { gql } from '../../lib/graphql';
import { GET_PROVEEDORES } from '../../lib/queries/proveedores.queries';
import type { Supplier, Product, PurchaseOrderInput } from '../../types';
import type { Insumo } from '../../types/recipes';

type ItemType = 'product' | 'insumo';

interface OrderItem {
  itemType: ItemType;
  productId: string;
  insumoId: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  insumos: Insumo[];
  onSuccess: () => void;
  onSave?: (input: PurchaseOrderInput) => void;
}

const emptyItem = (): OrderItem => ({ itemType: 'product', productId: '', insumoId: '', quantity: '', unitCost: '' });

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  products,
  insumos,
  onSuccess,
  onSave,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
  const [localSuppliers, setLocalSuppliers] = React.useState<Supplier[]>(suppliers);

  const [supplierId, setSupplierId] = React.useState('');
  const [expectedDate, setExpectedDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState<OrderItem[]>([emptyItem()]);

  React.useEffect(() => {
    setLocalSuppliers(suppliers);
  }, [suppliers]);

  React.useEffect(() => {
    if (isOpen) {
      setSupplierId('');
      setExpectedDate('');
      setNotes('');
      setItems([emptyItem()]);
      setErrors({});
    }
  }, [isOpen]);

  const activeSuppliers = localSuppliers.filter((s) => s.isActive);
  const activeProducts = products.filter((p) => p.isActive && p.tipo === 'comprado');
  const activeInsumos = insumos.filter((i) => i.isActive);

  interface ProveedorNode {
  id: number;
  razon_Social: string;
  telefono: string;
  dni?: string;
  celular?: string;
  email?: string;
  direccion?: string;
}

const handleSupplierCreated = async () => {
  setIsSupplierModalOpen(false);
  try {
    const data = await gql<{ proveedores: { items: ProveedorNode[] } }>(GET_PROVEEDORES, { skip: 0, take: 50 });
    setLocalSuppliers(data.proveedores.items.map(n => ({
      id: String(n.id),
      code: String(n.id),
      razon_Social: n.razon_Social,
      telefono: n.telefono,
      dni: n.dni,
      celular: n.celular,
      email: n.email,
      direccion: n.direccion,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })));
  } catch (e) {
    console.error('Error refetching suppliers:', e);
  }
};

  const handleItemChange = (index: number, field: keyof OrderItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = updated[index];

      if (field === 'itemType') {
        updated[index] = { ...current, itemType: value as ItemType, productId: '', insumoId: '', unitCost: '' };
      } else if (field === 'insumoId') {
        const insumo = activeInsumos.find((i) => Number(i.id) === Number(value));
        updated[index] = {
          ...current,
          insumoId: value,
          unitCost: insumo ? String(insumo.costoCompra) : current.unitCost,
        };
      } else {
        updated[index] = { ...current, [field]: value };
      }
      return updated;
    });
    const key = `item_${index}_${field}`;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const getItemSubtotal = (item: OrderItem): number => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    return qty * cost;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemSubtotal(item), 0);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!supplierId) newErrors.supplierId = 'Debe seleccionar un proveedor';
    if (!expectedDate) newErrors.expectedDate = 'La fecha de entrega es requerida';

    const filledItems = items.filter((item) => item.productId || item.insumoId || item.quantity || item.unitCost);
    if (filledItems.length === 0) newErrors.items = 'Debe agregar al menos un ítem';

    items.forEach((item, index) => {
      const hasAnyValue = item.productId || item.insumoId || item.quantity || item.unitCost;
      if (!hasAnyValue) return;
      if (item.itemType === 'product' && !item.productId) newErrors[`item_${index}_productId`] = 'Seleccione un producto';
      if (item.itemType === 'insumo' && !item.insumoId) newErrors[`item_${index}_productId`] = 'Seleccione un insumo';
      const qty = parseFloat(item.quantity);
      if (!item.quantity || isNaN(qty) || qty <= 0) newErrors[`item_${index}_quantity`] = 'Cantidad inválida';
      const cost = parseFloat(item.unitCost);
      if (!item.unitCost || isNaN(cost) || cost < 0) newErrors[`item_${index}_unitCost`] = 'Costo inválido';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const validItems = items.filter((item) =>
        (item.itemType === 'product' ? item.productId : item.insumoId) && item.quantity && item.unitCost
      );
      const input: PurchaseOrderInput = {
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        items: validItems.map((item) => ({
          ...(item.itemType === 'product' ? { productId: item.productId } : { insumoId: item.insumoId }),
          quantity: parseFloat(item.quantity),
          unitCost: parseFloat(item.unitCost),
        })),
        notes: notes.trim() || undefined,
      };

      onSave?.(input);
      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la orden de compra. Intente nuevamente.';
      toast.error('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Nueva Orden de Compra" size="full">
        <Form onSubmit={handleSubmit}>
          <FormRow>
            <FormField label="Proveedor" required error={errors.supplierId}>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={supplierId}
                    onChange={(value) => {
                      setSupplierId(value);
                      if (errors.supplierId) setErrors((prev) => ({ ...prev, supplierId: '' }));
                    }}
                    options={activeSuppliers.map((s) => ({ value: s.id, label: s.razon_Social }))}
                    placeholder="Seleccionar proveedor"
                    error={errors.supplierId}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(true)}
                  title="Crear proveedor rápido"
                  className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-coffee-200 text-coffee-500 hover:border-coffee-400 hover:text-coffee-700 hover:bg-coffee-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </FormField>
            <FormField label="Fecha esperada de entrega" required error={errors.expectedDate}>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => {
                  setExpectedDate(e.target.value);
                  if (errors.expectedDate) setErrors((prev) => ({ ...prev, expectedDate: '' }));
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </FormField>
          </FormRow>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-coffee-800">Ítems</h4>
              <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addItem}>
                Agregar ítem
              </Button>
            </div>

            {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}

            <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1.5 bg-coffee-50 rounded-lg">
              <div className="col-span-2 text-xs font-medium text-coffee-600">Tipo</div>
              <div className="col-span-3 text-xs font-medium text-coffee-600">Ítem</div>
              <div className="col-span-2 text-xs font-medium text-coffee-600">Cantidad</div>
              <div className="col-span-2 text-xs font-medium text-coffee-600">Costo unit.</div>
              <div className="col-span-2 text-xs font-medium text-coffee-600 text-right">Subtotal</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {items.map((item, index) => {
                const selectedInsumo = item.itemType === 'insumo'
                  ? activeInsumos.find((i) => Number(i.id) === Number(item.insumoId))
                  : undefined;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-start p-2 rounded-lg border border-coffee-100 bg-white hover:border-coffee-200 transition-colors"
                  >
                    {/* Type toggle */}
                    <div className="col-span-12 md:col-span-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleItemChange(index, 'itemType', 'product')}
                        className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                          item.itemType === 'product'
                            ? 'bg-coffee-600 border-coffee-600 text-white'
                            : 'border-coffee-200 text-coffee-500 hover:border-coffee-400'
                        }`}
                      >
                        Producto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemChange(index, 'itemType', 'insumo')}
                        className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                          item.itemType === 'insumo'
                            ? 'bg-coffee-600 border-coffee-600 text-white'
                            : 'border-coffee-200 text-coffee-500 hover:border-coffee-400'
                        }`}
                      >
                        Insumo
                      </button>
                    </div>

                    {/* Item select */}
                    <div className="col-span-12 md:col-span-3">
                      {item.itemType === 'product' ? (
                        <SearchableSelect
                          value={item.productId}
                          onChange={(value) => handleItemChange(index, 'productId', value)}
                          options={activeProducts.map((p) => ({ value: p.id, label: `${p.name} (Stock: ${p.stock})` }))}
                          placeholder="Seleccionar producto"
                          error={errors[`item_${index}_productId`]}
                        />
                      ) : (
                        <SearchableSelect
                          value={item.insumoId}
                          onChange={(value) => handleItemChange(index, 'insumoId', value)}
                          options={activeInsumos.map((i) => ({
                            value: i.id,
                            label: `${i.name} (${i.stock} ${i.unidadMinima})`,
                          }))}
                          placeholder="Seleccionar insumo"
                          error={errors[`item_${index}_productId`]}
                        />
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-5 md:col-span-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder={selectedInsumo ? `0 ${selectedInsumo.unidadCompra}` : '0'}
                        error={errors[`item_${index}_quantity`]}
                      />
                      {selectedInsumo && (
                        <p className="text-xs text-coffee-400 mt-0.5">{selectedInsumo.unidadCompra}</p>
                      )}
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

                    {/* Delete */}
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

          {/* Total */}
          <div className="mt-4 ml-auto w-full max-w-xs p-4 bg-coffee-50 rounded-xl border border-coffee-100">
            <div className="flex items-center justify-between text-base font-bold text-coffee-900">
              <span>Total</span>
              <span>S/ {formatCurrency(subtotal)}</span>
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

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={handleSupplierCreated}
      />
    </>
  );
};
