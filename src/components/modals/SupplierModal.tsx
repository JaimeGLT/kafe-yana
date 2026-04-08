import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FormField, Form, FormRow, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import type { Supplier, SupplierInput } from '../../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier;
  onSuccess: () => void;
  onSave?: (input: SupplierInput, isEdit: boolean, supplierId?: string) => void;
}

interface SupplierFormData {
  name: string;
  ruc: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess,
  onSave,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<SupplierFormData>({
    name: supplier?.name || '',
    ruc: supplier?.ruc || '',
    phone: supplier?.phone || '',
    mobile: supplier?.mobile || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: supplier?.name || '',
        ruc: supplier?.ruc || '',
        phone: supplier?.phone || '',
        mobile: supplier?.mobile || '',
        email: supplier?.email || '',
        address: supplier?.address || '',
      });
      setErrors({});
    }
  }, [isOpen, supplier]);

  const handleChange = <K extends keyof SupplierFormData>(field: K, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'La razón social es requerida';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      newErrors.email = 'El correo electrónico no es válido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const input: SupplierInput = {
        name: formData.name.trim(),
        ruc: formData.ruc.trim() || undefined,
        phone: formData.phone.trim(),
        mobile: formData.mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        isActive: true,
      };

      if (onSave) {
        onSave(input, !!supplier, supplier?.id);
      } else if (supplier) {
        await api.put(`/Supplier/${supplier.id}`, input);
      } else {
        await api.post('/Supplier', input);
      }

      toast.success(
        supplier ? 'Proveedor actualizado' : 'Proveedor creado',
        supplier ? `${input.name} fue actualizado.` : `${input.name} fue registrado.`
      );
      onSuccess();
      onClose();
    } catch {
      toast.error('Error', 'No se pudo guardar el proveedor. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      size="md"
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Razón Social" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre o razón social del proveedor"
          />
        </FormField>

        <FormField label="N° Documento (RUC / DNI)">
          <Input
            value={formData.ruc}
            onChange={(e) => handleChange('ruc', e.target.value)}
            placeholder="Ej: 20123456789"
          />
        </FormField>

        <FormRow>
          <FormField label="Teléfono" required error={errors.phone}>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Ej: 01 234 5678"
            />
          </FormField>
          <FormField label="Celular">
            <Input
              type="tel"
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              placeholder="Ej: 987 654 321"
            />
          </FormField>
        </FormRow>

        <FormField label="Email" error={errors.email}>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="contacto@empresa.com"
          />
        </FormField>

        <FormField label="Dirección">
          <Input
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Dirección del proveedor"
          />
        </FormField>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {supplier ? 'Guardar Cambios' : 'Crear Proveedor'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
