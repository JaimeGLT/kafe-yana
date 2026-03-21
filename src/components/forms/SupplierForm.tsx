import React from 'react';
import type { Supplier, SupplierInput } from '../../types';
import { Form, FormField, FormRow, FormActions } from './FormField';
import { Input, Textarea } from '../ui';
import { Button } from '../ui';

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  supplier,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState<SupplierInput>({
    name: supplier?.name || '',
    contactName: supplier?.contactName || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    ruc: supplier?.ruc || '',
    website: supplier?.website || '',
    notes: supplier?.notes || '',
    paymentTerms: supplier?.paymentTerms || '',
    creditLimit: supplier?.creditLimit,
    isActive: supplier?.isActive ?? true,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (field: keyof SupplierInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <FormRow>
          <FormField label="Nombre" required error={errors.name}>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </FormField>
          <FormField label="Contacto">
            <Input
              value={formData.contactName || ''}
              onChange={(e) => handleChange('contactName', e.target.value)}
              placeholder="Nombre del contacto"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Email">
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </FormField>
          <FormField label="Teléfono" required error={errors.phone}>
            <Input
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Teléfono"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="RUC">
            <Input
              value={formData.ruc || ''}
              onChange={(e) => handleChange('ruc', e.target.value)}
              placeholder="RUC del proveedor"
            />
          </FormField>
          <FormField label="Sitio Web">
            <Input
              value={formData.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://www.ejemplo.com"
            />
          </FormField>
        </FormRow>

        <FormField label="Dirección">
          <Textarea
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Dirección del proveedor"
            rows={2}
          />
        </FormField>

        <FormRow>
          <FormField label="Términos de Pago">
            <Input
              value={formData.paymentTerms || ''}
              onChange={(e) => handleChange('paymentTerms', e.target.value)}
              placeholder="Ej: 30 días"
            />
          </FormField>
          <FormField label="Límite de Crédito">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.creditLimit || ''}
              onChange={(e) => handleChange('creditLimit', parseFloat(e.target.value) || undefined)}
              placeholder="0.00"
            />
          </FormField>
        </FormRow>

        <FormField label="Notas">
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Notas adicionales..."
            rows={3}
          />
        </FormField>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
          />
          <span className="text-sm text-coffee-700">Activo</span>
        </label>
      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {supplier ? 'Guardar Cambios' : 'Crear Proveedor'}
        </Button>
      </FormActions>
    </Form>
  );
};