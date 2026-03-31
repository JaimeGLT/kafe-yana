import React, { useState, useEffect, useMemo } from 'react';
// RecetaFormContent is exported for inline use (e.g. inside another modal tab)
import { Plus, Trash2, Copy } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import type { Receta, Insumo, Product } from '../../types';
import { formatCurrency } from '../../utils';

interface IngredienteLine {
  insumoId: string;
  quantity: number;
  merma: number;
}

// Profitability semaphore
const getMarginLabel = (pct: number) => {
  if (pct >= 60) return { label: '🟢 Rentable', color: 'text-emerald-700 bg-emerald-50' };
  if (pct >= 30) return { label: '🟡 Aceptable', color: 'text-amber-700 bg-amber-50' };
  return { label: '🔴 Revisar precio', color: 'text-red-700 bg-red-50' };
};

// ── Shared props ──────────────────────────────────────────────────────────────

export interface RecetaFormProps {
  onClose: () => void;
  receta?: Receta;
  preselectedProductId?: string;
  productOverride?: { id: string; name: string; salePrice: number };
  insumos: Insumo[];
  products: Product[];
  onSuccess: () => void;
}

// ── Form content (reusable without Modal wrapper) ─────────────────────────────

export const RecetaFormContent: React.FC<RecetaFormProps> = ({
  onClose,
  receta,
  preselectedProductId,
  productOverride,
  insumos,
  products,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const [productId, setProductId] = useState('');
  const [nombre, setNombre] = useState('');
  const [porcionesBase, setPorcionesBase] = useState(1);
  const [ingredientes, setIngredientes] = useState<IngredienteLine[]>([
    { insumoId: '', quantity: 0, merma: 0 },
  ]);
  const [notas, setNotas] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const productOptions = useMemo(() => {
    const storeElaborados = products
      .filter((p) => p.isActive && p.tipo === 'elaborado')
      .map((p) => ({ value: p.id, label: p.name }));

    if (productOverride && !storeElaborados.find((p) => p.value === productOverride.id)) {
      storeElaborados.unshift({ value: productOverride.id, label: productOverride.name });
    }

    return [{ value: '', label: 'Seleccionar producto elaborado…' }, ...storeElaborados];
  }, [products, productOverride]);

  const insumoOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar insumo…' }].concat(
        insumos
          .filter((i) => i.isActive)
          .map((i) => ({ value: i.id, label: `${i.name} (${i.unidadMinima})` }))
      ),
    [insumos]
  );

  useEffect(() => {
    if (receta) {
      setProductId(receta.productId);
      setNombre(receta.nombre ?? '');
      setPorcionesBase(receta.porcionesBase);
      setIngredientes(
        receta.ingredientes.map((ing) => ({
          insumoId: ing.insumoId,
          quantity: ing.quantity,
          merma: ing.merma,
        }))
      );
      setNotas(receta.notas ?? '');
    } else {
      setProductId(preselectedProductId ?? '');
      setNombre('');
      setPorcionesBase(1);
      setIngredientes([{ insumoId: '', quantity: 0, merma: 0 }]);
      setNotas('');
    }
    setErrors([]);
  }, [receta, preselectedProductId]);

  const costoTotalReceta = useMemo(
    () =>
      ingredientes.reduce((sum, ing) => {
        const insumo = insumos.find((i) => i.id === ing.insumoId);
        if (!insumo || ing.quantity <= 0) return sum;
        return sum + insumo.costoUnitario * ing.quantity * (1 + ing.merma / 100);
      }, 0),
    [ingredientes, insumos]
  );

  const porciones = porcionesBase > 0 ? porcionesBase : 1;
  const costoPorPorcion = costoTotalReceta / porciones;

  const selectedProduct = useMemo(
    () => productOverride ?? products.find((p) => p.id === productId),
    [productOverride, products, productId]
  );

  const margen = selectedProduct ? selectedProduct.salePrice - costoPorPorcion : null;
  const margenPct =
    selectedProduct && selectedProduct.salePrice > 0
      ? (margen! / selectedProduct.salePrice) * 100
      : null;
  const semaforo = margenPct !== null ? getMarginLabel(margenPct) : null;

  const addLine = () =>
    setIngredientes((prev) => [...prev, { insumoId: '', quantity: 0, merma: 0 }]);

  const removeLine = (idx: number) =>
    setIngredientes((prev) => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof IngredienteLine, value: string | number) =>
    setIngredientes((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line))
    );

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!productId) errs.push('Selecciona un producto elaborado.');
    if (porcionesBase <= 0) errs.push('Las porciones deben ser ≥ 1.');
    if (ingredientes.length === 0) errs.push('Agrega al menos un ingrediente.');
    ingredientes.forEach((ing, i) => {
      if (!ing.insumoId) errs.push(`Fila ${i + 1}: selecciona un insumo.`);
      if (ing.quantity <= 0) errs.push(`Fila ${i + 1}: la cantidad debe ser mayor a 0.`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const productName = productOverride?.name ?? products.find((p) => p.id === productId)?.name ?? '';
    try {
      const body = {
        nombre: nombre.trim() || productName,
        nota: notas.trim(),
        id_Elaborado: Number(productId),
        detalles: ingredientes.map((ing) => {
          const insumo = insumos.find((i) => i.id === ing.insumoId);
          const subTotal = insumo ? insumo.costoUnitario * ing.quantity * (1 + ing.merma / 100) : 0;
          return {
            cantidad: ing.quantity,
            merma: ing.merma,
            subTotal,
            id_insumo: Number(ing.insumoId),
          };
        }),
      };
      if (receta) {
        await api.put(`/Receta/${receta.id}`, body);
        toast.success('Receta actualizada', `La receta de "${productName}" fue actualizada.`);
      } else {
        await api.post('/Receta', body);
        toast.success('Receta creada', `La receta de "${productName}" fue creada.`);
      }
      onSuccess();
      onClose();
    } catch {
      toast.error('Error', 'No se pudo guardar la receta. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Product + Porciones */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Producto elaborado <span className="text-red-500">*</span>
          </label>
          <Select
            value={productId}
            onChange={(v) => setProductId(v)}
            options={productOptions}
            disabled={!!preselectedProductId}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Porciones que produce <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="1"
            value={porcionesBase}
            onChange={(e) => setPorcionesBase(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-coffee-400 mt-1">Ej: 1 torta = 8 porciones</p>
        </div>
      </div>

      {/* Nombre de la receta */}
      <div>
        <label className="block text-sm font-medium text-coffee-700 mb-1">
          Nombre de la receta <span className="text-coffee-400 font-normal">(opcional)</span>
        </label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Cappuccino clásico, Torta de chocolate 20cm…"
        />
      </div>

      {/* Ingredients table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-coffee-700">
            Ingredientes <span className="text-red-500">*</span>
          </label>
          <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
            Agregar
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_90px_60px_56px_20px] gap-2 text-xs text-coffee-400 font-medium mb-1 px-1">
          <span>Insumo</span>
          <span className="text-right">Cantidad</span>
          <span className="text-right">Merma %</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        <div className="space-y-2">
          {ingredientes.map((line, idx) => {
            const insumo = insumos.find((i) => i.id === line.insumoId);
            const subtotal =
              insumo && line.quantity > 0
                ? insumo.costoUnitario * line.quantity * (1 + line.merma / 100)
                : 0;

            return (
              <div key={idx} className="grid grid-cols-[1fr_90px_60px_56px_20px] gap-2 items-center">
                <Select
                  value={line.insumoId}
                  onChange={(v) => updateLine(idx, 'insumoId', v)}
                  options={insumoOptions}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={line.quantity === 0 ? '' : line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder={insumo?.unidadMinima ?? ''}
                  className="text-right"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={line.merma === 0 ? '' : line.merma}
                  onChange={(e) => updateLine(idx, 'merma', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="text-right"
                />
                <span className="text-xs text-right text-coffee-500 font-medium">
                  {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-red-400 hover:text-red-600 transition-colors"
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
        <label className="block text-sm font-medium text-coffee-700 mb-1">Notas internas (opcional)</label>
        <Input
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Temperatura, técnica, instrucciones para el barista…"
        />
      </div>

      {/* Live cost summary */}
      {costoTotalReceta > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600">Costo total receta ({porciones} porción{porciones !== 1 ? 'es' : ''})</span>
            <span className="font-semibold text-coffee-900">{formatCurrency(costoTotalReceta)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600 font-medium">Costo por porción</span>
            <span className="font-bold text-coffee-900">{formatCurrency(costoPorPorcion)}</span>
          </div>
          {selectedProduct && (
            <>
              <div className="flex justify-between text-sm border-t border-amber-200 pt-1.5">
                <span className="text-coffee-600">Precio de venta</span>
                <span className="text-coffee-700">{formatCurrency(selectedProduct.salePrice)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="font-medium text-coffee-800">Margen ({margenPct?.toFixed(1)}%)</span>
                <span className={`font-bold ${margen! >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(margen!)}
                </span>
              </div>
              {semaforo && (
                <div className={`text-xs font-semibold rounded px-2 py-1 text-center ${semaforo.color}`}>
                  {semaforo.label}
                </div>
              )}
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

      <div className="flex justify-between items-center pt-1">
        {receta && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Copy className="h-4 w-4" />}
            onClick={() => toast.success('Duplicar', 'Usa "Nueva Receta" y selecciona el producto destino.')}
          >
            Duplicar receta
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {receta ? 'Guardar cambios' : 'Crear receta'}
          </Button>
        </div>
      </div>
    </form>
  );
};

// ── Modal wrapper ─────────────────────────────────────────────────────────────

interface RecetaModalProps extends RecetaFormProps {
  isOpen: boolean;
}

export const RecetaModal: React.FC<RecetaModalProps> = ({ isOpen, onClose, receta, preselectedProductId, productOverride, insumos, products, onSuccess }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receta ? 'Editar Receta' : 'Nueva Receta'}
      size="lg"
    >
      {isOpen && (
        <RecetaFormContent
          onClose={onClose}
          receta={receta}
          preselectedProductId={preselectedProductId}
          productOverride={productOverride}
          insumos={insumos}
          products={products}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
};
