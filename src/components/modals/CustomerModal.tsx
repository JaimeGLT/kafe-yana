import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField, Form, FormRow, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import type { Customer, CustomerInput } from '../../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  onSuccess: () => void;
  onSave?: (input: CustomerInput, isEdit: boolean, customerId?: string) => void;
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  ruc: string;
  birthDate: string;
  isActive: boolean;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
  onSave,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CustomerFormData>({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    ruc: customer?.ruc || '',
    birthDate: customer?.birthDate || '',
    isActive: customer?.isActive ?? true,
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        ruc: customer?.ruc || '',
        birthDate: customer?.birthDate || '',
        isActive: customer?.isActive ?? true,
      });
      setErrors({});
    }
  }, [isOpen, customer]);

  const handleChange = <K extends keyof CustomerFormData>(
    field: K,
    value: CustomerFormData[K]
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
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const input: CustomerInput = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        ruc: formData.ruc.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        isActive: formData.isActive,
      };

      onSave?.(input, !!customer, customer?.id);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error', 'No se pudo guardar el cliente. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Editar Cliente' : 'Nuevo Cliente'}
      size="md"
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Nombre completo" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre del cliente"
          />
        </FormField>

        <FormRow>
          <FormField label="Teléfono" required error={errors.phone}>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Ej: 999 888 777"
            />
          </FormField>
          <FormField label="Correo electrónico" error={errors.email}>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </FormField>
        </FormRow>

        <FormField label="Dirección">
          <Input
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Dirección del cliente"
          />
        </FormField>

        <FormField label="CI / NIT">
          <Input
            value={formData.ruc}
            onChange={(e) => handleChange('ruc', e.target.value)}
            placeholder="Carnet de identidad o NIT"
          />
        </FormField>

        <FormField label="Fecha de nacimiento">
          <Input
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
          />
        </FormField>

        <FormField label="Estado">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
            />
            <span className="text-sm text-coffee-700">Cliente activo</span>
          </label>
        </FormField>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {customer ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
