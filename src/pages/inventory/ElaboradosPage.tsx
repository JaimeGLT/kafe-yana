import React, { useState, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  Plus,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, Select, SkeletonKpiCard } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { toast } from '../../components/ui/Toast';
import { RecetaModal } from '../../components/modals/RecetaModal';
import { EditElaboradoModal } from '../../components/modals/EditElaboradoModal';
import { ProductCard } from '../../components/elaborados/ProductCard';
import { ElaboradoWizard } from '../../components/elaborados/ElaboradoWizard';
import { useElaboradosPage } from '../../hooks/useElaboradosPage';
import { usePagination } from '../../hooks/usePagination';
import type { Product, Receta } from '../../types';

// ── Main page ─────────────────────────────────────────────────────────────────

const ElaboradosPage: React.FC = () => {
  const { page, pageSize, search, debouncedSearch, setPage, setPageSize, setSearch, resetPage } = usePagination({ pageSize: 15 });

  const [filterStatus, setFilterStatus] = useState('');
  const { elaborados, recetas, insumos, categorias, totalCount, isLoading, refresh } = useElaboradosPage({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const getRecetaByProductId = useCallback((productId: string) => {
    return recetas.find((r: Receta) => r.productId === productId);
  }, [recetas]);

  const getElaboradoAvailability = useCallback((productId: string) => {
    const p = elaborados.find((e) => e.id === productId);
    if (!p) return 0;
    // en lote (isActive=true): stock físico vendible; al momento: porciones producibles con insumos
    return p.isActive ? p.stock : p.maxStock;
  }, [elaborados]);

  const addReceta = useCallback(async (recetaData: { productId: string; nombre: string; porcionesBase: number; ingredientes: { insumoId: string; quantity: number; merma: number; subTotal: number }[]; notas?: string }, _productName: string) => {
    await api.post('/Receta', {
      nombre: recetaData.nombre,
      nota: recetaData.notas ?? '',
      porciones: recetaData.porcionesBase,
      id_Elaborado: Number(recetaData.productId),
      detalles: recetaData.ingredientes.map((ing) => ({
        cantidad: ing.quantity,
        merma: ing.merma,
        subTotal: ing.subTotal,
        id_insumo: Number(ing.insumoId),
      })),
    });
    await refresh();
  }, [refresh]);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [recetaModal, setRecetaModal] = useState<{ isOpen: boolean; product?: Product; receta?: Receta }>({
    isOpen: false,
  });

  const categories = useMemo(
    () => categorias.filter((c) => c.name).map((c) => ({ value: c.id, label: c.name })),
    [categorias]
  );


  const filtered = useMemo(() => {
    let list = elaborados;
    if (filterStatus === 'con_receta') list = list.filter((p) => !!getRecetaByProductId(p.id));
    if (filterStatus === 'sin_receta') list = list.filter((p) => !getRecetaByProductId(p.id));
    if (filterStatus === 'sin_stock') list = list.filter((p) => getElaboradoAvailability(p.id) === 0);
    return list;
  }, [elaborados, filterStatus, getRecetaByProductId, getElaboradoAvailability]);

  // KPIs
  const sinReceta = useMemo(
    () => elaborados.filter((p) => !getRecetaByProductId(p.id)).length,
    [elaborados, getRecetaByProductId],
  );
  const conReceta = useMemo(
    () => elaborados.filter((p) => !!getRecetaByProductId(p.id)),
    [elaborados, getRecetaByProductId],
  );
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
  }, [conReceta, getRecetaByProductId]);

  const sinStock = useMemo(
    () => elaborados.filter((p) => getElaboradoAvailability(p.id) === 0).length,
    [elaborados, getElaboradoAvailability],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Producto/${deletingProduct.id}`);
      await refresh();
      toast.success('Producto eliminado', `"${deletingProduct.name}" fue eliminado correctamente.`);
      setDeletingProduct(null);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar el producto. Intente nuevamente.');
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
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
          </div>
        ) : (
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
        )}

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
            />
          </div>
          <div className="sm:w-52">
            <Select
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); resetPage(); }}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((product) => {
                const receta = getRecetaByProductId(product.id);
                const portions = getElaboradoAvailability(product.id);
                const tipoPreparacion = product.isActive ? 'en_lote' : 'al_momento';
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    receta={receta}
                    portionsAvailable={portions}
                    tipoPreparacion={tipoPreparacion}
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
            <Pagination
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              isLoading={isLoading}
            />
          </>
        )}
      </PageContainer>

      {/* Wizard: create elaborado + recipe */}
      <ElaboradoWizard
        isOpen={isWizardOpen}
        onClose={() => { setIsWizardOpen(false); refresh(); }}
        onCreated={() => refresh()}
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
          insumos={insumos}
          products={elaborados}
          onSaved={() => {
            setEditingProduct(null);
            refresh();
          }}
          onRecetaSaved={() => refresh()}
          onRefreshInventory={refresh}
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
        productOverride={recetaModal.product ? {
          id: recetaModal.product.id,
          name: recetaModal.product.name,
          salePrice: recetaModal.product.salePrice,
        } : undefined}
        insumos={insumos}
        products={elaborados}
        onSuccess={async () => {
          setRecetaModal({ isOpen: false });
          await refresh().catch(() => {});
        }}
      />
    </MainLayout>
  );
};

export default ElaboradosPage;
