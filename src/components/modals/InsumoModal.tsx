import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../ui/Toast';
import { useRecipesStore } from '../../stores';
import type { Insumo, InsumoInput } from '../../types';

const UNIT_OPTIONS = [
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'porcion', label: 'Porción' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  insumo?: Insumo;
}

export const InsumoModal: React.FC<Props> = ({ isOpen, onClose, insumo }) => {
  const { addInsumo, updateInsumo } = useRecipesStore();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<InsumoInput>({
    name: '',
    unit: 'g',
    unitCost: 0,
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof InsumoInput, string>>>({});

  useEffect(() => {
    if (insumo) {
      setForm({ name: insumo.name, unit: insumo.unit, unitCost: insumo.unitCost, isActive: insumo.isActive });
    } else {
      setForm({ name: '', unit: 'g', unitCost: 0, isActive: true });
    }
    setErrors({});
  }, [insumo, isOpen]);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Nombre requerido';
    if (!form.unit) e.unit = 'Unidad requerida';
    if (form.unitCost <= 0) e.unitCost = 'El costo debe ser mayor a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (insumo) {
        updateInsumo(insumo.id, form);
        toast.success('Insumo actualizado', `"${form.name}" fue actualizado. Los costos se recalcularon automáticamente.`);
      } else {
        addInsumo(form);
        toast.success('Insumo creado', `"${form.name}" fue agregado con costo Bs. ${form.unitCost}/${form.unit}.`);
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
      title={insumo ? 'Editar Insumo' : 'Nuevo Insumo'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Nombre
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Leche entera, Café molido…"
            autoFocus
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Unidad de medida
          </label>
          <Select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            options={UNIT_OPTIONS}
          />
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-coffee-700 mb-1">
            Costo por {form.unit || 'unidad'} (Bs.)
          </label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={form.unitCost === 0 ? '' : form.unitCost}
            onChange={(e) => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
            placeholder="0.000"
          />
          {errors.unitCost && <p className="text-red-500 text-xs mt-1">{errors.unitCost}</p>}
          <p className="text-xs text-coffee-400 mt-1">
            Registra el costo en la unidad mínima que usas en cocina.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
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
