import React from 'react';
import { Modal } from '../ui/Modal';
import { ProductForm } from '../forms/ProductForm';
import { useToast } from '../ui/Toast';
import { SkeletonProductForm } from '../ui/Skeleton';
import { api } from '../../lib/api';
import type { Product, ProductInput, Category } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  categories: Category[];
  onSuccess: () => void;
  isLoadingDetail?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  onSuccess,
  isLoadingDetail = false,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const toast = useToast();

  React.useEffect(() => {
    if (isOpen) setImageFile(null);
  }, [isOpen]);

  const handleSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('Nombre', data.name);
      if (data.barcode) fd.append('Codigo_barra', data.barcode);
      if (data.description) fd.append('Descripcion', data.description);
      fd.append('Categoria_Id', String(Number(data.categoryId) || 0));
      fd.append('Unidad_medida', data.unit);
      if (data.brandId) fd.append('Marca', data.brandId);
      const ubicacion = data.destino === 'barra' ? 'Barra' : data.destino === 'cocina' ? 'Cocina' : '';
      if (ubicacion) fd.append('Ubicacion', ubicacion);
      fd.append('Costo_compra', String(data.costPrice));
      fd.append('Precio', String(data.salePrice));
      fd.append('Stock_actual', String(data.stock ?? 0));
      fd.append('Stock_minimo', String(data.minStock ?? 0));
      fd.append('Disponible', String(data.isActive ?? true));
      fd.append('CodigoSin', data.codigoSin ?? '');
      if (imageFile) fd.append('Imagen', imageFile);

      if (product) {
        await api.putForm(`/Producto/${product.id}`, fd);
        toast.success('Producto actualizado', `"${data.name}" fue actualizado correctamente.`);
      } else {
        await api.postForm('/Producto', fd);
        toast.success('Producto creado', `"${data.name}" fue agregado al inventario.`);
      }
      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el producto. Intente nuevamente.';
      toast.error('Error', message);
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
      bottomSheet
    >
      {isLoadingDetail ? (
        <SkeletonProductForm />
      ) : (
        <ProductForm
          product={product}
          categories={categories}
          brands={[]}
          locations={[]}
          onSubmit={handleSubmit}
          onImageChange={setImageFile}
          onCancel={onClose}
          isLoading={isLoading}
          hideTipo
          forceTipo={!product ? 'comprado' : undefined}
        />
      )}
    </Modal>
  );
};
