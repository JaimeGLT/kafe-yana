import React from 'react';
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail, Globe } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal, ConfirmModal } from '../../components/ui';
import { SupplierModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { usePurchasesStore } from '../../stores';
import { formatCurrency, formatDate } from '../../utils';
import type { Supplier } from '../../types';

export const SuppliersPage: React.FC = () => {
  const { suppliers, deleteSupplier } = usePurchasesStore();

  const [search, setSearch] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = React.useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = React.useState<Supplier | null>(null);

  const filteredSuppliers = React.useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactName || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.code.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openCreate = () => {
    setEditingSupplier(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const openDelete = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setIsDeleteOpen(true);
  };

  const openDetail = (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setIsDetailOpen(true);
  };

  const handleDelete = () => {
    if (!deletingSupplier) return;
    deleteSupplier(deletingSupplier.id);
    toast.success('Proveedor eliminado', `${deletingSupplier.name} fue eliminado.`);
    setIsDeleteOpen(false);
    setDeletingSupplier(null);
  };

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

        {/* Search */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
        </div>

        {/* Table */}
        <PageSection>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Código', 'Proveedor', 'Contacto', 'Teléfono', 'Email', 'Total Compras', 'Deuda Actual', 'Estado', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-coffee-400">
                      No hay proveedores registrados
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-coffee-50 transition-colors cursor-pointer"
                      onClick={() => openDetail(supplier)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-coffee-500">{supplier.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-coffee-500" />
                          </div>
                          <div>
                            <p className="font-medium text-coffee-900">{supplier.name}</p>
                            {supplier.ruc && (
                              <p className="text-xs text-coffee-400">RUC: {supplier.ruc}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        {supplier.contactName || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-coffee-400" />
                          {supplier.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                        {supplier.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-coffee-400" />
                            {supplier.email}
                          </div>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-coffee-900">
                        {formatCurrency(supplier.totalPurchases)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={
                            supplier.currentDebt > 0
                              ? 'font-semibold text-red-600'
                              : 'text-coffee-400'
                          }
                        >
                          {formatCurrency(supplier.currentDebt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={supplier.isActive ? 'success' : 'default'}>
                          {supplier.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(supplier)}
                            className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDelete(supplier)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-coffee-400 hover:text-red-500"
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

        {/* SupplierModal for create/edit */}
        <SupplierModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingSupplier(undefined); }}
          supplier={editingSupplier}
          onSuccess={() => { setIsModalOpen(false); setEditingSupplier(undefined); }}
        />

        {/* Delete Confirm */}
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Eliminar Proveedor"
          message={`¿Estás seguro de que deseas eliminar a "${deletingSupplier?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
        />

        {/* Detail Modal */}
        {viewingSupplier && (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            title={viewingSupplier.name}
            size="md"
          >
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-coffee-100 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-coffee-500" />
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900 text-lg">{viewingSupplier.name}</p>
                  <p className="text-sm text-coffee-500">{viewingSupplier.code}</p>
                  <Badge variant={viewingSupplier.isActive ? 'success' : 'default'} size="sm">
                    {viewingSupplier.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewingSupplier.contactName && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Contacto</p>
                    <p className="font-medium text-coffee-900">{viewingSupplier.contactName}</p>
                  </div>
                )}
                <div>
                  <p className="text-coffee-500 mb-0.5">Teléfono</p>
                  <p className="font-medium text-coffee-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-coffee-400" />
                    {viewingSupplier.phone}
                  </p>
                </div>
                {viewingSupplier.email && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Email</p>
                    <p className="font-medium text-coffee-900 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-coffee-400" />
                      {viewingSupplier.email}
                    </p>
                  </div>
                )}
                {viewingSupplier.ruc && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">RUC</p>
                    <p className="font-medium text-coffee-900">{viewingSupplier.ruc}</p>
                  </div>
                )}
                {viewingSupplier.website && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Sitio Web</p>
                    <a
                      href={viewingSupplier.website}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-coffee-500 hover:text-coffee-700 flex items-center gap-1"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {viewingSupplier.website}
                    </a>
                  </div>
                )}
                {viewingSupplier.paymentTerms && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Términos de Pago</p>
                    <p className="font-medium text-coffee-900">{viewingSupplier.paymentTerms}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-coffee-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-coffee-500 uppercase tracking-wider mb-1">Total Compras</p>
                  <p className="text-xl font-display font-bold text-coffee-900">
                    {formatCurrency(viewingSupplier.totalPurchases)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-coffee-500 uppercase tracking-wider mb-1">Deuda Actual</p>
                  <p
                    className={`text-xl font-display font-bold ${
                      viewingSupplier.currentDebt > 0 ? 'text-red-600' : 'text-coffee-400'
                    }`}
                  >
                    {formatCurrency(viewingSupplier.currentDebt)}
                  </p>
                </div>
              </div>

              {viewingSupplier.lastPurchaseDate && (
                <p className="text-sm text-coffee-500">
                  Última compra:{' '}
                  <span className="font-medium text-coffee-700">
                    {formatDate(viewingSupplier.lastPurchaseDate)}
                  </span>
                </p>
              )}

              {viewingSupplier.notes && (
                <div className="bg-coffee-50 rounded-lg p-3">
                  <p className="text-xs text-coffee-500 mb-1">Notas</p>
                  <p className="text-sm text-coffee-700">{viewingSupplier.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  leftIcon={<Edit2 className="h-4 w-4" />}
                  onClick={() => {
                    setIsDetailOpen(false);
                    openEdit(viewingSupplier);
                  }}
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
