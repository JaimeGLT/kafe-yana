import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, ShoppingBag, Edit, Trash2,
  TrendingUp, ChevronRight, AlertTriangle, PackageX,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout, PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, ConfirmModal, Badge, SkeletonKpiCard } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { toast } from '../../components/ui/Toast';
import { ProductModal } from '../../components/modals/ProductModal';
import { ProductDetailModal } from '../../components/modals/ProductDetailModal';
import { gql } from '../../lib/graphql';
import { api } from '../../lib/api';
import { ProductImage } from '../../components/ui/ProductImage';
import { GET_COMPRADO_DETAIL } from '../../lib/queries/products.queries';
import { formatCurrency } from '../../utils';
import { useProductsPage } from '../../hooks/useProductsPage';
import { usePagination } from '../../hooks/usePagination';
import type { Product } from '../../types';
import type { ProductDestino } from '../../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const destinoBadge = (d: ProductDestino | undefined) => {
  if (d === 'barra') return { label: 'Barra', cls: 'bg-blue-100 text-blue-700' };
  if (d === 'cocina') return { label: 'Cocina', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Sin destino', cls: 'bg-coffee-100 text-coffee-500' };
};

const calcMargin = (costPrice: number, salePrice: number): number | null =>
  costPrice > 0 && salePrice > 0
    ? ((salePrice - costPrice) / salePrice) * 100
    : null;

const getMarginColor = (pct: number) => {
  if (pct >= 60) return 'text-emerald-700 font-semibold';
  if (pct >= 30) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompradoDetailResponse {
  comprados: {
    items: {
      codigo_barra: string;
      unidad_medida: string;
      ubicacion: string;
      costo_compra: number;
      stock_actual: number;
      stock_minimo: number;
      disponible: boolean;
      producto: {
        id: number;
        nombre: string;
        descripcion: string;
        precio: number;
        tipo: string;
        categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null;
        detalles: { cantidad: number; opcional: boolean }[];
      };
    }[];
  };
}

// ── Componente ─────────────────────────────────────────────────────────────────

const ProductsPage: React.FC = () => {
  const { page, pageSize, search, debouncedSearch, setPage, setPageSize, setSearch, resetPage } = usePagination({ pageSize: 15 });
  const [category, setCategory] = useState('');

  const { products, categories, totalCount, isLoading, refresh } = useProductsPage({
    page,
    pageSize,
    search: debouncedSearch,
    category,
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isLoadingEditDetail, setIsLoadingEditDetail] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // ── Filtros ──────────────────────────────────────────────────────────────────

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Todas las categorías' },
      ...categories.map((c) => ({ value: c.name, label: c.name })),
    ],
    [categories],
  );

  const kpis = useMemo(() => {
    const sinStock = products.filter((p) => p.stock <= 0).length;
    const stockBajo = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const margins = products
      .map((p) => calcMargin(p.costPrice, p.salePrice))
      .filter((m): m is number => m !== null);
    const avgMargin = margins.length > 0
      ? margins.reduce((s, m) => s + m, 0) / margins.length
      : null;
    return { total: totalCount, sinStock, stockBajo, avgMargin };
  }, [products, totalCount]);

  // ── Acciones ─────────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

  const handleEdit = useCallback(async (p: Product) => {
    const catId = categories.find((c) => c.name === p.categoryName)?.id || p.categoryId || '';
    setEditingProduct({ ...p, categoryId: catId });
    setIsLoadingEditDetail(true);
    setIsProductModalOpen(true);
    try {
      const res = await gql<CompradoDetailResponse>(GET_COMPRADO_DETAIL, { id: Number(p.id) });
      const d = res.comprados.items[0];
      if (d) {
        const detailCatId = d.producto.categoria ? String(d.producto.categoria.id) : catId;
        setEditingProduct({
          ...p,
          categoryId: detailCatId,
          name: d.producto.nombre,
          description: d.producto.descripcion,
          barcode: d.codigo_barra,
          unit: d.unidad_medida,
          costPrice: d.costo_compra,
          salePrice: d.producto.precio,
          stock: d.stock_actual,
          minStock: d.stock_minimo,
          isActive: d.disponible,
          locationId: d.ubicacion || undefined,
        });
      }
    } catch {
      // mantiene los datos básicos ya seteados
    } finally {
      setIsLoadingEditDetail(false);
    }
  }, [categories]);

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Producto/${deletingProduct.id}`);
      toast.success('Producto eliminado', `"${deletingProduct.name}" fue eliminado.`);
      setDeletingProduct(null);
      await refresh();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Comprados"
          subtitle={`${totalCount} producto${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}`}
          actions={
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate} className="w-full sm:w-auto">
              Nuevo Producto
            </Button>
          }
        />

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
        ) : products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-3 py-3 sm:px-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 flex-shrink-0">
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-coffee-400 truncate">Total</p>
                <p className="text-base sm:text-lg font-bold text-coffee-900">{kpis.total}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-3 py-3 sm:px-4 flex items-center gap-2 sm:gap-3">
              <div className={clsx('p-1.5 sm:p-2 rounded-lg flex-shrink-0', kpis.sinStock > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                <PackageX className={clsx('h-4 w-4', kpis.sinStock > 0 ? 'text-red-500' : 'text-emerald-500')} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-coffee-400 truncate">Sin stock</p>
                <p className={clsx('text-base sm:text-lg font-bold', kpis.sinStock > 0 ? 'text-red-600' : 'text-coffee-900')}>
                  {kpis.sinStock}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-3 py-3 sm:px-4 flex items-center gap-2 sm:gap-3">
              <div className={clsx('p-1.5 sm:p-2 rounded-lg flex-shrink-0', kpis.stockBajo > 0 ? 'bg-amber-50' : 'bg-emerald-50')}>
                <AlertTriangle className={clsx('h-4 w-4', kpis.stockBajo > 0 ? 'text-amber-500' : 'text-emerald-500')} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-coffee-400 truncate">Stock bajo</p>
                <p className={clsx('text-base sm:text-lg font-bold', kpis.stockBajo > 0 ? 'text-amber-600' : 'text-coffee-900')}>
                  {kpis.stockBajo}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-coffee-100 shadow-sm px-3 py-3 sm:px-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-coffee-400 truncate">Margen prom.</p>
                <p className={clsx(
                  'text-base sm:text-lg font-bold',
                  kpis.avgMargin === null ? 'text-coffee-400'
                  : kpis.avgMargin >= 60 ? 'text-emerald-700'
                  : kpis.avgMargin >= 30 ? 'text-amber-600'
                  : 'text-red-600',
                )}>
                  {kpis.avgMargin !== null ? `${kpis.avgMargin.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="sm:w-52">
            <Select
              options={categoryOptions}
              value={category}
              onChange={(v) => { setCategory(v); resetPage(); }}
              placeholder="Todas las categorías"
            />
          </div>
        </div>

        {/* Tabla / estados */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden animate-pulse">
            <div className="sm:hidden divide-y divide-coffee-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-coffee-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-coffee-200 rounded" />
                    <div className="h-3 w-24 bg-coffee-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden sm:table min-w-full divide-y divide-coffee-100 text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  {['Producto', 'Categoría', 'Destino', 'Unidad', 'Cód. SIN', 'Precio venta', 'Costo', 'Margen', 'Stock', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-coffee-100" />
                        <div className="h-3 w-32 bg-coffee-200 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-5 w-20 bg-coffee-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-coffee-100 rounded-full" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-14 bg-coffee-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-coffee-100 rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-14 bg-coffee-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-14 bg-coffee-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-10 bg-coffee-100 rounded ml-auto" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-8 bg-coffee-100 rounded mx-auto" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-12 bg-coffee-100 rounded ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <ShoppingBag className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">Sin productos comprados</p>
            <p className="text-sm mt-1">
              {search || category ? 'Prueba con otros filtros.' : 'Agrega tu primer producto para comenzar.'}
            </p>
            {!search && !category && (
              <Button variant="primary" className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Nuevo Producto
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-coffee-50">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDetailProduct(p)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-coffee-50/60 active:bg-coffee-100 transition-colors"
                >
                  <ProductImage src={p.image} tipo="comprado" size="sm" className="!w-10 !h-10" rounded="rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-coffee-900 truncate text-sm">{p.name}</p>
                    <p className="text-xs text-coffee-400 mt-0.5">{p.categoryName || '—'}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-semibold text-coffee-900 text-sm">{formatCurrency(p.salePrice)}</p>
                    <p className={clsx(
                      'text-xs mt-0.5',
                      p.stock <= 0 ? 'text-red-500' : p.stock <= p.minStock ? 'text-amber-500' : 'text-coffee-400',
                    )}>
                      {p.stock} en stock
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-coffee-300 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-coffee-100 text-sm">
                <thead className="bg-coffee-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Destino</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Unidad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Cód. SIN</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Precio venta</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Costo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Margen</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-coffee-600 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50">
                  {products.map((p) => {
                    const margin = calcMargin(p.costPrice, p.salePrice);
                    return (
                      <tr key={p.id} className="hover:bg-coffee-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProductImage src={p.image} tipo="comprado" size="sm" rounded="rounded-lg" />
                            <p className="font-medium text-coffee-900">{p.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default" size="sm">{p.categoryName || '—'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {(() => { const d = destinoBadge(p.destino); return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', d.cls)}>{d.label}</span>; })()}
                        </td>
                        <td className="px-4 py-3 text-coffee-700 text-sm">
                          {p.unit || '—'}
                        </td>
                        <td className="px-4 py-3 text-coffee-700 text-sm font-mono">
                          {p.codigoSin || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-coffee-900">
                          {formatCurrency(p.salePrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-coffee-600">
                          {formatCurrency(p.costPrice)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {margin !== null
                            ? <span className={getMarginColor(margin)}>{margin.toFixed(1)}%</span>
                            : <span className="text-coffee-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx(
                            'font-medium',
                            p.stock <= 0 ? 'text-red-600' : p.stock <= p.minStock ? 'text-amber-600' : 'text-coffee-700',
                          )}>
                            {p.stock}
                            {p.stock > 0 && p.stock <= p.minStock && (
                              <span className="text-xs text-coffee-400 block">Mín: {p.minStock}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1.5 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 rounded transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingProduct(p)}
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

            <Pagination
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isLoading={isLoading}
            />
          </div>
        )}
      </PageContainer>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSuccess={refresh}
        isLoadingDetail={isLoadingEditDetail}
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

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={(p) => { setDetailProduct(null); handleEdit(p); }}
          onDelete={(p) => { setDetailProduct(null); setDeletingProduct(p); }}
        />
      )}
    </MainLayout>
  );
};

export default ProductsPage;
