import React, { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { X, Star, Tag, RotateCcw, Receipt, FileText, Ban, UserX } from 'lucide-react';
import type { PaymentMethodType, Customer } from '../../types';
import { DEFAULT_CF_NUMERO_DOC } from '../../constants/facturacion';
import { ModoFacturacionCards, ModoFacturacionBanner, type ModoFacturacion } from './ModoFacturacionCards';
import { ClienteFacturacionSection } from './ClienteFacturacionSection';
import { DatosFiscalesForm } from './DatosFiscalesForm';
import { useMetodosPago } from '../../hooks/useMetodosPago';
import type { MetodoPagoItem } from '../../lib/queries/catalogos';

/**
 * Iconos SVG inline para los 2 métodos que KafeYana habilita por default
 * (1=EFECTIVO y 7=TRANSFERENCIA). Si en el futuro el operador activa
 * más métodos, se renderizan con el ícono genérico de tarjeta / wallet.
 *
 * Se mantienen aquí porque la grilla del POS ya tiene íconos inline
 * (no se quiere agregar dependencia de lucide-react solo para esto).
 */
function iconForMetodo(metodo: MetodoPagoItem): React.ReactNode {
  switch (metodo.codigo) {
    case 1: // EFECTIVO
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 7: // TRANSFERENCIA BANCARIA / QR
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      );
    default:
      // Tarjeta / OTROS / combinaciones — ícono genérico de tarjeta.
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
  }
}

/**
 * Traduce el código SIN del catálogo al `PaymentMethodType` legacy del
 * frontend. El POS mantiene el string type por compatibilidad con
 * `ReviewPanel` y `sales.ts`.
 *
 * Sólo el código 1=EFECTIVO y 7=TRANSFERENCIA están activos por default;
 * los demás se mapean a `'card'` para que el botón se renderice sin
 * tirar error si el operador los habilita más adelante.
 */
function metodoToPaymentType(metodo: MetodoPagoItem): PaymentMethodType {
  switch (metodo.codigo) {
    case 1: return 'cash';
    case 2: return 'card';
    case 7: return 'transfer';
    default: return 'card';
  }
}

/**
 * Etiqueta legible para el botón. Si la descripción del SIN es muy larga
 * (ej. "TRANSFERENCIA BANCARIA" → 23 chars) se trunca visualmente.
 */
function labelForMetodo(metodo: MetodoPagoItem): string {
  if (metodo.codigo === 1) return 'Efectivo';
  if (metodo.codigo === 7) return 'QR';
  if (metodo.codigo === 2) return 'Tarjeta';
  if (metodo.descripcion.length <= 12) return metodo.descripcion;
  // Mayúsculas → Capitalizado solo primera letra, sin "DE / DEL / LA" largos.
  const palabras = metodo.descripcion.toLowerCase().split(' ');
  return palabras
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .slice(0, 2)
    .join(' ');
}

interface DescuentoPreview {
  HayDescuentoDisponible: boolean;
  DescuentoRecomendado: {
    Nombre: string;
    PorcentajeDescuento: number;
    MontoDescuento: number;
    TotalConDescuento: number;
  } | null;
}

// Sync 11: los métodos de pago vienen del catálogo SIAT sincronizado
// (`useMetodosPago`). Ya no se hardcodean acá — el operador decide
// desde el server qué métodos están `Activo=true` y la UI los renderiza.

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
  /**
   * Código SIN del país de origen del documento (1..211). Sólo se usa cuando
   * el tipo de documento es CEX (2) o PAS (3) y NO se envió Id_Cliente
   * (cliente del dropdown ya trae su país persistido en BD).
   */
  paisOrigenCodigo: number | null;
  onPaisOrigenCodigoChange: (v: number | null) => void;
  /** Si la mesa ya tiene abonos previos, muestra el contexto de "saldo" en
   *  la cabecera y etiqueta el total como "Saldo a cobrar". */
  totalOriginal?: number;
  totalAbonado?: number;
  etiquetaTotal?: string;
  /**
   * El pago ya se hizo por partes (cobro parcial dividido entre varios que
   * cerró el 100% del saldo) — oculta el selector de método de pago y el
   * input de efectivo, y no exige `cashNum` para habilitar "Cobrar".
   */
  pagoYaDividido?: boolean;
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
  paisOrigenCodigo,
  onPaisOrigenCodigoChange,
  totalOriginal,
  totalAbonado = 0,
  etiquetaTotal,
  pagoYaDividido = false,
}) => {
  // Catálogo de métodos de pago sincronizado contra el SIAT (Sync 11).
  // Solo trae los métodos con `activo=true` — el operador decide desde el
  // server cuáles están habilitados.
  const { items: metodosPago, loading: loadingMetodos, sincronizado: metodosSincronizados } = useMetodosPago();

  // Mapeo a la estructura legacy `{type, label, icon}` que consume el botón.
  // Si el catálogo está vacío (loading / error / fallback) caemos a los 2
  // métodos por default para no romper el POS mientras el server arranca.
  const metodosParaUi = useMemo(() => {
    if (metodosPago.length === 0) {
      return [
        { type: 'cash' as PaymentMethodType, label: 'Efectivo', icon: iconForMetodo({ codigo: 1, descripcion: 'EFECTIVO', activo: true }) },
        { type: 'transfer' as PaymentMethodType, label: 'QR', icon: iconForMetodo({ codigo: 7, descripcion: 'TRANSFERENCIA BANCARIA', activo: true }) },
      ];
    }
    return metodosPago
      .filter(m => m.codigo !== 5) // OTROS: nunca se muestra en cobros
      .map(m => ({
        type: metodoToPaymentType(m),
        label: labelForMetodo(m),
        icon: iconForMetodo(m),
      }));
  }, [metodosPago]);

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
          {etiquetaTotal ?? 'Total a pagar'}
        </p>
        {typeof totalOriginal === 'number' && totalOriginal > mesaTotal ? (
          <div className="flex flex-col items-center gap-0">
            <p className="text-base font-display font-bold text-coffee-400 line-through">
              {formatCurrency(totalOriginal)}
            </p>
            <p className="text-[10px] text-emerald-700 -mt-0.5">
              Pagado antes {formatCurrency(totalAbonado)}
            </p>
            <p className="text-4xl md:text-5xl font-display font-black text-coffee-900 leading-none">
              {formatCurrency(mesaTotal)}
            </p>
          </div>
        ) : aplicarDescuento && discountPreview?.DescuentoRecomendado ? (
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
                  <ModoFacturacionBanner
                    icon={<UserX className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />}
                    label="Factura Sin Nombre"
                  />
                ) : noFacturar ? (
                  <ModoFacturacionBanner
                    icon={<Ban className="h-3.5 w-3.5 text-coffee-600 flex-shrink-0" />}
                    label="Venta sin factura"
                  />
                ) : (
                  <ModoFacturacionBanner
                    icon={<FileText className="h-3.5 w-3.5 text-coffee-700 flex-shrink-0" />}
                    label="Datos fiscales"
                    badge={
                      <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Requerido
                      </span>
                    }
                  >
                    <DatosFiscalesForm
                      codigoTipoDocumento={codigoTipoDocumento}
                      numeroDocumento={numeroDocumento}
                      complemento={complemento}
                      facturacionNombre={facturacionNombre}
                      onCodigoTipoDocumentoChange={onCodigoTipoDocumentoChange}
                      onNumeroDocumentoChange={onNumeroDocumentoChange}
                      onComplementoChange={onComplementoChange}
                      onFacturacionNombreChange={onFacturacionNombreChange}
                      paisOrigenCodigo={paisOrigenCodigo}
                      onPaisOrigenCodigoChange={onPaisOrigenCodigoChange}
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
                  </ModoFacturacionBanner>
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
            {pagoYaDividido ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <p className="text-xs font-bold text-emerald-700">Pago ya dividido entre varios</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  {formatCurrency(efectivoTotal)} ya cobrados por partes — solo falta confirmar cliente/factura.
                </p>
              </div>
            ) : (
              <>
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">
                  Método de pago
                </p>
                {!metodosSincronizados && !loadingMetodos && (
                  <span
                    className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider"
                    title="El server todavía no sincronizó el catálogo con el SIAT — se muestran los métodos por default."
                  >
                    Sin sync
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {metodosParaUi.map((pm, idx) => (
                  <button
                    key={`${pm.type}-${idx}`}
                    onClick={() => {
                      onPaymentMethodChange(pm.type);
                      onCashReceivedChange('');
                    }}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all [&_svg]:h-4 [&_svg]:w-4',
                      paymentMethod === pm.type
                        ? 'bg-coffee-800 text-cream shadow-lg scale-[1.02]'
                        : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                    )}
                  >
                    {pm.icon}
                    <span className="leading-tight text-center text-[10px] truncate w-full">{pm.label}</span>
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
                    Bs.
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
              </>
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
            (!pagoYaDividido && paymentMethod === 'cash' && cashNum > 0 && cashNum < efectivoTotal) ||
            (!noFacturar && !esSinNombre && (!numeroDocumento.trim() || !facturacionNombre.trim())) ||
            // Cliente extranjero (CEX/PAS) sin cliente del dropdown → exigir país.
            // Con cliente del dropdown, el país se lee del cliente persistido en BD.
            (!noFacturar &&
              !esSinNombre &&
              !clienteAsignadoDelDropdown &&
              (codigoTipoDocumento === 2 || codigoTipoDocumento === 3) &&
              paisOrigenCodigo == null)
          }
          className={clsx(
            'flex-1 py-3 rounded-2xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2',
            isProcessing ||
            (!pagoYaDividido && paymentMethod === 'cash' && cashNum > 0 && cashNum < efectivoTotal) ||
            (!noFacturar && !esSinNombre && (!numeroDocumento.trim() || !facturacionNombre.trim())) ||
            (!noFacturar &&
              !esSinNombre &&
              !clienteAsignadoDelDropdown &&
              (codigoTipoDocumento === 2 || codigoTipoDocumento === 3) &&
              paisOrigenCodigo == null)
              ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
              : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
          )}
          title={
            !noFacturar && !esSinNombre && (!numeroDocumento.trim() || !facturacionNombre.trim())
              ? 'Ingresa el nombre y el número de documento'
              : !noFacturar &&
                  !esSinNombre &&
                  !clienteAsignadoDelDropdown &&
                  (codigoTipoDocumento === 2 || codigoTipoDocumento === 3) &&
                  paisOrigenCodigo == null
                ? 'Selecciona el país de origen del documento'
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
