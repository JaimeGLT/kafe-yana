import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Layers, Tag,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout, PageContainer, PageHeader } from '../../components/layout';
import { Button, ConfirmModal, Input, Select } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { ComboModal } from '../../components/modals/ComboModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { useCombosPage } from '../../hooks/useCombosPage';
import { usePagination } from '../../hooks/usePagination';
import { ComboCard } from '../../components/combos/ComboCard';
import type { Combo } from '../../types';
import { formatCurrency } from '../../utils';

// ── Main page ─────────────────────────────────────────────────────────────────

const CombosPage: React.FC = () => {
  const { page, pageSize, search, debouncedSearch, setPage, setPageSize, setSearch, resetPage } = usePagination({ pageSize: 15 });

  const [filterStatus, setFilterStatus] = useState('');
  const { combos, products: allProducts, totalCount, isLoading, refresh } = useCombosPage({
    page,
    pageSize,
    search: debouncedSearch,
  });

  // ── Estado de UI ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | undefined>(undefined);
  const [deleting, setDeleting] = useState<Combo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Derivados ──
  const activeCombos = useMemo(() => combos.filter((c) => c.isActive), [combos]);

  const filtered = useMemo(() => {
    let list = activeCombos;
    if (filterStatus === 'sin_stock') list = list.filter((c) => c.availability === 0);
    if (filterStatus === 'disponible') list = list.filter((c) => c.availability > 0);
    return list;
  }, [activeCombos, filterStatus]);

  // ── KPIs ──
  const sinStock = activeCombos.filter((c) => c.availability === 0).length;

  const avgMargen = useMemo(() => {
    const valid = activeCombos.filter((c) => c.price > 0 && c.costoTotal > 0);
    if (valid.length === 0) return null;
    return valid.reduce((s, c) => s + ((c.price - c.costoTotal) / c.price) * 100, 0) / valid.length;
  }, [activeCombos]);

  const avgAhorro = useMemo(() => {
    const valid = activeCombos.filter((c) => c.items.length > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((s, c) => {
      const sumaIndividual = c.items.reduce((acc, item) => {
        const prod = allProducts.find((p) => p.id === item.productId);
        return acc + (prod?.salePrice ?? 0) * item.quantity;
      }, 0);
      return s + Math.max(0, sumaIndividual - c.price);
    }, 0);
    return sum / valid.length;
  }, [activeCombos, allProducts]);

  // ── Handlers ──
  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Producto/${deleting.id}`);
      toast.success('Combo eliminado', `"${deleting.name}" fue eliminado.`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar el combo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (c: Combo) => { setEditing(c); setIsModalOpen(true); };
  const handleModalClose = () => { setIsModalOpen(false); setEditing(undefined); };

  // ── Render ──
  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Combos"
          subtitle="Paquetes de productos a precio especial — el stock se descuenta por componente"
          actions={
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              Nuevo combo
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 shrink-0">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Total combos</p>
              <p className="text-base sm:text-xl font-bold text-coffee-900">{activeCombos.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={clsx('p-1.5 sm:p-2 rounded-lg shrink-0', sinStock > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
              {sinStock > 0
                ? <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                : <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Sin stock hoy</p>
              <p className={clsx('text-base sm:text-xl font-bold', sinStock > 0 ? 'text-red-700' : 'text-coffee-900')}>
                {sinStock}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Margen promedio</p>
              <p className={clsx(
                'text-base sm:text-xl font-bold',
                avgMargen === null ? 'text-coffee-400' : avgMargen >= 30 ? 'text-emerald-700' : 'text-red-600',
              )}>
                {avgMargen !== null ? `${avgMargen.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-coffee-100 px-3 py-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-50 shrink-0">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-coffee-400 truncate">Ahorro promedio</p>
              <p className="text-base sm:text-xl font-bold text-coffee-900 truncate">
                {avgAhorro !== null ? formatCurrency(avgAhorro) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar combo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="sm:w-52">
            <Select
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); resetPage(); }}
              options={[
                { value: '', label: 'Todos los combos' },
                { value: 'disponible', label: 'Disponibles hoy' },
                { value: 'sin_stock', label: 'Sin stock' },
              ]}
            />
          </div>
        </div>

        {/* Contenido */}
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
        ) : activeCombos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-coffee-200">
            <Layers className="h-12 w-12 text-coffee-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-coffee-700 mb-1">Sin combos creados</h3>
            <p className="text-sm text-coffee-400 mb-6 max-w-md mx-auto">
              Un combo agrupa varios productos a un precio especial. El sistema descuenta
              automáticamente el stock de cada componente al registrar la venta.
            </p>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
              Crear primer combo
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-coffee-400 text-sm">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-coffee-200" />
            No hay combos que coincidan con los filtros.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  availability={combo.availability}
                  products={allProducts}
                  onEdit={openEdit}
                  onDelete={(c) => setDeleting(c)}
                />
              ))}
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

      <ComboModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        combo={editing}
        products={allProducts}
        onSuccess={() => refresh()}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar combo"
        message={`¿Estás seguro de que deseas eliminar el combo "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default CombosPage;