import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Users, Plus, Settings, UserPlus, Gift, Star, Clock, Copy, CheckCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';

interface ReferralConfig {
  id: string;
  referrerPoints: number;
  referredPoints: number;
  isActive: boolean;
}

interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerCode: string;
  referredId: string;
  referredName: string;
  referredCode: string;
  pointsAwarded: number;
  date: string;
}

const MOCK_CONFIG: ReferralConfig = {
  id: 'cfg1',
  referrerPoints: 50,
  referredPoints: 50,
  isActive: true,
};

const MOCK_REFERRAL_RECORDS: ReferralRecord[] = [
  { id: 'ref1', referrerId: 'c1', referrerName: 'Ana Quispe', referrerCode: 'ANA520', referredId: 'c4', referredName: 'Diego Vargas', referredCode: 'DIE030', pointsAwarded: 50, date: '2026-04-05T14:20:00Z' },
  { id: 'ref2', referrerId: 'c3', referrerName: 'Lucía Flores', referrerCode: 'LUC1120', referredId: 'c2', referredName: 'Carlos Mamani', referredCode: 'CAR150', pointsAwarded: 50, date: '2026-03-15T10:30:00Z' },
  { id: 'ref3', referrerId: 'c3', referrerName: 'Lucía Flores', referrerCode: 'LUC1120', referredId: 'c1', referredName: 'Ana Quispe', referredCode: 'ANA520', pointsAwarded: 50, date: '2026-02-20T09:00:00Z' },
];

interface ConfigModalProps {
  config: ReferralConfig;
  onSave: (c: ReferralConfig) => void;
  onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ config, onSave, onClose }) => {
  const [referrerPoints, setReferrerPoints] = useState(config.referrerPoints);
  const [referredPoints, setReferredPoints] = useState(config.referredPoints);
  const [isActive, setIsActive] = useState(config.isActive);

  const handleSubmit = () => {
    if (referrerPoints <= 0 || referredPoints <= 0) return;
    onSave({
      ...config,
      referrerPoints,
      referredPoints,
      isActive,
    });
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
                min={1}
                value={referrerPoints}
                onChange={e => setReferrerPoints(parseInt(e.target.value) || 0)}
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
                min={1}
                value={referredPoints}
                onChange={e => setReferredPoints(parseInt(e.target.value) || 0)}
                className="w-20 text-center rounded-xl border border-coffee-200 px-3 py-2 text-lg font-display font-bold text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
              <span className="text-sm font-body text-coffee-500">pts</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div>
              <p className="text-sm font-body font-semibold text-green-800">¿Cuántos puntos en total?</p>
              <p className="text-xs font-body text-green-600 mt-0.5">Ambos juntos reciben {referrerPoints + referredPoints} puntos por cada referido</p>
            </div>
            <div className="text-2xl font-display font-black text-green-600">
              {referrerPoints + referredPoints}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-coffee-700">Sistema de referidos activo</span>
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
            disabled={referrerPoints <= 0 || referredPoints <= 0}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReferidosPage: React.FC = () => {
  const [config, setConfig] = useState<ReferralConfig>(MOCK_CONFIG);
  const [records, setRecords] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    setRecords(MOCK_REFERRAL_RECORDS);
    setLoading(false);
  }, []);

  const handleSaveConfig = useCallback((newConfig: ReferralConfig) => {
    setConfig(newConfig);
    toast.success('Configuración guardada', `Referidor: ${newConfig.referrerPoints}pts / Referido: ${newConfig.referredPoints}pts`);
    setShowConfigModal(false);
  }, []);

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
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
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
            <span className="text-3xl font-display font-black text-coffee-900">{config.referrerPoints}</span>
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
            <span className="text-3xl font-display font-black text-coffee-900">{config.referredPoints}</span>
            <span className="text-sm font-body text-coffee-500">puntos</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-body font-semibold text-coffee-700">Total por referido</p>
              <p className="text-xs font-body text-coffee-400">Ambos juntos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-display font-black text-green-600">{config.referrerPoints + config.referredPoints}</span>
            <span className="text-sm font-body text-coffee-500">puntos</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center gap-2">
          <Users className="w-4 h-4 text-coffee-500" />
          <h2 className="font-display font-semibold text-coffee-900">Historial de referidos</h2>
          <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
            {records.length}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-coffee-300" />
            </div>
            <p className="font-display font-semibold text-coffee-700 mb-1">Sin referidos registrados</p>
            <p className="text-sm font-body text-coffee-400 mb-4">
              Los referidos aparecerán aquí cuando los clientes traigan nuevos clientes al programa
            </p>
          </div>
        ) : (
          <div className="divide-y divide-coffee-50">
            {records.map(record => (
              <div key={record.id} className="px-5 py-4 flex items-center gap-4 hover:bg-coffee-50/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-body font-semibold text-sm text-coffee-900">{record.referrerName}</span>
                    <span className="text-xs font-body text-coffee-400">refirió a</span>
                    <span className="font-body font-semibold text-sm text-coffee-900">{record.referredName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-body text-coffee-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(record.date).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />
                      <span className="font-mono">{record.referrerCode}</span>
                      {' → '}
                      <span className="font-mono">{record.referredCode}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                  <span className="font-display font-bold text-coffee-900">{record.pointsAwarded}</span>
                  <span className="text-xs font-body text-coffee-400">pts a cada uno</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfigModal && (
        <ConfigModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowConfigModal(false)}
        />
      )}
    </MainLayout>
  );
};