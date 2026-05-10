import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Lock, Unlock, KeyRound } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, Modal, ConfirmModal, StatusBadge } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_USUARIOS } from '../../lib/queries/settings.queries';
import type { User } from '../../types/user';

interface CreateUserForm {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  numeroPhone: string;
  rol: string;
}

interface ChangePwForm {
  passwordActual: string;
  passwordNueva: string;
  confirmar: string;
}

const ROLES = [
  { value: '0', label: 'Administrador' },
  { value: '1', label: 'Mesero' },
  { value: '2', label: 'Cajero' },
];

const ROL_LABEL: Record<string, string> = {
  Admin: 'Administrador',
  Mesero: 'Mesero',
  Cajero: 'Cajero',
};

const emptyCreate: CreateUserForm = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  numeroPhone: '',
  rol: '',
};

const emptyPw: ChangePwForm = {
  passwordActual: '',
  passwordNueva: '',
  confirmar: '',
};

const SettingsPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreate);
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateUserForm, string>>>({});
  const [createLoading, setCreateLoading] = useState(false);

  const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [blockTarget, setBlockTarget] = useState<{ email: string; action: 'bloquear' | 'desbloquear' } | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState<ChangePwForm>(emptyPw);
  const [pwErrors, setPwErrors] = useState<Partial<ChangePwForm>>({});
  const [pwLoading, setPwLoading] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    try {
      const data = await gql<{ usuarios: User[] }>(GET_USUARIOS);
      setUsuarios(data.usuarios ?? []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo cargar los usuarios.';
      toast.error('Error', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const validateCreate = (): boolean => {
    const e: Partial<Record<keyof CreateUserForm, string>> = {};
    if (!createForm.nombre.trim()) e.nombre = 'Requerido';
    if (!createForm.apellido.trim()) e.apellido = 'Requerido';
    if (!createForm.email.trim()) e.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) e.email = 'Email inválido';
    if (!createForm.password) e.password = 'Requerido';
    else if (createForm.password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!createForm.numeroPhone.trim()) e.numeroPhone = 'Requerido';
    if (!createForm.rol) e.rol = 'Seleccione un rol';
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setCreateLoading(true);
    try {
      await api.post('/Aunth/Registro', {
        nombre: createForm.nombre.trim(),
        apellido: createForm.apellido.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        numeroPhone: createForm.numeroPhone.trim(),
        rol: parseInt(createForm.rol, 10),
      });
      toast.success('Usuario creado correctamente');
      setCreateOpen(false);
      setCreateForm(emptyCreate);
      await fetchUsuarios();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo crear el usuario.';
      toast.error('Error al crear', msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockTarget) return;
    const { email, action } = blockTarget;
    setBlockLoading(true);
    try {
      await api.put(`/Aunth/${action}/${encodeURIComponent(email)}`);
      setUsuarios((prev) =>
        prev.map((u) => (u.email === email ? { ...u, estado: action === 'desbloquear' } : u))
      );
      toast.success(action === 'bloquear' ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      setBlockTarget(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `No se pudo ${action} el usuario.`;
      toast.error('Error', msg);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEmail) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/Aunth/${encodeURIComponent(deleteEmail)}`);
      setUsuarios((prev) => prev.filter((u) => u.email !== deleteEmail));
      setDeleteEmail(null);
      toast.success('Usuario eliminado');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo eliminar el usuario.';
      toast.error('Error', msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const validatePw = (): boolean => {
    const e: Partial<ChangePwForm> = {};
    if (!pwForm.passwordActual) e.passwordActual = 'Requerido';
    if (!pwForm.passwordNueva) e.passwordNueva = 'Requerido';
    else if (pwForm.passwordNueva.length < 6) e.passwordNueva = 'Mínimo 6 caracteres';
    if (!pwForm.confirmar) e.confirmar = 'Requerido';
    else if (pwForm.confirmar !== pwForm.passwordNueva) e.confirmar = 'Las contraseñas no coinciden';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePw = async () => {
    if (!validatePw()) return;
    setPwLoading(true);
    try {
      await api.put('/Aunth/new-password', {
        passwordActual: pwForm.passwordActual,
        passwordNueva: pwForm.passwordNueva,
      });
      toast.success('Contraseña actualizada correctamente');
      setPwOpen(false);
      setPwForm(emptyPw);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.';
      toast.error('Error', msg);
    } finally {
      setPwLoading(false);
    }
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

        {/* Usuarios */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex justify-end mb-6">
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => { setCreateForm(emptyCreate); setCreateErrors({}); setCreateOpen(true); }}
              >
                Agregar Usuario
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-100">
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Apellido</th>
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Rol</th>
                    <th className="text-left py-3 px-4 font-semibold text-coffee-700">Teléfono</th>
                    <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold text-coffee-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-coffee-400">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.email} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-coffee-900">{u.nombre}</td>
                        <td className="py-3 px-4 text-coffee-600">{u.apellido}</td>
                        <td className="py-3 px-4 text-coffee-600">{u.email}</td>
                        <td className="py-3 px-4 text-coffee-600">{ROL_LABEL[u.rol] ?? u.rol}</td>
                        <td className="py-3 px-4 text-coffee-600">{u.celular}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={u.estado ? 'active' : 'inactive'} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {u.estado ? (
                              <button
                                onClick={() => setBlockTarget({ email: u.email, action: 'bloquear' })}
                                className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                                title="Bloquear"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setBlockTarget({ email: u.email, action: 'desbloquear' })}
                                className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                title="Desbloquear"
                              >
                                <Unlock className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteEmail(u.email)}
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

        {/* Cambiar mi contraseña */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-coffee-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-coffee-500" />
                Cambiar mi contraseña
              </h3>
              <p className="text-sm text-coffee-500 mt-0.5">Actualiza la contraseña de tu cuenta</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPwForm(emptyPw); setPwErrors({}); setPwOpen(true); }}
            >
              Cambiar contraseña
            </Button>
          </div>
        </div>

        {/* Modal crear usuario */}
        <Modal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Agregar Usuario"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? 'Creando…' : 'Crear Usuario'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                value={createForm.nombre}
                onChange={(e) => setCreateForm((f) => ({ ...f, nombre: e.target.value }))}
                error={createErrors.nombre}
                disabled={createLoading}
              />
              <Input
                label="Apellido"
                value={createForm.apellido}
                onChange={(e) => setCreateForm((f) => ({ ...f, apellido: e.target.value }))}
                error={createErrors.apellido}
                disabled={createLoading}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              error={createErrors.email}
              disabled={createLoading}
            />
            <Input
              label="Contraseña"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              error={createErrors.password}
              disabled={createLoading}
            />
            <Input
              label="Teléfono"
              type="tel"
              value={createForm.numeroPhone}
              onChange={(e) => setCreateForm((f) => ({ ...f, numeroPhone: e.target.value }))}
              error={createErrors.numeroPhone}
              disabled={createLoading}
            />
            <Select
              label="Rol"
              value={createForm.rol}
              onChange={(v) => setCreateForm((f) => ({ ...f, rol: v }))}
              options={ROLES}
              error={createErrors.rol}
              disabled={createLoading}
            />
          </div>
        </Modal>

        {/* Modal cambiar contraseña */}
        <Modal
          isOpen={pwOpen}
          onClose={() => setPwOpen(false)}
          title="Cambiar contraseña"
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={pwLoading}>
                Cancelar
              </Button>
              <Button onClick={handleChangePw} disabled={pwLoading}>
                {pwLoading ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Input
              label="Contraseña actual"
              type="password"
              value={pwForm.passwordActual}
              onChange={(e) => setPwForm((f) => ({ ...f, passwordActual: e.target.value }))}
              error={pwErrors.passwordActual}
              disabled={pwLoading}
            />
            <Input
              label="Nueva contraseña"
              type="password"
              value={pwForm.passwordNueva}
              onChange={(e) => setPwForm((f) => ({ ...f, passwordNueva: e.target.value }))}
              error={pwErrors.passwordNueva}
              disabled={pwLoading}
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={pwForm.confirmar}
              onChange={(e) => setPwForm((f) => ({ ...f, confirmar: e.target.value }))}
              error={pwErrors.confirmar}
              disabled={pwLoading}
            />
          </div>
        </Modal>

        {/* Confirm bloquear / desbloquear */}
        <ConfirmModal
          isOpen={!!blockTarget}
          onClose={() => setBlockTarget(null)}
          onConfirm={handleConfirmBlock}
          title={blockTarget?.action === 'bloquear' ? 'Bloquear usuario' : 'Desbloquear usuario'}
          message={
            blockTarget?.action === 'bloquear'
              ? `¿Bloquear a ${blockTarget.email}? No podrá iniciar sesión hasta que sea desbloqueado.`
              : `¿Desbloquear a ${blockTarget?.email}? Podrá volver a iniciar sesión.`
          }
          confirmText={blockLoading ? 'Procesando…' : blockTarget?.action === 'bloquear' ? 'Bloquear' : 'Desbloquear'}
          variant={blockTarget?.action === 'bloquear' ? 'danger' : 'info'}
        />

        {/* Confirm eliminar */}
        <ConfirmModal
          isOpen={!!deleteEmail}
          onClose={() => setDeleteEmail(null)}
          onConfirm={handleDelete}
          title="Eliminar Usuario"
          message={`¿Está seguro de que desea eliminar al usuario ${deleteEmail}? Esta acción no se puede deshacer.`}
          confirmText={deleteLoading ? 'Eliminando…' : 'Eliminar'}
          variant="danger"
        />
      </PageContainer>
    </MainLayout>
  );
};

export default SettingsPage;
