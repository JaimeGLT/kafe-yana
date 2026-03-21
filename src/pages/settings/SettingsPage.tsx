import React, { useState } from 'react';
import {
  Settings, Users, Shield, Building2,
  Plus, Edit2, Trash2, Eye, Check, X,
} from 'lucide-react';
import { MainLayout, PageHeader, PageContainer, PageSection } from '../../components/layout';
import {
  Button, Input, Select, Modal, ConfirmModal,
  Badge, StatusBadge, Tabs, TabPanel,
} from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { useSettingsStore } from '../../stores';
// ─── Types ────────────────────────────────────────────────────────────────────

interface UserForm {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  branchId: string;
  isActive: boolean;
}

interface BranchForm {
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const GeneralTab: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...settings });

  const handleSave = () => {
    updateSettings(form);
    setEditing(false);
    toast.success('Configuración guardada correctamente');
  };

  const handleCancel = () => {
    setForm({ ...settings });
    setEditing(false);
  };

  const Field: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-coffee-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-coffee-900 font-medium">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageSection
        title="Configuración General"
        description="Información principal de la empresa y preferencias del sistema"
        action={
          !editing ? (
            <Button size="sm" variant="outline" leftIcon={<Edit2 className="h-4 w-4" />} onClick={() => setEditing(true)}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" leftIcon={<X className="h-4 w-4" />} onClick={handleCancel}>
                Cancelar
              </Button>
              <Button size="sm" leftIcon={<Check className="h-4 w-4" />} onClick={handleSave}>
                Guardar
              </Button>
            </div>
          )
        }
      >
        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Field label="Nombre de la empresa" value={settings.companyName} />
            <Field label="RUC" value={settings.companyRuc} />
            <Field label="Dirección" value={settings.companyAddress} />
            <Field label="Teléfono" value={settings.companyPhone} />
            <Field label="Correo electrónico" value={settings.companyEmail} />
            <Field label="Moneda" value={`${settings.currency} (${settings.currencySymbol})`} />
            <Field label="Impuesto (%)" value={`${settings.taxPercentage}%`} />
            <Field label="Prefijo de factura" value={settings.invoicePrefix} />
            <Field label="Prefijo de cotización" value={settings.quotePrefix} />
            <Field label="Prefijo de orden de compra" value={settings.purchaseOrderPrefix} />
            <Field label="Días de crédito por defecto" value={`${settings.defaultPaymentTerms} días`} />
            <Field label="Umbral de stock bajo" value={settings.lowStockThreshold} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de la empresa"
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
            />
            <Input
              label="RUC"
              value={form.companyRuc ?? ''}
              onChange={e => setForm(f => ({ ...f, companyRuc: e.target.value }))}
            />
            <Input
              label="Dirección"
              value={form.companyAddress ?? ''}
              onChange={e => setForm(f => ({ ...f, companyAddress: e.target.value }))}
            />
            <Input
              label="Teléfono"
              value={form.companyPhone ?? ''}
              onChange={e => setForm(f => ({ ...f, companyPhone: e.target.value }))}
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.companyEmail ?? ''}
              onChange={e => setForm(f => ({ ...f, companyEmail: e.target.value }))}
            />
            <Input
              label="Impuesto (%)"
              type="number"
              value={form.taxPercentage}
              onChange={e => setForm(f => ({ ...f, taxPercentage: Number(e.target.value) }))}
            />
            <Input
              label="Prefijo de factura"
              value={form.invoicePrefix}
              onChange={e => setForm(f => ({ ...f, invoicePrefix: e.target.value }))}
            />
            <Input
              label="Prefijo de cotización"
              value={form.quotePrefix}
              onChange={e => setForm(f => ({ ...f, quotePrefix: e.target.value }))}
            />
            <Input
              label="Prefijo de orden de compra"
              value={form.purchaseOrderPrefix}
              onChange={e => setForm(f => ({ ...f, purchaseOrderPrefix: e.target.value }))}
            />
            <Input
              label="Días de crédito por defecto"
              type="number"
              value={form.defaultPaymentTerms}
              onChange={e => setForm(f => ({ ...f, defaultPaymentTerms: Number(e.target.value) }))}
            />
            <Input
              label="Umbral de stock bajo"
              type="number"
              value={form.lowStockThreshold}
              onChange={e => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
            />
          </div>
        )}
      </PageSection>
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab: React.FC = () => {
  const { users, roles, branches, addUser, updateUser, deleteUser } = useSettingsStore();

  const emptyForm: UserForm = {
    username: '', email: '', firstName: '', lastName: '',
    roleId: '', branchId: '', isActive: true,
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<UserForm>>({});

  const validate = (): boolean => {
    const e: Partial<UserForm> = {};
    if (!form.username.trim()) e.username = 'Requerido';
    if (!form.email.trim()) e.email = 'Requerido';
    if (!form.firstName.trim()) e.firstName = 'Requerido';
    if (!form.lastName.trim()) e.lastName = 'Requerido';
    if (!form.roleId) e.roleId = 'Seleccione un rol';
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
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setForm({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      branchId: user.branchId || '',
      isActive: user.isActive,
    });
    setEditingId(userId);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editingId) {
      updateUser(editingId, form);
      toast.success('Usuario actualizado correctamente');
    } else {
      addUser(form);
      toast.success('Usuario creado correctamente');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteUser(deleteId);
    setDeleteId(null);
    toast.success('Usuario eliminado');
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="Usuarios del Sistema"
        description="Gestión de cuentas de usuario y accesos"
        action={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nuevo Usuario
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-100">
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Usuario</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Rol</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Sucursal</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-coffee-400">No hay usuarios registrados</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-coffee-700">{u.username}</td>
                    <td className="py-3 px-4 font-medium text-coffee-900">{u.firstName} {u.lastName}</td>
                    <td className="py-3 px-4 text-coffee-600">{u.email}</td>
                    <td className="py-3 px-4 text-coffee-600">{u.roleName || u.roleId}</td>
                    <td className="py-3 px-4 text-coffee-600">{u.branchName || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(u.id)}
                          className="p-1 text-coffee-500 hover:text-coffee-700 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(u.id)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
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
      </PageSection>

      {/* User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre de usuario"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            error={errors.username}
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />
          <Input
            label="Nombres"
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            error={errors.firstName}
          />
          <Input
            label="Apellidos"
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            error={errors.lastName}
          />
          <Select
            label="Rol"
            value={form.roleId}
            onChange={v => setForm(f => ({ ...f, roleId: v }))}
            options={roles.map(r => ({ value: r.id, label: r.name }))}
            error={errors.roleId}
          />
          <Select
            label="Sucursal"
            value={form.branchId}
            onChange={v => setForm(f => ({ ...f, branchId: v }))}
            options={[
              { value: '', label: 'Sin sucursal asignada' },
              ...branches.map(b => ({ value: b.id, label: b.name })),
            ]}
          />
          <div className="sm:col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
              />
              <span className="text-sm text-coffee-700">Usuario activo</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message="¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

// ─── Roles Tab ────────────────────────────────────────────────────────────────

const RolesTab: React.FC = () => {
  const { roles } = useSettingsStore();
  const [permissionsModal, setPermissionsModal] = useState<{ open: boolean; roleId: string | null }>({ open: false, roleId: null });

  const selectedRole = roles.find(r => r.id === permissionsModal.roleId);

  return (
    <div className="space-y-6">
      <PageSection
        title="Roles del Sistema"
        description="Roles y permisos disponibles en el sistema"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-100">
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Descripción</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Permisos</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Sistema</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-coffee-400">No hay roles configurados</td>
                </tr>
              ) : (
                roles.map(role => (
                  <tr key={role.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-coffee-900">{role.name}</td>
                    <td className="py-3 px-4 text-coffee-600">{role.description || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="info">{role.permissions.length} permisos</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {role.isSystem ? (
                        <Badge variant="warning">Sistema</Badge>
                      ) : (
                        <Badge variant="default">Personalizado</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setPermissionsModal({ open: true, roleId: role.id })}
                        className="p-1 text-coffee-500 hover:text-coffee-700 transition-colors"
                        title="Ver permisos"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* Permissions Modal */}
      <Modal
        isOpen={permissionsModal.open}
        onClose={() => setPermissionsModal({ open: false, roleId: null })}
        title={selectedRole ? `Permisos: ${selectedRole.name}` : 'Permisos'}
        size="md"
      >
        {selectedRole && (
          <div className="space-y-3">
            <p className="text-sm text-coffee-600 mb-4">{selectedRole.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {selectedRole.permissions.map((perm, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1.5 px-3 bg-coffee-50 rounded-lg">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-xs text-coffee-700 font-mono">{perm}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ─── Branches Tab ─────────────────────────────────────────────────────────────

const BranchesTab: React.FC = () => {
  const { branches, addBranch, updateBranch, deleteBranch } = useSettingsStore();

  const emptyForm: BranchForm = {
    code: '', name: '', address: '', phone: '', email: '', isActive: true,
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<BranchForm>>({});

  const validate = (): boolean => {
    const e: Partial<BranchForm> = {};
    if (!form.code.trim()) e.code = 'Requerido';
    if (!form.name.trim()) e.name = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    setForm({
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive,
    });
    setEditingId(branchId);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editingId) {
      updateBranch(editingId, form);
      toast.success('Sucursal actualizada correctamente');
    } else {
      addBranch(form);
      toast.success('Sucursal creada correctamente');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteBranch(deleteId);
    setDeleteId(null);
    toast.success('Sucursal eliminada');
  };

  return (
    <div className="space-y-6">
      <PageSection
        title="Sucursales"
        description="Gestión de ubicaciones y puntos de venta"
        action={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Nueva Sucursal
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-100">
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Código</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Dirección</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Teléfono</th>
                <th className="text-left py-3 px-4 font-semibold text-coffee-700">Email</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
                <th className="text-center py-3 px-4 font-semibold text-coffee-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-coffee-400">No hay sucursales registradas</td>
                </tr>
              ) : (
                branches.map(b => (
                  <tr key={b.id} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-coffee-600">{b.code}</td>
                    <td className="py-3 px-4 font-medium text-coffee-900">{b.name}</td>
                    <td className="py-3 px-4 text-coffee-600">{b.address || '—'}</td>
                    <td className="py-3 px-4 text-coffee-600">{b.phone || '—'}</td>
                    <td className="py-3 px-4 text-coffee-600">{b.email || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={b.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(b.id)}
                          className="p-1 text-coffee-500 hover:text-coffee-700 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(b.id)}
                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
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
      </PageSection>

      {/* Branch Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Guardar Cambios' : 'Crear Sucursal'}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Código"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            error={errors.code}
          />
          <Input
            label="Nombre"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors.name}
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <div className="flex items-center gap-3 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
              />
              <span className="text-sm text-coffee-700">Sucursal activa</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar Sucursal"
        message="¿Está seguro de que desea eliminar esta sucursal? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
  { id: 'usuarios', label: 'Usuarios', icon: <Users className="h-4 w-4" /> },
  { id: 'roles', label: 'Roles', icon: <Shield className="h-4 w-4" /> },
  { id: 'sucursales', label: 'Sucursales', icon: <Building2 className="h-4 w-4" /> },
];

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Configuración"
          subtitle="Administra los parámetros del sistema, usuarios, roles y sucursales"
          breadcrumbs={[{ label: 'Configuración' }]}
        />

        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          <div className="border-b border-coffee-100 px-6 pt-4">
            <Tabs
              tabs={TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="default"
            />
          </div>

          <div className="p-6">
            <TabPanel isActive={activeTab === 'general'}>
              <GeneralTab />
            </TabPanel>
            <TabPanel isActive={activeTab === 'usuarios'}>
              <UsersTab />
            </TabPanel>
            <TabPanel isActive={activeTab === 'roles'}>
              <RolesTab />
            </TabPanel>
            <TabPanel isActive={activeTab === 'sucursales'}>
              <BranchesTab />
            </TabPanel>
          </div>
        </div>
      </PageContainer>
    </MainLayout>
  );
};

export default SettingsPage;
