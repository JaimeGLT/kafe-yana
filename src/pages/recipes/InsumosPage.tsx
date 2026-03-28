import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FlaskConical, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, Select, ConfirmModal } from '../../components/ui';
import { InsumoModal } from '../../components/modals/InsumoModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import type { Insumo, Receta } from '../../types';
import { formatCurrency } from '../../utils';

const InsumosPage: React.FC = () => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | undefined>(undefined);
  const [deleting, setDeleting] = useState<Insumo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insumosData, recetasData] = await Promise.all([
          api.get<Insumo[]>('/recipes/insumos'),
          api.get<Receta[]>('/recipes/recetas'),
        ]);
        setInsumos(insumosData);
        setRecetas(recetasData);
      } catch (error) {
        console.error('Error loading insumos data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Category options derived from current insumos
  const categoriaOptions = useMemo(() => {
    const cats = [...new Set(insumos.map((i: Insumo) => i.categoriaInsumo))].filter(Boolean);
    return [{ value: '', label: 'Todas las categorías' }, ...cats.map((c: string) => ({ value: c, label: c }))];
  }, [insumos]);

  const stockFilterOptions = [
    { value: '', label: 'Todo el stock' },
    { value: 'low', label: 'Stock bajo' },
    { value: 'ok', label: 'Stock OK' },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return insumos.filter((ins: Insumo) => {
      const matchSearch =
        !q ||
        ins.name.toLowerCase().includes(q) ||
        ins.categoriaInsumo.toLowerCase().includes(q) ||
        ins.code.toLowerCase().includes(q);
      const matchCat = !filterCategoria || ins.categoriaInsumo === filterCategoria;
      const isLow = ins.stock <= ins.stockMinimo;
      const matchStock =
        !filterStock ||
        (filterStock === 'low' && isLow) ||
        (filterStock === 'ok' && !isLow);
      return matchSearch && matchCat && matchStock;
    });
  }, [insumos, search, filterCategoria, filterStock]);

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
    () => insumos.filter((i: Insumo) => i.stock <= i.stockMinimo && i.stockMinimo > 0).length,
    [insumos]
  );

  const openCreate = () => { setEditing(undefined); setIsModalOpen(true); };
  const openEdit = (ins: Insumo) => { setEditing(ins); setIsModalOpen(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/recipes/insumos/${deleting.id}`);
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
            <button
              onClick={() => setFilterStock('low')}
              className="ml-auto text-xs text-red-600 underline hover:text-red-800"
            >
              Ver solo esos
            </button>
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
              onChange={setFilterCategoria}
              options={categoriaOptions}
            />
          </div>
          <div className="w-40">
            <Select
              value={filterStock}
              onChange={setFilterStock}
              options={stockFilterOptions}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-coffee-500 bg-white border border-coffee-100 rounded-lg px-3 py-2">
            <FlaskConical className="h-4 w-4" />
            {insumos.length} insumo{insumos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-coffee-400">
              <FlaskConical className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">
                {search || filterCategoria || filterStock
                  ? 'Sin resultados para los filtros aplicados'
                  : 'Sin insumos registrados'}
              </p>
              {!search && !filterCategoria && !filterStock && (
                <p className="text-sm mt-1">Crea tu primer insumo para empezar a armar recetas.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
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
                  const isLow = ins.stockMinimo > 0 && ins.stock <= ins.stockMinimo;
                  const isEmpty = ins.stock <= 0;

                  return (
                    <tr key={ins.id} className="hover:bg-coffee-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-coffee-900">{ins.name}</p>
                        <p className="text-xs text-coffee-400 font-mono">{ins.code}</p>
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
                          <span
                            className={clsx(
                              'font-semibold',
                              isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                            )}
                          >
                            {ins.stock} {ins.unidadMinima}
                          </span>
                          {ins.stockMinimo > 0 && (
                            <p className="text-xs text-coffee-400">Mín: {ins.stockMinimo}</p>
                          )}
                          {isEmpty && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                              Sin stock
                            </span>
                          )}
                          {!isEmpty && isLow && (
                            <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">
                              Stock bajo
                            </span>
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
          )}
        </div>
      </PageContainer>

      <InsumoModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(undefined); }}
        insumo={editing}
        onSave={async (input, isEdit, insumoId) => {
          if (isEdit && insumoId) {
            await api.put(`/Recipes/insumos/${insumoId}`, input);
            const updated = await api.get<Insumo[]>('/recipes/insumos');
            setInsumos(updated);
          } else {
            const created = await api.post<Insumo>('/Recipes/insumos', input);
            setInsumos((prev) => [...prev, created]);
            return created;
          }
        }}
        onCreated={() => setIsModalOpen(false)}
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
