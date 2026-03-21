import React, { useState, useMemo } from 'react';
import { Plus, Search, Package, ShoppingBag, Coffee, Grid3X3, AlertTriangle, BookOpen, Edit, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, ConfirmModal, Badge } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { ProductModal } from '../../components/modals/ProductModal';
import { useInventoryStore, useRecipesStore } from '../../stores';
import type { Product, ProductTipo } from '../../types';
import { formatCurrency } from '../../utils';

interface ProductsPageProps {}

type TabTipo = 'todos' | ProductTipo;

interface TabDef {
  id: TabTipo;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { id: 'todos', label: 'Todos', icon: <Grid3X3 className="h-4 w-4" /> },
  { id: 'comprado', label: 'Comprados', icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'elaborado', label: 'Elaborados', icon: <Coffee className="h-4 w-4" /> },
  { id: 'combo', label: 'Combos', icon: <Package className="h-4 w-4" /> },
];

const TIPO_LABELS: Record<ProductTipo, string> = {
  comprado: 'Comprado',
  elaborado: 'Elaborado',
  combo: 'Combo',
};

const TIPO_COLORS: Record<ProductTipo, string> = {
  comprado: 'bg-blue-100 text-blue-700',
  elaborado: 'bg-amber-100 text-amber-700',
  combo: 'bg-purple-100 text-purple-700',
};

const getMarginBg = (pct: number) => {
  if (pct >= 60) return 'text-emerald-700 font-semibold';
  if (pct >= 30) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
};

const ProductsPage: React.FC<ProductsPageProps> = () => {
  const { products, categories, brands, locations, deleteProduct } = useInventoryStore();
  const { recetas } = useRecipesStore();

  const [activeTab, setActiveTab] = useState<TabTipo>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recipe map for elaborados
  const recetaMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    recetas.forEach((r) => { m[r.productId] = true; });
    return m;
  }, [recetas]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeTab !== 'todos' && p.tipo !== activeTab) return false;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);

      const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, activeTab, searchQuery, selectedCategory]);

  // Count per tab
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: products.length };
    products.forEach((p) => {
      c[p.tipo] = (c[p.tipo] ?? 0) + 1;
    });
    return c;
  }, [products]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Todas las categorías' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  );

  const handleOpenCreate = () => { setEditingProduct(undefined); setIsProductModalOpen(true); };
  const handleEdit = (p: Product) => { setEditingProduct(p); setIsProductModalOpen(true); };
  const handleDeleteRequest = (p: Product) => setDeletingProduct(p);

  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      deleteProduct(deletingProduct.id);
      toast.success('Producto eliminado', `"${deletingProduct.name}" fue eliminado.`);
      setDeletingProduct(null);
    } catch {
      toast.error('Error', 'No se pudo eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Productos"
          subtitle={`${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''}`}
          actions={
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Nuevo Producto
            </Button>
          }
        />

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm">
          <div className="flex border-b border-coffee-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-coffee-500 text-coffee-900'
                    : 'border-transparent text-coffee-500 hover:text-coffee-700'
                )}
              >
                {tab.icon}
                {tab.label}
                <span className={clsx(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  activeTab === tab.id ? 'bg-coffee-100 text-coffee-700' : 'bg-coffee-50 text-coffee-400'
                )}>
                  {counts[tab.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre, código o código de barras…"
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
          </div>
        </div>

        {/* Table */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <Package className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">Sin productos en esta vista</p>
            <p className="text-sm mt-1">
              {searchQuery || selectedCategory
                ? 'Prueba con otros filtros.'
                : 'Agrega tu primer producto para comenzar.'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Button variant="primary" className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Nuevo Producto
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-coffee-100 text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Precio venta</th>
                  {(activeTab === 'comprado' || activeTab === 'todos') && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Costo</th>
                  )}
                  {(activeTab === 'comprado' || activeTab === 'todos') && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Margen</th>
                  )}
                  {(activeTab === 'comprado' || activeTab === 'todos') && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-coffee-600 uppercase tracking-wider">Stock</th>
                  )}
                  {(activeTab === 'elaborado' || activeTab === 'todos') && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-coffee-600 uppercase tracking-wider">Receta</th>
                  )}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {filteredProducts.map((p) => {
                  const margin =
                    p.costPrice > 0 && p.salePrice > 0
                      ? ((p.salePrice - p.costPrice) / p.salePrice) * 100
                      : null;
                  const tieneReceta = recetaMap[p.id];
                  const recetaData = recetas.find((r) => r.productId === p.id);

                  return (
                    <tr key={p.id} className="hover:bg-coffee-50/50 transition-colors">
                      {/* Producto */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-coffee-100 flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-coffee-400" />
                          </div>
                          <div>
                            <p className="font-medium text-coffee-900">{p.name}</p>
                            <p className="text-xs text-coffee-400 font-mono">{p.code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', TIPO_COLORS[p.tipo])}>
                          {TIPO_LABELS[p.tipo]}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3">
                        <Badge variant="default" size="sm">{p.categoryName || '—'}</Badge>
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-3 text-right font-medium text-coffee-900">
                        {formatCurrency(p.salePrice)}
                      </td>

                      {/* Costo (comprado/todos) */}
                      {(activeTab === 'comprado' || activeTab === 'todos') && (
                        <td className="px-4 py-3 text-right text-coffee-600">
                          {p.tipo === 'comprado'
                            ? formatCurrency(p.costPrice)
                            : p.tipo === 'elaborado' && recetaData
                            ? <span className="text-xs">{formatCurrency(recetaData.costoPorPorcion)}<br/><span className="text-coffee-400">de receta</span></span>
                            : <span className="text-coffee-300">—</span>
                          }
                        </td>
                      )}

                      {/* Margen (comprado/todos) */}
                      {(activeTab === 'comprado' || activeTab === 'todos') && (
                        <td className="px-4 py-3 text-right">
                          {p.tipo === 'elaborado' && recetaData ? (
                            (() => {
                              const m = ((p.salePrice - recetaData.costoPorPorcion) / p.salePrice) * 100;
                              return <span className={getMarginBg(m)}>{m.toFixed(1)}%</span>;
                            })()
                          ) : margin !== null ? (
                            <span className={getMarginBg(margin)}>{margin.toFixed(1)}%</span>
                          ) : (
                            <span className="text-coffee-300">—</span>
                          )}
                        </td>
                      )}

                      {/* Stock (comprado/todos) */}
                      {(activeTab === 'comprado' || activeTab === 'todos') && (
                        <td className="px-4 py-3 text-center">
                          {p.tipo === 'comprado' || p.tipo === 'combo' ? (
                            <span className={clsx(
                              'font-medium',
                              p.stock <= 0 ? 'text-red-600' : p.stock <= p.minStock ? 'text-amber-600' : 'text-coffee-700'
                            )}>
                              {p.stock}
                              {p.stock <= p.minStock && p.stock > 0 && (
                                <span className="text-xs text-coffee-400 block">Mín: {p.minStock}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-coffee-300 text-xs">N/A</span>
                          )}
                        </td>
                      )}

                      {/* Receta (elaborado/todos) */}
                      {(activeTab === 'elaborado' || activeTab === 'todos') && (
                        <td className="px-4 py-3 text-center">
                          {p.tipo === 'elaborado' ? (
                            tieneReceta ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                <BookOpen className="h-3 w-3" /> Con receta
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                <AlertTriangle className="h-3 w-3" /> Sin receta
                              </span>
                            )
                          ) : (
                            <span className="text-coffee-300 text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 rounded transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(p)}
                            className="p-1.5 text-coffee-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        brands={brands}
        locations={locations}
        onSuccess={() => {}}
      />

      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Producto"
        message={`¿Eliminar "${deletingProduct?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default ProductsPage;
