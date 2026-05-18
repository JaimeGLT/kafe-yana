import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import type { Insumo, InsumoInput } from '../../types';
import { formatCurrency } from '../../utils';

const CATEGORIAS = [
  'Lácteos', 'Cafés', 'Harinas', 'Bebidas', 'Condimentos',
  'Azúcares', 'Aceites', 'Proteínas', 'Verduras', 'Frutas',
  'Descartables', 'Otros',
].map((c) => ({ value: c, label: c }));

const UNIDADES_MINIMAS = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'taza', label: 'Taza' },
  { value: 'porcion', label: 'Porción' },
];

const UNIDADES_COMPRA = [
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'caja', label: 'Caja' },
  { value: 'botella', label: 'Botella' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'litro', label: 'Litro' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'paquete', label: 'Paquete' },
];

const empty: InsumoInput = {
  name: '',
  categoriaInsumo: '',
  unidadMinima: 'g',
  unidadCompra: 'bolsa',
  factorConversion: 0,
  costoCompra: 0,
  stock: 0,
  stockMinimo: 0,
  isActive: true,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  insumo?: Insumo;
  onSuccess: () => void;
  onCreated?: (nombre: string) => void;
}

export const InsumoModal: React.FC<Props> = ({ isOpen, onClose, insumo, onSuccess, onCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<InsumoInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof InsumoInput, string>>>({});

  useEffect(() => {
    if (insumo) {
      setForm({
        name: insumo.name,
        categoriaInsumo: insumo.categoriaInsumo,
        unidadMinima: insumo.unidadMinima,
        unidadCompra: insumo.unidadCompra,
        factorConversion: insumo.factorConversion,
        costoCompra: Number(insumo.costoCompra.toFixed(2)),
        // El backend guarda stock en unidad mínima → convertir a unidad de compra para mostrar
        stock: insumo.factorConversion > 0 ? Number((insumo.stock / insumo.factorConversion).toFixed(2)) : insumo.stock,
        stockMinimo: insumo.factorConversion > 0 ? Math.ceil(insumo.stockMinimo / insumo.factorConversion) : insumo.stockMinimo,
        proveedorId: insumo.proveedorId,
        isActive: insumo.isActive,
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [insumo, isOpen]);

  // Calculated cost per unit (read-only)
  const costoUnitario = useMemo(
    () => (form.factorConversion > 0 ? form.costoCompra / form.factorConversion : 0),
    [form.costoCompra, form.factorConversion]
  );

  const set = (field: keyof InsumoInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Nombre requerido';
    if (!form.categoriaInsumo) e.categoriaInsumo = 'Categoría requerida';
    if (!form.unidadMinima) e.unidadMinima = 'Unidad de uso requerida';
    if (!form.unidadCompra) e.unidadCompra = 'Unidad de compra requerida';
    if (form.factorConversion <= 0) e.factorConversion = 'El factor debe ser mayor a 0';
    if (form.costoCompra <= 0) e.costoCompra = 'El costo debe ser mayor a 0';
    if (form.stockMinimo < 0) e.stockMinimo = 'El mínimo debe ser ≥ 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (insumo) {
        await api.put(`/Insumo/${insumo.id}`, {
          nombre: form.name,
          categoria: form.categoriaInsumo,
          unidad_min_uso: form.unidadMinima,
          unidad_compra: form.unidadCompra,
          factor_conversion: form.factorConversion,
          costo: Number(form.costoCompra).toFixed(2),
          stock_actual: form.stock * form.factorConversion,
          stock_min: form.stockMinimo * form.factorConversion,
        });
        toast.success(
          'Insumo actualizado',
          `"${form.name}" actualizado. Costo/unidad: ${formatCurrency(costoUnitario)}/${form.unidadMinima}.`
        );
      } else {
        await api.post('/Insumo', {
          nombre: form.name,
          categoria: form.categoriaInsumo,
          unidad_min_uso: form.unidadMinima,
          unidad_compra: form.unidadCompra,
          factor_conversion: form.factorConversion,
          costo: Number(form.costoCompra).toFixed(2),
          stock_actual: form.stock * form.factorConversion,
          stock_min: form.stockMinimo * form.factorConversion,
        });
        toast.success(
          'Insumo creado',
          `"${form.name}" — ${formatCurrency(costoUnitario)} por ${form.unidadMinima}.`
        );
        onCreated?.(form.name);
      }
      onSuccess();
      onClose();
    } catch {
      toast.error('Error', 'No se pudo guardar el insumo. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={insumo ? 'Editar Insumo' : 'Nuevo Insumo'} size="lg" bottomSheet>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre + Categoría */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Leche entera, Café molido…"
              autoFocus
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">Categoría <span className="text-red-500">*</span></label>
            <Select
              value={form.categoriaInsumo}
              onChange={(v) => set('categoriaInsumo', v)}
              options={CATEGORIAS}
              placeholder="Seleccionar…"
            />
            {errors.categoriaInsumo && <p className="text-red-500 text-xs mt-1">{errors.categoriaInsumo}</p>}
          </div>
        </div>

        {/* Unidades */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              Unidad mínima de uso <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.unidadMinima}
              onChange={(v) => set('unidadMinima', v)}
              options={UNIDADES_MINIMAS}
            />
            <p className="text-xs text-coffee-400 mt-1">La unidad con la que se mide en recetas.</p>
            {errors.unidadMinima && <p className="text-red-500 text-xs mt-1">{errors.unidadMinima}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              Unidad de compra <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.unidadCompra}
              onChange={(v) => set('unidadCompra', v)}
              options={UNIDADES_COMPRA}
            />
            <p className="text-xs text-coffee-400 mt-1">Con qué presentación se compra al proveedor.</p>
            {errors.unidadCompra && <p className="text-red-500 text-xs mt-1">{errors.unidadCompra}</p>}
          </div>
        </div>

        {/* Factor + Costo compra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              Factor de conversión <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={form.factorConversion === 0 ? '' : form.factorConversion}
              onChange={(e) => set('factorConversion', parseFloat(e.target.value) || 0)}
              placeholder="Ej: 250"
            />
            <p className="text-xs text-coffee-400 mt-1">
              ¿Cuántos {form.unidadMinima} hay en 1 {form.unidadCompra}?
            </p>
            {errors.factorConversion && <p className="text-red-500 text-xs mt-1">{errors.factorConversion}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              Costo por {form.unidadCompra} (Bs.) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.costoCompra === 0 ? '' : form.costoCompra}
              onChange={(e) => set('costoCompra', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            {errors.costoCompra && <p className="text-red-500 text-xs mt-1">{errors.costoCompra}</p>}
          </div>
        </div>

        {/* Calculated unit cost */}
        {costoUnitario > 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
            <span className="text-sm text-emerald-700">
              → Costo por {form.unidadMinima}:
            </span>
            <span className="font-bold text-emerald-800">
              {formatCurrency(costoUnitario)} / {form.unidadMinima}
            </span>
            <span className="text-xs text-emerald-500 ml-1">
              ({formatCurrency(form.costoCompra)} ÷ {form.factorConversion})
            </span>
          </div>
        )}

        {/* Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              Stock actual ({form.unidadCompra})
            </label>
            <Input
              type="number"
              min="0"
              value={form.stock === 0 ? '' : form.stock}
              onChange={(e) => set('stock', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {form.stock > 0 && form.factorConversion > 0 && (
              <p className="text-xs text-coffee-400 mt-1">
                = {form.stock * form.factorConversion} {form.unidadMinima} en total
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-coffee-700 mb-1">
              Stock mínimo ({form.unidadCompra}) — alerta
            </label>
            <Input
              type="number"
              min="0"
              value={form.stockMinimo === 0 ? '' : form.stockMinimo}
              onChange={(e) => set('stockMinimo', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {errors.stockMinimo && <p className="text-red-500 text-xs mt-1">{errors.stockMinimo}</p>}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {insumo ? 'Guardar cambios' : 'Crear insumo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
