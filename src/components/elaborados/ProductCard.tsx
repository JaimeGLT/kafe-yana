import React from 'react';
import { BookOpen, Edit2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ProductImage } from '../ui/ProductImage';
import { clsx } from 'clsx';
import { getMarginInfo } from '../../lib/elaborados.utils';
import type { Product, Receta, ProductDestino } from '../../types';

const destinoBadge = (d: ProductDestino | undefined) => {
  if (d === 'barra') return { label: 'Barra', cls: 'bg-blue-100 text-blue-700' };
  if (d === 'cocina') return { label: 'Cocina', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Sin destino', cls: 'bg-coffee-100 text-coffee-500' };
};
import { formatCurrency } from '../../utils';

interface ProductCardProps {
  product: Product;
  receta?: Receta;
  portionsAvailable: number;
  tipoPreparacion?: 'al_momento' | 'en_lote';
  onEditProduct: (p: Product) => void;
  onManageReceta: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  receta,
  portionsAvailable,
  tipoPreparacion = 'al_momento',
  onEditProduct,
  onManageReceta,
  onDeleteProduct,
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
          <div className="flex items-center gap-2 min-w-0">
            <ProductImage src={product.image} tipo="elaborado" size="sm" />
            <div className="min-w-0">
              <h3 className="font-semibold text-coffee-900 truncate">{product.name}</h3>
              {product.categoryName && (
                <p className="text-xs text-coffee-400 truncate">{product.categoryName}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-base font-bold text-coffee-800">{formatCurrency(product.salePrice)}</span>
            {(() => { const d = destinoBadge(product.destino); return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', d.cls)}>{d.label}</span>; })()}
          </div>
        </div>

        {/* Metadatos: unidad y código SIN */}
        <div className="flex items-center gap-3 text-xs text-coffee-400">
          {product.unit && <span>Unidad: <span className="text-coffee-600">{product.unit}</span></span>}
          {product.codigoSin && <span>SIN: <span className="text-coffee-600 font-mono">{product.codigoSin}</span></span>}
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
                  {margenPct.toFixed(1)}%
                </span>
              </div>
            )}
            {/* Availability */}
            {tipoPreparacion === 'en_lote' ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-coffee-500">En stock (para vender)</span>
                  <span className={clsx(
                    'font-semibold',
                    portionsAvailable === 0 ? 'text-red-600'
                    : portionsAvailable <= 5 ? 'text-amber-600'
                    : 'text-emerald-600'
                  )}>
                    {portionsAvailable === 0 ? '⚠ Sin stock' : `${portionsAvailable} ${product.unit ?? 'unidades'}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-coffee-500">Producible con insumos</span>
                  <span className="font-medium text-coffee-600">
                    {product.maxStock > 0 ? `${product.maxStock} ${product.unit ?? 'unidades'}` : '—'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-coffee-500">Producible</span>
                <span className="font-semibold text-coffee-600">
                  {portionsAvailable === 0 ? '⚠ Sin insumos' : `${portionsAvailable} ${product.unit ?? 'unidades'}`}
                </span>
              </div>
            )}
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
        <button
          onClick={() => onDeleteProduct(product)}
          className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Eliminar producto"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
