import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal, ConfirmModal } from '../../components/ui';
import { SupplierModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils';
import type { Supplier } from '../../types';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await api.get<Supplier[]>('/Supplier');
      setSuppliers(data);
    } catch {
      toast.error('Error', 'No se pudieron cargar los proveedores.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.ruc || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.mobile || '').includes(q) ||
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

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setIsProcessing(true);
    try {
      await api.delete(`/Supplier/${deletingSupplier.id}`);
      toast.success('Proveedor eliminado', `${deletingSupplier.name} fue eliminado.`);
      setIsDeleteOpen(false);
      setDeletingSupplier(null);
      await loadSuppliers();
    } catch {
      toast.error('Error', 'No se pudo eliminar el proveedor.');
    } finally {
      setIsProcessing(false);
    }
  };

  const COLUMNS = ['Código', 'Razón Social', 'N° Documento', 'Teléfono', 'Dirección', 'Email', 'Celular', ''];

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
              placeholder="Buscar por nombre, RUC, email, teléfono..."
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
                  {COLUMNS.map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-coffee-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-6 py-10 text-center text-coffee-400">
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
                          <p className="font-medium text-coffee-900">{supplier.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        {supplier.ruc || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-coffee-400" />
                          {supplier.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600 max-w-[180px] truncate">
                        {supplier.address || <span className="text-coffee-300">—</span>}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        {supplier.mobile || <span className="text-coffee-300">—</span>}
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
          onSuccess={() => { setIsModalOpen(false); setEditingSupplier(undefined); loadSuppliers(); }}
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
          isLoading={isProcessing}
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
                <div className="h-14 w-14 rounded-full bg-coffee-100 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-coffee-500" />
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900 text-lg">{viewingSupplier.name}</p>
                  <p className="text-sm font-mono text-coffee-400">{viewingSupplier.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewingSupplier.ruc && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">N° Documento</p>
                    <p className="font-medium text-coffee-900">{viewingSupplier.ruc}</p>
                  </div>
                )}
                <div>
                  <p className="text-coffee-500 mb-0.5">Teléfono</p>
                  <p className="font-medium text-coffee-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-coffee-400" />
                    {viewingSupplier.phone}
                  </p>
                </div>
                {viewingSupplier.mobile && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Celular</p>
                    <p className="font-medium text-coffee-900">{viewingSupplier.mobile}</p>
                  </div>
                )}
                {viewingSupplier.email && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Email</p>
                    <p className="font-medium text-coffee-900 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-coffee-400" />
                      {viewingSupplier.email}
                    </p>
                  </div>
                )}
                {viewingSupplier.address && (
                  <div className="col-span-2">
                    <p className="text-coffee-500 mb-0.5">Dirección</p>
                    <p className="font-medium text-coffee-900">{viewingSupplier.address}</p>
                  </div>
                )}
              </div>

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
