import React from 'react';
import type { Product, ProductInput, ProductTipo, ProductDestino, Category, Brand, Location, Receta } from '../../types';
import { Form, FormField, FormRow, FormActions } from './FormField';
import { Input, Textarea, Select, SearchableSelect } from '../ui';
import { Button, ImageUploadField } from '../ui';
import { AlertTriangle, BookOpen, Layers, Plus, Pencil } from 'lucide-react';
import { formatCurrency } from '../../utils';
import { CategoryModal } from '../modals/CategoryModal';
import { CodigoSinModal } from '../modals/CodigoSinModal';
import { gql } from '../../lib/graphql';
import { toast } from '../ui/Toast';
import { UNIT_OPTIONS, DEFAULT_UNIT } from '../../data/units';

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  brands: Brand[];
  locations: Location[];
  recetaExistente?: Receta;
  onSubmit: (data: ProductInput) => void;
  onImageChange?: (file: File | null) => void;
  onCancel: () => void;
  isLoading?: boolean;
  hideTipo?: boolean;
  forceTipo?: ProductTipo;
}

const DESTINO_OPTIONS = [
  { value: 'sin_destino', label: 'Sin destino' },
  { value: 'barra', label: 'Barra' },
  { value: 'cocina', label: 'Cocina' },
];

const TIPO_OPTIONS = [
  { value: 'comprado', label: 'Comprado — se compra a un proveedor' },
  { value: 'elaborado', label: 'Elaborado — se prepara con ingredientes' },
  { value: 'combo', label: 'Combo — agrupa varios productos' },
];

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  brands,
  locations,
  recetaExistente,
  onSubmit,
  onImageChange,
  onCancel,
  isLoading = false,
  hideTipo = false,
  forceTipo,
}) => {
  const isEditing = !!product;

  const [formData, setFormData] = React.useState<ProductInput>({
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    tipo: forceTipo ?? product?.tipo ?? 'comprado',
    categoryId: product?.categoryId || '',
    brandId: product?.brandId || undefined,
    unit: product?.unit || DEFAULT_UNIT,
    costPrice: product?.costPrice || 0,
    salePrice: product?.salePrice || 0,
    wholesalePrice: product?.wholesalePrice,
    stock: product?.stock || 0,
    minStock: product?.minStock || 5,
    maxStock: product?.maxStock || 100,
    locationId: product?.locationId || undefined,
    barcode: product?.barcode || '',
    imagen: product?.image || '',
    isActive: product?.isActive ?? true,
    variations: [],
    destino: product?.destino ?? 'sin_destino',
    codigoSin: product?.codigoSin || '',
  });

  const [isCodigoSinModalOpen, setIsCodigoSinModalOpen] = React.useState(false);
  const [rawValues, setRawValues] = React.useState({
    costPrice: String(product?.costPrice ?? 0),
    salePrice: String(product?.salePrice ?? 0),
    stock:     String(product?.stock ?? 0),
    minStock:  String(product?.minStock ?? 5),
  });
  const [localCategories, setLocalCategories] = React.useState<Category[]>(categories);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);

  const handleCategoryCreated = async (createdName?: string) => {
    const data = await gql<{ categorias: { items: { id: number; nombre: string; estado: boolean; descripcion: string }[] } }>(
      `query { categorias(skip: 0, take: 200, order: { nombre: ASC }) { items { id nombre estado descripcion } } }`
    );
    const cats: Category[] = data.categorias.items.map((n) => ({
      id: String(n.id),
      name: n.nombre,
      description: n.descripcion ?? '',
      isActive: n.estado,
      color: '',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setLocalCategories(cats);
    if (createdName) {
      const created = cats.find((c) => c.name === createdName);
      if (created) handleChange('categoryId', created.id);
    }
  };

  const tipo = formData.tipo as ProductTipo;
  const isElaborado = tipo === 'elaborado';
  const isComprado = tipo === 'comprado';
  const isCombo = tipo === 'combo';

  const margenCalculado =
    formData.salePrice > 0 && formData.costPrice > 0
      ? ((formData.salePrice - formData.costPrice) / formData.salePrice) * 100
      : null;

  const handleChange = (field: keyof ProductInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (
    field: 'costPrice' | 'salePrice' | 'stock' | 'minStock',
    raw: string,
  ) => {
    setRawValues(prev => ({ ...prev, [field]: raw }));
    const isDecimal = field === 'costPrice' || field === 'salePrice';
    const parsed = isDecimal ? parseFloat(raw) : parseInt(raw, 10);
    handleChange(field, isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  const validate = (): boolean => {
    const msgs: string[] = [];
    if (!formData.name.trim()) msgs.push('El nombre es requerido');
    if (!formData.categoryId) msgs.push('La categoría es requerida');
    if (formData.salePrice <= 0) msgs.push('El precio de venta debe ser mayor a 0');
    if (isComprado && formData.costPrice <= 0) msgs.push('El costo de compra debe ser mayor a 0');
    if (!formData.codigoSin) msgs.push('El Código SIN es requerido');
    if (msgs.length > 0) {
      toast.error('Campos requeridos', msgs.join(' · '));
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const { imagen: _img, ...submitData } = formData;
    onSubmit({ ...submitData, variations: [] });
  };

  return (
    <>
    <Form onSubmit={handleSubmit}>
      <div className="space-y-5">

        {/* Tipo selector — only when creating and not hidden */}
        {!isEditing && !hideTipo && (
          <FormField label="Tipo de producto" required>
            <Select
              value={formData.tipo as string}
              onChange={(v) => handleChange('tipo', v as ProductTipo)}
              options={TIPO_OPTIONS}
            />
          </FormField>
        )}

        {/* ── ELABORADO banners ── */}
        {isElaborado && product && !recetaExistente && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Sin receta asignada.</span> Administra la receta desde la página de <em>Productos Elaborados</em>.
            </p>
          </div>
        )}
        {isElaborado && recetaExistente && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
            <BookOpen className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 flex-1">
              Receta asignada — {recetaExistente.ingredientes.length} ingredientes, costo/porción:{' '}
              <strong>{formatCurrency(recetaExistente.costoPorPorcion)}</strong>
            </span>
          </div>
        )}

        {/* ── COMBO banner ── */}
        {isCombo && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
            <Layers className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              El costo y stock de un combo se calculan automáticamente a partir de sus componentes. Administra los ítems desde la página de <em>Combos</em>.
            </p>
          </div>
        )}

        {/* Foto */}
        <FormField label="Foto del producto">
          <ImageUploadField
            existingUrl={product?.image?.startsWith('http') || product?.image?.startsWith('data:') || product?.image?.startsWith('blob:') ? product.image : undefined}
            onChange={onImageChange}
          />
        </FormField>

        {/* Name + Barcode (barcode only for comprado) */}
        <FormRow>
          <FormField label="Nombre" required>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre del producto"
            />
          </FormField>
          {isComprado && (
            <FormField label="Código / Barras">
              <Input
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Ej: 7501234567890"
              />
            </FormField>
          )}
        </FormRow>

        <FormField label="Código SIN" required>
          {formData.codigoSin ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-coffee-100 text-coffee-900 text-sm font-mono font-medium">
                {formData.codigoSin}
              </span>
              <button
                type="button"
                onClick={() => setIsCodigoSinModalOpen(true)}
                className="flex items-center gap-1.5 text-sm text-coffee-500 hover:text-coffee-800 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Cambiar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCodigoSinModalOpen(true)}
              className="w-full rounded-lg border border-dashed border-coffee-300 px-4 py-2.5 text-sm text-coffee-400 hover:border-coffee-400 hover:text-coffee-600 transition-colors text-left"
            >
              Asignar Código SIN…
            </button>
          )}
        </FormField>

        <FormField label="Descripción">
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del producto"
            rows={2}
          />
        </FormField>

        {/* Category + Unit */}
        <FormRow>
          <FormField label="Categoría" required>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={formData.categoryId}
                  onChange={(value) => handleChange('categoryId', value)}
                  options={localCategories.filter(c => c.isActive).map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Seleccionar categoría"
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
          </FormField>
          <FormField label="Unidad de venta">
            <SearchableSelect
              value={formData.unit}
              onChange={(value) => handleChange('unit', value)}
              options={UNIT_OPTIONS}
            />
          </FormField>
        </FormRow>

        {/* Brand — only for comprado */}
        {isComprado && brands.filter(b => b.isActive).length > 0 && (
          <FormField label="Marca">
            <Select
              value={formData.brandId || ''}
              onChange={(value) => handleChange('brandId', value || undefined)}
              options={[
                { value: '', label: 'Sin marca' },
                ...brands.filter(b => b.isActive).map(b => ({ value: b.id, label: b.name })),
              ]}
            />
          </FormField>
        )}

        {/* Location — only for comprado */}
        {isComprado && locations.filter(l => l.isActive).length > 0 && (
          <FormField label="Ubicación en bodega">
            <Select
              value={formData.locationId || ''}
              onChange={(value) => handleChange('locationId', value || undefined)}
              options={[
                { value: '', label: 'Sin ubicación' },
                ...locations.filter(l => l.isActive).map(l => ({ value: l.id, label: l.name })),
              ]}
            />
          </FormField>
        )}

        {/* Prices */}
        <FormRow>
          {isComprado && (
            <FormField label="Costo de compra (Bs.)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={rawValues.costPrice}
                onChange={(e) => handleNumberChange('costPrice', e.target.value)}
              />
            </FormField>
          )}
          <FormField label="Precio de venta (Bs.)" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={rawValues.salePrice}
              onChange={(e) => handleNumberChange('salePrice', e.target.value)}
            />
          </FormField>
        </FormRow>

        {/* Margin — only for comprado */}
        {isComprado && margenCalculado !== null && (
          <div className="flex items-center gap-2 bg-coffee-50 border border-coffee-200 rounded-lg px-4 py-2">
            <span className="text-sm text-coffee-600">Margen:</span>
            <span className={`font-bold text-sm ${margenCalculado >= 30 ? 'text-emerald-700' : 'text-red-600'}`}>
              {margenCalculado.toFixed(1)}% ({formatCurrency(formData.salePrice - formData.costPrice)})
            </span>
          </div>
        )}

        {/* Stock — only for comprado */}
        {isComprado && (
          <FormRow>
            <FormField label="Stock actual">
              <Input
                type="number"
                min="0"
                value={rawValues.stock}
                onChange={(e) => handleNumberChange('stock', e.target.value)}
              />
            </FormField>
            <FormField label="Stock mínimo (alerta)">
              <Input
                type="number"
                min="0"
                value={rawValues.minStock}
                onChange={(e) => handleNumberChange('minStock', e.target.value)}
              />
            </FormField>
          </FormRow>
        )}

        {/* Destino */}
        <FormField label="Destino">
          <Select
            value={formData.destino ?? 'sin_destino'}
            onChange={(v) => handleChange('destino', v as ProductDestino)}
            options={DESTINO_OPTIONS}
          />
        </FormField>

        {/* Active toggle */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
            />
            <span className="text-sm text-coffee-700">Disponible para venta</span>
          </label>
        </div>

      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
        </Button>
      </FormActions>
    </Form>
    <CodigoSinModal
      isOpen={isCodigoSinModalOpen}
      onClose={() => setIsCodigoSinModalOpen(false)}
      onSelect={(v) => handleChange('codigoSin', v)}
    />
    <CategoryModal
      isOpen={isCategoryModalOpen}
      onClose={() => setIsCategoryModalOpen(false)}
      onSuccess={handleCategoryCreated}
    />
    </>
  );
};
