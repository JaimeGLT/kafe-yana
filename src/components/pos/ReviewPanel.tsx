import React from 'react';
import { ChevronRight, Gift } from 'lucide-react';
import { getProductEmoji } from '../../utils/productUtils';
import { formatOpcionLabel } from '../../utils/opcionUtils';

interface ReviewOrderItem {
  cartKey: string;
  product: { name: string; tipo?: string };
  opciones?: Array<{
    atributoNombre: string;
    tipoOpcion?: string;
    valorAnterior?: string;
    opcionNombre: string;
    precioAjuste?: number;
    tipoAjuste?: string;
    insumoBaseNombre?: string;
    insumoNuevoNombre?: string;
    ajusteCantidad?: number;
  }>;
  notes?: string;
  redeemRewardId?: string;
  precioFinal: number;
  quantity: number;
}

interface ReviewPanelProps {
  mesaName: string;
  order: ReviewOrderItem[];
  mesaTotal: number;
  formatCurrency: (n: number) => string;
  onBack: () => void;
  onConfirm: () => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  mesaName,
  order,
  mesaTotal,
  formatCurrency,
  onBack,
  onConfirm,
}) => (
  <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
    <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-100 flex-shrink-0">
      <div>
        <p className="text-xs text-coffee-400 uppercase tracking-wide font-semibold">Resumen</p>
        <h3 className="font-display font-bold text-coffee-900 text-lg">{mesaName}</h3>
      </div>
      <button onClick={onBack} className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-600 hover:bg-coffee-200">
        <ChevronRight className="h-4 w-4 rotate-180" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto divide-y divide-coffee-50 min-h-0">
      {order.map(item => (
        <div key={item.cartKey} className="flex items-center gap-3 px-5 py-3">
          <div className="h-9 w-9 rounded-xl bg-coffee-50 flex items-center justify-center text-xl flex-shrink-0">{getProductEmoji(item.product as any)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-coffee-900 line-clamp-1">{item.product.name}</p>
              {item.redeemRewardId && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                  <Gift className="h-2.5 w-2.5" />Canje
                </span>
              )}
            </div>
            {item.opciones && item.opciones.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {item.opciones.map((o, oi) => (
                  <p key={oi} className="text-xs text-coffee-400">
                    <span className="font-medium text-coffee-500">{o.atributoNombre}:</span> {formatOpcionLabel(o as any)}
                  </p>
                ))}
              </div>
            )}
            {item.notes && <p className="text-xs text-coffee-500 italic mt-0.5">"{item.notes}"</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-coffee-400 bg-coffee-100 rounded-lg px-2 py-0.5 font-semibold">×{item.quantity}</span>
            {item.redeemRewardId
              ? <span className="text-sm font-bold text-amber-500">Gratis</span>
              : <span className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</span>
            }
          </div>
        </div>
      ))}
    </div>

    <div className="flex-shrink-0 border-t border-coffee-100">
      <div className="px-5 py-3 bg-coffee-50">
        <div className="flex justify-between font-bold text-coffee-900 text-lg">
          <span>Total</span>
          <span className="font-display">{formatCurrency(mesaTotal)}</span>
        </div>
      </div>
      <div className="px-5 py-4">
        <button
          onClick={onConfirm}
          className="w-full py-4 rounded-2xl bg-coffee-800 text-cream font-bold text-base hover:bg-coffee-700 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Confirmar y Cobrar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);