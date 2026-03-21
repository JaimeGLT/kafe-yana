import React from 'react';
import { Modal } from '../ui/Modal';
import { ProductForm } from '../forms/ProductForm';
import { toast } from '../ui/Toast';
import { useInventoryStore } from '../../stores';
import type { Product, ProductInput, Category, Brand, Location } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  categories: Category[];
  brands: Brand[];
  locations: Location[];
  onSuccess: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  brands,
  locations,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { addProduct, updateProduct } = useInventoryStore();

  const handleSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    try {
      if (product) {
        updateProduct(product.id, data);
        toast.success('Producto actualizado', `"${data.name}" fue actualizado correctamente.`);
      } else {
        addProduct(data);
        toast.success('Producto creado', `"${data.name}" fue agregado al inventario.`);
      }
      onSuccess();
      onClose();
    } catch (error) {
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
      />
    </Modal>
  );
};
