import React, { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Search, Layers, Tag,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  FlaskConical, Package, ChevronDown, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MainLayout, PageContainer, PageHeader } from '../../components/layout';
import { Button, ConfirmModal, Input, Select } from '../../components/ui';
import { ComboModal } from '../../components/modals/ComboModal';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { useCombosPage } from '../../hooks/useCombosPage';
import type { Combo, Product, Receta } from '../../types';
import { formatCurrency } from '../../utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getMarginInfo = (pct: number) => {
  if (pct >= 60) return {
    label: 'Rentable',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  if (pct >= 30) return {
    label: 'Aceptable',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return {
    label: 'Revisar',
    dot: 'bg-red-500',
    text: 'text-red-700',
    badge: 'bg-red-50 text-red-700 border-red-200',
  };
};

// ── Combo card ────────────────────────────────────────────────────────────────

interface ComboCardProps {
  combo: Combo;
  availability: number;
  products: Product[];
  recetas: Receta[];
  onEdit: (c: Combo) => void;
  onDelete: (c: Combo) => void;
}

const ComboCard: React.FC<ComboCardProps> = ({
  combo, availability, products, recetas, onEdit, onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const margenPct = combo.price > 0
    ? ((combo.price - combo.costoTotal) / combo.price) * 100
    : null;
  const semaforo = margenPct !== null ? getMarginInfo(margenPct) : null;

  const sumaIndividual = combo.items.reduce((s, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return s + (prod?.salePrice ?? 0) * item.quantity;
  }, 0);
  const ahorro = sumaIndividual > combo.price ? sumaIndividual - combo.price : 0;

  const requiredItems = combo.items.filter((i) => !i.esOpcional);
  const optionalItems = combo.items.filter((i) => i.esOpcional);

  const getRecetaByProductId = (productId: string): Receta | undefined =>
    recetas.find((r) => r.productId === productId);

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className={clsx('h-1', semaforo ? semaforo.dot : 'bg-coffee-200')} />

      <div className="p-4 space-y-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-coffee-900 truncate">{combo.name}</h3>
            {combo.description && (
              <p className="text-xs text-coffee-400 truncate mt-0.5">{combo.description}</p>
            )}
          </div>
          <span className="text-base font-bold text-coffee-800 shrink-0">
            {formatCurrency(combo.price)}
          </span>
        </div>

        {/* Items */}
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
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Costo y margen */}
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

        {/* Disponibilidad */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-coffee-500">Disponibles hoy</span>
          <span className={clsx(
            'font-semibold',
            availability === 0 ? 'text-red-600' : availability <= 3 ? 'text-amber-600' : 'text-emerald-600',
          )}>
            {availability === 0 ? '⚠ Sin stock' : `${availability} combos`}
          </span>
        </div>

        {/* Fijos vs opcionales */}
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

      {/* Acciones */}
      <div className="px-4 pb-4 flex gap-2 mt-auto">
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
  const { combos, products: allProducts, isLoading, refresh: loadData } = useCombosPage();
  // ── Estado de UI ──
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Combo | undefined>(undefined);
  const [deleting, setDeleting] = useState<Combo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Derivados ──
  const activeCombos = useMemo(() => combos.filter((c) => c.isActive), [combos]);

  const filtered = useMemo(() => {
    let list = activeCombos;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
      );
    }
    if (filterStatus === 'sin_stock') list = list.filter((c) => c.availability === 0);
    if (filterStatus === 'disponible') list = list.filter((c) => c.availability > 0);
    return list;
  }, [activeCombos, search, filterStatus]);

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
      await loadData();
    } catch {
      toast.error('Error', 'No se pudo eliminar el combo.');
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
              onChange={(v) => setFilterStatus(v)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                availability={combo.availability}
                products={allProducts}
                recetas={[]}
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
        products={allProducts}
        onSuccess={() => loadData()}
        recetas={[]}
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