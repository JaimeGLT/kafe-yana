import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { gql } from '../../lib/graphql';
import { api } from '../../lib/api';
import {
  Plus,
  FlaskConical,
  BookOpen,
  Edit2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  TrendingUp,
  Search,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, Select } from '../../components/ui';
import { HelpTooltip } from '../../components/ui/Tooltip';
import { RecetaModal, RecetaFormContent } from '../../components/modals/RecetaModal';
import { InsumoModal } from '../../components/modals/InsumoModal';
import { EditElaboradoModal } from '../../components/modals/EditElaboradoModal';
import { toast } from '../../components/ui/Toast';
import { useStockManager } from '../../hooks/useStockManager';
import type { Product, Receta, Insumo } from '../../types';
import { formatCurrency } from '../../utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getMarginInfo = (pct: number) => {
  if (pct >= 60) return { label: 'Rentable', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct >= 30) return { label: 'Aceptable', dot: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Revisar precio', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 text-red-700 border-red-200' };
};

// ── Wizard modal: create elaborado product + recipe in one flow ───────────────

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: { value: string; label: string }[];
  insumos: Insumo[];
  recetas: Receta[];
  onAddReceta: (receta: { productId: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number }[]; notas?: string }, productName: string) => void;
}

const ElaboradoWizard: React.FC<WizardProps> = ({ isOpen, onClose, onCreated, categories, insumos, recetas, onAddReceta }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [newProductId, setNewProductId] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductSalePrice, setNewProductSalePrice] = useState<number>(0);

  // Step 1 fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [unit, setUnit] = useState('unidad');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setStep(1);
    setNewProductId(null);
    setNewProductName('');
    setNewProductSalePrice(0);
    setName('');
    setDescription('');
    setCategoryId('');
    setSalePrice('');
    setUnit('unidad');
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es obligatorio.';
    if (!categoryId) errs.categoryId = 'Selecciona una categoría.';
    if (!salePrice || salePrice <= 0) errs.salePrice = 'Ingresa un precio de venta válido.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    try {
      const result = await api.post<{ id: number }>('/Elaborado', {
        nombre: name.trim(),
        descripcion: description.trim() || '',
        precio: Number(salePrice),
        categoria_Id: Number(categoryId) || 0,
        unidad_medida: unit,
      });
      const id = String(result.id);
      setNewProductId(id);
      setNewProductName(name.trim());
      setNewProductSalePrice(Number(salePrice));
      setStep(2);
      toast.success('Producto creado', `"${name}" fue agregado como producto elaborado.`);
      onCreated();
    } catch {
      toast.error('Error', 'No se pudo crear el producto. Intente nuevamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <FlaskConical className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-coffee-900">Nuevo Producto Elaborado</h2>
              <p className="text-xs text-coffee-400">
                {step === 1 ? 'Paso 1 de 2 — Información del producto' : 'Paso 2 de 2 — Receta e ingredientes'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-coffee-400 hover:text-coffee-700 transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
          <div className={clsx('flex items-center gap-1.5 text-sm font-medium', step === 1 ? 'text-amber-600' : 'text-emerald-600')}>
            <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', step === 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
              {step === 2 ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
            </span>
            Producto
          </div>
          <ArrowRight className="h-4 w-4 text-coffee-300" />
          <div className={clsx('flex items-center gap-1.5 text-sm font-medium', step === 2 ? 'text-amber-600' : 'text-coffee-400')}>
            <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', step === 2 ? 'bg-amber-100 text-amber-700' : 'bg-coffee-100 text-coffee-400')}>
              2
            </span>
            Receta
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="px-6 py-4 space-y-5">
              {/* Name */}
              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Nombre del producto
                  <span className="text-red-500 ml-1">*</span>
                  <HelpTooltip text="Nombre que verán los clientes y el personal. Ej: Cappuccino mediano, Torta de chocolate." />
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Cappuccino doble, Torta de chocolate…"
                  autoFocus
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Descripción
                  <HelpTooltip text="Descripción interna para identificar el producto. No se muestra al cliente." />
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción opcional…"
                />
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                    Categoría
                    <span className="text-red-500 ml-1">*</span>
                    <HelpTooltip text="Agrupa productos para filtrar y reportar ventas por categoría." />
                  </label>
                  <Select
                    value={categoryId}
                    onChange={(v) => setCategoryId(v)}
                    options={[{ value: '', label: 'Seleccionar categoría…' }, ...categories]}
                  />
                  {errors.categoryId && <p className="text-xs text-red-600 mt-1">{errors.categoryId}</p>}
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                    Unidad de venta
                    <HelpTooltip text="Cómo se vende al cliente. Ej: unidad (una taza), porción (un trozo)." />
                  </label>
                  <Select
                    value={unit}
                    onChange={(v) => setUnit(v)}
                    options={[
                      { value: 'unidad', label: 'Unidad' },
                      { value: 'porcion', label: 'Porción' },
                      { value: 'taza', label: 'Taza' },
                      { value: 'vaso', label: 'Vaso' },
                      { value: 'plato', label: 'Plato' },
                    ]}
                  />
                </div>
              </div>

              {/* Sale price */}
              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Precio de venta (Bs.)
                  <span className="text-red-500 ml-1">*</span>
                  <HelpTooltip text="Precio al que se vende al cliente. En el paso 2, verás el margen real al definir la receta." />
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(parseFloat(e.target.value) || '')}
                  placeholder="0.00"
                />
                {errors.salePrice && <p className="text-xs text-red-600 mt-1">{errors.salePrice}</p>}
              </div>

              {/* Info callout */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
                <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  En el <strong>paso 2</strong> definirás los ingredientes (insumos) y porciones que produce esta receta. El costo y el margen se calcularán automáticamente.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" rightIcon={<ChevronRight className="h-4 w-4" />}>
                  Siguiente — Definir receta
                </Button>
              </div>
            </form>
          )}

          {step === 2 && newProductId && (
            <div className="px-6 py-4">
              {/* Inline RecetaModal content */}
              <RecetaStepTwo
                productId={newProductId}
                productName={newProductName}
                productSalePrice={newProductSalePrice}
                onDone={handleClose}
                onSkip={() => {
                  toast.success('Producto creado', 'Puedes añadir la receta más tarde desde esta página.');
                  handleClose();
                }}
                insumos={insumos}
                recetas={recetas}
                onAddReceta={onAddReceta}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Step 2 inline recipe builder ──────────────────────────────────────────────

interface RecetaStepTwoProps {
  productId: string;
  productName: string;
  productSalePrice: number;
  onDone: () => void;
  onSkip: () => void;
  insumos: Insumo[];
  recetas: Receta[];
  onAddReceta: (receta: { productId: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number }[]; notas?: string }, productName: string) => void;
}

const RecetaStepTwo: React.FC<RecetaStepTwoProps> = ({ productId, productName, productSalePrice, onDone, onSkip, insumos, recetas, onAddReceta }) => {
  const product = { id: productId, name: productName, salePrice: productSalePrice };

  const [mode, setMode] = useState<'nueva' | 'existente'>('nueva');
  const [selectedRecetaId, setSelectedRecetaId] = useState('');

  const [porcionesBase, setPorcionesBase] = useState(1);
  const [ingredientes, setIngredientes] = useState([{ insumoId: '', quantity: 0, merma: 0 }]);
  const [notas, setNotas] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);

  const recetaOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar receta existente…' }].concat(
        recetas.map((r) => ({ value: r.id, label: `${r.productName} (${r.ingredientes.length} ingredientes)` }))
      ),
    [recetas]
  );

  const insumoOptions = useMemo(
    () =>
      [{ value: '', label: 'Seleccionar insumo…' }].concat(
        insumos.filter((i) => i.isActive).map((i) => ({ value: i.id, label: `${i.name} (${i.unidadMinima})` }))
      ),
    [insumos]
  );

  const costoTotal = useMemo(
    () =>
      ingredientes.reduce((sum, ing) => {
        const insumo = insumos.find((i) => i.id === ing.insumoId);
        if (!insumo || ing.quantity <= 0) return sum;
        return sum + insumo.costoUnitario * ing.quantity * (1 + ing.merma / 100);
      }, 0),
    [ingredientes, insumos]
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
    if (porcionesBase <= 0) errs.push('Las porciones deben ser ≥ 1.');
    if (ingredientes.length === 0) errs.push('Agrega al menos un ingrediente.');
    ingredientes.forEach((ing, i) => {
      if (!ing.insumoId) errs.push(`Fila ${i + 1}: selecciona un insumo.`);
      if (ing.quantity <= 0) errs.push(`Fila ${i + 1}: la cantidad debe ser > 0.`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    const productName = product?.name ?? '';
    if (mode === 'existente') {
      const recetaBase = recetas.find((r) => r.id === selectedRecetaId);
      if (!recetaBase) {
        setErrors(['Selecciona una receta existente.']);
        return;
      }
      onAddReceta(
        {
          productId,
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
      return;
    }
    if (!validate()) return;
    onAddReceta({ productId, porcionesBase, ingredientes, notas }, productName);
    toast.success('Receta guardada', `"${productName}" — costo/porción: ${formatCurrency(costoPorPorcion)}`);
    onDone();
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
          <div className="flex justify-between items-center pt-1 border-t border-coffee-100">
            <Button variant="ghost" type="button" onClick={onSkip} className="text-coffee-400">
              Omitir — añadir receta después
            </Button>
            <Button variant="primary" type="button" onClick={handleSave} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Asignar receta y finalizar
            </Button>
          </div>
        </div>
      )}

      {/* Nueva receta form */}
      {mode === 'nueva' && <>
      {/* Porciones */}
      <div className="grid grid-cols-2 gap-4">
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
          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-[1fr_90px_60px_56px_24px] gap-2 text-xs text-coffee-400 font-medium mb-1 px-1">
          <span>Insumo</span>
          <span className="text-right">
            Cantidad
            <HelpTooltip text="Cuántas unidades mínimas usa esta receta en total (no por porción)." />
          </span>
          <span className="text-right">
            Merma %
            <HelpTooltip text="Porcentaje de pérdida en el proceso. Ej: pelar frutas = 15%, hervir = 5%. Se suma al costo automáticamente." />
          </span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        <div className="space-y-2">
          {ingredientes.map((line, idx) => {
            const insumo = insumos.find((i) => i.id === line.insumoId);
            const subtotal =
              insumo && line.quantity > 0
                ? insumo.costoUnitario * line.quantity * (1 + line.merma / 100)
                : 0;

            return (
              <div key={idx} className="grid grid-cols-[1fr_90px_60px_56px_24px] gap-2 items-center">
                <Select
                  value={line.insumoId}
                  onChange={(v) => updateLine(idx, 'insumoId', v)}
                  options={insumoOptions}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={line.quantity === 0 ? '' : line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder={insumo?.unidadMinima ?? ''}
                  className="text-right"
                />
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
                <span className="text-xs text-right text-coffee-500 font-medium">
                  {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  disabled={ingredientes.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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

      <div className="flex justify-between items-center pt-1 border-t border-coffee-100">
        <Button variant="ghost" type="button" onClick={onSkip} className="text-coffee-400">
          Omitir — añadir receta después
        </Button>
        <Button variant="primary" type="button" onClick={handleSave} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
          Guardar receta y finalizar
        </Button>
      </div>

      <InsumoModal
        isOpen={insumoModalOpen}
        onClose={() => setInsumoModalOpen(false)}
        onCreated={(insumo) => {
          setIngredientes((prev) => [...prev, { insumoId: insumo.id, quantity: 0, merma: 0 }]);
        }}
        onSave={async (input, isEdit, insumoId) => {
          if (isEdit && insumoId) {
            await api.put(`/Recipes/insumos/${insumoId}`, input);
          } else {
            return await api.post<Insumo>('/Recipes/insumos', input);
          }
        }}
      />
      </>}
    </div>
  );
};

// ── Product card ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  receta?: Receta;
  portionsAvailable: number;
  onEditProduct: (p: Product) => void;
  onManageReceta: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
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

// ── Main page ─────────────────────────────────────────────────────────────────

const ElaboradosPage: React.FC = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [elaborados, setElaborados] = useState<Product[]>([]);
  const [rawCategories, setRawCategories] = useState<{ id: string; nombre: string; estado: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getRecetaByProductId = useCallback((productId: string) => {
    return recetas.find((r: Receta) => r.productId === productId);
  }, [recetas]);

  const getElaboradoAvailability = useCallback((productId: string) => {
    // Simple implementation - in production this would calculate based on insumos
    return 999 as number; // Default availability
  }, []);

  const addReceta = useCallback(async (recetaData: { productId: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number }[]; notas?: string }, productName: string) => {
    try {
      await api.post('/Recipes/recetas', {
        productoId: recetaData.productId,
        porcionesBase: recetaData.porcionesBase,
        ingredientes: recetaData.ingredientes,
        notas: recetaData.notas,
      });
      // Reload recetas after adding
      const recetasData = await api.get<Receta[]>('/Recipes/recetas');
      setRecetas(recetasData);
    } catch (error) {
      console.error('Error adding receta:', error);
      throw error;
    }
  }, []);

  // Load recetas and insumos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recetasData, insumosData] = await Promise.all([
          api.get<Receta[]>('/Recipes/recetas'),
          api.get<Insumo[]>('/Recipes/insumos'),
        ]);
        setRecetas(recetasData);
        setInsumos(insumosData);
      } catch (error) {
        console.error('Error loading recipes:', error);
      }
    };
    fetchData();
  }, []);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recetaModal, setRecetaModal] = useState<{ isOpen: boolean; product?: Product; receta?: Receta }>({
    isOpen: false,
  });

  interface ElaboradoNode {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    categoria_Id: number;
    unidad_medida: string;
  }
  interface ElaboradosResponse {
    elaborados: ElaboradoNode[];
  }
  interface CatNode { id: number; nombre: string; estado: boolean; }
  interface CatsResponse { categorias: { nodes: CatNode[] }; }

  const loadElaborados = useCallback(async (cats?: { id: string; nombre: string }[]) => {
    const data = await gql<ElaboradosResponse>(`
      query {
        elaborados {
          id
          nombre
          descripcion
          precio
          categoria_Id
          unidad_medida
        }
      }
    `);
    const catList = cats ?? rawCategories;
    const mapped: Product[] = data.elaborados.map((node) => ({
      id: String(node.id),
      code: String(node.id),
      name: node.nombre,
      description: node.descripcion,
      tipo: 'elaborado' as const,
      categoryId: String(node.categoria_Id),
      categoryName: catList.find((c) => c.id === String(node.categoria_Id))?.nombre ?? '',
      unit: node.unidad_medida,
      costPrice: 0,
      salePrice: node.precio,
      stock: 0,
      minStock: 0,
      maxStock: 0,
      variations: [],
      hasVariations: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setElaborados(mapped);
  }, [rawCategories]);

  useEffect(() => {
    Promise.all([
      gql<CatsResponse>(`query { categorias { nodes { id nombre estado } } }`),
    ])
      .then(([catsData]) => {
        const cats = catsData.categorias.nodes.map((n) => ({ id: String(n.id), nombre: n.nombre, estado: n.estado }));
        setRawCategories(cats);
        return loadElaborados(cats);
      })
      .catch(() => {/* silencioso */})
      .finally(() => setIsLoading(false));
  }, []);

  // Used for wizard (needs IDs) and edit modal (uses names as values)
  const categories = useMemo(
    () => rawCategories.filter((c) => c.estado).map((c) => ({ value: c.id, label: c.nombre })),
    [rawCategories]
  );
  const categoryNameOptions = useMemo(
    () => rawCategories.filter((c) => c.estado).map((c) => ({ value: c.id, label: c.nombre })),
    [rawCategories]
  );

  const filtered = useMemo(() => {
    let list = elaborados;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q));
    }
    if (filterStatus === 'con_receta') list = list.filter((p) => !!getRecetaByProductId(p.id));
    if (filterStatus === 'sin_receta') list = list.filter((p) => !getRecetaByProductId(p.id));
    if (filterStatus === 'sin_stock') list = list.filter((p) => getElaboradoAvailability(p.id) === 0);
    return list;
  }, [elaborados, search, filterStatus, recetas, getRecetaByProductId, getElaboradoAvailability]);

  // KPIs
  const sinReceta = elaborados.filter((p) => !getRecetaByProductId(p.id)).length;
  const conReceta = elaborados.filter((p) => !!getRecetaByProductId(p.id));
  const avgMargen = useMemo(() => {
    const valid = conReceta.filter((p) => {
      const r = getRecetaByProductId(p.id);
      return r && p.salePrice > 0;
    });
    if (valid.length === 0) return null;
    const sum = valid.reduce((s, p) => {
      const r = getRecetaByProductId(p.id)!;
      return s + ((p.salePrice - r.costoPorPorcion) / p.salePrice) * 100;
    }, 0);
    return sum / valid.length;
  }, [conReceta, recetas]);

  const sinStock = elaborados.filter((p) => getElaboradoAvailability(p.id) === 0).length;

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Productos Elaborados"
          subtitle="Productos que se preparan con ingredientes según una receta"
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsWizardOpen(true)}
            >
              Nuevo producto elaborado
            </Button>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" aria-busy={isLoading}>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <FlaskConical className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-coffee-400">Total elaborados</p>
              <p className="text-xl font-bold text-coffee-900">{elaborados.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className={clsx('p-2 rounded-lg', sinReceta > 0 ? 'bg-amber-50' : 'bg-emerald-50')}>
              {sinReceta > 0
                ? <AlertTriangle className="h-5 w-5 text-amber-600" />
                : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            </div>
            <div>
              <p className="text-xs text-coffee-400">Sin receta</p>
              <p className={clsx('text-xl font-bold', sinReceta > 0 ? 'text-amber-700' : 'text-coffee-900')}>
                {sinReceta}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-coffee-400">Margen promedio</p>
              <p className={clsx('text-xl font-bold', avgMargen === null ? 'text-coffee-400' : avgMargen >= 30 ? 'text-emerald-700' : 'text-red-600')}>
                {avgMargen !== null ? `${avgMargen.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className={clsx('p-2 rounded-lg', sinStock > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
              <Layers className={clsx('h-5 w-5', sinStock > 0 ? 'text-red-600' : 'text-emerald-600')} />
            </div>
            <div>
              <p className="text-xs text-coffee-400">Sin stock hoy</p>
              <p className={clsx('text-xl font-bold', sinStock > 0 ? 'text-red-700' : 'text-coffee-900')}>
                {sinStock}
              </p>
            </div>
          </div>
        </div>

        {/* Warning banner */}
        {sinReceta > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{sinReceta} producto{sinReceta !== 1 ? 's' : ''}</strong> no {sinReceta !== 1 ? 'tienen' : 'tiene'} receta asignada. El sistema no podrá descontar insumos al vender.
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(v) => setFilterStatus(v)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'con_receta', label: 'Con receta' },
              { value: 'sin_receta', label: 'Sin receta' },
              { value: 'sin_stock', label: 'Sin stock disponible' },
            ]}
            className="w-52"
          />
        </div>

        {/* Empty state / loading */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-1 w-full bg-coffee-200" />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-4 w-32 bg-coffee-200 rounded" />
                    <div className="h-4 w-14 bg-coffee-200 rounded" />
                  </div>
                  <div className="h-3 w-20 bg-coffee-100 rounded" />
                  <div className="h-3 w-full bg-coffee-100 rounded" />
                  <div className="h-3 w-2/3 bg-coffee-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : elaborados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-coffee-200">
            <FlaskConical className="h-12 w-12 text-coffee-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-coffee-700 mb-1">Sin productos elaborados</h3>
            <p className="text-sm text-coffee-400 mb-6">
              Los productos elaborados son preparados con ingredientes según una receta.<br />
              El sistema descuenta automáticamente los insumos al vender.
            </p>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsWizardOpen(true)}>
              Crear primer producto elaborado
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-coffee-400 text-sm">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-coffee-200" />
            No hay productos que coincidan con los filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const receta = getRecetaByProductId(product.id);
              const portions = getElaboradoAvailability(product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  receta={receta}
                  portionsAvailable={portions}
                  onEditProduct={(p) => setEditingProduct(p)}
                  onManageReceta={(p) => {
                    const r = getRecetaByProductId(p.id);
                    setRecetaModal({ isOpen: true, product: p, receta: r });
                  }}
                />
              );
            })}
          </div>
        )}
      </PageContainer>

      {/* Wizard: create elaborado + recipe */}
      <ElaboradoWizard
        isOpen={isWizardOpen}
        onClose={() => { setIsWizardOpen(false); loadElaborados(); }}
        onCreated={() => loadElaborados()}
        categories={categories}
        insumos={insumos}
        recetas={recetas}
        onAddReceta={addReceta}
      />

      {/* Edit elaborado modal */}
      {editingProduct && (
        <EditElaboradoModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
          categoryOptions={categoryNameOptions}
          onSaved={(updated) => {
            setElaborados((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            setEditingProduct(null);
          }}
          getRecetaByProductId={getRecetaByProductId}
        />
      )}

      {/* RecetaModal for editing existing recipes */}
      <RecetaModal
        isOpen={recetaModal.isOpen}
        onClose={() => setRecetaModal({ isOpen: false })}
        receta={recetaModal.receta}
        preselectedProductId={recetaModal.product?.id}
        insumos={insumos}
        products={elaborados}
        onSave={async (recetaId, data) => {
          const payload = { productoId: data.productId, porcionesBase: data.porcionesBase, ingredientes: data.ingredientes, notas: data.notas };
          if (recetaId) {
            await api.put(`/Recipes/recetas/${recetaId}`, payload);
          } else {
            await api.post('/Recipes/recetas', payload);
          }
          const recetasData = await api.get<Receta[]>('/Recipes/recetas');
          setRecetas(recetasData);
        }}
      />
    </MainLayout>
  );
};

export default ElaboradosPage;
