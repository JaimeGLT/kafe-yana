import React from 'react';
import { CheckCircle, Star, Printer, Tag, FileText, RefreshCw } from 'lucide-react';
import { esEstadoAnuladaSiat } from '../../types/siat';

interface SuccessPanelProps {
  saleCode: string;
  mesaName: string;
  newBalance: number;
  onPrint: () => void;
  onClose: () => void;
  nextMilestone: { icon: string; reward: string } | null;
  pointsResult: { totalPoints: number; bonusReasons: string[] } | null;
  puntosPorVenta?: number;
  puntosPromocion?: number;
  nombrePromocion?: string | null;
  aplicoDescuento?: boolean;
  montoDescuento?: number;
  nombrePromoDescuento?: string | null;
  // SIAT
  ventaId?: number | null;
  /** Estado SIAT: el backend lo serializa como número (no usa JsonStringEnumConverter). */
  estadoSiat?: string | number | null;
  siatAceptada?: boolean;
  errorSiat?: string | null;
  codigoRecepcion?: string | null;
  numeroFactura?: number | null;
  /** Abre el modal de impresión de factura SIAT. */
  onOpenFacturaModal?: () => void;
  onResendSiat?: (ventaId: number) => void | Promise<void>;
}

export const SuccessPanel: React.FC<SuccessPanelProps> = ({
  saleCode,
  mesaName,
  newBalance,
  onPrint,
  onClose,
  nextMilestone,
  pointsResult,
  puntosPorVenta = 0,
  puntosPromocion = 0,
  nombrePromocion,
  aplicoDescuento = false,
  montoDescuento = 0,
  nombrePromoDescuento,
  ventaId = null,
  estadoSiat = null,
  siatAceptada = false,
  errorSiat = null,
  codigoRecepcion = null,
  numeroFactura = null,
  onOpenFacturaModal,
  onResendSiat,
}) => {
  const totalPuntosReales = puntosPorVenta + puntosPromocion;
  // estadoSiat puede llegar como string ('Validada') o como número (908) — el helper maneja ambos.
  const esAnulada = esEstadoAnuladaSiat(estadoSiat);
  const puedeReimprimir = !!ventaId && siatAceptada === true && !!onOpenFacturaModal;
  const puedeReenviar = !!ventaId && siatAceptada === false && !esAnulada && !!onResendSiat;
  return (
  <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
    <div className="bg-emerald-500 px-6 pt-8 pb-6 flex flex-col items-center text-white text-center">
      <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
        <CheckCircle className="h-9 w-9 text-white" />
      </div>
      <h3 className="font-display font-bold text-2xl">¡Cobro exitoso!</h3>
      <p className="text-emerald-100 text-sm mt-1 font-mono">{saleCode}</p>
      <p className="text-emerald-200 text-xs mt-1">{mesaName} liberada</p>
    </div>

    <div className="p-5 space-y-3">
      {nextMilestone && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl mb-1">{nextMilestone.icon}</p>
          <p className="text-sm font-bold text-amber-800">¡Hito alcanzado!</p>
          <p className="text-xs text-amber-600 mt-0.5">{nextMilestone.reward}</p>
        </div>
      )}

      {aplicoDescuento && montoDescuento > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Tag className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Descuento aplicado: −Bs. {montoDescuento.toFixed(2)}</p>
            {nombrePromoDescuento && (
              <p className="text-xs text-emerald-600">{nombrePromoDescuento}</p>
            )}
          </div>
        </div>
      )}

      {totalPuntosReales > 0 ? (
        <div className="bg-coffee-50 rounded-2xl px-4 py-3 space-y-2">
          {puntosPorVenta > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <p className="text-sm text-coffee-700">Puntos por compra</p>
              </div>
              <p className="text-sm font-bold text-coffee-900">+{puntosPorVenta}</p>
            </div>
          )}
          {puntosPromocion > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <div>
                  <p className="text-sm text-coffee-700">Puntos extra (promo)</p>
                  {nombrePromocion && <p className="text-[11px] text-coffee-400">{nombrePromocion}</p>}
                </div>
              </div>
              <p className="text-sm font-bold text-coffee-900">+{puntosPromocion}</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-coffee-200 pt-2">
            <p className="text-sm font-bold text-coffee-900">Total puntos agregados</p>
            <p className="text-base font-black text-amber-600">+{totalPuntosReales}</p>
          </div>
        </div>
      ) : pointsResult && pointsResult.totalPoints > 0 ? (
        <div className="bg-coffee-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-coffee-900">+{pointsResult.totalPoints} puntos</p>
              {pointsResult.bonusReasons.length > 0 && (
                <p className="text-xs text-coffee-500">{pointsResult.bonusReasons.join(' · ')}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-coffee-400">Saldo total</p>
            <p className="text-sm font-bold text-coffee-800">{newBalance} pts</p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onPrint}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-coffee-200 text-coffee-700 font-semibold text-sm hover:bg-coffee-50 transition-colors"
        >
          <Printer className="h-4 w-4" /> Recibo
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-coffee-800 text-cream font-bold text-sm hover:bg-coffee-700 active:scale-95 transition-all"
        >
          Listo
        </button>
      </div>

      {/* SIAT — Facturación */}
      {ventaId && (
        <div className="space-y-2 pt-1 border-t border-coffee-100">
          <div className="flex items-center justify-center gap-2 text-xs text-coffee-500 flex-wrap">
            <span>SIAT:</span>
            {estadoSiat ? (
              <span
                className={
                  'inline-flex items-center font-medium rounded-full px-2 py-0.5 ' +
                  (siatAceptada
                    ? 'bg-green-100 text-green-700'
                    : esAnulada
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700')
                }
              >
                {estadoSiat}
              </span>
            ) : (
              <span className="text-coffee-400">—</span>
            )}
            {numeroFactura != null && (
              <span className="text-coffee-400">N° {numeroFactura}</span>
            )}
            {codigoRecepcion && (
              <span
                className="font-mono text-[10px] text-coffee-400"
                title="Código de recepción SIAT"
              >
                {codigoRecepcion}
              </span>
            )}
          </div>
          {errorSiat && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
              {errorSiat}
            </p>
          )}
          {puedeReimprimir && (
            <button
              onClick={() => onOpenFacturaModal!()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <FileText className="h-4 w-4" /> Imprimir factura SIAT
            </button>
          )}
          {puedeReenviar && (
            <button
              onClick={() => onResendSiat!(ventaId)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 active:scale-95 transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Reenviar al SIAT
            </button>
          )}
        </div>
      )}
    </div>
  </div>
  );
};