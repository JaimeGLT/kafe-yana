import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, X, Star, Plus, User, Search, Tag, RotateCcw, FileText, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { TIPOS_DOCUMENTO } from '../../types/sales';
import type { PaymentMethodType, Customer } from '../../types';
import { useNitVerification } from '../../hooks/useNitVerification';
import { TIPO_DOC_NIT, NIT_MAX_LENGTH } from '../../constants/facturacion';

interface DescuentoPreview {
  HayDescuentoDisponible: boolean;
  DescuentoRecomendado: {
    Nombre: string;
    PorcentajeDescuento: number;
    MontoDescuento: number;
    TotalConDescuento: number;
  } | null;
}

const PAYMENT_METHODS: { type: PaymentMethodType; label: string; icon: React.ReactNode }[] = [
  { type: 'cash',     label: 'Efectivo',  icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { type: 'card',     label: 'Tarjeta',   icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { type: 'transfer', label: 'QR', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> },
];

interface PointsPreview { totalPoints: number; bonusReasons: string[] }

interface PagoPanelProps {
  mesaName: string;
  mesaTotal: number;
  paymentMethod: PaymentMethodType;
  cashReceived: string;
  isProcessing: boolean;
  cashNum: number;
  change: number;
  pointsPreview: PointsPreview | null;
  formatCurrency: (n: number) => string;
  onPaymentMethodChange: (m: PaymentMethodType) => void;
  onCashReceivedChange: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  reviewClienteId: string | null;
  onReviewClienteChange: (id: string | null) => void;
  customers: Customer[];
  onCreateCustomer: (nombre: string, celular: string, onCreated: (id: string) => void) => void;
  isCreatingCustomer: boolean;
  reviewShowNewCustomerForm: boolean;
  onToggleReviewNewCustomerForm: () => void;
  reviewNewCustomerName: string;
  reviewNewCustomerPhone: string;
  onReviewNewCustomerNameChange: (v: string) => void;
  onReviewNewCustomerPhoneChange: (v: string) => void;
  // Búsqueda en backend desde Datos de facturación
  docSearchResults: Customer[];
  docSearchLoading: boolean;
  docSearchActive: boolean;
  nombreSearchResults: Customer[];
  nombreSearchLoading: boolean;
  nombreSearchActive: boolean;
  onAssignCustomerFromSearch: (c: Customer) => void;
  onClearSearchResults: () => void;
  qrImageUrl?: string | null;
  discountPreview?: DescuentoPreview | null;
  aplicarDescuento?: boolean;
  onAplicarDescuentoChange?: (v: boolean) => void;
  isLoadingDescuento?: boolean;
  // Facturación SIAT
  codigoTipoDocumento: number;
  numeroDocumento: string;
  complemento: string;
  facturacionNombre: string;
  onCodigoTipoDocumentoChange: (v: number) => void;
  onNumeroDocumentoChange: (v: string) => void;
  onComplementoChange: (v: string) => void;
  onFacturacionNombreChange: (v: string) => void;
  /** Si el cliente seleccionado es "Consumidor Final" o no hay cliente. */
  clienteEsConsumidorFinal?: boolean;
  /**
   * S/N — "Sin Nombre": factura con valor fiscal pero sin documento de identidad.
   * Internamente el frontend sigue enviando `codigoTipoDocumento=5 (NIT)` con
   * `numeroDocumento='0'` y `facturacionNombre` obligatorio (lo que el SIN acepta).
   */
  esSinNombre: boolean;
  onEsSinNombreChange: (v: boolean) => void;
  /**
   * "No facturar" — toggle excluyente con S/N. Si está activo, la venta se
   * registra internamente sin emitir factura al SIAT (factura=false en el body).
   */
  noFacturar: boolean;
  onNoFacturarChange: (v: boolean) => void;
}

export const PagoPanel: React.FC<PagoPanelProps> = ({
  mesaName,
  mesaTotal,
  paymentMethod,
  cashReceived,
  isProcessing,
  cashNum,
  pointsPreview,
  formatCurrency,
  onPaymentMethodChange,
  onCashReceivedChange,
  onBack,
  onConfirm,
  reviewClienteId,
  onReviewClienteChange,
  customers,
  onCreateCustomer,
  isCreatingCustomer,
  reviewShowNewCustomerForm,
  onToggleReviewNewCustomerForm,
  reviewNewCustomerName,
  reviewNewCustomerPhone,
  onReviewNewCustomerNameChange,
  onReviewNewCustomerPhoneChange,
  docSearchResults,
  docSearchLoading,
  docSearchActive,
  nombreSearchResults,
  nombreSearchLoading,
  nombreSearchActive,
  onAssignCustomerFromSearch,
  onClearSearchResults,
  qrImageUrl,
  discountPreview,
  aplicarDescuento = false,
  onAplicarDescuentoChange,
  isLoadingDescuento = false,
  codigoTipoDocumento,
  numeroDocumento,
  complemento,
  facturacionNombre,
  onCodigoTipoDocumentoChange,
  onNumeroDocumentoChange,
  onComplementoChange,
  onFacturacionNombreChange,
  clienteEsConsumidorFinal = false,
  esSinNombre,
  onEsSinNombreChange,
  noFacturar,
  onNoFacturarChange,
}) => {
  const selectedCliente = reviewClienteId ? customers.find(c => String(c.id) === reviewClienteId) : null;

  // Verificación de NIT (solo si el usuario tipea un NIT real, no CF ni S/N).
  const mostrarVerificacionNit =
    codigoTipoDocumento === TIPO_DOC_NIT && !clienteEsConsumidorFinal && numeroDocumento.trim() !== '0';
  const nitState = useNitVerification(mostrarVerificacionNit ? numeroDocumento : '');
  const efectivoTotal = aplicarDescuento && discountPreview?.DescuentoRecomendado
    ? discountPreview.DescuentoRecomendado.TotalConDescuento
    : mesaTotal;

  const handleCreateCustomer = () => {
    if (!reviewNewCustomerName.trim() || !reviewNewCustomerPhone.trim()) return;
    onCreateCustomer(reviewNewCustomerName.trim(), reviewNewCustomerPhone.trim(), (id) => {
      onReviewClienteChange(id);
      onReviewNewCustomerNameChange('');
      onReviewNewCustomerPhoneChange('');
      onToggleReviewNewCustomerForm();
    });
  };

  return (
    <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-cream" />
          </div>
          <div>
            <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Cobro de cuenta</p>
            <p className="text-cream font-semibold text-sm">{mesaName}</p>
          </div>
        </div>
        <button onClick={onBack} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        <div className="text-center py-2">
          <p className="text-xs text-coffee-400 uppercase tracking-widest font-semibold mb-1">Total a pagar</p>
          {aplicarDescuento && discountPreview?.DescuentoRecomendado ? (
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-2xl font-display font-bold text-coffee-400 line-through">{formatCurrency(mesaTotal)}</p>
              <p className="text-5xl font-display font-black text-emerald-600">{formatCurrency(efectivoTotal)}</p>
            </div>
          ) : (
            <p className="text-5xl font-display font-black text-coffee-900">{formatCurrency(mesaTotal)}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2">Cliente</p>
          {reviewShowNewCustomerForm ? (
            <div className="space-y-2.5 bg-coffee-50 rounded-xl p-3 border border-coffee-200">
              <p className="text-xs font-semibold text-amber-700">Nuevo cliente</p>
              <input
                type="text"
                placeholder="Nombre completo"
                value={reviewNewCustomerName}
                onChange={e => onReviewNewCustomerNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                placeholder="Celular"
                value={reviewNewCustomerPhone}
                onChange={e => onReviewNewCustomerPhoneChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={onToggleReviewNewCustomerForm}
                  className="flex-1 py-2 rounded-lg border border-coffee-200 text-coffee-600 text-xs font-semibold hover:bg-coffee-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={isCreatingCustomer || !reviewNewCustomerName.trim() || !reviewNewCustomerPhone.trim()}
                  className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:bg-coffee-200 disabled:text-coffee-400 transition-colors"
                >
                  {isCreatingCustomer ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400 pointer-events-none" />
                <select
                  value={reviewClienteId ?? ''}
                  onChange={e => onReviewClienteChange(e.target.value || null)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-coffee-200 text-sm text-coffee-900 focus:border-coffee-400 focus:outline-none appearance-none bg-white"
                >
                  {!reviewClienteId && <option value="">— Sin cliente —</option>}
                  {customers.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} · {c.puntos ?? 0} pts
                    </option>
                  ))}
                </select>
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400 pointer-events-none" />
              </div>
              <button
                onClick={onToggleReviewNewCustomerForm}
                className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-coffee-400 hover:text-amber-600 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Crear cliente nuevo
              </button>
              {selectedCliente && (
                <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-coffee-900">{selectedCliente.nombre}</p>
                    <p className="text-xs text-coffee-500">{selectedCliente.puntos ?? 0} puntos</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Descuento por promoción permanente */}
        {isLoadingDescuento ? (
          <div className="flex items-center gap-2 bg-coffee-50 rounded-xl px-3.5 py-2.5 border border-coffee-100">
            <RotateCcw className="h-4 w-4 text-coffee-400 animate-spin flex-shrink-0" />
            <p className="text-xs text-coffee-400">Verificando descuentos...</p>
          </div>
        ) : discountPreview?.HayDescuentoDisponible && discountPreview.DescuentoRecomendado ? (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">{discountPreview.DescuentoRecomendado.Nombre}</p>
                  <p className="text-[11px] text-emerald-600">
                    {discountPreview.DescuentoRecomendado.PorcentajeDescuento}% · ahorro {formatCurrency(discountPreview.DescuentoRecomendado.MontoDescuento)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onAplicarDescuentoChange?.(!aplicarDescuento)}
                className={clsx(
                  'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
                  aplicarDescuento ? 'bg-emerald-500' : 'bg-coffee-200',
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                  aplicarDescuento ? 'translate-x-5' : 'translate-x-0',
                )} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Datos de facturación — SIAT */}
        <div>
          <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Datos de facturación
          </p>

          {/* Toggle S/N — se desactiva visualmente cuando "No facturar" está activo. */}
          <button
            type="button"
            onClick={() => onEsSinNombreChange(!esSinNombre)}
            disabled={noFacturar}
            className={clsx(
              'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 text-left text-xs font-semibold transition-colors mb-2',
              esSinNombre
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : noFacturar
                  ? 'border-coffee-100 bg-coffee-50 text-coffee-300 cursor-not-allowed'
                  : 'border-coffee-200 bg-white text-coffee-700 hover:bg-coffee-50',
            )}
            title="Activa este toggle para emitir la factura como Consumidor Final sin documento de identidad."
          >
            <span className="flex items-center gap-2">
              <span className={clsx(
                'inline-block h-2 w-2 rounded-full',
                esSinNombre ? 'bg-amber-500' : noFacturar ? 'bg-coffee-200' : 'bg-coffee-300',
              )} />
              S/N — Sin Nombre (Consumidor Final)
            </span>
            <span className={clsx(
              'relative inline-block w-9 h-5 rounded-full transition-colors',
              esSinNombre ? 'bg-amber-500' : 'bg-coffee-200',
            )}>
              <span className={clsx(
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                esSinNombre ? 'translate-x-4' : 'translate-x-0',
              )} />
            </span>
          </button>

          {/* Toggle "No facturar" — excluyente con S/N. */}
          <button
            type="button"
            onClick={() => onNoFacturarChange(!noFacturar)}
            className={clsx(
              'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 text-left text-xs font-semibold transition-colors mb-2.5',
              noFacturar
                ? 'border-coffee-700 bg-coffee-800 text-cream'
                : 'border-coffee-200 bg-white text-coffee-700 hover:bg-coffee-50',
            )}
            title="Activa este toggle para registrar la venta sin emitir factura al SIAT."
          >
            <span className="flex items-center gap-2">
              <span className={clsx(
                'inline-block h-2 w-2 rounded-full',
                noFacturar ? 'bg-cream' : 'bg-coffee-300',
              )} />
              No facturar — solo registro de venta
            </span>
            <span className={clsx(
              'relative inline-block w-9 h-5 rounded-full transition-colors',
              noFacturar ? 'bg-cream' : 'bg-coffee-200',
            )}>
              <span className={clsx(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-transform',
                noFacturar ? 'bg-coffee-800 translate-x-4' : 'bg-white translate-x-0',
              )} />
            </span>
          </button>

          {esSinNombre ? (
            // S/N activo: el cajero no tipea nada fiscal. El backend recibe
            // el body con los 4 campos fiscales en null.
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-3.5 py-3 flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-semibold">Factura emitida como Consumidor Final</p>
                <p className="text-amber-700 mt-0.5">
                  NIT (5) · Documento <span className="font-mono">&quot;0&quot;</span> · Nombre
                  <span className="font-mono"> &quot;CONSUMIDOR FINAL&quot;</span>.
                </p>
              </div>
            </div>
          ) : noFacturar ? (
            // "No facturar" activo: la venta se registra sin factura SIAT.
            <div className="rounded-xl border-2 border-coffee-300 bg-coffee-50 px-3.5 py-3 flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-coffee-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-coffee-700 leading-relaxed">
                <p className="font-semibold">Venta sin factura</p>
                <p className="text-coffee-600 mt-0.5">
                  Se registrará la venta internamente sin emitir factura al SIAT.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <select
                value={codigoTipoDocumento}
                onChange={e => onCodigoTipoDocumentoChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-coffee-200 text-sm text-coffee-900 focus:border-coffee-400 focus:outline-none appearance-none bg-white"
              >
                {TIPOS_DOCUMENTO.map(t => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="N° de documento"
                  value={numeroDocumento}
                  onChange={e => onNumeroDocumentoChange(e.target.value)}
                  maxLength={NIT_MAX_LENGTH}
                  className="flex-1 px-3 py-2.5 rounded-xl border-2 border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  value={complemento}
                  onChange={e => onComplementoChange(e.target.value)}
                  maxLength={5}
                  className="w-28 px-3 py-2.5 rounded-xl border-2 border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="Nombre o apellido del cliente"
                value={facturacionNombre}
                onChange={e => onFacturacionNombreChange(e.target.value)}
                maxLength={120}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-coffee-200 text-sm text-coffee-900 placeholder:text-coffee-400 focus:border-coffee-400 focus:outline-none"
              />
              {mostrarVerificacionNit && nitState.kind === 'loading' && (
                <div className="flex items-center gap-1.5 text-xs text-coffee-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando NIT...
                </div>
              )}
              {mostrarVerificacionNit && nitState.kind === 'ok' && nitState.data.valido && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> NIT válido en el SIN
                </div>
              )}
              {mostrarVerificacionNit && nitState.kind === 'ok' && !nitState.data.valido && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <ShieldX className="h-3.5 w-3.5" /> NIT no encontrado en el SIN
                </div>
              )}
              {mostrarVerificacionNit && nitState.kind === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <ShieldX className="h-3.5 w-3.5" /> {nitState.message}
                </div>
              )}
              {/* Búsqueda en backend: muestra coincidencias del último campo tipeado
                  (N° de documento o Nombre o apellido) y permite asignar el cliente. */}
              {(docSearchLoading || nombreSearchLoading) && (
                <div className="flex items-center gap-1.5 text-xs text-coffee-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando cliente...
                </div>
              )}
              {!docSearchLoading && !nombreSearchLoading && docSearchActive && docSearchResults.length === 0 && (
                <p className="text-[11px] text-coffee-500">Ningún cliente registrado con ese N° de documento.</p>
              )}
              {!docSearchLoading && !nombreSearchLoading && nombreSearchActive && nombreSearchResults.length === 0 && (
                <p className="text-[11px] text-coffee-500">Sin coincidencias por nombre.</p>
              )}
              {(docSearchResults.length > 0 || nombreSearchResults.length > 0) && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-xl divide-y divide-emerald-100 overflow-hidden">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold px-2.5 pt-2 pb-1">
                    Cliente encontrado · click para asignar
                  </p>
                  {(docSearchResults.length > 0 ? docSearchResults : nombreSearchResults).map(c => (
                    <button
                      key={c.id}
                      onClick={() => onAssignCustomerFromSearch(c)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-emerald-100 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-coffee-900 truncate">{c.nombre}</p>
                        <p className="text-[10px] text-coffee-500">
                          {c.dni != null ? `C.I. ${c.dni}` : 'Sin C.I.'}
                          {c.puntos != null ? ` · ${c.puntos} pts` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700">Usar</span>
                    </button>
                  ))}
                  <button
                    onClick={onClearSearchResults}
                    className="w-full text-[10px] text-coffee-500 hover:text-coffee-700 py-1"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2.5">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(pm => (
              <button
                key={pm.type}
                onClick={() => { onPaymentMethodChange(pm.type); onCashReceivedChange(''); }}
                className={clsx(
                  'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-xs font-semibold transition-all',
                  paymentMethod === pm.type ? 'bg-coffee-800 text-cream shadow-lg scale-105' : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                )}
              >
                {pm.icon}
                <span className="leading-tight text-center text-[11px]">{pm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'transfer' && (
          <div className="flex flex-col items-center gap-2">
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="QR de pago"
                className="w-48 h-48 object-contain rounded-xl border border-coffee-200 bg-coffee-50 p-2"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl border-2 border-dashed border-coffee-200 bg-coffee-50 flex items-center justify-center">
                <p className="text-xs text-coffee-400 text-center px-4">Sin imagen QR configurada</p>
              </div>
            )}
            <p className="text-xs text-coffee-500">Muestra este QR al cliente para el pago</p>
          </div>
        )}

        {paymentMethod === 'cash' && (
          <div>
            <label className="text-xs font-bold text-coffee-400 uppercase tracking-wider">Efectivo recibido (Bs.)</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-500 font-bold text-sm">S/</span>
              <input
                type="number"
                placeholder="0.00"
                value={cashReceived}
                onChange={e => onCashReceivedChange(e.target.value)}
                onWheel={e => e.currentTarget.blur()}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
            </div>
            {cashNum >= efectivoTotal && cashNum > 0 && (
              <div className="mt-2 flex justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                <span className="text-sm font-bold text-emerald-700">Vuelto</span>
                <span className="text-sm font-black text-emerald-700">{formatCurrency(cashNum - efectivoTotal)}</span>
              </div>
            )}
          </div>
        )}

        {pointsPreview && pointsPreview.totalPoints > 0 && (
          <div className="flex items-center gap-2.5 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">+{pointsPreview.totalPoints} puntos al completar</p>
              {pointsPreview.bonusReasons.length > 0 && (
                <p className="text-[11px] text-amber-600">{pointsPreview.bonusReasons.join(' · ')}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3.5 rounded-2xl border-2 border-coffee-200 text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={
              isProcessing
              || (paymentMethod === 'cash' && cashNum > 0 && cashNum < efectivoTotal)
              || (!noFacturar && !esSinNombre && !clienteEsConsumidorFinal && !numeroDocumento.trim())
            }
            className={clsx(
              'flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all',
              isProcessing
              || (paymentMethod === 'cash' && cashNum > 0 && cashNum < mesaTotal)
              || (!noFacturar && !esSinNombre && !clienteEsConsumidorFinal && !numeroDocumento.trim())
                ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
                : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
            )}
            title={
              !noFacturar && !esSinNombre && !clienteEsConsumidorFinal && !numeroDocumento.trim()
                ? 'Ingresa el número de documento'
                : undefined
            }
          >
            {isProcessing ? 'Procesando...' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  );
};