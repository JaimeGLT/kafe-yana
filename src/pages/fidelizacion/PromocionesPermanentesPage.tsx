import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Zap, Gift, Target, Plus, Settings, Trash2, CheckCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import {
  usePromocionesPermanentes,
  type PromocionPermanente,
  type PromocionPermanenteInput,
  type ProductoCanjeable,
  type TipoCondicion,
  type TipoRecompensa,
} from '../../hooks/usePromocionesPermanentes';

const CONDICION_OPTIONS: { value: TipoCondicion; label: string }[] = [
  { value: 'NCompras', label: 'N compras' },
  { value: 'MontoMinimo', label: 'Monto mínimo' },
  { value: 'Requeridos', label: 'Requeridos' },
];

const RECOMPENSA_OPTIONS: { value: TipoRecompensa; label: string }[] = [
  { value: 'PuntosExtra', label: 'Puntos extra' },
  { value: 'Descuento', label: 'Descuento (%)' },
  { value: 'ProductoGratis', label: 'Producto gratis' },
];

const CONDICION_ICONS: Record<TipoCondicion, string> = {
  NCompras: '☕',
  MontoMinimo: '💰',
  Requeridos: '🎯',
};

const CONDICION_LABELS: Record<TipoCondicion, string> = {
  NCompras: 'N compras',
  MontoMinimo: 'Monto mínimo',
  Requeridos: 'Requeridos',
};

const RECOMPENSA_LABELS: Record<TipoRecompensa, string> = {
  PuntosExtra: 'Puntos extra',
  Descuento: 'Descuento (%)',
  ProductoGratis: 'Producto gratis',
};

interface PromoModalProps {
  promo: PromocionPermanente | null;
  canjeables: ProductoCanjeable[];
  isSaving: boolean;
  onSave: (input: PromocionPermanenteInput) => void;
  onClose: () => void;
}

const PromoModal: React.FC<PromoModalProps> = ({ promo, canjeables, isSaving, onSave, onClose }) => {
  const [nombre, setNombre] = useState(promo?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(promo?.descripcion ?? '');
  const [tipoCondicion, setTipoCondicion] = useState<TipoCondicion>(promo?.tipoCondicion ?? 'NCompras');
  const [valorCondicion, setValorCondicion] = useState(promo?.valorCondicion ?? 1);
  const [tipoRecompensa, setTipoRecompensa] = useState<TipoRecompensa>(promo?.tipoRecompensa ?? 'PuntosExtra');
  const [valorRecompensa, setValorRecompensa] = useState(
    promo?.tipoRecompensa === 'ProductoGratis' ? 0 : (promo?.valorRecompensa ?? 1)
  );
  const [idProductoCanjeable, setIdProductoCanjeable] = useState<number | null>(
    promo?.id_ProductoCanjeable ?? (canjeables[0]?.id ?? null)
  );
  const [activo, setActivo] = useState(promo?.activo ?? true);

  const esProductoGratis = tipoRecompensa === 'ProductoGratis';

  const valid =
    nombre.trim() !== '' &&
    descripcion.trim() !== '' &&
    valorCondicion >= 1 &&
    (!esProductoGratis ? valorRecompensa >= 1 : true) &&
    (!esProductoGratis || (idProductoCanjeable !== null && idProductoCanjeable > 0));

  const handleTipoRecompensaChange = (tipo: TipoRecompensa) => {
    setTipoRecompensa(tipo);
    if (tipo === 'ProductoGratis') {
      setValorRecompensa(0);
      if (!idProductoCanjeable && canjeables[0]) {
        setIdProductoCanjeable(canjeables[0].id);
      }
    } else {
      setIdProductoCanjeable(null);
      if (valorRecompensa === 0) setValorRecompensa(1);
    }
  };

  const handleSubmit = () => {
    if (!valid) return;
    onSave({
      Nombre: nombre.trim(),
      Descripcion: descripcion.trim(),
      TipoCondicion: tipoCondicion,
      ValorCondicion: valorCondicion,
      TipoRecompensa: tipoRecompensa,
      ValorRecompensa: esProductoGratis ? 0 : valorRecompensa,
      Activo: activo,
      Id_ProductoCanjeable: esProductoGratis ? idProductoCanjeable : null,
    });
  };

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
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Nombre <span className="text-red-400">*</span></label>
            <input
              type="text"
              placeholder="Ej: Cliente frecuente"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Descripción <span className="text-red-400">*</span></label>
            <textarea
              placeholder="Ej: Por cada 5 compras gana puntos extra"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Tipo de condición</label>
              <select
                value={tipoCondicion}
                onChange={e => setTipoCondicion(e.target.value as TipoCondicion)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                {CONDICION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Valor condición <span className="text-red-400">*</span></label>
              <input
                type="number"
                min={1}
                value={valorCondicion}
                onChange={e => setValorCondicion(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Tipo de recompensa</label>
            <select
              value={tipoRecompensa}
              onChange={e => handleTipoRecompensaChange(e.target.value as TipoRecompensa)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              {RECOMPENSA_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {esProductoGratis ? (
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">
                Producto canjeable <span className="text-red-400">*</span>
              </label>
              {canjeables.length === 0 ? (
                <p className="text-xs text-coffee-400 font-body">No hay productos canjeables activos.</p>
              ) : (
                <select
                  value={idProductoCanjeable ?? ''}
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
          ) : (
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">
                Valor recompensa <span className="text-red-400">*</span>
                {tipoRecompensa === 'Descuento' && <span className="text-coffee-400 ml-1">(% descuento)</span>}
                {tipoRecompensa === 'PuntosExtra' && <span className="text-coffee-400 ml-1">(puntos)</span>}
              </label>
              <input
                type="number"
                min={1}
                value={valorRecompensa}
                onChange={e => setValorRecompensa(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          )}

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
            {isSaving ? 'Guardando...' : promo ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PromocionesPermanentesPage: React.FC = () => {
  const { promociones, productosCanjeables, isLoading, isSaving, load, create, update, toggle, remove } = usePromocionesPermanentes();
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromocionPermanente | null>(null);

  useEffect(() => { load(); }, [load]);

  const activeCount = promociones.filter(p => p.activo).length;

  const handleOpenModal = (promo?: PromocionPermanente) => {
    setEditingPromo(promo ?? null);
    setShowModal(true);
  };

  const handleSave = async (input: PromocionPermanenteInput) => {
    try {
      if (editingPromo) {
        await update(editingPromo.id, input);
        toast.success('Promoción actualizada', input.Nombre);
      } else {
        await create(input);
        toast.success('Promoción creada', input.Nombre);
      }
      setShowModal(false);
      setEditingPromo(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la promoción');
    }
  };

  const handleToggle = useCallback(async (promo: PromocionPermanente) => {
    try {
      await toggle(promo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar estado');
    }
  }, [toggle]);

  const handleRemove = async (promo: PromocionPermanente) => {
    try {
      await remove(promo.id);
      toast.success('Promoción eliminada', promo.nombre);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la promoción');
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
                <Zap className="w-4 h-4 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-sm">Fidelización</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white leading-tight mb-1">
              Promociones{' '}
              <span className="text-yellow-300">permanentes</span>
            </h1>
            <p className="text-coffee-200 font-body text-xs">
              Aceleradores de comportamiento. Siempre activos (puedes desactivarlos).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 text-coffee-200 px-3 py-2 rounded-xl text-xs font-body">
              <CheckCircle className="w-3.5 h-3.5" />
              {activeCount}/{promociones.length} activas
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Promo</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center gap-2">
          <Zap className="w-4 h-4 text-coffee-500" />
          <h2 className="font-display font-semibold text-coffee-900">Lista de promociones</h2>
          <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
            {promociones.length}
          </span>
        </div>

        {promociones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
              <Zap className="w-7 h-7 text-coffee-300" />
            </div>
            <p className="font-display font-semibold text-coffee-700 mb-1">Sin promociones permanentes</p>
            <p className="text-sm font-body text-coffee-400 mb-4">
              Crea promociones que se apliquen automáticamente cuando el cliente cumpla la condición
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coffee-500 text-white font-body font-semibold text-sm hover:bg-coffee-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primera promoción
            </button>
          </div>
        ) : (
          <div className="divide-y divide-coffee-50">
            {promociones.map(promo => (
              <div
                key={promo.id}
                className={clsx(
                  'px-4 py-3 flex items-center gap-3 transition-colors',
                  !promo.activo && 'bg-gray-50/60',
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                  promo.activo ? 'bg-coffee-100' : 'bg-gray-100',
                )}>
                  {promo.activo ? CONDICION_ICONS[promo.tipoCondicion] : '⚫'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={clsx(
                      'font-body font-semibold text-sm',
                      promo.activo ? 'text-coffee-900' : 'text-coffee-400',
                    )}>
                      {promo.nombre}
                    </span>
                    {!promo.activo && (
                      <span className="text-xs font-body bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactiva</span>
                    )}
                  </div>
                  <p className="text-xs font-body text-coffee-400 truncate mb-0.5">{promo.descripcion}</p>
                  <div className="flex flex-wrap gap-3 text-xs font-body">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-coffee-400" />
                      <span className="text-coffee-500">{CONDICION_LABELS[promo.tipoCondicion]} ({promo.valorCondicion})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Gift className="w-3 h-3 text-coffee-400" />
                      <span className="text-coffee-500">
                        {RECOMPENSA_LABELS[promo.tipoRecompensa]}
                        {promo.tipoRecompensa !== 'ProductoGratis' && ` (${promo.valorRecompensa})`}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(promo)}
                    disabled={isSaving}
                    className={clsx(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50',
                      promo.activo ? 'bg-green-400' : 'bg-gray-200',
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                      promo.activo ? 'translate-x-4' : 'translate-x-0.5',
                    )} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(promo)}
                    className="p-1.5 rounded-lg text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 transition-colors"
                    title="Editar"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(promo)}
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
        <PromoModal
          promo={editingPromo}
          canjeables={productosCanjeables}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingPromo(null); }}
        />
      )}
    </MainLayout>
  );
};
