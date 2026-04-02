import React from 'react';
import { Modal } from '../ui/Modal';
import { ProductForm } from '../forms/ProductForm';
import { useToast } from '../ui/Toast';
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
  const toast = useToast();

  const handleSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    try {
      if (product) {
        await api.put(`/Producto/${product.id}`, {
          nombre: data.name,
          codigo_barra: data.barcode ?? '',
          descripcion: data.description ?? '',
          categoria_Id: Number(data.categoryId) || 0,
          unidad_medida: data.unit,
          marca: data.brandId ?? '',
          ubicacion: data.locationId ?? '',
          costo_compra: data.costPrice,
          precio: data.salePrice,
          stock_actual: data.stock ?? 0,
          stock_minimo: data.minStock ?? 0,
          disponible: data.isActive ?? true,
        });
        toast.success('Producto actualizado', `"${data.name}" fue actualizado correctamente.`);
      } else {
        // CREATE — always comprado (compradoOnly enforces tipo='comprado')
        const payload = {
          nombre: data.name,
          codigo_barra: data.barcode ?? '',
          descripcion: data.description ?? '',
          categoria_Id: Number(data.categoryId) || 0,
          unidad_medida: data.unit,
          marca: data.brandId ?? '',
          ubicacion: data.locationId ?? '',
          costo_compra: data.costPrice,
          precio: data.salePrice,
          stock_actual: data.stock ?? 0,
          stock_minimo: data.minStock ?? 0,
          disponible: data.isActive ?? true,
        };
        await api.post('/Producto', payload);
        toast.success('Producto creado', `"${data.name}" fue agregado al inventario.`);
      }
      onSuccess();
      onClose();
    } catch (error){
      console.log(error);
      
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
      {isLoadingDetail ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-4 border-coffee-200 border-t-coffee-500 rounded-full animate-spin" />
          <p className="text-sm text-coffee-500">Cargando información del producto…</p>
        </div>
      ) : (
        <ProductForm
          product={product}
          categories={categories}
          brands={[]}
          locations={[]}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          hideTipo
          forceTipo={!product ? 'comprado' : undefined}
        />
      )}
    </Modal>
  );
};
