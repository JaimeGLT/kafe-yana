import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/Select';
import { ImageUploadField } from '../ui/ImageUpload';
import { HelpTooltip } from '../ui/Tooltip';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import { CodigoSinModal } from './CodigoSinModal';
import type { Combo, Product } from '../../types';
import { formatCurrency } from '../../utils';

interface ComboLine {
  productId: string;
  quantity: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  combo?: Combo;
  products: Product[];
  onSuccess: () => void;
}

const getMarginInfo = (pct: number) => {
  if (pct >= 60) return { label: '🟢 Rentable', color: 'text-emerald-700 bg-emerald-50' };
  if (pct >= 30) return { label: '🟡 Aceptable', color: 'text-amber-700 bg-amber-50' };
  return { label: '🔴 Revisar precio', color: 'text-red-700 bg-red-50' };
};

export const ComboModal: React.FC<Props> = ({ isOpen, onClose, combo, products, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCodigoSinModalOpen, setIsCodigoSinModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [codigoSin, setCodigoSin] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [items, setItems] = useState<ComboLine[]>([{ productId: '', quantity: 1 }]);

  // Products that can be in a combo (not another combo)
  const productOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar producto…' }].concat(
        products
          .filter((p) => p.isActive && p.tipo !== 'combo')
          .map((p) => ({
            value: p.id,
            label: `${p.name}${p.tipo === 'elaborado' ? ' (elaborado)' : ''}`,
          }))
      ),
    [products]
  );

  useEffect(() => {
    if (combo) {
      setName(combo.name);
      setDescription(combo.description ?? '');
      setRawPrice(String(combo.price));
      setCodigoSin(combo.codigoSin ?? '');
      const img = combo.image;
      setExistingImageUrl(img?.startsWith('http') || img?.startsWith('data:') || img?.startsWith('blob:') ? img : undefined);
      setItems(
        combo.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        }))
      );
    } else {
      setName('');
      setDescription('');
      setRawPrice('');
      setCodigoSin('');
      setExistingImageUrl(undefined);
      setItems([{ productId: '', quantity: 1 }]);
    }
    setImageFile(null);
  }, [combo, isOpen]);

  // Live cost calculation
  const costoTotal = useMemo(() => {
    return items.reduce((sum, line) => {
      const prod = products.find((p) => p.id === line.productId);
      if (!prod || line.quantity <= 0) return sum;
      const hasReceta = prod.tipo === 'elaborado' && !!prod.recetaId;
      const unitCost = hasReceta ? prod.costPrice : prod.costPrice;
      return sum + unitCost * line.quantity;
    }, 0);
  }, [items, products]);

  const sumaIndividual = useMemo(() => {
    return items.reduce((sum, line) => {
      const prod = products.find((p) => p.id === line.productId);
      if (!prod) return sum;
      return sum + prod.salePrice * line.quantity;
    }, 0);
  }, [items, products]);

  const comboPrice = parseFloat(rawPrice) || 0;
  const margenAbs = comboPrice - costoTotal;
  const margenPct = comboPrice > 0 ? (margenAbs / comboPrice) * 100 : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;
  const ahorro = sumaIndividual > 0 ? sumaIndividual - comboPrice : 0;

  const addLine = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }]);
  const removeLine = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = <K extends keyof ComboLine>(idx: number, field: K, value: ComboLine[K]) =>
    setItems((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('El nombre del combo es obligatorio.');
    if (comboPrice <= 0) errs.push('El precio del combo debe ser mayor a 0.');
    if (!codigoSin.trim()) errs.push('El Código SIN es obligatorio.');
    if (items.length === 0) errs.push('Agrega al menos un producto al combo.');
    items.forEach((line, i) => {
      if (!line.productId) errs.push(`Fila ${i + 1}: selecciona un producto.`);
      if (line.quantity <= 0) errs.push(`Fila ${i + 1}: la cantidad debe ser > 0.`);
    });
    const ids = items.map((l) => l.productId).filter(Boolean);
    if (new Set(ids).size !== ids.length) errs.push('No puedes repetir el mismo producto en el combo.');
    if (errs.length > 0) {
      toast.error('Campos requeridos', errs.join(' · '));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('Nombre', name.trim());
      if (description.trim()) fd.append('Descripcion', description.trim());
      fd.append('Precio', String(comboPrice));
      fd.append('CodigoSin', codigoSin.trim());
      if (imageFile) fd.append('Imagen', imageFile);
      items.forEach((item, i) => {
        fd.append(`Productos[${i}].ProductoId`, item.productId);
        fd.append(`Productos[${i}].Cantidad`, String(item.quantity));
        fd.append(`Productos[${i}].Opcional`, 'false');
      });

      if (combo) {
        await api.putForm(`/Combo/${combo.id}`, fd);
        toast.success('Combo actualizado', `"${name}" fue actualizado.`);
      } else {
        await api.postForm('/Combo', fd);
        toast.success('Combo creado', `"${name}" — precio: ${formatCurrency(Number(comboPrice))}`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo guardar el combo. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={combo ? 'Editar Combo' : 'Nuevo Combo'} size="lg" bottomSheet>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name + price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
              Nombre del combo
              <span className="text-red-500 ml-1">*</span>
              <HelpTooltip text="Nombre visible en el punto de venta y reportes. Ej: Desayuno completo, Menú del día." />
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Menú del día, Desayuno especial…"
              autoFocus
            />
          </div>
          <div>
            <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
              Precio especial (Bs.)
              <span className="text-red-500 ml-1">*</span>
              <HelpTooltip text="Lo que le cobras al cliente por el combo completo. Normalmente menor que la suma de los productos individuales." />
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rawPrice}
              onChange={(e) => setRawPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
            Código SIN
            <span className="text-red-500 ml-1">*</span>
          </label>
          {codigoSin ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-coffee-100 text-coffee-900 text-sm font-mono font-medium">
                {codigoSin}
              </span>
              <button
                type="button"
                onClick={() => setIsCodigoSinModalOpen(true)}
                className="text-sm text-coffee-500 hover:text-coffee-800 transition-colors"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCodigoSinModalOpen(true)}
              className="w-full rounded-lg border border-dashed border-coffee-300 px-4 py-2.5 text-sm text-coffee-400 hover:border-coffee-400 hover:text-coffee-600 transition-colors text-left"
            >
              Asignar Código SIN…
            </button>
          )}
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
            Descripción
            <HelpTooltip text="Descripción opcional del combo para referencia interna o menú." />
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del combo…"
          />
        </div>

        {/* Foto */}
        <div>
          <label className="text-sm font-medium text-coffee-700 mb-1 block">Foto del combo</label>
          <ImageUploadField existingUrl={existingImageUrl} key={existingImageUrl} onChange={setImageFile} />
        </div>

        {/* Items table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center text-sm font-medium text-coffee-700">
              Productos del combo
              <span className="text-red-500 ml-1">*</span>
              <HelpTooltip text="Cada producto incluido en el combo. El sistema descontará el stock de cada componente al vender. Los ítems opcionales permiten al cliente elegir (ej: jugo o agua)." />
            </label>
            <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
              Agregar
            </Button>
          </div>

          {/* Header — solo visible en desktop */}
          <div className="hidden sm:grid grid-cols-[1fr_70px_auto_20px] gap-2 text-xs text-coffee-400 font-medium mb-1 px-1">
            <span>Producto</span>
            <span className="text-center">Cantidad</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          <div className="space-y-2">
            {items.map((line, idx) => {
              const prod = products.find((p) => p.id === line.productId);
              const unitCost = prod?.costPrice ?? 0;
              const subtotal = prod && line.quantity > 0 ? unitCost * line.quantity : 0;

              return (
                <div key={idx} className="rounded-lg border border-coffee-100 bg-white p-2.5 sm:p-0 sm:border-0 sm:rounded-none sm:grid sm:grid-cols-[1fr_70px_auto_20px] sm:gap-2 sm:items-start">
                  {/* Producto + hint (col 1 en desktop) */}
                  <div>
                    <SearchableSelect
                      value={line.productId}
                      onChange={(v) => updateLine(idx, 'productId', v)}
                      options={productOptions}
                      placeholder="Seleccionar producto…"
                    />
                    {prod && (
                      <p className="text-xs text-coffee-400 mt-0.5 pl-1">
                        Costo: {formatCurrency(unitCost)} · PVP: {formatCurrency(prod.salePrice)}
                        {prod.tipo === 'elaborado' && !prod.recetaId && ' · ⚠ sin receta'}
                      </p>
                    )}
                  </div>
                  {/* Controles: fila flex en mobile, sm:contents en desktop */}
                  <div className="flex gap-2 items-end mt-2 sm:mt-0 sm:contents">
                    <div className="sm:contents">
                      <p className="sm:hidden text-xs text-coffee-400 mb-0.5">Cantidad</p>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-center w-20 sm:w-full"
                      />
                    </div>
                    <span className="text-xs text-coffee-500 text-right shrink-0 self-center min-w-[48px]">
                      {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-red-400 hover:text-red-600 transition-colors shrink-0 self-center"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live summary */}
        {costoTotal > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-coffee-600">Costo total combo</span>
              <span className="font-semibold text-coffee-900">{formatCurrency(costoTotal)}</span>
            </div>
            {sumaIndividual > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-coffee-500">Suma de precios individuales</span>
                <span className="text-coffee-600">{formatCurrency(sumaIndividual)}</span>
              </div>
            )}
            {comboPrice > 0 && (
              <>
                <div className="flex justify-between text-sm border-t border-amber-200 pt-1.5">
                  <span className="text-coffee-600">Precio especial combo</span>
                  <span className="text-coffee-700 font-medium">{formatCurrency(comboPrice)}</span>
                </div>
                {ahorro > 0 && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-coffee-500 flex items-center gap-1 shrink-0">
                      <Tag className="h-3.5 w-3.5" />
                      Ahorro para el cliente
                    </span>
                    <span className="text-emerald-700 font-medium text-right">{formatCurrency(ahorro)} ({((ahorro / sumaIndividual) * 100).toFixed(0)}%)</span>
                  </div>
                )}
                <div className="flex justify-between text-sm items-center">
                  <span className="font-medium text-coffee-800">
                    Margen ({margenPct?.toFixed(1)}%)
                  </span>
                  <span className={`font-bold ${margenAbs >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(margenAbs)}
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
            {combo ? 'Guardar cambios' : 'Crear combo'}
          </Button>
        </div>
      </form>
      <CodigoSinModal
        isOpen={isCodigoSinModalOpen}
        onClose={() => setIsCodigoSinModalOpen(false)}
        onSelect={setCodigoSin}
      />
    </Modal>
  );
};
