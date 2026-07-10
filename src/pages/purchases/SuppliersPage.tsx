import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail, Users } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Modal, ConfirmModal } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { SupplierModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { useSuppliersPage } from '../../hooks/useSuppliersPage';
import { usePagination } from '../../hooks/usePagination';
import type { Supplier, SupplierInput } from '../../types';

const AVATAR_COLORS = [
  'bg-coffee-200 text-coffee-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

function avatarColor(id: string | number) {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export const SuppliersPage: React.FC = () => {
  const { page, pageSize, setPage, setPageSize, resetPage } = usePagination({ pageSize: 15 });

  const { proveedores, totalCount, isLoading, refresh } = useSuppliersPage({
    page,
    pageSize,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Búsqueda client-side (filtra proveedores ya cargados por nombre, RUC, etc.).
  // El servidor no recibe el término — la paginación ocurre antes del filtro.
  const [search, setSearchLocal] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return proveedores.filter(
      (s) =>
        s.razon_Social.toLowerCase().includes(q) ||
        (s.dni || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        s.telefono.includes(q) ||
        (s.celular || '').includes(q)
    );
  }, [proveedores, search]);

  const openCreate = () => { setEditingSupplier(undefined); setIsModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditingSupplier(s); setIsModalOpen(true); };
  const openDelete = (s: Supplier) => { setDeletingSupplier(s); setIsDeleteOpen(true); };
  const openDetail = (s: Supplier) => { setViewingSupplier(s); setIsDetailOpen(true); };

  const handleSaveSupplier = async (input: SupplierInput, isEdit: boolean, supplierId?: string) => {
    if (isEdit && supplierId) {
      await api.put(`/Proveedor/${supplierId}`, input);
      toast.success('Proveedor actualizado', `${input.razon_Social} fue actualizado.`);
    } else {
      await api.post('/Proveedor', input);
      toast.success('Proveedor creado', `${input.razon_Social} fue registrado.`);
    }
    refresh();
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setIsProcessing(true);
    try {
      await api.delete(`/Proveedor/${deletingSupplier.id}`);
      toast.success('Proveedor eliminado', `${deletingSupplier.razon_Social} fue eliminado.`);
      refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el proveedor.';
      toast.error('Error', message);
    } finally {
      setIsDeleteOpen(false);
      setDeletingSupplier(null);
      setIsProcessing(false);
    }
  };

  const activeCount = proveedores.filter((s) => s.isActive).length;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Proveedores"
          subtitle="Gestiona los proveedores registrados en el sistema"
          actions={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nuevo Proveedor
            </Button>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-coffee-100 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-coffee-600" />
            </div>
            <div>
              <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-coffee-900">{totalCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Activos</p>
              <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4 flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide">Con email</p>
              <p className="text-2xl font-bold text-amber-600">{proveedores.filter((s) => s.email).length}</p>
            </div>
          </div>
        </div>

        {/* Search + count */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUC, email, teléfono..."
              value={search}
              onChange={(e) => { setSearchLocal(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-coffee-500 bg-white border border-coffee-100 rounded-lg px-3 py-2">
            <Building2 className="h-4 w-4" />
            {filteredSuppliers.length} proveedor{filteredSuppliers.length !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Table / empty */}
        {filteredSuppliers.length === 0 && !isLoading ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm flex flex-col items-center justify-center py-16 text-coffee-400">
            <Building2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium text-coffee-600">
              {search ? 'Sin resultados para la búsqueda' : 'Sin proveedores registrados'}
            </p>
            {!search && (
              <p className="text-sm mt-1">Agrega tu primer proveedor para empezar.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-coffee-100">
              <thead className="bg-coffee-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Proveedor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">N° Doc.</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Contacto</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-coffee-500 uppercase tracking-wide">Dirección</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3.5"><div className="h-4 w-32 bg-coffee-100 rounded animate-pulse" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-20 bg-coffee-100 rounded animate-pulse" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-28 bg-coffee-100 rounded animate-pulse" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-32 bg-coffee-100 rounded animate-pulse" /></td>
                      <td className="px-5 py-3.5"><div className="h-4 w-12 bg-coffee-100 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-coffee-400">
                      No hay proveedores registrados
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-coffee-50/60 transition-colors cursor-pointer"
                      onClick={() => openDetail(supplier)}
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${avatarColor(supplier.id)}`}>
                            {supplier.razon_Social.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-coffee-900 text-sm">{supplier.razon_Social}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-coffee-600">
                        {supplier.dni || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm text-coffee-700">
                            <Phone className="h-3.5 w-3.5 text-coffee-400" />
                            {supplier.telefono}
                          </div>
                          {supplier.email && (
                            <div className="flex items-center gap-1.5 text-xs text-coffee-500">
                              <Mail className="h-3 w-3 text-coffee-400" />
                              {supplier.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-coffee-600 max-w-[200px] truncate">
                        {supplier.direccion || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(supplier)}
                            className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-400 hover:text-coffee-700 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDelete(supplier)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-coffee-400 hover:text-red-500 transition-colors"
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

            <Pagination
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* SupplierModal */}
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingSupplier(undefined); }}
          supplier={editingSupplier}
          onSave={handleSaveSupplier}
          onSuccess={() => { setIsModalOpen(false); setEditingSupplier(undefined); }}
        />

        {/* Delete Confirm */}
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Eliminar Proveedor"
          message={`¿Estás seguro de que deseas eliminar a "${deletingSupplier?.razon_Social}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={isProcessing}
        />

        {/* Detail Modal */}
        {viewingSupplier && (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            title=""
            size="md"
          >
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-coffee-100">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${avatarColor(viewingSupplier.id)}`}>
                  {viewingSupplier.razon_Social.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-coffee-900 text-lg leading-tight">{viewingSupplier.razon_Social}</p>
                  {viewingSupplier.isActive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 mt-1">Activo</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 mt-1">Inactivo</span>
                  )}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewingSupplier.dni && (
                  <div>
                    <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide mb-1">N° Documento</p>
                    <p className="font-semibold text-coffee-900">{viewingSupplier.dni}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide mb-1">Teléfono</p>
                  <p className="font-semibold text-coffee-900 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-coffee-400" />
                    {viewingSupplier.telefono}
                  </p>
                </div>
                {viewingSupplier.celular && (
                  <div>
                    <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide mb-1">Celular</p>
                    <p className="font-semibold text-coffee-900">{viewingSupplier.celular}</p>
                  </div>
                )}
                {viewingSupplier.email && (
                  <div>
                    <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide mb-1">Email</p>
                    <p className="font-semibold text-coffee-900 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-coffee-400" />
                      {viewingSupplier.email}
                    </p>
                  </div>
                )}
                {viewingSupplier.direccion && (
                  <div className="col-span-2">
                    <p className="text-xs text-coffee-400 font-medium uppercase tracking-wide mb-1">Dirección</p>
                    <p className="font-semibold text-coffee-900">{viewingSupplier.direccion}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  leftIcon={<Edit2 className="h-4 w-4" />}
                  onClick={() => { setIsDetailOpen(false); openEdit(viewingSupplier); }}
                >
                  Editar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </PageContainer>
    </MainLayout>
  );
};