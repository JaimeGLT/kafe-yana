import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, CreditCard, Calendar } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal, ConfirmModal } from '../../components/ui';
import { CustomerModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils';
import type { Customer, CustomerInput } from '../../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [_isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<Customer[]>('/clientes');
        setCustomers(data);
      } catch {
        toast.error('Error', 'No se pudieron cargar los clientes.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await api.delete(`/clientes/${id}`);
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [customers, search]);

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
      await deleteCustomer(deletingCustomer.id);
      toast.success('Cliente eliminado', `${deletingCustomer.name} fue eliminado.`);
    } catch {
      toast.error('Error', 'No se pudo eliminar el cliente.');
    }
    setIsDeleteOpen(false);
    setDeletingCustomer(null);
  };

  const handleModalSuccess = () => {
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
              placeholder="Buscar por nombre, email, teléfono..."
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
                  {['Código', 'Nombre', 'Teléfono', 'Email', 'F. Nacimiento', 'Total Compras', 'Estado', ''].map((h) => (
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
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-coffee-400">
                      No hay clientes registrados
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-coffee-50 transition-colors cursor-pointer"
                      onClick={() => openDetail(customer)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-coffee-500">{customer.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-coffee-500" />
                          </div>
                          <span className="font-medium text-coffee-900">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-coffee-400" />
                          {customer.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                        {customer.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-coffee-400" />
                            {customer.email}
                          </div>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                        {customer.birthDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-coffee-400" />
                            {formatDate(customer.birthDate)}
                          </div>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-coffee-900">
                          {formatCurrency(customer.totalPurchases)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={customer.isActive ? 'success' : 'default'}>
                          {customer.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(customer)}
                            className="p-1.5 rounded-lg hover:bg-coffee-100 text-coffee-500 hover:text-coffee-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDelete(customer)}
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

        {/* CustomerModal for create/edit */}
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingCustomer(undefined); }}
          customer={editingCustomer}
          onSuccess={handleModalSuccess}
          onSave={async (input: CustomerInput, isEdit: boolean, customerId?: string) => {
            if (isEdit && customerId) {
              const updated = await api.put<Customer>(`/clientes/${customerId}`, input);
              setCustomers(prev => prev.map(c => c.id === customerId ? updated : c));
            } else {
              const created = await api.post<Customer>('/clientes', input);
              setCustomers(prev => [...prev, created]);
            }
          }}
        />

        {/* Delete Confirm */}
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDelete}
          title="Eliminar Cliente"
          message={`¿Estás seguro de que deseas eliminar a "${deletingCustomer?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
        />

        {/* Detail Modal */}
        {viewingCustomer && (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            title={viewingCustomer.name}
            size="md"
          >
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-coffee-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-coffee-500" />
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900 text-lg">{viewingCustomer.name}</p>
                  <p className="text-sm text-coffee-500">{viewingCustomer.code}</p>
                  <Badge variant={viewingCustomer.isActive ? 'success' : 'default'} size="sm">
                    {viewingCustomer.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500 mb-0.5">Teléfono</p>
                  <p className="font-medium text-coffee-900 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-coffee-400" />
                    {viewingCustomer.phone}
                  </p>
                </div>
                {viewingCustomer.email && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Email</p>
                    <p className="font-medium text-coffee-900 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-coffee-400" />
                      {viewingCustomer.email}
                    </p>
                  </div>
                )}
                {viewingCustomer.ruc && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">RUC / DNI</p>
                    <p className="font-medium text-coffee-900">{viewingCustomer.ruc}</p>
                  </div>
                )}
                {viewingCustomer.birthDate && (
                  <div>
                    <p className="text-coffee-500 mb-0.5">Fecha de nacimiento</p>
                    <p className="font-medium text-coffee-900 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-coffee-400" />
                      {formatDate(viewingCustomer.birthDate)}
                    </p>
                  </div>
                )}
                {viewingCustomer.address && (
                  <div className="col-span-2">
                    <p className="text-coffee-500 mb-0.5">Dirección</p>
                    <p className="font-medium text-coffee-900">{viewingCustomer.address}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 bg-coffee-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-coffee-500 uppercase tracking-wider mb-1">Total Compras</p>
                  <p className="text-xl font-display font-bold text-coffee-900">
                    {formatCurrency(viewingCustomer.totalPurchases)}
                  </p>
                </div>
                {viewingCustomer.creditLimit && viewingCustomer.creditLimit > 0 && (
                  <div>
                    <p className="text-xs text-coffee-500 uppercase tracking-wider mb-1">
                      Crédito Disponible
                    </p>
                    <p className="text-xl font-display font-bold text-coffee-900">
                      {formatCurrency(
                        viewingCustomer.creditLimit - (viewingCustomer.currentCredit || 0)
                      )}
                    </p>
                    <p className="text-xs text-coffee-400 flex items-center gap-1 mt-0.5">
                      <CreditCard className="h-3 w-3" />
                      Límite: {formatCurrency(viewingCustomer.creditLimit)}
                    </p>
                  </div>
                )}
              </div>

              {viewingCustomer.lastPurchaseDate && (
                <p className="text-sm text-coffee-500">
                  Última compra:{' '}
                  <span className="font-medium text-coffee-700">
                    {formatDate(viewingCustomer.lastPurchaseDate)}
                  </span>
                </p>
              )}

              {viewingCustomer.notes && (
                <div className="bg-coffee-50 rounded-lg p-3">
                  <p className="text-xs text-coffee-500 mb-1">Notas</p>
                  <p className="text-sm text-coffee-700">{viewingCustomer.notes}</p>
                </div>
              )}

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
