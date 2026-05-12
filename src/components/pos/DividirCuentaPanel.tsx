import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, ChevronDown, Check, Users, List, SlidersHorizontal, Minus, Plus } from 'lucide-react';

type SplitStep = 'modo' | 'configurar' | 'cobrar';
type SplitMode = 'partes_iguales' | 'por_items' | 'montos_libres';
type SplitPayMethod = 'cash' | 'card' | 'transfer';

interface DisplayItem {
  name: string;
  quantity: number;
  monto: number;
}

interface CuentaDividida {
  id: number;
  monto: number;
  itemCartKeys?: string[];
  displayItems?: DisplayItem[];
  status: 'pendiente' | 'activo' | 'pagado';
  tipoPago?: SplitPayMethod;
  efectivoRecibido?: number;
}

interface ReviewOrderItem {
  cartKey: string;
  product: { name: string; tipo?: string };
  precioFinal: number;
  quantity: number;
  redeemRewardId?: string;
}

interface DividirCuentaPanelProps {
  mesaName: string;
  order: ReviewOrderItem[];
  mesaTotal: number;
  formatCurrency: (n: number) => string;
  onBack: () => void;
  onAllPaid: (tipoPago: number, efectivoRecibido: number) => void;
}

const TIPO_PAGO: Record<SplitPayMethod, number> = { cash: 1, transfer: 2, card: 3 };
const PAY_LABEL: Record<SplitPayMethod, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'QR' };
const PAY_METHODS: SplitPayMethod[] = ['cash', 'card', 'transfer'];

function buildIguales(n: number, total: number): CuentaDividida[] {
  const monto = Math.floor((total / n) * 100) / 100;
  const cuentas: CuentaDividida[] = Array.from({ length: n }, (_, i) => ({
    id: i + 1, monto, status: i === 0 ? 'activo' : 'pendiente',
  }));
  const sumExcept = cuentas.slice(0, -1).reduce((s, c) => s + c.monto, 0);
  cuentas[cuentas.length - 1].monto = parseFloat((total - sumExcept).toFixed(2));
  return cuentas;
}

export const DividirCuentaPanel: React.FC<DividirCuentaPanelProps> = ({
  mesaName, order, mesaTotal, formatCurrency, onBack, onAllPaid,
}) => {
  const [step, setStep] = useState<SplitStep>('modo');
  const [mode, setMode] = useState<SplitMode>('partes_iguales');

  // partes_iguales
  const [numPersonas, setNumPersonas] = useState(2);

  // por_items
  const [numCuentasPorItems, setNumCuentasPorItems] = useState(2);
  const [itemAssignments, setItemAssignments] = useState<Record<string, number>>(
    () => Object.fromEntries(order.map(i => [i.cartKey, 0]))
  );

  // montos_libres
  const [numCuentasLibres, setNumCuentasLibres] = useState(2);
  const [montosLibres, setMontosLibres] = useState(['', '']);

  // cobrar
  const [cuentas, setCuentas] = useState<CuentaDividida[]>([]);
  const [payMethod, setPayMethod] = useState<SplitPayMethod>('cash');
  const [cashInput, setCashInput] = useState('');
  const [cashError, setCashError] = useState('');
  const [showOrderList, setShowOrderList] = useState(false);

  const activeIdx = cuentas.findIndex(c => c.status === 'activo');
  const activaCuenta = activeIdx >= 0 ? cuentas[activeIdx] : null;
  const cashNum = parseFloat(cashInput.replace(',', '.')) || 0;

  const resetItemAssignments = (_n: number) =>
    setItemAssignments(Object.fromEntries(order.map(i => [i.cartKey, 0])));

  const cycleItemAssignment = (cartKey: string) => {
    setItemAssignments(prev => ({
      ...prev,
      [cartKey]: ((prev[cartKey] ?? 0) % numCuentasPorItems) + 1,
    }));
  };

  const resizeMontosLibres = (n: number) => {
    setNumCuentasLibres(n);
    setMontosLibres(prev => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push('');
      return next;
    });
  };

  const handleMontosLibresChange = (idx: number, value: string) => {
    setMontosLibres(prev => { const next = [...prev]; next[idx] = value; return next; });
  };

  const montoLibresSum = montosLibres.reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const montoLibresDiff = parseFloat((mesaTotal - montoLibresSum).toFixed(2));

  const canContinue = (() => {
    if (mode === 'por_items') return Object.values(itemAssignments).every(v => v > 0);
    if (mode === 'montos_libres') return Math.abs(montoLibresDiff) < 0.01;
    return true;
  })();

  const handleSelectMode = (m: SplitMode) => { setMode(m); setStep('configurar'); };

  const handleCrearCuentas = () => {
    let nuevas: CuentaDividida[] = [];

    if (mode === 'partes_iguales') {
      const base = buildIguales(numPersonas, mesaTotal);
      const sharedItems: DisplayItem[] = order.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        monto: parseFloat(((item.precioFinal * item.quantity) / numPersonas).toFixed(2)),
      }));
      nuevas = base.map(c => ({ ...c, displayItems: sharedItems }));
    } else if (mode === 'por_items') {
      nuevas = Array.from({ length: numCuentasPorItems }, (_, i) => {
        const keys = Object.entries(itemAssignments)
          .filter(([, acc]) => acc === i + 1)
          .map(([k]) => k);
        const assigned = order.filter(item => keys.includes(item.cartKey));
        const monto = assigned.reduce((s, item) => s + item.precioFinal * item.quantity, 0);
        const displayItems: DisplayItem[] = assigned.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          monto: item.precioFinal * item.quantity,
        }));
        return {
          id: i + 1,
          monto: parseFloat(monto.toFixed(2)),
          itemCartKeys: keys,
          displayItems,
          status: i === 0 ? 'activo' : 'pendiente',
        } as CuentaDividida;
      });
    } else {
      nuevas = montosLibres.map((v, i) => ({
        id: i + 1,
        monto: parseFloat(parseFloat(v || '0').toFixed(2)),
        status: i === 0 ? 'activo' : 'pendiente',
      } as CuentaDividida));
    }

    setCuentas(nuevas);
    setStep('cobrar');
  };

  const handleCobrarCuenta = () => {
    if (!activaCuenta) return;
    if (payMethod === 'cash' && cashNum < activaCuenta.monto) {
      setCashError('Efectivo insuficiente');
      return;
    }
    setCashError('');
    const efectivo = payMethod === 'cash' ? cashNum : 0;

    const nextCuentas = cuentas.map((c, i) =>
      i === activeIdx ? { ...c, status: 'pagado' as const, tipoPago: payMethod, efectivoRecibido: efectivo } : c
    );
    const nextPendingIdx = nextCuentas.findIndex(c => c.status === 'pendiente');
    if (nextPendingIdx >= 0) nextCuentas[nextPendingIdx] = { ...nextCuentas[nextPendingIdx], status: 'activo' };

    setCuentas(nextCuentas);
    setPayMethod('cash');
    setCashInput('');

    if (nextCuentas.every(c => c.status === 'pagado')) {
      const totalEfectivo = nextCuentas.reduce((s, c) => s + (c.efectivoRecibido ?? 0), 0);
      const methods = [...new Set(nextCuentas.map(c => c.tipoPago!))];
      const finalTipo = methods.length === 1 ? TIPO_PAGO[methods[0]] : 1;
      onAllPaid(finalTipo, totalEfectivo);
    }
  };

  const headerBack =
    step === 'modo' ? onBack :
    step === 'configurar' ? () => setStep('modo') :
    () => setStep('configurar');

  return (
    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-100 flex-shrink-0">
        <div>
          <p className="text-xs text-coffee-400 uppercase tracking-wide font-semibold">Dividir cuenta</p>
          <h3 className="font-display font-bold text-coffee-900 text-lg">{mesaName}</h3>
        </div>
        <button
          onClick={headerBack}
          className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-600 hover:bg-coffee-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* ── STEP: MODO ── */}
      {step === 'modo' && (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-sm text-coffee-500 mb-1">¿Cómo dividir?</p>

          <button
            onClick={() => handleSelectMode('partes_iguales')}
            className="w-full text-left p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 transition-colors relative"
          >
            <span className="absolute top-3 right-3 text-[10px] font-bold bg-emerald-500 text-white rounded-full px-2 py-0.5">
              Recomendado
            </span>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-semibold text-coffee-900">Partes iguales</p>
                <p className="text-xs text-coffee-500 mt-0.5">Elige cuántas personas. Se divide automáticamente.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectMode('por_items')}
            className="w-full text-left p-4 rounded-2xl border-2 border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
                <List className="h-5 w-5 text-coffee-700" />
              </div>
              <div>
                <p className="font-semibold text-coffee-900">Por ítems</p>
                <p className="text-xs text-coffee-500 mt-0.5">Asigna cada ítem a una cuenta distinta.</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelectMode('montos_libres')}
            className="w-full text-left p-4 rounded-2xl border-2 border-coffee-200 hover:border-coffee-400 hover:bg-coffee-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-coffee-100 flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="h-5 w-5 text-coffee-700" />
              </div>
              <div>
                <p className="font-semibold text-coffee-900">Montos libres</p>
                <p className="text-xs text-coffee-500 mt-0.5">Cada persona paga lo que acuerden.</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── STEP: CONFIGURAR ── */}
      {step === 'configurar' && (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4">

            {mode === 'partes_iguales' && (
              <>
                <p className="text-sm font-semibold text-coffee-700">¿Cuántas personas?</p>
                <div className="flex items-center justify-center gap-8 py-2">
                  <button
                    onClick={() => setNumPersonas(n => Math.max(2, n - 1))}
                    className="h-12 w-12 rounded-2xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200 active:scale-95 transition-all"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="text-5xl font-display font-bold text-coffee-900 w-16 text-center">{numPersonas}</span>
                  <button
                    onClick={() => setNumPersonas(n => Math.min(10, n + 1))}
                    className="h-12 w-12 rounded-2xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200 active:scale-95 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="bg-coffee-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-coffee-400 uppercase tracking-wide font-semibold">{numPersonas} personas</p>
                  <p className="text-3xl font-display font-bold text-coffee-900 mt-1">
                    {formatCurrency(mesaTotal / numPersonas)}
                  </p>
                  <p className="text-xs text-coffee-400 mt-1">por persona · Total {formatCurrency(mesaTotal)}</p>
                </div>
              </>
            )}

            {mode === 'por_items' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-coffee-700">Número de cuentas</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { const n = Math.max(2, numCuentasPorItems - 1); setNumCuentasPorItems(n); resetItemAssignments(n); }}
                      className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-lg font-bold text-coffee-900 w-6 text-center">{numCuentasPorItems}</span>
                    <button
                      onClick={() => { const n = Math.min(10, numCuentasPorItems + 1); setNumCuentasPorItems(n); resetItemAssignments(n); }}
                      className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-coffee-400">Toca el número para asignar cada ítem a una cuenta.</p>

                <div className="space-y-2">
                  {order.map(item => (
                    <div key={item.cartKey} className="flex items-center gap-3 p-3 bg-coffee-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-coffee-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-coffee-400">
                          ×{item.quantity} — {item.redeemRewardId ? 'Gratis' : formatCurrency(item.precioFinal * item.quantity)}
                        </p>
                      </div>
                      <button
                        onClick={() => cycleItemAssignment(item.cartKey)}
                        className={clsx(
                          'h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors',
                          itemAssignments[item.cartKey] === 0
                            ? 'bg-coffee-200 text-coffee-400'
                            : 'bg-coffee-800 text-cream'
                        )}
                      >
                        {itemAssignments[item.cartKey] === 0 ? '?' : itemAssignments[item.cartKey]}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: numCuentasPorItems }, (_, i) => {
                    const keys = Object.entries(itemAssignments).filter(([, acc]) => acc === i + 1).map(([k]) => k);
                    const total = order.filter(item => keys.includes(item.cartKey)).reduce((s, item) => s + item.precioFinal * item.quantity, 0);
                    return (
                      <div key={i} className="bg-coffee-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-coffee-400 font-semibold">Cuenta {i + 1}</p>
                        <p className="text-base font-bold text-coffee-900">{formatCurrency(total)}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {mode === 'montos_libres' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-coffee-700">Número de cuentas</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => resizeMontosLibres(Math.max(2, numCuentasLibres - 1))}
                      className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-lg font-bold text-coffee-900 w-6 text-center">{numCuentasLibres}</span>
                    <button
                      onClick={() => resizeMontosLibres(Math.min(10, numCuentasLibres + 1))}
                      className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-coffee-50 rounded-xl p-3 flex justify-between text-sm">
                  <span className="text-coffee-500">Total a dividir</span>
                  <span className="font-bold text-coffee-900">{formatCurrency(mesaTotal)}</span>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: numCuentasLibres }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-coffee-600 w-20 flex-shrink-0">Cuenta {i + 1}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={montosLibres[i] ?? ''}
                        onChange={e => handleMontosLibresChange(i, e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>

                {Math.abs(montoLibresDiff) < 0.01 ? (
                  <p className="text-xs text-emerald-600 font-semibold text-center">✓ Los montos cuadran</p>
                ) : montoLibresDiff > 0 ? (
                  <p className="text-xs text-amber-600 text-center">Falta {formatCurrency(montoLibresDiff)} por asignar</p>
                ) : (
                  <p className="text-xs text-red-500 text-center">Excede el total por {formatCurrency(Math.abs(montoLibresDiff))}</p>
                )}
              </>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-coffee-100 px-5 py-4">
            <button
              onClick={handleCrearCuentas}
              disabled={!canContinue}
              className={clsx(
                'w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2',
                canContinue
                  ? 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95'
                  : 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
              )}
            >
              Crear cuentas <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ── STEP: COBRAR ── */}
      {step === 'cobrar' && (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          <div className="bg-coffee-50 rounded-xl p-3 flex justify-between text-sm mb-2">
            <span className="text-coffee-500">{cuentas.length} cuentas</span>
            <span className="font-bold text-coffee-900">{formatCurrency(mesaTotal)}</span>
          </div>

          {/* Acordeón de productos solo para montos_libres */}
          {mode === 'montos_libres' && (
            <div className="rounded-xl overflow-hidden border border-coffee-100">
              <button
                onClick={() => setShowOrderList(v => !v)}
                className="w-full flex justify-between items-center px-4 py-3 bg-coffee-50 text-sm text-coffee-700 font-semibold"
              >
                <span>Productos de la orden</span>
                <ChevronDown className={clsx('h-4 w-4 transition-transform text-coffee-400', showOrderList && 'rotate-180')} />
              </button>
              {showOrderList && (
                <div className="px-4 py-3 space-y-1.5 border-t border-coffee-100">
                  {order.map(item => (
                    <div key={item.cartKey} className="flex justify-between text-xs text-coffee-500">
                      <span>{item.product.name} ×{item.quantity}</span>
                      <span className="font-semibold">
                        {item.redeemRewardId ? 'Gratis' : formatCurrency(item.precioFinal * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {cuentas.map((cuenta) => (
            <div
              key={cuenta.id}
              className={clsx(
                'rounded-2xl border-2 transition-all',
                cuenta.status === 'activo' && 'border-blue-400 shadow-md',
                cuenta.status === 'pagado' && 'border-emerald-200 bg-emerald-50',
                cuenta.status === 'pendiente' && 'border-coffee-100 opacity-60',
              )}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-coffee-900">Cuenta {cuenta.id}</p>
                  <p className="text-xs text-coffee-500">{formatCurrency(cuenta.monto)}</p>
                </div>
                {cuenta.status === 'pagado' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-coffee-400">{PAY_LABEL[cuenta.tipoPago!]}</span>
                    <span className="flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
                      <Check className="h-3 w-3" /> Pagado
                    </span>
                  </div>
                )}
                {cuenta.status === 'activo' && (
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 rounded-full px-2.5 py-1">Activo</span>
                )}
                {cuenta.status === 'pendiente' && (
                  <span className="text-xs font-semibold bg-coffee-100 text-coffee-400 rounded-full px-2.5 py-1">Pendiente</span>
                )}
              </div>

              {/* Lista de ítems por cuenta (partes_iguales y por_items) */}
              {cuenta.displayItems && cuenta.displayItems.length > 0 && (
                <div className="px-4 pb-3 space-y-1 border-t border-coffee-100 pt-2">
                  {cuenta.displayItems.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-coffee-500">
                      <span>{item.name} ×{item.quantity}</span>
                      <span className="font-semibold">{formatCurrency(item.monto)}</span>
                    </div>
                  ))}
                </div>
              )}

              {cuenta.status === 'activo' && (
                <div className="px-4 pb-4 border-t border-blue-100 pt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {PAY_METHODS.map(pm => (
                      <button
                        key={pm}
                        onClick={() => { setPayMethod(pm); setCashInput(''); setCashError(''); }}
                        className={clsx(
                          'py-2 rounded-xl text-xs font-bold transition-all',
                          payMethod === pm ? 'bg-coffee-800 text-cream' : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200'
                        )}
                      >
                        {PAY_LABEL[pm]}
                      </button>
                    ))}
                  </div>

                  {payMethod === 'cash' && (
                    <div>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Efectivo recibido"
                        value={cashInput}
                        onChange={e => { setCashInput(e.target.value); setCashError(''); }}
                        className="w-full px-3 py-2.5 rounded-xl border border-coffee-200 focus:border-blue-400 focus:outline-none text-coffee-900 text-sm"
                      />
                      {cashNum >= cuenta.monto && cashInput !== '' && (
                        <p className="text-xs text-coffee-500 mt-1 text-right">
                          Cambio: {formatCurrency(cashNum - cuenta.monto)}
                        </p>
                      )}
                      {cashError && <p className="text-xs text-red-500 mt-1">{cashError}</p>}
                    </div>
                  )}

                  <button
                    onClick={handleCobrarCuenta}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 active:scale-95 transition-all"
                  >
                    Cobrar esta cuenta
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="h-4" />
        </div>
      )}
    </div>
  );
};
