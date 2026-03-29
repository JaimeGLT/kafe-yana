import React from 'react';
import { clsx } from 'clsx';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Check, X, ArrowRight, Repeat2, SlidersHorizontal } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { HelpTooltip } from '../ui/Tooltip';
import { ConfirmModal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import type { VariacionAtributo, VariacionOpcion, Insumo, AjusteCantidad } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  insumos: Insumo[];
  atributos: VariacionAtributo[];
  onAddAtributo: (productId: string, data: { nombre: string; esRequerido: boolean }) => Promise<VariacionAtributo>;
  onUpdateAtributo: (atributoId: string, data: { nombre: string; esRequerido: boolean }) => Promise<void>;
  onDeleteAtributo: (atributoId: string) => Promise<void>;
  onAddOpcion: (atributoId: string, data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number; ajustesCantidad?: AjusteCantidad[] }) => Promise<void>;
  onUpdateOpcion: (atributoId: string, opcionId: string, data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number; ajustesCantidad?: AjusteCantidad[] }) => Promise<void>;
  onDeleteOpcion: (atributoId: string, opcionId: string) => Promise<void>;
}

// ── Opcion form state ─────────────────────────────────────────────────────────

interface AjusteCantidadRow {
  insumoId: string;
  cantidad: string;
}

interface OpcionFormState {
  nombre: string;
  precioAjuste: string;
  // Mode 1: ingredient substitution
  sustituye: boolean;
  insumoReemplazadoId: string;
  insumoExtraId: string;
  cantidadExtra: string;
  // Mode 2: quantity override (multiple ingredients)
  modificaCantidad: boolean;
  ajustesCantidad: AjusteCantidadRow[];
}

const emptyOpcionForm = (): OpcionFormState => ({
  nombre: '',
  precioAjuste: '0',
  sustituye: false,
  insumoReemplazadoId: '',
  insumoExtraId: '',
  cantidadExtra: '',
  modificaCantidad: false,
  ajustesCantidad: [],
});

const opcionToForm = (opcion: VariacionOpcion): OpcionFormState => ({
  nombre: opcion.nombre,
  precioAjuste: String(opcion.precioAjuste),
  sustituye: !!(opcion.insumoReemplazadoId || opcion.insumoExtraId),
  insumoReemplazadoId: opcion.insumoReemplazadoId ?? '',
  insumoExtraId: opcion.insumoExtraId ?? '',
  cantidadExtra: opcion.cantidadExtra !== undefined ? String(opcion.cantidadExtra) : '',
  modificaCantidad: !!(opcion.ajustesCantidad?.length),
  ajustesCantidad: opcion.ajustesCantidad?.map((a) => ({ insumoId: a.insumoId, cantidad: String(a.cantidad) })) ?? [],
});

// ── Ingredient swap sub-form ──────────────────────────────────────────────────

interface SustitucionFieldsProps {
  form: OpcionFormState;
  setForm: (f: OpcionFormState) => void;
  insumoOptions: { value: string; label: string }[];
  compact?: boolean;
}

const SustitucionFields: React.FC<SustitucionFieldsProps> = ({ form, setForm, insumoOptions, compact }) => {
  const labelClass = compact
    ? 'text-xs font-medium text-coffee-600'
    : 'text-sm font-medium text-coffee-700';

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
      {/* Toggle header */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.sustituye}
          onChange={(e) => setForm({ ...form, sustituye: e.target.checked, insumoReemplazadoId: '', insumoExtraId: '', cantidadExtra: '', modificaCantidad: false, ajustesCantidad: [] })}
          className="mt-0.5 h-4 w-4 rounded border-coffee-300 text-blue-600 focus:ring-blue-400"
        />
        <div>
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
            <Repeat2 className="h-3.5 w-3.5" />
            Esta opción sustituye un ingrediente
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Solo para productos con receta. Ej: "Leche de avena" quita la leche normal de la receta y usa avena en su lugar.
          </p>
        </div>
      </label>

      {/* Swap fields — only visible when toggle is on */}
      {form.sustituye && (
        <div className="space-y-2 pt-1 border-t border-blue-200">
          {/* Visual swap diagram */}
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-white rounded-lg px-3 py-2 border border-blue-100">
            <span className="font-medium">Receta base</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-emerald-700">Con esta opción</span>
          </div>

          {/* Ingredient to REMOVE */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className={clsx(labelClass, 'text-red-700')}>
                1. Ingrediente a quitar de la receta
              </span>
              <HelpTooltip text="El ingrediente que normalmente usa la receta base y que NO se va a usar cuando el cliente elija esta opción. Ej: 'leche entera'." />
            </div>
            <Select
              options={[{ value: '', label: '— Seleccionar ingrediente a quitar… —' }, ...insumoOptions]}
              value={form.insumoReemplazadoId}
              onChange={(v) => setForm({ ...form, insumoReemplazadoId: v })}
            />
          </div>

          {/* Ingredient to USE instead */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className={clsx(labelClass, 'text-emerald-700')}>
                2. Ingrediente a usar en su lugar
              </span>
              <HelpTooltip text="El ingrediente alternativo que se desconta del inventario en vez del original. Ej: 'leche de avena'." />
            </div>
            <Select
              options={[{ value: '', label: '— Seleccionar ingrediente alternativo… —' }, ...insumoOptions]}
              value={form.insumoExtraId}
              onChange={(v) => setForm({ ...form, insumoExtraId: v })}
            />
          </div>

          {/* Quantity of replacement */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className={labelClass}>3. Cantidad del ingrediente alternativo</span>
              <HelpTooltip text="Cuántas unidades del ingrediente nuevo se usan. Ej: 200 ml de leche de avena." />
            </div>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.cantidadExtra}
              onChange={(e) => setForm({ ...form, cantidadExtra: e.target.value })}
              placeholder="Ej: 200"
              disabled={!form.insumoExtraId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Quantity-override sub-form ────────────────────────────────────────────────

interface ModificaCantidadFieldsProps {
  form: OpcionFormState;
  setForm: (f: OpcionFormState) => void;
  insumoOptions: { value: string; label: string }[];
  compact?: boolean;
}

const ModificaCantidadFields: React.FC<ModificaCantidadFieldsProps> = ({ form, setForm, insumoOptions, compact }) => {
  const labelClass = compact ? 'text-xs font-medium text-coffee-600' : 'text-sm font-medium text-coffee-700';

  const addRow = () =>
    setForm({ ...form, ajustesCantidad: [...form.ajustesCantidad, { insumoId: '', cantidad: '' }] });

  const removeRow = (i: number) =>
    setForm({ ...form, ajustesCantidad: form.ajustesCantidad.filter((_, idx) => idx !== i) });

  const updateRow = (i: number, field: keyof AjusteCantidadRow, value: string) => {
    const rows = form.ajustesCantidad.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
    setForm({ ...form, ajustesCantidad: rows });
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-3">
      {/* Toggle header */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.modificaCantidad}
          onChange={(e) =>
            setForm({
              ...form,
              modificaCantidad: e.target.checked,
              ajustesCantidad: e.target.checked ? [{ insumoId: '', cantidad: '' }] : [],
              // clear the other mode
              sustituye: false,
              insumoReemplazadoId: '',
              insumoExtraId: '',
              cantidadExtra: '',
            })
          }
          className="mt-0.5 h-4 w-4 rounded border-coffee-300 text-emerald-600 focus:ring-emerald-400"
        />
        <div>
          <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Esta opción modifica la cantidad de un ingrediente
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Solo para productos con receta. Ej: "Grande" usa 300 ml de leche en vez de 200 ml.
          </p>
        </div>
      </label>

      {/* Ingredient rows — only visible when toggle is on */}
      {form.modificaCantidad && (
        <div className="space-y-2 pt-1 border-t border-emerald-200">
          {form.ajustesCantidad.map((row, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                {i === 0 && (
                  <span className={clsx(labelClass, 'text-emerald-700 block mb-1')}>
                    Ingrediente a modificar
                  </span>
                )}
                <Select
                  options={[{ value: '', label: '— Seleccionar… —' }, ...insumoOptions]}
                  value={row.insumoId}
                  onChange={(v) => updateRow(i, 'insumoId', v)}
                />
              </div>
              <div className="w-28 shrink-0">
                {i === 0 && (
                  <span className={clsx(labelClass, 'block mb-1')}>Nueva cantidad</span>
                )}
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={row.cantidad}
                  onChange={(e) => updateRow(i, 'cantidad', e.target.value)}
                  placeholder="Ej: 300"
                  disabled={!row.insumoId}
                />
              </div>
              {form.ajustesCantidad.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="mb-0.5 p-1.5 rounded hover:bg-red-100 text-coffee-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir otro ingrediente
          </button>
        </div>
      )}
    </div>
  );
};

// ── Opcion display row (read mode) ────────────────────────────────────────────

interface OpcionRowProps {
  opcion: VariacionOpcion;
  atributoId: string;
  insumoOptions: { value: string; label: string }[];
  onDelete: (opcionId: string) => void;
  onUpdateOpcion: (atributoId: string, opcionId: string, data: { nombre: string; precioAjuste: number; insumoReemplazadoId?: string; insumoExtraId?: string; cantidadExtra?: number }) => void;
}

const OpcionRow: React.FC<OpcionRowProps> = ({ opcion, atributoId, insumoOptions, onDelete, onUpdateOpcion }) => {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<OpcionFormState>(opcionToForm(opcion));

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.warning('Campo requerido', 'El nombre de la opción es obligatorio.');
      return;
    }
    const ajustesCantidad = form.modificaCantidad
      ? form.ajustesCantidad
          .filter((r) => r.insumoId && r.cantidad)
          .map((r) => ({ insumoId: r.insumoId, cantidad: parseFloat(r.cantidad) }))
      : undefined;
    await onUpdateOpcion(atributoId, opcion.id, {
      nombre: form.nombre.trim(),
      precioAjuste: parseFloat(form.precioAjuste) || 0,
      insumoReemplazadoId: form.sustituye && form.insumoReemplazadoId ? form.insumoReemplazadoId : undefined,
      insumoExtraId: form.sustituye && form.insumoExtraId ? form.insumoExtraId : undefined,
      cantidadExtra: form.sustituye && form.cantidadExtra ? parseFloat(form.cantidadExtra) : undefined,
      ajustesCantidad: ajustesCantidad?.length ? ajustesCantidad : undefined,
    });
    setEditing(false);
    toast.success('Opción actualizada');
  };

  // Find insumo names for display
  const insumoQuitarNombre = opcion.insumoReemplazadoId
    ? insumoOptions.find((o) => o.value === opcion.insumoReemplazadoId)?.label
    : null;
  const insumoUsarNombre = opcion.insumoExtraId
    ? insumoOptions.find((o) => o.value === opcion.insumoExtraId)?.label
    : null;
  const ajustesNombres = opcion.ajustesCantidad?.map((a) => ({
    nombre: insumoOptions.find((o) => o.value === a.insumoId)?.label ?? a.insumoId,
    cantidad: a.cantidad,
  })) ?? [];

  if (!editing) {
    return (
      <div className="flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-coffee-50 group">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-coffee-800">{opcion.nombre}</span>
            {opcion.precioAjuste !== 0 && (
              <span className={clsx(
                'text-xs font-semibold px-1.5 py-0.5 rounded',
                opcion.precioAjuste > 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              )}>
                {opcion.precioAjuste > 0 ? '+' : ''}{opcion.precioAjuste} Bs.
              </span>
            )}
          </div>
          {/* Swap summary */}
          {insumoQuitarNombre && insumoUsarNombre && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Repeat2 className="h-3 w-3 shrink-0" />
              Quita <strong>{insumoQuitarNombre}</strong>
              <ArrowRight className="h-3 w-3 shrink-0" />
              usa <strong>{insumoUsarNombre}</strong>
              {opcion.cantidadExtra && ` (${opcion.cantidadExtra})`}
            </p>
          )}
          {/* Quantity-override summary */}
          {ajustesNombres.length > 0 && (
            <div className="space-y-0.5">
              {ajustesNombres.map((a, i) => (
                <p key={i} className="text-xs text-emerald-700 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3 shrink-0" />
                  <strong>{a.nombre}</strong>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  {a.cantidad}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => { setForm(opcionToForm(opcion)); setEditing(true); }}
            className="p-1 rounded hover:bg-coffee-200 text-coffee-500 hover:text-coffee-700 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(opcion.id)}
            className="p-1 rounded hover:bg-red-100 text-coffee-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-coffee-200 rounded-lg p-3 bg-coffee-50 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Nombre de la opción"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Grande, Caliente, Avena…"
          autoFocus
        />
        <div>
          <div className="flex items-center gap-1 mb-1">
            <label className="text-sm font-medium text-coffee-700">Ajuste de precio (Bs.)</label>
            <HelpTooltip text="Se suma al precio base del producto. Usa positivo para encarecer (ej: +5 para tamaño grande) y negativo para abaratar (ej: -3 para tamaño pequeño). Escribe 0 si el precio no cambia." />
          </div>
          <input
            type="number"
            step="0.01"
            value={form.precioAjuste}
            onChange={(e) => setForm({ ...form, precioAjuste: e.target.value })}
            className="block w-full rounded-lg border border-coffee-200 hover:border-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent px-4 py-2.5 text-sm text-coffee-900 bg-white"
          />
        </div>
      </div>

      <SustitucionFields form={form} setForm={setForm} insumoOptions={insumoOptions} />
      <ModificaCantidadFields form={form} setForm={setForm} insumoOptions={insumoOptions} />

      <div className="flex gap-2 justify-end pt-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
        </Button>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave}>
          <Check className="h-3.5 w-3.5 mr-1" /> Guardar
        </Button>
      </div>
    </div>
  );
};

// ── New opcion inline form ────────────────────────────────────────────────────

interface NuevaOpcionFormProps {
  atributoId: string;
  form: OpcionFormState;
  setForm: (f: OpcionFormState) => void;
  insumoOptions: { value: string; label: string }[];
  onAdd: () => void;
}

const NuevaOpcionForm: React.FC<NuevaOpcionFormProps> = ({ form, setForm, insumoOptions, onAdd }) => (
  <div className="mt-3 border-t border-coffee-100 pt-3 space-y-3">
    <p className="text-xs font-semibold text-coffee-500 uppercase tracking-wider">+ Nueva opción</p>

    <div className="grid grid-cols-2 gap-2">
      <Input
        placeholder="Nombre de la opción (Ej: Grande)"
        value={form.nombre}
        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
      />
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label className="text-xs font-medium text-coffee-600">Ajuste de precio (Bs.)</label>
          <HelpTooltip
            text="Se suma al precio base. Positivo = más caro (ej: +5 para grande). Negativo = más barato (ej: -3 para pequeño). Deja en 0 si el precio no cambia."
            position="top"
          />
        </div>
        <input
          type="number"
          step="0.01"
          value={form.precioAjuste}
          onChange={(e) => setForm({ ...form, precioAjuste: e.target.value })}
          className="block w-full rounded-lg border border-coffee-200 hover:border-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent px-3 py-2 text-sm text-coffee-900 bg-white"
        />
      </div>
    </div>

    <SustitucionFields form={form} setForm={setForm} insumoOptions={insumoOptions} compact />
    <ModificaCantidadFields form={form} setForm={setForm} insumoOptions={insumoOptions} compact />

    <Button
      size="sm"
      className="bg-amber-600 hover:bg-amber-700 text-white"
      leftIcon={<Plus className="h-4 w-4" />}
      onClick={onAdd}
    >
      Añadir opción
    </Button>
  </div>
);

// ── Main Modal ────────────────────────────────────────────────────────────────

export const VariacionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  productId,
  productName,
  insumos,
  atributos,
  onAddAtributo,
  onUpdateAtributo,
  onDeleteAtributo,
  onAddOpcion,
  onUpdateOpcion,
  onDeleteOpcion,
}) => {

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [showAddAtributo, setShowAddAtributo] = React.useState(false);
  const [newAtributoNombre, setNewAtributoNombre] = React.useState('');
  const [newAtributoRequerido, setNewAtributoRequerido] = React.useState(false);

  const [editingAtributoId, setEditingAtributoId] = React.useState<string | null>(null);
  const [editAtributoNombre, setEditAtributoNombre] = React.useState('');
  const [editAtributoRequerido, setEditAtributoRequerido] = React.useState(false);

  const [newOpcionForms, setNewOpcionForms] = React.useState<Record<string, OpcionFormState>>({});

  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    type: 'atributo' | 'opcion';
    atributoId: string;
    opcionId?: string;
    nombre: string;
  } | null>(null);

  const insumoOptions = React.useMemo(
    () => insumos.filter((i) => i.isActive).map((i) => ({ value: i.id, label: i.name })),
    [insumos]
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddAtributo = async () => {
    if (!newAtributoNombre.trim()) {
      toast.warning('Campo requerido', 'El nombre del grupo es obligatorio.');
      return;
    }
    const nuevo = await onAddAtributo(productId, { nombre: newAtributoNombre.trim(), esRequerido: newAtributoRequerido });
    setExpanded((prev) => new Set([...prev, nuevo.id]));
    setNewAtributoNombre('');
    setNewAtributoRequerido(false);
    setShowAddAtributo(false);
    toast.success('Grupo creado', `"${nuevo.nombre}" añadido.`);
  };

  const startEditAtributo = (a: VariacionAtributo) => {
    setEditingAtributoId(a.id);
    setEditAtributoNombre(a.nombre);
    setEditAtributoRequerido(a.esRequerido);
  };

  const handleSaveAtributo = async (id: string) => {
    if (!editAtributoNombre.trim()) {
      toast.warning('Campo requerido', 'El nombre del grupo es obligatorio.');
      return;
    }
    await onUpdateAtributo(id, { nombre: editAtributoNombre.trim(), esRequerido: editAtributoRequerido });
    setEditingAtributoId(null);
    toast.success('Grupo actualizado');
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'atributo') {
      await onDeleteAtributo(deleteConfirm.atributoId);
      toast.success('Grupo eliminado');
    } else if (deleteConfirm.opcionId) {
      await onDeleteOpcion(deleteConfirm.atributoId, deleteConfirm.opcionId);
      toast.success('Opción eliminada');
    }
    setDeleteConfirm(null);
  };

  const getOrInitForm = (atributoId: string) => newOpcionForms[atributoId] ?? emptyOpcionForm();
  const setOpcionForm = (atributoId: string, form: OpcionFormState) =>
    setNewOpcionForms((prev) => ({ ...prev, [atributoId]: form }));

  const handleAddOpcion = async (atributoId: string) => {
    const form = getOrInitForm(atributoId);
    if (!form.nombre.trim()) {
      toast.warning('Campo requerido', 'El nombre de la opción es obligatorio.');
      return;
    }
    const ajustesCantidad = form.modificaCantidad
      ? form.ajustesCantidad
          .filter((r) => r.insumoId && r.cantidad)
          .map((r) => ({ insumoId: r.insumoId, cantidad: parseFloat(r.cantidad) }))
      : undefined;
    await onAddOpcion(atributoId, {
      nombre: form.nombre.trim(),
      precioAjuste: parseFloat(form.precioAjuste) || 0,
      insumoReemplazadoId: form.sustituye && form.insumoReemplazadoId ? form.insumoReemplazadoId : undefined,
      insumoExtraId: form.sustituye && form.insumoExtraId ? form.insumoExtraId : undefined,
      cantidadExtra: form.sustituye && form.cantidadExtra ? parseFloat(form.cantidadExtra) : undefined,
      ajustesCantidad: ajustesCantidad?.length ? ajustesCantidad : undefined,
    });
    setOpcionForm(atributoId, emptyOpcionForm());
    toast.success('Opción añadida');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Variaciones: ${productName}`} size="xl">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          {/* Concept explainer — always visible */}
          <div className="rounded-lg bg-coffee-50 border border-coffee-200 px-4 py-3 text-sm text-coffee-700 space-y-1">
            <p className="font-semibold text-coffee-800">¿Cómo funcionan las variaciones?</p>
            <p>
              Un <strong>grupo</strong> es una categoría de personalización (Ej: <em>Tamaño</em>, <em>Temperatura</em>, <em>Tipo de leche</em>).
              Dentro de cada grupo defines las <strong>opciones</strong> (Ej: Pequeño / Mediano / Grande).
            </p>
            <p>
              Cada opción puede ajustar el precio y, si el producto tiene receta, puede <strong>sustituir un ingrediente</strong> por otro (Ej: leche normal → leche de avena).
            </p>
          </div>

          {/* Empty state */}
          {atributos.length === 0 && !showAddAtributo && (
            <div className="text-center py-6 text-coffee-400">
              <p className="text-sm">Este producto no tiene grupos de variación aún.</p>
              <p className="text-xs mt-1">Empieza añadiendo un grupo como "Tamaño" o "Tipo de leche".</p>
            </div>
          )}

          {/* Atributo list */}
          {atributos.map((atributo) => (
            <div key={atributo.id} className="border border-coffee-200 rounded-xl overflow-hidden">
              {/* Atributo header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-coffee-50">
                <button
                  onClick={() => toggleExpand(atributo.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {expanded.has(atributo.id)
                    ? <ChevronDown className="h-4 w-4 text-coffee-500 shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-coffee-500 shrink-0" />}

                  {editingAtributoId === atributo.id ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editAtributoNombre}
                        onChange={(e) => setEditAtributoNombre(e.target.value)}
                        className="flex-1 rounded-lg border border-coffee-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500"
                        autoFocus
                      />
                      <label className="flex items-center gap-1 text-sm text-coffee-600 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={editAtributoRequerido}
                          onChange={(e) => setEditAtributoRequerido(e.target.checked)}
                          className="h-4 w-4 text-coffee-500 rounded"
                        />
                        Requerido
                      </label>
                      <button onClick={() => handleSaveAtributo(atributo.id)} className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-700">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingAtributoId(null)} className="p-1 rounded hover:bg-coffee-200 text-coffee-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-coffee-900 text-sm">{atributo.nombre}</span>
                      {atributo.esRequerido ? (
                        <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                          Obligatorio
                        </span>
                      ) : (
                        <span className="text-xs bg-coffee-100 text-coffee-500 rounded-full px-2 py-0.5">
                          Opcional
                        </span>
                      )}
                      <span className="text-xs text-coffee-400 ml-auto">
                        {atributo.opciones.length} opción{atributo.opciones.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  )}
                </button>

                {editingAtributoId !== atributo.id && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditAtributo(atributo)} className="p-1.5 rounded-lg hover:bg-coffee-200 text-coffee-500 hover:text-coffee-700 transition-colors">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'atributo', atributoId: atributo.id, nombre: atributo.nombre })} className="p-1.5 rounded-lg hover:bg-red-100 text-coffee-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Opciones */}
              {expanded.has(atributo.id) && (
                <div className="px-4 py-3 space-y-1 border-t border-coffee-100">
                  {atributo.opciones.filter((o) => o.isActive).length === 0 && (
                    <p className="text-xs text-coffee-400 py-1 italic">
                      Sin opciones aún. Usa el formulario de abajo para añadir la primera.
                    </p>
                  )}
                  {atributo.opciones.filter((o) => o.isActive).map((opcion) => (
                    <OpcionRow
                      key={opcion.id}
                      opcion={opcion}
                      atributoId={atributo.id}
                      insumoOptions={insumoOptions}
                      onDelete={(opcionId) =>
                        setDeleteConfirm({ type: 'opcion', atributoId: atributo.id, opcionId, nombre: opcion.nombre })
                      }
                      onUpdateOpcion={onUpdateOpcion}
                    />
                  ))}

                  <NuevaOpcionForm
                    atributoId={atributo.id}
                    form={getOrInitForm(atributo.id)}
                    setForm={(f) => setOpcionForm(atributo.id, f)}
                    insumoOptions={insumoOptions}
                    onAdd={() => handleAddOpcion(atributo.id)}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add atributo form */}
          {showAddAtributo ? (
            <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-3">
              <div>
                <p className="text-sm font-semibold text-coffee-800">Nuevo grupo de variación</p>
                <p className="text-xs text-coffee-500 mt-0.5">
                  Un grupo agrupa opciones del mismo tipo. Ej: el grupo "Tamaño" contiene Pequeño, Mediano, Grande.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre del grupo"
                  placeholder="Ej: Tamaño, Temperatura, Tipo de leche…"
                  value={newAtributoNombre}
                  onChange={(e) => setNewAtributoNombre(e.target.value)}
                  autoFocus
                />
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2 py-2.5">
                    <input
                      type="checkbox"
                      id="nuevo-atributo-requerido"
                      checked={newAtributoRequerido}
                      onChange={(e) => setNewAtributoRequerido(e.target.checked)}
                      className="h-4 w-4 text-coffee-500 rounded"
                    />
                    <label htmlFor="nuevo-atributo-requerido" className="text-sm font-medium text-coffee-700 flex items-center gap-1">
                      El cliente debe elegir obligatoriamente
                      <HelpTooltip text="Si está marcado, el cajero no podrá añadir este producto al carrito sin elegir una opción de este grupo. Ej: el tamaño siempre debe seleccionarse." />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowAddAtributo(false); setNewAtributoNombre(''); setNewAtributoRequerido(false); }}>
                  Cancelar
                </Button>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleAddAtributo}>
                  Crear grupo
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddAtributo(true)}
              className="w-full border-dashed"
            >
              Añadir grupo de variación
            </Button>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-coffee-100 mt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm?.type === 'atributo' ? 'Eliminar grupo' : 'Eliminar opción'}
        message={`¿Estás seguro de eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
};
