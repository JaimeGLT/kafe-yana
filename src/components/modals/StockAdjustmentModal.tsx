import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Package, FlaskConical, ChefHat } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Select, SearchableSelect } from '../ui/Select';
import { FormField, Form, FormActions } from '../forms/FormField';
import { toast } from '../ui/Toast';
import type { CompradoNode, InsumoNode, ElaboradoAjusteNode } from '../../types/graphql';
import { formatCurrency } from '../../utils';
import { api } from '../../lib/api';

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
  const [elaboradoDirection, setElaboradoDirection] = React.useState<Direction>('salida');
  const [selectedId, setSelectedId] = React.useState('');
  const [quantityStr, setQuantityStr] = React.useState('');
  const [stockFisicoStr, setStockFisicoStr] = React.useState('');
  const [fechaProduccion, setFechaProduccion] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setProductType('comprado');
      setDirection('salida');
      setElaboradoDirection('salida');
      setSelectedId('');
      setQuantityStr('');
      setStockFisicoStr('');
      setFechaProduccion('');
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
    setFechaProduccion('');
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

  const handleElaboradoDirectionChange = (dir: Direction) => {
    setElaboradoDirection(dir);
    setQuantityStr('');
    setFechaProduccion('');
    setReason('');
    setErrors({});
  };

  // — Selected items —
  const selectedComprado = useMemo(
    () => comprados.find((c) => String(c.producto.id) === selectedId),
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
    const { detalles } = selectedElaborado.receta;
    return detalles.map((d) => {
      const insumo = insumos.find((i) => i.id === d.id_insumo);
      const cantidadConMerma = d.cantidad * (1 + d.merma / 100);
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
      const q = parseInt(quantityStr, 10);
      if (isNaN(q) || q <= 0) return null;
      return { diff: q, newStock: selectedComprado.stock_actual + q, perdida: 0 };
    }
    const fisico = parseInt(stockFisicoStr, 10);
    if (isNaN(fisico) || fisico < 0) return null;
    const diff = selectedComprado.stock_actual - fisico;
    return { diff, newStock: fisico, perdida: diff * selectedComprado.costo_compra };
  }, [productType, selectedComprado, direction, quantityStr, stockFisicoStr]);

  const insumoAjuste = useMemo(() => {
    if (productType !== 'insumo' || !selectedInsumo) return null;
    const fc = selectedInsumo.factor_conversion > 0 ? selectedInsumo.factor_conversion : 1;
    // stock_actual ya viene en unidad mínima (g, ml…) desde el backend
    const stockEnUso = selectedInsumo.stock_actual;
    const costoUnitario = selectedInsumo.costo / fc;
    if (direction === 'entrada') {
      const q = parseInt(quantityStr, 10);
      if (isNaN(q) || q <= 0) return null;
      const diffEnUso = q * fc;
      return { diff: diffEnUso, newStock: stockEnUso + diffEnUso, perdida: 0, costoUnitario };
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
    const units = parseInt(quantityStr, 10);
    if (isNaN(units) || units <= 0) return [];
    const { detalles } = selectedElaborado.receta;
    return detalles.map((detalle) => {
      const insumo = insumos.find((i) => i.id === detalle.id_insumo);
      const cantidadPorUnidad = detalle.cantidad * (1 + detalle.merma / 100);
      const cantidadADescontar = cantidadPorUnidad * units;
      const costoUnitario =
        insumo && insumo.factor_conversion > 0
          ? insumo.costo / insumo.factor_conversion
          : 0;
      // stock_actual ya viene en unidad mínima (g, ml…) desde el backend
      const stockActual = insumo?.stock_actual ?? 0;
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
  const tipoElaborado: 'al_momento' | 'en_lote' = selectedElaborado?.tipoPreparacion ?? 'al_momento';

  const isEfectivelySalida =
    productType !== 'elaborado'
      ? direction === 'salida'
      : tipoElaborado === 'al_momento' || elaboradoDirection === 'salida';

  const motivoOptions = useMemo(() => {
    if (productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada') {
      return []; // ENTRADA en lote no necesita motivo
    }
    const list =
      productType === 'elaborado' || direction === 'salida'
        ? MOTIVOS_SALIDA[productType]
        : MOTIVOS_ENTRADA;
    return list.map((m) => ({ value: m, label: m }));
  }, [productType, direction, tipoElaborado, elaboradoDirection]);

  const currentStockLabel =
    productType === 'comprado'
      ? `Stock actual: ${selectedComprado?.stock_actual ?? '—'} ${selectedComprado?.unidad_medida ?? ''}`
      : productType === 'insumo'
      ? `Stock actual: ${selectedInsumo ? selectedInsumo.stock_actual.toFixed(2) : '—'} ${selectedInsumo?.unidad_min_uso ?? ''}`
      : selectedElaborado
      ? tipoElaborado === 'en_lote'
        ? `Stock actual: ${selectedElaborado.stock_actual ?? 0} ${selectedElaborado.unidad_medida ?? 'unidad'}`
        : selectedElaborado.receta
        ? `Producible hoy: ${selectedElaborado.receta.cantidadProducible} ${selectedElaborado.unidad_medida ?? 'unidad'}`
        : ''
      : '';

  // — Validation —
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedId) errs.product = 'Selecciona un producto';

    if (productType === 'elaborado') {
      if (tipoElaborado === 'al_momento') {
        const u = parseInt(quantityStr, 10);
        if (isNaN(u) || u <= 0) errs.quantity = 'Ingresa una cantidad entera válida';
        if (!selectedElaborado?.receta) errs.product = 'Este elaborado no tiene receta registrada';
        if (!reason) errs.reason = 'Selecciona un motivo';
        if (!errs.quantity && !errs.product && elaboradoExplosion.length > 0) {
          const insuficientes = elaboradoExplosion.filter((i) => i.stockNuevo < 0);
          if (insuficientes.length > 0) {
            errs.quantity = `Insumos insuficientes: ${insuficientes.map((i) => `${i.nombre} (hay ${i.stockActual.toFixed(0)} ${i.unidad}, se necesitan ${i.cantidadADescontar.toFixed(0)})`).join('; ')}.`;
          }
        }
      } else if (elaboradoDirection === 'entrada') {
        const u = parseInt(quantityStr, 10);
        if (isNaN(u) || u <= 0) errs.quantity = 'Ingresa una cantidad entera válida';
        if (!selectedElaborado?.receta) errs.product = 'Este elaborado no tiene receta registrada';
      } else {
        const u = parseInt(quantityStr, 10);
        if (isNaN(u) || u <= 0) errs.quantity = 'Ingresa una cantidad entera válida';
        if (!reason) errs.reason = 'Selecciona un motivo';
        const stockDisponible = selectedElaborado?.stock_actual ?? 0;
        if (!isNaN(u) && u > 0 && u > stockDisponible) {
          errs.quantity = `Stock insuficiente. Solo hay ${stockDisponible} ${selectedElaborado?.unidad_medida ?? 'unidades'} en stock.`;
        }
      }
    } else if (direction === 'entrada') {
      const q = parseInt(quantityStr, 10);
      if (isNaN(q) || q <= 0) errs.quantity = 'Ingresa una cantidad entera válida';
      if (!reason) errs.reason = 'Selecciona un motivo';
    } else {
      const f = productType === 'insumo' ? parseFloat(stockFisicoStr) : parseInt(stockFisicoStr, 10);
      if (isNaN(f) || f < 0) errs.stockFisico = 'Ingresa el stock físico actual (puede ser 0)';
      if (productType === 'comprado' && !isNaN(f) && f > (selectedComprado?.stock_actual ?? 0)) {
        errs.stockFisico = `No puede superar el stock actual (${selectedComprado?.stock_actual ?? 0} ${selectedComprado?.unidad_medida ?? 'unidades'}).`;
      }
      if (!reason) errs.reason = 'Selecciona un motivo';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const frontendErrors = validate();
    if (Object.keys(frontendErrors).length > 0) {
      const firstError = Object.values(frontendErrors).flat()[0];
      toast.error('Error de validación', firstError);
      return;
    }
    setIsLoading(true);
    try {
      const id = parseInt(selectedId);

      if (productType === 'comprado') {
        const isEntrada = direction === 'entrada';
        const cantidad = isEntrada ? parseInt(quantityStr, 10) : (compradoAjuste?.diff ?? 0);
        await api.post(`/AjusteStock/Comprado?entrada=${isEntrada}`, {
          id,
          cantidad,
          motivo: reason,
          nota: notes,
        });
      } else if (productType === 'insumo') {
        const isEntrada = direction === 'entrada';
        const cantidad = (insumoAjuste?.diff ?? 0)
        await api.post(`/AjusteStock/Insumo?entrada=${isEntrada}`, {
          id,
          cantidad,
          motivo: reason,
          nota: notes,
        });
      } else {
        const isEntrada = tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada';
        const cantidadIngresada = parseInt(quantityStr, 10);
        const fecha = fechaProduccion
          ? new Date(fechaProduccion).toISOString()
          : new Date().toISOString();
        const cantidad = cantidadIngresada;
        await api.post(`/AjusteStock/Elaborado?entrada=${isEntrada}`, {
          id_elaborado: id,
          cantidad,
          fecha,
          motivo: isEntrada ? '' : reason,
          nota: notes,
        });
      }

      const productLabel =
        productType === 'comprado'
          ? selectedComprado?.producto.nombre
          : productType === 'insumo'
          ? selectedInsumo?.nombre
          : selectedElaborado?.producto.nombre;
      const accionLabel =
        productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada'
          ? 'Producción registrada'
          : isEfectivelySalida
          ? 'Salida aplicada'
          : 'Entrada aplicada';
      toast.success('Ajuste de stock registrado', `${accionLabel} a ${productLabel}.`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo registrar el ajuste.';
      toast.error('Error del servidor', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajuste de Stock" size="xl" bottomSheet>
      <Form onSubmit={handleSubmit}>
        {/* Tipo de producto */}
        <div className="space-y-1">
          <span className="block text-sm font-medium text-coffee-700">Tipo de producto</span>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
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
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dirección — solo para comprado/insumo */}
        {productType !== 'elaborado' && (
          <div className="space-y-1">
            <span className="block text-sm font-medium text-coffee-700">Tipo de ajuste</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <span className="hidden sm:inline">Entrada (sumar stock)</span>
                <span className="sm:hidden">Entrada</span>
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
                <span className="hidden sm:inline">Salida (merma / pérdida)</span>
                <span className="sm:hidden">Salida</span>
              </button>
            </div>
          </div>
        )}

        {/* Elaborado al_momento: siempre salida merma */}
        {productType === 'elaborado' && (!selectedId || tipoElaborado === 'al_momento') && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0 hidden sm:inline" />
            {selectedId && tipoElaborado === 'al_momento'
              ? <><strong className="font-semibold">Producto preparado al momento.</strong> Solo se puede registrar salida por merma — descuenta insumos automáticamente.</>
              : <><strong className="font-semibold hidden sm:inline">Atención:</strong> Los ajustes de elaborados dependen del tipo de preparación del producto.</>}
          </div>
        )}

        {/* Elaborado en_lote: selector ENTRADA / SALIDA */}
        {productType === 'elaborado' && selectedId && tipoElaborado === 'en_lote' && (
          <div className="space-y-1">
            <span className="block text-sm font-medium text-coffee-700">Tipo de ajuste</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleElaboradoDirectionChange('entrada')}
                className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  elaboradoDirection === 'entrada'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  ENTRADA
                </span>
                <span className="text-xs font-normal text-current opacity-75 pl-6">Registro de producción</span>
              </button>
              <button
                type="button"
                onClick={() => handleElaboradoDirectionChange('salida')}
                className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  elaboradoDirection === 'salida'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-coffee-200 bg-white text-coffee-500 hover:border-coffee-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  SALIDA
                </span>
                <span className="text-xs font-normal text-current opacity-75 pl-6">Merma / pérdida</span>
              </button>
            </div>
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
        >
          <SearchableSelect
            value={selectedId}
            onChange={(v) => {
              setSelectedId(v);
              setQuantityStr('');
              setStockFisicoStr('');
            }}
            options={
              productType === 'comprado'
                ? comprados.map((c) => ({
                    value: String(c.producto.id),
                    label: `${c.producto.nombre} — Stock: ${c.stock_actual} ${c.unidad_medida}`,
                  }))
                : productType === 'insumo'
                ? insumos.map((i) => ({
                    value: String(i.id),
                    label: `${i.nombre} — Stock: ${i.stock_actual.toFixed(2)} ${i.unidad_min_uso}`,
                  }))
                : elaborados.map((e) => ({
                    value: String(e.id_Producto),
                    label: e.producto.nombre,
                  }))
            }
            placeholder="Seleccionar..."
            error={errors.product}
            showMessage={false}
          />
          {selectedId && currentStockLabel && (
            <p className="text-xs text-coffee-500 mt-1">{currentStockLabel}</p>
          )}
        </FormField>

        {/* Preview de receta (elaborado seleccionado, aún sin cantidad) — no mostrar en en_lote salida */}
        {productType === 'elaborado' && selectedElaborado && recetaPreview.length > 0 &&
          !(tipoElaborado === 'en_lote' && elaboradoDirection === 'salida') && (
          <div className="rounded-xl border border-coffee-100 bg-coffee-50 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-coffee-600 uppercase tracking-wide">
              {tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada'
                ? 'Por cada unidad producida se consumirá:'
                : 'Por cada unidad perdida se descontará:'}
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
            {/* Comprado/insumo entrada: cantidad directa */}
            {productType !== 'elaborado' && direction === 'entrada' && (
              <FormField label={`Cantidad a agregar (${selectedInsumo?.unidad_compra ?? 'unidades'})`} required>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantityStr}
                  onChange={(e) => { setQuantityStr(e.target.value); }}
                  placeholder="0"
                />
                {selectedInsumo && (
                  <p className="text-xs text-coffee-500 mt-1">
                    Equivale a {(parseInt(quantityStr, 10) || 0) * selectedInsumo.factor_conversion} {selectedInsumo.unidad_min_uso}
                  </p>
                )}
              </FormField>
            )}

            {/* Comprado/insumo salida: conciliación por stock físico */}
            {productType !== 'elaborado' && direction === 'salida' && (
              <FormField
                label={`¿Cuánto hay físicamente ahora? (${
                  productType === 'comprado'
                    ? selectedComprado?.unidad_medida ?? 'unidades'
                    : selectedInsumo?.unidad_min_uso ?? 'unidades'
                })`}
                required
              >
                <Input
                  type="number"
                  min="0"
                  step={productType === 'insumo' ? '0.001' : '1'}
                  value={stockFisicoStr}
                  onChange={(e) => { setStockFisicoStr(e.target.value); }}
                  placeholder="0"
                />
                <p className="text-xs text-coffee-500 mt-1">El sistema calcula la diferencia automáticamente.</p>
              </FormField>
            )}

            {/* Elaborado al_momento: siempre cantidad de merma */}
            {productType === 'elaborado' && tipoElaborado === 'al_momento' && (
              <FormField label="Unidades perdidas / dadas de baja" required>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantityStr}
                  onChange={(e) => { setQuantityStr(e.target.value); }}
                  placeholder="0"
                />
              </FormField>
            )}

            {/* Elaborado en_lote ENTRADA: cantidad producida + fecha */}
            {productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada' && (
              <>
                <FormField label="Cantidad a producir" required>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantityStr}
                    onChange={(e) => { setQuantityStr(e.target.value); }}
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Fecha de producción">
                  <Input
                    type="date"
                    value={fechaProduccion}
                    onChange={(e) => setFechaProduccion(e.target.value)}
                  />
                </FormField>
              </>
            )}

            {/* Elaborado en_lote SALIDA: cantidad a dar de baja */}
            {productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'salida' && (
              <FormField label={`Cantidad a dar de baja (${selectedElaborado?.unidad_medida ?? 'unidades'})`} required>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantityStr}
                  onChange={(e) => { setQuantityStr(e.target.value); }}
                  placeholder="0"
                />
                {/* Preview de stock en lote salida */}
                {(() => {
                  const q = parseInt(quantityStr, 10);
                  const stock = selectedElaborado?.stock_actual ?? 0;
                  if (isNaN(q) || q <= 0) return null;
                  const nuevoStock = stock - q;
                  return (
                    <div className={`mt-2 rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${nuevoStock < 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-coffee-50 border border-coffee-200 text-coffee-700'}`}>
                      {nuevoStock < 0
                        ? <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Stock insuficiente: solo hay <strong className="mx-1">{stock}</strong> {selectedElaborado?.unidad_medida ?? 'unidades'} disponibles.</>
                        : <>Stock actual <strong className="mx-1">{stock}</strong> → Stock nuevo <strong className="mx-1">{nuevoStock}</strong> {selectedElaborado?.unidad_medida ?? 'unidades'}</>
                      }
                    </div>
                  );
                })()}
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

        {/* Explosión de receta — elaborado (no para en_lote salida) */}
        {productType === 'elaborado' && elaboradoExplosion.length > 0 &&
          !(tipoElaborado === 'en_lote' && elaboradoDirection === 'salida') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-coffee-800">
                {tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada'
                  ? 'Insumos que se consumirán'
                  : 'Insumos que se descontarán'}
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
              <span className="text-coffee-600">
                {tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada'
                  ? 'Costo total de producción:'
                  : 'Pérdida total estimada:'}
              </span>
              <span className={`font-semibold ${tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada' ? 'text-coffee-800' : 'text-red-600'}`}>
                {formatCurrency(totalPerdida)}
              </span>
            </div>
          </div>
        )}

        {/* Motivo — oculto para en_lote ENTRADA */}
        {!(productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada') && (
          <FormField label="Motivo" required>
            <Select
              value={reason}
              onChange={setReason}
              options={motivoOptions}
              placeholder="Seleccionar motivo..."
            />
          </FormField>
        )}

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
              productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : isEfectivelySalida
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            }
          >
            {productType === 'elaborado' && tipoElaborado === 'en_lote' && elaboradoDirection === 'entrada'
              ? 'Registrar Producción'
              : isEfectivelySalida
              ? 'Registrar Salida / Merma'
              : 'Aplicar Entrada'}
          </Button>
        </FormActions>
      </Form>
    </Modal>
  );
};
