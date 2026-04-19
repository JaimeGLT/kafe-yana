import React, { useState, useEffect } from 'react';
import { FlaskConical, BookOpen, ChevronRight, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { Button, Input, Select, ImageUploadField } from '../ui';
import { HelpTooltip } from '../ui/Tooltip';
import { toast } from '../ui/Toast';
import { RecetaStepTwo } from './RecetaStepTwo';
import { CategoryModal } from '../modals/CategoryModal';
import { GET_ALL_ELABORADOS } from '../../lib/queries/elaborados.queries';
import type { Receta, Insumo, CategoryInput } from '../../types';

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: { value: string; label: string }[];
  insumos: Insumo[];
  recetas: Receta[];
  onAddReceta: (receta: { productId: string; nombre: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number }[]; notas?: string }, productName: string) => Promise<void>;
}

export const ElaboradoWizard: React.FC<WizardProps> = ({ isOpen, onClose, onCreated, categories, insumos, recetas, onAddReceta }) => {
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
  const [preparationType, setPreparationType] = useState<'al_momento' | 'en_lote'>('al_momento');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localCategories, setLocalCategories] = useState(categories);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) setLocalCategories(categories);
  }, [isOpen, categories]);

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
    setPreparationType('al_momento');
    setErrors({});
  };

  const handleSaveCategory = async (input: CategoryInput) => {
    await api.post('/Categoria', {
      nombre: input.name,
      descripcion: input.description ?? '',
      color: input.color,
      estado: input.isActive,
    });
    const data = await gql<{ categorias: { nodes: { id: number; nombre: string; estado: boolean }[] } }>(
      `query { categorias { nodes { id nombre estado } } }`
    );
    const cats = data.categorias.nodes
      .filter((n) => n.estado)
      .map((n) => ({ value: String(n.id), label: n.nombre }));
    setLocalCategories(cats);
    const created = cats.find((c) => c.label === input.name);
    if (created) setCategoryId(created.value);
    toast.success('Categoría creada', `"${input.name}" fue creada y seleccionada.`);
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
      await api.post('/Elaborado', {
        nombre: name.trim(),
        descripcion: description.trim() || '',
        precio: Number(salePrice),
        categoria_Id: Number(categoryId) || 0,
        unidad_medida: unit,
        producible: preparationType === 'en_lote',
      });
      const data = await gql<{ elaborados: { nodes: { id_Producto: number; producto: { nombre: string } }[] } }>(GET_ALL_ELABORADOS);
      const created = data.elaborados.nodes.find((e) => e.producto.nombre === name.trim());
      const id = created ? String(created.id_Producto) : null;
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
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
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

              {/* Image */}
              <div>
                <label className="text-sm font-medium text-coffee-700 mb-1 block">Imagen del producto</label>
                <ImageUploadField />
              </div>

              {/* Preparation type */}
              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-2">
                  ¿Cómo se prepara este producto?
                  <HelpTooltip text="Define si el producto se elabora al momento del pedido o en lotes para tener stock listo." />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreparationType('al_momento')}
                    className={clsx(
                      'flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                      preparationType === 'al_momento'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-coffee-200 bg-white hover:border-coffee-300'
                    )}
                  >
                    <span className={clsx('mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 items-center justify-center', preparationType === 'al_momento' ? 'border-amber-500' : 'border-coffee-300')}>
                      {preparationType === 'al_momento' && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                    </span>
                    <div>
                      <p className={clsx('text-sm font-semibold', preparationType === 'al_momento' ? 'text-amber-700' : 'text-coffee-800')}>Al momento</p>
                      <p className="text-xs text-coffee-500 mt-0.5">Se prepara cuando llega el pedido</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreparationType('en_lote')}
                    className={clsx(
                      'flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors',
                      preparationType === 'en_lote'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-coffee-200 bg-white hover:border-coffee-300'
                    )}
                  >
                    <span className={clsx('mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 items-center justify-center', preparationType === 'en_lote' ? 'border-amber-500' : 'border-coffee-300')}>
                      {preparationType === 'en_lote' && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                    </span>
                    <div>
                      <p className={clsx('text-sm font-semibold', preparationType === 'en_lote' ? 'text-amber-700' : 'text-coffee-800')}>En lote</p>
                      <p className="text-xs text-coffee-500 mt-0.5">Se prepara en cantidad y se tiene listo para vender</p>
                    </div>
                  </button>
                </div>
                {preparationType === 'en_lote' && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-amber-500">ⓘ</span>
                    <p>Deberás registrar cada producción en <strong>Ajustes</strong> para mantener el stock actualizado.</p>
                  </div>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                    Categoría
                    <span className="text-red-500 ml-1">*</span>
                    <HelpTooltip text="Agrupa productos para filtrar y reportar ventas por categoría." />
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={categoryId}
                        onChange={(v) => setCategoryId(v)}
                        options={[{ value: '', label: 'Seleccionar categoría…' }, ...localCategories]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-coffee-200 text-coffee-500 hover:bg-coffee-50 hover:text-coffee-800 transition-colors"
                      title="Nueva categoría"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={handleClose} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" rightIcon={<ChevronRight className="h-4 w-4" />} className="w-full sm:w-auto">
                  Siguiente — Definir receta
                </Button>
              </div>
            </form>
          )}

          {step === 2 && newProductId && (
            <div className="px-6 py-4">
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
    <CategoryModal
      isOpen={isCategoryModalOpen}
      onClose={() => setIsCategoryModalOpen(false)}
      onSave={(input) => handleSaveCategory(input)}
      onSuccess={() => setIsCategoryModalOpen(false)}
    />
    </>
  );
};
