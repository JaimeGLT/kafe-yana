import React from 'react';
import type { Product, ProductInput, Category, Brand, Location } from '../../types';
import { Form, FormField, FormRow, FormActions } from './FormField';
import { Input, Textarea, Select } from '../ui';
import { Button } from '../ui';
import { Plus, Trash2 } from 'lucide-react';

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  brands: Brand[];
  locations: Location[];
  onSubmit: (data: ProductInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  brands,
  locations,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState<ProductInput>({
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
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
    isService: product?.isService ?? false,
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
        {
          name: '',
          sku: '',
          priceAdjustment: 0,
          stock: 0,
          minStock: 5,
          maxStock: 100,
          isActive: true,
        },
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

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'La categoría es requerida';
    }
    if (formData.costPrice < 0) {
      newErrors.costPrice = 'El costo debe ser mayor o igual a 0';
    }
    if (formData.salePrice <= 0) {
      newErrors.salePrice = 'El precio de venta debe ser mayor a 0';
    }

    if (hasVariations && formData.variations) {
      formData.variations.forEach((v, i) => {
        if (!v.name.trim()) {
          newErrors[`variation_${i}_name`] = 'El nombre es requerido';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        variations: hasVariations ? formData.variations : [],
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <FormRow>
          <FormField label="Código" required>
            <Input
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="Código del producto"
            />
          </FormField>
          <FormField label="Código de Barras">
            <Input
              value={formData.barcode}
              onChange={(e) => handleChange('barcode', e.target.value)}
              placeholder="Código de barras"
            />
          </FormField>
        </FormRow>

        <FormField label="Nombre" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nombre del producto"
          />
        </FormField>

        <FormField label="Descripción">
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descripción del producto"
            rows={3}
          />
        </FormField>

        <FormRow>
          <FormField label="Categoría" required error={errors.categoryId}>
            <Select
              value={formData.categoryId}
              onChange={(value) => handleChange('categoryId', value)}
              options={categories
                .filter(c => c.isActive)
                .map(c => ({ value: c.id, label: c.name }))}
              placeholder="Seleccionar categoría"
            />
          </FormField>
          <FormField label="Marca">
            <Select
              value={formData.brandId || ''}
              onChange={(value) => handleChange('brandId', value || undefined)}
              options={brands
                .filter(b => b.isActive)
                .map(b => ({ value: b.id, label: b.name }))}
              placeholder="Seleccionar marca"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Unidad">
            <Select
              value={formData.unit}
              onChange={(value) => handleChange('unit', value)}
              options={[
                { value: 'unidad', label: 'Unidad' },
                { value: 'kg', label: 'Kilogramo' },
                { value: 'g', label: 'Gramo' },
                { value: 'l', label: 'Litro' },
                { value: 'ml', label: 'Mililitro' },
                { value: 'caja', label: 'Caja' },
                { value: 'paquete', label: 'Paquete' },
              ]}
            />
          </FormField>
          <FormField label="Ubicación">
            <Select
              value={formData.locationId || ''}
              onChange={(value) => handleChange('locationId', value || undefined)}
              options={locations
                .filter(l => l.isActive)
                .map(l => ({ value: l.id, label: l.name }))}
              placeholder="Seleccionar ubicación"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Precio de Costo" required error={errors.costPrice}>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
            />
          </FormField>
          <FormField label="Precio de Venta" required error={errors.salePrice}>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.salePrice}
              onChange={(e) => handleChange('salePrice', parseFloat(e.target.value) || 0)}
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="Precio Mayorista">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.wholesalePrice || ''}
              onChange={(e) => handleChange('wholesalePrice', parseFloat(e.target.value) || undefined)}
            />
          </FormField>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isService}
                onChange={(e) => handleChange('isService', e.target.checked)}
                className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
              />
              <span className="text-sm text-coffee-700">Es un servicio</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 text-coffee-500 focus:ring-coffee-500 border-coffee-300 rounded"
              />
              <span className="text-sm text-coffee-700">Activo</span>
            </label>
          </div>
        </FormRow>

        {!formData.isService && (
          <>
            <FormRow>
              <FormField label="Stock Inicial">
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                />
              </FormField>
              <FormField label="Stock Mínimo">
                <Input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                />
              </FormField>
            </FormRow>

            {/* Variations section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
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
                <div className="space-y-4">
                  {formData.variations.map((variation, index) => (
                    <div
                      key={index}
                      className="p-4 bg-coffee-50 rounded-lg border border-coffee-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-sm font-medium text-coffee-700">
                          Variación {index + 1}
                        </h4>
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
                        <FormField label="SKU">
                          <Input
                            value={variation.sku || ''}
                            onChange={(e) => handleVariationChange(index, 'sku', e.target.value)}
                            placeholder="Código de la variación"
                          />
                        </FormField>
                      </FormRow>
                      <FormRow>
                        <FormField label="Ajuste de Precio">
                          <Input
                            type="number"
                            step="0.01"
                            value={variation.priceAdjustment}
                            onChange={(e) => handleVariationChange(index, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                          />
                        </FormField>
                        <FormField label="Stock">
                          <Input
                            type="number"
                            min="0"
                            value={variation.stock}
                            onChange={(e) => handleVariationChange(index, 'stock', parseInt(e.target.value) || 0)}
                          />
                        </FormField>
                      </FormRow>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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