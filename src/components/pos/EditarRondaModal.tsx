import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '../../hooks/usePOSCart';
import type { DtoRondaDetalleEditar } from '../../hooks/useMesas';
import { formatOpcionLabel } from '../../utils/opcionUtils';

interface EditItem {
  cartKey: string;
  detalleId: number;
  productoId: number;
  nombre: string;
  idsOpcion: number[];
  nota: string;
  precioFinal: number;
  opciones?: CartItem['opciones'];
  cantidad: number;
  cantidadDescontada: number;
}

interface EditarRondaModalProps {
  isOpen: boolean;
  rondaNumber: number;
  items: CartItem[];
  isSaving: boolean;
  formatCurrency: (n: number) => string;
  onClose: () => void;
  onConfirm: (detalles: DtoRondaDetalleEditar[]) => Promise<void>;
}

function parseDetalleId(cartKey: string): number {
  return parseInt(cartKey.split('_')[1], 10);
}

function parseIdsOpcion(opciones?: CartItem['opciones']): number[] {
  return opciones?.map(o => parseInt(o.opcionId, 10)).filter(id => !isNaN(id)) ?? [];
}

export const EditarRondaModal: React.FC<EditarRondaModalProps> = ({
  isOpen,
  rondaNumber,
  items,
  isSaving,
  formatCurrency,
  onClose,
  onConfirm,
}) => {
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setEditItems(items.map(item => ({
      cartKey: item.cartKey,
      detalleId: parseDetalleId(item.cartKey),
      productoId: parseInt(item.product.id, 10),
      nombre: item.product.name,
      idsOpcion: parseIdsOpcion(item.opciones),
      nota: item.notes ?? '',
      precioFinal: item.precioFinal,
      opciones: item.opciones,
      cantidad: Math.max(0, item.quantity - (item.cantidadDescontada ?? 0)),
      cantidadDescontada: item.cantidadDescontada ?? 0,
    })));
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleInc = (cartKey: string) => {
    setEditItems(prev => prev.map(i =>
      i.cartKey === cartKey ? { ...i, cantidad: i.cantidad + 1 } : i,
    ));
  };

  const handleDec = (cartKey: string) => {
    setEditItems(prev => {
      const item = prev.find(i => i.cartKey === cartKey);
      if (!item) return prev;
      if (item.cantidad <= 0) return prev;
      if (item.cantidad === 1 && item.cantidadDescontada === 0) {
        return prev.filter(i => i.cartKey !== cartKey);
      }
      return prev.map(i => i.cartKey === cartKey ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const handleRemove = (cartKey: string) => {
    setEditItems(prev => prev.filter(i => i.cartKey !== cartKey));
  };

  const handleConfirm = async () => {
    const detalles: DtoRondaDetalleEditar[] = editItems.map(it => ({
      id_Detalle: isNaN(it.detalleId) ? null : it.detalleId,
      id_Producto: it.productoId,
      cantidad: it.cantidadDescontada + it.cantidad,
      ids_Opcion: it.idsOpcion,
      nota: it.nota,
    }));
    await onConfirm(detalles);
  };

  const originalCantidadPorCart = new Map(items.map(item => [item.cartKey, item.quantity]));
  const nuevaCantidadPorCart = new Map(editItems.map(it => [it.cartKey, it.cantidadDescontada + it.cantidad]));
  const hasChanges =
    originalCantidadPorCart.size !== nuevaCantidadPorCart.size ||
    [...originalCantidadPorCart.entries()].some(([k, v]) => nuevaCantidadPorCart.get(k) !== v);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-100 flex-shrink-0">
          <div>
            <p className="text-xs text-coffee-400 uppercase tracking-wide font-semibold">Editar</p>
            <h3 className="font-display font-bold text-coffee-900 text-lg">Ronda {rondaNumber}</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-600 hover:bg-coffee-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-coffee-50">
          {editItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-coffee-400 text-sm text-center px-6">
              Sin ítems. Al guardar se eliminará la ronda completa.
            </div>
          ) : (
            editItems.map(item => (
              <div key={item.cartKey} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold line-clamp-2 text-coffee-900">
                      {item.nombre}
                    </p>
                  </div>
                  {item.opciones && item.opciones.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {item.opciones.map((o, oi) => (
                        <p key={oi} className="text-xs text-coffee-400">
                          <span className="font-medium text-coffee-500">{o.atributoNombre}:</span>{' '}
                          {formatOpcionLabel(o as any)}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-0.5 text-coffee-500">
                    {formatCurrency(item.precioFinal * item.cantidad)}
                  </p>
                  {item.cantidadDescontada > 0 && (
                    <p className="text-xs mt-0.5 text-amber-600 font-medium">
                      Ya vendido: {item.cantidadDescontada}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleDec(item.cartKey)}
                    disabled={item.cantidad <= 0}
                    className="h-7 w-7 rounded-lg bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-coffee-900">{item.cantidad}</span>
                  <button
                    onClick={() => handleInc(item.cartKey)}
                    className="h-7 w-7 rounded-lg bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(item.cartKey)}
                    className="h-7 w-7 rounded-lg text-coffee-200 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors ml-1"
                    title="Quitar item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-coffee-100 flex-shrink-0 space-y-2">
          <button
            onClick={handleConfirm}
            disabled={isSaving || !hasChanges}
            className="w-full py-3.5 rounded-2xl bg-coffee-800 text-cream font-bold text-sm hover:bg-coffee-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? (editItems.length === 0 ? 'Eliminando...' : 'Guardando...')
              : (editItems.length === 0 ? 'Eliminar ronda' : 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  );
};
