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
  razon_Social: string;
  dni: string;
  telefono: string;
  celular: string;
  email: string;
  direccion: string;
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
    razon_Social: supplier?.razon_Social || '',
    dni: supplier?.dni || '',
    telefono: supplier?.telefono || '',
    celular: supplier?.celular || '',
    email: supplier?.email || '',
    direccion: supplier?.direccion || '',
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        razon_Social: supplier?.razon_Social || '',
        dni: supplier?.dni || '',
        telefono: supplier?.telefono || '',
        celular: supplier?.celular || '',
        email: supplier?.email || '',
        direccion: supplier?.direccion || '',
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
    if (!formData.razon_Social.trim()) newErrors.razon_Social = 'La razón social es requerida';
    if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es requerido';
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
        razon_Social: formData.razon_Social.trim(),
        telefono: formData.telefono.trim(),
        dni: formData.dni.trim() || undefined,
        celular: formData.celular.trim() || undefined,
        email: formData.email.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
      };

      if (onSave) {
        onSave(input, !!supplier, supplier?.id);
      } else if (supplier) {
        await api.put(`/Proveedor/${supplier.id}`, input);
      } else {
        await api.post('/Proveedor', input);
        toast.success('Proveedor creado', `${input.razon_Social} fue registrado.`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el proveedor. Intente nuevamente.';
      toast.error('Error', message);
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
        <FormField label="Razón Social" required error={errors.razon_Social}>
          <Input
            value={formData.razon_Social}
            onChange={(e) => handleChange('razon_Social', e.target.value)}
            placeholder="Nombre o razón social del proveedor"
          />
        </FormField>

        <FormField label="N° Documento (RUC / DNI)">
          <Input
            value={formData.dni}
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
              value={formData.celular}
              onChange={(e) => handleChange('celular', e.target.value)}
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
            value={formData.direccion}
            onChange={(e) => handleChange('direccion', e.target.value)}
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
