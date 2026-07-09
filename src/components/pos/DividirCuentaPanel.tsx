import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, ChevronDown, Check, Users, List, SlidersHorizontal, Minus, Plus, Printer, Receipt } from 'lucide-react';
import { PrintComandaModal, type PrintComandaData } from './PrintComandaModal';
import type { Customer, ItemCubiertoInput } from '../../types';
import { mapPaymentMethodToSinCode } from '../../lib/mappers/metodosPago';
import { FacturacionStepCard, esFacturacionValida } from './FacturacionStepCard';
import type { PagoParcialItem } from './PagoParcialPanel';

type SplitStep = 'modo' | 'configurar' | 'facturacion' | 'cobrar';
type SplitMode = 'partes_iguales' | 'por_items' | 'montos_libres';
type SplitPayMethod = 'cash' | 'transfer';

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

/**
 * Shape del body `DtoPagos` que va al backend (Sync 11).
 * Lista de líneas `{codigo SIN, monto}` + total. El backend agrupa
 * por código (suma los montos del mismo método) y rechaza códigos no
 * activos o no presentes en `CatMetodosPago`.
 */
interface PagosObject {
  lineas: Array<{ codigo: number; monto: number }>;
  total: number;
}

interface DividirCuentaPanelProps {
  mesaName: string;
  order: ReviewOrderItem[];
  mesaTotal: number;
  formatCurrency: (n: number) => string;
  onBack: () => void;
  /**
   * Callback cuando todas las cuentas están pagadas en modo NORMAL
   * (mesa completa). En modo parcial se llama `onPartialAllPaid` en su lugar.
   */
  onAllPaid: (pagos: PagosObject) => void;
  /**
   * Datos del cliente + facturación SIAT. Todos opcionales: en modo pago
   * parcial (con `itemsParciales` seteado) se salta el step de facturación,
   * por lo que ninguno de estos se necesita.
   */
  clientes?: Customer[];
  selectedClienteId?: string;
  onClienteChange?: (id: string) => void;
  qrImageUrl?: string | null;

  // ── Facturación (mismas props que PagoPanel) ──────────────────────────
  noFacturar?: boolean;
  onNoFacturarChange?: (v: boolean) => void;
  esSinNombre?: boolean;
  onEsSinNombreChange?: (v: boolean) => void;
  codigoTipoDocumento?: number;
  onCodigoTipoDocumentoChange?: (v: number) => void;
  numeroDocumento?: string;
  onNumeroDocumentoChange?: (v: string) => void;
  complemento?: string;
  onComplementoChange?: (v: string) => void;
  facturacionNombre?: string;
  onFacturacionNombreChange?: (v: string) => void;
  /**
   * Código SIN del país de origen del documento (1..211). Sólo se usa
   * cuando el tipo es CEX o PAS y NO hay cliente del dropdown.
   */
  paisOrigenCodigo?: number | null;
  onPaisOrigenCodigoChange?: (v: number | null) => void;
  /** Si el cliente seleccionado es "Consumidor Final" o no hay cliente. */
  clienteEsConsumidorFinal?: boolean;
  /** Si el cliente fue asignado del dropdown (omite verificación NIT). */
  clienteAsignadoDelDropdown?: boolean;

  // Búsqueda en backend desde Datos de facturación
  docSearchResults?: Customer[];
  docSearchLoading?: boolean;
  docSearchActive?: boolean;
  nombreSearchResults?: Customer[];
  nombreSearchLoading?: boolean;
  nombreSearchActive?: boolean;
  onAssignCustomerFromSearch?: (c: Customer) => void;
  onClearSearchResults?: () => void;

  // Form de "crear cliente nuevo" inline
  reviewShowNewCustomerForm?: boolean;
  onToggleReviewNewCustomerForm?: () => void;
  reviewNewCustomerName?: string;
  onReviewNewCustomerNameChange?: (v: string) => void;
  reviewNewCustomerPhone?: string;
  onReviewNewCustomerPhoneChange?: (v: string) => void;
  isCreatingCustomer?: boolean;
  /** Versión con callback (para reusar el de PagoPanel). */
  onCreateCustomerReview?: (nombre: string, celular: string, onCreated: (id: string) => void) => void;

  // ── Modo pago parcial (nuevo) ──────────────────────────────────────────
  /**
   * Si se setea, el panel opera en modo "pago parcial": sólo opera sobre
   * estos items (no sobre todo el pedido), el monto total es la suma de
   * los pendientes, y al confirmar se llama `onPartialAllPaid` con los
   * pagos agrupados + el `itemsCubiertos` (NO se emite factura SIAT).
   */
  itemsParciales?: PagoParcialItem[];
  /** Callback alternativo a `onAllPaid` para el modo parcial. */
  onPartialAllPaid?: (params: {
    pagos: PagosObject;
    itemsCubiertos: ItemCubiertoInput[];
  }) => Promise<void>;
  /** Modo inicial cuando se abre el panel en modo parcial. Si se setea,
   *  se salta el step `modo` y se entra directo a `configurar`. */
  initialMode?: SplitMode;
}


const PAY_LABEL: Record<SplitPayMethod, string> = { cash: 'Efectivo', transfer: 'QR' };
const PAY_METHODS: SplitPayMethod[] = ['cash', 'transfer'];

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
  clientes = [], selectedClienteId = '', onClienteChange = () => {}, qrImageUrl = null,
  // Facturación
  noFacturar = false, onNoFacturarChange = () => {},
  esSinNombre = false, onEsSinNombreChange = () => {},
  codigoTipoDocumento = 5, onCodigoTipoDocumentoChange = () => {},
  numeroDocumento = '', onNumeroDocumentoChange = () => {},
  complemento = '', onComplementoChange = () => {},
  facturacionNombre = '', onFacturacionNombreChange = () => {},
  paisOrigenCodigo = null, onPaisOrigenCodigoChange = () => {},
  clienteEsConsumidorFinal = true, clienteAsignadoDelDropdown = false,
  docSearchResults = [], docSearchLoading = false, docSearchActive = false,
  nombreSearchResults = [], nombreSearchLoading = false, nombreSearchActive = false,
  onAssignCustomerFromSearch = () => {}, onClearSearchResults = () => {},
  reviewShowNewCustomerForm = false, onToggleReviewNewCustomerForm = () => {},
  reviewNewCustomerName = '', onReviewNewCustomerNameChange = () => {},
  reviewNewCustomerPhone = '', onReviewNewCustomerPhoneChange = () => {},
  isCreatingCustomer = false, onCreateCustomerReview = () => {},
  // Pago parcial
  itemsParciales, onPartialAllPaid, initialMode,
}) => {
  const esParcial = Array.isArray(itemsParciales) && itemsParciales.length > 0;

  // En modo parcial, `itemsParciales` ya viene agregado por producto (una
  // entrada por producto, sumando cantidad/pendiente across todas las rondas
  // donde aparezca) — se construye orderEfectivo directamente desde ahí, sin
  // filtrar el `order` crudo por fila de ronda (que ya no calza 1:1 con
  // itemsParciales tras la agregación).
  const orderEfectivo: ReviewOrderItem[] = React.useMemo(() => {
    if (!esParcial) return order;
    return itemsParciales!.map(p => ({
      cartKey: p.cartKey,
      product: { name: p.product.name, tipo: p.product.tipo },
      precioFinal: p.precioFinal,
      quantity: p.quantity - p.cantidadPagada,
    }));
  }, [esParcial, order, itemsParciales]);

  const mesaTotalEfectivo: number = React.useMemo(() => {
    if (!esParcial) return mesaTotal;
    return itemsParciales!.reduce(
      (s, i) => s + i.precioFinal * (i.quantity - i.cantidadPagada),
      0,
    );
  }, [esParcial, mesaTotal, itemsParciales]);

  const stepInicial: SplitStep = esParcial && initialMode ? 'configurar' : 'modo';
  const [step, setStep] = useState<SplitStep>(stepInicial);
  const [mode, setMode] = useState<SplitMode>(initialMode ?? 'partes_iguales');

  // partes_iguales
  const [numPersonas, setNumPersonas] = useState(2);

  // por_items
  const [numCuentasPorItems, setNumCuentasPorItems] = useState(2);
  const [itemAssignments, setItemAssignments] = useState<Record<string, number>>(
    () => Object.fromEntries(orderEfectivo.map(i => [i.cartKey, 0]))
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
  const [printCuentaData, setPrintCuentaData] = useState<PrintComandaData | null>(null);

  const activeIdx = cuentas.findIndex(c => c.status === 'activo');
  const activaCuenta = activeIdx >= 0 ? cuentas[activeIdx] : null;
  const cashNum = parseFloat(cashInput.replace(',', '.')) || 0;
  const allPaid = cuentas.length > 0 && cuentas.every(c => c.status === 'pagado');

  const resetItemAssignments = () =>
    setItemAssignments(Object.fromEntries(orderEfectivo.map(i => [i.cartKey, 0])));

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
  const montoLibresDiff = parseFloat((mesaTotalEfectivo - montoLibresSum).toFixed(2));

  const canContinue = (() => {
    if (mode === 'por_items') {
      // En modo parcial, basta con que AL MENOS un item esté asignado
      // (los no asignados quedan como saldo pendiente).
      if (esParcial) return Object.values(itemAssignments).some(v => v > 0);
      // Modo normal: todos los items deben estar asignados.
      return Object.values(itemAssignments).every(v => v > 0);
    }
    if (mode === 'montos_libres') return Math.abs(montoLibresDiff) < 0.01;
    return true;
  })();

  const handleSelectMode = (m: SplitMode) => { setMode(m); setStep('configurar'); };

  const handleCrearCuentas = () => {
    let nuevas: CuentaDividida[] = [];

    if (mode === 'partes_iguales') {
      nuevas = buildIguales(numPersonas, mesaTotalEfectivo);
    } else if (mode === 'por_items') {
      nuevas = Array.from({ length: numCuentasPorItems }, (_, i) => {
        const keys = Object.entries(itemAssignments)
          .filter(([, acc]) => acc === i + 1)
          .map(([k]) => k);
        const assigned = orderEfectivo.filter(item => keys.includes(item.cartKey));
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

  /**
   * En modo parcial, después de cobrar todas las cuentas, vamos a un
   * step de confirmación simple (sin facturación SIAT) y al confirmar
   * se llama `onPartialAllPaid` con pagos agrupados + itemsCubiertos.
   *
   * `itemsCubiertos` siempre = la selección completa del usuario
   * (no se divide por cuenta); el split es sólo del lado del pago.
   *
   * En modo "por_items" parcial, sólo se incluyen los items asignados
   * a alguna cuenta (los no asignados quedan como saldo pendiente).
   */
  const computeItemsCubiertos = (): ItemCubiertoInput[] => {
    if (!esParcial) return [];
    if (mode === 'por_items') {
      const parcialMap = new Map(itemsParciales!.map(i => [i.cartKey, i]));
      return Object.entries(itemAssignments)
        .filter(([, acc]) => acc > 0)
        .map(([cartKey]) => {
          const p = parcialMap.get(cartKey)!;
          return { producto_id: p.productoId, cantidad: p.quantity - p.cantidadPagada };
        });
    }
    return itemsParciales!.map(p => ({
      producto_id: p.productoId,
      cantidad: p.quantity - p.cantidadPagada,
    }));
  };

  const handleCobrarCuenta = () => {
    if (!activaCuenta) return;
    if (payMethod === 'cash' && cashNum > 0 && cashNum < activaCuenta.monto) {
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
  };

  const handleContinuarAFacturacion = () => {
    setStep('facturacion');
  };

  const handleConfirmarFacturacion = () => {
    handleConfirmarVenta();
  };

  const handleConfirmarVenta = () => {
    // Sync 11: agrupar las cuentas por código SIN (varias líneas pueden
    // compartir método) y armar `DtoPagos.Lineas[]`.
    const acumuladoPorCodigo = new Map<number, number>();
    cuentas.forEach(c => {
      if (!c.tipoPago) return;
      const codigo = mapPaymentMethodToSinCode(c.tipoPago);
      acumuladoPorCodigo.set(codigo, (acumuladoPorCodigo.get(codigo) ?? 0) + c.monto);
    });
    const lineas = Array.from(acumuladoPorCodigo.entries()).map(([codigo, monto]) => ({
      codigo,
      monto,
    }));
    const pagos: PagosObject = { lineas, total: mesaTotalEfectivo };

    if (esParcial && onPartialAllPaid) {
      onPartialAllPaid({ pagos, itemsCubiertos: computeItemsCubiertos() });
      return;
    }
    onAllPaid(pagos);
  };

  const handlePrintCuenta = (cuenta: CuentaDividida) => {
    const items = cuenta.displayItems && cuenta.displayItems.length > 0
      ? cuenta.displayItems.map(item => ({
          cantidad: item.quantity,
          nombre: item.name,
          nota: '',
          ubicacion: 'principal' as const,
        }))
      : [{ cantidad: 1, nombre: `Cuenta ${cuenta.id}`, nota: formatCurrency(cuenta.monto), ubicacion: 'principal' as const }];
    setPrintCuentaData({
      mesaName,
      roundNumber: cuenta.id,
      rondaDesc: `Cuenta ${cuenta.id} · ${formatCurrency(cuenta.monto)}`,
      items,
    });
  };

  // Validación para habilitar "Siguiente" del paso facturación.
  // En modo "Con datos" se requiere tanto el nombre como el número de documento.
  const facturacionValida = esFacturacionValida({
    noFacturar, esSinNombre, numeroDocumento, facturacionNombre,
  });

  const headerBack =
    step === 'modo' ? onBack :
    step === 'configurar' ? (esParcial ? onBack : () => setStep('modo')) :
    step === 'cobrar' ? () => setStep('configurar') :
    () => setStep('cobrar');

  // Indicador de progreso: la secuencia real de pasos difiere si el modo
  // parcial saltea el step "modo" (siempre lo hace cuando llega con
  // `initialMode` ya elegido desde PagoParcialPanel).
  const stepsSecuencia: SplitStep[] = esParcial
    ? ['configurar', 'cobrar', 'facturacion']
    : ['modo', 'configurar', 'cobrar', 'facturacion'];
  const stepIndex = Math.max(0, stepsSecuencia.indexOf(step));

  return (
    <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      {/* Header */}
      <div className="bg-coffee-800 px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-4 w-4 text-cream" />
          </div>
          <div className="min-w-0">
            <p className="text-cream font-semibold text-sm leading-tight truncate">
              {esParcial ? 'Dividir pago parcial' : 'Dividir cuenta'} · {mesaName}
            </p>
            <p className="text-[10px] text-coffee-300">
              Paso {stepIndex + 1} de {stepsSecuencia.length}
            </p>
          </div>
        </div>
        <button
          onClick={headerBack}
          className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20 flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Indicador de progreso */}
      <div className="flex items-center gap-1.5 px-4 md:px-5 py-2 border-b border-coffee-100 flex-shrink-0">
        {stepsSecuencia.map((s, i) => (
          <div
            key={s}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= stepIndex ? 'bg-coffee-700' : 'bg-coffee-100',
            )}
          />
        ))}
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
                    {formatCurrency(mesaTotalEfectivo / numPersonas)}
                  </p>
                  <p className="text-xs text-coffee-400 mt-1">por persona · Total {formatCurrency(mesaTotalEfectivo)}</p>
                </div>
              </>
            )}

            {mode === 'por_items' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-coffee-700">Número de cuentas</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setNumCuentasPorItems(n => Math.max(2, n - 1)); resetItemAssignments(); }}
                      className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-lg font-bold text-coffee-900 w-6 text-center">{numCuentasPorItems}</span>
                    <button
                      onClick={() => { setNumCuentasPorItems(n => Math.min(10, n + 1)); resetItemAssignments(); }}
                      className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-700 hover:bg-coffee-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-coffee-400">
                  {esParcial
                    ? 'Toca el número para asignar cada ítem a una cuenta. Los ítems sin asignar quedan como saldo pendiente.'
                    : 'Toca el número para asignar cada ítem a una cuenta.'}
                </p>

                <div className="space-y-2">
                  {orderEfectivo.map(item => (
                    <div key={item.cartKey} className="flex items-center gap-3 p-3 bg-coffee-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-coffee-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-coffee-400">
                          ×{item.quantity} — {item.redeemRewardId ? 'Gratis' : formatCurrency(item.precioFinal * item.quantity)}
                        </p>
                      </div>
                      <button
                        onClick={() => cycleItemAssignment(item.cartKey)}
                        title={itemAssignments[item.cartKey] === 0 ? 'Sin asignar — toca para elegir cuenta' : undefined}
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
                    const total = orderEfectivo.filter(item => keys.includes(item.cartKey)).reduce((s, item) => s + item.precioFinal * item.quantity, 0);
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
                  <span className="font-bold text-coffee-900">{formatCurrency(mesaTotalEfectivo)}</span>
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
                        onWheel={e => e.currentTarget.blur()}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ))}
                </div>

                {Math.abs(montoLibresDiff) < 0.01 ? (
                  <p className="text-xs text-emerald-600 font-semibold text-center inline-flex items-center justify-center gap-1 w-full">
                    <Check className="h-3.5 w-3.5" /> Los montos cuadran
                  </p>
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

      {/* ── STEP: FACTURACIÓN (al final, después de cobrar todas las cuentas) ── */}
      {step === 'facturacion' && (
        <>
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4">
            <FacturacionStepCard
              clientes={clientes}
              selectedClienteId={selectedClienteId}
              onClienteChange={onClienteChange}
              noFacturar={noFacturar}
              onNoFacturarChange={onNoFacturarChange}
              esSinNombre={esSinNombre}
              onEsSinNombreChange={onEsSinNombreChange}
              codigoTipoDocumento={codigoTipoDocumento}
              onCodigoTipoDocumentoChange={onCodigoTipoDocumentoChange}
              numeroDocumento={numeroDocumento}
              onNumeroDocumentoChange={onNumeroDocumentoChange}
              complemento={complemento}
              onComplementoChange={onComplementoChange}
              facturacionNombre={facturacionNombre}
              onFacturacionNombreChange={onFacturacionNombreChange}
              paisOrigenCodigo={paisOrigenCodigo}
              onPaisOrigenCodigoChange={onPaisOrigenCodigoChange}
              clienteEsConsumidorFinal={clienteEsConsumidorFinal}
              clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
              docSearchResults={docSearchResults}
              docSearchLoading={docSearchLoading}
              docSearchActive={docSearchActive}
              nombreSearchResults={nombreSearchResults}
              nombreSearchLoading={nombreSearchLoading}
              nombreSearchActive={nombreSearchActive}
              onAssignCustomerFromSearch={onAssignCustomerFromSearch}
              onClearSearchResults={onClearSearchResults}
              reviewShowNewCustomerForm={reviewShowNewCustomerForm}
              onToggleReviewNewCustomerForm={onToggleReviewNewCustomerForm}
              reviewNewCustomerName={reviewNewCustomerName}
              onReviewNewCustomerNameChange={onReviewNewCustomerNameChange}
              reviewNewCustomerPhone={reviewNewCustomerPhone}
              onReviewNewCustomerPhoneChange={onReviewNewCustomerPhoneChange}
              isCreatingCustomer={isCreatingCustomer}
              onCreateCustomerReview={onCreateCustomerReview}
            />
          </div>

          <div className="flex-shrink-0 border-t border-coffee-100 px-5 py-4 flex gap-2">
            <button
              onClick={() => setStep('cobrar')}
              className="flex-1 sm:flex-none sm:px-4 py-3 rounded-2xl border-2 border-coffee-200 bg-white text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors"
            >
              ← Atrás
            </button>
            <button
              onClick={handleConfirmarFacturacion}
              disabled={!facturacionValida}
              className={clsx(
                'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
                facturacionValida
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg'
                  : 'bg-coffee-100 text-coffee-400 cursor-not-allowed',
              )}
              title={!facturacionValida ? 'Ingresa el nombre y el número de documento' : undefined}
            >
              <Check className="h-4 w-4" /> {esParcial ? 'Confirmar pago parcial' : 'Confirmar venta'}
            </button>
          </div>
        </>
      )}

      {/* ── STEP: COBRAR ── */}
      {step === 'cobrar' && (
        <>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          <div className="bg-coffee-50 rounded-xl p-3 flex justify-between text-sm mb-2">
            <span className="text-coffee-500">{cuentas.length} cuentas</span>
            <span className="font-bold text-coffee-900">{formatCurrency(mesaTotalEfectivo)}</span>
          </div>

          {/* Acordeón de productos para partes_iguales y montos_libres */}
          {(mode === 'montos_libres' || mode === 'partes_iguales') && (
            <div className="rounded-xl overflow-hidden border border-coffee-100">
              <button
                onClick={() => setShowOrderList(v => !v)}
                className="w-full flex justify-between items-center px-4 py-3 bg-coffee-50 text-sm text-coffee-700 font-semibold"
              >
                <span>Ver orden de productos</span>
                <ChevronDown className={clsx('h-4 w-4 transition-transform text-coffee-400', showOrderList && 'rotate-180')} />
              </button>
              {showOrderList && (
                <div className="px-4 py-3 space-y-1.5 border-t border-coffee-100">
                  {orderEfectivo.map(item => (
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
                cuenta.status === 'activo' && 'border-coffee-700 shadow-md',
                cuenta.status === 'pagado' && 'border-emerald-200 bg-emerald-50',
                cuenta.status === 'pendiente' && 'border-coffee-100 opacity-60',
              )}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-coffee-900">Cuenta {cuenta.id}</p>
                  <p className="text-xs text-coffee-500">{formatCurrency(cuenta.monto)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintCuenta(cuenta)}
                    className="h-7 w-7 rounded-lg bg-coffee-100 flex items-center justify-center text-coffee-500 hover:bg-coffee-200 transition-colors"
                    title="Imprimir esta cuenta"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  {cuenta.status === 'pagado' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-coffee-400">{PAY_LABEL[cuenta.tipoPago!]}</span>
                      <span className="flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
                        <Check className="h-3 w-3" /> Pagado
                      </span>
                    </div>
                  )}
                  {cuenta.status === 'activo' && (
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2.5 py-1">Activo</span>
                  )}
                  {cuenta.status === 'pendiente' && (
                    <span className="text-xs font-semibold bg-coffee-100 text-coffee-400 rounded-full px-2.5 py-1">Pendiente</span>
                  )}
                </div>
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
                <div className="px-4 pb-4 border-t border-coffee-100 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
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
                        onWheel={e => e.currentTarget.blur()}
                        className="w-full px-3 py-2.5 rounded-xl border border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {cashNum >= cuenta.monto && cashInput !== '' && (
                        <p className="text-xs text-coffee-500 mt-1 text-right">
                          Cambio: {formatCurrency(cashNum - cuenta.monto)}
                        </p>
                      )}
                      {cashError && <p className="text-xs text-red-500 mt-1">{cashError}</p>}
                    </div>
                  )}

                  {payMethod === 'transfer' && (
                    <div className="flex flex-col items-center gap-2">
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt="QR de pago"
                          className="w-40 h-40 object-contain rounded-xl border border-coffee-200 bg-coffee-50 p-2"
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-xl border-2 border-dashed border-coffee-200 bg-coffee-50 flex items-center justify-center">
                          <p className="text-xs text-coffee-400 text-center px-3">Sin imagen QR configurada</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleCobrarCuenta}
                    className="w-full py-3 rounded-xl bg-coffee-800 text-cream font-bold text-sm hover:bg-coffee-700 active:scale-95 transition-all"
                  >
                    Cobrar esta cuenta
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="h-4" />
        </div>

        {allPaid && (
          <div className="flex-shrink-0 border-t border-coffee-100 px-5 py-4">
            <button
              onClick={handleContinuarAFacturacion}
              className="w-full py-4 rounded-2xl font-bold text-base bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Continuar a facturación <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
        </>
      )}

      <PrintComandaModal
        data={printCuentaData}
        onClose={() => setPrintCuentaData(null)}
      />
    </div>
  );
};
