import React, { useState, useMemo, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Gift, Plus, Search, Pencil, Trash2, AlertTriangle,
  CheckCircle, XCircle, ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Availability = 'mesas' | 'para_llevar' | 'ambos';

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  isActive: boolean; // reflects current inventory status
}

interface RedeemableProduct {
  id: string;
  catalogProductId: string;
  catalogProductName: string;
  catalogProductCategory: string;
  catalogProductAvailable: boolean; // false when inventory product was deactivated/deleted
  pointsCost: number;
  availability: Availability;
  isActive: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CATALOG: CatalogProduct[] = [
  { id: 'cp1', name: 'Café Americano', category: 'Bebidas', isActive: true },
  { id: 'cp2', name: 'Café con Leche', category: 'Bebidas', isActive: true },
  { id: 'cp3', name: 'Té de Hierbas', category: 'Bebidas', isActive: true },
  { id: 'cp4', name: 'Limonada Fresca', category: 'Bebidas', isActive: true },
  { id: 'cp5', name: 'Cold Brew', category: 'Bebidas', isActive: true },
  { id: 'cp6', name: 'Brownie de Chocolate', category: 'Postres', isActive: true },
  { id: 'cp7', name: 'Cookie Artesanal', category: 'Postres', isActive: true },
  { id: 'cp8', name: 'Tarta de Fresas', category: 'Postres', isActive: true },
  { id: 'cp9', name: 'Empanada de Queso', category: 'Snacks', isActive: true },
  { id: 'cp10', name: 'Tostada con Mantequilla', category: 'Snacks', isActive: true },
  { id: 'cp11', name: 'Almuerzo del Día', category: 'Almuerzos', isActive: true },
  { id: 'cp12', name: 'Wrap de Pollo', category: 'Almuerzos', isActive: false }, // desactivado en inventario
];

const INITIAL_REDEEMABLES: RedeemableProduct[] = [
  {
    id: 'r1', catalogProductId: 'cp1', catalogProductName: 'Café Americano',
    catalogProductCategory: 'Bebidas', catalogProductAvailable: true,
    pointsCost: 20, availability: 'ambos', isActive: true,
  },
  {
    id: 'r2', catalogProductId: 'cp3', catalogProductName: 'Té de Hierbas',
    catalogProductCategory: 'Bebidas', catalogProductAvailable: true,
    pointsCost: 15, availability: 'mesas', isActive: true,
  },
  {
    id: 'r3', catalogProductId: 'cp6', catalogProductName: 'Brownie de Chocolate',
    catalogProductCategory: 'Postres', catalogProductAvailable: true,
    pointsCost: 25, availability: 'ambos', isActive: true,
  },
  {
    id: 'r4', catalogProductId: 'cp7', catalogProductName: 'Cookie Artesanal',
    catalogProductCategory: 'Postres', catalogProductAvailable: true,
    pointsCost: 20, availability: 'para_llevar', isActive: false,
  },
  {
    id: 'r5', catalogProductId: 'cp12', catalogProductName: 'Wrap de Pollo',
    catalogProductCategory: 'Almuerzos', catalogProductAvailable: false, // simulates deactivated in inventory
    pointsCost: 45, availability: 'ambos', isActive: false,
  },
  {
    id: 'r6', catalogProductId: 'cp11', catalogProductName: 'Almuerzo del Día',
    catalogProductCategory: 'Almuerzos', catalogProductAvailable: true,
    pointsCost: 200, availability: 'mesas', isActive: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVAILABILITY_LABELS: Record<Availability, string> = {
  mesas: 'Mesas',
  para_llevar: 'Para llevar',
  ambos: 'Mesas y para llevar',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Bebidas': 'bg-blue-50 text-blue-700 border-blue-200',
  'Postres': 'bg-pink-50 text-pink-700 border-pink-200',
  'Snacks': 'bg-amber-50 text-amber-700 border-amber-200',
  'Almuerzos': 'bg-green-50 text-green-700 border-green-200',
};

function categoryBadge(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-coffee-50 text-coffee-600 border-coffee-200';
}

let nextId = 10;
function genId() { return `r${nextId++}`; }

// ─── Product search dropdown ───────────────────────────────────────────────────

interface ProductSearchProps {
  value: CatalogProduct | null;
  onChange: (p: CatalogProduct | null) => void;
  excludeIds: string[];
}

const ProductSearch: React.FC<ProductSearchProps> = ({ value, onChange, excludeIds }) => {
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () =>
      MOCK_CATALOG.filter(
        (p) =>
          p.isActive &&
          !excludeIds.includes(p.id) &&
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [query, excludeIds]
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-coffee-200 px-3 py-2.5 focus-within:ring-2 focus-within:ring-coffee-400 transition-colors bg-white">
        <Search className="w-4 h-4 text-coffee-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar producto del catálogo..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
            setOpen(true);
          }}
          className="flex-1 text-sm font-body text-coffee-900 placeholder-coffee-300 focus:outline-none bg-transparent"
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(null); setQuery(''); setOpen(false); }}
            className="text-coffee-300 hover:text-coffee-500"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-coffee-100 shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm font-body text-coffee-400 text-center">
              No hay productos disponibles
            </div>
          ) : (
            <ul className="max-h-52 overflow-y-auto divide-y divide-coffee-50">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(p); setQuery(p.name); setOpen(false); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-coffee-50 transition-colors text-left"
                  >
                    <span className="text-sm font-body font-medium text-coffee-900">{p.name}</span>
                    <span className={clsx('text-xs font-body px-2 py-0.5 rounded-full border', categoryBadge(p.category))}>
                      {p.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={clsx(
      'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent',
      'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-coffee-400 focus:ring-offset-1',
      checked ? 'bg-coffee-500' : 'bg-gray-300',
      disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
    )}
  >
    <span
      className={clsx(
        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
        checked ? 'translate-x-4' : 'translate-x-0'
      )}
    />
  </button>
);

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  selectedProduct: CatalogProduct | null;
  pointsCost: number;
  availability: Availability;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  selectedProduct: null,
  pointsCost: 20,
  availability: 'ambos',
  isActive: true,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const ProductosCanjeablesPage: React.FC = () => {
  const [products, setProducts] = useState<RedeemableProduct[]>(INITIAL_REDEEMABLES);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // IDs already added (excluding the one being edited)
  const usedCatalogIds = useMemo(
    () =>
      products
        .filter((p) => p.id !== editingId)
        .map((p) => p.catalogProductId),
    [products, editingId]
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: RedeemableProduct) => {
    const catalogP = MOCK_CATALOG.find((c) => c.id === p.catalogProductId) ?? null;
    setEditingId(p.id);
    setForm({
      selectedProduct: catalogP,
      pointsCost: p.pointsCost,
      availability: p.availability,
      isActive: p.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.selectedProduct) {
      setFormError('Debes seleccionar un producto del catálogo.');
      return;
    }
    if (form.pointsCost <= 0) {
      setFormError('Los puntos necesarios deben ser mayores a 0.');
      return;
    }

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                catalogProductId: form.selectedProduct!.id,
                catalogProductName: form.selectedProduct!.name,
                catalogProductCategory: form.selectedProduct!.category,
                catalogProductAvailable: form.selectedProduct!.isActive,
                pointsCost: form.pointsCost,
                availability: form.availability,
                isActive: form.isActive,
              }
            : p
        )
      );
      toast.success('Producto actualizado');
    } else {
      const newItem: RedeemableProduct = {
        id: genId(),
        catalogProductId: form.selectedProduct.id,
        catalogProductName: form.selectedProduct.name,
        catalogProductCategory: form.selectedProduct.category,
        catalogProductAvailable: form.selectedProduct.isActive,
        pointsCost: form.pointsCost,
        availability: form.availability,
        isActive: form.isActive,
      };
      setProducts((prev) => [newItem, ...prev]);
      toast.success('Producto canjeable agregado');
    }

    setModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    if (!p.catalogProductAvailable && !p.isActive) {
      toast.error('No se puede activar', 'El producto ya no está disponible en el catálogo.');
      return;
    }
    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, isActive: !x.isActive } : x))
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    toast.success('Producto eliminado de la lista de canjeables');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const unavailableCount = products.filter((p) => !p.catalogProductAvailable).length;

  return (
    <MainLayout>
      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Fidelización</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
              Productos{' '}
              <span className="text-yellow-300">canjeables</span>
            </h1>
            <p className="text-coffee-200 font-body text-sm">
              Define qué productos pueden canjearse con puntos en el punto de venta
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {unavailableCount > 0 && (
              <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 text-amber-200 px-3 py-2 rounded-xl text-xs font-body">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {unavailableCount} producto{unavailableCount > 1 ? 's' : ''} sin disponibilidad
              </div>
            )}
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Agregar producto canjeable
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ PRODUCT LIST ═══════════════════════ */}
      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-coffee-500" />
            <h2 className="font-display font-semibold text-coffee-900">
              Lista de productos canjeables
            </h2>
            <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
              {products.length}
            </span>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
              <Gift className="w-7 h-7 text-coffee-300" />
            </div>
            <p className="font-display font-semibold text-coffee-700 mb-1">Sin productos canjeables</p>
            <p className="text-sm font-body text-coffee-400 mb-4">
              Agrega los primeros productos que tus clientes podrán canjear con puntos
            </p>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coffee-500 text-white font-body font-semibold text-sm hover:bg-coffee-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar primer producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-coffee-50">
                  <th className="px-5 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">
                    Producto
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">
                    Categoría
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">
                    Puntos
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide hidden md:table-cell">
                    Disponible en
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={clsx(
                      'transition-colors',
                      !p.isActive || !p.catalogProductAvailable
                        ? 'bg-gray-50/60'
                        : 'hover:bg-coffee-50/40'
                    )}
                  >
                    {/* Product name + catalog warning */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={clsx(
                            'font-body font-semibold text-sm',
                            !p.catalogProductAvailable ? 'text-coffee-400 line-through' : 'text-coffee-900'
                          )}
                        >
                          {p.catalogProductName}
                        </span>
                        {!p.catalogProductAvailable && (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                            <span className="text-xs font-body text-amber-600">
                              Este producto ya no está disponible en el catálogo
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-4">
                      <span className={clsx('text-xs font-body font-semibold px-2 py-0.5 rounded-full border', categoryBadge(p.catalogProductCategory))}>
                        {p.catalogProductCategory}
                      </span>
                    </td>

                    {/* Points */}
                    <td className="px-3 py-4">
                      <span className="font-display font-bold text-coffee-900 text-sm">
                        {p.pointsCost}
                      </span>
                      <span className="text-xs font-body text-coffee-400 ml-1">pts</span>
                    </td>

                    {/* Availability */}
                    <td className="px-3 py-4 hidden md:table-cell">
                      <span className="text-xs font-body text-coffee-600">
                        {AVAILABILITY_LABELS[p.availability]}
                      </span>
                    </td>

                    {/* Status toggle */}
                    <td className="px-3 py-4">
                      <div className="flex justify-center">
                        <Toggle
                          checked={p.isActive}
                          onChange={() => handleToggleActive(p.id)}
                          disabled={!p.catalogProductAvailable}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-xl text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-2 rounded-xl text-coffee-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════ ADD / EDIT MODAL ═══════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar producto canjeable' : 'Agregar producto canjeable'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingId ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-body text-red-700">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {/* Product selector */}
          <div>
            <label className="block text-sm font-body font-semibold text-coffee-700 mb-1.5">
              Producto <span className="text-red-500">*</span>
            </label>
            <ProductSearch
              value={form.selectedProduct}
              onChange={(p) => { setForm((f) => ({ ...f, selectedProduct: p })); setFormError(null); }}
              excludeIds={usedCatalogIds}
            />
            <p className="mt-1.5 text-xs font-body text-coffee-400">
              Solo muestra productos activos del catálogo que no estén ya en la lista
            </p>
          </div>

          {/* Points cost */}
          <div>
            <label className="block text-sm font-body font-semibold text-coffee-700 mb-1.5">
              Puntos necesarios para canjearlo <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={form.pointsCost}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setForm((f) => ({ ...f, pointsCost: v }));
                }}
                className="w-32 text-center rounded-xl border border-coffee-200 px-3 py-2 text-lg font-display font-bold text-coffee-900 focus:outline-none focus:ring-2 focus:ring-coffee-400 transition-colors"
              />
              <span className="text-sm font-body text-coffee-500">puntos</span>
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-body font-semibold text-coffee-700 mb-2">
              Disponible en
            </label>
            <div className="flex gap-3 flex-wrap">
              {(['mesas', 'para_llevar', 'ambos'] as Availability[]).map((opt) => (
                <label
                  key={opt}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all',
                    form.availability === opt
                      ? 'bg-coffee-500 border-coffee-500 text-white'
                      : 'bg-white border-coffee-200 text-coffee-700 hover:border-coffee-400'
                  )}
                >
                  <input
                    type="radio"
                    name="availability"
                    value={opt}
                    checked={form.availability === opt}
                    onChange={() => setForm((f) => ({ ...f, availability: opt }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-body font-medium">
                    {AVAILABILITY_LABELS[opt]}
                  </span>
                  {form.availability === opt && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50 border border-coffee-100">
            <div>
              <p className="text-sm font-body font-semibold text-coffee-800">Activo</p>
              <p className="text-xs font-body text-coffee-500 mt-0.5">
                Los productos inactivos no aparecen en el POS como canjeables
              </p>
            </div>
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════ DELETE CONFIRM ═══════════════════════ */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar producto canjeable"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-body text-red-800">
            El producto quedará eliminado de la lista de canjeables. Los puntos de los clientes{' '}
            <strong>no se ven afectados</strong>.
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
};
