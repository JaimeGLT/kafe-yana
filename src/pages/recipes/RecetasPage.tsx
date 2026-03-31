import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  BookOpen, Search,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, ConfirmModal, SkeletonRecetaCard } from '../../components/ui';
import { RecetaModal } from '../../components/modals/RecetaModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_ALL_RECETAS } from '../../lib/queries/recetas.queries';
import { GET_ALL_INSUMOS } from '../../lib/queries/insumos.queries';
import { GET_ALL_ELABORADOS } from '../../lib/queries/elaborados.queries';
import { mapReceta } from '../../lib/mappers/recetas.mappers';
import { mapInsumo } from '../../lib/mappers/insumos.mappers';
import { mapElaborado } from '../../lib/mappers/elaborados.mappers';
import type { RecetasResponse, InsumosResponse, ElaboradosResponse } from '../../types/graphql';
import type { Receta, Insumo, Product } from '../../types';
import { formatCurrency } from '../../utils';

const semaforo = (pct: number) => {
  if (pct >= 60) return {
    bar: 'bg-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
    summary: 'bg-emerald-50 text-emerald-800',
    text: 'text-emerald-700',
  };
  if (pct >= 30) return {
    bar: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    summary: 'bg-amber-50 text-amber-800',
    text: 'text-amber-600',
  };
  return {
    bar: 'bg-red-400',
    badge: 'bg-red-100 text-red-600',
    summary: 'bg-red-50 text-red-700',
    text: 'text-red-600',
  };
};

const RecetasPage: React.FC = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Receta | undefined>(undefined);
  const [preselectedProductId, setPreselectedProductId] = useState<string | undefined>();
  const [deleting, setDeleting] = useState<Receta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recetasData, insumosData, elaboradosData] = await Promise.all([
          gql<RecetasResponse>(GET_ALL_RECETAS),
          gql<InsumosResponse>(GET_ALL_INSUMOS),
          gql<ElaboradosResponse>(GET_ALL_ELABORADOS),
        ]);
        setRecetas(recetasData.recetas.map(mapReceta));
        setInsumos(insumosData.insumos.map(mapInsumo));
        setProducts(elaboradosData.elaborados.map(mapElaborado));
      } catch (error) {
        console.error('Error loading recetas data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const productsWithoutReceta = useMemo(() => {
    const withReceta = new Set(recetas.map((r: Receta) => r.productId));
    return products.filter((p: Product) => p.isActive && p.tipo === 'elaborado' && !withReceta.has(p.id));
  }, [products, recetas]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return recetas.filter((r: Receta) => r.productName.toLowerCase().includes(q));
  }, [recetas, search]);

  const openCreate = (productId?: string) => {
    setEditing(undefined);
    setPreselectedProductId(productId);
    setIsModalOpen(true);
  };

  const openEdit = (r: Receta) => {
    setEditing(r);
    setPreselectedProductId(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/Receta/${deleting.id}`);
      setRecetas((prev) => prev.filter((r: Receta) => r.id !== deleting.id));
      toast.success('Receta eliminada', `La receta de "${deleting.productName}" fue eliminada.`);
      if (expandedId === deleting.id) setExpandedId(null);
    } catch (error) {
      console.error('Error deleting receta:', error);
    } finally {
      setDeleting(null);
      setIsDeleting(false);
    }
  };

  // KPIs
  const avgMargin = useMemo(() => {
    const list = recetas
      .map((r: Receta) => {
        const p = products.find((pr: Product) => pr.id === r.productId);
        return p && p.salePrice > 0
          ? ((p.salePrice - r.costoPorPorcion) / p.salePrice) * 100
          : null;
      })
      .filter((v): v is number => v !== null);
    return list.length > 0 ? list.reduce((s: number, v: number) => s + v, 0) / list.length : null;
  }, [recetas, products]);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Recetas"
          subtitle="Composición de ingredientes por producto elaborado"
          actions={
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
              Nueva receta
            </Button>
          }
        />

        {/* KPIs */}
        {recetas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Recetas', value: `${recetas.length}`, color: 'text-coffee-900', bg: 'bg-white' },
              { label: 'Sin receta', value: `${productsWithoutReceta.length} elaborados`, color: 'text-amber-700', bg: 'bg-amber-50' },
              {
                label: 'Costo promedio',
                value: formatCurrency(recetas.reduce((s, r) => s + r.costoPorPorcion, 0) / recetas.length),
                color: 'text-coffee-900',
                bg: 'bg-white',
              },
              {
                label: 'Margen promedio',
                value: avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—',
                color: avgMargin !== null ? semaforo(avgMargin).text : 'text-coffee-500',
                bg: 'bg-white',
              },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl border border-coffee-100 shadow-sm px-4 py-3`}>
                <p className="text-xs text-coffee-500 mb-1">{label}</p>
                <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRecetaCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && recetas.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm flex flex-col items-center justify-center py-16 text-coffee-400">
            <BookOpen className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Sin recetas todavía</p>
            <p className="text-sm mt-1">Crea una receta para que el sistema calcule costos automáticamente.</p>
            <Button variant="primary" className="mt-5" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
              Crear primera receta
            </Button>
          </div>
        ) : !loading && (
          <div className="space-y-3">
            {filtered.map((receta: Receta) => {
              const product = products.find((p: Product) => p.id === receta.productId);
              const salePrice = product?.salePrice ?? 0;
              const margen = salePrice - receta.costoPorPorcion;
              const margenPct = salePrice > 0 ? (margen / salePrice) * 100 : 0;
              const sem = semaforo(margenPct);
              const isExpanded = expandedId === receta.id;

              return (
                <div key={receta.id} className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">

                  {/* Barra de color superior según margen */}
                  {salePrice > 0 && <div className={`h-1 ${sem.bar}`} />}

                  {/* Fila colapsada */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-coffee-50/40 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : receta.id)}
                  >
                    {/* Nombre + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-coffee-900 truncate">{receta.productName}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="inline-flex items-center text-xs bg-coffee-100 text-coffee-600 px-2 py-0.5 rounded-full font-medium">
                          {receta.ingredientes.length} ingrediente{receta.ingredientes.length !== 1 ? 's' : ''}
                        </span>
                        {receta.porcionesBase > 1 && (
                          <span className="inline-flex items-center text-xs bg-coffee-100 text-coffee-600 px-2 py-0.5 rounded-full font-medium">
                            {receta.porcionesBase} porciones
                          </span>
                        )}
                        {receta.notas && (
                          <span className="text-xs text-coffee-400 italic truncate max-w-[180px]">{receta.notas}</span>
                        )}
                      </div>
                    </div>

                    {/* Datos financieros (desktop) */}
                    <div className="hidden sm:flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-xs text-coffee-400 mb-0.5">Costo / porción</p>
                        <p className="font-semibold text-coffee-900 text-sm tabular-nums">
                          {formatCurrency(receta.costoPorPorcion)}
                        </p>
                      </div>

                      {salePrice > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-coffee-400 mb-0.5">Precio venta</p>
                          <p className="font-semibold text-coffee-600 text-sm tabular-nums">
                            {formatCurrency(salePrice)}
                          </p>
                        </div>
                      )}

                      {salePrice > 0 && (
                        <div className={`px-3 py-2 rounded-xl ${sem.badge} text-center min-w-[72px]`}>
                          <p className="text-xs font-medium opacity-70 mb-0.5">Margen</p>
                          <p className="font-bold text-sm tabular-nums">{margenPct.toFixed(1)}%</p>
                        </div>
                      )}
                    </div>

                    {/* Margen badge (solo mobile) */}
                    {salePrice > 0 && (
                      <span className={`sm:hidden text-xs font-bold px-2.5 py-1 rounded-full ${sem.badge}`}>
                        {margenPct.toFixed(1)}%
                      </span>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(receta)}
                        className="p-1.5 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 rounded-lg transition-colors"
                        title="Editar receta"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(receta)}
                        className="p-1.5 text-coffee-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar receta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-coffee-400 flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-coffee-400 flex-shrink-0" />
                    }
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-coffee-100">

                      {/* Lista de ingredientes */}
                      <div className="px-5 pt-4 pb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-coffee-400 mb-2">
                          Ingredientes
                        </p>
                        <div className="space-y-0.5">
                          {receta.ingredientes.map((ing) => {
                            const insumo = insumos.find((i: Insumo) => i.id === ing.insumoId);
                            const unitCost = insumo?.costoUnitario ?? 0;
                            const unidad = insumo?.unidadMinima ?? '';

                            return (
                              <div
                                key={ing.id}
                                className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg hover:bg-coffee-50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-coffee-800 truncate">
                                    {ing.insumoName || '—'}
                                  </p>
                                  <p className="text-xs text-coffee-400 mt-0.5">
                                    {ing.quantity} {unidad}
                                    {ing.merma > 0 && (
                                      <span className="text-amber-600 ml-2">· +{ing.merma}% merma</span>
                                    )}
                                    {unitCost > 0 && (
                                      <span className="ml-2">· {formatCurrency(unitCost)}/{unidad}</span>
                                    )}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-coffee-900 tabular-nums flex-shrink-0">
                                  {formatCurrency(ing.subtotal)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resumen de costos */}
                      <div className="px-5 pb-5 pt-2 border-t border-coffee-50">
                        <div className={`grid gap-3 ${salePrice > 0 ? 'grid-cols-3' : 'grid-cols-1 max-w-[160px]'}`}>
                          <div className="bg-coffee-50 rounded-xl px-4 py-3">
                            <p className="text-xs text-coffee-400 mb-0.5">Costo por porción</p>
                            <p className="font-bold text-coffee-900 tabular-nums">
                              {formatCurrency(receta.costoPorPorcion)}
                            </p>
                            {receta.porcionesBase > 1 && (
                              <p className="text-xs text-coffee-400 mt-0.5">
                                Total {formatCurrency(receta.costoTotal)} · {receta.porcionesBase} porciones
                              </p>
                            )}
                          </div>

                          {salePrice > 0 && (
                            <div className="bg-coffee-50 rounded-xl px-4 py-3">
                              <p className="text-xs text-coffee-400 mb-0.5">Precio de venta</p>
                              <p className="font-bold text-coffee-700 tabular-nums">
                                {formatCurrency(salePrice)}
                              </p>
                            </div>
                          )}

                          {salePrice > 0 && (
                            <div className={`rounded-xl px-4 py-3 ${sem.summary}`}>
                              <p className="text-xs opacity-70 mb-0.5">Margen</p>
                              <p className="font-bold tabular-nums">{margenPct.toFixed(1)}%</p>
                              <p className="text-xs opacity-70 mt-0.5 tabular-nums">
                                {formatCurrency(margen)} por porción
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Products without recipe */}
        {productsWithoutReceta.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
            <p className="text-sm font-semibold text-amber-800 mb-3">
              {productsWithoutReceta.length} elaborado{productsWithoutReceta.length !== 1 ? 's' : ''} sin receta — no pueden venderse hasta tenerla
            </p>
            <div className="flex flex-wrap gap-2">
              {productsWithoutReceta.map((p: Product) => (
                <button
                  key={p.id}
                  onClick={() => openCreate(p.id)}
                  className="inline-flex items-center gap-1.5 text-xs bg-white border border-amber-300 text-amber-700 rounded-full px-3 py-1.5 hover:bg-amber-100 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </PageContainer>

      <RecetaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        receta={editing}
        preselectedProductId={preselectedProductId}
        insumos={insumos}
        products={products}
        onSuccess={async () => {
          setIsModalOpen(false);
          try {
            const data = await gql<RecetasResponse>(GET_ALL_RECETAS);
            setRecetas(data.recetas.map(mapReceta));
          } catch (error) {
            console.error('Error reloading recetas:', error);
          }
        }}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar receta"
        message={`¿Eliminar la receta de "${deleting?.productName}"?`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default RecetasPage;
