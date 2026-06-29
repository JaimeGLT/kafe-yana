import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, FlaskConical, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, Select, ConfirmModal, SkeletonRow } from '../../components/ui';
import { Pagination } from '../../components/ui/Pagination';
import { InsumoModal } from '../../components/modals/InsumoModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_ALL_INSUMOS } from '../../lib/queries/insumos.queries';
import { GET_ALL_RECETAS } from '../../lib/queries/recetas.queries';
import { mapInsumo } from '../../lib/mappers/insumos.mappers';
import { mapReceta } from '../../lib/mappers/recetas.mappers';
import { usePagination } from '../../hooks/usePagination';
import type { InsumosResponse, RecetasResponse } from '../../types/graphql';
import type { Insumo, Receta } from '../../types';
import { formatCurrency } from '../../utils';

const InsumosPage: React.FC = () => {
  const { page, pageSize, search, debouncedSearch, setPage, setPageSize, setSearch, resetPage } = usePagination({ pageSize: 15 });

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | undefined>(undefined);
  const [deleting, setDeleting] = useState<Insumo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [insumosData, recetasData] = await Promise.all([
        gql<InsumosResponse>(GET_ALL_INSUMOS, {
          skip: (page - 1) * pageSize,
          take: pageSize,
          search: debouncedSearch || null,
          categoria: filterCategoria || null,
        }),
        gql<RecetasResponse>(GET_ALL_RECETAS),
      ]);
      setInsumos(insumosData.insumos.items.map(mapInsumo));
      setTotalCount(insumosData.insumos.totalCount);
      setRecetas(recetasData.recetas.items.map(mapReceta).filter((r): r is Receta => r !== null));
    } catch (error) {
      console.error('Error loading insumos data:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterCategoria]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Category options derived from current insumos
  const categoriaOptions = useMemo(() => {
    const cats = [...new Set(insumos.map((i: Insumo) => i.categoriaInsumo))].filter(Boolean);
    return [{ value: '', label: 'Todas las categorías' }, ...cats.map((c: string) => ({ value: c, label: c }))];
  }, [insumos]);

  const filtered = insumos;

  // Count how many recipes use each insumo
  const usageCount = useMemo(() => {
    const map: Record<string, number> = {};
    recetas.forEach((r: Receta) =>
      r.ingredientes.forEach((ing) => {
        map[ing.insumoId] = (map[ing.insumoId] ?? 0) + 1;
      })
    );
    return map;
  }, [recetas]);

  const lowStockCount = useMemo(
    () => insumos.filter((i: Insumo) => i.stockMinimo > 0 && i.stock <= i.stockMinimo).length,
    [insumos]
  );

  const openCreate = () => { setEditing(undefined); setIsModalOpen(true); };
  const openEdit = (ins: Insumo) => { setEditing(ins); setIsModalOpen(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Insumo/${deleting.id}`);
      setInsumos((prev) => prev.filter((i: Insumo) => i.id !== deleting.id));
      toast.success('Insumo eliminado', `"${deleting.name}" fue eliminado.`);
    } catch (error) {
      console.error('Error deleting insumo:', error);
    } finally {
      setDeleting(null);
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Insumos"
          subtitle="Materias primas con unidad de medida y costo unitario"
          actions={
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Nuevo insumo
            </Button>
          }
        />

        {/* Low-stock alert banner */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {lowStockCount} insumo{lowStockCount !== 1 ? 's' : ''} con stock bajo o sin stock — revisa y registra una compra.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, categoría…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select
              value={filterCategoria}
              onChange={(v) => { setFilterCategoria(v); resetPage(); }}
              options={categoriaOptions}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-coffee-500 bg-white border border-coffee-100 rounded-lg px-3 py-2">
            <FlaskConical className="h-4 w-4" />
            {insumos.length} insumo{insumos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          {loading ? (
            <>
              {/* Mobile skeleton */}
              <div className="sm:hidden divide-y divide-coffee-50 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 bg-coffee-200 rounded" />
                      <div className="h-3 w-24 bg-coffee-100 rounded" />
                    </div>
                    <div className="h-3 w-16 bg-coffee-100 rounded" />
                  </div>
                ))}
              </div>
              {/* Desktop skeleton */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                  </tbody>
                </table>
              </div>
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-coffee-400">
              <FlaskConical className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">
                {debouncedSearch || filterCategoria
                  ? 'Sin resultados para los filtros aplicados'
                  : 'Sin insumos registrados'}
              </p>
              {!debouncedSearch && !filterCategoria && (
                <p className="text-sm mt-1">Crea tu primer insumo para empezar a armar recetas.</p>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-coffee-50">
                {filtered.map((ins) => {
                  const stockEnCompra = ins.factorConversion > 0 ? ins.stock / ins.factorConversion : ins.stock;
                  const isLow = ins.stockMinimo > 0 && ins.stock <= ins.stockMinimo;
                  const isEmpty = ins.stock <= 0;
                  return (
                    <div key={ins.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-coffee-900 truncate text-sm">{ins.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs bg-coffee-100 text-coffee-600 px-2 py-0.5 rounded-full">
                            {ins.categoriaInsumo}
                          </span>
                          {isEmpty && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Sin stock</span>
                          )}
                          {!isEmpty && isLow && (
                            <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Stock bajo</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={clsx('font-semibold text-sm', isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700')}>
                          {Math.ceil(stockEnCompra)} {ins.unidadCompra}
                        </p>
                        <p className="text-xs text-coffee-400">{formatCurrency(ins.costoUnitario)}/{ins.unidadMinima}</p>
                      </div>
                      <div className="flex-shrink-0 flex gap-1">
                        <button
                          onClick={() => openEdit(ins)}
                          className="p-1.5 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 rounded transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(ins)}
                          className="p-1.5 text-coffee-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-coffee-100 bg-coffee-50 text-left">
                      <th className="px-4 py-3 font-medium text-coffee-600">Nombre</th>
                      <th className="px-4 py-3 font-medium text-coffee-600">Categoría</th>
                      <th className="px-4 py-3 font-medium text-coffee-600">Unidad uso</th>
                      <th className="px-4 py-3 font-medium text-coffee-600 text-right">Costo / unidad</th>
                      <th className="px-4 py-3 font-medium text-coffee-600 text-right">Costo compra</th>
                      <th className="px-4 py-3 font-medium text-coffee-600 text-center">Stock</th>
                      <th className="px-4 py-3 font-medium text-coffee-600 text-center">En recetas</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-50">
                    {filtered.map((ins) => {
                      const stockEnCompra = ins.factorConversion > 0 ? ins.stock / ins.factorConversion : ins.stock;
                      const isLow = ins.stockMinimo > 0 && ins.stock <= ins.stockMinimo;
                      const isEmpty = ins.stock <= 0;
                      return (
                        <tr key={ins.id} className="hover:bg-coffee-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-coffee-900">{ins.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-coffee-100 text-coffee-600 px-2 py-0.5 rounded-full">
                              {ins.categoriaInsumo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-coffee-600">{ins.unidadMinima}</td>
                          <td className="px-4 py-3 text-right font-medium text-coffee-900">
                            {formatCurrency(ins.costoUnitario)}/{ins.unidadMinima}
                          </td>
                          <td className="px-4 py-3 text-right text-coffee-500 text-xs">
                            {formatCurrency(ins.costoCompra)}/{ins.unidadCompra}
                            <br />
                            <span className="text-coffee-400">÷ {ins.factorConversion}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div>
                              <span className={clsx('font-semibold', isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700')}>
                                {Math.ceil(stockEnCompra)} {ins.unidadCompra}
                              </span>
                              <p className="text-xs text-coffee-400">{Math.ceil(ins.stock)} {ins.unidadMinima}</p>
                              {ins.stockMinimo > 0 && (
                                <p className="text-xs text-coffee-400">Mín: {Math.ceil(ins.stockMinimo / ins.factorConversion)} {ins.unidadCompra}</p>
                              )}
                              {isEmpty && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Sin stock</span>
                              )}
                              {!isEmpty && isLow && (
                                <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Stock bajo</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {usageCount[ins.id] ? (
                              <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                {usageCount[ins.id]} receta{usageCount[ins.id] !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-coffee-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(ins)}
                                className="p-1.5 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleting(ins)}
                                className="p-1.5 text-coffee-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar"
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
            </>
          )}
        </div>

        <Pagination
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={loading}
        />
      </PageContainer>

      <InsumoModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(undefined); }}
        insumo={editing}
        onCreated={() => fetchData()}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditing(undefined);
          fetchData();
        }}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar insumo"
        message={`¿Eliminar "${deleting?.name}"? Si está en recetas, esas líneas quedarán sin referencia.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default InsumosPage;
