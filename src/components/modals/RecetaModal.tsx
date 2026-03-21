import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../ui/Toast';
import { useRecipesStore, useInventoryStore } from '../../stores';
import type { Receta } from '../../types';
import { formatCurrency } from '../../utils';

interface IngredienteLine {
  insumoId: string;
  quantity: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  receta?: Receta;
  // If provided, locks the product selector to this product
  preselectedProductId?: string;
}

export const RecetaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  receta,
  preselectedProductId,
}) => {
  const { addReceta, updateReceta, insumos } = useRecipesStore();
  const { products } = useInventoryStore();
  const [isLoading, setIsLoading] = useState(false);

  const [productId, setProductId] = useState('');
  const [ingredientes, setIngredientes] = useState<IngredienteLine[]>([{ insumoId: '', quantity: 0 }]);
  const [notas, setNotas] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Only non-service products
  const productOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar producto…' }].concat(
        products
          .filter((p) => p.isActive && !p.isService)
          .map((p) => ({ value: p.id, label: p.name }))
      ),
    [products]
  );

  const insumoOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar insumo…' }].concat(
        insumos
          .filter((i) => i.isActive)
          .map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))
      ),
    [insumos]
  );

  useEffect(() => {
    if (receta) {
      setProductId(receta.productId);
      setIngredientes(
        receta.ingredientes.map((ing) => ({
          insumoId: ing.insumoId,
          quantity: ing.quantity,
        }))
      );
      setNotas(receta.notas ?? '');
    } else {
      setProductId(preselectedProductId ?? '');
      setIngredientes([{ insumoId: '', quantity: 0 }]);
      setNotas('');
    }
    setErrors([]);
  }, [receta, preselectedProductId, isOpen]);

  // Live cost preview
  const costoPreview = useMemo(() => {
    return ingredientes.reduce((sum, ing) => {
      const insumo = insumos.find((i) => i.id === ing.insumoId);
      if (!insumo || ing.quantity <= 0) return sum;
      return sum + insumo.unitCost * ing.quantity;
    }, 0);
  }, [ingredientes, insumos]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const margen = selectedProduct ? selectedProduct.salePrice - costoPreview : null;
  const margenPct =
    selectedProduct && selectedProduct.salePrice > 0
      ? ((margen! / selectedProduct.salePrice) * 100).toFixed(1)
      : null;

  const addLine = () =>
    setIngredientes((prev) => [...prev, { insumoId: '', quantity: 0 }]);

  const removeLine = (idx: number) =>
    setIngredientes((prev) => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof IngredienteLine, value: string | number) =>
    setIngredientes((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line))
    );

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!productId) errs.push('Selecciona un producto.');
    if (ingredientes.length === 0) errs.push('Agrega al menos un ingrediente.');
    ingredientes.forEach((ing, i) => {
      if (!ing.insumoId) errs.push(`Fila ${i + 1}: selecciona un insumo.`);
      if (ing.quantity <= 0) errs.push(`Fila ${i + 1}: la cantidad debe ser mayor a 0.`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const productName = products.find((p) => p.id === productId)?.name ?? '';
    try {
      if (receta) {
        updateReceta(receta.id, { productId, ingredientes, notas }, productName);
        toast.success('Receta actualizada', `La receta de "${productName}" fue actualizada.`);
      } else {
        addReceta({ productId, ingredientes, notas }, productName);
        toast.success('Receta creada', `La receta de "${productName}" fue creada. Costo: ${formatCurrency(costoPreview)}`);
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receta ? 'Editar Receta' : 'Nueva Receta'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product selector */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Producto elaborado</label>
          <Select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={productOptions}
            disabled={!!preselectedProductId && !receta}
          />
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-coffee-700">Ingredientes</label>
            <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
              Agregar
            </Button>
          </div>

          <div className="space-y-2">
            {ingredientes.map((line, idx) => {
              const insumo = insumos.find((i) => i.id === line.insumoId);
              const subtotal = insumo && line.quantity > 0 ? insumo.unitCost * line.quantity : 0;
              return (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Select
                      value={line.insumoId}
                      onChange={(e) => updateLine(idx, 'insumoId', e.target.value)}
                      options={insumoOptions}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={line.quantity === 0 ? '' : line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder={insumo ? insumo.unit : 'Cant.'}
                    />
                  </div>
                  {subtotal > 0 && (
                    <span className="text-xs text-coffee-500 mt-2 min-w-[60px] text-right">
                      {formatCurrency(subtotal)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="mt-1.5 text-red-400 hover:text-red-600 transition-colors"
                    disabled={ingredientes.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">Notas (opcional)</label>
          <Input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Variante, observaciones…"
          />
        </div>

        {/* Live cost summary */}
        {costoPreview > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-coffee-600">Costo de producción</span>
              <span className="font-semibold text-coffee-900">{formatCurrency(costoPreview)}</span>
            </div>
            {selectedProduct && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">Precio de venta</span>
                  <span className="text-coffee-700">{formatCurrency(selectedProduct.salePrice)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-amber-200 pt-1 mt-1">
                  <span className="font-medium text-coffee-800">Margen</span>
                  <span className={`font-bold ${margen! >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(margen!)} ({margenPct}%)
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <ul className="text-red-500 text-xs space-y-0.5">
            {errors.map((err, i) => <li key={i}>• {err}</li>)}
          </ul>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {receta ? 'Guardar cambios' : 'Crear receta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
