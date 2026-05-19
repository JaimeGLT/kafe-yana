import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Trophy, Plus, Settings, CheckCircle, Target, Trash2 } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { useHitosCompra, type HitoCompra, type HitoProductoCanjeable, type HitoInput } from '../../hooks/useHitosCompra';

const ICON_OPTIONS = ['☕', '🍵', '🍰', '🥐', '🍽️', '🍪', '🍫', '🎂', '💎', '🏆', '🎁', '🥳', '🌟', '🍓', '🧋'];

interface MilestoneModalProps {
  hito: HitoCompra | null;
  canjeables: HitoProductoCanjeable[];
  isSaving: boolean;
  onSave: (input: HitoInput) => void;
  onClose: () => void;
}

const MilestoneModal: React.FC<MilestoneModalProps> = ({ hito, canjeables, isSaving, onSave, onClose }) => {
  const [numeroCompras, setNumeroCompras] = useState(hito?.numeroCompras ?? 10);
  const [idProductoCanjeable, setIdProductoCanjeable] = useState<number>(
    hito?.idProductoCanjeable ?? (canjeables[0]?.id ?? 0)
  );
  const [descripcion, setDescripcion] = useState(hito?.descripcion ?? '');
  const [icono, setIcono] = useState(hito?.icono ?? '☕');
  const [activo, setActivo] = useState(hito?.activo ?? true);

  const valid = descripcion.trim() && idProductoCanjeable > 0 && numeroCompras >= 1;

  const handleSubmit = () => {
    if (!valid) return;
    onSave({
      NumeroCompras: numeroCompras,
      Id_ProductoCanjeable: idProductoCanjeable,
      Descripcion: descripcion.trim(),
      Icono: icono,
      Activo: activo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          {hito ? 'Editar' : 'Nuevo'} Hito
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
              value={numeroCompras}
              onChange={e => setNumeroCompras(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">
              Producto canjeable <span className="text-red-400">*</span>
            </label>
            {canjeables.length === 0 ? (
              <p className="text-xs text-coffee-400 font-body">No hay productos canjeables activos.</p>
            ) : (
              <select
                value={idProductoCanjeable}
                onChange={e => setIdProductoCanjeable(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                {canjeables.map(pc => (
                  <option key={pc.id} value={pc.id}>
                    {pc.nombreProducto} — {pc.puntos} pts
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Descripción</label>
            <textarea
              placeholder="Ej: Café gratis en tu 10ma visita"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
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
                  type="button"
                  onClick={() => setIcono(ico)}
                  className={clsx(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                    icono === ico
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
              type="button"
              onClick={() => setActivo(!activo)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                activo ? 'bg-green-400' : 'bg-gray-200',
              )}
            >
              <span className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                activo ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || isSaving}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Guardando...' : hito ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const HitosPage: React.FC = () => {
  const { hitos, productosCanjeables, isLoading, isSaving, load, create, update, toggle, remove } = useHitosCompra();
  const [showModal, setShowModal] = useState(false);
  const [editingHito, setEditingHito] = useState<HitoCompra | null>(null);

  useEffect(() => { load(); }, [load]);

  const activeCount = hitos.filter(h => h.activo).length;

  const handleOpenModal = (hito?: HitoCompra) => {
    setEditingHito(hito ?? null);
    setShowModal(true);
  };

  const handleSave = async (input: HitoInput) => {
    try {
      if (editingHito) {
        await update(editingHito.id, input);
        toast.success('Hito actualizado', `${input.NumeroCompras} compras`);
      } else {
        await create(input);
        toast.success('Hito creado', `${input.NumeroCompras} compras`);
      }
      setShowModal(false);
      setEditingHito(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar el hito');
    }
  };

  const handleToggle = useCallback(async (hito: HitoCompra) => {
    try {
      await toggle(hito.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar estado');
    }
  }, [toggle]);

  const handleRemove = async (hito: HitoCompra) => {
    try {
      await remove(hito.id);
      toast.success('Hito eliminado', `${hito.numeroCompras} compras`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el hito');
    }
  };

  if (isLoading) {
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-6 py-5 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-56 h-56 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-36 h-36 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-sm">Fidelización</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white leading-tight mb-1">
              Hitos por{' '}
              <span className="text-yellow-300">compra</span>
            </h1>
            <p className="text-coffee-200 font-body text-xs">
              Recompensas automáticas al alcanzar cierto número de compras.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-coffee-200 px-3 py-2 rounded-xl text-xs font-body">
              <CheckCircle className="w-3.5 h-3.5" />
              {activeCount}/{hitos.length} activos
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo Hito</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center gap-2">
          <Target className="w-4 h-4 text-coffee-500" />
          <h2 className="font-display font-semibold text-coffee-900">Lista de hitos</h2>
          <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
            {hitos.length}
          </span>
        </div>

        {hitos.length === 0 ? (
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
            {hitos.map((hito, idx) => (
              <div
                key={hito.id}
                className={clsx(
                  'px-4 py-3 flex items-center gap-3 transition-colors',
                  !hito.activo && 'bg-gray-50/60',
                )}
              >
                {/* Icono + número */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-lg',
                    hito.activo ? 'bg-coffee-100' : 'bg-gray-100',
                  )}>
                    {hito.activo ? hito.icono : '⚫'}
                  </div>
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-body font-bold flex-shrink-0',
                    hito.activo ? 'bg-coffee-500 text-white' : 'bg-gray-300 text-gray-500',
                  )}>
                    #{hito.numeroCompras}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={clsx(
                      'font-body font-semibold text-sm',
                      hito.activo ? 'text-coffee-900' : 'text-coffee-400',
                    )}>
                      {hito.productoCanjeable.nombreProducto}
                    </span>
                    <span className="text-xs font-body text-coffee-400">{hito.productoCanjeable.puntos} pts</span>
                    {!hito.activo && (
                      <span className="text-xs font-body bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-body text-coffee-400 truncate">{hito.descripcion}</p>
                    <span className="text-xs font-body text-coffee-400 whitespace-nowrap hidden sm:inline">
                      {idx > 0 && <span className="text-coffee-300 mr-1">← {hitos[idx - 1].numeroCompras}</span>}
                      {hito.numeroCompras} compras
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(hito)}
                    disabled={isSaving}
                    className={clsx(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50',
                      hito.activo ? 'bg-green-400' : 'bg-gray-200',
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                      hito.activo ? 'translate-x-4' : 'translate-x-0.5',
                    )} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(hito)}
                    className="p-1.5 rounded-lg text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 transition-colors"
                    title="Editar"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(hito)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <MilestoneModal
          hito={editingHito}
          canjeables={productosCanjeables}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingHito(null); }}
        />
      )}
    </MainLayout>
  );
};
