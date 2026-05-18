import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Calendar, Plus, Settings, Star, Trash2 } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { usePromocionesTemporada, type PromocionTemporada, type ProductoCanjeableItem, type PromocionInput } from '../../hooks/usePromocionesTemporada';

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

function getMonth(isoDate: string): number {
  return new Date(isoDate).getMonth() + 1;
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

interface ModalProps {
  promo: PromocionTemporada | null;
  canjeables: ProductoCanjeableItem[];
  isSaving: boolean;
  onSave: (input: PromocionInput) => void;
  onClose: () => void;
}

const SeasonalPromotionModal: React.FC<ModalProps> = ({ promo, canjeables, isSaving, onSave, onClose }) => {
  const [nombre, setNombre] = useState(promo?.nombre ?? '');
  const [startDate, setStartDate] = useState(promo ? toDateInput(promo.fechaInicio) : '');
  const [endDate, setEndDate] = useState(promo ? toDateInput(promo.fechaFin) : '');
  const [activo, setActivo] = useState(promo?.activo ?? true);
  const [selectedIds, setSelectedIds] = useState<number[]>(
    promo?.productosCanjeables.map(pc => pc.id) ?? []
  );

  const toggleCanjeable = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!nombre.trim() || !startDate || !endDate) return;
    onSave({
      Nombre: nombre.trim(),
      FechaInicio: new Date(startDate).toISOString(),
      FechaFin: new Date(endDate).toISOString(),
      Activo: activo,
      IdsProductosCanjeables: selectedIds,
    });
  };

  const valid = nombre.trim() && startDate && endDate && selectedIds.length > 0;

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
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
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
            <label className="block text-xs font-body font-medium text-coffee-600 mb-2">
              Canjeables incluidos <span className="text-red-400">*</span>
            </label>
            {canjeables.length === 0 ? (
              <p className="text-xs text-coffee-400 font-body">No hay productos canjeables activos.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {canjeables.map(pc => (
                  <button
                    key={pc.id}
                    type="button"
                    onClick={() => toggleCanjeable(pc.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all border',
                      selectedIds.includes(pc.id)
                        ? 'bg-coffee-500 text-white border-coffee-500'
                        : 'bg-white text-coffee-600 border-coffee-200 hover:border-coffee-300',
                    )}
                  >
                    <span>{pc.nombreProducto}</span>
                    <span className="opacity-70">{pc.puntos}pts</span>
                  </button>
                ))}
              </div>
            )}
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
            {isSaving ? 'Guardando...' : promo ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PromocionesTemporadaPage: React.FC = () => {
  const { promociones, productosCanjeables, isLoading, isSaving, load, create, update, remove, toggle } = usePromocionesTemporada();
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromocionTemporada | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  useEffect(() => { load(); }, [load]);

  const currentMonth = new Date().getMonth() + 1;

  const filteredPromociones = useCallback(() => {
    if (!filterMonth) return promociones;
    return promociones.filter(p => getMonth(p.fechaInicio) === filterMonth);
  }, [promociones, filterMonth]);

  const availableMonths = [...new Set(promociones.map(p => getMonth(p.fechaInicio)))].sort((a, b) => a - b);

  const handleOpenModal = (promo?: PromocionTemporada) => {
    setEditingPromo(promo ?? null);
    setShowModal(true);
  };

  const handleSave = async (input: PromocionInput) => {
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
    } catch {
      toast.error('Error al guardar la promoción');
    }
  };

  const handleToggle = async (promo: PromocionTemporada) => {
    try {
      await toggle(promo);
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleRemove = async (promo: PromocionTemporada) => {
    try {
      await remove(promo.id);
      toast.success('Promoción eliminada', promo.nombre);
    } catch {
      toast.error('Error al eliminar la promoción');
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
          {filteredPromociones().map(promo => {
            const month = getMonth(promo.fechaInicio);
            const isCurrentMonth = month === currentMonth;

            return (
              <div
                key={promo.id}
                className={clsx(
                  'bg-white rounded-2xl border transition-all duration-200',
                  promo.activo ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100 opacity-70',
                )}
              >
                <div className="p-4 flex items-start gap-4">
                  <div className={clsx(
                    'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                    promo.activo ? 'bg-coffee-100' : 'bg-gray-100',
                  )}>
                    {MONTH_ICONS[month] ?? '📅'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-coffee-900">{promo.nombre}</span>
                      <span className={clsx(
                        'flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full',
                        promo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {promo.activo ? 'Activa' : 'Inactiva'}
                      </span>
                      {isCurrentMonth && promo.activo && (
                        <span className="flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          <Star className="w-3 h-3 fill-yellow-400" />
                          Este mes
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-body text-coffee-500 mb-2">
                      {MONTH_NAMES[month]} · {new Date(promo.fechaInicio).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} — {new Date(promo.fechaFin).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                    </p>

                    {promo.productosCanjeables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {promo.productosCanjeables.map(pc => (
                          <span key={pc.id} className="flex items-center gap-1 text-xs font-body bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded-full border border-coffee-100">
                            <span>{pc.nombreProducto}</span>
                            <span className="opacity-60">{pc.puntos}pts</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(promo)}
                      disabled={isSaving}
                      className={clsx(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50',
                        promo.activo ? 'bg-green-400' : 'bg-gray-200',
                      )}
                    >
                      <span className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                        promo.activo ? 'translate-x-6' : 'translate-x-1',
                      )} />
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenModal(promo)}
                        className="p-1.5 rounded-lg bg-coffee-50 text-coffee-600 hover:bg-coffee-100 transition-colors"
                        title="Editar"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(promo)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPromociones().length === 0 && (
            <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
              <Calendar className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
              <p className="text-sm font-body text-coffee-400">
                Sin promociones de temporada{filterMonth ? ` para ${MONTH_NAMES[filterMonth]}` : ''}
              </p>
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
          canjeables={productosCanjeables}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingPromo(null); }}
        />
      )}
    </MainLayout>
  );
};
