import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  BookOpen, TrendingUp, TrendingDown, Search,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, ConfirmModal } from '../../components/ui';
import { RecetaModal } from '../../components/modals/RecetaModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import type { Receta, Insumo, Product } from '../../types';
import { formatCurrency } from '../../utils';

// Semaphore: verde ≥60%, amarillo 30-60%, rojo <30%
const semaforo = (pct: number) => {
  if (pct >= 60) return { bg: 'bg-emerald-100 text-emerald-700', label: '🟢' };
  if (pct >= 30) return { bg: 'bg-amber-100 text-amber-700', label: '🟡' };
  return { bg: 'bg-red-100 text-red-600', label: '🔴' };
};

const marginColor = (pct: number) =>
  pct >= 60 ? 'text-emerald-700' : pct >= 30 ? 'text-amber-600' : 'text-red-600';

const RecetasPage: React.FC = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [_loading, setLoading] = useState(true);

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
        const [recetasData, insumosData, productsData] = await Promise.all([
          api.get<Receta[]>('/recipes/recetas'),
          api.get<Insumo[]>('/recipes/insumos'),
          api.get<Product[]>('/products'),
        ]);
        setRecetas(recetasData);
        setInsumos(insumosData);
        setProducts(productsData);
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
      await api.delete(`/recipes/recetas/${deleting.id}`);
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
                color: avgMargin !== null ? marginColor(avgMargin) : 'text-coffee-500',
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

        {/* Empty state */}
        {filtered.length === 0 && recetas.length === 0 ? (
          <div className="bg-white rounded-xl border border-coffee-100 shadow-sm flex flex-col items-center justify-center py-16 text-coffee-400">
            <BookOpen className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Sin recetas todavía</p>
            <p className="text-sm mt-1">Crea una receta para que el sistema calcule costos automáticamente.</p>
            <Button variant="primary" className="mt-5" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openCreate()}>
              Crear primera receta
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((receta: Receta) => {
              const product = products.find((p: Product) => p.id === receta.productId);
              const salePrice = product?.salePrice ?? 0;
              const margen = salePrice - receta.costoPorPorcion;
              const margenPct = salePrice > 0 ? (margen / salePrice) * 100 : 0;
              const sem = semaforo(margenPct);
              const isExpanded = expandedId === receta.id;

              return (
                <div key={receta.id} className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
                  {/* Header row */}
                  <div
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-coffee-50/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : receta.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-coffee-900 truncate">{receta.productName}</p>
                      <p className="text-xs text-coffee-400 mt-0.5">
                        {receta.ingredientes.length} ingrediente{receta.ingredientes.length !== 1 ? 's' : ''}
                        {receta.porcionesBase > 1 ? ` · ${receta.porcionesBase} porciones` : ''}
                        {receta.notas ? ` · ${receta.notas}` : ''}
                      </p>
                    </div>

                    <div className="text-right hidden sm:block min-w-[100px]">
                      <p className="text-xs text-coffee-400">Costo/porción</p>
                      <p className="font-semibold text-coffee-900">{formatCurrency(receta.costoPorPorcion)}</p>
                    </div>

                    {salePrice > 0 && (
                      <div className="text-right hidden sm:block min-w-[80px]">
                        <p className="text-xs text-coffee-400">Venta</p>
                        <p className="font-semibold text-coffee-700">{formatCurrency(salePrice)}</p>
                      </div>
                    )}

                    {salePrice > 0 && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sem.bg} flex items-center gap-1`}>
                        {sem.label} {margenPct.toFixed(1)}%
                        {margenPct >= 50
                          ? <TrendingUp className="h-3 w-3" />
                          : <TrendingDown className="h-3 w-3" />
                        }
                      </span>
                    )}

                    <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(receta)}
                        className="p-1.5 text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(receta)}
                        className="p-1.5 text-coffee-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-coffee-400 flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-coffee-400 flex-shrink-0" />
                    }
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-coffee-100 px-5 pb-5 pt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-coffee-400 border-b border-coffee-100">
                            <th className="pb-2 font-medium">Insumo</th>
                            <th className="pb-2 font-medium text-right">Cantidad</th>
                            <th className="pb-2 font-medium text-right">Merma</th>
                            <th className="pb-2 font-medium text-right">Costo/un.</th>
                            <th className="pb-2 font-medium text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-coffee-50">
                          {receta.ingredientes.map((ing) => {
                            const insumo = insumos.find((i: Insumo) => i.id === ing.insumoId);
                            const unitCost = insumo?.costoUnitario ?? ing.unitCost;
                            const subtotal = ing.quantity * unitCost * (1 + ing.merma / 100);
                            return (
                              <tr key={ing.id} className="text-coffee-700">
                                <td className="py-2">{ing.insumoName}</td>
                                <td className="py-2 text-right text-coffee-500">
                                  {ing.quantity} {ing.unidadMinima}
                                </td>
                                <td className="py-2 text-right text-coffee-500">
                                  {ing.merma > 0 ? `${ing.merma}%` : '—'}
                                </td>
                                <td className="py-2 text-right text-coffee-500">
                                  {formatCurrency(unitCost)}/{ing.unidadMinima}
                                </td>
                                <td className="py-2 text-right font-medium">
                                  {formatCurrency(subtotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          {receta.porcionesBase > 1 && (
                            <tr className="text-coffee-500 text-xs">
                              <td colSpan={4} className="pt-2">Costo total ({receta.porcionesBase} porciones)</td>
                              <td className="pt-2 text-right">{formatCurrency(receta.costoTotal)}</td>
                            </tr>
                          )}
                          <tr className="border-t border-coffee-200 font-semibold text-coffee-900">
                            <td colSpan={4} className="pt-2 text-sm">Costo por porción</td>
                            <td className="pt-2 text-right">{formatCurrency(receta.costoPorPorcion)}</td>
                          </tr>
                          {salePrice > 0 && (
                            <>
                              <tr className="text-coffee-600 text-sm">
                                <td colSpan={4} className="pt-1">Precio de venta</td>
                                <td className="pt-1 text-right">{formatCurrency(salePrice)}</td>
                              </tr>
                              <tr className={`text-sm font-bold ${marginColor(margenPct)}`}>
                                <td colSpan={4} className="pt-1">
                                  {sem.label} Margen ({margenPct.toFixed(1)}%)
                                </td>
                                <td className="pt-1 text-right">{formatCurrency(margen)}</td>
                              </tr>
                            </>
                          )}
                        </tfoot>
                      </table>
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
        onSave={async (recetaId, data) => {
          const payload = { productoId: data.productId, nombre: data.nombre, porcionesBase: data.porcionesBase, ingredientes: data.ingredientes, notas: data.notas };
          if (recetaId) {
            await api.put(`/Recipes/recetas/${recetaId}`, payload);
          } else {
            await api.post('/Recipes/recetas', payload);
          }
          const updated = await api.get<Receta[]>('/recipes/recetas');
          setRecetas(updated);
          setIsModalOpen(false);
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
