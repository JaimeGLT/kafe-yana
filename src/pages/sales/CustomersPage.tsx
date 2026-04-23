import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, Calendar, Star, Gift, CheckCircle, Clock } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer, PageSection } from '../../components/layout';
import { Button, Badge, Modal, ConfirmModal, SkeletonRow } from '../../components/ui';
import { CustomerModal } from '../../components/modals';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_CLIENTES } from '../../lib/queries/clientes.queries';
import { formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import type { Customer, CustomerInput } from '../../types';

interface RewardOption {
  id: string;
  name: string;
  icon: string;
  pointsCost: number;
  category: string;
}

interface RedeemedItem {
  id: string;
  rewardName: string;
  rewardIcon: string;
  pointsSpent: number;
  date: string;
}

interface LoyaltyInfo {
  availablePoints: number;
  tier: string;
  totalEarned: number;
  totalRedeemed: number;
  visits: number;
  memberSince: string;
}

const MOCK_REWARDS: RewardOption[] = [
  { id: 'rw1', name: 'Café Americano', icon: '☕', pointsCost: 20, category: 'bebida' },
  { id: 'rw2', name: 'Té de Hierbas', icon: '🍵', pointsCost: 15, category: 'bebida' },
  { id: 'rw3', name: 'Brownie Casero', icon: '🍫', pointsCost: 25, category: 'postre' },
  { id: 'rw4', name: 'Cookie Artesanal', icon: '🍪', pointsCost: 20, category: 'postre' },
  { id: 'rw5', name: 'Empanada de Queso', icon: '🥐', pointsCost: 30, category: 'snack' },
  { id: 'rw6', name: 'Almuerzo Completo', icon: '🍽️', pointsCost: 200, category: 'comida' },
  { id: 'rw7', name: 'Desayuno Complet', icon: '🥐', pointsCost: 80, category: 'comida' },
  { id: 'rw8', name: 'Cold Brew', icon: '🧋', pointsCost: 35, category: 'bebida' },
];

const MOCK_REDEEMED: Record<string, RedeemedItem[]> = {
  'c1': [
    { id: 'red1', rewardName: 'Brownie Casero', rewardIcon: '🍫', pointsSpent: 25, date: '2026-04-08T11:00:00Z' },
    { id: 'red2', rewardName: 'Café Americano', rewardIcon: '☕', pointsSpent: 20, date: '2026-04-05T10:30:00Z' },
    { id: 'red3', rewardName: 'Cookie Artesanal', rewardIcon: '🍪', pointsSpent: 20, date: '2026-03-20T14:00:00Z' },
  ],
  'c2': [
    { id: 'red4', rewardName: 'Té de Hierbas', rewardIcon: '🍵', pointsSpent: 15, date: '2026-04-10T09:00:00Z' },
  ],
  'c3': [
    { id: 'red5', rewardName: 'Almuerzo Completo', rewardIcon: '🍽️', pointsSpent: 200, date: '2026-04-12T12:00:00Z' },
    { id: 'red6', rewardName: 'Cold Brew', rewardIcon: '🧋', pointsSpent: 35, date: '2026-04-01T15:00:00Z' },
  ],
};

const MOCK_LOYALTY: Record<string, LoyaltyInfo> = {
  'c1': { availablePoints: 340, tier: 'Oro', totalEarned: 520, totalRedeemed: 180, visits: 18, memberSince: '2024-01-10' },
  'c2': { availablePoints: 80, tier: 'Bronce', totalEarned: 150, totalRedeemed: 70, visits: 6, memberSince: '2024-02-15' },
  'c3': { availablePoints: 610, tier: 'Platino', totalEarned: 1120, totalRedeemed: 510, visits: 42, memberSince: '2024-03-01' },
  'c4': { availablePoints: 20, tier: 'Bronce', totalEarned: 30, totalRedeemed: 10, visits: 2, memberSince: '2024-04-20' },
};

const TIER_COLORS: Record<string, string> = {
  Bronce: 'bg-amber-100 text-amber-700',
  Plata: 'bg-slate-100 text-slate-700',
  Oro: 'bg-yellow-100 text-yellow-700',
  Platino: 'bg-purple-100 text-purple-700',
};

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', nombre: 'Ana Quispe', celular: '70011122', correo: 'ana@email.com', estado: true, puntos: 340, fecha_nacimiento: '1995-04-14', direccion: 'Av. Ejemplo 123' },
  { id: 'c2', nombre: 'Carlos Mamani', celular: '70033344', estado: true, puntos: 80 },
  { id: 'c3', nombre: 'Lucía Flores', celular: '70055566', correo: 'lucia@email.com', estado: true, puntos: 610, fecha_nacimiento: '1990-07-22' },
  { id: 'c4', nombre: 'Diego Vargas', celular: '70077788', estado: true, puntos: 20 },
  { id: 'c5', nombre: 'María José Condori', celular: '70099900', correo: 'mj@email.com', estado: true, puntos: 155 },
  { id: 'c6', nombre: 'Roberto Huanca', celular: '70012233', estado: false, puntos: 0 },
];

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol?.toLowerCase() === 'admin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await gql<{ clientes: { nodes: Customer[] } }>(GET_CLIENTES);
      const backendCustomers = data.clientes.nodes;
      const merged = [...MOCK_CUSTOMERS];
      backendCustomers.forEach(bc => {
        if (!merged.find(mc => mc.id === bc.id)) {
          merged.push(bc);
        }
      });
      setCustomers(merged);
    } catch {
      setCustomers(MOCK_CUSTOMERS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const deleteCustomer = useCallback(async (id: string) => {
    await api.delete(`/Cliente/${id}`);
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.correo || '').toLowerCase().includes(q) ||
        c.celular.includes(q) ||
        (c.dni || '').toLowerCase().includes(q)
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
      toast.success('Cliente eliminado', `${deletingCustomer.nombre} fue eliminado.`);
    } catch {
      toast.error('Error', 'No se pudo eliminar el cliente.');
    }
    setIsDeleteOpen(false);
    setDeletingCustomer(null);
  };

  const handleModalSuccess = () => {
    fetchCustomers();
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-coffee-200">
              <thead className="bg-coffee-50">
                <tr>
                  {['Nombre', 'Teléfono', 'Email', 'DNI', 'F. Nacimiento', 'Puntos', 'Estado', ''].map((h) => (
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
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filteredCustomers.length === 0 ? (
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
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-coffee-500" />
                          </div>
                          <span className="font-medium text-coffee-900">{customer.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-700">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-coffee-400" />
                          {customer.celular}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                        {customer.correo ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-coffee-400" />
                            {customer.correo}
                          </div>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                        {customer.dni || <span className="text-coffee-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-coffee-600">
                        {customer.fecha_nacimiento ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-coffee-400" />
                            {formatDate(customer.fecha_nacimiento)}
                          </div>
                        ) : (
                          <span className="text-coffee-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400" />
                          <span className="font-semibold text-coffee-900">{customer.puntos}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={customer.estado ? 'success' : 'default'}>
                          {customer.estado ? 'Activo' : 'Inactivo'}
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
                          {isAdmin && (
                            <button
                              onClick={() => openDelete(customer)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-coffee-400 hover:text-red-500"
                            >
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
        </PageSection>

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
                    {MOCK_LOYALTY[viewingCustomer.id] && (
                      <span className={clsx(
                        'text-xs font-body font-bold px-2 py-0.5 rounded-full',
                        TIER_COLORS[MOCK_LOYALTY[viewingCustomer.id].tier]
                      )}>
                        {MOCK_LOYALTY[viewingCustomer.id].tier}
                      </span>
                    )}
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
              </div>

              {MOCK_LOYALTY[viewingCustomer.id] ? (
                <>
                  <div className="bg-gradient-to-br from-coffee-100 to-cream-light rounded-2xl p-4 border border-coffee-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-coffee-900">Fidelización</h3>
                      <span className="text-xs font-body text-coffee-400">
                        Desde {formatDate(MOCK_LOYALTY[viewingCustomer.id].memberSince)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-amber-400" />
                          <span className="text-2xl font-display font-black text-coffee-900">
                            {MOCK_LOYALTY[viewingCustomer.id].availablePoints}
                          </span>
                        </div>
                        <p className="text-xs font-body text-coffee-500">Puntos disponibles</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-display font-black text-coffee-900">
                          {MOCK_LOYALTY[viewingCustomer.id].visits}
                        </p>
                        <p className="text-xs font-body text-coffee-500">Visitas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-display font-black text-coffee-900">
                          {MOCK_LOYALTY[viewingCustomer.id].totalEarned}
                        </p>
                        <p className="text-xs font-body text-coffee-500">Total ganados</p>
                      </div>
                    </div>

                    <h4 className="text-sm font-body font-semibold text-coffee-700 mb-2 flex items-center gap-1">
                      <Gift className="h-4 w-4" />
                      Recompensas disponibles
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {MOCK_REWARDS.map(reward => {
                        const canRedeem = MOCK_LOYALTY[viewingCustomer.id].availablePoints >= reward.pointsCost;
                        return (
                          <div
                            key={reward.id}
                            className={clsx(
                              'flex items-center gap-2 p-2 rounded-xl border text-sm',
                              canRedeem
                                ? 'bg-white border-coffee-200'
                                : 'bg-gray-50 border-gray-100 opacity-60',
                            )}
                          >
                            <span className="text-xl">{reward.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={clsx(
                                'text-xs font-body font-medium truncate',
                                canRedeem ? 'text-coffee-900' : 'text-coffee-400'
                              )}>
                                {reward.name}
                              </p>
                              <p className={clsx(
                                'text-xs font-body',
                                canRedeem ? 'text-coffee-500' : 'text-coffee-300'
                              )}>
                                {reward.pointsCost} pts
                              </p>
                            </div>
                            {canRedeem ? (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <span className="text-xs font-body text-coffee-300">No</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {MOCK_REDEEMED[viewingCustomer.id] && MOCK_REDEEMED[viewingCustomer.id].length > 0 && (
                    <div>
                      <h4 className="text-sm font-body font-semibold text-coffee-700 mb-2 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Últimos canjes
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {MOCK_REDEEMED[viewingCustomer.id].map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-coffee-50 border border-coffee-100">
                            <span className="text-xl">{item.rewardIcon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-body font-medium text-coffee-900">{item.rewardName}</p>
                              <p className="text-xs font-body text-coffee-400">
                                {new Date(item.date).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <span className="text-sm font-body font-bold text-red-500">-{item.pointsSpent} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-coffee-50 rounded-xl border border-dashed border-coffee-200">
                  <Gift className="w-8 h-8 text-coffee-300 mx-auto mb-2" />
                  <p className="text-sm font-body text-coffee-400">Este cliente aún no está en el programa de fidelización</p>
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
