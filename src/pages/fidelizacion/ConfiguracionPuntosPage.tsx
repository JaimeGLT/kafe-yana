import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { Settings, Zap, TrendingUp, FlaskConical, Save, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast as _toast } from '../../components/ui/Toast';
import { usePuntosConfig, type Accelerator, type AcceleratorType, type PointsConfig } from '../../hooks/usePuntosConfig';

// ─── Simulator logic ──────────────────────────────────────────────────────────

interface SimBreakdownItem {
  label: string;
  value: number;
  type: AcceleratorType;
}

interface SimulatorResult {
  basePoints: number;
  breakdown: SimBreakdownItem[];
  total: number;
}

function calculatePoints(
  amount: number,
  isCombo: boolean,
  isBirthday: boolean,
  isHorasValle: boolean,
  config: PointsConfig
): SimulatorResult {
  if (!config.reglaBaseActiva) return { basePoints: 0, breakdown: [], total: 0 };

  const { bsPerPoint, accelerators } = config;
  const basePoints = bsPerPoint > 0 ? Math.floor(amount / bsPerPoint) : 0;

  const over100 = accelerators.find((a) => a.id === 'over100');
  const over100Wins = over100?.isActive && amount > 100;

  const applies = (acc: Accelerator): boolean => {
    if (!acc.isActive) return false;
    if (acc.id === 'birthday') return isBirthday;
    if (acc.id === 'over100') return amount > 100;
    if (acc.id === 'over70') return !over100Wins && amount > 70;
    if (acc.id === 'combo') return isCombo;
    if (acc.id === 'horas_valle') return isHorasValle;
    return false;
  };

  let multipliedPoints = basePoints;
  const breakdown: SimBreakdownItem[] = [];

  for (const acc of accelerators.filter((a) => a.type === 'multiplier')) {
    if (applies(acc)) {
      const extra = multipliedPoints * (acc.value - 1);
      multipliedPoints += extra;
      breakdown.push({ label: acc.name, value: extra, type: 'multiplier' });
    }
  }

  let bonusTotal = 0;
  for (const acc of accelerators.filter((a) => a.type === 'bonus')) {
    if (applies(acc)) {
      bonusTotal += acc.value;
      breakdown.push({ label: acc.name, value: acc.value, type: 'bonus' });
    }
  }

  return { basePoints, breakdown, total: multipliedPoints + bonusTotal };
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={clsx(
      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
      'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-coffee-400 focus:ring-offset-1',
      checked ? 'bg-coffee-500' : 'bg-gray-300'
    )}
  >
    <span
      className={clsx(
        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
        checked ? 'translate-x-4' : 'translate-x-0'
      )}
    />
  </button>
);

interface AcceleratorRowProps {
  acc: Accelerator;
  onToggle: (id: string, v: boolean) => void;
  onValue: (id: string, v: number) => void;
  onTimeChange: (id: string, field: 'startTime' | 'endTime', v: string) => void;
}

const AcceleratorRow: React.FC<AcceleratorRowProps> = ({ acc, onToggle, onValue, onTimeChange }) => {
  const isMult = acc.type === 'multiplier';
  const hasTime = acc.startTime !== undefined;

  return (
    <div
      className={clsx(
        'rounded-2xl border transition-all duration-200 overflow-hidden',
        acc.isActive
          ? isMult
            ? 'bg-violet-50 border-violet-200'
            : 'bg-emerald-50 border-emerald-200'
          : 'bg-coffee-50 border-coffee-100 opacity-60'
      )}
    >
      <div className="flex items-center gap-4 p-4">
        <Toggle checked={acc.isActive} onChange={(v) => onToggle(acc.id, v)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-body font-semibold text-coffee-900 text-sm leading-tight">
              {acc.name}
            </span>
            {isMult ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-display font-bold bg-violet-100 text-violet-700 border border-violet-200">
                ×{acc.value} multiplicador
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-display font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                +{acc.value} pts extra
              </span>
            )}
          </div>
          <p className="text-xs font-body text-coffee-400 mt-0.5 leading-snug">
            {acc.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={clsx('text-sm font-body font-semibold', isMult ? 'text-violet-500' : 'text-emerald-500')}>
            {isMult ? '×' : '+'}
          </span>
          <input
            type="number"
            min={isMult ? 2 : 1}
            max={isMult ? 10 : 50}
            step={1}
            value={acc.value}
            disabled={!acc.isActive}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) onValue(acc.id, v);
            }}
            className={clsx(
              'w-14 text-center rounded-xl border px-2 py-1.5 text-sm font-display font-bold',
              'focus:outline-none focus:ring-2 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-40',
              isMult
                ? 'border-violet-300 text-violet-700 bg-white focus:ring-violet-300 focus:border-violet-400'
                : 'border-emerald-300 text-emerald-700 bg-white focus:ring-emerald-300 focus:border-emerald-400'
            )}
          />
        </div>
      </div>

      {hasTime && (
        <div
          className={clsx(
            'flex items-center gap-3 px-4 pb-4 pt-0',
            acc.isActive ? '' : 'pointer-events-none'
          )}
        >
          <Clock className="w-3.5 h-3.5 text-coffee-400 flex-shrink-0" />
          <span className="text-xs font-body text-coffee-500">Horario:</span>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={acc.startTime}
              disabled={!acc.isActive}
              onChange={(e) => onTimeChange(acc.id, 'startTime', e.target.value)}
              className={clsx(
                'rounded-lg border border-emerald-300 px-2 py-1 text-xs font-display font-bold text-emerald-700 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            />
            <span className="text-xs font-body text-coffee-400">a</span>
            <input
              type="time"
              value={acc.endTime}
              disabled={!acc.isActive}
              onChange={(e) => onTimeChange(acc.id, 'endTime', e.target.value)}
              className={clsx(
                'rounded-lg border border-emerald-300 px-2 py-1 text-xs font-display font-bold text-emerald-700 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ConfigSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    <div className="bg-white rounded-2xl border border-coffee-100 h-40" />
    <div className="bg-white rounded-2xl border border-coffee-100 h-72" />
    <div className="bg-white rounded-2xl border border-coffee-100 h-64" />
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

export const ConfiguracionPuntosPage: React.FC = () => {
  const {
    config,
    setConfig,
    isLoading,
    isSavingReglaBase,
    isSavingAceleradores,
    isDirtyReglaBase,
    isDirtyAceleradores,
    saveReglaBase,
    saveAceleradores,
  } = usePuntosConfig();

  const [confirmSection, setConfirmSection] = React.useState<'base' | 'aceleradores' | null>(null);
  const [simAmount, setSimAmount] = React.useState(50);
  const [simIsCombo, setSimIsCombo] = React.useState(false);
  const [simIsBirthday, setSimIsBirthday] = React.useState(false);
  const [simIsHorasValle, setSimIsHorasValle] = React.useState(false);

  const simResult = useMemo(
    () => config ? calculatePoints(simAmount, simIsCombo, simIsBirthday, simIsHorasValle, config) : null,
    [simAmount, simIsCombo, simIsBirthday, simIsHorasValle, config]
  );

  const handleToggle = (id: string, v: boolean) =>
    setConfig((prev) => prev ? ({
      ...prev,
      accelerators: prev.accelerators.map((a) => (a.id === id ? { ...a, isActive: v } : a)),
    }) : prev);

  const handleValue = (id: string, v: number) =>
    setConfig((prev) => prev ? ({
      ...prev,
      accelerators: prev.accelerators.map((a) => (a.id === id ? { ...a, value: v } : a)),
    }) : prev);

  const handleTimeChange = (id: string, field: 'startTime' | 'endTime', v: string) =>
    setConfig((prev) => prev ? ({
      ...prev,
      accelerators: prev.accelerators.map((a) => (a.id === id ? { ...a, [field]: v } : a)),
    }) : prev);

  const handleConfirmSave = async () => {
    if (confirmSection === 'base') await saveReglaBase();
    else if (confirmSection === 'aceleradores') await saveAceleradores();
    setConfirmSection(null);
  };

  return (
    <MainLayout>
      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-yellow-300" />
            </div>
            <span className="font-accent text-cream-light text-lg">Fidelización</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
            Configuración de{' '}
            <span className="text-yellow-300">puntos</span>
          </h1>
          <p className="text-coffee-200 font-body text-sm">
            Define cómo se acumulan los puntos en cada compra
          </p>
        </div>
      </div>

      {isLoading || !config || !simResult ? (
        <ConfigSkeleton />
      ) : (
        <div className="space-y-5">
          {/* ═══════════════════════ SECCIÓN 1: REGLA BASE ═══════════════════════ */}
          <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
            <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-coffee-500" />
                <h2 className="font-display font-semibold text-coffee-900">
                  Regla base de acumulación
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  checked={config.reglaBaseActiva}
                  onChange={(v) => setConfig((prev) => prev ? { ...prev, reglaBaseActiva: v } : prev)}
                />
                <span className={clsx(
                  'flex items-center gap-1 text-xs font-body font-bold px-2.5 py-0.5 rounded-full',
                  config.reglaBaseActiva
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                )}>
                  {config.reglaBaseActiva ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {config.reglaBaseActiva ? 'Activa' : 'Inactiva'}
                </span>
                <button
                  onClick={() => setConfirmSection('base')}
                  disabled={!isDirtyReglaBase || isSavingReglaBase}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-body font-semibold text-xs transition-all duration-200',
                    isDirtyReglaBase && !isSavingReglaBase
                      ? 'bg-coffee-700 text-white hover:bg-coffee-800 shadow-sm'
                      : 'bg-coffee-100 text-coffee-300 cursor-not-allowed'
                  )}
                >
                  <Save className="w-3 h-3" />
                  {isSavingReglaBase ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="max-w-md">
                <p className="text-sm font-body text-coffee-600 mb-4">
                  Por cada{' '}
                  <span className="font-bold text-coffee-900">Bs.</span>{' '}
                  _____ el cliente gana 1 punto
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-body font-semibold text-coffee-600">Bs.</span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={1}
                    value={config.bsPerPoint}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0)
                        setConfig((prev) => prev ? { ...prev, bsPerPoint: v } : prev);
                    }}
                    className="w-24 text-center rounded-xl border border-coffee-200 px-3 py-2 text-xl font-display font-bold text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-400 focus:border-coffee-400 transition-colors"
                  />
                  <span className="text-sm font-body font-semibold text-coffee-600">= 1 punto</span>
                </div>

                <p className="mt-3 text-xs font-body text-coffee-400 bg-coffee-50 px-3 py-2 rounded-xl border border-coffee-100">
                  Ejemplo: si pones{' '}
                  <strong className="text-coffee-700">{config.bsPerPoint}</strong>, una compra de Bs.{' '}
                  <strong className="text-coffee-700">{config.bsPerPoint * 5}</strong> genera{' '}
                  <strong className="text-coffee-700">5 puntos</strong>
                </p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════ SECCIÓN 2: ACELERADORES ═══════════════════════ */}
          <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
            <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div>
                  <h2 className="font-display font-semibold text-coffee-900">
                    Aceleradores de puntos
                  </h2>
                  <p className="text-xs font-body text-coffee-400 mt-0.5">
                    Condiciones especiales que multiplican o suman puntos extra
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-xs font-body">
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold border border-violet-200">×N</span>
                    <span className="text-coffee-400">Multiplica</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">+N</span>
                    <span className="text-coffee-400">Suma extra</span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmSection('aceleradores')}
                  disabled={!isDirtyAceleradores || isSavingAceleradores}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-body font-semibold text-xs transition-all duration-200',
                    isDirtyAceleradores && !isSavingAceleradores
                      ? 'bg-coffee-700 text-white hover:bg-coffee-800 shadow-sm'
                      : 'bg-coffee-100 text-coffee-300 cursor-not-allowed'
                  )}
                >
                  <Save className="w-3 h-3" />
                  {isSavingAceleradores ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {config.accelerators.map((acc) => (
                <AcceleratorRow
                  key={acc.apiId}
                  acc={acc}
                  onToggle={handleToggle}
                  onValue={handleValue}
                  onTimeChange={handleTimeChange}
                />
              ))}
            </div>
          </div>

          {/* ═══════════════════════ SECCIÓN 3: SIMULADOR ═══════════════════════ */}
          <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
            <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-coffee-500" />
                <div>
                  <h2 className="font-display font-semibold text-coffee-900">Simulador</h2>
                  <p className="text-xs font-body text-coffee-400 mt-0.5">
                    Prueba cómo quedaría la acumulación con los valores actuales
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-1.5">
                    Monto de la compra
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-coffee-200 px-3 py-2.5 focus-within:ring-2 focus-within:ring-coffee-400 focus-within:border-coffee-400 transition-colors">
                    <span className="text-sm font-body font-semibold text-coffee-500">Bs.</span>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={simAmount}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0) setSimAmount(v);
                      }}
                      className="flex-1 min-w-0 text-sm font-display font-bold text-coffee-900 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-1.5">
                    ¿Es combo?
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-coffee-200 px-3 py-2.5">
                    <Toggle checked={simIsCombo} onChange={setSimIsCombo} />
                    <span className="text-sm font-body font-semibold text-coffee-700">
                      {simIsCombo ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-1.5">
                    ¿Es cumpleaños?
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-coffee-200 px-3 py-2.5">
                    <Toggle checked={simIsBirthday} onChange={setSimIsBirthday} />
                    <span className="text-sm font-body font-semibold text-coffee-700">
                      {simIsBirthday ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-1.5">
                    ¿Hora valle?
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-coffee-200 px-3 py-2.5">
                    <Toggle checked={simIsHorasValle} onChange={setSimIsHorasValle} />
                    <span className="text-sm font-body font-semibold text-coffee-700">
                      {simIsHorasValle ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Indicadores automáticos por monto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {(() => {
                  const over100Acc = config.accelerators.find((a) => a.id === 'over100');
                  const over70Acc = config.accelerators.find((a) => a.id === 'over70');
                  const over100Triggered = (over100Acc?.isActive ?? false) && simAmount > 100;
                  const over70Triggered = (over70Acc?.isActive ?? false) && !over100Triggered && simAmount > 70;

                  return (
                    <>
                      <div>
                        <label className="block text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-1.5">
                          Compra mayor a Bs. 100
                          <span className="ml-1.5 text-coffee-300 font-normal normal-case">(automático)</span>
                        </label>
                        <div className={clsx(
                          'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors',
                          over100Triggered ? 'border-violet-200 bg-violet-50' : 'border-coffee-200 bg-white'
                        )}>
                          <span className={clsx(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            over100Triggered ? 'bg-violet-500' : 'bg-gray-300'
                          )} />
                          <span className={clsx(
                            'text-sm font-body font-semibold',
                            over100Triggered ? 'text-violet-700' : 'text-coffee-400'
                          )}>
                            {over100Triggered ? 'Aplicando' : simAmount > 100 && !over100Acc?.isActive ? 'Inactivo en config' : 'No aplica'}
                          </span>
                          {simAmount > 100 && (
                            <span className="ml-auto text-xs font-body text-coffee-400">Bs. {simAmount} &gt; 100</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-1.5">
                          Compra mayor a Bs. 70
                          <span className="ml-1.5 text-coffee-300 font-normal normal-case">(automático)</span>
                        </label>
                        <div className={clsx(
                          'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors',
                          over70Triggered ? 'border-emerald-200 bg-emerald-50' : 'border-coffee-200 bg-white'
                        )}>
                          <span className={clsx(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            over70Triggered ? 'bg-emerald-500' : 'bg-gray-300'
                          )} />
                          <span className={clsx(
                            'text-sm font-body font-semibold',
                            over70Triggered ? 'text-emerald-700' : 'text-coffee-400'
                          )}>
                            {over70Triggered
                              ? 'Aplicando'
                              : over100Triggered
                              ? 'Superado por >100'
                              : simAmount > 70 && !over70Acc?.isActive
                              ? 'Inactivo en config'
                              : 'No aplica'}
                          </span>
                          {simAmount > 70 && simAmount <= 100 && (
                            <span className="ml-auto text-xs font-body text-coffee-400">Bs. {simAmount} &gt; 70</span>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-coffee-800 to-coffee-600 p-5 text-white">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm font-body">
                    <span className="text-coffee-200">Puntos base</span>
                    <span className="font-display font-bold text-white">{simResult.basePoints}</span>
                  </div>

                  {simResult.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm font-body">
                      <span className="text-coffee-300 text-xs flex items-center gap-1">
                        <span
                          className={clsx(
                            'inline-flex px-1.5 py-0.5 rounded text-xs font-bold',
                            item.type === 'multiplier'
                              ? 'bg-violet-500/30 text-violet-200'
                              : 'bg-emerald-500/30 text-emerald-200'
                          )}
                        >
                          {item.type === 'multiplier' ? '×' : '+'}
                        </span>
                        {item.label}
                      </span>
                      <span
                        className={clsx(
                          'font-display font-bold',
                          item.type === 'multiplier' ? 'text-violet-300' : 'text-emerald-300'
                        )}
                      >
                        +{item.value}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-white/20 pt-2.5 mt-1" />

                  <div className="flex items-center justify-between">
                    <span className="font-body font-semibold text-coffee-100">Total de puntos</span>
                    <span className="font-display font-black text-3xl text-yellow-300">
                      {simResult.total}
                    </span>
                  </div>
                </div>

                {!config.reglaBaseActiva && (
                  <p className="mt-3 text-xs font-body text-red-300 text-center">
                    Regla base inactiva — no se generan puntos en ninguna compra
                  </p>
                )}
                {config.reglaBaseActiva && simResult.total === 0 && simAmount > 0 && (
                  <p className="mt-3 text-xs font-body text-coffee-300 text-center">
                    Con Bs. {simAmount} no se genera ningún punto (mínimo Bs. {config.bsPerPoint})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ CONFIRM MODAL ═══════════════════════ */}
      <Modal
        isOpen={confirmSection !== null}
        onClose={() => setConfirmSection(null)}
        title="Guardar cambios"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmSection(null)} disabled={isSavingReglaBase || isSavingAceleradores}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSave}
              isLoading={isSavingReglaBase || isSavingAceleradores}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Confirmar y guardar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-body text-amber-800">
              Los cambios aplicarán a todas las compras nuevas desde ahora.{' '}
              <strong>Las compras anteriores no se ven afectadas.</strong>
            </p>
          </div>
          <p className="text-sm font-body text-coffee-600">
            {confirmSection === 'base'
              ? '¿Confirmas que deseas guardar la nueva regla base de acumulación?'
              : '¿Confirmas que deseas guardar los cambios en los aceleradores?'}
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
};
