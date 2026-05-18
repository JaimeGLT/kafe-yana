import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { FormField, Form, FormRow } from '../forms/FormField';
import { toast } from '../ui/Toast';
import { api, ApiError } from '../../lib/api';
import type { Category, CategoryInput } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
  onSuccess: (createdName?: string) => void;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  isActive: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  const [formData, setFormData] = React.useState<CategoryFormData>({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || '#8B4513',
    isActive: category?.isActive ?? true,
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: category?.name || '',
        description: category?.description || '',
        color: category?.color || '#8B4513',
        isActive: category?.isActive ?? true,
      });
      setErrors({});
    }
  }, [isOpen, category]);

  const handleChange = <K extends keyof CategoryFormData>(
    field: K,
    value: CategoryFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const input: CategoryInput = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        isActive: formData.isActive,
      };

      const body = {
        nombre: input.name,
        descripcion: input.description ?? '',
        color: input.color,
        estado: input.isActive,
      };

      if (category) {
        await api.put(`/Categoria/${category.id}`, body);
        toast.success('Categoría actualizada', `"${input.name}" fue actualizada correctamente.`);
      } else {
        await api.post('/Categoria', body);
        toast.success('Categoría creada', `"${input.name}" fue creada correctamente.`);
      }
      onSuccess(input.name);
      onClose();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar la categoría. Intente nuevamente.';
      toast.error('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Editar Categoría' : 'Nueva Categoría'}
      size="md"
      bottomSheet
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Nombre" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre de la categoría"
          />
        </FormField>

        <FormField label="Descripción">
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción opcional"
            rows={3}
          />
        </FormField>

        <FormRow>
          <FormField label="Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="h-10 w-16 rounded-lg border border-coffee-200 cursor-pointer bg-white p-1"
              />
              <span className="text-sm text-coffee-600 font-mono">{formData.color}</span>
            </div>
          </FormField>

          <FormField label="Estado">
            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
              />
              <span className="text-sm text-coffee-700">Categoría activa</span>
            </label>
          </FormField>
        </FormRow>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-coffee-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="w-full sm:w-auto">
            {category ? 'Guardar Cambios' : 'Crear Categoría'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
