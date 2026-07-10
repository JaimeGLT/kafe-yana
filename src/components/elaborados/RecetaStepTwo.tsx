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

interface IngredienteLine {
  insumoId: string;
  quantity: string;
  merma: string;
}

interface RecetaStepTwoProps {
  productId: string;
  productName: string;
  productSalePrice: number;
  onDone: () => void;
  onSkip: () => void;
  insumos: Insumo[];
  recetas: Receta[];
  onAddReceta: (receta: { productId: string; nombre: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number; subTotal: number }[]; notas?: string }, productName: string) => Promise<void>;
}

export const RecetaStepTwo: React.FC<RecetaStepTwoProps> = ({
  productId, productName, productSalePrice,
  onDone, onSkip, insumos: insumosProp, recetas, onAddReceta,
}) => {
  const product = { id: productId, name: productName, salePrice: productSalePrice };

  const [mode, setMode] = useState<'nueva' | 'existente'>('nueva');
  const [selectedRecetaId, setSelectedRecetaId] = useState('');
  const [localInsumos, setLocalInsumos] = useState<Insumo[]>(insumosProp);

  const [nombre, setNombre] = useState('');
  const [rawPorciones, setRawPorciones] = useState('1');
  const [ingredientes, setIngredientes] = useState<IngredienteLine[]>([
    { insumoId: '', quantity: '', merma: '' },
  ]);
  const [notas, setNotas] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);

  const handleInsumoCreated = useCallback(async () => {
    setInsumoModalOpen(false);
    const data = await gql<InsumosResponse>(GET_ALL_INSUMOS);
    setLocalInsumos(data.insumos.items.map(mapInsumo));
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
        const qty = parseFloat(ing.quantity);
        const merma = parseFloat(ing.merma) || 0;
        if (!insumo || !qty || qty <= 0) return sum;
        return sum + insumo.costoUnitario * qty * (1 + merma / 100);
      }, 0),
    [ingredientes, localInsumos]
  );

  const porciones = parseInt(rawPorciones) || 1;
  const costoPorPorcion = costoTotal / porciones;
  const margenAbs = product.salePrice - costoPorPorcion;
  const margenPct = product.salePrice > 0 ? (margenAbs / product.salePrice) * 100 : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;

  const addLine = () => setIngredientes((p) => [...p, { insumoId: '', quantity: '', merma: '' }]);
  const removeLine = (i: number) => setIngredientes((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof IngredienteLine, value: string) =>
    setIngredientes((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const validate = () => {
    const msgs: string[] = [];
    if (!nombre.trim()) msgs.push('El nombre de la receta es obligatorio');
    const porcionesNum = Number(rawPorciones);
    if (!Number.isInteger(porcionesNum) || porcionesNum < 1) msgs.push('Las porciones deben ser un número entero ≥ 1');
    if (ingredientes.length === 0) msgs.push('Agrega al menos un ingrediente');
    ingredientes.forEach((ing, i) => {
      if (!ing.insumoId) msgs.push(`Fila ${i + 1}: selecciona un insumo`);
      const qty = parseFloat(ing.quantity);
      if (!qty || qty <= 0) msgs.push(`Fila ${i + 1}: cantidad debe ser > 0`);
    });
    if (msgs.length > 0) {
      toast.error('Campos requeridos', msgs.join(' · '));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    const pName = product.name;

    if (mode === 'existente') {
      const recetaBase = recetas.find((r) => r.id === selectedRecetaId);
      if (!recetaBase) {
        toast.error('Campos requeridos', 'Selecciona una receta existente');
        return;
      }
      setIsSaving(true);
      try {
        await onAddReceta(
          {
            productId,
            nombre: recetaBase.nombre ?? recetaBase.productName,
            porcionesBase: recetaBase.porcionesBase,
            ingredientes: recetaBase.ingredientes.map((i) => {
              const insumo = localInsumos.find(ins => String(ins.id) === String(i.insumoId));
              const subTotal = insumo
                ? insumo.costoUnitario * i.quantity * (1 + i.merma / 100)
                : (i.subtotal ?? 0);
              return { insumoId: i.insumoId, quantity: i.quantity, merma: i.merma, subTotal };
            }),
            notas: recetaBase.notas,
          },
          pName
        );
        toast.success('Receta asignada', `Se usó la receta de "${recetaBase.productName}" para "${pName}".`);
        onDone();
      } catch (error) {
        toast.error('Error', error instanceof Error ? error.message : 'No se pudo guardar la receta. Intenta nuevamente.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!validate()) return;
    setIsSaving(true);
    try {
      const ingredientesConSubTotal = ingredientes.map(ing => {
        const insumo = localInsumos.find(i => String(i.id) === String(ing.insumoId));
        const qty = parseFloat(ing.quantity) || 0;
        const merma = parseFloat(ing.merma) || 0;
        const subTotal = insumo ? insumo.costoUnitario * qty * (1 + merma / 100) : 0;
        return { insumoId: ing.insumoId, quantity: qty, merma, subTotal };
      });
      await onAddReceta(
        { productId, nombre: nombre.trim(), porcionesBase: porciones, ingredientes: ingredientesConSubTotal, notas },
        pName
      );
      toast.success('Receta guardada', `"${pName}" — costo/porción: ${formatCurrency(costoPorPorcion)}`);
      onDone();
    } catch (error) {
      toast.error('Error', error instanceof Error ? error.message : 'No se pudo guardar la receta. Intenta nuevamente.');
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
          onClick={() => setMode('nueva')}
          className={clsx(
            'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
            mode === 'nueva' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-500 hover:text-coffee-700'
          )}
        >
          Crear nueva receta
        </button>
        <button
          type="button"
          onClick={() => setMode('existente')}
          className={clsx(
            'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
            mode === 'existente' ? 'bg-white text-coffee-900 shadow-sm' : 'text-coffee-500 hover:text-coffee-700'
          )}
        >
          Usar receta existente
        </button>
      </div>

      {/* ── Receta existente ──────────────────────────────────────────────── */}
      {mode === 'existente' && (
        <div className="space-y-3">
          <Select
            value={selectedRecetaId}
            onChange={(v) => setSelectedRecetaId(v)}
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

      {/* ── Nueva receta ──────────────────────────────────────────────────── */}
      {mode === 'nueva' && (
        <>
          {/* Nombre */}
          <div>
            <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
              Nombre de la receta <span className="text-red-500 ml-1">*</span>
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Receta cappuccino estándar…"
              autoFocus
            />
          </div>

          {/* Porciones + producto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                Porciones que produce <span className="text-red-500 ml-1">*</span>
                <HelpTooltip text="¿Cuántas porciones de venta se obtienen de esta receta? Ej: 1 torta grande = 8 porciones. El costo se dividirá entre este número." />
              </label>
              <Input
                type="number"
                min="1"
                value={rawPorciones}
                onChange={(e) => setRawPorciones(e.target.value)}
              />
              <p className="text-xs text-coffee-400 mt-1">Ej: 1 preparación = 1 taza; 1 torta = 8 porciones</p>
            </div>
            <div className="flex flex-col justify-end pb-6">
              <p className="text-sm text-coffee-600">
                Producto: <strong>{product.name}</strong> — Precio: <strong>{formatCurrency(product.salePrice)}</strong>
              </p>
            </div>
          </div>

          {/* Ingredientes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center text-sm font-medium text-coffee-700">
                Ingredientes <span className="text-red-500 ml-1">*</span>
                <HelpTooltip text="Cada insumo que se consume al preparar este producto. La cantidad es por receta completa (no por porción). El % de merma es el desperdicio normal al preparar." />
              </label>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  type="button" variant="ghost" size="sm"
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

            {/* Cabecera desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_90px_60px_24px] gap-2 text-xs text-coffee-400 font-medium mb-1 px-1">
              <span>Insumo</span>
              <span className="text-right">
                Cantidad
                <HelpTooltip text="Cuántas unidades mínimas usa esta receta en total (no por porción)." />
              </span>
              <span className="text-right">
                Merma %
                <HelpTooltip text="Porcentaje de pérdida en el proceso. Ej: pelar frutas = 15%, hervir = 5%." />
              </span>
              <span />
            </div>

            <div className="space-y-2">
              {ingredientes.map((line, idx) => {
                const insumo = localInsumos.find((i) => i.id === line.insumoId);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-coffee-100 bg-coffee-50/40 p-3 space-y-2 sm:space-y-0 sm:bg-transparent sm:border-0 sm:rounded-none sm:grid sm:grid-cols-[1fr_90px_60px_24px] sm:gap-2 sm:items-center"
                  >
                    {/* Insumo select */}
                    <Select
                      value={line.insumoId}
                      onChange={(v) => updateLine(idx, 'insumoId', v)}
                      options={insumoOptions}
                    />
                    {/* Cantidad + Merma + Eliminar */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end sm:contents">
                      <div className="sm:contents">
                        <p className="sm:hidden text-xs text-coffee-400 mb-1">Cantidad</p>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          placeholder={insumo?.unidadMinima ?? '0'}
                          className="text-right"
                        />
                      </div>
                      <div className="sm:contents">
                        <p className="sm:hidden text-xs text-coffee-400 mb-1">Merma %</p>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={line.merma}
                          onChange={(e) => updateLine(idx, 'merma', e.target.value)}
                          placeholder="0"
                          className="text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors self-end pb-2 sm:pb-0 sm:self-center"
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

          {/* Resumen de costos */}
          {costoTotal > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-coffee-600">Costo total ({porciones} porción{porciones !== 1 ? 'es' : ''})</span>
                <span className="font-semibold text-coffee-900">{formatCurrency(costoTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-coffee-600 font-medium">Costo por porción</span>
                <span className="font-bold text-coffee-900">{formatCurrency(costoPorPorcion)}</span>
              </div>
              {margenPct !== null && (
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

          {/* Acciones */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center pt-1 border-t border-coffee-100 gap-3">
            <Button variant="ghost" type="button" onClick={onSkip} className="text-coffee-400 w-full sm:w-auto">
              Omitir — añadir receta después
            </Button>
            <Button
              variant="primary" type="button"
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Guardar receta y finalizar
            </Button>
          </div>

          <InsumoModal
            isOpen={insumoModalOpen}
            onClose={() => setInsumoModalOpen(false)}
            onSuccess={() => setInsumoModalOpen(false)}
            onCreated={handleInsumoCreated}
          />
        </>
      )}
    </div>
  );
};
