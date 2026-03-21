import React from 'react';
import type { Product, ProductInput, ProductTipo, Category, Brand, Location } from '../../types';
import { Form, FormField, FormRow, FormActions } from './FormField';
import { Input, Textarea, Select } from '../ui';
import { Button } from '../ui';
import { Plus, Trash2, AlertTriangle, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecipesStore } from '../../stores';
import { formatCurrency } from '../../utils';

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  brands: Brand[];
  locations: Location[];
  onSubmit: (data: ProductInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TIPO_OPTIONS = [
  { value: 'comprado', label: 'Comprado — se vende tal como llega del proveedor' },
  { value: 'elaborado', label: 'Elaborado — se prepara con ingredientes (requiere receta)' },
  { value: 'combo', label: 'Combo — agrupación de productos a precio especial' },
];

const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'taza', label: 'Taza' },
  { value: 'vaso', label: 'Vaso' },
  { value: 'porcion', label: 'Porción' },
  { value: 'botella', label: 'Botella' },
  { value: 'caja', label: 'Caja' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
  { value: 'ml', label: 'Mililitro' },
];

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  brands,
  locations,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const { getRecetaByProductId } = useRecipesStore();

  const deriveTipo = (p?: Product): ProductTipo => {
    return p?.tipo ?? 'comprado';
  };

  const [formData, setFormData] = React.useState<ProductInput>({
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    tipo: deriveTipo(product),
    categoryId: product?.categoryId || '',
    brandId: product?.brandId || undefined,
    unit: product?.unit || 'unidad',
    costPrice: product?.costPrice || 0,
    salePrice: product?.salePrice || 0,
    wholesalePrice: product?.wholesalePrice,
    stock: product?.stock || 0,
    minStock: product?.minStock || 5,
    maxStock: product?.maxStock || 100,
    locationId: product?.locationId || undefined,
    barcode: product?.barcode || '',
    isActive: product?.isActive ?? true,
    variations: product?.variations?.map(v => ({
      name: v.name,
      sku: v.sku,
      priceAdjustment: v.priceAdjustment,
      stock: v.stock,
      minStock: v.minStock,
      maxStock: v.maxStock,
      isActive: v.isActive,
    })) || [],
  });

  const [hasVariations, setHasVariations] = React.useState(
    (product?.variations?.length || 0) > 0
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const tipo = formData.tipo;
  const isElaborado = tipo === 'elaborado';
  const isComprado = tipo === 'comprado';
  const isCombo = tipo === 'combo';

  // Check if elaborado already has a recipe
  const recetaExistente = product ? getRecetaByProductId(product.id) : undefined;
  const margenCalculado =
    formData.salePrice > 0 && formData.costPrice > 0
      ? ((formData.salePrice - formData.costPrice) / formData.salePrice) * 100
      : null;

  const handleChange = (field: keyof ProductInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleVariationChange = (index: number, field: string, value: unknown) => {
    setFormData(prev => {
      const variations = [...(prev.variations || [])];
      variations[index] = { ...variations[index], [field]: value };
      return { ...prev, variations };
    });
  };

  const addVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [
        ...(prev.variations || []),
        { name: '', sku: '', priceAdjustment: 0, stock: 0, minStock: 5, maxStock: 100, isActive: true },
      ],
    }));
  };

  const removeVariation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations?.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.categoryId) newErrors.categoryId = 'La categoría es requerida';
    if (!formData.tipo) newErrors.tipo = 'El tipo es requerido';
    if (formData.salePrice <= 0) newErrors.salePrice = 'El precio de venta debe ser mayor a 0';
    if (isComprado && formData.costPrice < 0) newErrors.costPrice = 'El costo debe ser ≥ 0';
    if (hasVariations && formData.variations) {
      formData.variations.forEach((v, i) => {
        if (!v.name.trim()) newErrors[`variation_${i}_name`] = 'El nombre es requerido';
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, variations: hasVariations ? formData.variations : [] });
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-5">
        {/* Tipo */}
        <FormField label="Tipo de producto" required error={errors.tipo}>
          <Select
            value={formData.tipo}
            onChange={(v) => handleChange('tipo', v as ProductTipo)}
            options={TIPO_OPTIONS}
          />
        </FormField>

        {/* Elaborado: recipe alert */}
        {isElaborado && product && !recetaExistente && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-amber-800">
              <span className="font-semibold">Sin receta asignada</span> — este producto no puede venderse hasta que tenga una receta.
            </div>
            <button
              type="button"
              onClick={() => { onCancel(); navigate('/recipes/recetas'); }}
              className="text-xs text-amber-700 underline hover:text-amber-900 whitespace-nowrap"
            >
              Crear receta
            </button>
          </div>
        )}

        {isElaborado && recetaExistente && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
            <BookOpen className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 flex-1">
              Receta asignada — {recetaExistente.ingredientes.length} ingredientes, costo/porción: <strong>{formatCurrency(recetaExistente.costoPorPorcion)}</strong>
            </span>
          </div>
        )}

        {/* Name + Barcode */}
        <FormRow>
          <FormField label="Nombre" required error={errors.name}>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre del producto"
            />
          </FormField>
          {isComprado && (
            <FormField label="Código de Barras">
              <Input
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Escanear o ingresar"
              />
            </FormField>
          )}
        </FormRow>

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
          <FormField label="Categoría" required error={errors.categoryId}>
            <Select
              value={formData.categoryId}
              onChange={(value) => handleChange('categoryId', value)}
              options={categories.filter(c => c.isActive).map(c => ({ value: c.id, label: c.name }))}
              placeholder="Seleccionar categoría"
            />
          </FormField>
          <FormField label="Unidad de venta">
            <Select
              value={formData.unit}
              onChange={(value) => handleChange('unit', value)}
              options={UNIT_OPTIONS}
            />
          </FormField>
        </FormRow>

        {/* Brand + Location (optional) */}
        <FormRow>
          <FormField label="Marca">
            <Select
              value={formData.brandId || ''}
              onChange={(value) => handleChange('brandId', value || undefined)}
              options={brands.filter(b => b.isActive).map(b => ({ value: b.id, label: b.name }))}
              placeholder="Seleccionar marca"
            />
          </FormField>
          <FormField label="Ubicación">
            <Select
              value={formData.locationId || ''}
              onChange={(value) => handleChange('locationId', value || undefined)}
              options={locations.filter(l => l.isActive).map(l => ({ value: l.id, label: l.name }))}
              placeholder="Seleccionar ubicación"
            />
          </FormField>
        </FormRow>

        {/* Prices */}
        <FormRow>
          {/* Comprado: manual cost price */}
          {(isComprado || isCombo) && (
            <FormField label="Costo de compra (Bs.)" required={isComprado} error={errors.costPrice}>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
              />
            </FormField>
          )}
          <FormField label="Precio de venta (Bs.)" required error={errors.salePrice}>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.salePrice}
              onChange={(e) => handleChange('salePrice', parseFloat(e.target.value) || 0)}
            />
          </FormField>
        </FormRow>

        {/* Margin display for comprado */}
        {isComprado && margenCalculado !== null && formData.salePrice > 0 && formData.costPrice > 0 && (
          <div className="flex items-center gap-2 bg-coffee-50 border border-coffee-200 rounded-lg px-4 py-2">
            <span className="text-sm text-coffee-600">Margen:</span>
            <span className={`font-bold text-sm ${margenCalculado >= 30 ? 'text-emerald-700' : 'text-red-600'}`}>
              {margenCalculado.toFixed(1)}% ({formatCurrency(formData.salePrice - formData.costPrice)})
            </span>
          </div>
        )}

        {/* Stock — only for comprado and combo */}
        {(isComprado || isCombo) && (
          <FormRow>
            <FormField label="Stock actual">
              <Input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
              />
            </FormField>
            <FormField label="Stock mínimo (alerta)">
              <Input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
              />
            </FormField>
          </FormRow>
        )}

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

        {/* Variations — only for comprado products */}
        {isComprado && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVariations}
                  onChange={(e) => setHasVariations(e.target.checked)}
                  className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
                />
                <span className="text-sm font-medium text-coffee-700">Tiene variaciones</span>
              </label>
              {hasVariations && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={addVariation}
                >
                  Agregar Variación
                </Button>
              )}
            </div>

            {hasVariations && formData.variations && formData.variations.length > 0 && (
              <div className="space-y-3">
                {formData.variations.map((variation, index) => (
                  <div key={index} className="p-4 bg-coffee-50 rounded-lg border border-coffee-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-coffee-700">Variación {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariation(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormRow>
                      <FormField label="Nombre" required>
                        <Input
                          value={variation.name}
                          onChange={(e) => handleVariationChange(index, 'name', e.target.value)}
                          placeholder="Ej: Grande, Extra Shot"
                        />
                      </FormField>
                      <FormField label="Ajuste de Precio (Bs.)">
                        <Input
                          type="number"
                          step="0.01"
                          value={variation.priceAdjustment}
                          onChange={(e) => handleVariationChange(index, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                        />
                      </FormField>
                    </FormRow>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {product ? 'Guardar Cambios' : 'Crear Producto'}
        </Button>
      </FormActions>
    </Form>
  );
};
