import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Badge, ConfirmModal } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { CategoryModal } from '../../components/modals/CategoryModal';
import { gql } from '../../lib/graphql';
import { api, ApiError } from '../../lib/api';
import { GET_CATEGORIAS_QUERY } from '../../lib/queries/inventory.queries';
import type { Category } from '../../types';

interface CategoriaNode {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  color: string;
  productos: { id: number }[];
}

interface CategoriasGqlResponse {
  categorias: { items: CategoriaNode[]; totalCount: number };
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const data = await gql<CategoriasGqlResponse>(GET_CATEGORIAS_QUERY);
      const mapped: Category[] = data.categorias.items.map((n) => ({
        id: String(n.id),
        name: n.nombre,
        description: n.descripcion,
        isActive: n.estado,
        color: n.color,
        productCount: n.productos.length,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      setCategories(mapped);
    } catch {
      toast.error('Error', 'No se pudieron cargar las categorías.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreate = () => {
    setEditingCategory(undefined);
    setIsCategoryModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteRequest = (category: Category) => {
    setDeletingCategory(category);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Categoria/${deletingCategory.id}`);
      toast.success('Categoría eliminada', `"${deletingCategory.name}" fue eliminada correctamente.`);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setDeletingCategory(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo eliminar la categoría. Intente nuevamente.';
      toast.error('Error', message);
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Categorías"
          subtitle={`${categories.length} categoría(s) registrada(s)`}
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Nueva Categoría
            </Button>
          }
        />

        {isLoadingCategories ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-2 w-full bg-coffee-200" />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-coffee-200" />
                    <div className="h-4 w-24 bg-coffee-200 rounded" />
                  </div>
                  <div className="h-3 w-full bg-coffee-100 rounded" />
                  <div className="h-3 w-2/3 bg-coffee-100 rounded" />
                  <div className="h-3 w-16 bg-coffee-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <Tag className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">No hay categorías registradas</p>
            <p className="text-sm mt-1">Crea tu primera categoría para organizar tus productos.</p>
            <Button
              variant="primary"
              className="mt-4"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Nueva Categoría
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div
                  key={category.id}
                  className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Color bar */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: category.color }}
                  />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color + '33', border: `2px solid ${category.color}` }}
                        >
                          <div
                            className="w-full h-full rounded-full opacity-60"
                            style={{ backgroundColor: category.color }}
                          />
                        </div>
                        <h3 className="font-display font-semibold text-coffee-900 leading-tight">
                          {category.name}
                        </h3>
                      </div>
                      <Badge variant={category.isActive ? 'success' : 'default'} size="sm">
                        {category.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>

                    {/* Description */}
                    {category.description ? (
                      <p className="text-sm text-coffee-600 mb-3 line-clamp-2">
                        {category.description}
                      </p>
                    ) : (
                      <p className="text-sm text-coffee-400 italic mb-3">Sin descripción</p>
                    )}

                    {/* Product count */}
                    <div className="flex items-center gap-1.5 mb-4">
                      <Tag className="h-4 w-4 text-coffee-400" />
                      <span className="text-sm text-coffee-600">
                        {category.productCount ?? 0} {(category.productCount ?? 0) === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-coffee-100">
                      <button
                        onClick={() => handleEdit(category)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-coffee-600 hover:bg-coffee-50 hover:text-coffee-800 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(category)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}
      </PageContainer>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        category={editingCategory}
        onSuccess={loadCategories}
      />

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${deletingCategory?.name}"?${
          (deletingCategory?.productCount ?? 0) > 0
            ? ` Hay ${deletingCategory?.productCount} producto(s) en esta categoría.`
            : ''
        } Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default CategoriesPage;
