import React from 'react';
import { BookOpen, Edit2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getMarginInfo } from '../../lib/elaborados.utils';
import type { Product, Receta } from '../../types';
import { formatCurrency } from '../../utils';

interface ProductCardProps {
  product: Product;
  receta?: Receta;
  portionsAvailable: number;
  onEditProduct: (p: Product) => void;
  onManageReceta: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  receta,
  portionsAvailable,
  onEditProduct,
  onManageReceta,
}) => {
  const margenPct = receta && product.salePrice > 0
    ? ((product.salePrice - receta.costoPorPorcion) / product.salePrice) * 100
    : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Top color bar based on margin */}
      <div className={clsx('h-1', semaforo ? semaforo.dot : 'bg-coffee-200')} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-coffee-900 truncate">{product.name}</h3>
            {product.categoryName && (
              <p className="text-xs text-coffee-400 truncate">{product.categoryName}</p>
            )}
          </div>
          <span className="text-base font-bold text-coffee-800 shrink-0">
            {formatCurrency(product.salePrice)}
          </span>
        </div>

        {/* Receta status */}
        {receta ? (
          <div className="space-y-2">
            {/* Cost & margin */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-coffee-500">Costo / porción</span>
              <span className="font-medium text-coffee-800">{formatCurrency(receta.costoPorPorcion)}</span>
            </div>
            {margenPct !== null && semaforo && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-coffee-500">Margen</span>
                <span className={clsx('font-semibold inline-flex items-center gap-1', semaforo.text)}>
                  <span className={clsx('w-2 h-2 rounded-full', semaforo.dot)} />
                  {margenPct.toFixed(1)}% — {semaforo.label}
                </span>
              </div>
            )}
            {/* Availability */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-coffee-500 flex items-center gap-1">
                Porciones disponibles
              </span>
              <span
                className={clsx(
                  'font-semibold',
                  portionsAvailable === 0
                    ? 'text-red-600'
                    : portionsAvailable <= 5
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                )}
              >
                {portionsAvailable === 0 ? '⚠ Sin stock' : `${portionsAvailable} porciones`}
              </span>
            </div>
            {/* Recipe badge */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 w-fit">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {receta.ingredientes.length} ingrediente{receta.ingredientes.length !== 1 ? 's' : ''} · {receta.porcionesBase} porción{receta.porcionesBase !== 1 ? 'es' : ''}/receta
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Sin receta — el costo no se puede calcular y el stock de insumos no se descontará en ventas.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onManageReceta(product)}
          className={clsx(
            'flex-1 text-xs font-medium py-1.5 px-2 rounded-lg border transition-colors flex items-center justify-center gap-1',
            receta
              ? 'border-coffee-200 text-coffee-600 hover:bg-coffee-50'
              : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {receta ? 'Ver receta' : 'Crear receta'}
        </button>
        <button
          onClick={() => onEditProduct(product)}
          className="p-1.5 rounded-lg border border-coffee-200 text-coffee-500 hover:bg-coffee-50 transition-colors"
          title="Editar producto"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
