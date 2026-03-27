import React from 'react';
import { Modal } from '../ui/Modal';
import { ProductForm } from '../forms/ProductForm';
import { toast } from '../ui/Toast';
import { api } from '../../lib/api';
import type { Product, ProductInput, Category, Brand, Location } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  categories: Category[];
  brands: Brand[];
  locations: Location[];
  onSuccess: () => void;
  compradoOnly?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  brands,
  locations,
  onSuccess,
  compradoOnly = false,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    try {
      if (product) {
        const tipo = product.tipo;
        if (tipo === 'comprado') {
          const brand = brands.find((b) => b.id === data.brandId);
          const location = locations.find((l) => l.id === data.locationId);
          await api.put(`/Comprado/${product.id}`, {
            nombre: data.name,
            codigo_barra: data.barcode ?? '',
            descripcion: data.description ?? '',
            categoria_Id: Number(data.categoryId) || 0,
            unidad_medida: data.unit,
            marca: brand?.name ?? '',
            ubicacion: location?.name ?? '',
            costo_compra: data.costPrice,
            precio: data.salePrice,
            stock_actual: data.stock ?? 0,
            stock_minimo: data.minStock ?? 0,
            disponible: data.isActive ?? true,
          });
        } else if (tipo === 'elaborado') {
          await api.put(`/Elaborado/${product.id}`, {
            nombre: data.name,
            descripcion: data.description ?? '',
            precio: data.salePrice,
            categoria_Id: Number(data.categoryId) || 0,
            unidad_medida: data.unit,
          });
        }
        toast.success('Producto actualizado', `"${data.name}" fue actualizado correctamente.`);
      } else {
        // CREATE — always comprado (compradoOnly enforces tipo='comprado')
        const brand = brands.find((b) => b.id === data.brandId);
        const location = locations.find((l) => l.id === data.locationId);
        await api.post('/Comprado', {
          nombre: data.name,
          codigo_barra: data.barcode ?? '',
          descripcion: data.description ?? '',
          categoria_Id: Number(data.categoryId) || 0,
          unidad_medida: data.unit,
          marca: brand?.name ?? '',
          ubicacion: location?.name ?? '',
          costo_compra: data.costPrice,
          precio: data.salePrice,
          stock_actual: data.stock ?? 0,
          stock_minimo: data.minStock ?? 0,
          disponible: data.isActive ?? true,
        });
        toast.success('Producto creado', `"${data.name}" fue agregado al inventario.`);
      }
      onSuccess();
      onClose();
    } catch {
      toast.error('Error', 'No se pudo guardar el producto. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      size="xl"
    >
      <ProductForm
        product={product}
        categories={categories}
        brands={brands}
        locations={locations}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
        hideTipo={compradoOnly}
        forceTipo={compradoOnly && !product ? 'comprado' : undefined}
      />
    </Modal>
  );
};
