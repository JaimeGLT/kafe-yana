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
  nombre: string;
  celular: string;
  correo: string;
  dni: string;
  fecha_nacimiento: string;
  direccion: string;
  estado: boolean;
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
    nombre: customer?.nombre || '',
    celular: customer?.celular || '',
    correo: customer?.correo || '',
    dni: customer?.dni || '',
    fecha_nacimiento: customer?.fecha_nacimiento || '',
    direccion: customer?.direccion || '',
    estado: customer?.estado ?? true,
  });

  React.useEffect(() => {
    if (isOpen) {
      let fechaNasc = '';
      if (customer?.fecha_nacimiento) {
        const d = new Date(customer.fecha_nacimiento);
        fechaNasc = d.toISOString().split('T')[0];
      }
      setFormData({
        nombre: customer?.nombre || '',
        celular: customer?.celular || '',
        correo: customer?.correo || '',
        dni: customer?.dni ? String(customer.dni) : '',
        fecha_nacimiento: fechaNasc,
        direccion: customer?.direccion || '',
        estado: customer?.estado ?? true,
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

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (!formData.celular.trim()) {
      newErrors.celular = 'El teléfono es requerido';
    }
    if (formData.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo.trim())) {
      newErrors.correo = 'El correo electrónico no es válido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const dniValue = formData.dni.trim();
      let fechaNasc: string | undefined;
      if (formData.fecha_nacimiento) {
        fechaNasc = new Date(formData.fecha_nacimiento + 'T00:00:00Z').toISOString();
      }

      const input: CustomerInput = {
        nombre: formData.nombre.trim(),
        celular: formData.celular.trim(),
        correo: formData.correo.trim() || undefined,
        dni: dniValue ? parseInt(dniValue, 10) : undefined,
        fecha_nacimiento: fechaNasc,
        direccion: formData.direccion.trim() || undefined,
        estado: formData.estado,
      };

      await onSave?.(input, !!customer, customer?.id);
      toast.success(
        customer ? 'Cliente actualizado' : 'Cliente creado',
        `${formData.nombre} se ${customer ? 'actualizó' : 'creó'} correctamente.`
      );
      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el cliente. Intente nuevamente.';
      toast.error('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Editar Cliente' : 'Nuevo Cliente'}
      bottomSheet
      size="md"
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Nombre completo" required error={errors.nombre}>
          <Input
            value={formData.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            placeholder="Nombre del cliente"
          />
        </FormField>

        <FormRow>
          <FormField label="Teléfono" required error={errors.celular}>
            <Input
              type="tel"
              value={formData.celular}
              onChange={(e) => handleChange('celular', e.target.value)}
              placeholder="Ej: 999 888 777"
            />
          </FormField>
          <FormField label="Correo electrónico" error={errors.correo}>
            <Input
              type="email"
              value={formData.correo}
              onChange={(e) => handleChange('correo', e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </FormField>
        </FormRow>

        <FormField label="DNI">
          <Input
            value={formData.dni}
            onChange={(e) => handleChange('dni', e.target.value)}
            placeholder="Carnet de identidad"
          />
        </FormField>

        <FormField label="Fecha de nacimiento">
          <Input
            type="date"
            value={formData.fecha_nacimiento}
            onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
          />
        </FormField>

        <FormField label="Dirección">
          <Input
            value={formData.direccion}
            onChange={(e) => handleChange('direccion', e.target.value)}
            placeholder="Dirección del cliente"
          />
        </FormField>

        <FormField label="Estado">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.estado}
              onChange={(e) => handleChange('estado', e.target.checked)}
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
