import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, FlaskConical } from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, Input, ConfirmModal } from '../../components/ui';
import { InsumoModal } from '../../components/modals/InsumoModal';
import { toast } from '../../components/ui/Toast';
import { useRecipesStore } from '../../stores';
import type { Insumo } from '../../types';
import { formatCurrency } from '../../utils';

const InsumosPage: React.FC = () => {
  const { insumos, deleteInsumo, recetas } = useRecipesStore();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | undefined>(undefined);
  const [deleting, setDeleting] = useState<Insumo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return insumos.filter(
      (ins) =>
        ins.name.toLowerCase().includes(q) ||
        ins.unit.toLowerCase().includes(q) ||
        ins.code.toLowerCase().includes(q)
    );
  }, [insumos, search]);

  // Count how many recipes use each insumo
  const usageCount = useMemo(() => {
    const map: Record<string, number> = {};
    recetas.forEach((r) => {
      r.ingredientes.forEach((ing) => {
        map[ing.insumoId] = (map[ing.insumoId] ?? 0) + 1;
      });
    });
    return map;
  }, [recetas]);

  const openCreate = () => { setEditing(undefined); setIsModalOpen(true); };
  const openEdit = (ins: Insumo) => { setEditing(ins); setIsModalOpen(true); };

  const handleDelete = () => {
    if (!deleting) return;
    setIsDeleting(true);
    deleteInsumo(deleting.id);
    toast.success('Insumo eliminado', `"${deleting.name}" fue eliminado.`);
    setDeleting(null);
    setIsDeleting(false);
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

        {/* Search + stats */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o unidad…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3 text-sm text-coffee-500">
            <span className="bg-white border border-coffee-100 rounded-lg px-3 py-2">
              {insumos.length} insumo{insumos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-coffee-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-coffee-400">
              <FlaskConical className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">
                {search ? 'Sin resultados para tu búsqueda' : 'Sin insumos registrados'}
              </p>
              {!search && (
                <p className="text-sm mt-1">
                  Crea tu primer insumo para empezar a armar recetas.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100 bg-coffee-50 text-left">
                  <th className="px-4 py-3 font-medium text-coffee-600">Código</th>
                  <th className="px-4 py-3 font-medium text-coffee-600">Nombre</th>
                  <th className="px-4 py-3 font-medium text-coffee-600">Unidad</th>
                  <th className="px-4 py-3 font-medium text-coffee-600 text-right">Costo / unidad</th>
                  <th className="px-4 py-3 font-medium text-coffee-600 text-center">En recetas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {filtered.map((ins) => (
                  <tr key={ins.id} className="hover:bg-coffee-50/50 transition-colors">
                    <td className="px-4 py-3 text-coffee-400 font-mono text-xs">{ins.code}</td>
                    <td className="px-4 py-3 font-medium text-coffee-900">{ins.name}</td>
                    <td className="px-4 py-3 text-coffee-600">{ins.unit}</td>
                    <td className="px-4 py-3 text-right font-medium text-coffee-900">
                      {formatCurrency(ins.unitCost)}
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </PageContainer>

      <InsumoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        insumo={editing}
      />

      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Eliminar insumo"
        message={`¿Eliminar "${deleting?.name}"? Esta acción no se puede deshacer. Si el insumo está en recetas, esas líneas quedarán sin referencia.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </MainLayout>
  );
};

export default InsumosPage;
