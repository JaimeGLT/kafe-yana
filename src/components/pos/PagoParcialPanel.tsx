import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { X, Receipt, Check, Minus, Plus, Banknote, QrCode, CreditCard, Wallet, User, Users, List, SlidersHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';
import { ProductImage } from '../ui/ProductImage';
import { formatOpcionLabel } from '../../utils/opcionUtils';
import { mapPaymentMethodToSinCode } from '../../lib/mappers/metodosPago';
import { roundMoney } from '../../utils/formatters';
import { useMetodosPago } from '../../hooks/useMetodosPago';
import type { MetodoPagoItem } from '../../lib/queries/catalogos';
import type { PaymentMethodType, ItemCubiertoInput, ProductTipo, OpcionSeleccionada, Customer } from '../../types';
import { FacturacionStepCard, esFacturacionValida } from './FacturacionStepCard';

/** Sub-modo de división al que se delega desde el modo "Dividir". */
export type PagoParcialDividirModo = 'partes_iguales' | 'por_items' | 'montos_libres';

interface PagoParcialItem {
  cartKey: string;
  /** Id del producto de catálogo (Producto.Id) — un item = un producto agregado
   *  across todas las rondas donde aparezca, no una fila de ronda individual.
   *  El backend hace el descuento FIFO internamente entre rondas. */
  productoId: number;
  product: { id: string; name: string; tipo: ProductTipo; image?: string };
  opciones?: OpcionSeleccionada[];
  quantity: number;
  precioFinal: number;
  cantidadPagada: number;
}

interface PagoParcialPanelProps {
  mesaName: string;
  items: PagoParcialItem[];
  mesaTotal: number;
  totalAbonado: number;
  saldo: number;
  formatCurrency: (n: number) => string;
  onBack: () => void;
  onConfirm: (params: {
    itemsCubiertos: ItemCubiertoInput[];
    pagoCodigoSin: number;
    paymentMethod: PaymentMethodType;
    cashReceived: number;
  }) => Promise<void>;
  /**
   * Callback cuando el usuario elige "Dividir entre varios", un sub-modo,
   * y ya seleccionó qué productos entran en esta subventa. El padre
   * (POSPage) cierra este modal y abre DividirCuentaPanel solo con esos
   * items — nunca con el pedido completo, para no romper la semántica de
   * "cobro parcial".
   */
  onAbrirDividir: (subModo: PagoParcialDividirModo, items: PagoParcialItem[]) => void;
  isProcessing: boolean;

  // ── Facturación (mismas props que DividirCuentaPanel / PagoPanel) ──────
  clientes: Customer[];
  selectedClienteId: string;
  onClienteChange: (id: string) => void;
  noFacturar: boolean;
  onNoFacturarChange: (v: boolean) => void;
  esSinNombre: boolean;
  onEsSinNombreChange: (v: boolean) => void;
  codigoTipoDocumento: number;
  onCodigoTipoDocumentoChange: (v: number) => void;
  numeroDocumento: string;
  onNumeroDocumentoChange: (v: string) => void;
  complemento: string;
  onComplementoChange: (v: string) => void;
  facturacionNombre: string;
  onFacturacionNombreChange: (v: string) => void;
  paisOrigenCodigo: number | null;
  onPaisOrigenCodigoChange: (v: number | null) => void;
  clienteEsConsumidorFinal: boolean;
  clienteAsignadoDelDropdown: boolean;
  docSearchResults: Customer[];
  docSearchLoading: boolean;
  docSearchActive: boolean;
  nombreSearchResults: Customer[];
  nombreSearchLoading: boolean;
  nombreSearchActive: boolean;
  onAssignCustomerFromSearch: (c: Customer) => void;
  onClearSearchResults: () => void;
  reviewShowNewCustomerForm: boolean;
  onToggleReviewNewCustomerForm: () => void;
  reviewNewCustomerName: string;
  onReviewNewCustomerNameChange: (v: string) => void;
  reviewNewCustomerPhone: string;
  onReviewNewCustomerPhoneChange: (v: string) => void;
  isCreatingCustomer: boolean;
  onCreateCustomerReview: (nombre: string, celular: string, onCreated: (id: string) => void) => void;
}

function iconForSinCode(codigo: number): React.ReactNode {
  if (codigo === 1) return <Banknote className="h-5 w-5" />;
  if (codigo === 7) return <QrCode className="h-5 w-5" />;
  if (codigo === 2) return <CreditCard className="h-5 w-5" />;
  return <Wallet className="h-5 w-5" />;
}

function labelForMetodo(m: MetodoPagoItem | { codigo: number; descripcion: string }): string {
  if (m.codigo === 1) return 'Efectivo';
  if (m.codigo === 7) return 'QR';
  if (m.codigo === 2) return 'Tarjeta';
  if (m.descripcion.length <= 12) return m.descripcion;
  const palabras = m.descripcion.toLowerCase().split(' ');
  return palabras.map(w => w.charAt(0).toUpperCase() + w.slice(1)).slice(0, 2).join(' ');
}

function sinCodigoToType(codigo: number): PaymentMethodType {
  if (codigo === 1) return 'cash';
  if (codigo === 7) return 'transfer';
  if (codigo === 2) return 'card';
  return 'cash';
}

export const PagoParcialPanel: React.FC<PagoParcialPanelProps> = ({
  mesaName,
  items,
  mesaTotal,
  totalAbonado,
  saldo,
  formatCurrency,
  onBack,
  onConfirm,
  onAbrirDividir,
  isProcessing,
  clientes, selectedClienteId, onClienteChange,
  noFacturar, onNoFacturarChange, esSinNombre, onEsSinNombreChange,
  codigoTipoDocumento, onCodigoTipoDocumentoChange,
  numeroDocumento, onNumeroDocumentoChange,
  complemento, onComplementoChange,
  facturacionNombre, onFacturacionNombreChange,
  paisOrigenCodigo, onPaisOrigenCodigoChange,
  clienteEsConsumidorFinal, clienteAsignadoDelDropdown,
  docSearchResults, docSearchLoading, docSearchActive,
  nombreSearchResults, nombreSearchLoading, nombreSearchActive,
  onAssignCustomerFromSearch, onClearSearchResults,
  reviewShowNewCustomerForm, onToggleReviewNewCustomerForm,
  reviewNewCustomerName, onReviewNewCustomerNameChange,
  reviewNewCustomerPhone, onReviewNewCustomerPhoneChange,
  isCreatingCustomer, onCreateCustomerReview,
}) => {
  const { items: metodosPago } = useMetodosPago();

  // Métodos disponibles para selección (default: efectivo + QR si el catálogo no llegó).
  const metodosParaUi = useMemo(() => {
    if (metodosPago.length === 0) {
      return [
        { codigo: 1, descripcion: 'EFECTIVO' },
        { codigo: 7, descripcion: 'TRANSFERENCIA BANCARIA' },
      ];
    }
    return metodosPago.map(m => ({ codigo: m.codigo, descripcion: m.descripcion }));
  }, [metodosPago]);

  // Estado de selección: cartKey → cantidad a pagar en este cobro.
  // Inicializado a 0. El usuario activa el item con checkbox y ajusta cantidad.
  //
  // IMPORTANTE: el padre (POSPage) debe pasar una `key` que cambie cuando
  // cambian los items o la cantidad de abonos, para forzar el re-mount y
  // resetear el state. Esto evita el linter `react-hooks/set-state-in-effect`
  // que se disparaba con el `useEffect` original.
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashReceived, setCashReceived] = useState('');
  // Modo del wizard: el cajero decide si cobra completo (1 método) o divide.
  const [modo, setModo] = useState<'pago_completo' | 'dividir'>('pago_completo');
  // Sub-modo de división: sólo aplica cuando `modo === 'dividir'`.
  const [subModo, setSubModo] = useState<PagoParcialDividirModo>('partes_iguales');
  // Step dentro de "pago_completo": items → facturación → confirmar.
  const [step, setStep] = useState<'items' | 'facturacion'>('items');

  const itemsPendientes = useMemo(
    () => items.filter(i => (i.quantity - i.cantidadPagada) > 0),
    [items],
  );

  const itemsPagados = useMemo(
    () => items.filter(i => (i.quantity - i.cantidadPagada) === 0 && i.cantidadPagada > 0),
    [items],
  );

  const totalSeleccionado = useMemo(() => {
    return roundMoney(Object.entries(seleccion).reduce((sum, [cartKey, qty]) => {
      const item = items.find(i => i.cartKey === cartKey);
      if (!item) return sum;
      return sum + item.precioFinal * qty;
    }, 0));
  }, [seleccion, items]);

  const totalUnidadesPendientes = useMemo(
    () => itemsPendientes.reduce((s, i) => s + (i.quantity - i.cantidadPagada), 0),
    [itemsPendientes],
  );
  const totalUnidadesSeleccionadas = useMemo(
    () => Object.values(seleccion).reduce((s, qty) => s + qty, 0),
    [seleccion],
  );
  const productosSeleccionadosCount = useMemo(
    () => Object.values(seleccion).filter(qty => qty > 0).length,
    [seleccion],
  );

  // Items realmente elegidos para esta subventa (con quantity = cantidad
  // seleccionada, cantidadPagada=0) — lo que se le pasa a DividirCuentaPanel
  // cuando el cajero usa "Dividir entre varios" dentro de un cobro parcial.
  const itemsParaDividir: PagoParcialItem[] = useMemo(
    () => items
      .filter(i => (seleccion[i.cartKey] ?? 0) > 0)
      .map(i => ({ ...i, quantity: seleccion[i.cartKey], cantidadPagada: 0 })),
    [items, seleccion],
  );

  const codigoSinSeleccionado = mapPaymentMethodToSinCode(paymentMethod);
  const cashNum = parseFloat(cashReceived) || 0;
  const cambio = Math.max(0, cashNum - totalSeleccionado);
  const cashSuficiente = paymentMethod !== 'cash' || cashNum === 0 || cashNum >= totalSeleccionado;
  const tieneSeleccion = totalSeleccionado > 0;
  const todosPendientesSeleccionados = itemsPendientes.length > 0 &&
    itemsPendientes.every(i => (seleccion[i.cartKey] ?? 0) >= (i.quantity - i.cantidadPagada));
  const facturacionValida = esFacturacionValida({
    noFacturar, esSinNombre, numeroDocumento, facturacionNombre,
  });

  const toggleItem = (cartKey: string) => {
    setSeleccion(prev => {
      const next = { ...prev };
      if (next[cartKey]) {
        delete next[cartKey];
      } else {
        next[cartKey] = 1;
      }
      return next;
    });
  };

  const setQty = (cartKey: string, qty: number) => {
    const item = items.find(i => i.cartKey === cartKey);
    if (!item) return;
    const pendiente = item.quantity - item.cantidadPagada;
    const clamped = Math.max(0, Math.min(pendiente, qty));
    setSeleccion(prev => ({ ...prev, [cartKey]: clamped }));
  };

  const handleConfirm = async () => {
    if (!tieneSeleccion) return;
    const itemsCubiertos: ItemCubiertoInput[] = Object.entries(seleccion)
      .filter(([, qty]) => qty > 0)
      .map(([cartKey, cantidad]) => {
        const item = items.find(i => i.cartKey === cartKey)!;
        return { producto_id: item.productoId, cantidad };
      });
    await onConfirm({
      itemsCubiertos,
      pagoCodigoSin: codigoSinSeleccionado,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? cashNum : 0,
    });
  };

  return (
    <div className="bg-white w-full sm:max-w-md md:max-w-3xl xl:max-w-4xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      {/* Header */}
      <div className="bg-coffee-800 px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Receipt className="h-4 w-4 text-cream" />
          </div>
          <div className="min-w-0">
            <p className="text-cream font-semibold text-sm leading-tight truncate">Cobro parcial · {mesaName}</p>
            <p className="text-[10px] text-coffee-300">
              {step === 'facturacion'
                ? 'Factura o no esta subventa'
                : modo === 'dividir' && tieneSeleccion ? 'Elige cómo dividir entre varios' : 'Selecciona los items a cobrar'}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Resumen superior (sticky) */}
      <div className="px-4 md:px-5 pt-3 pb-2.5 border-b border-coffee-100 flex-shrink-0 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] text-coffee-400 uppercase tracking-widest font-semibold">Total</p>
          <p className="text-sm font-bold text-coffee-700">{formatCurrency(mesaTotal)}</p>
        </div>
        <div>
          <p className="text-[9px] text-emerald-600 uppercase tracking-widest font-semibold">Pagado</p>
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalAbonado)}</p>
        </div>
        <div>
          <p className="text-[9px] text-amber-700 uppercase tracking-widest font-semibold">Saldo</p>
          <p className="text-sm font-bold text-amber-700">{formatCurrency(saldo)}</p>
        </div>
      </div>

      {step === 'items' && (
      <>
      {/* Cuerpo scrollable */}
      <div className="overflow-y-auto flex-1">
        {/* Items pendientes — visibles en ambos modos: el cajero primero
            elige QUÉ productos entran en este cobro, y recién después
            decide CÓMO cobrarlos (completo o dividido). */}
        <>
            {/* Items pendientes */}
            <div className="px-4 md:px-5 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">
                  Items pendientes ({itemsPendientes.length})
                </p>
                {itemsPendientes.length > 0 && (
                  <p className="text-[10px] font-bold text-coffee-500">
                    {totalUnidadesSeleccionadas}/{totalUnidadesPendientes} seleccionados
                  </p>
                )}
              </div>
          {itemsPendientes.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-sm font-bold text-emerald-700">No hay items pendientes</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Todos los items ya fueron pagados.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {itemsPendientes.map(item => {
                const pendiente = item.quantity - item.cantidadPagada;
                const selected = seleccion[item.cartKey] ?? 0;
                const checked = selected > 0;
                return (
                  <div
                    key={item.cartKey}
                    onClick={() => toggleItem(item.cartKey)}
                    className={clsx(
                      'flex items-start gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors cursor-pointer',
                      checked
                        ? 'bg-emerald-50/60 border-emerald-400 shadow-sm'
                        : 'bg-white border-coffee-100 hover:border-coffee-200',
                    )}
                  >
                    <div
                      className={clsx(
                        'h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                        checked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-coffee-300',
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                    <ProductImage
                      src={item.product.image}
                      tipo={item.product.tipo ?? 'comprado'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-coffee-900 line-clamp-1">{item.product.name}</p>
                        <span className={clsx(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0',
                          checked ? 'bg-emerald-100 text-emerald-700' : 'bg-coffee-100 text-coffee-500',
                        )}>
                          {selected}/{pendiente}
                        </span>
                      </div>
                      {item.opciones && item.opciones.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {item.opciones.map((o, oi) => (
                            <p key={oi} className="text-[11px] text-coffee-500">
                              <span className="font-medium text-coffee-600">{o.atributoNombre}:</span>{' '}
                              {formatOpcionLabel(o)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className={clsx(
                        'text-sm font-bold',
                        checked ? 'text-emerald-700' : 'text-coffee-900',
                      )}>
                        {formatCurrency(item.precioFinal * (checked ? selected : pendiente))}
                      </p>
                      {checked && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setQty(item.cartKey, selected - 1); }}
                            disabled={selected <= 1}
                            className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600 disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-coffee-900">{selected}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setQty(item.cartKey, selected + 1); }}
                            disabled={selected >= pendiente}
                            className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Items ya pagados (resumen) */}
        {itemsPagados.length > 0 && (
          <div className="px-4 md:px-5 pt-2 pb-3">
            <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
              Ya pagados ({itemsPagados.length})
            </p>
            <div className="rounded-lg overflow-hidden divide-y divide-coffee-100/60">
              {itemsPagados.map(item => (
                <div
                  key={item.cartKey}
                  className="flex items-center gap-2 px-3 py-1.5 bg-coffee-50/70 opacity-70"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs text-coffee-500 line-through line-clamp-1 flex-1 min-w-0">
                    {item.product.name}
                  </p>
                  <span className="text-[10px] text-coffee-400 flex-shrink-0">
                    ×{item.cantidadPagada}
                  </span>
                  <span className="text-xs font-medium text-emerald-600 flex-shrink-0">
                    {formatCurrency(item.precioFinal * item.cantidadPagada)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>

        {/* ── Selector de modo: Pago completo / Dividir ──
             Se decide DESPUÉS de elegir qué items entran (arriba), no antes. */}
        <div className="px-4 md:px-5 pt-1 pb-2 border-t border-coffee-100">
          <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2 mt-2">
            ¿Cómo se va a cobrar?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModo('pago_completo')}
              className={clsx(
                'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-semibold transition-all',
                modo === 'pago_completo'
                  ? 'bg-coffee-800 text-cream shadow-md ring-2 ring-coffee-600'
                  : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
              )}
            >
              <User className="h-5 w-5" />
              <span className="leading-tight text-center">Pago completo</span>
              <span className="text-[9px] opacity-70">1 persona</span>
            </button>
            <button
              type="button"
              onClick={() => setModo('dividir')}
              className={clsx(
                'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-semibold transition-all',
                modo === 'dividir'
                  ? 'bg-coffee-800 text-cream shadow-md ring-2 ring-coffee-600'
                  : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
              )}
            >
              <Users className="h-5 w-5" />
              <span className="leading-tight text-center">Dividir entre varios</span>
              <span className="text-[9px] opacity-70">2 a 10 personas</span>
            </button>
          </div>
        </div>

        {/* Método de pago — solo en modo "Pago completo" */}
        {modo === 'pago_completo' && (
        <div className="px-4 md:px-5 pt-2 pb-3 border-t border-coffee-100">
          <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2 mt-2">
            Método de pago
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {metodosParaUi.map((m, idx) => {
              const type = sinCodigoToType(m.codigo);
              const selected = paymentMethod === type;
              return (
                <button
                  key={`${m.codigo}-${idx}`}
                  type="button"
                  onClick={() => { setPaymentMethod(type); setCashReceived(''); }}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all [&_svg]:h-4 [&_svg]:w-4',
                    selected
                      ? 'bg-coffee-800 text-cream shadow-lg scale-[1.02]'
                      : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                  )}
                >
                  {iconForSinCode(m.codigo)}
                  <span className="leading-tight text-center text-[10px] truncate w-full">{labelForMetodo(m)}</span>
                </button>
              );
            })}
          </div>

          {paymentMethod === 'cash' && tieneSeleccion && (
            <div className="mt-3">
              <label className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">
                Efectivo recibido (Bs.)
              </label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 font-bold text-sm">Bs.</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border-2 border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 font-bold text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {cashNum > 0 && cashNum >= totalSeleccionado && (
                <div className="mt-2 flex justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-emerald-700">Vuelto</span>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(cambio)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {modo === 'dividir' && (
          <div className="px-4 md:px-5 pt-3 pb-4 space-y-3 border-t border-coffee-100">
            {itemsPendientes.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center text-xs text-amber-700">
                No hay items pendientes para dividir.
              </div>
            ) : !tieneSeleccion ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-bold text-amber-700">Selecciona los items a dividir</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  Marca arriba qué productos vas a dividir entre varios.
                </p>
              </div>
            ) : (
              <>
            <p className="text-sm text-coffee-600">
              Elige cómo quieres dividir el cobro de{' '}
              <span className="font-bold text-coffee-900">
                {productosSeleccionadosCount} producto{productosSeleccionadosCount !== 1 ? 's' : ''} seleccionado{productosSeleccionadosCount !== 1 ? 's' : ''}
              </span>{' '}
              ({formatCurrency(totalSeleccionado)}).
            </p>

            <button
              type="button"
              onClick={() => setSubModo('partes_iguales')}
              className={clsx(
                'w-full text-left p-3.5 rounded-2xl border-2 transition-colors',
                subModo === 'partes_iguales'
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-white border-coffee-200 hover:border-coffee-300',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  subModo === 'partes_iguales' ? 'bg-emerald-100' : 'bg-coffee-100',
                )}>
                  <Users className={clsx('h-5 w-5', subModo === 'partes_iguales' ? 'text-emerald-700' : 'text-coffee-700')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-coffee-900">Partes iguales</p>
                  <p className="text-xs text-coffee-500 mt-0.5">
                    N personas se reparten el total en partes iguales.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSubModo('por_items')}
              className={clsx(
                'w-full text-left p-3.5 rounded-2xl border-2 transition-colors',
                subModo === 'por_items'
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-white border-coffee-200 hover:border-coffee-300',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  subModo === 'por_items' ? 'bg-emerald-100' : 'bg-coffee-100',
                )}>
                  <List className={clsx('h-5 w-5', subModo === 'por_items' ? 'text-emerald-700' : 'text-coffee-700')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-coffee-900">Por ítems</p>
                  <p className="text-xs text-coffee-500 mt-0.5">
                    Asigna cada ítem a una persona. Los no asignados quedan pendientes.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSubModo('montos_libres')}
              className={clsx(
                'w-full text-left p-3.5 rounded-2xl border-2 transition-colors',
                subModo === 'montos_libres'
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-white border-coffee-200 hover:border-coffee-300',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0',
                  subModo === 'montos_libres' ? 'bg-emerald-100' : 'bg-coffee-100',
                )}>
                  <SlidersHorizontal className={clsx('h-5 w-5', subModo === 'montos_libres' ? 'text-emerald-700' : 'text-coffee-700')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-coffee-900">Montos libres</p>
                  <p className="text-xs text-coffee-500 mt-0.5">
                    Cada persona paga el monto que acuerden.
                  </p>
                </div>
              </div>
            </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer con total a cobrar y acciones */}
      <div className="flex-shrink-0 border-t border-coffee-100 bg-coffee-50/40">
        {modo === 'pago_completo' ? (
          <>
            <div className="px-4 md:px-5 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-coffee-400 uppercase tracking-widest font-semibold">
                  A cobrar
                </p>
                <p className="text-2xl font-display font-black text-coffee-900 leading-none">
                  {formatCurrency(totalSeleccionado)}
                </p>
                {tieneSeleccion && (
                  <p className="text-[11px] text-coffee-500 mt-0.5">
                    {totalUnidadesSeleccionadas} unidad{totalUnidadesSeleccionadas !== 1 ? 'es' : ''} de {productosSeleccionadosCount} producto{productosSeleccionadosCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {saldo - totalSeleccionado > 0 && tieneSeleccion && (
                <div className="text-right">
                  <p className="text-[10px] text-amber-700 uppercase tracking-widest font-semibold">
                    Saldo restante
                  </p>
                  <p className="text-base font-bold text-amber-700">
                    {formatCurrency(saldo - totalSeleccionado)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 px-4 md:px-5 py-3 border-t border-coffee-100">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 sm:flex-none sm:px-4 py-3 rounded-2xl border-2 border-coffee-200 bg-white text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setStep('facturacion')}
                disabled={!tieneSeleccion || !cashSuficiente}
                className={clsx(
                  'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
                  !tieneSeleccion || !cashSuficiente
                    ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg',
                )}
              >
                <span>{todosPendientesSeleccionados ? 'Cobrar todo y cerrar mesa' : 'Cobrar selección'}</span>
                <span className="opacity-70">·</span>
                <span>{formatCurrency(totalSeleccionado)}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="px-4 md:px-5 py-3 border-t border-coffee-100">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] text-coffee-400 uppercase tracking-widest font-semibold">
                A dividir entre varios
              </p>
              <p className="text-sm font-bold text-coffee-900">
                {formatCurrency(totalSeleccionado)}
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 sm:flex-none sm:px-4 py-3 rounded-2xl border-2 border-coffee-200 bg-white text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onAbrirDividir(subModo, itemsParaDividir)}
                disabled={!tieneSeleccion}
                className={clsx(
                  'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
                  !tieneSeleccion
                    ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
                    : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
                )}
              >
                Continuar a dividir
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {step === 'facturacion' && (
        <>
          <div className="overflow-y-auto flex-1 px-4 md:px-5 py-4 space-y-4">
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
          <div className="flex-shrink-0 border-t border-coffee-100 bg-coffee-50/40 flex gap-2.5 px-4 md:px-5 py-3">
            <button
              type="button"
              onClick={() => setStep('items')}
              className="flex-1 sm:flex-none sm:px-4 py-3 rounded-2xl border-2 border-coffee-200 bg-white text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors inline-flex items-center justify-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing || !facturacionValida}
              className={clsx(
                'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
                isProcessing || !facturacionValida
                  ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-lg',
              )}
            >
              {isProcessing ? 'Procesando...' : (
                <>
                  <Check className="h-4 w-4" /> Confirmar cobro · {formatCurrency(totalSeleccionado)}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export type { PagoParcialItem };
