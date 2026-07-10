import React, { useState, useEffect } from 'react';
import { MainLayout, PageHeader, PageContainer } from '../../components/layout';
import { Button, BottomSheet, PasswordInput } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { usePerfil, type ChangePasswordPayload } from '../../hooks/usePerfil';
import { useAuth } from '../../contexts/AuthContext';
import { ROL_LABEL } from '../../components/settings/UserForm';
import { UserForm } from '../../components/settings/UserForm';
import type { CreateUserPayload, UpdateUserPayload } from '../../hooks/useUsuarios';

const emptyPw: ChangePasswordPayload = {
  passwordActual: '',
  passwordNueva: '',
  passwordConfirm: '',
};

interface SettingsProfilePageProps {
  embedded?: boolean;
}

export const SettingsProfilePage: React.FC<SettingsProfilePageProps> = ({ embedded }) => {
  const { perfil, loading, fetchPerfil, updatePerfil, changePassword } = usePerfil();
  const { refreshUser } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [changePwForm, setChangePwForm] = useState<ChangePasswordPayload>(emptyPw);
  const [changePwErrors, setChangePwErrors] = useState<Partial<Record<keyof ChangePasswordPayload, string>>>({});

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  const handleEditProfile = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (!perfil) return;
    setSubmitLoading(true);
    const createData = data as CreateUserPayload;
    const email = createData.email ?? perfil.email;
    const ok = await updatePerfil(email, {
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.numeroPhone,
      usuario: createData.usuario ?? perfil.userName,
    });
    setSubmitLoading(false);
    if (ok) {
      toast.success('Perfil actualizado correctamente');
      setEditOpen(false);
      await refreshUser();
      await fetchPerfil();
    } else {
      toast.error('Error al actualizar', 'No se pudo actualizar el perfil.');
    }
  };

  const validateChangePw = (): boolean => {
    const e: Partial<Record<keyof ChangePasswordPayload, string>> = {};
    if (!changePwForm.passwordActual) e.passwordActual = 'Requerido';
    if (!changePwForm.passwordNueva) e.passwordNueva = 'Requerido';
    else if (changePwForm.passwordNueva.length < 6) e.passwordNueva = 'Mínimo 6 caracteres';
    if (!changePwForm.passwordConfirm) e.passwordConfirm = 'Requerido';
    else if (changePwForm.passwordNueva !== changePwForm.passwordConfirm) e.passwordConfirm = 'Las contraseñas no coinciden';
    setChangePwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (!perfil || !validateChangePw()) return;
    setSubmitLoading(true);
    const ok = await changePassword(changePwForm);
    setSubmitLoading(false);
    if (ok) {
      toast.success('Contraseña actualizada correctamente');
      setChangePwOpen(false);
      setChangePwForm(emptyPw);
    } else {
      toast.error('Error al cambiar contraseña', 'No se pudo cambiar la contraseña.');
    }
  };

  if (loading || !perfil) {
    const loadingContent = (
      <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6 text-center text-coffee-500">
        {loading ? 'Cargando perfil…' : 'No se encontró el perfil'}
      </div>
    );
    if (embedded) return loadingContent;
    return (
      <MainLayout>
        <PageContainer>
          <PageHeader
            title="Mi Perfil"
            subtitle="Tu información personal"
            breadcrumbs={[{ label: 'Configuración' }, { label: 'Mi Perfil' }]}
          />
          {loadingContent}
        </PageContainer>
      </MainLayout>
    );
  }

  const content = (
    <>
      <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-coffee-600">
                {perfil.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-coffee-900 text-base">
                {perfil.nombre} {perfil.apellido}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-coffee-100 text-coffee-700">
                  {ROL_LABEL[perfil.rol] ?? perfil.rol}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="bg-coffee-50 rounded-xl p-4">
              <p className="text-xs text-coffee-400 mb-1">Email</p>
              <p className="text-sm font-medium text-coffee-900">{perfil.email}</p>
            </div>
            <div className="bg-coffee-50 rounded-xl p-4">
              <p className="text-xs text-coffee-400 mb-1">Usuario</p>
              <p className="text-sm font-medium text-coffee-900">{perfil.userName || '—'}</p>
            </div>
            <div className="bg-coffee-50 rounded-xl p-4 sm:col-span-2">
              <p className="text-xs text-coffee-400 mb-1">Teléfono</p>
              <p className="text-sm font-medium text-coffee-900">{perfil.celular || '—'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setEditOpen(true)}
            >
              Editar información
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setChangePwOpen(true)}
            >
              Cambiar contraseña
            </Button>
          </div>
        </div>
      </div>

      <BottomSheet
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar Perfil"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={submitLoading}>
              Cancelar
            </Button>
          </div>
        }
      >
        <UserForm
          user={perfil}
          onSubmit={handleEditProfile}
          loading={submitLoading}
          showPasswordField={false}
          showRolField={false}
          emailEditable={true}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={changePwOpen}
        onClose={() => setChangePwOpen(false)}
        title="Cambiar contraseña"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setChangePwOpen(false)} disabled={submitLoading}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={submitLoading}>
              {submitLoading ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <PasswordInput
            label="Contraseña actual"
            placeholder="Ingrese su contraseña actual"
            value={changePwForm.passwordActual}
            onChange={(e) => setChangePwForm((f) => ({ ...f, passwordActual: e.target.value }))}
            error={changePwErrors.passwordActual}
            disabled={submitLoading}
          />
          <PasswordInput
            label="Nueva contraseña"
            placeholder="Mínimo 6 caracteres"
            value={changePwForm.passwordNueva}
            onChange={(e) => setChangePwForm((f) => ({ ...f, passwordNueva: e.target.value }))}
            error={changePwErrors.passwordNueva}
            disabled={submitLoading}
          />
          <PasswordInput
            label="Confirmar nueva contraseña"
            placeholder="Repita la nueva contraseña"
            value={changePwForm.passwordConfirm}
            onChange={(e) => setChangePwForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
            error={changePwErrors.passwordConfirm}
            disabled={submitLoading}
          />
        </div>
      </BottomSheet>
    </>
  );

  if (embedded) {
    return (
      <div className="max-w-md mx-auto">
        {content}
      </div>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Mi Perfil"
          subtitle="Tu información personal"
          breadcrumbs={[{ label: 'Configuración' }, { label: 'Mi Perfil' }]}
        />
        <div className="max-w-md mx-auto">
          {content}
        </div>
      </PageContainer>
    </MainLayout>
  );
};
