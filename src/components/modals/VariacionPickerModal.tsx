import React from 'react';
import { clsx } from 'clsx';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils';
import type { Product, VariacionAtributo, OpcionSeleccionada } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  atributos: VariacionAtributo[];
  onConfirm: (opciones: OpcionSeleccionada[], precioFinal: number) => void;
}

export const VariacionPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  product,
  atributos,
  onConfirm,
}) => {
  const [selecciones, setSelecciones] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setSelecciones({});
      setErrors({});
    }
  }, [isOpen]);

  const activeAtributos = atributos.filter((a) => a.isActive);

  const precioFinal = React.useMemo(() => {
    let total = product.salePrice;
    for (const atributo of activeAtributos) {
      const selectedOpcionId = selecciones[atributo.id];
      if (!selectedOpcionId) continue;
      const opcion = atributo.opciones.find((o) => o.id === selectedOpcionId);
      if (opcion) total += opcion.precioAjuste;
    }
    return total;
  }, [selecciones, product.salePrice, activeAtributos]);

  const adjustmentTotal = precioFinal - product.salePrice;

  const handleSelect = (atributoId: string, opcionId: string) => {
    setSelecciones((prev) => ({ ...prev, [atributoId]: opcionId }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[atributoId];
      return next;
    });
  };

  const handleConfirm = () => {
    const newErrors: Record<string, string> = {};
    for (const atributo of activeAtributos) {
      if (atributo.esRequerido && !selecciones[atributo.id]) {
        newErrors[atributo.id] = `Debes seleccionar una opción para "${atributo.nombre}".`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const opciones: OpcionSeleccionada[] = [];
    for (const atributo of activeAtributos) {
      const selectedOpcionId = selecciones[atributo.id];
      if (!selectedOpcionId) continue;
      const opcion = atributo.opciones.find((o) => o.id === selectedOpcionId);
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
      });
    }

    onConfirm(opciones, precioFinal);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlay={false}
      title={`Personalizar: ${product.name}`}
      size="md"
    >
      <div className="space-y-5">
        {/* Base price */}
        <div className="flex items-center justify-between bg-coffee-50 rounded-xl px-4 py-3">
          <span className="text-sm text-coffee-600">Precio base</span>
          <span className="font-semibold text-coffee-900">{formatCurrency(product.salePrice)}</span>
        </div>

        {/* Atributos */}
        {activeAtributos.map((atributo) => (
          <div key={atributo.id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-coffee-800">{atributo.nombre}</p>
              {atributo.esRequerido ? (
                <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                  Requerido
                </span>
              ) : (
                <span className="text-xs bg-coffee-100 text-coffee-500 rounded-full px-2 py-0.5">
                  Opcional
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {atributo.opciones
                .filter((o) => o.isActive)
                .map((opcion) => {
                  const selected = selecciones[atributo.id] === opcion.id;
                  return (
                    <button
                      key={opcion.id}
                      onClick={() => handleSelect(atributo.id, opcion.id)}
                      className={clsx(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all duration-150',
                        selected
                          ? 'border-amber-500 bg-amber-50 shadow-sm'
                          : 'border-coffee-200 hover:border-coffee-300 hover:bg-coffee-50'
                      )}
                    >
                      <span className={clsx(
                        'text-sm font-medium',
                        selected ? 'text-amber-800' : 'text-coffee-800'
                      )}>
                        {opcion.nombre}
                      </span>
                      {opcion.precioAjuste !== 0 && (
                        <span className={clsx(
                          'text-xs font-semibold ml-2',
                          opcion.precioAjuste > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        )}>
                          {opcion.precioAjuste > 0 ? '+' : ''}{formatCurrency(opcion.precioAjuste)}
                        </span>
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

        {/* Price summary */}
        <div className="border-t border-coffee-100 pt-4 space-y-1">
          {adjustmentTotal !== 0 && (
            <div className="flex justify-between text-sm text-coffee-600">
              <span>Ajuste variaciones</span>
              <span className={adjustmentTotal > 0 ? 'text-green-600' : 'text-red-600'}>
                {adjustmentTotal > 0 ? '+' : ''}{formatCurrency(adjustmentTotal)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-base font-bold text-coffee-900">Precio final</span>
            <span className="text-2xl font-display font-bold text-coffee-900">{formatCurrency(precioFinal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
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
    </Modal>
  );
};
