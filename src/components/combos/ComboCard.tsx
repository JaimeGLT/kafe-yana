import React, { useState } from 'react';
import {
  Edit2, Trash2, Tag, AlertTriangle,
  FlaskConical, Package, ChevronDown, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ProductImage } from '../ui/ProductImage';
import { formatCurrency } from '../../utils';
import type { Combo, Product } from '../../types';

const getMarginInfo = (pct: number) => {
  if (pct >= 60) return {
    label: 'Rentable',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  if (pct >= 30) return {
    label: 'Aceptable',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return {
    label: 'Revisar',
    dot: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700 border-red-200',
  };
};

export interface ComboCardProps {
  combo: Combo;
  availability: number;
  products: Product[];
  onEdit: (c: Combo) => void;
  onDelete: (c: Combo) => void;
}

export const ComboCard: React.FC<ComboCardProps> = ({
  combo, availability, products, onEdit, onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);

  const margenPct = combo.price > 0
    ? ((combo.price - combo.costoTotal) / combo.price) * 100
    : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;

  const sumaIndividual = combo.items.reduce((s, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return s + (prod?.salePrice ?? 0) * item.quantity;
  }, 0);
  const ahorro = sumaIndividual > combo.price ? sumaIndividual - combo.price : 0;

  const requiredItems = combo.items.filter((i) => !i.esOpcional);
  const optionalItems = combo.items.filter((i) => i.esOpcional);

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className={clsx('h-1', semaforo ? semaforo.dot : 'bg-coffee-200')} />

      <div className="p-4 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ProductImage src={combo.image} tipo="combo" size="sm" />
            <div className="min-w-0">
              <h3 className="font-semibold text-coffee-900 truncate">{combo.name}</h3>
              {combo.description && (
                <p className="text-xs text-coffee-400 truncate mt-0.5">{combo.description}</p>
              )}
            </div>
          </div>
          <span className="text-base font-bold text-coffee-800 shrink-0">
            {formatCurrency(combo.price)}
          </span>
        </div>

        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-coffee-500 hover:text-coffee-700 transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {combo.items.length} producto{combo.items.length !== 1 ? 's' : ''}
            {optionalItems.length > 0 && ` · ${optionalItems.length} opcional${optionalItems.length !== 1 ? 'es' : ''}`}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1">
              {combo.items.map((item) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <li key={item.id} className="flex items-center gap-2 text-xs text-coffee-600">
                    {prod?.tipo === 'elaborado'
                      ? <FlaskConical className="h-3 w-3 text-amber-500 shrink-0" />
                      : <Package className="h-3 w-3 text-blue-400 shrink-0" />}
                    <span className="flex-1 truncate">{item.productName}</span>
                    <span className="text-coffee-400">×{item.quantity}</span>
                    {item.esOpcional && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-1 rounded">opcional</span>
                    )}
                    {prod?.tipo === 'elaborado' && !prod.recetaId && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-coffee-500">Costo total</span>
            <span className="font-medium text-coffee-800">{formatCurrency(combo.costoTotal)}</span>
          </div>
          {ahorro > 0 && (
            <div className="flex justify-between">
              <span className="text-coffee-500 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Ahorro cliente
              </span>
              <span className="text-emerald-700 font-medium">{formatCurrency(ahorro)}</span>
            </div>
          )}
          {margenPct !== null && semaforo && (
            <div className="flex items-center justify-between">
              <span className="text-coffee-500">Margen</span>
              <span className={clsx('font-semibold flex items-center gap-1', semaforo.text)}>
                <span className={clsx('w-2 h-2 rounded-full', semaforo.dot)} />
                {margenPct.toFixed(1)}% — {semaforo.label}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-coffee-500">Disponibles hoy</span>
          <span className={clsx(
            'font-semibold',
            availability === 0 ? 'text-red-600' : availability <= 3 ? 'text-amber-600' : 'text-emerald-600',
          )}>
            {availability === 0 ? '⚠ Sin stock' : `${availability} combos`}
          </span>
        </div>

        <div className="flex gap-2 text-xs flex-wrap">
          <span className="bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded border border-coffee-100">
            {requiredItems.length} fijo{requiredItems.length !== 1 ? 's' : ''}
          </span>
          {optionalItems.length > 0 && (
            <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">
              {optionalItems.length} opcional{optionalItems.length !== 1 ? 'es' : ''}
            </span>
          )}
          {combo.codigoSin && (
            <span className="bg-coffee-50 text-coffee-500 px-2 py-0.5 rounded border border-coffee-100 font-mono">
              SIN: {combo.codigoSin}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2 mt-auto">
        <button
          onClick={() => onEdit(combo)}
          className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 transition-colors flex items-center justify-center gap-1"
        >
          <Edit2 className="h-3.5 w-3.5" /> Editar combo
        </button>
        <button
          onClick={() => onDelete(combo)}
          className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
          title="Eliminar combo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
