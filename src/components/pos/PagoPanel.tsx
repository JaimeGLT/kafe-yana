import React from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, X, Star, Gift, Plus, User, Search, Tag, RotateCcw } from 'lucide-react';
import type { PaymentMethodType, Customer } from '../../types';

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
  loyaltyProfile: { points: number } | null;
  pointsPreview: PointsPreview | null;
  formatCurrency: (n: number) => string;
  onPaymentMethodChange: (m: PaymentMethodType) => void;
  onCashReceivedChange: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  activeMesaOrder: Array<{ redeemRewardId?: string }>;
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
  qrImageUrl?: string | null;
  discountPreview?: DescuentoPreview | null;
  aplicarDescuento?: boolean;
  onAplicarDescuentoChange?: (v: boolean) => void;
  isLoadingDescuento?: boolean;
}

export const PagoPanel: React.FC<PagoPanelProps> = ({
  mesaName,
  mesaTotal,
  paymentMethod,
  cashReceived,
  isProcessing,
  cashNum,
  loyaltyProfile,
  pointsPreview,
  formatCurrency,
  onPaymentMethodChange,
  onCashReceivedChange,
  onBack,
  onConfirm,
  activeMesaOrder,
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
  qrImageUrl,
  discountPreview,
  aplicarDescuento = false,
  onAplicarDescuentoChange,
  isLoadingDescuento = false,
}) => {
  const selectedCliente = reviewClienteId ? customers.find(c => String(c.id) === reviewClienteId) : null;
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

        {loyaltyProfile && activeMesaOrder.some(i => i.redeemRewardId) && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
            <Gift className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-800">
              {activeMesaOrder.filter(i => i.redeemRewardId).length} recompensa(s) canjeada(s) en este pedido
            </p>
          </div>
        )}

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
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 font-bold text-lg"
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
            disabled={isProcessing || (paymentMethod === 'cash' && cashNum > 0 && cashNum < efectivoTotal)}
            className={clsx(
              'flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all',
              isProcessing || (paymentMethod === 'cash' && cashNum > 0 && cashNum < mesaTotal)
                ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
                : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
            )}
          >
            {isProcessing ? 'Procesando...' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  );
};