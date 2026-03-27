import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Package, ShoppingBag, Coffee, Grid3X3, AlertTriangle, BookOpen, Edit, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, ConfirmModal, Badge } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { ProductModal } from '../../components/modals/ProductModal';
import { gql } from '../../lib/graphql';
import { api } from '../../lib/api';
import type { Product, Category, Brand, Location, ProductTipo } from '../../types';
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

// ── GraphQL response types ─────────────────────────────────────────────────────

interface ProductNode {
  id: number;
  nombre: string;
  tipo: string;
  categoriaNombre: string;
  precioVenta: number;
  costo: number;
  stock: number;
  recetaName: string | null;
}

interface ProductsGqlResponse {
  productos: {
    nodes: ProductNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

interface CategoriaNode {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
  color: string;
  cantidad: number;
}

interface CategoriasGqlResponse {
  categorias: { nodes: CategoriaNode[] };
}

const TIPO_MAP: Record<string, ProductTipo> = {
  Comprado: 'comprado',
  Elaborado: 'elaborado',
  Combos: 'combo',
};

function mapNode(node: ProductNode): Product {
  return {
    id: String(node.id),
    code: String(node.id),
    name: node.nombre,
    description: '',
    tipo: TIPO_MAP[node.tipo] ?? 'comprado',
    categoryId: '',
    categoryName: node.categoriaNombre,
    unit: 'unidad',
    costPrice: node.costo,
    salePrice: node.precioVenta,
    stock: node.stock,
    minStock: 0,
    maxStock: 0,
    barcode: '',
    variations: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const ProductsPage: React.FC<ProductsPageProps> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recetaApiMap, setRecetaApiMap] = useState<Record<string, boolean>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabTipo>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProducts = useCallback(async (cursor?: string) => {
    const cursorArg = cursor ? `, after: "${cursor}"` : '';
    const data = await gql<ProductsGqlResponse>(`
      query {
        productos(first: 50${cursorArg}) {
          nodes {
            id
            nombre
            tipo
            categoriaNombre
            precioVenta
            costo
            stock
            recetaName
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `);
    const nodes = data.productos.nodes.map(mapNode);
    const recMap: Record<string, boolean> = {};
    data.productos.nodes.forEach((n) => { if (n.recetaName) recMap[String(n.id)] = true; });
    if (cursor) {
      setProducts((prev) => [...prev, ...nodes]);
      setRecetaApiMap((prev) => ({ ...prev, ...recMap }));
    } else {
      setProducts(nodes);
      setRecetaApiMap(recMap);
    }
    setHasNextPage(data.productos.pageInfo.hasNextPage);
    setEndCursor(data.productos.pageInfo.endCursor);
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await gql<CategoriasGqlResponse>(`
      query {
        categorias {
          nodes { id nombre descripcion estado color cantidad }
        }
      }
    `);
    const mapped: Category[] = data.categorias.nodes.map((n) => ({
      id: String(n.id),
      name: n.nombre,
      description: n.descripcion,
      isActive: n.estado,
      color: n.color,
      productCount: n.cantidad,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    setCategories(mapped);
  }, []);

  useEffect(() => {
    Promise.all([loadProducts(), loadCategories()]).finally(() => setIsLoadingProducts(false));
  }, []);

  const handleLoadMore = async () => {
    if (!endCursor) return;
    setIsLoadingMore(true);
    await loadProducts(endCursor).finally(() => setIsLoadingMore(false));
  };


  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeTab !== 'todos' && p.tipo !== activeTab) return false;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);

      const matchesCategory = !selectedCategory || p.categoryName === selectedCategory;

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
      ...categories.map((c) => ({ value: c.name, label: c.name })),
    ],
    [categories]
  );

  const handleOpenCreate = () => { setEditingProduct(undefined); setIsProductModalOpen(true); };
  const handleEdit = (p: Product) => {
    // Resolve categoryId from categoryName if missing
    const resolved = !p.categoryId
      ? { ...p, categoryId: categories.find(c => c.name === p.categoryName)?.id || '' }
      : p;
    setEditingProduct(resolved);
    setIsProductModalOpen(true);
  };
  const handleDeleteRequest = (p: Product) => setDeletingProduct(p);

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const tipo = deletingProduct.tipo;
      const endpoint = tipo === 'comprado' ? '/Comprado' : tipo === 'elaborado' ? '/Elaborado' : '/Combo';
      await api.delete(`${endpoint}/${deletingProduct.id}`);
      toast.success('Producto eliminado', `"${deletingProduct.name}" fue eliminado.`);
      setDeletingProduct(null);
      await loadProducts();
    } catch {
      toast.error('Error', 'No se pudo eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Brands and locations are empty since we fetch directly; pass empty arrays
  const emptyBrands: Brand[] = [];
  const emptyLocations: Location[] = [];

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
        {isLoadingProducts ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-coffee-100 text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  {['Producto', 'Tipo', 'Categoría', 'Precio venta', 'Costo', 'Stock', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-coffee-100" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-32 bg-coffee-200 rounded" />
                          <div className="h-2.5 w-16 bg-coffee-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-coffee-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-coffee-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-14 bg-coffee-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-14 bg-coffee-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-8 bg-coffee-100 rounded mx-auto" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-12 bg-coffee-100 rounded ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredProducts.length === 0 ? (
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
                  const tieneReceta = recetaApiMap[p.id] ?? false;

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
                            : <span className="text-coffee-300">—</span>
                          }
                        </td>
                      )}

                      {/* Margen (comprado/todos) */}
                      {(activeTab === 'comprado' || activeTab === 'todos') && (
                        <td className="px-4 py-3 text-right">
                          {margin !== null ? (
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

            {hasNextPage && (
              <div className="px-4 py-3 border-t border-coffee-100 flex justify-center">
                <Button variant="ghost" onClick={handleLoadMore} isLoading={isLoadingMore}>
                  Cargar más productos
                </Button>
              </div>
            )}
          </div>
        )}
      </PageContainer>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        brands={emptyBrands}
        locations={emptyLocations}
        onSuccess={() => { loadProducts(); }}
        compradoOnly={!editingProduct}
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
