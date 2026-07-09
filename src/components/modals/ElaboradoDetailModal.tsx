import React from 'react';
import { clsx } from 'clsx';
import { ShoppingCart, AlertCircle, FlaskConical, Plus, Minus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils';
import { toast } from '../ui/Toast';
import type { Product, VariacionAtributo, OpcionSeleccionada } from '../../types';
import type { ConsumoInsumo } from '../../hooks/usePOSCart';
import { calcularConsumo } from '../../hooks/usePOSCart';

export interface ElaboradoIngrediente {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface InsumoStock {
  id: string;
  nombre: string;
  stock: number;
}

export interface OpcionStockInfo {
  opcionId: string;
  tipoAjuste: string;
  cantidad: number;
  insumoRequeridoId: string | null;
  insumoReemplazoId: string | null;
}

interface RecetaDetalle {
  insumo: { id: string; nombre: string };
  cantidad: number;
  merma?: number;
}

interface RecetaInfo {
  porciones?: number;
  detalles: RecetaDetalle[];
}

interface AjusteRaw {
  tipoAjuste: string;
  cantidad: number;
  insumoBase: { id: string };
  insumoNuevo: { id: string } | null;
}

interface OpcionRaw {
  id: string;
  ajustes: AjusteRaw[];
}

interface VariacionRaw {
  opciones: OpcionRaw[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  atributos: VariacionAtributo[];
  ingredientes: ElaboradoIngrediente[];
  insumosStock: InsumoStock[];
  opcionesStockInfo: OpcionStockInfo[];
  receta: RecetaInfo | null;
  variaciones: VariacionRaw[];
  effectiveMax?: number;
  onConfirm: (opciones: OpcionSeleccionada[], precioFinal: number, qty: number, consumoInsumos: ConsumoInsumo[]) => void;
}

export const ElaboradoDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  product,
  atributos,
  ingredientes,
  insumosStock,
  opcionesStockInfo,
  receta,
  variaciones,
  effectiveMax,
  onConfirm,
}) => {
  const [selecciones, setSelecciones] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [qty, setQty] = React.useState(1);

  React.useEffect(() => {
    if (isOpen) {
      setSelecciones({});
      setErrors({});
      setQty(1);
    }
  }, [isOpen]);

  const activeAtributos = atributos.filter((a) => a.isActive);

  const stockMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const i of insumosStock) map.set(i.id, i.stock);
    return map;
  }, [insumosStock]);

  const opcionOutOfStock = React.useMemo(() => {
    const set = new Set<string>();
    for (const info of opcionesStockInfo) {
      if (info.tipoAjuste === 'Reemplazo' && info.insumoReemplazoId) {
        const stock = stockMap.get(info.insumoReemplazoId) ?? 0;
        if (stock < info.cantidad) set.add(info.opcionId);
      } else if (info.tipoAjuste === 'Modificacion' && info.insumoRequeridoId) {
        const stock = stockMap.get(info.insumoRequeridoId) ?? 0;
        if (stock < info.cantidad) set.add(info.opcionId);
      } else if ((info.tipoAjuste === 'Extra' || info.tipoAjuste === 'extra') && info.insumoRequeridoId) {
        const stock = stockMap.get(info.insumoRequeridoId) ?? 0;
        if (stock < info.cantidad) set.add(info.opcionId);
      }
    }
    return set;
  }, [opcionesStockInfo, stockMap]);

  const precioFinal = React.useMemo(() => {
    let total = product.salePrice;
    for (const atributo of activeAtributos) {
      const opcion = atributo.opciones.find((o) => o.id === selecciones[atributo.id]);
      if (opcion) total += opcion.precioAjuste;
    }
    return total;
  }, [selecciones, product.salePrice, activeAtributos]);

  const maxProducible = React.useMemo(() => {
    if (product.producible === true) return effectiveMax ?? product.stock;

    let max = effectiveMax ?? product.cantidadProducible ?? Number.POSITIVE_INFINITY;

    for (const opcionId of Object.values(selecciones)) {
      const stockInfo = opcionesStockInfo.find(o => o.opcionId === opcionId);
      if (!stockInfo?.insumoRequeridoId || !stockInfo?.cantidad) continue;
      const insumo = insumosStock.find(i => i.id === stockInfo.insumoRequeridoId);
      if (!insumo) continue;
      max = Math.min(max, insumo.stock / stockInfo.cantidad);
    }

    return Math.floor(max);
  }, [product, effectiveMax, selecciones, opcionesStockInfo, insumosStock]);

  const adjustmentTotal = precioFinal - product.salePrice;

  const handleSelect = (atributoId: string, opcionId: string) => {
    setSelecciones((prev) => {
      if (prev[atributoId] === opcionId) {
        const next = { ...prev };
        delete next[atributoId];
        return next;
      }
      return { ...prev, [atributoId]: opcionId };
    });
    setErrors((prev) => { const next = { ...prev }; delete next[atributoId]; return next; });
  };

  const handleConfirm = () => {
    if (qty > maxProducible) {
      toast.error('Cantidad excede disponible', `Solo hay ${maxProducible} unidades disponibles.`);
      return;
    }
    const newErrors: Record<string, string> = {};
    for (const atributo of activeAtributos) {
      if (atributo.esRequerido && !selecciones[atributo.id]) {
        newErrors[atributo.id] = `Debes seleccionar "${atributo.nombre}".`;
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const opciones: OpcionSeleccionada[] = [];
    for (const atributo of activeAtributos) {
      const opcion = atributo.opciones.find((o) => o.id === selecciones[atributo.id]);
      if (!opcion) continue;
      opciones.push({
        atributoId: atributo.id,
        atributoNombre: atributo.nombre,
        opcionId: opcion.id,
        opcionNombre: opcion.nombre,
        precioAjuste: opcion.precioAjuste,
        insumoExtraId: opcion.insumoExtraId,
        cantidadExtra: opcion.cantidadExtra,
        insumoReemplazadoId: opcion.insumoReemplazadoId,
        insumoBaseNombre: opcion.insumoBaseNombre,
        insumoNuevoNombre: opcion.insumoNuevoNombre,
        tipoAjuste: opcion.tipoAjuste,
ajusteCantidad: opcion.ajusteCantidad,
      });
    }

    const ajustesMap: Record<string, AjusteRaw[]> = {};
    for (const attr of variaciones) {
      for (const opc of attr.opciones) {
        ajustesMap[opc.id] = opc.ajustes ?? [];
      }
    }

    const consumoInsumos = receta?.detalles
      ? calcularConsumo(receta.detalles, receta.porciones ?? 1, opciones, ajustesMap)
      : [];

    onConfirm(opciones, precioFinal, qty, consumoInsumos);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.name} size="md" closeOnOverlay={false}>
      <div className="space-y-5">

        {/* Info header: stock + precio + cantidad */}
        <div className="flex items-center justify-between bg-coffee-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-coffee-500 mb-0.5">
              {product.producible === false ? 'Producible hoy' : 'Stock disponible'}
            </p>
            <p className={clsx(
              'font-bold',
              Number.isFinite(maxProducible) ? 'text-lg' : 'text-4xl sm:text-5xl leading-none',
              qty > maxProducible ? 'text-red-600' : 'text-coffee-900',
            )}>
              {Number.isFinite(maxProducible)
                ? `${qty > maxProducible ? `Máximo: ${maxProducible}` : maxProducible} unidades`
                : '∞'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-lg border border-coffee-200 overflow-hidden">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="px-3 py-2 text-coffee-600 hover:bg-coffee-100 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className={clsx('px-3 py-2 text-sm font-bold min-w-[2.5rem] text-center', qty > maxProducible ? 'text-red-600' : 'text-coffee-900')}>
                {qty}
              </span>
              <button
                onClick={() => setQty(q => Math.min(maxProducible, q + 1))}
                disabled={qty >= maxProducible}
                className="px-3 py-2 text-coffee-600 hover:bg-coffee-100 transition-colors disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-lg font-black text-coffee-900">{formatCurrency(precioFinal * qty)}</p>
          </div>
        </div>

        {/* Ingredientes */}
        {ingredientes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-coffee-800">Ingredientes</p>
            </div>
            <div className="bg-coffee-50 rounded-xl divide-y divide-coffee-100 overflow-hidden">
              {ingredientes.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-coffee-800">{ing.nombre}</span>
                  <span className="text-xs font-semibold text-coffee-500 tabular-nums">
                    {ing.cantidad} {ing.unidad}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Variaciones */}
        {activeAtributos.map((atributo) => (
          <div key={atributo.id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-coffee-800">{atributo.nombre}</p>
              {atributo.esRequerido ? (
                <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">Requerido</span>
              ) : (
                <span className="text-xs bg-coffee-100 text-coffee-500 rounded-full px-2 py-0.5">Opcional</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {atributo.opciones.filter((o) => o.isActive).map((opcion) => {
                const selected = selecciones[atributo.id] === opcion.id;
                const outOfStock = opcionOutOfStock.has(opcion.id);
                return (
                  <button
                    key={opcion.id}
                    onClick={() => !outOfStock && handleSelect(atributo.id, opcion.id)}
                    disabled={outOfStock}
                    className={clsx(
                      'flex flex-col px-3 py-2.5 rounded-xl border text-left transition-all duration-150',
                      outOfStock
                        ? 'border-coffee-100 bg-coffee-50 opacity-60 cursor-not-allowed'
                        : selected
                          ? 'border-amber-500 bg-amber-50 shadow-sm'
                          : 'border-coffee-200 hover:border-coffee-300 hover:bg-coffee-50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={clsx('text-sm font-medium', selected ? 'text-amber-800' : 'text-coffee-800')}>
                        {opcion.nombre}
                      </span>
                      {opcion.precioAjuste !== 0 && (
                        <span className={clsx('text-xs font-semibold ml-2', opcion.precioAjuste > 0 ? 'text-green-600' : 'text-red-600')}>
                          {opcion.precioAjuste > 0 ? '+' : ''}{formatCurrency(opcion.precioAjuste)}
                        </span>
                      )}
                    </div>
                    {opcion.insumoBaseNombre && opcion.insumoNuevoNombre && (
                      <span className="text-[10px] text-coffee-400 mt-0.5">
                        {opcion.insumoBaseNombre} → {opcion.insumoNuevoNombre}
                        {opcion.ajusteCantidad ? ` (${opcion.ajusteCantidad})` : ''}
                      </span>
                    )}
                    {!opcion.insumoBaseNombre && opcion.insumoNuevoNombre && opcion.tipoAjuste === 'extra' && (
                      <span className="text-[10px] text-coffee-400 mt-0.5">
                        + {opcion.insumoNuevoNombre}
                        {opcion.ajusteCantidad ? ` (${opcion.ajusteCantidad})` : ''}
                      </span>
                    )}
                    {opcion.insumoBaseNombre && !opcion.insumoNuevoNombre && (
                      <span className="text-[10px] text-coffee-400 mt-0.5">
                        {opcion.insumoBaseNombre}
                        {opcion.ajusteCantidad ? ` (+${opcion.ajusteCantidad})` : ''}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="text-[10px] text-red-500 mt-0.5 font-medium">Sin stock</span>
                    )}
                  </button>
                );
              })}
            </div>

            {errors[atributo.id] && (
              <div className="flex items-center gap-1 mt-1.5 text-red-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <p className="text-xs">{errors[atributo.id]}</p>
              </div>
            )}
          </div>
        ))}

        {/* Precio + acción */}
        <div className="border-t border-coffee-100 pt-4 space-y-3">
          {adjustmentTotal !== 0 && (
            <div className="flex justify-between text-sm text-coffee-600">
              <span>Ajuste</span>
              <span className={adjustmentTotal > 0 ? 'text-green-600' : 'text-red-600'}>
                {adjustmentTotal > 0 ? '+' : ''}{formatCurrency(adjustmentTotal)}
              </span>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}
              onClick={handleConfirm}
            >
              Agregar — {formatCurrency(precioFinal)}
            </Button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
