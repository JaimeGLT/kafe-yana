import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { gql } from '../../lib/graphql';
import { api } from '../../lib/api';
import { GET_ALL_INSUMOS } from '../../lib/queries/insumos.queries';
import { GET_ALL_ELABORADOS } from '../../lib/queries/elaborados.queries';
import { mapInsumo } from '../../lib/mappers/insumos.mappers';
import { mapElaborado, mapRecetaFromElaborado } from '../../lib/mappers/elaborados.mappers';
import type { InsumosResponse, ElaboradosResponse } from '../../types/graphql';
import {
  Plus,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  TrendingUp,
  Search,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, Select } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/Modal';
import { RecetaModal } from '../../components/modals/RecetaModal';
import { EditElaboradoModal } from '../../components/modals/EditElaboradoModal';
import { ProductCard } from '../../components/elaborados/ProductCard';
import { ElaboradoWizard } from '../../components/elaborados/ElaboradoWizard';
import type { Product, Receta, Insumo } from '../../types';

// ── Mock elaborados en_lote — se eliminan cuando el backend exponga tipoPreparacion ──

const MOCK_EN_LOTE_IDS = new Set(['-1', '-2', '-3']);

const MOCK_STOCK_ACTUAL: Record<string, number> = {
  '-1': 6,
  '-2': 12,
  '-3': 0,
};

const MOCK_ELABORADOS_EN_LOTE: Product[] = [
  {
    id: '-1', code: '-1', name: 'Torta de chocolate', description: 'Preparada en lote, por porciones.',
    tipo: 'elaborado', categoryId: '', categoryName: 'Repostería',
    unit: 'porcion', costPrice: 0, salePrice: 25, stock: 6,
    minStock: 0, maxStock: 0, variations: [], hasVariations: false,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: '-2', code: '-2', name: 'Cheesecake de maracuyá', description: 'Elaborado en lote cada mañana.',
    tipo: 'elaborado', categoryId: '', categoryName: 'Repostería',
    unit: 'porcion', costPrice: 0, salePrice: 18, stock: 12,
    minStock: 0, maxStock: 0, variations: [], hasVariations: false,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: '-3', code: '-3', name: 'Brownie de café (sin stock)', description: 'Sin producción registrada hoy.',
    tipo: 'elaborado', categoryId: '', categoryName: 'Repostería',
    unit: 'unidad', costPrice: 0, salePrice: 12, stock: 4,
    minStock: 0, maxStock: 0, variations: [], hasVariations: false,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  },
];

const MOCK_RECETAS_EN_LOTE: Receta[] = [
  {
    id: 'r-1', productId: '-1', productName: 'Torta de chocolate',
    nombre: 'Receta torta choc.', porcionesBase: 1,
    ingredientes: [
      { id: 'ri-1', insumoId: 'mock-1', insumoName: 'Harina', unidadMinima: 'g', quantity: 200, merma: 5, unitCost: 0.02, subtotal: 4 },
      { id: 'ri-2', insumoId: 'mock-2', insumoName: 'Cacao', unidadMinima: 'g', quantity: 80, merma: 0, unitCost: 0.08, subtotal: 6.4 },
      { id: 'ri-3', insumoId: 'mock-3', insumoName: 'Mantequilla', unidadMinima: 'g', quantity: 100, merma: 2, unitCost: 0.022, subtotal: 2.2 },
    ],
    costoTotal: 12.6, costoPorPorcion: 12.6,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 'r-2', productId: '-2', productName: 'Cheesecake de maracuyá',
    nombre: 'Receta cheesecake', porcionesBase: 1,
    ingredientes: [
      { id: 'ri-4', insumoId: 'mock-4', insumoName: 'Queso crema', unidadMinima: 'g', quantity: 150, merma: 0, unitCost: 0.03, subtotal: 4.5 },
      { id: 'ri-5', insumoId: 'mock-5', insumoName: 'Maracuyá', unidadMinima: 'ml', quantity: 80, merma: 10, unitCost: 0.025, subtotal: 2 },
      { id: 'ri-6', insumoId: 'mock-6', insumoName: 'Galleta base', unidadMinima: 'g', quantity: 60, merma: 0, unitCost: 0.01, subtotal: 0.6 },
    ],
    costoTotal: 7.1, costoPorPorcion: 7.1,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  },
  // Brownie sin receta (intencionalmente sin entrada aquí para mostrar estado "Sin receta")
];

// ── Main page ─────────────────────────────────────────────────────────────────

const ElaboradosPage: React.FC = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [elaborados, setElaborados] = useState<Product[]>([]);
  const [rawCategories, setRawCategories] = useState<{ id: string; nombre: string; estado: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getRecetaByProductId = useCallback((productId: string) => {
    return recetas.find((r: Receta) => r.productId === productId);
  }, [recetas]);

  const getElaboradoAvailability = useCallback((productId: string) => {
    return elaborados.find((p) => p.id === productId)?.stock ?? 0;
  }, [elaborados]);

  const addReceta = useCallback(async (recetaData: { productId: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number }[]; notas?: string }, _productName: string) => {
    try {
      await api.post('/Receta', {
        nombre: '',
        nota: recetaData.notas ?? '',
        porciones: recetaData.porcionesBase,
        id_Elaborado: Number(recetaData.productId),
        detalles: recetaData.ingredientes.map((ing) => ({
          cantidad: ing.quantity,
          merma: ing.merma,
          subTotal: 0,
          id_insumo: Number(ing.insumoId),
        })),
      });
      await loadElaborados();
    } catch (error) {
      console.error('Error adding receta:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    gql<InsumosResponse>(GET_ALL_INSUMOS)
      .then((data) => setInsumos(data.insumos.nodes.map(mapInsumo)))
      .catch((err) => console.error('Error loading insumos:', err));
  }, []);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recetaModal, setRecetaModal] = useState<{ isOpen: boolean; product?: Product; receta?: Receta }>({
    isOpen: false,
  });

  interface CatNode { id: number; nombre: string; estado: boolean; }
  interface CatsResponse { categorias: { nodes: CatNode[] }; }

  const loadElaborados = useCallback(async () => {
    const data = await gql<ElaboradosResponse>(GET_ALL_ELABORADOS);
    setElaborados([...MOCK_ELABORADOS_EN_LOTE, ...data.elaborados.nodes.map(mapElaborado)]);
    setRecetas([
      ...MOCK_RECETAS_EN_LOTE,
      ...data.elaborados.nodes
        .map(mapRecetaFromElaborado)
        .filter((r): r is Receta => r !== null),
    ]);
  }, []);

  useEffect(() => {
    Promise.all([
      gql<CatsResponse>(`query { categorias { nodes { id nombre estado } } }`),
      loadElaborados(),
    ])
      .then(([catsData]) => {
        const cats = catsData.categorias.nodes.map((n) => ({ id: String(n.id), nombre: n.nombre, estado: n.estado }));
        setRawCategories(cats);
      })
      .catch(() => {/* silencioso */})
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(
    () => rawCategories.filter((c) => c.estado).map((c) => ({ value: c.id, label: c.nombre })),
    [rawCategories]
  );


  const filtered = useMemo(() => {
    let list = elaborados;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q));
    }
    if (filterStatus === 'con_receta') list = list.filter((p) => !!getRecetaByProductId(p.id));
    if (filterStatus === 'sin_receta') list = list.filter((p) => !getRecetaByProductId(p.id));
    if (filterStatus === 'sin_stock') list = list.filter((p) => getElaboradoAvailability(p.id) === 0);
    return list;
  }, [elaborados, search, filterStatus, recetas, getRecetaByProductId, getElaboradoAvailability]);

  // KPIs
  const sinReceta = elaborados.filter((p) => !getRecetaByProductId(p.id)).length;
  const conReceta = elaborados.filter((p) => !!getRecetaByProductId(p.id));
  const avgMargen = useMemo(() => {
    const valid = conReceta.filter((p) => {
      const r = getRecetaByProductId(p.id);
      return r && p.salePrice > 0;
    });
    if (valid.length === 0) return null;
    const sum = valid.reduce((s, p) => {
      const r = getRecetaByProductId(p.id)!;
      return s + ((p.salePrice - r.costoPorPorcion) / p.salePrice) * 100;
    }, 0);
    return sum / valid.length;
  }, [conReceta, recetas]);

  const sinStock = elaborados.filter((p) => getElaboradoAvailability(p.id) === 0).length;

  const handleDelete = useCallback(async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Producto/${deletingProduct.id}`);
      setElaborados((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
    } catch (error) {
      console.error('Error eliminando elaborado:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingProduct]);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Productos Elaborados"
          subtitle="Productos que se preparan con ingredientes según una receta"
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsWizardOpen(true)}
              className="w-full sm:w-auto"
            >
              Nuevo producto elaborado
            </Button>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy={isLoading}>
          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 flex-shrink-0">
              <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Total</p>
              <p className="text-base sm:text-xl font-bold text-coffee-900">{elaborados.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={clsx('p-1.5 sm:p-2 rounded-lg flex-shrink-0', sinReceta > 0 ? 'bg-amber-50' : 'bg-emerald-50')}>
              {sinReceta > 0
                ? <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                : <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Sin receta</p>
              <p className={clsx('text-base sm:text-xl font-bold', sinReceta > 0 ? 'text-amber-700' : 'text-coffee-900')}>
                {sinReceta}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Margen prom.</p>
              <p className={clsx('text-base sm:text-xl font-bold', avgMargen === null ? 'text-coffee-400' : avgMargen >= 30 ? 'text-emerald-700' : 'text-red-600')}>
                {avgMargen !== null ? `${avgMargen.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={clsx('p-1.5 sm:p-2 rounded-lg flex-shrink-0', sinStock > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
              <Layers className={clsx('h-4 w-4 sm:h-5 sm:w-5', sinStock > 0 ? 'text-red-600' : 'text-emerald-600')} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Sin stock</p>
              <p className={clsx('text-base sm:text-xl font-bold', sinStock > 0 ? 'text-red-700' : 'text-coffee-900')}>
                {sinStock}
              </p>
            </div>
          </div>
        </div>

        {/* Warning banner */}
        {sinReceta > 0 && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{sinReceta} producto{sinReceta !== 1 ? 's' : ''}</strong> no {sinReceta !== 1 ? 'tienen' : 'tiene'} receta asignada. El sistema no podrá descontar insumos al vender.
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="sm:w-52">
            <Select
              value={filterStatus}
              onChange={(v) => setFilterStatus(v)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'con_receta', label: 'Con receta' },
                { value: 'sin_receta', label: 'Sin receta' },
                { value: 'sin_stock', label: 'Sin stock disponible' },
              ]}
            />
          </div>
        </div>

        {/* Empty state / loading */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-1 w-full bg-coffee-200" />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-4 w-32 bg-coffee-200 rounded" />
                    <div className="h-4 w-14 bg-coffee-200 rounded" />
                  </div>
                  <div className="h-3 w-20 bg-coffee-100 rounded" />
                  <div className="h-3 w-full bg-coffee-100 rounded" />
                  <div className="h-3 w-2/3 bg-coffee-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : elaborados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-coffee-200">
            <FlaskConical className="h-12 w-12 text-coffee-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-coffee-700 mb-1">Sin productos elaborados</h3>
            <p className="text-sm text-coffee-400 mb-6">
              Los productos elaborados son preparados con ingredientes según una receta.<br />
              El sistema descuenta automáticamente los insumos al vender.
            </p>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsWizardOpen(true)}>
              Crear primer producto elaborado
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-coffee-400 text-sm">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-coffee-200" />
            No hay productos que coincidan con los filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product) => {
              const receta = getRecetaByProductId(product.id);
              const portions = getElaboradoAvailability(product.id);
              const tipoPreparacion = MOCK_EN_LOTE_IDS.has(product.id) ? 'en_lote' as const : 'al_momento' as const;
              const stockActual = MOCK_EN_LOTE_IDS.has(product.id) ? MOCK_STOCK_ACTUAL[product.id] : undefined;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  receta={receta}
                  portionsAvailable={portions}
                  tipoPreparacion={tipoPreparacion}
                  stockActual={stockActual}
                  onEditProduct={(p) => setEditingProduct(p)}
                  onManageReceta={(p) => {
                    const r = getRecetaByProductId(p.id);
                    setRecetaModal({ isOpen: true, product: p, receta: r });
                  }}
                  onDeleteProduct={(p) => setDeletingProduct(p)}
                />
              );
            })}
          </div>
        )}
      </PageContainer>

      {/* Wizard: create elaborado + recipe */}
      <ElaboradoWizard
        isOpen={isWizardOpen}
        onClose={() => { setIsWizardOpen(false); loadElaborados(); }}
        onCreated={() => loadElaborados()}
        categories={categories}
        insumos={insumos}
        recetas={recetas}
        onAddReceta={addReceta}
      />

      {/* Edit elaborado modal */}
      {editingProduct && (
        <EditElaboradoModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
          categoryOptions={categories}
          onSaved={(updated) => {
            setElaborados((prev) => prev.map((p) => p.id === updated.id ? updated : p));
            setEditingProduct(null);
          }}
        />
      )}

      {/* Confirm delete */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Eliminar producto elaborado"
        message={`¿Seguro que quieres eliminar "${deletingProduct?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* RecetaModal for editing existing recipes */}
      <RecetaModal
        isOpen={recetaModal.isOpen}
        onClose={() => setRecetaModal({ isOpen: false })}
        receta={recetaModal.receta}
        preselectedProductId={recetaModal.product?.id}
        insumos={insumos}
        products={elaborados}
        onSuccess={async () => {
          setRecetaModal({ isOpen: false });
          await loadElaborados().catch(() => {});
        }}
      />
    </MainLayout>
  );
};

export default ElaboradosPage;
