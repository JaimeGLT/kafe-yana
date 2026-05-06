import React from 'react';
import { Plus, Minus, Trash2, PenLine, Gift } from 'lucide-react';

interface OpcionItem {
  atributoNombre: string;
  tipoOpcion?: string;
  valorAnterior?: string;
  opcionNombre: string;
  precioAjuste?: number;
  tipoAjuste?: string;
  insumoBaseNombre?: string;
  insumoNuevoNombre?: string;
  ajusteCantidad?: number;
}

interface OrderItemRowProps {
  item: {
    cartKey: string;
    product: { name: string; tipo?: string };
    opciones?: OpcionItem[];
    notes?: string;
    redeemRewardId?: string;
    precioFinal: number;
    quantity: number;
  };
  formatCurrency: (n: number) => string;
  formatOpcionLabel: (o: OpcionItem) => React.ReactNode;
  onDec?: (cartKey: string) => void;
  onInc?: (cartKey: string) => void;
  onRemove?: (cartKey: string) => void;
  onUpdateNote?: (cartKey: string, note: string) => void;
  showQtyControls?: boolean;
  showNoteInput?: boolean;
  index?: number;
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  item,
  formatCurrency,
  formatOpcionLabel,
  onDec,
  onInc,
  onRemove,
  onUpdateNote,
  showQtyControls = true,
  showNoteInput = true,
  index,
}) => {
  const isRedeem = !!item.redeemRewardId;

  return (
    <div className="px-5 py-3 space-y-1.5">
      <div className="flex items-center gap-3">
        {index !== undefined && (
          <span className="text-xs font-bold text-coffee-300 w-4 flex-shrink-0">{index + 1}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
            {isRedeem && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                <Gift className="h-2.5 w-2.5" />Canje
              </span>
            )}
          </div>
          {item.opciones && item.opciones.length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {item.opciones.map((o, oi) => (
                <p key={oi} className="text-xs text-coffee-400">
                  <span className="font-medium text-coffee-500">{o.atributoNombre}:</span> {formatOpcionLabel(o)}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {isRedeem
              ? <p className="text-sm font-bold text-amber-500">Gratis</p>
              : <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
            }
            {onRemove && (
              <button onClick={() => onRemove(item.cartKey)} className="text-coffee-200 hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isRedeem ? (
            <span className="text-[11px] text-coffee-400">1 unidad</span>
          ) : showQtyControls && onDec && onInc ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDec(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600">
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm font-bold text-coffee-900">{item.quantity}</span>
              <button onClick={() => onInc(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-coffee-400 font-semibold">×{item.quantity}</span>
          )}
        </div>
      </div>
      {showNoteInput && onUpdateNote && (
        <div className="flex items-center gap-2 pl-7">
          <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
          <input
            type="text"
            placeholder="Nota (ej: sin azúcar, extra caliente...)"
            value={item.notes ?? ''}
            onChange={e => onUpdateNote(item.cartKey, e.target.value)}
            className="flex-1 text-[11px] text-coffee-700 placeholder:text-coffee-300 bg-transparent border-b border-coffee-100 focus:border-coffee-400 focus:outline-none py-0.5"
          />
        </div>
      )}
      {item.notes && !showNoteInput && (
        <div className="flex items-center gap-2 pl-1">
          <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
          <span className="text-[11px] text-coffee-500 italic">"{item.notes}"</span>
        </div>
      )}
    </div>
  );
};