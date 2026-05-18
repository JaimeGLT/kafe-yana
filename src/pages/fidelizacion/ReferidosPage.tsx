import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Users, Settings, UserPlus, Gift, Star, Clock, CheckCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { useReferidos, type ReferidosConfig, type ClienteOption, type ReferidoInput } from '../../hooks/useReferidos';

interface AddReferralModalProps {
  clientes: ClienteOption[];
  config: ReferidosConfig;
  isSaving: boolean;
  onSave: (input: ReferidoInput) => void;
  onClose: () => void;
}

const AddReferralModal: React.FC<AddReferralModalProps> = ({ clientes, config, isSaving, onSave, onClose }) => {
  const [idReferidor, setIdReferidor] = useState<number>(0);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [searchReferidor, setSearchReferidor] = useState('');

  const clientesFiltrados = searchReferidor.trim()
    ? clientes.filter(c => c.nombre.toLowerCase().includes(searchReferidor.toLowerCase()) || c.celular.includes(searchReferidor))
    : clientes;

  const valid = idReferidor > 0 && nombre.trim() && celular.trim();

  const handleSubmit = () => {
    if (!valid) return;
    onSave({
      Nombre: nombre.trim(),
      Celular: celular.trim(),
      Correo: correo.trim() || undefined,
      Estado: true,
      IdReferidor: idReferidor,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">Agregar Referido</h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Selecciona el cliente que refirió y registra el nuevo cliente.
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">
              Buscar referidor <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Nombre o celular..."
              value={searchReferidor}
              onChange={e => setSearchReferidor(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300 mb-1"
            />
            <select
              value={idReferidor}
              onChange={e => setIdReferidor(parseInt(e.target.value))}
              size={Math.min(5, clientesFiltrados.length + 1)}
              className="w-full px-3 py-2 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
            >
              <option value={0}>Seleccionar referidor...</option>
              {clientesFiltrados.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} — {c.celular}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-coffee-100 pt-4">
            <p className="text-xs font-body font-semibold text-coffee-600 mb-3">Nuevo cliente referido</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-body font-medium text-coffee-600 mb-1">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
                />
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-coffee-600 mb-1">
                  Celular <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="70012345"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
                />
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Correo</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
                />
              </div>
            </div>
          </div>

          {idReferidor > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-100">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 flex-shrink-0" />
              <p className="text-xs font-body text-yellow-700">
                Referidor recibe <strong>{config.PuntosReferidor} pts</strong> · Nuevo cliente recibe <strong>{config.PuntosReferido} pts</strong>
              </p>
            </div>
          )}
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
            {isSaving ? 'Registrando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfigModalProps {
  config: ReferidosConfig;
  isSaving: boolean;
  onSave: (input: Pick<ReferidosConfig, 'PuntosReferidor' | 'PuntosReferido' | 'Activo'>) => void;
  onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ config, isSaving, onSave, onClose }) => {
  const [puntosReferidor, setPuntosReferidor] = useState(config.PuntosReferidor);
  const [puntosReferido, setPuntosReferido] = useState(config.PuntosReferido);
  const [activo, setActivo] = useState(config.Activo);

  const handleSubmit = () => {
    onSave({ PuntosReferidor: puntosReferidor, PuntosReferido: puntosReferido, Activo: activo });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          Configurar Puntos de Referido
        </h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Define cuántos puntos reciben el referidor y el nuevo cliente
        </p>

        <div className="space-y-4 mb-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50 border border-coffee-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-coffee-500" />
              </div>
              <div>
                <p className="text-sm font-body font-semibold text-coffee-900">Puntos del referidor</p>
                <p className="text-xs font-body text-coffee-400">Quien refiere a un amigo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={puntosReferidor}
                onChange={e => setPuntosReferidor(parseInt(e.target.value) || 0)}
                className="w-20 text-center rounded-xl border border-coffee-200 px-3 py-2 text-lg font-display font-bold text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
              <span className="text-sm font-body text-coffee-500">pts</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50 border border-coffee-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-coffee-500" />
              </div>
              <div>
                <p className="text-sm font-body font-semibold text-coffee-900">Puntos del referido</p>
                <p className="text-xs font-body text-coffee-400">Nuevo cliente que se inscribe</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={puntosReferido}
                onChange={e => setPuntosReferido(parseInt(e.target.value) || 0)}
                className="w-20 text-center rounded-xl border border-coffee-200 px-3 py-2 text-lg font-display font-bold text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
              <span className="text-sm font-body text-coffee-500">pts</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div>
              <p className="text-sm font-body font-semibold text-green-800">Total por referido</p>
              <p className="text-xs font-body text-green-600 mt-0.5">Ambos juntos reciben {puntosReferidor + puntosReferido} puntos</p>
            </div>
            <div className="text-2xl font-display font-black text-green-600">
              {puntosReferidor + puntosReferido}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-coffee-700">Sistema de referidos activo</span>
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
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReferidosPage: React.FC = () => {
  const { config, historial, clientes, isLoading, isSaving, load, updateConfig, createReferido } = useReferidos();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { load(); }, [load]);

  const handleSaveConfig = useCallback(async (input: Pick<ReferidosConfig, 'PuntosReferidor' | 'PuntosReferido' | 'Activo'>) => {
    try {
      await updateConfig(input);
      toast.success('Configuración guardada', `Referidor: ${input.PuntosReferidor}pts / Referido: ${input.PuntosReferido}pts`);
      setShowConfigModal(false);
    } catch {
      toast.error('Error al guardar configuración');
    }
  }, [updateConfig]);

  const handleCreateReferido = useCallback(async (input: ReferidoInput) => {
    try {
      const res = await createReferido(input);
      toast.success('Referido registrado', `${input.Nombre} — ${res.puntosOtorgadosReferidor} pts al referidor`);
      setShowAddModal(false);
    } catch {
      toast.error('Error al registrar referido');
    }
  }, [createReferido]);

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
                <Users className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Fidelización</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
              <span className="text-yellow-300">Referidos</span>
            </h1>
            <p className="text-coffee-200 font-body text-sm">
              Premia a clientes que traen nuevos clientes al programa.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-body font-medium hover:bg-white/30 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configurar puntos
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!config?.Activo}
              title={!config?.Activo ? 'Programa de referidos inactivo' : undefined}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Agregar referido
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-coffee-500" />
            </div>
            <div>
              <p className="text-sm font-body font-semibold text-coffee-700">Referidor</p>
              <p className="text-xs font-body text-coffee-400">Puntos que recibe quien refiere</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-display font-black text-coffee-900">{config?.PuntosReferidor ?? '—'}</span>
            <span className="text-sm font-body text-coffee-500">puntos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-coffee-500" />
            </div>
            <div>
              <p className="text-sm font-body font-semibold text-coffee-700">Referido</p>
              <p className="text-xs font-body text-coffee-400">Puntos que recibe el nuevo cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-display font-black text-coffee-900">{config?.PuntosReferido ?? '—'}</span>
            <span className="text-sm font-body text-coffee-500">puntos</span>
          </div>
        </div>

        <div className={clsx(
          'rounded-2xl border shadow-coffee p-5',
          config?.Activo ? 'bg-white border-coffee-100' : 'bg-gray-50 border-gray-200',
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              config?.Activo ? 'bg-green-100' : 'bg-gray-100',
            )}>
              <CheckCircle className={clsx('w-5 h-5', config?.Activo ? 'text-green-500' : 'text-gray-400')} />
            </div>
            <div>
              <p className="text-sm font-body font-semibold text-coffee-700">Estado del programa</p>
              <p className="text-xs font-body text-coffee-400">Total por referido</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'text-3xl font-display font-black',
              config?.Activo ? 'text-green-600' : 'text-gray-400',
            )}>
              {config ? config.PuntosReferidor + config.PuntosReferido : '—'}
            </span>
            <span className="text-sm font-body text-coffee-500">
              {config?.Activo ? 'pts totales' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center gap-2">
          <Users className="w-4 h-4 text-coffee-500" />
          <h2 className="font-display font-semibold text-coffee-900">Historial de referidos</h2>
          <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
            {historial.length}
          </span>
        </div>

        {historial.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-coffee-300" />
            </div>
            <p className="font-display font-semibold text-coffee-700 mb-1">Sin referidos registrados</p>
            <p className="text-sm font-body text-coffee-400">
              Los referidos aparecerán aquí cuando los clientes traigan nuevos clientes al programa
            </p>
          </div>
        ) : (
          <div className="divide-y divide-coffee-50">
            {historial.map(record => (
              <div key={record.id} className="px-5 py-4 flex items-center gap-4 hover:bg-coffee-50/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-body font-semibold text-sm text-coffee-900">{record.nombreReferidor}</span>
                    <span className="text-xs font-body text-coffee-400">refirió a</span>
                    <span className="font-body font-semibold text-sm text-coffee-900">{record.nombreReferido}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-body text-coffee-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(record.fecha).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-xs font-body">
                  <div className="flex items-center gap-1 text-coffee-600">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
                    <span className="font-semibold">{record.puntosReferidor}</span>
                    <span className="text-coffee-400">ref.</span>
                  </div>
                  <div className="flex items-center gap-1 text-coffee-600">
                    <Star className="w-3.5 h-3.5 text-blue-400 fill-blue-300" />
                    <span className="font-semibold">{record.puntosReferido}</span>
                    <span className="text-coffee-400">nuevo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && config && (
        <AddReferralModal
          clientes={clientes}
          config={config}
          isSaving={isSaving}
          onSave={handleCreateReferido}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showConfigModal && config && (
        <ConfigModal
          config={config}
          isSaving={isSaving}
          onSave={handleSaveConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </MainLayout>
  );
};
