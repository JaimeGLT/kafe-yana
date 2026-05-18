import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Gift, Plus, Settings, Users, Calendar, Trophy, Star, Clock, Zap, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { SearchWithSuggestions } from '../../components/ui/SearchInput';

interface RaffleParticipant {
  id: string;
  customerId: string;
  customerName: string;
  registeredAt: string;
}

interface Raffle {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  prize: string;
  prizeIcon: string;
  drawDate: string;
  isActive: boolean;
  createdAt: string;
  participants: RaffleParticipant[];
  winnerId?: string;
  winnerName?: string;
  isDrawn: boolean;
  isClaimed: boolean;
  productIds: string[];
}

interface RaffleProduct {
  id: string;
  name: string;
  icon: string;
  pointsCost: number;
}

const ICON_OPTIONS = ['🎁', '🍽️', '🥐', '🍰', '☕', '🧋', '🎂', '🍪', '🌟', '🏆', '💎', '🥳', '🍕', '🌮', '🍦'];

const MOCK_PRODUCTS: RaffleProduct[] = [
  { id: 'prod1', name: 'Café Americano', icon: '☕', pointsCost: 20 },
  { id: 'prod2', name: 'Desayuno Completo', icon: '🥐', pointsCost: 50 },
  { id: 'prod3', name: 'Almuerzo del Día', icon: '🍽️', pointsCost: 60 },
  { id: 'prod4', name: 'Merienda para Dos', icon: '🍰', pointsCost: 40 },
  { id: 'prod5', name: 'Brownie de Chocolate', icon: '🍫', pointsCost: 25 },
  { id: 'prod6', name: 'Cookie Artesanal', icon: '🍪', pointsCost: 20 },
  { id: 'prod7', name: 'Té de Hierbas', icon: '🍵', pointsCost: 15 },
  { id: 'prod8', name: 'Cold Brew', icon: '🧋', pointsCost: 30 },
];

interface CustomerWithPoints {
  id: string;
  nombre: string;
  celular: string;
  puntos: number;
}

const MOCK_CUSTOMERS: CustomerWithPoints[] = [
  { id: 'c1', nombre: 'Ana Quispe', celular: '70011122', puntos: 340 },
  { id: 'c2', nombre: 'Carlos Mamani', celular: '70033344', puntos: 80 },
  { id: 'c3', nombre: 'Lucía Flores', celular: '70055566', puntos: 610 },
  { id: 'c4', nombre: 'Diego Vargas', celular: '70077788', puntos: 20 },
];

const MOCK_RAFFLES: Raffle[] = [
  {
    id: 'r1',
    name: 'Sorteo Desayuno para 2',
    description: 'Un desayuno completo para dos personas incluye café, medialunas y pastelitos',
    pointsCost: 50,
    prize: 'Desayuno para Dos',
    prizeIcon: '🥐',
    drawDate: '2026-04-30T10:00:00',
    isActive: true,
    createdAt: new Date().toISOString(),
    isDrawn: false,
    isClaimed: false,
    participants: [
      { id: 'p1', customerId: 'c1', customerName: 'Ana Quispe', registeredAt: '2026-04-10T10:00:00Z' },
      { id: 'p2', customerId: 'c3', customerName: 'Lucía Flores', registeredAt: '2026-04-11T14:30:00Z' },
      { id: 'p3', customerId: 'c2', customerName: 'Carlos Mamani', registeredAt: '2026-04-12T09:15:00Z' },
    ],
    productIds: ['prod1', 'prod2', 'prod7'],
  },
  {
    id: 'r2',
    name: 'Sorteo Merienda Special',
    description: 'Una merienda especial con café de especialidad y postres artesanales',
    pointsCost: 30,
    prize: 'Merienda para Dos',
    prizeIcon: '🍰',
    drawDate: '2026-05-15T16:00:00',
    isActive: true,
    createdAt: new Date().toISOString(),
    isDrawn: false,
    isClaimed: false,
    participants: [
      { id: 'p4', customerId: 'c1', customerName: 'Ana Quispe', registeredAt: '2026-04-15T11:00:00Z' },
    ],
    productIds: ['prod4', 'prod5', 'prod6'],
  },
  {
    id: 'r3',
    name: 'Sorteo Gran Premio Yana',
    description: 'El gran premio: almuerzo completo para cuatro personas',
    pointsCost: 100,
    prize: 'Almuerzo Completo para 4',
    prizeIcon: '🍽️',
    drawDate: '2026-03-20T12:00:00',
    isActive: false,
    createdAt: new Date().toISOString(),
    isDrawn: true,
    isClaimed: false,
    winnerId: 'c3',
    winnerName: 'Lucía Flores',
    participants: [
      { id: 'p5', customerId: 'c1', customerName: 'Ana Quispe', registeredAt: '2026-03-01T10:00:00Z' },
      { id: 'p6', customerId: 'c3', customerName: 'Lucía Flores', registeredAt: '2026-03-05T14:00:00Z' },
      { id: 'p7', customerId: 'c4', customerName: 'Diego Vargas', registeredAt: '2026-03-10T09:00:00Z' },
      { id: 'p8', customerId: 'c2', customerName: 'Carlos Mamani', registeredAt: '2026-03-12T11:30:00Z' },
    ],
    productIds: ['prod3', 'prod1'],
  },
];

interface RaffleModalProps {
  raffle: Raffle | null;
  products: RaffleProduct[];
  onSave: (r: Raffle) => void;
  onClose: () => void;
}

const RaffleModal: React.FC<RaffleModalProps> = ({ raffle, products, onSave, onClose }) => {
  const [name, setName] = useState(raffle?.name ?? '');
  const [description, setDescription] = useState(raffle?.description ?? '');
  const [pointsCost, setPointsCost] = useState(raffle?.pointsCost ?? 50);
  const [prize, setPrize] = useState(raffle?.prize ?? '');
  const [prizeIcon, setPrizeIcon] = useState(raffle?.prizeIcon ?? '🎁');
  const [drawDate, setDrawDate] = useState(raffle?.drawDate?.split('T')[0] ?? '');
  const [isActive, setIsActive] = useState(raffle?.isActive ?? true);
  const [productIds, setProductIds] = useState<string[]>(raffle?.productIds ?? []);

  const toggleProduct = (productId: string) => {
    setProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !prize.trim() || !description.trim() || !drawDate) return;
    onSave({
      id: raffle?.id ?? '',
      name: name.trim(),
      description: description.trim(),
      pointsCost,
      prize: prize.trim(),
      prizeIcon,
      drawDate: new Date(drawDate).toISOString(),
      isActive,
      createdAt: raffle?.createdAt ?? new Date().toISOString(),
      participants: raffle?.participants ?? [],
      isDrawn: raffle?.isDrawn ?? false,
      isClaimed: raffle?.isClaimed ?? false,
      winnerId: raffle?.winnerId,
      winnerName: raffle?.winnerName,
      productIds,
    });
  };

  const selectedProducts = products.filter(p => productIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          {raffle ? 'Editar' : 'Nuevo'} Sorteo
        </h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Configura los detalles del sorteo y sus participantes
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Nombre del sorteo</label>
            <input
              type="text"
              placeholder="Ej: Sorteo Desayuno para 2"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Descripción</label>
            <textarea
              placeholder="Ej: Un desayuno completo para dos personas"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Premio</label>
              <input
                type="text"
                placeholder="Ej: Desayuno para Dos"
                value={prize}
                onChange={e => setPrize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
              />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Puntos para participar</label>
              <input
                type="number"
                min={1}
                value={pointsCost}
                onChange={e => setPointsCost(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-2">Icono del premio</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ico => (
                <button
                  key={ico}
                  onClick={() => setPrizeIcon(ico)}
                  className={clsx(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                    prizeIcon === ico
                      ? 'bg-coffee-500 text-white shadow-coffee'
                      : 'bg-coffee-50 text-coffee-600 hover:bg-coffee-100',
                  )}
                >
                  {ico}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Fecha del sorteo</label>
            <input
              type="date"
              value={drawDate}
              onChange={e => setDrawDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-2">Productos incluidos en el premio</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all border',
                    productIds.includes(product.id)
                      ? 'bg-coffee-500 text-white border-coffee-500'
                      : 'bg-white text-coffee-600 border-coffee-200 hover:border-coffee-300',
                  )}
                >
                  <span>{product.icon}</span>
                  <span>{product.name}</span>
                </button>
              ))}
            </div>
            {selectedProducts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedProducts.map(p => (
                  <span key={p.id} className="flex items-center gap-1 text-xs font-body bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                    <span className="opacity-60">({p.pointsCost}pts)</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-coffee-700">Activo / Inactivo</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                isActive ? 'bg-green-400' : 'bg-gray-200',
              )}
            >
              <span className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                isActive ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !prize.trim() || !description.trim() || !drawDate}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {raffle ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SorteosPage: React.FC = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [filterTab, setFilterTab] = useState<'active' | 'pending_claim' | 'past'>('active');
  const [claimingRaffle, setClaimingRaffle] = useState<Raffle | null>(null);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [addParticipantRaffle, setAddParticipantRaffle] = useState<Raffle | null>(null);

  useEffect(() => {
    setRaffles(MOCK_RAFFLES);
    setLoading(false);
  }, []);

  const handleToggle = useCallback((raffleId: string) => {
    setRaffles(prev => prev.map(r =>
      r.id === raffleId ? { ...r, isActive: !r.isActive } : r
    ));
  }, []);

  const handleOpenModal = (raffle?: Raffle) => {
    setEditingRaffle(raffle ?? null);
    setShowModal(true);
  };

  const handleSaveRaffle = (r: Raffle) => {
    if (editingRaffle) {
      setRaffles(prev => prev.map(x => x.id === r.id ? r : x));
      toast.success('Sorteo actualizado', r.name);
    } else {
      setRaffles(prev => [...prev, { ...r, id: `r-${Date.now()}` }]);
      toast.success('Sorteo creado', r.name);
    }
    setShowModal(false);
    setEditingRaffle(null);
  };

  const handleOpenDrawModal = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setShowDrawModal(true);
  };

  const handleOpenAddParticipantModal = (raffle: Raffle) => {
    setAddParticipantRaffle(raffle);
    setShowAddParticipantModal(true);
  };

  const handleAddParticipant = (customerId: string, customerName: string) => {
    if (!addParticipantRaffle) return;

    const alreadyParticipating = addParticipantRaffle.participants.some(p => p.customerId === customerId);
    if (alreadyParticipating) {
      toast.error('Ya participa', `${customerName} ya está inscrito en este sorteo`);
      return;
    }

    const customer = MOCK_CUSTOMERS.find(c => c.id === customerId);
    if (!customer) return;

    if (customer.puntos < addParticipantRaffle.pointsCost) {
      toast.error('Puntos insuficientes', `${customer.nombre} necesita ${addParticipantRaffle.pointsCost} pts para participar`);
      return;
    }

    const newParticipant: RaffleParticipant = {
      id: `p-${Date.now()}`,
      customerId,
      customerName,
      registeredAt: new Date().toISOString(),
    };

    setRaffles(prev => prev.map(r =>
      r.id === addParticipantRaffle.id
        ? { ...r, participants: [...r.participants, newParticipant] }
        : r
    ));

    toast.success('Participante agregado', `${customerName} inscrito en ${addParticipantRaffle.name}`);
    setShowAddParticipantModal(false);
    setAddParticipantRaffle(null);
  };

  const handlePerformDraw = () => {
    if (!selectedRaffle || selectedRaffle.participants.length === 0) return;

    const winnerIdx = Math.floor(Math.random() * selectedRaffle.participants.length);
    const winner = selectedRaffle.participants[winnerIdx];

    setRaffles(prev => prev.map(r =>
      r.id === selectedRaffle.id
        ? { ...r, isDrawn: true, winnerId: winner.customerId, winnerName: winner.customerName }
        : r
    ));

    toast.success(
      `¡${winner.customerName} ganó!`,
      `${selectedRaffle.prizeIcon} ${selectedRaffle.prize} - ${selectedRaffle.name}`
    );
    setShowDrawModal(false);
    setSelectedRaffle(null);
  };

  const handleClaim = (raffleId: string) => {
    setRaffles(prev => prev.map(r =>
      r.id === raffleId ? { ...r, isClaimed: true } : r
    ));
    const raffle = raffles.find(r => r.id === raffleId);
    if (raffle) toast.success('Premio entregado', `${raffle.winnerName} — ${raffle.prize}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  const activeRaffles = raffles.filter(r => r.isActive && !r.isDrawn);
  const pendingClaimRaffles = raffles.filter(r => r.isDrawn && !r.isClaimed);
  const pastRaffles = raffles.filter(r => r.isDrawn && r.isClaimed);
  const displayRaffles = filterTab === 'active' ? activeRaffles : filterTab === 'pending_claim' ? pendingClaimRaffles : pastRaffles;

  return (
    <MainLayout>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Fidelización</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
              <span className="text-yellow-300">Sorteos</span>
            </h1>
            <p className="text-coffee-200 font-body text-sm">
              Crea sorteos entre clientes con puntos acumulados.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-coffee-200 px-3 py-2 rounded-xl text-xs font-body">
              <Users className="w-3.5 h-3.5" />
              {activeRaffles.length} activos
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Nuevo Sorteo
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setFilterTab('active')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
            filterTab === 'active'
              ? 'bg-coffee-500 text-white border-coffee-500 shadow-md'
              : 'bg-white text-coffee-600 border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50',
          )}
        >
          <Zap className="w-4 h-4" />
          Activos
          <span className={clsx(
            'text-xs font-bold px-1.5 py-0.5 rounded-full',
            filterTab === 'active' ? 'bg-white/20 text-white' : 'bg-coffee-100 text-coffee-600',
          )}>
            {activeRaffles.length}
          </span>
        </button>
        <button
          onClick={() => setFilterTab('pending_claim')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
            filterTab === 'pending_claim'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md'
              : 'bg-white text-coffee-600 border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50',
          )}
        >
          <Trophy className="w-4 h-4" />
          Por Entregar
          {pendingClaimRaffles.length > 0 && (
            <span className={clsx(
              'text-xs font-bold px-1.5 py-0.5 rounded-full',
              filterTab === 'pending_claim' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
            )}>
              {pendingClaimRaffles.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterTab('past')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
            filterTab === 'past'
              ? 'bg-coffee-500 text-white border-coffee-500 shadow-md'
              : 'bg-white text-coffee-600 border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50',
          )}
        >
          <Clock className="w-4 h-4" />
          Entregados
          <span className={clsx(
            'text-xs font-bold px-1.5 py-0.5 rounded-full',
            filterTab === 'past' ? 'bg-white/20 text-white' : 'bg-coffee-100 text-coffee-600',
          )}>
            {pastRaffles.length}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {displayRaffles.length === 0 ? (
          <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
            <Gift className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
            <p className="text-sm font-body text-coffee-400">
              {filterTab === 'active' ? 'Sin sorteos activos' : filterTab === 'pending_claim' ? 'Sin premios pendientes de entrega' : 'Sin premios entregados aún'}
            </p>
            {filterTab === 'active' && (
              <button
                onClick={() => handleOpenModal()}
                className="mt-3 text-sm font-body font-semibold text-coffee-600 hover:text-coffee-700"
              >
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          displayRaffles.map(raffle => (
            <div
              key={raffle.id}
              className={clsx(
                'bg-white rounded-2xl border transition-all duration-200',
                raffle.isActive && !raffle.isDrawn ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100',
              )}
            >
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className={clsx(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0',
                    raffle.isActive && !raffle.isDrawn ? 'bg-coffee-100' : 'bg-gray-100',
                  )}>
                    {raffle.prizeIcon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-coffee-900">{raffle.name}</span>
                      <span className={clsx(
                        'flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full',
                        raffle.isDrawn && raffle.isClaimed ? 'bg-green-100 text-green-700' :
                          raffle.isDrawn ? 'bg-amber-100 text-amber-700' :
                          raffle.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {raffle.isDrawn && raffle.isClaimed ? '✅ Entregado' : raffle.isDrawn ? '🎉 Sorteado' : raffle.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs font-body text-coffee-500 mb-2">{raffle.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs font-body">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
                        <span className="text-coffee-600 font-medium">{raffle.pointsCost} pts</span>
                        <span className="text-coffee-400">para participar</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-coffee-400" />
                        <span className="text-coffee-500">
                          {new Date(raffle.drawDate).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-coffee-400" />
                        <span className="text-coffee-500">{raffle.participants.length} participantes</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {!raffle.isDrawn && (
                      <>
                        <button
                          onClick={() => handleToggle(raffle.id)}
                          className={clsx(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                            raffle.isActive ? 'bg-green-400' : 'bg-gray-200',
                          )}
                        >
                          <span className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                            raffle.isActive ? 'translate-x-6' : 'translate-x-1',
                          )} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(raffle)}
                          className="p-1.5 rounded-lg bg-coffee-50 text-coffee-600 hover:bg-coffee-100 transition-colors"
                          title="Editar"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {raffle.isDrawn && raffle.winnerName && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 mb-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <div>
                      <span className="text-xs font-body text-yellow-700 font-semibold">Ganador</span>
                      <p className="text-sm font-body font-bold text-coffee-900">{raffle.winnerName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {raffle.participants.slice(0, 5).map(p => (
                      <span key={p.id} className="text-xs font-body bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded-full border border-coffee-100">
                        {p.customerName}
                      </span>
                    ))}
                    {raffle.participants.length > 5 && (
                      <span className="text-xs font-body bg-coffee-50 text-coffee-400 px-2 py-0.5 rounded-full">
                        +{raffle.participants.length - 5} más
                      </span>
                    )}
                    {raffle.participants.length === 0 && (
                      <span className="text-xs font-body text-coffee-400 italic">Sin participantes aún</span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {raffle.isActive && !raffle.isDrawn && (
                      <button
                        onClick={() => handleOpenAddParticipantModal(raffle)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-coffee-200 text-coffee-600 text-xs font-body font-medium hover:bg-coffee-50 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Agregar
                      </button>
                    )}
                    {raffle.isActive && !raffle.isDrawn && raffle.participants.length > 0 && (
                      <button
                        onClick={() => handleOpenDrawModal(raffle)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coffee-500 text-white text-sm font-body font-semibold hover:bg-coffee-600 transition-colors shadow-coffee"
                      >
                        <Zap className="w-4 h-4" />
                        Realizar Sorteo
                      </button>
                    )}
                    {raffle.isDrawn && !raffle.isClaimed && (
                      <button
                        onClick={() => setClaimingRaffle(raffle)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-body font-semibold hover:bg-amber-600 transition-colors shadow-md"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marcar Entregado
                      </button>
                    )}
                    {raffle.isDrawn && raffle.isClaimed && (
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 text-xs font-body font-semibold border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Entregado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <RaffleModal
          raffle={editingRaffle}
          products={MOCK_PRODUCTS}
          onSave={handleSaveRaffle}
          onClose={() => { setShowModal(false); setEditingRaffle(null); }}
        />
      )}

      <Modal
        isOpen={showDrawModal}
        onClose={() => { setShowDrawModal(false); setSelectedRaffle(null); }}
        title="Realizar Sorteo"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowDrawModal(false); setSelectedRaffle(null); }}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handlePerformDraw}>
              🎲 Sortear Ganador
            </Button>
          </div>
        }
      >
        {selectedRaffle && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-coffee-50 border border-coffee-100">
              <span className="text-3xl">{selectedRaffle.prizeIcon}</span>
              <div>
                <p className="font-display font-bold text-coffee-900">{selectedRaffle.name}</p>
                <p className="text-sm font-body text-coffee-500">{selectedRaffle.prize}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-body text-yellow-700">
                Se seleccionará un <strong>ganador al azar</strong> de los {selectedRaffle.participants.length} participantes. Esta acción no se puede deshacer.
              </p>
            </div>
            <div>
              <p className="text-xs font-body text-coffee-500 mb-2">Participantes:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedRaffle.participants.map(p => (
                  <span key={p.id} className="text-xs font-body bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded-full border border-coffee-100">
                    {p.customerName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showAddParticipantModal}
        onClose={() => { setShowAddParticipantModal(false); setAddParticipantRaffle(null); }}
        title="Agregar Participante"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowAddParticipantModal(false); setAddParticipantRaffle(null); }}>
              Cerrar
            </Button>
          </div>
        }
      >
        {addParticipantRaffle && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-coffee-50 border border-coffee-100">
              <span className="text-3xl">{addParticipantRaffle.prizeIcon}</span>
              <div>
                <p className="font-display font-bold text-coffee-900">{addParticipantRaffle.name}</p>
                <p className="text-sm font-body text-coffee-500">
                  Costo: <strong>{addParticipantRaffle.pointsCost} pts</strong> para participar
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-2">Buscar cliente</label>
              <SearchWithSuggestions<CustomerWithPoints>
                value=""
                onChange={() => {}}
                onSelect={(customer) => handleAddParticipant(customer.id, customer.nombre)}
                suggestions={MOCK_CUSTOMERS.filter(c =>
                  !addParticipantRaffle.participants.some(p => p.customerId === c.id)
                )}
                getSuggestionLabel={(c) => c.nombre}
                getSuggestionValue={(c) => c.id}
                placeholder="Nombre o teléfono..."
                renderSuggestion={(c) => (
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <span className="font-body font-medium text-coffee-900">{c.nombre}</span>
                      <span className="text-xs font-body text-coffee-400 ml-2">{c.celular}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'text-xs font-body font-bold px-2 py-0.5 rounded-full',
                        c.puntos >= addParticipantRaffle.pointsCost
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700',
                      )}>
                        {c.puntos} pts
                      </span>
                      {c.puntos >= addParticipantRaffle.pointsCost ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-body text-yellow-700">
                Los puntos se <strong>descontarán al inscribirse</strong>, no al ganar el sorteo.
              </p>
            </div>

            <div>
              <p className="text-xs font-body text-coffee-500 mb-2">Ya inscritos ({addParticipantRaffle.participants.length}):</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {addParticipantRaffle.participants.map(p => (
                  <span key={p.id} className="text-xs font-body bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded-full border border-coffee-100">
                    {p.customerName}
                  </span>
                ))}
                {addParticipantRaffle.participants.length === 0 && (
                  <span className="text-xs font-body text-coffee-400 italic">Nadie aún</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={!!claimingRaffle}
        onClose={() => setClaimingRaffle(null)}
        title="Confirmar entrega"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setClaimingRaffle(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (claimingRaffle) handleClaim(claimingRaffle.id);
                setClaimingRaffle(null);
              }}
            >
              Confirmar entrega
            </Button>
          </div>
        }
      >
        {claimingRaffle && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-3xl">{claimingRaffle.prizeIcon}</span>
              <div>
                <p className="font-display font-bold text-coffee-900">{claimingRaffle.prize}</p>
                <p className="text-sm font-body text-coffee-500">{claimingRaffle.name}</p>
              </div>
            </div>
            <p className="text-sm font-body text-coffee-700">
              ¿Confirmás que el premio fue entregado a{' '}
              <strong>{claimingRaffle.winnerName}</strong>?
            </p>
            <p className="text-xs font-body text-coffee-400">
              Esta acción marcará el sorteo como entregado y no se puede deshacer.
            </p>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};