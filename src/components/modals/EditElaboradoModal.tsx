import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { FlaskConical, ArrowRight, CheckCircle2, Plus, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect, Select } from '../ui/Select';
import { ImageUploadField } from '../ui/ImageUpload';
import { HelpTooltip } from '../ui/Tooltip';
import { RecetaFormContent } from './RecetaModal';
import { CategoryModal } from './CategoryModal';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_ALL_INSUMOS } from '../../lib/queries/insumos.queries';
import { GET_ALL_ELABORADOS, GET_ELABORADO_BY_ID } from '../../lib/queries/elaborados.queries';
import { mapInsumo } from '../../lib/mappers/insumos.mappers';
import { mapElaborado, mapRecetaFromElaborado } from '../../lib/mappers/elaborados.mappers';
import type { InsumosResponse, ElaboradosResponse } from '../../types/graphql';
import type { Product, Receta, Insumo, CategoryInput, ProductDestino } from '../../types';

const DESTINO_OPTIONS = [
  { value: 'sin_destino', label: 'Sin destino' },
  { value: 'barra', label: 'Barra' },
  { value: 'cocina', label: 'Cocina' },
];

const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'porcion', label: 'Porción' },
  { value: 'taza', label: 'Taza' },
  { value: 'vaso', label: 'Vaso' },
  { value: 'plato', label: 'Plato' },
  { value: 'botella', label: 'Botella' },
];

export interface EditElaboradoModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  categoryOptions: { value: string; label: string }[];
  onSaved: (updated: Product) => void;
  onRecetaSaved?: () => void;
  onRefreshInventory?: () => Promise<void>;
}

export const EditElaboradoModal: React.FC<EditElaboradoModalProps> = ({
  isOpen,
  onRecetaSaved,
  onClose,
  product,
  categoryOptions,
  onSaved,
  onRefreshInventory,
}) => {
  const [tab, setTab] = useState<'datos' | 'receta'>('datos');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [receta, setReceta] = useState<Receta | undefined>(undefined);
  const [localCategoryOptions, setLocalCategoryOptions] = useState(categoryOptions);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [salePrice, setSalePrice] = useState<number | ''>(product.salePrice);
  const [categoryId, setCategoryId] = useState(product.categoryId || '');
  const [unit, setUnit] = useState(product.unit || 'unidad');
  const [destino, setDestino] = useState<ProductDestino>(product.destino ?? 'sin_destino');
  const existingImageUrl = product.image?.startsWith('http') || product.image?.startsWith('data:') || product.image?.startsWith('blob:') ? product.image : undefined;

  useEffect(() => {
    if (isOpen) {
      setTab('datos');
      setName(product.name);
      setDescription(product.description || '');
      setSalePrice(product.salePrice);
      setCategoryId(product.categoryId || '');
      setUnit(product.unit || 'unidad');
      setDestino(product.destino ?? 'sin_destino');
      setErrors({});
      setLocalCategoryOptions(categoryOptions);
      setIsLoadingData(true);
      Promise.all([
        gql<InsumosResponse>(GET_ALL_INSUMOS),
        gql<ElaboradosResponse>(GET_ALL_ELABORADOS),
        gql<ElaboradosResponse>(GET_ELABORADO_BY_ID, { id: Number(product.id) }),
      ]).then(([ins, prods, byId]) => {
        setInsumos(ins.insumos.nodes.map(mapInsumo));
        setProducts(prods.elaborados.nodes.map(mapElaborado));
        const node = byId.elaborados.nodes[0];
        if (node) {
          setReceta(mapRecetaFromElaborado(node) ?? undefined);
        }
      }).catch(() => {}).finally(() => setIsLoadingData(false));
    }
  }, [isOpen, product]);

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
    setLocalCategoryOptions(cats);
    const created = cats.find((c) => c.label === input.name);
    if (created) setCategoryId(created.value);
    toast.success('Categoría creada', `"${input.name}" fue creada y seleccionada.`);
  };

  const handleSaveDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'El nombre es obligatorio.';
    if (!salePrice || Number(salePrice) <= 0) errs.salePrice = 'El precio debe ser mayor a 0.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsSaving(true);
    try {
      await api.put(`/Elaborado/${product.id}`, {
        nombre: name.trim(),
        descripcion: description.trim() || '',
        precio: Number(salePrice),
        categoria_Id: Number(categoryId) || 0,
        unidad_medida: unit,
        ubicacion: destino === 'barra' ? 'Barra' : destino === 'cocina' ? 'Cocina' : '',
      });
      const catName = categoryOptions.find((o) => o.value === categoryId)?.label ?? '';
      const updated = { ...product, name: name.trim(), description: description.trim(), salePrice: Number(salePrice), categoryId, categoryName: catName, unit };
      onSaved(updated);
      toast.success('Producto actualizado', `"${name}" fue actualizado correctamente.`);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el producto. Intente nuevamente.';
      toast.error('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const productForReceta = { id: product.id, name, salePrice: Number(salePrice) || product.salePrice };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex h-full items-end sm:items-stretch sm:justify-end p-0 bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-none sm:rounded-l-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-none sm:h-full flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <FlaskConical className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-coffee-900">Editar Producto Elaborado</h2>
              <p className="text-xs text-coffee-400">
                {tab === 'datos' ? 'Información del producto' : 'Receta e ingredientes'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-coffee-400 hover:text-coffee-700 transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* Tab indicator */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('datos')}
            className={clsx('flex items-center gap-1.5 text-sm font-medium', tab === 'datos' ? 'text-amber-600' : 'text-emerald-600')}
          >
            <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', tab === 'datos' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
              {tab === 'receta' ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
            </span>
            Producto
          </button>
          <ArrowRight className="h-4 w-4 text-coffee-300" />
          <button
            type="button"
            onClick={() => setTab('receta')}
            className={clsx('flex items-center gap-1.5 text-sm font-medium', tab === 'receta' ? 'text-amber-600' : 'text-coffee-400')}
          >
            <span className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold', tab === 'receta' ? 'bg-amber-100 text-amber-700' : 'bg-coffee-100 text-coffee-400')}>
              {receta ? <CheckCircle2 className="h-3.5 w-3.5" /> : '2'}
            </span>
            {receta ? 'Receta ✓' : 'Receta'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingData ? (
            <div className="px-6 py-4 space-y-5 animate-pulse">
              {/* Imagen */}
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-coffee-200 rounded" />
                <div className="h-28 w-full bg-coffee-100 rounded-xl" />
              </div>
              {/* Nombre */}
              <div className="space-y-1.5">
                <div className="h-3 w-32 bg-coffee-200 rounded" />
                <div className="h-10 w-full bg-coffee-100 rounded-lg" />
              </div>
              {/* Tipo preparación */}
              <div className="space-y-1.5">
                <div className="h-3 w-48 bg-coffee-200 rounded" />
                <div className="h-14 bg-coffee-100 rounded-lg" />
              </div>
              {/* Descripción */}
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-coffee-200 rounded" />
                <div className="h-10 w-full bg-coffee-100 rounded-lg" />
              </div>
              {/* Categoría + Unidad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="h-3 w-20 bg-coffee-200 rounded" />
                  <div className="h-10 w-full bg-coffee-100 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-24 bg-coffee-200 rounded" />
                  <div className="h-10 w-full bg-coffee-100 rounded-lg" />
                </div>
              </div>
              {/* Precio */}
              <div className="space-y-1.5">
                <div className="h-3 w-36 bg-coffee-200 rounded" />
                <div className="h-10 w-full bg-coffee-100 rounded-lg" />
              </div>
              {/* Destino */}
              <div className="space-y-1.5">
                <div className="h-3 w-16 bg-coffee-200 rounded" />
                <div className="h-10 w-full bg-coffee-100 rounded-lg" />
              </div>
            </div>
          ) : tab === 'datos' && (
            <form onSubmit={handleSaveDatos} className="px-6 py-4 space-y-5">
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

              {/* Foto */}
              <div>
                <label className="text-sm font-medium text-coffee-700 mb-1 block">Foto del producto</label>
                <ImageUploadField existingUrl={existingImageUrl} key={existingImageUrl} />
              </div>

              {/* Preparation type */}
              <div className="rounded-lg bg-coffee-50 border border-coffee-200 px-4 py-3 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-coffee-500" />
                <div>
                  <p className="text-sm font-medium text-coffee-700">
                    Este producto fue creado como <strong>{product.isActive ? 'En lote' : 'Al momento'}</strong>.
                  </p>
                  <p className="text-xs text-coffee-500 mt-0.5">
                    La forma de preparación no se puede cambiar una vez creado el producto.
                  </p>
                </div>
              </div>

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

              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Categoría
                  <HelpTooltip text="Agrupa productos para filtrar y reportar ventas por categoría." />
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={categoryId}
                      onChange={(v) => setCategoryId(v)}
                      options={[{ value: '', label: 'Sin categoría' }, ...localCategoryOptions]}
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
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Unidad de venta
                  <HelpTooltip text="Cómo se vende al cliente. Ej: unidad (una taza), porción (un trozo)." />
                </label>
                <SearchableSelect
                  value={unit}
                  onChange={(v) => setUnit(v)}
                  options={UNIT_OPTIONS}
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Precio de venta (Bs.)
                  <span className="text-red-500 ml-1">*</span>
                  <HelpTooltip text="Precio al que se vende al cliente." />
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

              <div>
                <label className="flex items-center text-sm font-medium text-coffee-700 mb-1">
                  Destino
                  <HelpTooltip text="Área de preparación: barra (bebidas) o cocina (comidas)." />
                </label>
                <Select
                  value={destino}
                  onChange={(v) => setDestino(v as ProductDestino)}
                  options={DESTINO_OPTIONS}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isLoading={isSaving}>
                  Guardar Cambios
                </Button>
              </div>
            </form>
          )}

          {!isLoadingData && tab === 'receta' && (
            <div className="px-6 py-4">
              <RecetaFormContent
                onClose={() => setTab('datos')}
                receta={receta}
                preselectedProductId={product.id}
                productOverride={productForReceta}
                insumos={insumos}
                products={products}
                onSuccess={() => onRecetaSaved?.()}
                onRefreshInventory={onRefreshInventory}
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
