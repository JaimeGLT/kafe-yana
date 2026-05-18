import React from 'react';
import { X, Tag, Trash2, Edit } from 'lucide-react';
import { clsx } from 'clsx';
import { ProductImage } from '../ui/ProductImage';
import { formatCurrency } from '../../utils';
import type { Product } from '../../types';
import type { ProductDestino } from '../../types';

const destinoBadge = (d: ProductDestino | undefined) => {
  if (d === 'barra') return { label: 'Barra', cls: 'bg-blue-100 text-blue-700' };
  if (d === 'cocina') return { label: 'Cocina', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Sin destino', cls: 'bg-coffee-100 text-coffee-500' };
};

const calcMargin = (costPrice: number, salePrice: number): number | null =>
  costPrice > 0 && salePrice > 0
    ? ((salePrice - costPrice) / salePrice) * 100
    : null;

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product: p, onClose, onEdit, onDelete,
}) => {
  const margin = calcMargin(p.costPrice, p.salePrice);
  const ganancia = p.salePrice - p.costPrice;

  const marginBg = margin === null ? 'bg-coffee-50 text-coffee-500'
    : margin >= 60 ? 'bg-emerald-50 text-emerald-800'
    : margin >= 30 ? 'bg-amber-50 text-amber-800'
    : 'bg-red-50 text-red-700';

  const stockStatus = p.stock <= 0
    ? { label: 'Agotado',    bg: 'bg-red-100 text-red-700',          dot: 'bg-red-500' }
    : p.stock <= p.minStock
    ? { label: 'Stock bajo', bg: 'bg-amber-100 text-amber-700',      dot: 'bg-amber-500' }
    : { label: 'Normal',     bg: 'bg-emerald-100 text-emerald-700',  dot: 'bg-emerald-500' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProductImage src={p.image} tipo="comprado" size="md" />
              <div className="min-w-0">
                <h2 className="font-bold text-coffee-900 text-base leading-tight truncate">{p.name}</h2>
                {p.categoryName && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs bg-coffee-100 text-coffee-600 px-2 py-0.5 rounded-full font-medium">
                    <Tag className="h-3 w-3" /> {p.categoryName}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-coffee-100 transition-colors text-coffee-400 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">Precios</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-coffee-50 rounded-xl p-3 text-center">
                <p className="text-xs text-coffee-400 mb-1">Venta</p>
                <p className="font-bold text-coffee-900 tabular-nums text-sm">{formatCurrency(p.salePrice)}</p>
              </div>
              <div className="bg-coffee-50 rounded-xl p-3 text-center">
                <p className="text-xs text-coffee-400 mb-1">Costo</p>
                <p className="font-bold text-coffee-900 tabular-nums text-sm">{formatCurrency(p.costPrice)}</p>
              </div>
              <div className={clsx('rounded-xl p-3 text-center', marginBg)}>
                <p className="text-xs opacity-70 mb-1">Margen</p>
                <p className="font-bold tabular-nums text-sm">
                  {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
            {ganancia > 0 && (
              <p className="text-xs text-coffee-400 mt-2 text-center">
                Ganancia por unidad: <span className="font-semibold text-coffee-700">{formatCurrency(ganancia)}</span>
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">Destino</p>
            {(() => {
              const d = destinoBadge(p.destino);
              return <span className={clsx('inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium', d.cls)}>{d.label}</span>;
            })()}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">Inventario</p>
            <div className="bg-coffee-50 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className={clsx(
                  'text-3xl font-bold tabular-nums leading-none',
                  p.stock <= 0 ? 'text-red-600' : p.stock <= p.minStock ? 'text-amber-600' : 'text-coffee-900',
                )}>
                  {p.stock}
                </p>
                <p className="text-xs text-coffee-400 mt-1">
                  unidades en stock
                  {p.minStock > 0 && ` · mín. ${p.minStock}`}
                </p>
              </div>
              <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full', stockStatus.bg)}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', stockStatus.dot)} />
                {stockStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-coffee-100 flex gap-2">
          <button
            onClick={() => { onClose(); onDelete(p); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
          <button
            onClick={() => { onClose(); onEdit(p); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-coffee-600 text-white hover:bg-coffee-700 transition-colors text-sm font-medium"
          >
            <Edit className="h-4 w-4" /> Editar
          </button>
        </div>
      </div>
    </div>
  );
};
