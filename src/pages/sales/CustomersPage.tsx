import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, Calendar, Star } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal, ConfirmModal, SkeletonRow } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { CustomerModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomersPage } from '../../hooks/useCustomersPage';
import { usePagination } from '../../hooks/usePagination';
import type { Customer, CustomerInput } from '../../types';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol?.toLowerCase() === 'admin';
  const { page, pageSize, search, debouncedSearch, setPage, setPageSize, setSearch } = usePagination({ pageSize: 15 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const { clientes, isLoading, refresh, totalCount } = useCustomersPage({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const filteredCustomers = clientes;

  const openCreate = () => {
    setEditingCustomer(undefined);
    setIsModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const openDelete = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteOpen(true);
  };

  const openDetail = (customer: Customer) => {
    setViewingCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await api.delete(`/Cliente/${deletingCustomer.id}`);
      toast.success('Cliente eliminado', `${deletingCustomer.nombre} fue eliminado.`);
      refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el cliente.';
      toast.error('Error', message);
    }
    setIsDeleteOpen(false);
    setDeletingCustomer(null);
  };

  const handleModalSuccess = () => {
    refresh();
    setIsModalOpen(false);
    setEditingCustomer(undefined);
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Clientes"
          subtitle="Gestiona los clientes registrados en el sistema"
          actions={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nuevo Cliente
            </Button>
          }
        />

        {/* Search */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email, teléfono, DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>
        </div>

        {/* Table */}
        <PageSection>
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">

            {/* ── Mobile: lista nombre + puntos ───────────────────────── */}
            <div className="sm:hidden divide-y divide-coffee-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-coffee-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-coffee-200 rounded" />
                      <div className="h-3 w-16 bg-coffee-100 rounded" />
                    </div>
                    <div className="h-5 w-12 bg-coffee-100 rounded" />
                  </div>
                ))
              ) : filteredCustomers.length === 0 ? (
                <div className="py-10 text-center text-coffee-400 text-sm">No hay clientes registrados</div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => openDetail(customer)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-coffee-50/60 active:bg-coffee-100 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-coffee-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-coffee-900 truncate">{customer.nombre}</p>
                      <p className="text-xs text-coffee-400 mt-0.5">{customer.celular}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      <span className="font-semibold text-coffee-900 text-sm">{customer.puntos}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* ── Desktop: tabla completa ──────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-coffee-200">
                <thead className="bg-coffee-50">
                  <tr>
                    {['Nombre', 'Teléfono', 'Email', 'DNI', 'F. Nacimiento', 'Puntos', 'Estado', ''].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-coffee-100">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-coffee-400">No hay clientes registrados</td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-coffee-50 transition-colors cursor-pointer" onClick={() => openDetail(customer)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-coffee-500" />
                            </div>
                            <span className="font-medium text-coffee-900">{customer.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                          <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-coffee-400" />{customer.celular}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                          {customer.correo
                            ? <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-coffee-400" />{customer.correo}</div>
                            : <span className="text-coffee-300">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                          {customer.dni || <span className="text-coffee-300">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                          {customer.fecha_nacimiento
                            ? <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-coffee-400" />{formatDate(customer.fecha_nacimiento)}</div>
                            : <span className="text-coffee-300">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" /><span className="font-semibold text-coffee-900">{customer.puntos}</span></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={customer.estado ? 'success' : 'default'}>{customer.estado ? 'Activo' : 'Inactivo'}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(customer)} className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {isAdmin && (
                              <button onClick={() => openDelete(customer)} className="p-1.5 rounded-lg hover:bg-red-100 text-coffee-400 hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </PageSection>

        <Pagination
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
        />

        {/* CustomerModal for create/edit */}
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingCustomer(undefined); }}
          customer={editingCustomer}
          onSuccess={handleModalSuccess}
          onSave={async (input: CustomerInput, isEdit: boolean, customerId?: string) => {
            if (isEdit && customerId) {
              await api.put<Customer>(`/Cliente/${customerId}`, input);
            } else {
              await api.post<Customer>('/Cliente', input);
            }
          }}
        />

        {/* Delete Confirm */}
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Eliminar Cliente"
          message={`¿Estás seguro de que deseas eliminar a "${deletingCustomer?.nombre}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
        />

        {/* Detail Modal */}
        {viewingCustomer && (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            title={viewingCustomer.nombre}
            size="lg"
            bottomSheet
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-coffee-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-coffee-500" />
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900 text-lg">{viewingCustomer.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={viewingCustomer.estado ? 'success' : 'default'} size="sm">
                      {viewingCustomer.estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500 mb-0.5">Teléfono</p>
                  <p className="font-medium text-coffee-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-coffee-400" />
                    {viewingCustomer.celular}
                  </p>
                </div>
                {viewingCustomer.correo && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Email</p>
                    <p className="font-medium text-coffee-900 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-coffee-400" />
                      {viewingCustomer.correo}
                    </p>
                  </div>
                )}
                {viewingCustomer.dni && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">DNI</p>
                    <p className="font-medium text-coffee-900">{viewingCustomer.dni}</p>
                  </div>
                )}
                {viewingCustomer.fecha_nacimiento && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Fecha de nacimiento</p>
                    <p className="font-medium text-coffee-900 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-coffee-400" />
                      {formatDate(viewingCustomer.fecha_nacimiento)}
                    </p>
                  </div>
                )}
                {viewingCustomer.direccion && (
                  <div className="col-span-2">
                    <p className="text-coffee-500 mb-0.5">Dirección</p>
                    <p className="font-medium text-coffee-900">{viewingCustomer.direccion}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  leftIcon={<Edit2 className="h-4 w-4" />}
                  onClick={() => {
                    setIsDetailOpen(false);
                    openEdit(viewingCustomer);
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
