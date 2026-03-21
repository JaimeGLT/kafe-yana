import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Layers,
  Tag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout } from '../../components/layout';
import { PageContainer, PageHeader } from '../../components/layout';
import { Button, ConfirmModal } from '../../components/ui';
import { ComboModal } from '../../components/modals/ComboModal';
import { toast } from '../../components/ui/Toast';
import { useInventoryStore, useRecipesStore } from '../../stores';
import { useStockManager } from '../../hooks/useStockManager';
import type { Combo } from '../../types';
import { formatCurrency } from '../../utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getMarginInfo = (pct: number) => {
  if (pct >= 60) return { label: 'Rentable', dot: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct >= 30) return { label: 'Aceptable', dot: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Revisar precio', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 text-red-700 border-red-200' };
};

// ── Combo card ────────────────────────────────────────────────────────────────

interface ComboCardProps {
  combo: Combo;
  availability: number;
  onEdit: (c: Combo) => void;
  onDelete: (c: Combo) => void;
}

const ComboCard: React.FC<ComboCardProps> = ({ combo, availability, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const { products } = useInventoryStore();
  const { getRecetaByProductId } = useRecipesStore();

  const margenPct = combo.price > 0 ? ((combo.price - combo.costoTotal) / combo.price) * 100 : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;

  const sumaIndividual = combo.items.reduce((s, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return s + (prod?.salePrice ?? 0) * item.quantity;
  }, 0);
  const ahorro = sumaIndividual > combo.price ? sumaIndividual - combo.price : 0;

  const requiredItems = combo.items.filter((i) => !i.esOpcional);
  const optionalItems = combo.items.filter((i) => i.esOpcional);

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Color bar */}
      <div className={clsx('h-1', semaforo ? semaforo.dot : 'bg-coffee-200')} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-coffee-900 truncate">{combo.name}</h3>
            {combo.description && (
              <p className="text-xs text-coffee-400 truncate mt-0.5">{combo.description}</p>
            )}
          </div>
          <span className="text-base font-bold text-coffee-800 shrink-0">{formatCurrency(combo.price)}</span>
        </div>

        {/* Items summary */}
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-coffee-500 hover:text-coffee-700 transition-colors"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {combo.items.length} producto{combo.items.length !== 1 ? 's' : ''}
            {optionalItems.length > 0 && ` · ${optionalItems.length} opcional${optionalItems.length !== 1 ? 'es' : ''}`}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1">
              {combo.items.map((item) => {
                const prod = products.find((p) => p.id === item.productId);
                const receta = prod?.tipo === 'elaborado' ? getRecetaByProductId(prod.id) : null;
                return (
                  <li key={item.id} className="flex items-center gap-2 text-xs text-coffee-600">
                    {prod?.tipo === 'elaborado'
                      ? <FlaskConical className="h-3 w-3 text-amber-500 shrink-0" />
                      : <Package className="h-3 w-3 text-blue-400 shrink-0" />}
                    <span className="flex-1 truncate">{item.productName}</span>
                    <span className="text-coffee-400">×{item.quantity}</span>
                    {item.esOpcional && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-1 rounded">opcional</span>
                    )}
                    {prod?.tipo === 'elaborado' && !receta && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" title="Sin receta" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Cost & margin */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-coffee-500">Costo total</span>
            <span className="font-medium text-coffee-800">{formatCurrency(combo.costoTotal)}</span>
          </div>
          {ahorro > 0 && (
            <div className="flex justify-between">
              <span className="text-coffee-500 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Ahorro cliente
              </span>
              <span className="text-emerald-700 font-medium">{formatCurrency(ahorro)}</span>
            </div>
          )}
          {margenPct !== null && semaforo && (
            <div className="flex items-center justify-between">
              <span className="text-coffee-500">Margen</span>
              <span className={clsx('font-semibold flex items-center gap-1', semaforo.text)}>
                <span className={clsx('w-2 h-2 rounded-full', semaforo.dot)} />
                {margenPct.toFixed(1)}% — {semaforo.label}
              </span>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-coffee-500">Disponibles hoy</span>
          <span className={clsx(
            'font-semibold',
            availability === 0 ? 'text-red-600' : availability <= 3 ? 'text-amber-600' : 'text-emerald-600'
          )}>
            {availability === 0 ? '⚠ Sin stock' : `${availability} combos`}
          </span>
        </div>

        {/* Required vs optional indicator */}
        <div className="flex gap-2 text-xs">
          <span className="bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded border border-coffee-100">
            {requiredItems.length} fijo{requiredItems.length !== 1 ? 's' : ''}
          </span>
          {optionalItems.length > 0 && (
            <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">
              {optionalItems.length} opcional{optionalItems.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onEdit(combo)}
          className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg border border-coffee-200 text-coffee-600 hover:bg-coffee-50 transition-colors flex items-center justify-center gap-1"
        >
          <Edit2 className="h-3.5 w-3.5" /> Editar combo
        </button>
        <button
          onClick={() => onDelete(combo)}
          className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
          title="Eliminar combo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const CombosPage: React.FC = () => {
  const { combos, deleteCombo } = useInventoryStore();
  const { getComboAvailability } = useStockManager();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | undefined>(undefined);
  const [deleting, setDeleting] = useState<Combo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeCombos = useMemo(() => combos.filter((c) => c.isActive), [combos]);

  const filtered = useMemo(() => {
    let list = activeCombos;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (filterStatus === 'sin_stock') list = list.filter((c) => getComboAvailability(c.id) === 0);
    if (filterStatus === 'disponible') list = list.filter((c) => getComboAvailability(c.id) > 0);
    return list;
  }, [activeCombos, search, filterStatus, getComboAvailability]);

  // KPIs
  const sinStock = activeCombos.filter((c) => getComboAvailability(c.id) === 0).length;
  const avgMargen = useMemo(() => {
    const valid = activeCombos.filter((c) => c.price > 0 && c.costoTotal > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((s, c) => s + ((c.price - c.costoTotal) / c.price) * 100, 0);
    return sum / valid.length;
  }, [activeCombos]);

  const avgAhorro = useMemo(() => {
    const { products } = useInventoryStore.getState();
    const valid = activeCombos.filter((c) => c.items.length > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((s, c) => {
      const suma = c.items.reduce((acc, item) => {
        const prod = products.find((p) => p.id === item.productId);
        return acc + (prod?.salePrice ?? 0) * item.quantity;
      }, 0);
      return s + Math.max(0, suma - c.price);
    }, 0);
    return sum / valid.length;
  }, [activeCombos]);

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    deleteCombo(deleting.id);
    toast.success('Combo eliminado', `"${deleting.name}" fue eliminado.`);
    setDeleting(null);
    setIsDeleting(false);
  };

  const openEdit = (c: Combo) => {
    setEditing(c);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditing(undefined);
  };

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Combos"
          subtitle="Paquetes de productos a precio especial — el stock se descuenta por componente"
          actions={
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Nuevo combo
            </Button>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Layers className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-coffee-400">Total combos</p>
              <p className="text-xl font-bold text-coffee-900">{activeCombos.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className={clsx('p-2 rounded-lg', sinStock > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
              {sinStock > 0
                ? <AlertTriangle className="h-5 w-5 text-red-600" />
                : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            </div>
            <div>
              <p className="text-xs text-coffee-400">Sin stock hoy</p>
              <p className={clsx('text-xl font-bold', sinStock > 0 ? 'text-red-700' : 'text-coffee-900')}>
                {sinStock}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-coffee-400">Margen promedio</p>
              <p className={clsx('text-xl font-bold', avgMargen === null ? 'text-coffee-400' : avgMargen >= 30 ? 'text-emerald-700' : 'text-red-600')}>
                {avgMargen !== null ? `${avgMargen.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-coffee-100 p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-coffee-400">Ahorro promedio</p>
              <p className="text-xl font-bold text-coffee-900">
                {avgAhorro !== null ? formatCurrency(avgAhorro) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar combo…"
              className="w-full pl-9 pr-4 py-2 border border-coffee-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-coffee-200 rounded-lg text-sm px-3 py-2 text-coffee-700 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
          >
            <option value="">Todos los combos</option>
            <option value="disponible">Disponibles hoy</option>
            <option value="sin_stock">Sin stock</option>
          </select>
        </div>

        {/* Content */}
        {activeCombos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-coffee-200">
            <Layers className="h-12 w-12 text-coffee-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-coffee-700 mb-1">Sin combos creados</h3>
            <p className="text-sm text-coffee-400 mb-6 max-w-md mx-auto">
              Un combo agrupa varios productos a un precio especial. El sistema descuenta automáticamente
              el stock de cada componente al registrar la venta.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                availability={getComboAvailability(combo.id)}
                onEdit={openEdit}
                onDelete={(c) => setDeleting(c)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <ComboModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        combo={editing}
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
