import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Calendar, Plus, Settings, Star } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import type { Reward } from '../../types/loyalty';

interface SeasonalPromotion {
  id: string;
  name: string;
  month: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  rewardIds: string[];
  createdAt: string;
  updatedAt: string;
}

const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

const MONTH_ICONS: Record<number, string> = {
  1: '❄️', 2: '💝', 3: '🌱', 4: '🌸',
  5: '💐', 6: '☀️', 7: '🏖️', 8: '🌻',
  9: '🌺', 10: '🌕', 11: '🍂', 12: '🎄',
};

const MOCK_REWARDS: Reward[] = [
  { id: 'r1', name: 'Café Americano Gratis', description: 'Un americano de 12oz', pointsCost: 20, category: 'diario', icon: '☕', isActive: true },
  { id: 'r2', name: 'Té de Hierbas Gratis', description: 'Té caliente a elección', pointsCost: 15, category: 'diario', icon: '🍵', isActive: true },
  { id: 'r3', name: 'Brownie Casero Gratis', description: 'Brownie de chocolate', pointsCost: 25, category: 'diario', icon: '🍫', isActive: true },
  { id: 'r4', name: 'Cookie de Choco Gratis', description: 'Cookie artesanal', pointsCost: 20, category: 'diario', icon: '🍪', isActive: true },
  { id: 'r5', name: 'Empanada de Queso Gratis', description: 'Empanada horneada', pointsCost: 30, category: 'diario', icon: '🥐', isActive: true },
  { id: 'r6', name: 'Almuerzo Completo Gratis', description: 'Almuerzo del día', pointsCost: 200, category: 'premio_mayor', icon: '🍽️', isActive: true },
];

const MOCK_PROMOTIONS: SeasonalPromotion[] = [
  { id: 's1', name: 'Día de la Madre', month: 5, startDate: '2026-05-01', endDate: '2026-05-31', isActive: false, rewardIds: ['r2', 'r6'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 's2', name: 'Día del Padre', month: 6, startDate: '2026-06-01', endDate: '2026-06-30', isActive: false, rewardIds: ['r1', 'r6'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 's3', name: 'Navidad', month: 12, startDate: '2026-12-01', endDate: '2026-12-31', isActive: false, rewardIds: ['r3', 'r4', 'r5'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 's4', name: 'Día de la Café', month: 4, startDate: '2026-04-01', endDate: '2026-04-30', isActive: true, rewardIds: ['r1'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

interface SeasonalPromotionModalProps {
  promo: SeasonalPromotion | null;
  rewards: Reward[];
  onSave: (promo: SeasonalPromotion) => void;
  onClose: () => void;
}

const SeasonalPromotionModal: React.FC<SeasonalPromotionModalProps> = ({ promo, rewards, onSave, onClose }) => {
  const [name, setName] = useState(promo?.name ?? '');
  const [month, setMonth] = useState(promo?.month ?? 5);
  const [startDate, setStartDate] = useState(promo?.startDate ?? '');
  const [endDate, setEndDate] = useState(promo?.endDate ?? '');
  const [isActive, setIsActive] = useState(promo?.isActive ?? true);
  const [rewardIds, setRewardIds] = useState<string[]>(promo?.rewardIds ?? []);

  const toggleReward = (rewardId: string) => {
    setRewardIds(prev =>
      prev.includes(rewardId)
        ? prev.filter(id => id !== rewardId)
        : [...prev, rewardId]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !startDate || !endDate) return;
    onSave({
      id: promo?.id ?? '',
      name: name.trim(),
      month,
      startDate,
      endDate,
      isActive,
      rewardIds,
      createdAt: promo?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const MONTH_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12].map(m => ({
    value: m,
    label: `${MONTH_ICONS[m]} ${MONTH_NAMES[m]}`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          {promo ? 'Editar' : 'Nueva'} Promoción de Temporada
        </h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Configura la promo estacional y sus productos canjeables
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Nombre</label>
            <input
              type="text"
              placeholder="Ej: Día de la Madre"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Mes asignado</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              {MONTH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Fecha fin</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-2">Canjeables incluidos</label>
            <div className="flex flex-wrap gap-2">
              {rewards.filter(r => r.isActive).map(reward => (
                <button
                  key={reward.id}
                  onClick={() => toggleReward(reward.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all border',
                    rewardIds.includes(reward.id)
                      ? 'bg-coffee-500 text-white border-coffee-500'
                      : 'bg-white text-coffee-600 border-coffee-200 hover:border-coffee-300',
                  )}
                >
                  <span>{reward.icon}</span>
                  <span>{reward.name.replace(' Gratis', '')}</span>
                  <span className="opacity-70">{reward.pointsCost}pts</span>
                </button>
              ))}
            </div>
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
            disabled={!name.trim() || !startDate || !endDate}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {promo ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PromocionesTemporadaPage: React.FC = () => {
  const [promotions, setPromotions] = useState<SeasonalPromotion[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<SeasonalPromotion | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  useEffect(() => {
    setRewards(MOCK_REWARDS);
    setPromotions(MOCK_PROMOTIONS);
    setLoading(false);
  }, []);

  const currentMonth = new Date().getMonth() + 1;

  const filteredPromotions = useCallback(() => {
    if (!filterMonth) return promotions;
    return promotions.filter(p => p.month === filterMonth);
  }, [promotions, filterMonth]);

  const handleTogglePromo = useCallback((promoId: string) => {
    setPromotions(prev => prev.map(p =>
      p.id === promoId ? { ...p, isActive: !p.isActive } : p
    ));
  }, []);

  const handleOpenModal = (promo?: SeasonalPromotion) => {
    setEditingPromo(promo ?? null);
    setShowModal(true);
  };

  const handleSavePromo = (promo: SeasonalPromotion) => {
    if (editingPromo) {
      setPromotions(prev => prev.map(p => p.id === promo.id ? promo : p));
      toast.success('Promoción actualizada', promo.name);
    } else {
      setPromotions(prev => [...prev, { ...promo, id: `s-${Date.now()}` }]);
      toast.success('Promoción creada', promo.name);
    }
    setShowModal(false);
    setEditingPromo(null);
  };

  const getRewardsForPromo = (promo: SeasonalPromotion) => {
    return rewards.filter(r => promo.rewardIds.includes(r.id));
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

  const availableMonths = [...new Set(promotions.map(p => p.month))].sort((a, b) => a - b);

  return (
    <MainLayout>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Fidelización</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
              Promociones de{' '}
              <span className="text-yellow-300">temporada</span>
            </h1>
            <p className="text-coffee-200 font-body text-sm">
              Campañas especiales por fechas o meses del año.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Nueva Promo
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setFilterMonth(null)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
              !filterMonth
                ? 'bg-coffee-500 text-white border-coffee-500 shadow-md'
                : 'bg-white text-coffee-600 border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50',
            )}
          >
            Todos
          </button>
          {availableMonths.map(m => {
            const isCurrent = m === currentMonth;
            return (
              <button
                key={m}
                onClick={() => setFilterMonth(m)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
                  filterMonth === m
                    ? 'bg-coffee-500 text-white border-coffee-500 shadow-md'
                    : 'bg-white text-coffee-600 border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50',
                )}
              >
                <span>{MONTH_ICONS[m]}</span>
                <span>{MONTH_NAMES[m]}</span>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredPromotions().map(promo => {
            const promoRewards = getRewardsForPromo(promo);
            const isCurrentMonth = promo.month === currentMonth;

            return (
              <div
                key={promo.id}
                className={clsx(
                  'bg-white rounded-2xl border transition-all duration-200',
                  promo.isActive ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100 opacity-70',
                )}
              >
                <div className="p-4 flex items-start gap-4">
                  <div className={clsx(
                    'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                    promo.isActive ? 'bg-coffee-100' : 'bg-gray-100',
                  )}>
                    {MONTH_ICONS[promo.month]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-coffee-900">{promo.name}</span>
                      <span className={clsx(
                        'flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full',
                        promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {promo.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      {isCurrentMonth && promo.isActive && (
                        <span className="flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          Este mes
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-body text-coffee-500 mb-2">
                      {MONTH_NAMES[promo.month]} · {new Date(promo.startDate).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} — {new Date(promo.endDate).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                    </p>

                    {promoRewards.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {promoRewards.map(r => (
                          <span key={r.id} className="flex items-center gap-1 text-xs font-body bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded-full border border-coffee-100">
                            <span>{r.icon}</span>
                            <span>{r.name.replace(' Gratis', '')}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleTogglePromo(promo.id)}
                      className={clsx(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                        promo.isActive ? 'bg-green-400' : 'bg-gray-200',
                      )}
                    >
                      <span className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                        promo.isActive ? 'translate-x-6' : 'translate-x-1',
                      )} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(promo)}
                      className="p-1.5 rounded-lg bg-coffee-50 text-coffee-600 hover:bg-coffee-100 transition-colors"
                      title="Editar"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPromotions().length === 0 && (
            <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
              <Calendar className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
              <p className="text-sm font-body text-coffee-400">Sin promociones de temporada{filterMonth ? ` para ${MONTH_NAMES[filterMonth]}` : ''}</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-3 text-sm font-body font-semibold text-coffee-600 hover:text-coffee-700"
              >
                Crear la primera
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <SeasonalPromotionModal
          promo={editingPromo}
          rewards={rewards}
          onSave={handleSavePromo}
          onClose={() => { setShowModal(false); setEditingPromo(null); }}
        />
      )}
    </MainLayout>
  );
};