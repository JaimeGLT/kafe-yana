import React, { useState } from 'react';
import { Button, Input, PasswordInput, Select } from '../ui';
import type { User } from '../../types/user';
import type { CreateUserPayload, UpdateUserPayload } from '../../hooks/useUsuarios';

export const ROL_OPTIONS = [
  { value: '0', label: 'Administrador' },
  { value: '1', label: 'Mesero' },
  { value: '2', label: 'Cajero' },
];

export const ROL_LABEL: Record<string, string> = {
  Admin: 'Administrador',
  Mesero: 'Mesero',
  Cajero: 'Cajero',
};

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  loading?: boolean;
  errors?: Partial<Record<string, string>>;
  showPasswordField?: boolean;
  showRolField?: boolean;
  emailEditable?: boolean;
}



export const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, loading, errors, showPasswordField = true, showRolField = true, emailEditable = false }) => {
  const isEdit = !!user;
  const [form, setForm] = useState(() => ({
    nombre: user?.nombre ?? '',
    apellido: user?.apellido ?? '',
    email: user?.email ?? '',
    usuario: user?.userName ?? '',
    password: '',
    numeroPhone: user?.celular ?? '',
    rol: user ? (user.rol === 'Admin' ? '0' : user.rol === 'Mesero' ? '1' : '2') : '',
  }));
  const [localErrors, setLocalErrors] = useState<Partial<Record<string, string>>>({});

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.apellido.trim()) e.apellido = 'Requerido';
    if (!form.email.trim()) e.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    if (!form.usuario.trim()) e.usuario = 'Requerido';
    else if (!/^[a-zA-Z0-9._-]{3,20}$/.test(form.usuario)) e.usuario = '3-20 caracteres, solo letras, números, . _ -';
    else if (form.usuario.trim().toLowerCase() === form.email.trim().toLowerCase()) e.usuario = 'Debe ser distinto del email';
    if (!isEdit && !form.password) e.password = 'Requerido';
    else if (form.password && form.password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!form.numeroPhone.trim()) e.numeroPhone = 'Requerido';
    if (!form.rol) e.rol = 'Seleccione un rol';
    setLocalErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      usuario: form.usuario.trim(),
      password: form.password,
      numeroPhone: form.numeroPhone.trim(),
      rol: parseInt(form.rol, 10),
    };

    if (isEdit) {
      if (emailEditable) {
        await onSubmit(payload as CreateUserPayload);
      } else {
        const { email, password, usuario, ...rest } = payload;
        await onSubmit({ ...rest, password: form.password || undefined } as UpdateUserPayload);
      }
    } else {
      await onSubmit(payload as CreateUserPayload);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (localErrors[field]) setLocalErrors((e) => ({ ...e, [field]: '' }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre"
          placeholder="Ingrese nombre"
          value={form.nombre}
          onChange={(e) => handleChange('nombre', e.target.value)}
          error={errors?.nombre ?? localErrors.nombre}
          disabled={loading}
        />
        <Input
          label="Apellido"
          placeholder="Ingrese apellido"
          value={form.apellido}
          onChange={(e) => handleChange('apellido', e.target.value)}
          error={errors?.apellido ?? localErrors.apellido}
          disabled={loading}
        />
      </div>
      <Input
        label="Email"
        type="email"
        placeholder="correo@ejemplo.com"
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={errors?.email ?? localErrors.email}
        disabled={loading || (isEdit && !emailEditable)}
      />
      <Input
        label="Usuario"
        type="text"
        placeholder="ej. j.perez"
        value={form.usuario}
        onChange={(e) => handleChange('usuario', e.target.value)}
        error={errors?.usuario ?? localErrors.usuario}
        disabled={loading || (isEdit && !emailEditable)}
      />
      {showPasswordField && (
        <PasswordInput
          label={isEdit ? 'Contraseña' : 'Contraseña'}
          placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors?.password ?? localErrors.password}
          disabled={loading}
        />
      )}
      <Input
        label="Teléfono"
        type="tel"
        placeholder="099 123 4567"
        value={form.numeroPhone}
        onChange={(e) => handleChange('numeroPhone', e.target.value)}
        error={errors?.numeroPhone ?? localErrors.numeroPhone}
        disabled={loading}
      />
      {showRolField && (
        <Select
          label="Rol"
          value={form.rol}
          onChange={(v) => handleChange('rol', v)}
          options={ROL_OPTIONS}
          error={errors?.rol ?? localErrors.rol}
          disabled={loading}
        />
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? (isEdit ? 'Guardando…' : 'Creando…') : (isEdit ? 'Guardar' : 'Crear Usuario')}
        </Button>
      </div>
    </form>
  );
};
