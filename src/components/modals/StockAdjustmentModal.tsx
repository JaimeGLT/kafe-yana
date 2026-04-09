import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Package, FlaskConical, ChefHat } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { FormField, Form, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import type { CompradoNode, InsumoNode, ElaboradoAjusteNode } from '../../types/graphql';
import { formatCurrency } from '../../utils';

type ProductType = 'comprado' | 'insumo' | 'elaborado';
type Direction = 'entrada' | 'salida';

interface IngredienteExplosion {
  id_insumo: number;
  nombre: string;
  unidad: string;
  stockActual: number;
  cantidadADescontar: number;
  stockNuevo: number;
  costoUnitario: number;
  perdida: number;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  comprados: CompradoNode[];
  insumos: InsumoNode[];
  elaborados: ElaboradoAjusteNode[];
}

const PRODUCT_TYPE_TABS: { value: ProductType; label: string; icon: React.ReactNode }[] = [
  { value: 'comprado', label: 'Comprado', icon: <Package className="h-4 w-4" /> },
  { value: 'insumo', label: 'Insumo', icon: <FlaskConical className="h-4 w-4" /> },
  { value: 'elaborado', label: 'Elaborado', icon: <ChefHat className="h-4 w-4" /> },
];

const MOTIVOS_SALIDA: Record<ProductType, string[]> = {
  comprado: ['Vencimiento', 'Robo / Pérdida', 'Inventario físico', 'Daño'],
  insumo: ['Vencimiento', 'Derrame', 'Inventario físico', 'Daño', 'Uso interno'],
  elaborado: ['Accidente al servir', 'Error de preparación', 'Prueba de calidad'],
};

const MOTIVOS_ENTRADA = ['Reposición', 'Devolución de proveedor', 'Corrección de inventario'];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  comprados,
  insumos,
  elaborados,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [productType, setProductType] = React.useState<ProductType>('comprado');
  const [direction, setDirection] = React.useState<Direction>('salida');
  const [selectedId, setSelectedId] = React.useState('');
  const [quantityStr, setQuantityStr] = React.useState('');
  const [stockFisicoStr, setStockFisicoStr] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setProductType('comprado');
      setDirection('salida');
      setSelectedId('');
      setQuantityStr('');
      setStockFisicoStr('');
      setReason('');
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  const handleTypeChange = (type: ProductType) => {
    setProductType(type);
    setSelectedId('');
    setQuantityStr('');
    setStockFisicoStr('');
    setReason('');
    setErrors({});
  };

  const handleDirectionChange = (dir: Direction) => {
    setDirection(dir);
    setQuantityStr('');
    setStockFisicoStr('');
    setReason('');
    setErrors({});
  };

  // — Selected items —
  const selectedComprado = useMemo(
    () => comprados.find((c) => String(c.id) === selectedId),
    [comprados, selectedId]
  );
  const selectedInsumo = useMemo(
    () => insumos.find((i) => String(i.id) === selectedId),
    [insumos, selectedId]
  );
  const selectedElaborado = useMemo(
    () => elaborados.find((e) => String(e.id_Producto) === selectedId),
    [elaborados, selectedId]
  );

  // — Per-unit recipe preview (shown as soon as elaborado is selected) —
  // Incluye merma para que coincida exactamente con lo que se descontará en la explosión
  const recetaPreview = useMemo(() => {
    if (productType !== 'elaborado' || !selectedElaborado?.receta) return [];
    const { porciones, detalles } = selectedElaborado.receta;
    return detalles.map((d) => {
      const insumo = insumos.find((i) => i.id === d.id_insumo);
      const cantidadPorUnidad = porciones > 0 ? d.cantidad / porciones : d.cantidad;
      const cantidadConMerma = cantidadPorUnidad * (1 + d.merma / 100);
      return {
        id_insumo: d.id_insumo,
        nombre: insumo?.nombre ?? `Insumo #${d.id_insumo}`,
        cantidad: cantidadConMerma,
        unidad: insumo?.unidad_min_uso ?? '',
      };
    });
  }, [productType, selectedElaborado, insumos]);

  // — Computed adjustment values —
  const compradoAjuste = useMemo(() => {
    if (productType !== 'comprado' || !selectedComprado) return null;
    if (direction === 'entrada') {
      const q = parseFloat(quantityStr);
      if (isNaN(q) || q <= 0) return null;
      return { diff: q, newStock: selectedComprado.stock_actual + q, perdida: 0 };
    }
    const fisico = parseFloat(stockFisicoStr);
    if (isNaN(fisico) || fisico < 0) return null;
    const diff = selectedComprado.stock_actual - fisico;
    return { diff, newStock: fisico, perdida: diff * selectedComprado.costo_compra };
  }, [productType, selectedComprado, direction, quantityStr, stockFisicoStr]);

  const insumoAjuste = useMemo(() => {
    if (productType !== 'insumo' || !selectedInsumo) return null;
    const fc = selectedInsumo.factor_conversion > 0 ? selectedInsumo.factor_conversion : 1;
    // El stock siempre se muestra y opera en unidad de uso (ml, g, etc.)
    const stockEnUso = selectedInsumo.stock_actual * fc;
    const costoUnitario = selectedInsumo.costo / fc;
    if (direction === 'entrada') {
      const q = parseFloat(quantityStr);
      if (isNaN(q) || q <= 0) return null;
      return { diff: q, newStock: stockEnUso + q, perdida: 0, costoUnitario };
    }
    // Salida: el usuario ingresa cuánto hay físicamente en unidad de uso
    const fisico = parseFloat(stockFisicoStr);
    if (isNaN(fisico) || fisico < 0) return null;
    const diff = stockEnUso - fisico;
    return {
      diff,
      newStock: fisico,
      perdida: diff > 0 ? diff * costoUnitario : 0,
      costoUnitario,
    };
  }, [productType, selectedInsumo, direction, quantityStr, stockFisicoStr]);

  const elaboradoExplosion = useMemo((): IngredienteExplosion[] => {
    if (productType !== 'elaborado' || !selectedElaborado?.receta) return [];
    const units = parseFloat(quantityStr);
    if (isNaN(units) || units <= 0) return [];
    const { porciones, detalles } = selectedElaborado.receta;
    return detalles.map((detalle) => {
      const insumo = insumos.find((i) => i.id === detalle.id_insumo);
      const cantidadPorUnidad = porciones > 0 ? detalle.cantidad / porciones : detalle.cantidad;
      const cantidadConMerma = cantidadPorUnidad * (1 + detalle.merma / 100);
      const cantidadADescontar = cantidadConMerma * units;
      const costoUnitario =
        insumo && insumo.factor_conversion > 0
          ? insumo.costo / insumo.factor_conversion
          : 0;
      // Stock en unidad de uso (ml, g…) = stock_actual × factor_conversion
      const fc = insumo && insumo.factor_conversion > 0 ? insumo.factor_conversion : 1;
      const stockActual = (insumo?.stock_actual ?? 0) * fc;
      return {
        id_insumo: detalle.id_insumo,
        nombre: insumo?.nombre ?? `Insumo #${detalle.id_insumo}`,
        unidad: insumo?.unidad_min_uso ?? '',
        stockActual,
        cantidadADescontar,
        stockNuevo: stockActual - cantidadADescontar,
        costoUnitario,
        perdida: cantidadADescontar * costoUnitario,
      };
    });
  }, [productType, selectedElaborado, quantityStr, insumos]);

  const totalPerdida = useMemo(() => {
    if (productType === 'elaborado') return elaboradoExplosion.reduce((s, i) => s + i.perdida, 0);
    return compradoAjuste?.perdida ?? insumoAjuste?.perdida ?? 0;
  }, [productType, compradoAjuste, insumoAjuste, elaboradoExplosion]);

  // — Derived UI helpers —
  const isEfectivelySalida = productType === 'elaborado' || direction === 'salida';

  const motivoOptions = useMemo(() => {
    const list =
      productType === 'elaborado' || direction === 'salida'
        ? MOTIVOS_SALIDA[productType]
        : MOTIVOS_ENTRADA;
    return list.map((m) => ({ value: m, label: m }));
  }, [productType, direction]);

  const currentStockLabel =
    productType === 'comprado'
      ? `Stock actual: ${selectedComprado?.stock_actual ?? '—'} ${selectedComprado?.unidad_medida ?? ''}`
      : productType === 'insumo'
      ? `Stock actual: ${
          selectedInsumo
            ? (selectedInsumo.stock_actual * (selectedInsumo.factor_conversion > 0 ? selectedInsumo.factor_conversion : 1)).toFixed(2)
            : '—'
        } ${selectedInsumo?.unidad_min_uso ?? ''}`
      : selectedElaborado?.receta
      ? `Producible hoy: ${selectedElaborado.receta.cantidadProducible} ${selectedElaborado.unidad_medida ?? 'unidad'}`
      : '';

  // — Validation —
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedId) errs.product = 'Selecciona un producto';
    if (!reason) errs.reason = 'Selecciona un motivo';

    if (productType === 'elaborado') {
      const u = parseFloat(quantityStr);
      if (isNaN(u) || u <= 0) errs.quantity = 'Ingresa una cantidad válida';
      if (!selectedElaborado?.receta) errs.product = 'Este elaborado no tiene receta registrada';
    } else if (direction === 'entrada') {
      const q = parseFloat(quantityStr);
      if (isNaN(q) || q <= 0) errs.quantity = 'Ingresa una cantidad válida';
    } else {
      const f = parseFloat(stockFisicoStr);
      if (isNaN(f) || f < 0) errs.stockFisico = 'Ingresa el stock físico actual (puede ser 0)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      // TODO: llamar mutación GraphQL o endpoint REST cuando esté disponible
      await new Promise((r) => setTimeout(r, 400));
      const productLabel =
        productType === 'comprado'
          ? selectedComprado?.nombre
          : productType === 'insumo'
          ? selectedInsumo?.nombre
          : selectedElaborado?.producto.nombre;
      toast.success(
        'Ajuste de stock registrado',
        `${isEfectivelySalida ? 'Salida' : 'Entrada'} aplicada a ${productLabel}.`
      );
      onSuccess();
      onClose();
    } catch {
      toast.error('Error', 'No se pudo registrar el ajuste. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste de Stock" size="xl">
      <Form onSubmit={handleSubmit}>
        {/* Tipo de producto */}
        <div className="space-y-1">
          <span className="block text-sm font-medium text-coffee-700">Tipo de producto</span>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPE_TABS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  productType === value
                    ? 'border-coffee-500 bg-coffee-50 text-coffee-800'
                    : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dirección — oculta para elaborado (siempre salida) */}
        {productType !== 'elaborado' && (
          <div className="space-y-1">
            <span className="block text-sm font-medium text-coffee-700">Tipo de ajuste</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDirectionChange('entrada')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  direction === 'entrada'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Entrada (sumar stock)
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange('salida')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  direction === 'salida'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                Salida (merma / pérdida)
              </button>
            </div>
          </div>
        )}

        {productType === 'elaborado' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Los ajustes de elaborados son siempre{' '}
            <strong className="ml-1">salida por merma</strong>. El sistema descuenta
            automáticamente todos los insumos de la receta.
          </div>
        )}

        {/* Selector de producto */}
        <FormField
          label={
            productType === 'insumo'
              ? 'Insumo'
              : productType === 'elaborado'
              ? 'Producto Elaborado'
              : 'Producto Comprado'
          }
          required
          error={errors.product}
        >
          <Select
            value={selectedId}
            onChange={(v) => {
              setSelectedId(v);
              setQuantityStr('');
              setStockFisicoStr('');
              setErrors((p) => ({ ...p, product: '' }));
            }}
            options={
              productType === 'comprado'
                ? comprados.map((c) => ({
                    value: String(c.id),
                    label: `${c.nombre} — Stock: ${c.stock_actual} ${c.unidad_medida}`,
                  }))
                : productType === 'insumo'
                ? insumos.map((i) => ({
                    value: String(i.id),
                    label: `${i.nombre} — Stock: ${(i.stock_actual * (i.factor_conversion > 0 ? i.factor_conversion : 1)).toFixed(2)} ${i.unidad_min_uso}`,
                  }))
                : elaborados.map((e) => ({
                    value: String(e.id_Producto),
                    label: e.producto.nombre,
                  }))
            }
            placeholder="Seleccionar..."
            error={errors.product}
          />
          {selectedId && currentStockLabel && (
            <p className="text-xs text-coffee-500 mt-1">{currentStockLabel}</p>
          )}
        </FormField>

        {/* Preview de receta (elaborado seleccionado, aún sin cantidad) */}
        {productType === 'elaborado' && selectedElaborado && recetaPreview.length > 0 && (
          <div className="rounded-xl border border-coffee-100 bg-coffee-50 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">
              Por cada unidad perdida se descontará:
            </p>
            <div className="flex flex-wrap gap-2">
              {recetaPreview.map((ing) => (
                <span
                  key={ing.id_insumo}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-coffee-200 text-xs font-medium text-coffee-800"
                >
                  <span className="font-bold text-coffee-900">
                    {ing.cantidad % 1 === 0
                      ? ing.cantidad.toFixed(0)
                      : ing.cantidad.toFixed(2)}
                    {ing.unidad && ` ${ing.unidad}`}
                  </span>
                  {ing.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sin receta */}
        {productType === 'elaborado' && selectedElaborado && !selectedElaborado.receta && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Este elaborado no tiene receta registrada. No se puede calcular la explosión de ingredientes.
          </div>
        )}

        {/* Inputs de cantidad */}
        {selectedId && (
          <>
            {/* Entrada (comprado/insumo) o elaborado: cantidad directa */}
            {(direction === 'entrada' || productType === 'elaborado') && (
              <FormField
                label={
                  productType === 'elaborado'
                    ? 'Unidades perdidas / dadas de baja'
                    : 'Cantidad a agregar'
                }
                required
                error={errors.quantity}
              >
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantityStr}
                  onChange={(e) => {
                    setQuantityStr(e.target.value);
                    setErrors((p) => ({ ...p, quantity: '' }));
                  }}
                  placeholder="0"
                  error={errors.quantity}
                />
              </FormField>
            )}

            {/* Salida comprado/insumo: conciliación por stock físico */}
            {direction === 'salida' && productType !== 'elaborado' && (
              <FormField
                label={`¿Cuánto hay físicamente ahora? (${
                  productType === 'comprado'
                    ? selectedComprado?.unidad_medida ?? 'unidades'
                    : selectedInsumo?.unidad_min_uso ?? 'unidades'
                })`}
                required
                error={errors.stockFisico}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={stockFisicoStr}
                  onChange={(e) => {
                    setStockFisicoStr(e.target.value);
                    setErrors((p) => ({ ...p, stockFisico: '' }));
                  }}
                  placeholder="0"
                  error={errors.stockFisico}
                />
                <p className="text-xs text-coffee-500 mt-1">
                  El sistema calcula la diferencia automáticamente.
                </p>
              </FormField>
            )}
          </>
        )}

        {/* Resumen de ajuste — comprado/insumo */}
        {(compradoAjuste || insumoAjuste) && (
          <div className="rounded-xl border border-coffee-100 bg-coffee-50 p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-coffee-800">Resumen del ajuste</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-coffee-500 mb-0.5">Stock anterior</p>
                <p className="font-semibold text-coffee-800">
                  {productType === 'comprado'
                    ? selectedComprado?.stock_actual
                    : selectedInsumo?.stock_actual}
                </p>
              </div>
              <div>
                <p className="text-xs text-coffee-500 mb-0.5">Diferencia</p>
                <p
                  className={`font-semibold ${
                    direction === 'entrada' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {direction === 'entrada' ? '+' : '-'}
                  {compradoAjuste?.diff ?? insumoAjuste?.diff ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-coffee-500 mb-0.5">Stock nuevo</p>
                <p
                  className={`font-semibold ${
                    (compradoAjuste?.newStock ?? insumoAjuste?.newStock ?? 1) <= 0
                      ? 'text-red-600'
                      : 'text-coffee-900'
                  }`}
                >
                  {compradoAjuste?.newStock ?? insumoAjuste?.newStock ?? 0}
                </p>
              </div>
            </div>
            {direction === 'salida' && totalPerdida > 0 && (
              <div className="pt-2 border-t border-coffee-200 flex items-center justify-between">
                <span className="text-coffee-600">Pérdida estimada:</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalPerdida)}</span>
              </div>
            )}
          </div>
        )}

        {/* Explosión de receta — elaborado */}
        {productType === 'elaborado' && elaboradoExplosion.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-coffee-800">
                Insumos que se descontarán
              </h4>
              <span className="text-xs text-coffee-500">
                {elaboradoExplosion.length} ingrediente(s)
              </span>
            </div>
            <div className="rounded-xl border border-coffee-100 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-coffee-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-coffee-600">
                      Insumo
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-coffee-600">
                      Stock actual
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-coffee-600">
                      A descontar
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-coffee-600">
                      Stock nuevo
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-coffee-600">
                      Pérdida
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-coffee-100">
                  {elaboradoExplosion.map((ing) => (
                    <tr key={ing.id_insumo} className={ing.stockNuevo < 0 ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-coffee-900">{ing.nombre}</p>
                        <p className="text-xs text-coffee-500">{ing.unidad}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-coffee-700">
                        {ing.stockActual.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-red-600">
                        -{ing.cantidadADescontar.toFixed(3)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-semibold ${
                          ing.stockNuevo < 0 ? 'text-red-600' : 'text-coffee-900'
                        }`}
                      >
                        {ing.stockNuevo.toFixed(2)}
                        {ing.stockNuevo < 0 && (
                          <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-red-500" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-red-600">
                        {formatCurrency(ing.perdida)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-coffee-600">Pérdida total estimada:</span>
              <span className="font-semibold text-red-600">{formatCurrency(totalPerdida)}</span>
            </div>
          </div>
        )}

        {/* Motivo — Select con opciones según tipo y dirección */}
        <FormField label="Motivo" required error={errors.reason}>
          <Select
            value={reason}
            onChange={(v) => {
              setReason(v);
              setErrors((p) => ({ ...p, reason: '' }));
            }}
            options={motivoOptions}
            placeholder="Seleccionar motivo..."
            error={errors.reason}
          />
        </FormField>

        <FormField label="Notas adicionales">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones opcionales"
            rows={2}
          />
        </FormField>

        <FormActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className={
              isEfectivelySalida
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }
          >
            {isEfectivelySalida ? 'Registrar Salida / Merma' : 'Aplicar Entrada'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
