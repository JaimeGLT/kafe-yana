import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SearchableSelect } from '../ui/Select';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import { InsumoModal } from './InsumoModal';
import type { Receta, Insumo, Product } from '../../types';
import { formatCurrency } from '../../utils';
import { gql } from '../../lib/graphql';
import { GET_ALL_INSUMOS } from '../../lib/queries/insumos.queries';
import type { InsumosResponse } from '../../types/graphql';
import { mapInsumo } from '../../lib/mappers/insumos.mappers';

interface IngredienteLine {
  insumoId: string;
  quantity: string;
  merma: string;
}

const getMarginLabel = (pct: number) => {
  if (pct >= 60) return { label: '🟢 Rentable', color: 'text-emerald-700 bg-emerald-50' };
  if (pct >= 30) return { label: '🟡 Aceptable', color: 'text-amber-700 bg-amber-50' };
  return { label: '🔴 Revisar precio', color: 'text-red-700 bg-red-50' };
};

export interface RecetaFormProps {
  onClose: () => void;
  receta?: Receta;
  preselectedProductId?: string;
  productOverride?: { id: string; name: string; salePrice: number };
  insumos: Insumo[];
  products: Product[];
  onSuccess: () => void;
  onRefreshInventory?: () => Promise<void>;
}

export const RecetaFormContent: React.FC<RecetaFormProps> = ({
  onClose,
  receta,
  preselectedProductId,
  productOverride,
  insumos,
  products,
  onSuccess,
  onRefreshInventory,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [localInsumos, setLocalInsumos] = useState<Insumo[]>(insumos);

  useEffect(() => {
    setLocalInsumos(insumos);
  }, [insumos]);

  const handleInsumoCreated = useCallback(async () => {
    setInsumoModalOpen(false);
    try {
      const data = await gql<InsumosResponse>(GET_ALL_INSUMOS);
      setLocalInsumos(data.insumos.items.map(mapInsumo));
    } catch {
      if (onRefreshInventory) await onRefreshInventory();
    }
  }, [onRefreshInventory]);

  const [productId, setProductId] = useState('');
  const [nombre, setNombre] = useState('');
  const [rawPorciones, setRawPorciones] = useState('1');
  const [ingredientes, setIngredientes] = useState<IngredienteLine[]>([
    { insumoId: '', quantity: '', merma: '' },
  ]);
  const [notas, setNotas] = useState('');

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
        localInsumos
          .filter((i) => i.isActive)
          .map((i) => ({ value: i.id, label: `${i.name} (${i.unidadMinima})` }))
      ),
    [localInsumos]
  );

  useEffect(() => {
    if (receta) {
      setProductId(receta.productId);
      setNombre(receta.nombre ?? '');
      setRawPorciones(String(receta.porcionesBase));
      setIngredientes(
        receta.ingredientes.map((ing) => ({
          insumoId: ing.insumoId,
          quantity: String(ing.quantity),
          merma: String(ing.merma),
        }))
      );
      setNotas(receta.notas ?? '');
    } else {
      setProductId(preselectedProductId ?? '');
      setNombre('');
      setRawPorciones('1');
      setIngredientes([{ insumoId: '', quantity: '', merma: '' }]);
      setNotas('');
    }
  }, [receta, preselectedProductId]);

  const costoTotalReceta = useMemo(
    () =>
      ingredientes.reduce((sum, ing) => {
        const insumo = localInsumos.find(i => String(i.id) === String(ing.insumoId));
        const qty = parseFloat(ing.quantity);
        const merma = parseFloat(ing.merma) || 0;
        if (!insumo || !qty || qty <= 0) return sum;
        return sum + insumo.costoUnitario * qty * (1 + merma / 100);
      }, 0),
    [ingredientes, localInsumos]
  );

  const porciones = parseInt(rawPorciones) || 1;
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
    setIngredientes((prev) => [...prev, { insumoId: '', quantity: '', merma: '' }]);

  const removeLine = (idx: number) =>
    setIngredientes((prev) => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof IngredienteLine, value: string) =>
    setIngredientes((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line))
    );

  const validate = (): boolean => {
    const msgs: string[] = [];
    if (!productId) msgs.push('Selecciona un producto elaborado');
    if (!nombre.trim()) msgs.push('El nombre de la receta es obligatorio');
    const porcionesNum = Number(rawPorciones);
    if (!Number.isInteger(porcionesNum) || porcionesNum < 1) msgs.push('Las porciones deben ser un número entero ≥ 1');
    ingredientes.forEach((ing, i) => {
      if (ing.insumoId || ing.quantity) {
        if (!ing.insumoId) msgs.push(`Fila ${i + 1}: selecciona un insumo`);
        const qty = parseFloat(ing.quantity);
        if (!qty || qty <= 0) msgs.push(`Fila ${i + 1}: cantidad debe ser mayor a 0`);
      }
    });
    if (msgs.length > 0) {
      toast.error('Campos requeridos', msgs.join(' · '));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const productName = productOverride?.name ?? products.find((p) => p.id === productId)?.name ?? '';
    try {
      const body = {
        nombre: nombre.trim(),
        nota: notas.trim(),
        id_Elaborado: Number(productId),
        porciones,
        detalles: ingredientes
          .filter((ing) => ing.insumoId && parseFloat(ing.quantity) > 0)
          .map((ing) => {
            const insumo = localInsumos.find(i => String(i.id) === String(ing.insumoId));
            const qty = parseFloat(ing.quantity);
            const merma = parseFloat(ing.merma) || 0;
            const subTotal = insumo ? insumo.costoUnitario * qty * (1 + merma / 100) : 0;
            return { cantidad: qty, merma, subTotal, id_insumo: Number(ing.insumoId) };
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
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'No se pudo guardar la receta. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Producto + Porciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
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
              value={rawPorciones}
              onChange={(e) => setRawPorciones(e.target.value)}
            />
            <p className="text-xs text-coffee-400 mt-1">Ej: 1 torta = 8 porciones</p>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Nombre de la receta <span className="text-red-500">*</span>
          </label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Cappuccino clásico, Torta de chocolate 20cm…"
          />
        </div>

        {/* Tabla de ingredientes */}
        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-medium text-coffee-700">
              Ingredientes <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
              <Button
                type="button" variant="ghost" size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setInsumoModalOpen(true)}
                title="Crear nuevo insumo"
              >
                Nuevo insumo
              </Button>
              <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
                Agregar fila
              </Button>
            </div>
          </div>

          {/* Cabecera desktop */}
          <div className="hidden sm:grid grid-cols-[1fr_90px_70px_70px_20px] gap-2 text-xs text-coffee-400 font-medium mb-1 px-1">
            <span>Insumo</span>
            <span className="text-right">Cantidad</span>
            <span className="text-right">Merma %</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          <div className="space-y-2">
            {ingredientes.map((line, idx) => {
              const insumo = localInsumos.find(i => String(i.id) === String(line.insumoId));
              const lineSubtotal =
                insumo && parseFloat(line.quantity) > 0
                  ? insumo.costoUnitario * parseFloat(line.quantity) * (1 + (parseFloat(line.merma) || 0) / 100)
                  : 0;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-coffee-100 bg-coffee-50/40 p-3 space-y-2 sm:space-y-0 sm:bg-transparent sm:border-0 sm:rounded-none sm:grid sm:grid-cols-[1fr_90px_70px_70px_20px] sm:gap-2 sm:items-center"
                >
                  {/* Insumo + botón nuevo */}
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <SearchableSelect
                        value={line.insumoId}
                        onChange={(v) => updateLine(idx, 'insumoId', v)}
                        options={insumoOptions}
                        placeholder="Seleccionar insumo…"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setInsumoModalOpen(true)}
                      className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-coffee-200 text-coffee-500 hover:bg-coffee-50 hover:text-coffee-800 transition-colors"
                      title="Crear nuevo insumo"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Cantidad / Merma / Subtotal / Eliminar */}
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <div className="sm:contents">
                      <p className="sm:hidden text-xs text-coffee-400 mb-1">Cantidad</p>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        placeholder={insumo?.unidadMinima ?? '0'}
                        className="text-right"
                      />
                    </div>
                    <div className="sm:contents">
                      <p className="sm:hidden text-xs text-coffee-400 mb-1">Merma %</p>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={line.merma}
                        onChange={(e) => updateLine(idx, 'merma', e.target.value)}
                        placeholder="0"
                        className="text-right"
                      />
                    </div>
                    <div className="sm:contents col-span-2 sm:col-span-1">
                      <p className="sm:hidden text-xs text-coffee-400 mb-1">Subtotal</p>
                      <p className="text-right text-sm font-medium text-coffee-700 py-2 sm:py-0 tabular-nums">
                        {lineSubtotal > 0 ? formatCurrency(lineSubtotal) : '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="col-span-2 sm:col-span-1 flex sm:block justify-end text-red-400 hover:text-red-600 transition-colors self-center"
                      disabled={false}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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

        {/* Resumen de costos */}
        {costoTotalReceta > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-coffee-600">Costo total ({porciones} porción{porciones !== 1 ? 'es' : ''})</span>
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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} className="w-full sm:w-auto">
            {receta ? 'Guardar cambios' : 'Crear receta'}
          </Button>
        </div>
      </form>

      <InsumoModal
        isOpen={insumoModalOpen}
        onClose={() => setInsumoModalOpen(false)}
        onSuccess={() => {}}
        onCreated={handleInsumoCreated}
      />
    </div>
  );
};

// ── Modal wrapper ─────────────────────────────────────────────────────────────

interface RecetaModalProps extends RecetaFormProps {
  isOpen: boolean;
}

export const RecetaModal: React.FC<RecetaModalProps> = ({
  isOpen, onClose, receta, preselectedProductId, productOverride,
  insumos, products, onSuccess,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receta ? 'Editar Receta' : 'Nueva Receta'}
      size="xl"
      bottomSheet
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
