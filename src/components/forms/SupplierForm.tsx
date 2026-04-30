import React from 'react';
import type { Supplier, SupplierInput } from '../../types';
import { Form, FormField, FormRow, FormActions } from './FormField';
import { Input } from '../ui';
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
    razon_Social: supplier?.razon_Social || '',
    telefono: supplier?.telefono || '',
    dni: supplier?.dni || '',
    celular: supplier?.celular || '',
    email: supplier?.email || '',
    direccion: supplier?.direccion || '',
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

    if (!formData.razon_Social.trim()) {
      newErrors.razon_Social = 'La razón social es requerida';
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
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
        <FormField label="Razón Social" required error={errors.razon_Social}>
          <Input
            value={formData.razon_Social}
            onChange={(e) => handleChange('razon_Social', e.target.value)}
            placeholder="Nombre o razón social del proveedor"
          />
        </FormField>

        <FormField label="N° Documento (RUC / DNI)">
          <Input
            value={formData.dni || ''}
            onChange={(e) => handleChange('dni', e.target.value)}
            placeholder="Ej: 20123456789"
          />
        </FormField>

        <FormRow>
          <FormField label="Teléfono" required error={errors.telefono}>
            <Input
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              placeholder="Ej: 01 234 5678"
            />
          </FormField>
          <FormField label="Celular">
            <Input
              type="tel"
              value={formData.celular || ''}
              onChange={(e) => handleChange('celular', e.target.value)}
              placeholder="Ej: 987 654 321"
            />
          </FormField>
        </FormRow>

        <FormField label="Email">
          <Input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contacto@empresa.com"
          />
        </FormField>

        <FormField label="Dirección">
          <Input
            value={formData.direccion || ''}
            onChange={(e) => handleChange('direccion', e.target.value)}
            placeholder="Dirección del proveedor"
          />
        </FormField>
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