import React, { useState, useEffect } from 'react';
import { Plus, User as UserIcon, Users, QrCode } from 'lucide-react';
import { MainLayout, PageHeader, PageContainer } from '../../components/layout';
import { Button, ConfirmModal, BottomSheet, UserDetailSheet, Tabs } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { useUsuarios } from '../../hooks/useUsuarios';
import type { CreateUserPayload } from '../../hooks/useUsuarios';
import { UserTable } from '../../components/settings/UserTable';
import { UserForm } from '../../components/settings/UserForm';
import { SkeletonUserTable } from '../../components/settings/SkeletonUserTable';
import { SettingsProfilePage } from './SettingsProfilePage';
import { SettingsQRPage } from './SettingsQRPage';
import type { User } from '../../types/user';

type TabId = 'mi-cuenta' | 'usuarios' | 'qr';

export const SettingsUsersPage: React.FC = () => {
  const { usuarios, loading, fetchUsuarios, createUsuario, deleteUsuario, blockUsuario, unblockUsuario } = useUsuarios();

  const [createOpen, setCreateOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [blockTarget, setBlockTarget] = useState<{ user: User; action: 'bloquear' | 'desbloquear' } | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('mi-cuenta');

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleCreate = async (data: CreateUserPayload) => {
    setSubmitLoading(true);
    const err = await createUsuario(data);
    setSubmitLoading(false);
    if (!err) {
      toast.success('Usuario creado correctamente');
      setCreateOpen(false);
      await fetchUsuarios();
    } else {
      toast.error('Error al crear', err);
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockTarget) return;
    const { user, action } = blockTarget;
    setBlockLoading(true);
    const err = action === 'bloquear' ? await blockUsuario(user.email) : await unblockUsuario(user.email);
    setBlockLoading(false);
    if (!err) {
      toast.success(action === 'bloquear' ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      setBlockTarget(null);
      await fetchUsuarios();
    } else {
      toast.error('Error', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    const err = await deleteUsuario(deleteUser.email);
    setDeleteLoading(false);
    if (!err) {
      toast.success('Usuario eliminado');
      setDeleteUser(null);
      await fetchUsuarios();
    } else {
      toast.error('Error al eliminar', err);
    }
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Configuración"
          subtitle="Gestión de usuarios del sistema"
          breadcrumbs={[{ label: 'Configuración' }, { label: 'Usuarios' }]}
        />

        <Tabs
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
          tabs={[
            { id: 'mi-cuenta', label: 'Mi Cuenta', icon: <UserIcon className="h-4 w-4" /> },
            { id: 'usuarios', label: 'Usuarios', icon: <Users className="h-4 w-4" /> },
            { id: 'qr', label: 'QR Pago', icon: <QrCode className="h-4 w-4" /> },
          ]}
        />

        {activeTab === 'mi-cuenta' ? (
          <SettingsProfilePage embedded />
        ) : activeTab === 'qr' ? (
          <SettingsQRPage />
        ) : (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex justify-end mb-6">
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Agregar Usuario
                </Button>
              </div>

              {loading ? (
                <SkeletonUserTable />
              ) : (
                <UserTable
                  usuarios={usuarios}
                  onDelete={setDeleteUser}
                  onToggleBlock={(u) => setBlockTarget({ user: u, action: u.estado ? 'desbloquear' : 'bloquear' })}
                  onViewDetail={setDetailUser}
                />
              )}
            </div>
          </div>
        )}

        <BottomSheet
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Agregar Usuario"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={submitLoading}>
                Cancelar
              </Button>
            </div>
          }
        >
          <UserForm onSubmit={(data) => handleCreate(data as CreateUserPayload)} loading={submitLoading} />
        </BottomSheet>

        <UserDetailSheet
          isOpen={!!detailUser}
          onClose={() => setDetailUser(null)}
          user={detailUser!}
          currentUserEmail={undefined}
          onDelete={(u) => setDeleteUser(u)}
          onToggleBlock={(u) => setBlockTarget({ user: u, action: u.estado ? 'desbloquear' : 'bloquear' })}
        />

        <ConfirmModal
          isOpen={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDelete}
          title="Eliminar Usuario"
          message={`¿Está seguro de que desea eliminar a ${deleteUser?.nombre}? Esta acción no se puede deshacer.`}
          confirmText={deleteLoading ? 'Eliminando…' : 'Eliminar'}
          variant="danger"
        />

        <ConfirmModal
          isOpen={!!blockTarget}
          onClose={() => setBlockTarget(null)}
          onConfirm={handleConfirmBlock}
          title={blockTarget?.action === 'bloquear' ? 'Bloquear usuario' : 'Desbloquear usuario'}
          message={
            blockTarget?.action === 'bloquear'
              ? `¿Bloquear a ${blockTarget.user.nombre}? No podrá iniciar sesión hasta que sea desbloqueado.`
              : `¿Desbloquear a ${blockTarget?.user.nombre}? Podrá volver a iniciar sesión.`
          }
          confirmText={blockLoading ? 'Procesando…' : blockTarget?.action === 'bloquear' ? 'Bloquear' : 'Desbloquear'}
          variant={blockTarget?.action === 'bloquear' ? 'danger' : 'info'}
        />
      </PageContainer>
    </MainLayout>
  );
};
