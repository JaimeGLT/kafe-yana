import React, { useState, useMemo } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, ConfirmModal } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { InventoryTable } from '../../components/tables/InventoryTable';
import { ProductModal } from '../../components/modals/ProductModal';
import { useInventoryStore } from '../../stores';
import type { Product } from '../../types';

interface ProductsPageProps {
  servicesOnly?: boolean;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ servicesOnly = false }) => {
  const {
    products,
    categories,
    brands,
    locations,
    deleteProduct,
  } = useInventoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (servicesOnly && !product.isService) return false;
      if (!servicesOnly && product.isService) return false;

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchLower) ||
        product.code.toLowerCase().includes(searchLower) ||
        (product.barcode || '').toLowerCase().includes(searchLower);

      const matchesCategory =
        !selectedCategory || product.categoryId === selectedCategory;

      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === 'active' && product.isActive) ||
        (selectedStatus === 'inactive' && !product.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, servicesOnly]);

  const categoryOptions = useMemo(() => {
    return [
      { value: '', label: 'Todas las categorías' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];
  }, [categories]);

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];

  const handleOpenCreate = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteRequest = (product: Product) => {
    setDeletingProduct(product);
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      deleteProduct(deletingProduct.id);
      toast.success('Producto eliminado', `"${deletingProduct.name}" fue eliminado del inventario.`);
      setDeletingProduct(null);
    } catch {
      toast.error('Error', 'No se pudo eliminar el producto. Intente nuevamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title={servicesOnly ? 'Servicios' : 'Productos'}
          subtitle={`${filteredProducts.length} ${servicesOnly ? 'servicio(s)' : 'producto(s)'} encontrado(s)`}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              {servicesOnly ? 'Nuevo Servicio' : 'Nuevo Producto'}
            </Button>
          }
        />

        {/* Filters */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre, código o código de barras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="sm:w-52">
              <Select
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder="Todas las categorías"
              />
            </div>
            <div className="sm:w-44">
              <Select
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
                placeholder="Todos los estados"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <Package className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">No se encontraron productos</p>
            <p className="text-sm mt-1">
              {searchQuery || selectedCategory || selectedStatus
                ? 'Prueba con otros filtros o crea un nuevo producto.'
                : 'Agrega tu primer producto para comenzar.'}
            </p>
            {!searchQuery && !selectedCategory && !selectedStatus && (
              <Button
                variant="primary"
                className="mt-4"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
              >
                Nuevo Producto
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <InventoryTable
              products={filteredProducts}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          </div>
        )}
      </PageContainer>

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        brands={brands}
        locations={locations}
        onSuccess={() => {}}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${deletingProduct?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default ProductsPage;
