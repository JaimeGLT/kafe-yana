import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Star, Tag, RotateCcw, Receipt, FileText, Ban, UserX } from 'lucide-react';
import type { PaymentMethodType, Customer } from '../../types';
import { DEFAULT_SIN_NOMBRE, DEFAULT_CF_NUMERO_DOC } from '../../constants/facturacion';
import { ModoFacturacionCards, type ModoFacturacion } from './ModoFacturacionCards';
import { ClienteFacturacionSection } from './ClienteFacturacionSection';
import { DatosFiscalesForm } from './DatosFiscalesForm';

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
  /** Si el cliente fue asignado del dropdown (omite verificación NIT). */
  clienteAsignadoDelDropdown?: boolean;
  esSinNombre: boolean;
  onEsSinNombreChange: (v: boolean) => void;
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
  clienteAsignadoDelDropdown = false,
  esSinNombre,
  onEsSinNombreChange,
  noFacturar,
  onNoFacturarChange,
}) => {
  const efectivoTotal = aplicarDescuento && discountPreview?.DescuentoRecomendado
    ? discountPreview.DescuentoRecomendado.TotalConDescuento
    : mesaTotal;

  // Modo derivado: no_facturar tiene prioridad, después sin_nombre, si no con_datos.
  const selectedMode: ModoFacturacion = noFacturar
    ? 'no_facturar'
    : esSinNombre
      ? 'sin_nombre'
      : 'con_datos';

  const handleModeChange = (modo: ModoFacturacion) => {
    if (modo === 'no_facturar') {
      onNoFacturarChange(true);
      onEsSinNombreChange(false);
    } else if (modo === 'sin_nombre') {
      onNoFacturarChange(false);
      onEsSinNombreChange(true);
    } else {
      onNoFacturarChange(false);
      onEsSinNombreChange(false);
    }
  };

  // ── Banner "¿Facturar con datos del cliente?" ─────────────────────────
  // Aparece cuando hay un cliente real seleccionado del dropdown. El cajero
  // decide: "Usar" → rellena los campos, X → limpia los campos y descarta.
  const [clienteBannerDismissed, setClienteBannerDismissed] = useState(false);

  // Resetear el banner cuando cambia el cliente seleccionado.
  useEffect(() => {
    setClienteBannerDismissed(false);
  }, [reviewClienteId]);

  const clienteAsignado = reviewClienteId
    ? customers.find((c) => String(c.id) === reviewClienteId) ?? null
    : null;

  const handleUsarDatosCliente = () => {
    if (!clienteAsignado) return;
    onNumeroDocumentoChange(clienteAsignado.dni != null ? String(clienteAsignado.dni) : '');
    onFacturacionNombreChange(clienteAsignado.nombre);
    setClienteBannerDismissed(true);
  };

  const handleDismissClienteBanner = () => {
    onNumeroDocumentoChange(DEFAULT_CF_NUMERO_DOC);
    onFacturacionNombreChange('');
    setClienteBannerDismissed(true);
  };

  return (
    <div className="bg-white w-full sm:max-w-md md:max-w-3xl xl:max-w-4xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-coffee-800 px-4 md:px-5 py-3 md:py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-cream" />
          </div>
          <p className="text-cream font-semibold text-sm">Cobro · {mesaName}</p>
        </div>
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Total a pagar (ancla visual superior) ───────────────────────── */}
      <div className="px-4 md:px-5 pt-3 md:pt-4 pb-2.5 md:pb-3 flex-shrink-0 border-b border-coffee-100">
        <p className="text-[10px] text-coffee-400 uppercase tracking-widest font-semibold mb-0.5 text-center">
          Total a pagar
        </p>
        {aplicarDescuento && discountPreview?.DescuentoRecomendado ? (
          <div className="flex flex-col items-center gap-0">
            <p className="text-base font-display font-bold text-coffee-400 line-through">
              {formatCurrency(mesaTotal)}
            </p>
            <p className="text-4xl md:text-5xl font-display font-black text-emerald-600 leading-none">
              {formatCurrency(efectivoTotal)}
            </p>
          </div>
        ) : (
          <p className="text-4xl md:text-5xl font-display font-black text-coffee-900 text-center leading-none">
            {formatCurrency(mesaTotal)}
          </p>
        )}
      </div>

      {/* ── Cuerpo: 2 columnas en md+ ──────────────────────────────────── */}
      <div className="overflow-y-auto flex-1">
        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">

          {/* ── Columna izquierda: Facturación ────────────────────────── */}
          <div className="md:col-span-3 space-y-3 md:space-y-4">
            <section>
              <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
                Cliente
              </p>
              <ClienteFacturacionSection
                customers={customers}
                reviewClienteId={reviewClienteId}
                onReviewClienteChange={onReviewClienteChange}
                reviewShowNewCustomerForm={reviewShowNewCustomerForm}
                onToggleReviewNewCustomerForm={onToggleReviewNewCustomerForm}
                reviewNewCustomerName={reviewNewCustomerName}
                reviewNewCustomerPhone={reviewNewCustomerPhone}
                onReviewNewCustomerNameChange={onReviewNewCustomerNameChange}
                onReviewNewCustomerPhoneChange={onReviewNewCustomerPhoneChange}
                onCreateCustomer={onCreateCustomer}
                isCreatingCustomer={isCreatingCustomer}
              />
            </section>

            <section>
              <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
                Datos de facturación
              </p>
              <div className="space-y-3">
                <ModoFacturacionCards selected={selectedMode} onChange={handleModeChange} />

                {esSinNombre ? (
                  <div className="rounded-2xl border-2 border-coffee-400 bg-coffee-50/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-coffee-100/60 border-b border-coffee-200">
                      <UserX className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <p className="text-[10px] font-bold text-coffee-700 uppercase tracking-wider">
                        Factura Sin Nombre
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] text-coffee-700 leading-relaxed">
                        NIT (5) · Documento <span className="font-mono">&quot;0&quot;</span> · Nombre{' '}
                        <span className="font-mono">&quot;{DEFAULT_SIN_NOMBRE}&quot;</span>.
                      </p>
                    </div>
                  </div>
                ) : noFacturar ? (
                  <div className="rounded-2xl border-2 border-coffee-400 bg-coffee-50/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-coffee-100/60 border-b border-coffee-200">
                      <Ban className="h-3.5 w-3.5 text-coffee-600 flex-shrink-0" />
                      <p className="text-[10px] font-bold text-coffee-700 uppercase tracking-wider">
                        Venta sin factura
                      </p>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] text-coffee-600 leading-relaxed">
                        Se registrará la venta internamente sin emitir factura al SIAT.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-coffee-400 bg-coffee-50/40 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-coffee-100/60 border-b border-coffee-200">
                      <FileText className="h-3.5 w-3.5 text-coffee-700 flex-shrink-0" />
                      <p className="text-[10px] font-bold text-coffee-700 uppercase tracking-wider">
                        Datos fiscales
                      </p>
                      <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Requerido
                      </span>
                    </div>
                    <div className="p-3">
                      <DatosFiscalesForm
                        codigoTipoDocumento={codigoTipoDocumento}
                        numeroDocumento={numeroDocumento}
                        complemento={complemento}
                        facturacionNombre={facturacionNombre}
                        onCodigoTipoDocumentoChange={onCodigoTipoDocumentoChange}
                        onNumeroDocumentoChange={onNumeroDocumentoChange}
                        onComplementoChange={onComplementoChange}
                        onFacturacionNombreChange={onFacturacionNombreChange}
                        docSearchResults={docSearchResults}
                        docSearchLoading={docSearchLoading}
                        docSearchActive={docSearchActive}
                        nombreSearchResults={nombreSearchResults}
                        nombreSearchLoading={nombreSearchLoading}
                        nombreSearchActive={nombreSearchActive}
                        onAssignCustomerFromSearch={onAssignCustomerFromSearch}
                        onClearSearchResults={onClearSearchResults}
                        clienteEsConsumidorFinal={clienteEsConsumidorFinal}
                        clienteAsignadoDelDropdown={clienteAsignadoDelDropdown}
                        clienteAsignadoNombre={clienteAsignado?.nombre}
                        clienteAsignadoDni={clienteAsignado?.dni}
                        onUsarDatosCliente={handleUsarDatosCliente}
                        onDismissClienteBanner={handleDismissClienteBanner}
                        clienteBannerDismissed={clienteBannerDismissed}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Descuento por promoción permanente */}
            {isLoadingDescuento ? (
              <div className="flex items-center gap-2 bg-coffee-50 rounded-xl px-3 py-2 border border-coffee-100">
                <RotateCcw className="h-3.5 w-3.5 text-coffee-400 animate-spin flex-shrink-0" />
                <p className="text-[11px] text-coffee-400">Verificando descuentos...</p>
              </div>
            ) : discountPreview?.HayDescuentoDisponible && discountPreview.DescuentoRecomendado ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">
                        {discountPreview.DescuentoRecomendado.Nombre}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        {discountPreview.DescuentoRecomendado.PorcentajeDescuento}% · ahorro{' '}
                        {formatCurrency(discountPreview.DescuentoRecomendado.MontoDescuento)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAplicarDescuentoChange?.(!aplicarDescuento)}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                      aplicarDescuento ? 'bg-emerald-500' : 'bg-coffee-200',
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        aplicarDescuento ? 'translate-x-5' : 'translate-x-0',
                      )}
                    />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Columna derecha: Pago ────────────────────────────────── */}
          <div className="md:col-span-2 space-y-3 md:space-y-4">
            <section>
              <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider mb-2">
                Método de pago
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.type}
                    onClick={() => {
                      onPaymentMethodChange(pm.type);
                      onCashReceivedChange('');
                    }}
                    className={clsx(
                      'flex flex-col items-center gap-1 py-3 px-1 rounded-2xl text-xs font-semibold transition-all',
                      paymentMethod === pm.type
                        ? 'bg-coffee-800 text-cream shadow-lg scale-[1.02]'
                        : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                    )}
                  >
                    {pm.icon}
                    <span className="leading-tight text-center text-[11px]">{pm.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {paymentMethod === 'transfer' && (
              <div className="flex flex-col items-center gap-2">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="QR de pago"
                    className="w-44 h-44 object-contain rounded-xl border border-coffee-200 bg-coffee-50 p-2"
                  />
                ) : (
                  <div className="w-44 h-44 rounded-xl border-2 border-dashed border-coffee-200 bg-coffee-50 flex items-center justify-center">
                    <p className="text-[11px] text-coffee-400 text-center px-4">
                      Sin imagen QR configurada
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-coffee-500">Muestra este QR al cliente</p>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <section>
                <label className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">
                  Efectivo recibido (Bs.)
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-500 font-bold text-sm">
                    S/
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => onCashReceivedChange(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    autoFocus
                  />
                </div>
                {cashNum >= efectivoTotal && cashNum > 0 && (
                  <div className="mt-2 flex justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-emerald-700">Vuelto</span>
                    <span className="text-sm font-black text-emerald-700">
                      {formatCurrency(cashNum - efectivoTotal)}
                    </span>
                  </div>
                )}
              </section>
            )}

            {pointsPreview && pointsPreview.totalPoints > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 border border-amber-100">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    +{pointsPreview.totalPoints} puntos al completar
                  </p>
                  {pointsPreview.bonusReasons.length > 0 && (
                    <p className="text-[10px] text-amber-600">
                      {pointsPreview.bonusReasons.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Acciones (ancla visual inferior) ──────────────────────────────── */}
      <div className="flex gap-2.5 px-4 md:px-5 py-3 md:py-3.5 border-t border-coffee-100 bg-coffee-50/40 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-none sm:px-4 py-3 rounded-2xl border-2 border-coffee-200 bg-white text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={
            isProcessing ||
            (paymentMethod === 'cash' && cashNum > 0 && cashNum < efectivoTotal) ||
            (!noFacturar && !esSinNombre && !clienteEsConsumidorFinal && !numeroDocumento.trim())
          }
          className={clsx(
            'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
            isProcessing ||
            (paymentMethod === 'cash' && cashNum > 0 && cashNum < efectivoTotal) ||
            (!noFacturar && !esSinNombre && !clienteEsConsumidorFinal && !numeroDocumento.trim())
              ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
              : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
          )}
          title={
            !noFacturar && !esSinNombre && !clienteEsConsumidorFinal && !numeroDocumento.trim()
              ? 'Ingresa el número de documento'
              : undefined
          }
        >
          {isProcessing ? (
            'Procesando...'
          ) : (
            <>
              <span>Cobrar</span>
              <span className="opacity-70">·</span>
              <span>{formatCurrency(efectivoTotal)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
