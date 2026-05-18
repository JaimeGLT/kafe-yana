import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { FormField, Form, FormRow, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import type { CashMovementInput } from '../../types';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'income' | 'expense';
  onSuccess: () => void;
  categories?: { id: string; name: string; type: 'income' | 'expense'; isActive: boolean }[];
  currentRegister?: { status: string } | null;
  onSave?: (input: CashMovementInput) => void;
}

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'otros-ingresos', name: 'Otros ingresos', type: 'income' as const, isActive: true },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'gastos-operativos', name: 'Gastos operativos', type: 'expense' as const, isActive: true },
  { id: 'proveedores', name: 'Proveedores', type: 'expense' as const, isActive: true },
  { id: 'personal', name: 'Personal', type: 'expense' as const, isActive: true },
  { id: 'mantenimiento', name: 'Mantenimiento', type: 'expense' as const, isActive: true },
];

interface MovementFormData {
  type: 'income' | 'expense';
  categoryId: string;
  concept: string;
  amount: string;
  reference: string;
  notes: string;
}

export const CashMovementModal: React.FC<CashMovementModalProps> = ({
  isOpen,
  onClose,
  type: initialType = 'income',
  onSuccess,
  categories = [],
  currentRegister: _currentRegister = null,
  onSave,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<MovementFormData>({
    type: initialType,
    categoryId: '',
    concept: '',
    amount: '',
    reference: '',
    notes: '',
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        type: initialType,
        categoryId: '',
        concept: '',
        amount: '',
        reference: '',
        notes: '',
      });
      setErrors({});
    }
  }, [isOpen, initialType]);

  const filteredCategories = (() => {
    const passed = categories.filter((c) => c.isActive && c.type === formData.type);
    if (passed.length > 0) return passed;
    return formData.type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
  })();

  const handleChange = <K extends keyof MovementFormData>(
    field: K,
    value: MovementFormData[K]
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Reset category when type changes
      if (field === 'type') {
        updated.categoryId = '';
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoryId) {
      newErrors.categoryId = 'Seleccione una categoría';
    }
    if (!formData.concept.trim()) {
      newErrors.concept = 'El concepto es requerido';
    }
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Ingrese un monto válido mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const categoryName = (() => {
        const allCats = [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES];
        return categories.find((c) => c.id === formData.categoryId)?.name
          || allCats.find((c) => c.id === formData.categoryId)?.name
          || formData.categoryId;
      })();

      const input: CashMovementInput = {
        type: formData.type,
        category: categoryName,
        concept: formData.concept.trim(),
        amount: parseFloat(formData.amount),
        reference: formData.reference.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      onSave?.(input);
      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo registrar el movimiento. Verifique que la caja esté abierta.';
      toast.error('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Movimiento de Caja" size="md">
      <Form onSubmit={handleSubmit}>
        {/* Type toggle */}
        <div className="space-y-1">
          <span className="block text-sm font-medium text-coffee-700">Tipo de movimiento</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleChange('type', 'income')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.type === 'income'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => handleChange('type', 'expense')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.type === 'expense'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Egreso
            </button>
          </div>
        </div>

        <FormField label="Categoría" required error={errors.categoryId}>
          <Select
            value={formData.categoryId}
            onChange={(value) => handleChange('categoryId', value)}
            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Seleccionar categoría"
            error={errors.categoryId}
          />
        </FormField>

        <FormField label="Concepto" required error={errors.concept}>
          <Input
            value={formData.concept}
            onChange={(e) => handleChange('concept', e.target.value)}
            placeholder="Descripción del movimiento"
            error={errors.concept}
          />
        </FormField>

        <FormRow>
          <FormField label="Monto (S/)" required error={errors.amount}>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              placeholder="0.00"
              error={errors.amount}
            />
          </FormField>
          <FormField label="Referencia">
            <Input
              value={formData.reference}
              onChange={(e) => handleChange('reference', e.target.value)}
              placeholder="N° de boleta, factura, etc."
            />
          </FormField>
        </FormRow>

        <FormField label="Notas">
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Observaciones adicionales"
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
              formData.type === 'income'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }
          >
            {formData.type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
