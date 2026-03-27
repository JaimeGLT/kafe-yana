import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { FormField, Form, FormRow, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import type { Supplier, SupplierInput } from '../../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier;
  onSuccess: () => void;
  onSave: (input: SupplierInput, isEdit: boolean, supplierId?: string) => void;
}

interface SupplierFormData {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  ruc: string;
  website: string;
  paymentTerms: string;
  creditLimit: string;
  notes: string;
  isActive: boolean;
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
    contactName: supplier?.contactName || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    ruc: supplier?.ruc || '',
    website: supplier?.website || '',
    paymentTerms: supplier?.paymentTerms || '',
    creditLimit: supplier?.creditLimit != null ? String(supplier.creditLimit) : '',
    notes: supplier?.notes || '',
    isActive: supplier?.isActive ?? true,
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: supplier?.name || '',
        contactName: supplier?.contactName || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        address: supplier?.address || '',
        ruc: supplier?.ruc || '',
        website: supplier?.website || '',
        paymentTerms: supplier?.paymentTerms || '',
        creditLimit: supplier?.creditLimit != null ? String(supplier.creditLimit) : '',
        notes: supplier?.notes || '',
        isActive: supplier?.isActive ?? true,
      });
      setErrors({});
    }
  }, [isOpen, supplier]);

  const handleChange = <K extends keyof SupplierFormData>(
    field: K,
    value: SupplierFormData[K]
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
    if (formData.creditLimit !== '' && isNaN(parseFloat(formData.creditLimit))) {
      newErrors.creditLimit = 'El límite de crédito debe ser un número válido';
    }
    if (formData.creditLimit !== '' && parseFloat(formData.creditLimit) < 0) {
      newErrors.creditLimit = 'El límite de crédito no puede ser negativo';
    }

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
        contactName: formData.contactName.trim() || undefined,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        ruc: formData.ruc.trim() || undefined,
        website: formData.website.trim() || undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        creditLimit: formData.creditLimit !== '' ? parseFloat(formData.creditLimit) : undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
      };

      onSave(input, !!supplier, supplier?.id);
      onSuccess();
      onClose();
    } catch (error) {
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
      size="lg"
    >
      <Form onSubmit={handleSubmit}>
        <FormRow>
          <FormField label="Nombre de la empresa" required error={errors.name}>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </FormField>
          <FormField label="Nombre de contacto">
            <Input
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              placeholder="Persona de contacto"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Teléfono" required error={errors.phone}>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Ej: 01 234 5678"
            />
          </FormField>
          <FormField label="Correo electrónico" error={errors.email}>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </FormField>
        </FormRow>

        <FormField label="Dirección">
          <Input
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Dirección del proveedor"
          />
        </FormField>

        <FormRow>
          <FormField label="RUC">
            <Input
              value={formData.ruc}
              onChange={(e) => handleChange('ruc', e.target.value)}
              placeholder="Número de RUC"
            />
          </FormField>
          <FormField label="Sitio web">
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://ejemplo.com"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Términos de pago">
            <Input
              value={formData.paymentTerms}
              onChange={(e) => handleChange('paymentTerms', e.target.value)}
              placeholder="Ej: 30 días"
            />
          </FormField>
          <FormField label="Límite de crédito" error={errors.creditLimit}>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.creditLimit}
              onChange={(e) => handleChange('creditLimit', e.target.value)}
              placeholder="0.00"
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

        <FormField label="Estado">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
            />
            <span className="text-sm text-coffee-700">Proveedor activo</span>
          </label>
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
