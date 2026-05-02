import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { gql } from '../../lib/graphql';
import { GET_ALL_INSUMOS } from '../../lib/queries/insumos.queries';
import { mapInsumo } from '../../lib/mappers/insumos.mappers';
import { getMarginInfo } from '../../lib/elaborados.utils';
import type { InsumosResponse } from '../../types/graphql';
import { Button, Input, Select } from '../ui';
import { HelpTooltip } from '../ui/Tooltip';
import { InsumoModal } from '../modals/InsumoModal';
import { toast } from '../ui/Toast';
import type { Receta, Insumo } from '../../types';
import { formatCurrency } from '../../utils';

interface RecetaStepTwoProps {
  productId: string;
  productName: string;
  productSalePrice: number;
  onDone: () => void;
  onSkip: () => void;
  insumos: Insumo[];
  recetas: Receta[];
  onAddReceta: (receta: { productId: string; nombre: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number }[]; notas?: string }, productName: string) => Promise<void>;
}

export const RecetaStepTwo: React.FC<RecetaStepTwoProps> = ({ productId, productName, productSalePrice, onDone, onSkip, insumos: insumosProp, recetas, onAddReceta }) => {
  const product = { id: productId, name: productName, salePrice: productSalePrice };

  const [mode, setMode] = useState<'nueva' | 'existente'>('nueva');
  const [selectedRecetaId, setSelectedRecetaId] = useState('');
  const [localInsumos, setLocalInsumos] = useState<Insumo[]>(insumosProp);

  const [nombre, setNombre] = useState('');
  const [porcionesBase, setPorcionesBase] = useState(1);
  const [ingredientes, setIngredientes] = useState([{ insumoId: '', quantity: 0, merma: 0 }]);
  const [notas, setNotas] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);

  const handleInsumoCreated = useCallback(async () => {
    setInsumoModalOpen(false);
    const data = await gql<InsumosResponse>(GET_ALL_INSUMOS);
    setLocalInsumos(data.insumos.nodes.map(mapInsumo));
  }, []);

  const recetaOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar receta existente…' }].concat(
        recetas
          .filter((r) => !r.productId)
          .map((r) => ({ value: r.id, label: `${r.productName} (${r.ingredientes.length} ingredientes)` }))
      ),
    [recetas]
  );

  const insumoOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar insumo…' }].concat(
        localInsumos.filter((i) => i.isActive).map((i) => ({ value: i.id, label: `${i.name} (${i.unidadMinima})` }))
      ),
    [localInsumos]
  );

  const costoTotal = useMemo(
    () =>
      ingredientes.reduce((sum, ing) => {
        const insumo = localInsumos.find((i) => i.id === ing.insumoId);
        if (!insumo || ing.quantity <= 0) return sum;
        return sum + insumo.costoUnitario * ing.quantity * (1 + ing.merma / 100);
      }, 0),
    [ingredientes, localInsumos]
  );

  const porciones = porcionesBase > 0 ? porcionesBase : 1;
  const costoPorPorcion = costoTotal / porciones;
  const margenAbs = product ? product.salePrice - costoPorPorcion : null;
  const margenPct = product && product.salePrice > 0 ? ((margenAbs! / product.salePrice) * 100) : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;

  const addLine = () => setIngredientes((p) => [...p, { insumoId: '', quantity: 0, merma: 0 }]);
  const removeLine = (i: number) => setIngredientes((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string | number) =>
    setIngredientes((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const validate = () => {
    const errs: string[] = [];
    if (!nombre.trim()) errs.push('El nombre de la receta es obligatorio.');
    if (porcionesBase <= 0) errs.push('Las porciones deben ser ≥ 1.');
    if (ingredientes.length === 0) errs.push('Agrega al menos un ingrediente.');
    ingredientes.forEach((ing, i) => {
      if (!ing.insumoId) errs.push(`Fila ${i + 1}: selecciona un insumo.`);
      if (ing.quantity <= 0) errs.push(`Fila ${i + 1}: la cantidad debe ser > 0.`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    const productName = product?.name ?? '';
    if (mode === 'existente') {
      const recetaBase = recetas.find((r) => r.id === selectedRecetaId);
      if (!recetaBase) {
        setErrors(['Selecciona una receta existente.']);
        return;
      }
      setIsSaving(true);
      try {
        await onAddReceta(
          {
            productId,
            nombre: recetaBase.nombre ?? recetaBase.productName,
            porcionesBase: recetaBase.porcionesBase,
            ingredientes: recetaBase.ingredientes.map((i) => ({
              insumoId: i.insumoId,
              quantity: i.quantity,
              merma: i.merma,
            })),
            notas: recetaBase.notas,
          },
          productName
        );
        toast.success('Receta asignada', `Se usó la receta de "${recetaBase.productName}" para "${productName}".`);
        onDone();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo guardar la receta. Intenta nuevamente.';
        toast.error('Error', message);
      } finally {
        setIsSaving(false);
      }
      return;
    }
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onAddReceta({ productId, nombre: nombre.trim(), porcionesBase, ingredientes, notas }, productName);
      toast.success('Receta guardada', `"${productName}" — costo/porción: ${formatCurrency(costoPorPorcion)}`);
      onDone();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la receta. Intenta nuevamente.';
      toast.error('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-coffee-50 rounded-lg border border-coffee-100">
        <button
          type="button"
          onClick={() => { setMode('nueva'); setErrors([]); }}
          className={clsx(
            'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
            mode === 'nueva' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-500 hover:text-coffee-700'
          )}
        >
          Crear nueva receta
        </button>
        <button
          type="button"
          onClick={() => { setMode('existente'); setErrors([]); }}
          className={clsx(
            'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
            mode === 'existente' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-500 hover:text-coffee-700'
          )}
        >
          Usar receta existente
        </button>
      </div>

      {/* Existing recipe selector */}
      {mode === 'existente' && (
        <div className="space-y-3">
          <Select
            value={selectedRecetaId}
            onChange={(v) => { setSelectedRecetaId(v); setErrors([]); }}
            options={recetaOptions}
          />
          {selectedRecetaId && (() => {
            const r = recetas.find((r) => r.id === selectedRecetaId);
            if (!r) return null;
            return (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-coffee-600">Ingredientes</span>
                  <span className="font-medium text-coffee-900">{r.ingredientes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-coffee-600">Porciones base</span>
                  <span className="font-medium text-coffee-900">{r.porcionesBase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-coffee-600">Costo por porción</span>
                  <span className="font-bold text-coffee-900">{formatCurrency(r.costoPorPorcion)}</span>
                </div>
              </div>
            );
          })()}
          {errors.length > 0 && (
            <ul className="text-red-500 text-xs space-y-0.5">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center pt-1 border-t border-coffee-100 gap-3">
            <Button variant="ghost" type="button" onClick={onSkip} className="text-coffee-400 w-full sm:w-auto">
              Omitir — añadir receta después
            </Button>
            <Button variant="primary" type="button" onClick={handleSave} isLoading={isSaving} leftIcon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">
              Asignar receta y finalizar
            </Button>
          </div>
        </div>
      )}

      {/* Nueva receta form */}
      {mode === 'nueva' && <>
      {/* Nombre de la receta */}
      <div>
        <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
          Nombre de la receta
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Receta cappuccino estándar…"
          autoFocus
        />
      </div>

      {/* Porciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
            Porciones que produce
            <span className="text-red-500 ml-1">*</span>
            <HelpTooltip text="¿Cuántas porciones de venta se obtienen de esta receta? Ej: 1 torta grande = 8 porciones. El costo se dividirá entre este número." />
          </label>
          <Input
            type="number"
            min="1"
            value={porcionesBase}
            onChange={(e) => setPorcionesBase(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-coffee-400 mt-1">Ej: 1 preparación = 1 taza; 1 torta = 8 porciones</p>
        </div>
        <div className="flex flex-col justify-end pb-6">
          {product && (
            <p className="text-sm text-coffee-600">
              Producto: <strong>{product.name}</strong> — Precio: <strong>{formatCurrency(product.salePrice)}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center text-sm font-medium text-coffee-700">
            Ingredientes
            <span className="text-red-500 ml-1">*</span>
            <HelpTooltip text="Cada insumo que se consume al preparar este producto. La cantidad es por receta completa (no por porción). El % de merma es el desperdicio normal al preparar (Ej: 5% para pelar, 10% para hervir)." />
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setInsumoModalOpen(true)}
              className="text-coffee-500 border border-dashed border-coffee-300 hover:border-coffee-500"
            >
              Nuevo insumo
            </Button>
            <Button type="button" variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
              Agregar fila
            </Button>
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-[1fr_90px_60px_24px] gap-2 text-xs text-coffee-400 font-medium mb-1 px-1">
          <span>Insumo</span>
          <span className="text-right">
            Cantidad
            <HelpTooltip text="Cuántas unidades mínimas usa esta receta en total (no por porción)." />
          </span>
          <span className="text-right">
            Merma %
            <HelpTooltip text="Porcentaje de pérdida en el proceso. Ej: pelar frutas = 15%, hervir = 5%. Se suma al costo automáticamente." />
          </span>
          <span />
        </div>

        <div className="space-y-2">
          {ingredientes.map((line, idx) => {
            const insumo = localInsumos.find((i) => i.id === line.insumoId);

            return (
              <div key={idx} className="rounded-lg border border-coffee-100 bg-white p-2.5 sm:p-0 sm:border-0 sm:rounded-none sm:grid sm:grid-cols-[1fr_90px_60px_24px] sm:gap-2 sm:items-center">
                <Select
                  value={line.insumoId}
                  onChange={(v) => updateLine(idx, 'insumoId', v)}
                  options={insumoOptions}
                />
                <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-end mt-2 sm:mt-0 sm:contents">
                  <div className="sm:contents">
                    <p className="sm:hidden text-xs text-coffee-400 mb-0.5">Cantidad</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={line.quantity === 0 ? '' : line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder={insumo?.unidadMinima ?? '0'}
                      className="text-right"
                    />
                  </div>
                  <div className="sm:contents">
                    <p className="sm:hidden text-xs text-coffee-400 mb-0.5">Merma %</p>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={line.merma === 0 ? '' : line.merma}
                      onChange={(e) => updateLine(idx, 'merma', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-right"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors shrink-0 self-center"
                    disabled={ingredientes.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
          Notas internas
          <HelpTooltip text="Instrucciones de preparación, temperatura, técnica. Solo visible para el equipo." />
        </label>
        <Input
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Temperatura, técnica, instrucciones para el barista…"
        />
      </div>

      {/* Live cost summary */}
      {costoTotal > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600">Costo total receta ({porciones} porción{porciones !== 1 ? 'es' : ''})</span>
            <span className="font-semibold text-coffee-900">{formatCurrency(costoTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600 font-medium">Costo por porción</span>
            <span className="font-bold text-coffee-900">{formatCurrency(costoPorPorcion)}</span>
          </div>
          {product && margenAbs !== null && margenPct !== null && (
            <>
              <div className="flex justify-between text-sm border-t border-amber-200 pt-1.5">
                <span className="text-coffee-600">Precio de venta</span>
                <span className="text-coffee-700">{formatCurrency(product.salePrice)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="font-medium text-coffee-800">Margen ({margenPct.toFixed(1)}%)</span>
                <span className={clsx('font-bold', margenAbs >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {formatCurrency(margenAbs)}
                </span>
              </div>
              {semaforo && (
                <div className={clsx('text-xs font-semibold rounded px-2 py-1 text-center border', semaforo.badge)}>
                  <span className={clsx('inline-block w-2 h-2 rounded-full mr-1.5', semaforo.dot)} />
                  {semaforo.label}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <ul className="text-red-500 text-xs space-y-0.5">
          {errors.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center pt-1 border-t border-coffee-100 gap-3">
        <Button variant="ghost" type="button" onClick={onSkip} className="text-coffee-400 w-full sm:w-auto">
          Omitir — añadir receta después
        </Button>
        <Button variant="primary" type="button" onClick={handleSave} isLoading={isSaving} leftIcon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">
          Guardar receta y finalizar
        </Button>
      </div>

      <InsumoModal
        isOpen={insumoModalOpen}
        onClose={() => setInsumoModalOpen(false)}
        onSuccess={() => setInsumoModalOpen(false)}
        onCreated={handleInsumoCreated}
      />
      </>}
    </div>
  );
};
