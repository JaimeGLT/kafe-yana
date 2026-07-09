import React from 'react';
import { clsx } from 'clsx';
import { Plus, Minus, FlaskConical, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { ProductImageFill } from '../ui/ProductImage';
import type { Product } from '../../types';

interface ProdCardProps {
  product: Product;
  qty: number;
  unavailable: boolean;
  attrCount: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onInfo?: () => void;
  stockLabel?: string;
}

export const ProdCard: React.FC<ProdCardProps> = ({
  product, qty, unavailable, attrCount,
  onAdd, onInc, onDec, onInfo, stockLabel,
}) => (
  <div
    className={clsx(
      'flex-shrink-0 w-32 sm:w-40 bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col select-none',
      unavailable && 'opacity-50',
      !unavailable && product.tipo !== 'combo' && 'cursor-pointer active:scale-95 transition-transform',
    )}
    onClick={!unavailable && product.tipo !== 'combo' ? onAdd : undefined}
  >
    <div className="relative h-20 sm:h-32 overflow-hidden">
      <ProductImageFill src={product.image} tipo={product.tipo} iconSize="h-10 w-10 sm:h-12 sm:w-12" />
      {product.tipo === 'elaborado' && (
        <span className="absolute top-1.5 left-1.5 text-[9px] bg-white text-amber-700 rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5 shadow-sm">
          <FlaskConical className="h-2 w-2" />Elab.
        </span>
      )}
      {product.tipo === 'combo' && onInfo && (
        <button
          onClick={e => { e.stopPropagation(); onInfo(); }}
          className="absolute top-1.5 left-1.5 text-[9px] bg-white text-emerald-700 rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5 shadow-sm hover:bg-emerald-50 transition-colors"
        >
          <Layers className="h-2 w-2" />Ver
        </button>
      )}
      {attrCount > 0 && (
        <span className="absolute top-1.5 right-1.5 text-[9px] bg-white text-purple-700 rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5 shadow-sm">
          <Layers className="h-2 w-2" />Var.
        </span>
      )}
      {qty > 0 && (
        <div className="absolute bottom-1.5 right-1.5 h-5 w-5 bg-coffee-800 text-cream text-[10px] font-black rounded-full flex items-center justify-center shadow">
          {qty}
        </div>
      )}
    </div>
    <div className="px-2.5 sm:px-3 pt-2 sm:pt-2.5 pb-1 flex-1 flex flex-col">
      <p className="text-xs sm:text-sm font-bold text-coffee-900 leading-tight line-clamp-2 font-display flex-1">{product.name}</p>
      <p className="text-sm sm:text-base font-black text-coffee-800 mt-1">{formatCurrency(product.salePrice)}</p>
      {stockLabel && (
        <p className={clsx(
          'mt-0.5',
          stockLabel === '∞'
            ? 'text-xl sm:text-2xl font-black leading-none'
            : 'text-[10px] sm:text-xs font-semibold',
          unavailable ? 'text-red-500' : 'text-coffee-500',
        )}>{stockLabel}</p>
      )}
    </div>
    <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
      {attrCount > 0 ? (
        <button
          disabled={unavailable}
          onClick={e => { e.stopPropagation(); onAdd(); }}
          className={clsx(
            'w-full flex items-center justify-center gap-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all',
            unavailable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95',
          )}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Agregar
        </button>
      ) : qty === 0 ? (
        <button
          disabled={unavailable}
          onClick={e => { e.stopPropagation(); onAdd(); }}
          className={clsx(
            'w-full flex items-center justify-center gap-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all',
            unavailable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95',
          )}
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Agregar
        </button>
      ) : (
        <div className="flex items-center justify-between bg-coffee-100 rounded-xl overflow-hidden h-9 sm:h-11">
          <button onClick={e => { e.stopPropagation(); onDec(); }} className="w-9 sm:w-11 h-full flex items-center justify-center hover:bg-coffee-200 text-coffee-700 transition-colors">
            <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <span className="text-sm sm:text-base font-black text-coffee-900">{qty}</span>
          <button disabled={unavailable} onClick={e => { e.stopPropagation(); onInc(); }} className={clsx('w-9 sm:w-11 h-full flex items-center justify-center transition-colors', unavailable ? 'opacity-40 cursor-not-allowed' : 'hover:bg-coffee-200 text-coffee-700')}>
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      )}
    </div>
  </div>
);
