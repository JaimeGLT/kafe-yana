import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Zap, Gift, Target, Plus, Settings } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import type { PermanentPromotion, ConditionType, RewardType } from '../../types/loyalty';

const MOCK_PERMANENT_PROMOTIONS: PermanentPromotion[] = [
  { id: 'perm1', name: 'Café de Regalo', description: 'Compra 10 cafés y recibe 1 gratis', isActive: true, conditionType: 'n_purchases', conditionValue: 10, rewardType: 'free_product', rewardValue: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'perm2', name: 'Referido Exitoso', description: 'Refiere a un amigo y ambos reciben 50 puntos extra', isActive: true, conditionType: 'referral', conditionValue: 1, rewardType: 'extra_points', rewardValue: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'perm3', name: 'Descuento Grupal', description: 'Grupos de 4+ personas reciben 10% de descuento', isActive: false, conditionType: 'min_amount', conditionValue: 4, rewardType: 'discount', rewardValue: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

interface PermanentPromotionModalProps {
  promo: PermanentPromotion | null;
  onSave: (promo: PermanentPromotion) => void;
  onClose: () => void;
}

const PermanentPromotionModal: React.FC<PermanentPromotionModalProps> = ({ promo, onSave, onClose }) => {
  const [name, setName] = useState(promo?.name ?? '');
  const [description, setDescription] = useState(promo?.description ?? '');
  const [conditionType, setConditionType] = useState<ConditionType>(promo?.conditionType ?? 'n_purchases');
  const [conditionValue, setConditionValue] = useState(promo?.conditionValue ?? 1);
  const [rewardType, setRewardType] = useState<RewardType>(promo?.rewardType ?? 'extra_points');
  const [rewardValue, setRewardValue] = useState(promo?.rewardValue ?? 1);
  const [isActive, setIsActive] = useState(promo?.isActive ?? true);

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;
    onSave({
      id: promo?.id ?? '',
      name: name.trim(),
      description: description.trim(),
      conditionType,
      conditionValue,
      rewardType,
      rewardValue,
      isActive,
      createdAt: promo?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const CONDITION_OPTIONS: { value: ConditionType; label: string }[] = [
    { value: 'n_purchases', label: 'N compras' },
    { value: 'min_amount', label: 'Monto mínimo' },
    { value: 'referral', label: 'Referidos' },
    { value: 'combo_specific', label: 'Combo específico' },
  ];

  const REWARD_OPTIONS: { value: RewardType; label: string }[] = [
    { value: 'extra_points', label: 'Puntos extra' },
    { value: 'free_product', label: 'Producto gratis' },
    { value: 'discount', label: 'Descuento (%)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          {promo ? 'Editar' : 'Nueva'} Promoción Permanente
        </h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Configura la condición y recompensa de la promoción
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Nombre</label>
            <input
              type="text"
              placeholder="Ej: Café de Regalo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Descripción</label>
            <textarea
              placeholder="Ej: Compra 10 cafés y recibe 1 gratis"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Tipo de condición</label>
              <select
                value={conditionType}
                onChange={e => setConditionType(e.target.value as ConditionType)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                {CONDITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Valor de condición</label>
              <input
                type="number"
                min={1}
                value={conditionValue}
                onChange={e => setConditionValue(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Tipo de recompensa</label>
              <select
                value={rewardType}
                onChange={e => setRewardType(e.target.value as RewardType)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                {REWARD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Valor de recompensa</label>
              <input
                type="number"
                min={1}
                value={rewardValue}
                onChange={e => setRewardValue(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
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
            disabled={!name.trim() || !description.trim()}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {promo ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PromocionesPermanentesPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PermanentPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PermanentPromotion | null>(null);

  useEffect(() => {
    setPromotions(MOCK_PERMANENT_PROMOTIONS);
    setLoading(false);
  }, []);

  const handleTogglePromo = useCallback((promoId: string) => {
    setPromotions(prev => prev.map(p =>
      p.id === promoId ? { ...p, isActive: !p.isActive } : p
    ));
  }, []);

  const handleOpenModal = (promo?: PermanentPromotion) => {
    setEditingPromo(promo ?? null);
    setShowModal(true);
  };

  const handleSavePromo = (promo: PermanentPromotion) => {
    if (editingPromo) {
      setPromotions(prev => prev.map(p => p.id === promo.id ? promo : p));
      toast.success('Promoción actualizada', promo.name);
    } else {
      setPromotions(prev => [...prev, { ...promo, id: `perm-${Date.now()}` }]);
      toast.success('Promoción creada', promo.name);
    }
    setShowModal(false);
    setEditingPromo(null);
  };

  const conditionLabels: Record<ConditionType, string> = {
    n_purchases: 'N compras',
    min_amount: 'Monto mínimo',
    referral: 'Referidos',
    combo_specific: 'Combo específico',
  };

  const rewardLabels: Record<RewardType, string> = {
    free_product: 'Producto gratis',
    extra_points: 'Puntos extra',
    discount: 'Descuento',
  };

  const conditionIcons: Record<ConditionType, string> = {
    n_purchases: '☕',
    min_amount: '💰',
    referral: '👥',
    combo_specific: '🎯',
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

  return (
    <MainLayout>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Fidelización</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
              Promociones{' '}
              <span className="text-yellow-300">permanentes</span>
            </h1>
            <p className="text-coffee-200 font-body text-sm">
              Aceleradores de comportamiento. Siempre activos (puedes desactivarlos).
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
        <div className="space-y-3">
          {promotions.map(promo => (
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
                  {conditionIcons[promo.conditionType]}
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
                  </div>
                  <p className="text-xs font-body text-coffee-500 mb-2">{promo.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs font-body">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-coffee-400" />
                      <span className="text-coffee-600 font-medium">Condición:</span>
                      <span className="text-coffee-500">{conditionLabels[promo.conditionType]} ({promo.conditionValue})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-coffee-400" />
                      <span className="text-coffee-600 font-medium">Recompensa:</span>
                      <span className="text-coffee-500">{rewardLabels[promo.rewardType]} ({promo.rewardValue})</span>
                    </span>
                  </div>
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
          ))}

          {promotions.length === 0 && (
            <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
              <Zap className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
              <p className="text-sm font-body text-coffee-400">Sin promociones permanentes aún</p>
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
        <PermanentPromotionModal
          promo={editingPromo}
          onSave={handleSavePromo}
          onClose={() => { setShowModal(false); setEditingPromo(null); }}
        />
      )}
    </MainLayout>
  );
};