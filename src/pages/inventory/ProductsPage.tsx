import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, ShoppingBag, Edit, Trash2,
  X, TrendingUp, Tag, ChevronRight,
  AlertTriangle, PackageX,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageHeader, PageContainer } from '../../components/layout';
import { Button, Input, Select, ConfirmModal, Badge } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { ProductModal } from '../../components/modals/ProductModal';
import { gql } from '../../lib/graphql';
import { api } from '../../lib/api';
import { GET_COMPRADOS_WITH_CATEGORIES_QUERY, GET_COMPRADO_DETAIL } from '../../lib/queries/products.queries';
import type { Product, Category } from '../../types';
import { formatCurrency } from '../../utils';
import type { ProductDestino } from '../../types';

const DESTINO_OPTIONS = [
  { value: 'sin_destino', label: 'Sin destino' },
  { value: 'barra', label: 'Barra' },
  { value: 'cocina', label: 'Cocina' },
];

const destinoBadge = (d: ProductDestino | undefined) => {
  if (d === 'barra') return { label: 'Barra', cls: 'bg-blue-100 text-blue-700' };
  if (d === 'cocina') return { label: 'Cocina', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Sin destino', cls: 'bg-coffee-100 text-coffee-500' };
};

// ── Constantes ─────────────────────────────────────────────────────────────────

const calcMargin = (costPrice: number, salePrice: number): number | null =>
  costPrice > 0 && salePrice > 0
    ? ((salePrice - costPrice) / salePrice) * 100
    : null;

const getMarginColor = (pct: number) => {
  if (pct >= 60) return 'text-emerald-700 font-semibold';
  if (pct >= 30) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
};

// ── GraphQL response types ─────────────────────────────────────────────────────

interface CategoriaNode {
  id: number;
  nombre: string;
  estado: boolean;
  color: string;
}

interface CompradoListNode {
  codigo_barra: string;
  unidad_medida: string;
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
    categoria: CategoriaNode;
    detalles: { cantidad: number; opcional: boolean }[];
  };
}

interface CompradosWithCategoriesResponse {
  comprados: { nodes: CompradoListNode[] };
  categorias: { nodes: CategoriaNode[] };
}

interface CompradoDetailResponse {
  comprados: {
    nodes: {
      codigo_barra: string;
      unidad_medida: string;
      marca: string;
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

// ── Mapper ─────────────────────────────────────────────────────────────────────

function mapNode(node: CompradoListNode): Product {
  const cat = node.producto.categoria;
  return {
    id: String(node.producto.id),
    code: String(node.producto.id),
    name: node.producto.nombre,
    description: node.producto.descripcion,
    tipo: 'comprado',
    categoryId: cat ? String(cat.id) : '',
    categoryName: cat ? cat.nombre : '',
    unit: node.unidad_medida,
    costPrice: node.costo_compra,
    salePrice: node.producto.precio,
    stock: node.stock_actual,
    minStock: node.stock_minimo,
    maxStock: 0,
    barcode: node.codigo_barra,
    variations: [],
    hasVariations: false,
    isActive: node.disponible,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Componente ─────────────────────────────────────────────────────────────────

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [isLoadingEditDetail, setIsLoadingEditDetail] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailDestino, setDetailDestino] = useState<ProductDestino>('sin_destino');

  const isRefreshing = useRef(false);

  // ── Carga de datos ─────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setIsLoading(true);
    try {
      const data = await gql<CompradosWithCategoriesResponse>(GET_COMPRADOS_WITH_CATEGORIES_QUERY);
      setCategories(
        data.categorias.nodes.map((n) => ({
          id: String(n.id),
          name: n.nombre,
          description: '',
          isActive: n.estado,
          color: n.color,
          sortOrder: 0,
          productCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      setProducts(data.comprados.nodes.map(mapNode));
    } catch (err) {
      console.error('Error loading comprados:', err);
      toast.error('Error al cargar', 'No se konnten cargar los productos. Intenta de nuevo.');
    } finally {
      isRefreshing.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || p.categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const kpis = useMemo(() => {
    const sinStock = products.filter((p) => p.stock <= 0).length;
    const stockBajo = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const margins = products
      .map((p) => calcMargin(p.costPrice, p.salePrice))
      .filter((m): m is number => m !== null);
    const avgMargin = margins.length > 0
      ? margins.reduce((s, m) => s + m, 0) / margins.length
      : null;
    return { total: products.length, sinStock, stockBajo, avgMargin };
  }, [products]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Todas las categorías' },
      ...categories.map((c) => ({ value: c.name, label: c.name })),
    ],
    [categories],
  );

  // ── Acciones ───────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

  const handleEdit = async (p: Product) => {
    const catId = categories.find((c) => c.name === p.categoryName)?.id || p.categoryId || '';
    setEditingProduct({ ...p, categoryId: catId });
    setIsLoadingEditDetail(true);
    setIsProductModalOpen(true);
    try {
      const res = await gql<CompradoDetailResponse>(GET_COMPRADO_DETAIL, { id: Number(p.id) });
      const d = res.comprados.nodes[0];
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
        });
      }
    } catch {
      // mantiene los datos básicos ya seteados
    } finally {
      setIsLoadingEditDetail(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Producto/${deletingProduct.id}`);
      toast.success('Producto eliminado', `"${deletingProduct.name}" fue eliminado.`);
      setDeletingProduct(null);
      await loadAll();
    } catch {
      toast.error('Error', 'No se pudo eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Detalle (modal móvil) ──────────────────────────────────────────────────


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Comprados"
          subtitle={`${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          actions={
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate} className="w-full sm:w-auto">
              Nuevo Producto
            </Button>
          }
        />

        {/* KPIs */}
        {!isLoading && products.length > 0 && (
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
                  {['Producto', 'Categoría', 'Destino', 'Precio venta', 'Costo', 'Margen', 'Stock', ''].map((h) => (
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
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm py-16 flex flex-col items-center justify-center text-coffee-500">
            <ShoppingBag className="h-12 w-12 mb-3 text-coffee-300" />
            <p className="text-lg font-medium">Sin productos comprados</p>
            <p className="text-sm mt-1">
              {searchQuery || selectedCategory ? 'Prueba con otros filtros.' : 'Agrega tu primer producto para comenzar.'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Button variant="primary" className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
                Nuevo Producto
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">

            {/* ── Mobile: tarjetas ─────────────────────────────────────────── */}
            <div className="sm:hidden divide-y divide-coffee-50">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setDetailProduct(p); setDetailDestino(p.destino ?? 'sin_destino'); }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-coffee-50/60 active:bg-coffee-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="h-5 w-5 text-blue-400" />
                  </div>
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

            {/* ── Desktop: tabla ───────────────────────────────────────────── */}
            <table className="hidden sm:table min-w-full divide-y divide-coffee-100 text-sm">
              <thead className="bg-coffee-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-coffee-600 uppercase tracking-wider">Destino</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Precio venta</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Costo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-coffee-600 uppercase tracking-wider">Margen</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-coffee-600 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {filtered.map((p) => {
                  const margin = calcMargin(p.costPrice, p.salePrice);
                  return (
                    <tr key={p.id} className="hover:bg-coffee-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="h-4 w-4 text-blue-400" />
                          </div>
                          <p className="font-medium text-coffee-900">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" size="sm">{p.categoryName || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {(() => { const d = destinoBadge(p.destino); return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', d.cls)}>{d.label}</span>; })()}
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
        )}
      </PageContainer>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSuccess={() => { loadAll(); }}
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

      {/* ── Modal de detalle ───────────────────────────────────────────────── */}
      {detailProduct && (() => {
        const p = detailProduct;
        const margin = calcMargin(p.costPrice, p.salePrice);
        const ganancia = p.salePrice - p.costPrice;
        const marginBg = margin === null ? 'bg-coffee-50 text-coffee-500'
          : margin >= 60 ? 'bg-emerald-50 text-emerald-800'
          : margin >= 30 ? 'bg-amber-50 text-amber-800'
          : 'bg-red-50 text-red-700';
        const stockStatus = p.stock <= 0
          ? { label: 'Agotado',    bg: 'bg-red-100 text-red-700',     dot: 'bg-red-500' }
          : p.stock <= p.minStock
          ? { label: 'Stock bajo', bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
          : { label: 'Normal',     bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailProduct(null)} />
            <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

              {/* Header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-coffee-900 text-base leading-tight truncate">{p.name}</h2>
                      {p.categoryName && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs bg-coffee-100 text-coffee-600 px-2 py-0.5 rounded-full font-medium">
                          <Tag className="h-3 w-3" /> {p.categoryName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailProduct(null)}
                    className="p-1.5 rounded-lg hover:bg-coffee-100 transition-colors text-coffee-400 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-4">

                {/* Precios */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">Precios</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-coffee-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-coffee-400 mb-1">Venta</p>
                      <p className="font-bold text-coffee-900 tabular-nums text-sm">{formatCurrency(p.salePrice)}</p>
                    </div>
                    <div className="bg-coffee-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-coffee-400 mb-1">Costo</p>
                      <p className="font-bold text-coffee-900 tabular-nums text-sm">{formatCurrency(p.costPrice)}</p>
                    </div>
                    <div className={clsx('rounded-xl p-3 text-center', marginBg)}>
                      <p className="text-xs opacity-70 mb-1">Margen</p>
                      <p className="font-bold tabular-nums text-sm">
                        {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                  </div>
                  {ganancia > 0 && (
                    <p className="text-xs text-coffee-400 mt-2 text-center">
                      Ganancia por unidad: <span className="font-semibold text-coffee-700">{formatCurrency(ganancia)}</span>
                    </p>
                  )}
                </div>

                {/* Destino */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">Destino</p>
                  <Select
                    options={DESTINO_OPTIONS}
                    value={detailDestino}
                    onChange={(v) => setDetailDestino(v as ProductDestino)}
                  />
                </div>

                {/* Stock */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">Inventario</p>
                  <div className="bg-coffee-50 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className={clsx(
                        'text-3xl font-bold tabular-nums leading-none',
                        p.stock <= 0 ? 'text-red-600'
                        : p.stock <= p.minStock ? 'text-amber-600'
                        : 'text-coffee-900',
                      )}>
                        {p.stock}
                      </p>
                      <p className="text-xs text-coffee-400 mt-1">
                        unidades en stock
                        {p.minStock > 0 && ` · mín. ${p.minStock}`}
                      </p>
                    </div>
                    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full', stockStatus.bg)}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full', stockStatus.dot)} />
                      {stockStatus.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-coffee-100 flex gap-2">
                <button
                  onClick={() => { setDetailProduct(null); setDeletingProduct(p); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
                <button
                  onClick={() => { setDetailProduct(null); handleEdit(p); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-coffee-600 text-white hover:bg-coffee-700 transition-colors text-sm font-medium"
                >
                  <Edit className="h-4 w-4" /> Editar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </MainLayout>
  );
};

export default ProductsPage;
