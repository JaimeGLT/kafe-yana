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
import {
  useProductosCanjeables,
  type Availability,
  type CatalogProduct,
  type RedeemableProduct,
} from '../../hooks/useProductosCanjeables';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVAILABILITY_LABELS: Record<Availability, string> = {
  mesas: 'Mesas',
  para_llevar: 'Para llevar',
  ambos: 'Mesas y para llevar',
};

function categoryBadgeStyle(color: string): React.CSSProperties {
  if (!color) return { backgroundColor: '#f5f0eb', color: '#6b4f3a', borderColor: '#d4bfaa' };
  return {
    backgroundColor: `${color}20`,
    color,
    borderColor: `${color}60`,
  };
}

// ─── Product search dropdown ───────────────────────────────────────────────────

interface ProductSearchProps {
  catalog: CatalogProduct[];
  value: CatalogProduct | null;
  onChange: (p: CatalogProduct | null) => void;
  excludeIds: number[];
}

const ProductSearch: React.FC<ProductSearchProps> = ({ catalog, value, onChange, excludeIds }) => {
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
      catalog.filter(
        (p) =>
          !excludeIds.includes(p.id) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [catalog, query, excludeIds],
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
                    <span className="text-xs font-body px-2 py-0.5 rounded-full border" style={categoryBadgeStyle(p.color)}>
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
      disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
    )}
  >
    <span
      className={clsx(
        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
        checked ? 'translate-x-4' : 'translate-x-0',
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
  const { products, catalog, isLoading, error, isSaving, createProduct, updateProduct, deleteProduct } =
    useProductosCanjeables();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RedeemableProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RedeemableProduct | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const usedCatalogIds = useMemo(
    () =>
      products
        .filter((p) => p.id !== editingProduct?.id)
        .map((p) => p.catalogProductId),
    [products, editingProduct],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: RedeemableProduct) => {
    const catalogP = catalog.find((c) => c.id === p.catalogProductId) ?? null;
    setEditingProduct(p);
    setForm({
      selectedProduct: catalogP,
      pointsCost: p.pointsCost,
      availability: p.availability,
      isActive: p.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.selectedProduct) {
      setFormError('Debes seleccionar un producto del catálogo.');
      return;
    }
    if (form.pointsCost <= 0) {
      setFormError('Los puntos necesarios deben ser mayores a 0.');
      return;
    }

    const payload = {
      catalogProductId: form.selectedProduct.id,
      pointsCost: form.pointsCost,
      availability: form.availability,
      isActive: form.isActive,
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Producto actualizado');
      } else {
        await createProduct(payload);
        toast.success('Producto canjeable agregado');
      }
      setModalOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar';
      toast.error(msg);
    }
  };

  const handleToggleActive = async (p: RedeemableProduct) => {
    try {
      await updateProduct(p.id, {
        catalogProductId: p.catalogProductId,
        pointsCost: p.pointsCost,
        availability: p.availability,
        isActive: !p.isActive,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar el estado';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Producto eliminado de la lista de canjeables');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar';
      toast.error(msg);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-6 py-5 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-56 h-56 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-36 h-36 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-sm">Fidelización</span>
            </div>
            <h1 className="text-2xl font-display font-black text-white leading-tight mb-1">
              Productos{' '}
              <span className="text-yellow-300">canjeables</span>
            </h1>
            <p className="text-coffee-200 font-body text-xs">
              Define qué productos pueden canjearse con puntos en el punto de venta
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-yellow-400 text-coffee-900 font-body font-semibold text-sm hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar producto canjeable</span>
              <span className="sm:hidden">Agregar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ERROR ═══════════════════════ */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-sm font-body text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ═══════════════════════ PRODUCT LIST ═══════════════════════ */}
      <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-coffee-500" />
            <h2 className="font-display font-semibold text-coffee-900">
              Lista de productos canjeables
            </h2>
            {!isLoading && (
              <span className="text-xs font-body bg-coffee-100 text-coffee-600 font-semibold px-2 py-0.5 rounded-full">
                {products.length}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-600 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
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
          <>
            {/* Cards — móvil */}
            <div className="md:hidden divide-y divide-coffee-50">
              {products.map((p) => (
                <div
                  key={p.id}
                  className={clsx(
                    'px-4 py-3 flex items-center justify-between gap-3',
                    !p.isActive && 'bg-gray-50/60',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={clsx('font-body font-semibold text-sm', !p.isActive ? 'text-coffee-400' : 'text-coffee-900')}>
                        {p.catalogProductName}
                      </span>
                      <span className="text-xs font-body font-semibold px-2 py-0.5 rounded-full border" style={categoryBadgeStyle(p.catalogProductColor)}>
                        {p.catalogProductCategory}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-coffee-500">
                      <span><strong className="text-coffee-800">{p.pointsCost}</strong> pts</span>
                      <span>·</span>
                      <span>{AVAILABILITY_LABELS[p.availability]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle checked={p.isActive} onChange={() => handleToggleActive(p)} disabled={isSaving} />
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg text-coffee-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla — md+ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-coffee-50">
                    <th className="px-5 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">Producto</th>
                    <th className="px-3 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">Categoría</th>
                    <th className="px-3 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">Puntos</th>
                    <th className="px-3 py-3 text-left text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">Disponible en</th>
                    <th className="px-3 py-3 text-center text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">Estado</th>
                    <th className="px-3 py-3 text-right text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-50">
                  {products.map((p) => (
                    <tr key={p.id} className={clsx('transition-colors', !p.isActive ? 'bg-gray-50/60' : 'hover:bg-coffee-50/40')}>
                      <td className="px-5 py-4">
                        <span className={clsx('font-body font-semibold text-sm', !p.isActive ? 'text-coffee-400' : 'text-coffee-900')}>
                          {p.catalogProductName}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-xs font-body font-semibold px-2 py-0.5 rounded-full border" style={categoryBadgeStyle(p.catalogProductColor)}>
                          {p.catalogProductCategory}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="font-display font-bold text-coffee-900 text-sm">{p.pointsCost}</span>
                        <span className="text-xs font-body text-coffee-400 ml-1">pts</span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="text-xs font-body text-coffee-600">{AVAILABILITY_LABELS[p.availability]}</span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-center">
                          <Toggle checked={p.isActive} onChange={() => handleToggleActive(p)} disabled={isSaving} />
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-2 rounded-xl text-coffee-400 hover:text-coffee-700 hover:bg-coffee-100 transition-colors" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="p-2 rounded-xl text-coffee-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════ ADD / EDIT MODAL ═══════════════════════ */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Editar producto canjeable' : 'Agregar producto canjeable'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingProduct ? 'Guardar cambios' : 'Agregar'}
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

          <div>
            <label className="block text-sm font-body font-semibold text-coffee-700 mb-1.5">
              Producto <span className="text-red-500">*</span>
            </label>
            <ProductSearch
              catalog={catalog}
              value={form.selectedProduct}
              onChange={(p) => { setForm((f) => ({ ...f, selectedProduct: p })); setFormError(null); }}
              excludeIds={usedCatalogIds}
            />
            <p className="mt-1.5 text-xs font-body text-coffee-400">
              Solo muestra productos del catálogo que no estén ya en la lista
            </p>
          </div>

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
                      : 'bg-white border-coffee-200 text-coffee-700 hover:border-coffee-400',
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
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar producto canjeable"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? 'Eliminando...' : 'Eliminar'}
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
