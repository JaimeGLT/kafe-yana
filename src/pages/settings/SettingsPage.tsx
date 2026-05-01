import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, Modal, ConfirmModal, StatusBadge } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import type { User } from '../../types';

interface UserForm {
  nombre: string;
  email: string;
  rol: string;
  isActive: boolean;
}

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'mesero', label: 'Mesero' },
];

const SettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get<User[]>('/settings/users');
        setUsers(data);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const emptyForm: UserForm = { nombre: '', email: '', rol: '', isActive: true };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<UserForm>>({});

  const validate = (): boolean => {
    const e: Partial<UserForm> = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.email.trim()) e.email = 'Requerido';
    if (!form.rol) e.rol = 'Seleccione un rol';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (userId: string) => {
    const user = users.find((u: User) => u.id === userId);
    if (!user) return;
    const nombre = user.firstName || (user as any).nombre || '';
    setForm({
      nombre,
      email: user.email,
      rol: (user as any).rol || user.roleId || '',
      isActive: user.isActive,
    });
    setEditingId(userId);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editingId) {
        await api.put(`/settings/users/${editingId}`, form);
        setUsers((prev) => prev.map((u: User) => u.id === editingId ? { ...u, ...form, firstName: form.nombre } as User : u));
        toast.success('Usuario actualizado correctamente');
      } else {
        const newUser = await api.post<User>('/settings/users', form);
        setUsers((prev) => [...prev, newUser]);
        toast.success('Usuario creado correctamente');
      }
      setModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el usuario. Intente nuevamente.';
      toast.error('Error', message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/settings/users/${deleteId}`);
      setUsers((prev) => prev.filter((u: User) => u.id !== deleteId));
      setDeleteId(null);
      toast.success('Usuario eliminado');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario. Intente nuevamente.';
      toast.error('Error', message);
    }
  };

  const getRolLabel = (rol: string): string => {
    const role = ROLES.find(r => r.value === rol);
    return role ? role.label : rol;
  };

  if (loading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="py-8 text-center text-coffee-500">Cargando...</div>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Configuración"
          subtitle="Gestión de usuarios del sistema"
          breadcrumbs={[{ label: 'Configuración' }]}
        />

        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex justify-end mb-6">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Agregar Usuario
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-100">
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Rol</th>
                    <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold text-coffee-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-coffee-400">No hay usuarios registrados</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-coffee-900">{u.firstName || (u as any).nombre}</td>
                        <td className="py-3 px-4 text-coffee-600">{u.email}</td>
                        <td className="py-3 px-4 text-coffee-600">{getRolLabel((u as any).rol || u.roleId || '')}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(u.id)}
                              className="p-1.5 text-coffee-500 hover:text-coffee-700 hover:bg-coffee-100 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(u.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Editar Usuario' : 'Agregar Usuario'}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editingId ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              error={errors.nombre}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              error={errors.email}
            />
            <Select
              label="Rol"
              value={form.rol}
              onChange={v => setForm(f => ({ ...f, rol: v }))}
              options={ROLES}
              error={errors.rol}
            />
            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm text-coffee-700">Estado</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-coffee-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cafe-500"></div>
              </label>
              <span className="text-sm text-coffee-600">{form.isActive ? 'Activo' : 'Inactivo (sin acceso)'}</span>
            </div>
            <p className="text-xs text-coffee-400">Si está inactivo, el usuario no podrá iniciar sesión.</p>
          </div>
        </Modal>

        <ConfirmModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Eliminar Usuario"
          message="¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          variant="danger"
        />
      </PageContainer>
    </MainLayout>
  );
};

export default SettingsPage;