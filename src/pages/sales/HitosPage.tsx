import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Trophy, Plus, Settings, CheckCircle, Target } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';

interface EditableMilestone {
  id: string;
  purchaseNumber: number;
  reward: string;
  icon: string;
  description: string;
  isActive: boolean;
}

const ICON_OPTIONS = ['☕', '🍵', '🍰', '🥐', '🍽️', '🍪', '🍫', '🎂', '💎', '🏆', '🎁', '🥳', '🌟', '🍓', '🧋'];

const MOCK_MILESTONES: EditableMilestone[] = [
  { id: 'm1', purchaseNumber: 10, reward: 'Café Americano', icon: '☕', description: 'Café gratis en tu 10ma visita', isActive: true },
  { id: 'm2', purchaseNumber: 20, reward: 'Desayuno Completo', icon: '🥐', description: 'Desayuno gratis en tu 20va visita', isActive: true },
  { id: 'm3', purchaseNumber: 30, reward: 'Postre Especial', icon: '🍰', description: 'Postre gratis en tu 30va visita', isActive: true },
  { id: 'm4', purchaseNumber: 40, reward: 'Brunch para Dos', icon: '🥳', description: 'Brunch gratis para dos en tu 40va visita', isActive: true },
  { id: 'm5', purchaseNumber: 60, reward: 'Almuerzo Completo', icon: '🍽️', description: 'Almuerzo gratis en tu 60va visita', isActive: false },
  { id: 'm6', purchaseNumber: 100, reward: 'Experiencia Yana', icon: '💎', description: 'Experiencia premium en tu 100va visita', isActive: true },
];

interface MilestoneModalProps {
  milestone: EditableMilestone | null;
  onSave: (m: EditableMilestone) => void;
  onClose: () => void;
}

const MilestoneModal: React.FC<MilestoneModalProps> = ({ milestone, onSave, onClose }) => {
  const [purchaseNumber, setPurchaseNumber] = useState(milestone?.purchaseNumber ?? 10);
  const [reward, setReward] = useState(milestone?.reward ?? '');
  const [icon, setIcon] = useState(milestone?.icon ?? '☕');
  const [description, setDescription] = useState(milestone?.description ?? '');
  const [isActive, setIsActive] = useState(milestone?.isActive ?? true);

  const handleSubmit = () => {
    if (!reward.trim() || !description.trim()) return;
    onSave({
      id: milestone?.id ?? '',
      purchaseNumber,
      reward: reward.trim(),
      icon,
      description: description.trim(),
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          {milestone ? 'Editar' : 'Nuevo'} Hito
        </h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Configura el número de compras y la recompensa asociada
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Número de compra</label>
            <input
              type="number"
              min={1}
              value={purchaseNumber}
              onChange={e => setPurchaseNumber(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Nombre de la recompensa</label>
            <input
              type="text"
              placeholder="Ej: Café Americano"
              value={reward}
              onChange={e => setReward(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Descripción</label>
            <textarea
              placeholder="Ej: Café gratis en tu 10ma visita"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-2">Icono</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ico => (
                <button
                  key={ico}
                  onClick={() => setIcon(ico)}
                  className={clsx(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                    icon === ico
                      ? 'bg-coffee-500 text-white shadow-coffee'
                      : 'bg-coffee-50 text-coffee-600 hover:bg-coffee-100',
                  )}
                >
                  {ico}
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
            disabled={!reward.trim() || !description.trim()}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {milestone ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const HitosPage: React.FC = () => {
  const [milestones, setMilestones] = useState<EditableMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<EditableMilestone | null>(null);

  useEffect(() => {
    setMilestones(MOCK_MILESTONES);
    setLoading(false);
  }, []);

  const handleToggle = useCallback((milestoneId: string) => {
    setMilestones(prev => prev.map(m =>
      m.id === milestoneId ? { ...m, isActive: !m.isActive } : m
    ));
  }, []);

  const handleOpenModal = (milestone?: EditableMilestone) => {
    setEditingMilestone(milestone ?? null);
    setShowModal(true);
  };

  const handleSaveMilestone = (m: EditableMilestone) => {
    if (editingMilestone) {
      setMilestones(prev => prev.map(x => x.id === m.id ? m : x));
      toast.success('Hito actualizado', `${m.purchaseNumber} visitas`);
    } else {
      setMilestones(prev => [...prev, { ...m, id: `m-${Date.now()}` }]);
      toast.success('Hito creado', `${m.purchaseNumber} visitas`);
    }
    setShowModal(false);
    setEditingMilestone(null);
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

  const sortedMilestones = [...milestones].sort((a, b) => a.purchaseNumber - b.purchaseNumber);
  const activeCount = milestones.filter(m => m.isActive).length;

  return (
    <MainLayout>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Fidelización</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
              Hitos por{' '}
              <span className="text-yellow-300">compra</span>
            </h1>
            <p className="text-coffee-200 font-body text-sm">
              Recompensas automáticas al alcanzar cierto número de compras.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-coffee-200 px-3 py-2 rounded-xl text-xs font-body">
              <CheckCircle className="w-3.5 h-3.5" />
              {activeCount}/{milestones.length} activos
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Nuevo Hito
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center gap-2">
          <Target className="w-4 h-4 text-coffee-500" />
          <h2 className="font-display font-semibold text-coffee-900">Lista de hitos</h2>
          <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
            {milestones.length}
          </span>
        </div>

        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
              <Trophy className="w-7 h-7 text-coffee-300" />
            </div>
            <p className="font-display font-semibold text-coffee-700 mb-1">Sin hitos configurados</p>
            <p className="text-sm font-body text-coffee-400 mb-4">
              Agrega los primeros hitos que tus clientes podrán reclamar al alcanzar cierto número de compras
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coffee-500 text-white font-body font-semibold text-sm hover:bg-coffee-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar primer hito
            </button>
          </div>
        ) : (
          <div className="divide-y divide-coffee-50">
            {sortedMilestones.map((milestone, idx) => (
              <div
                key={milestone.id}
                className={clsx(
                  'px-5 py-4 flex items-center gap-4 transition-colors',
                  !milestone.isActive && 'bg-gray-50/60',
                )}
              >
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl',
                    milestone.isActive ? 'bg-coffee-100' : 'bg-gray-100',
                  )}>
                    {milestone.isActive ? milestone.icon : '⚫'}
                  </div>
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-body font-bold',
                    milestone.isActive ? 'bg-coffee-500 text-white' : 'bg-gray-300 text-gray-500',
                  )}>
                    #{milestone.purchaseNumber}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={clsx(
                      'font-body font-semibold text-sm',
                      milestone.isActive ? 'text-coffee-900' : 'text-coffee-400',
                    )}>
                      {milestone.reward}
                    </span>
                    {!milestone.isActive && (
                      <span className="text-xs font-body bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-body text-coffee-400">{milestone.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {idx > 0 && (
                    <span className="text-xs font-body text-coffee-300">
                      ← {sortedMilestones[idx - 1].purchaseNumber}
                    </span>
                  )}
                  <span className="text-xs font-body text-coffee-400">
                    {milestone.purchaseNumber} compras
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(milestone.id)}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                      milestone.isActive ? 'bg-green-400' : 'bg-gray-200',
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                      milestone.isActive ? 'translate-x-6' : 'translate-x-1',
                    )} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(milestone)}
                    className="p-2 rounded-xl text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 transition-colors"
                    title="Editar"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <MilestoneModal
          milestone={editingMilestone}
          onSave={handleSaveMilestone}
          onClose={() => { setShowModal(false); setEditingMilestone(null); }}
        />
      )}
    </MainLayout>
  );
};