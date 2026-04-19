import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Minus, Trash2, Coffee, CheckCircle, Printer,
  CreditCard, Banknote, Smartphone, AlertTriangle,
  FlaskConical, Layers, X, Star, Gift, Search,
  UtensilsCrossed, ChevronLeft, ChevronRight, PenLine, History, ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_POS_DATA } from '../../lib/queries/products.queries';
import { GET_ELABORADO_INGREDIENTES } from '../../lib/queries/elaborados.queries';
import {
  MOCK_CUSTOMERS, MOCK_LOYALTY_PROFILES, MOCK_MILESTONES, MOCK_REWARDS,
} from './posMocks';
import type { ComboDetailItem } from './posMocks';
import { formatCurrency } from '../../utils';
import qrPago from '../../assets/qr-pago.svg';
import type { Product, Category, Customer, Sale, SaleInput, PaymentMethodType, OpcionSeleccionada, VariacionAtributo } from '../../types';
import type { LoyaltyProfile, PointsCalculation, MilestoneReward, Reward } from '../../types/loyalty';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';
import { ElaboradoDetailModal } from '../../components/modals/ElaboradoDetailModal';
import type { ElaboradoIngrediente } from '../../components/modals/ElaboradoDetailModal';
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Tooltip } from '../../components/ui/Tooltip';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════*/
interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];
  precioFinal: number;
  cartKey: string;
  redeemRewardId?: string;  // si está seteado, el ítem fue canjeado (precio 0)
  notes?: string;
}

type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago';

interface Mesa {
  id: string;
  number: number;
  name: string;           // display name e.g. "Mesa 3", "Terraza 1", "Barra"
  status: MesaStatus;
  openedAt?: number;      // timestamp ms
  order: CartItem[];
  customerId?: string;
  tipo?: 'mesa' | 'para_llevar';
}

type ModalView =
  | 'none'
  | 'nueva_mesa'    // create / edit table
  | 'iniciar'       // confirm start table
  | 'detalle'       // table detail (order view)
  | 'review'        // order review before payment
  | 'pago'          // payment
  | 'success'       // done
  | 'para_llevar';  // takeaway / counter sale

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════*/
// const TAX_RATE = 0.18; // reservado para cuando el backend maneje impuestos
const TOTAL_MESAS_INIT = 12;
const PARA_LLEVAR_ID = 'para-llevar';

const PAYMENT_METHODS: { type: PaymentMethodType; label: string; icon: React.ReactNode }[] = [
  { type: 'cash',     label: 'Efectivo',  icon: <Banknote   className="h-5 w-5" /> },
  { type: 'card',     label: 'Tarjeta',   icon: <CreditCard className="h-5 w-5" /> },
  { type: 'transfer', label: 'QR', icon: <Smartphone className="h-5 w-5" /> },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════*/
const formatOpcionLabel = (o: OpcionSeleccionada): string => {
  if (o.insumoBaseNombre && o.insumoNuevoNombre) {
    return `${o.insumoBaseNombre} → ${o.insumoNuevoNombre}${o.ajusteCantidad ? ` (${o.ajusteCantidad})` : ''}`;
  }
  if (o.insumoNuevoNombre && o.tipoAjuste === 'extra') {
    return `+ ${o.insumoNuevoNombre}${o.ajusteCantidad ? ` (${o.ajusteCantidad})` : ''}`;
  }
  return o.opcionNombre;
};

const buildCartKey = (productId: string, opciones?: OpcionSeleccionada[]): string => {
  if (!opciones?.length) return productId;
  const part = [...opciones]
    .sort((a, b) => a.atributoId.localeCompare(b.atributoId))
    .map(o => `${o.atributoId}:${o.opcionId}`)
    .join('|');
  return `${productId}__${part}`;
};

const getProductEmoji = (product: Product): string => {
  const n = product.name.toLowerCase();
  if (n.includes('café') || n.includes('cafe') || n.includes('espresso') || n.includes('latte') || n.includes('capuchino') || n.includes('americano')) return '☕';
  if (n.includes('té') || n.includes('infusión')) return '🍵';
  if (n.includes('jugo') || n.includes('smoothie')) return '🥤';
  if (n.includes('ice') || n.includes('frío')) return '🧋';
  if (n.includes('agua')) return '💧';
  if (n.includes('torta') || n.includes('pastel') || n.includes('brownie')) return '🎂';
  if (n.includes('postre') || n.includes('pie')) return '🍰';
  if (n.includes('galleta') || n.includes('masita') || n.includes('alfajor')) return '🍪';
  if (n.includes('pan') || n.includes('panini') || n.includes('sandwich')) return '🥪';
  if (n.includes('empanada') || n.includes('cuñap')) return '🥐';
  if (n.includes('combo')) return '🎁';
  if (n.includes('desayuno')) return '🍳';
  if (product.tipo === 'elaborado') return '☕';
  return '☕';
};

const initMesas = (): Mesa[] => [
  ...Array.from({ length: TOTAL_MESAS_INIT }, (_, i) => ({
    id: `mesa-${i + 1}`,
    number: i + 1,
    name: `Mesa ${i + 1}`,
    status: 'libre' as MesaStatus,
    order: [],
    tipo: 'mesa' as const,
  })),
  {
    id: PARA_LLEVAR_ID,
    number: 0,
    name: 'Para llevar',
    status: 'libre' as MesaStatus,
    order: [],
    tipo: 'para_llevar' as const,
  },
];

const mesaOrderTotal = (order: CartItem[]) =>
  order.reduce((s, i) => s + i.precioFinal * i.quantity, 0);

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK — drag-to-scroll
═══════════════════════════════════════════════════════════════════════════*/
function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const scrollL  = useRef(0);
  const moved    = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    dragging.current = true;
    moved.current    = false;
    startX.current   = e.pageX - ref.current.offsetLeft;
    scrollL.current  = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 4) moved.current = true;
    ref.current.scrollLeft = scrollL.current - walk;
  };
  const onMouseUp = () => {
    if (!ref.current) return;
    dragging.current = false;
    ref.current.style.cursor = 'grab';
    ref.current.style.userSelect = '';
  };
  const onMouseLeave = onMouseUp;

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, wasDragged: () => moved.current };
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIMER COMPONENT
═══════════════════════════════════════════════════════════════════════════*/

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL OVERLAY
═══════════════════════════════════════════════════════════════════════════*/
const Overlay: React.FC<{ children: React.ReactNode; onClose?: () => void }> = ({ children, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
  >
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT CARD (inside agregar modal)
═══════════════════════════════════════════════════════════════════════════*/
interface ProdCardProps {
  product: Product;
  qty: number;
  unavailable: boolean;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onInfo?: () => void;
  rewardInfo?: { icon: string; pointsCost: number } | null;
  onRedeem?: () => void;
  pointsShortfall?: number | null;
}
const ProdCard: React.FC<ProdCardProps> = ({ product, qty, unavailable, onAdd, onInc, onDec, onInfo, rewardInfo, onRedeem, pointsShortfall }) => (
  <div className={clsx(
    'flex-shrink-0 w-36 sm:w-40 bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col select-none',
    unavailable && 'opacity-50',
  )}>
    {/* Image */}
    <div className="relative h-28 bg-coffee-50 flex items-center justify-center">
      <span className="text-4xl">{getProductEmoji(product)}</span>
      {product.tipo === 'elaborado' && (
        <span className="absolute top-1.5 left-1.5 text-[9px] bg-white text-amber-700 rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5 shadow-sm">
          <FlaskConical className="h-2 w-2" />Elab.
        </span>
      )}
      {product.tipo === 'combo' && onInfo && (
        <button
          onClick={e => { e.stopPropagation(); onInfo(); }}
          className="absolute top-1.5 left-1.5 text-[9px] bg-white text-emerald-700 rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5 shadow-sm hover:bg-emerald-50 transition-colors"
        >
          <Layers className="h-2 w-2" />Ver
        </button>
      )}
      {getAttrCount(product) > 0 && (
        <span className="absolute top-1.5 right-1.5 text-[9px] bg-white text-purple-700 rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5 shadow-sm">
          <Layers className="h-2 w-2" />Var.
        </span>
      )}
      {qty > 0 && (
        <div className="absolute bottom-1.5 right-1.5 h-5 w-5 bg-coffee-800 text-cream text-[10px] font-black rounded-full flex items-center justify-center shadow">
          {qty}
        </div>
      )}
      {rewardInfo && (
        <div className="absolute bottom-1.5 left-1.5 text-[9px] bg-amber-400 text-white rounded-full px-1.5 py-0.5 font-bold flex items-center gap-0.5 shadow">
          <Gift className="h-2 w-2" />{rewardInfo.pointsCost} pts
        </div>
      )}
    </div>
    {/* Info */}
    <div className="px-2.5 pt-2 pb-1 flex-1 flex flex-col">
      <p className="text-xs font-bold text-coffee-900 leading-tight line-clamp-2 font-display flex-1">{product.name}</p>
      <p className="text-sm font-black text-coffee-800 mt-1">{formatCurrency(product.salePrice)}</p>
    </div>
    {/* Controls */}
    <div className="px-2.5 pb-2.5">
      {getAttrCount(product) > 0 ? (
        /* Producto con variaciones: siempre muestra "Agregar" para poder elegir otra variación */
        <button
          disabled={unavailable}
          onClick={onAdd}
          className={clsx(
            'w-full flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all',
            unavailable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95',
          )}
        >
          <Plus className="h-3 w-3" /> Agregar
        </button>
      ) : qty === 0 ? (
        <button
          disabled={unavailable}
          onClick={onAdd}
          className={clsx(
            'w-full flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all',
            unavailable ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95',
          )}
        >
          <Plus className="h-3 w-3" /> Agregar
        </button>
      ) : (
        <div className="flex items-center justify-between bg-coffee-100 rounded-xl overflow-hidden h-8">
          <button onClick={onDec} className="w-8 h-full flex items-center justify-center hover:bg-coffee-200 text-coffee-700 transition-colors">
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-sm font-black text-coffee-900">{qty}</span>
          <button onClick={onInc} className="w-8 h-full flex items-center justify-center hover:bg-coffee-200 text-coffee-700 transition-colors">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
      {rewardInfo && (
        <button
          disabled={pointsShortfall != null}
          onClick={e => { if (pointsShortfall == null) { e.stopPropagation(); onRedeem?.(); } }}
          className={clsx(
            'mt-1.5 w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all border',
            pointsShortfall != null
              ? 'bg-amber-50 border-amber-200 text-amber-300 cursor-not-allowed'
              : 'bg-amber-400 border-amber-400 text-white hover:bg-amber-300 active:scale-95',
          )}
        >
          <Gift className="h-3 w-3" />
          {pointsShortfall != null ? `Te faltan ${pointsShortfall} pts` : `Canjear · ${rewardInfo.pointsCost} pts`}
        </button>
      )}
    </div>
  </div>
);

// tiny helper used inside ProdCard — will be set in parent
let getAttrCount = (_p: Product) => 0;

/* ═══════════════════════════════════════════════════════════════════════════
   REDEEM QTY MODAL — cantidad de canjes para productos sin variaciones
═══════════════════════════════════════════════════════════════════════════*/
interface RedeemQtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  reward: Reward;
  availablePoints: number;
  onConfirm: (qty: number) => void;
}
const RedeemQtyModal: React.FC<RedeemQtyModalProps> = ({ isOpen, onClose, product, reward, availablePoints, onConfirm }) => {
  const [qty, setQty] = React.useState(1);
  const maxQty = Math.max(1, Math.floor(availablePoints / reward.pointsCost));

  React.useEffect(() => { if (isOpen) setQty(1); }, [isOpen]);

  const totalPts  = qty * reward.pointsCost;
  const remaining = availablePoints - totalPts;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Canjear recompensa" size="sm">
      <div className="space-y-4">
        {/* Product info */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-2xl">{getProductEmoji(product)}</span>
          <div>
            <p className="font-semibold text-coffee-900">{product.name}</p>
            <p className="text-xs text-amber-700">{reward.pointsCost} pts por unidad · gratis</p>
          </div>
        </div>

        {/* Qty selector */}
        <div className="flex items-center justify-between bg-coffee-50 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-coffee-700">Cantidad</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-full bg-white border border-coffee-200 flex items-center justify-center disabled:opacity-40 hover:bg-coffee-50 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-lg font-bold text-coffee-900 w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-8 h-8 rounded-full bg-white border border-coffee-200 flex items-center justify-center disabled:opacity-40 hover:bg-coffee-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Points summary */}
        <div className="space-y-1.5 border-t border-coffee-100 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600">Puntos a usar</span>
            <span className="font-semibold text-amber-700">−{totalPts} pts</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-coffee-600">Saldo restante</span>
            <span className="font-semibold text-coffee-900">{remaining} pts</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            leftIcon={<Gift className="h-3.5 w-3.5" />}
            onClick={() => { onConfirm(qty); onClose(); }}
          >
            Canjear{qty > 1 ? ` ${qty}×` : ''} · Gratis
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════*/
export const POSPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [_customers, setCustomers] = useState<Customer[]>([]);
  const [atributos, setAtributos] = useState<VariacionAtributo[]>([]);
  const [comboDetails, setComboDetails] = useState<Record<string, ComboDetailItem[]>>({});
  const [loyaltyProfiles, setLoyaltyProfiles] = useState<LoyaltyProfile[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [milestones, setMilestones] = useState<MilestoneReward[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    setCustomers(MOCK_CUSTOMERS);
    setLoyaltyProfiles(MOCK_LOYALTY_PROFILES);
    setMilestones(MOCK_MILESTONES);
    setRewards(MOCK_REWARDS);

    const loadData = async () => {
      try {
        const data = await gql<{
          elaborados: { nodes: Array<{
            id_Producto: number; unidad_medida: string;
            producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string;
              categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
            variaciones: Array<{ id: number; nombre: string; requerido: boolean;
              opciones: Array<{ id: number; nombre: string; ajustePrecio: number; id_variacion: number;
                ajustes: Array<{ tipoAjuste: string; cantidad: number; insumoBase: { id: number; nombre: string } | null; insumoNuevo: { id: number; nombre: string } | null }> }> }>;
            receta: { detalles: Array<{ cantidad: number; insumo: { nombre: string; unidad_min_uso: string } | null }> } | null;
          }> };
          comprados: { nodes: Array<{
            costo_compra: number; stock_actual: number; disponible: boolean;
            producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string;
              categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
          }> };
          combos: { nodes: Array<{
            cantidadProducible: number;
            producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string };
            detalles: Array<{ producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string }; cantidad: number; opcional: boolean }>;
          }> };
          categorias: { nodes: Array<{ id: number; nombre: string; descripcion: string; color: string; estado: boolean }> };
        }>(GET_POS_DATA);

        // Build category map from backend — keyed by string ID
        const catMap = new Map<string, Category>();
        data.categorias.nodes.forEach(n => {
          catMap.set(String(n.id), {
            id: String(n.id), name: n.nombre, description: n.descripcion,
            color: n.color || '#92400e', sortOrder: 0, isActive: n.estado,
            createdAt: new Date(), updatedAt: new Date(),
          });
        });

        const elaboradoProducts: Product[] = [];
        const mappedAtributos: VariacionAtributo[] = [];

        for (const n of data.elaborados.nodes) {
          const productId = String(n.id_Producto);
          const cat = n.producto.categoria;
          // Ensure the category is registered
          if (cat && !catMap.has(String(cat.id))) {
            catMap.set(String(cat.id), {
              id: String(cat.id), name: cat.nombre, description: cat.descripcion ?? '',
              color: cat.color || '#92400e', sortOrder: 0, isActive: true,
              createdAt: new Date(), updatedAt: new Date(),
            });
          }
          elaboradoProducts.push({
            id: productId, code: productId,
            name: n.producto.nombre, description: n.producto.descripcion ?? '',
            tipo: 'elaborado', categoryId: cat ? String(cat.id) : '',
            unit: n.unidad_medida ?? 'unidad', costPrice: 0,
            salePrice: n.producto.precio, stock: 999,
            minStock: 0, maxStock: 0, variations: [], isActive: true,
            hasVariations: n.variaciones.length > 0,
            createdAt: new Date(), updatedAt: new Date(),
          });
          for (const v of n.variaciones) {
            mappedAtributos.push({
              id: String(v.id), productId,
              nombre: v.nombre, esRequerido: v.requerido, isActive: true,
              createdAt: new Date(), updatedAt: new Date(),
              opciones: v.opciones.map(o => {
                const ajuste = o.ajustes?.[0];
                return {
                  id: String(o.id), atributoId: String(v.id),
                  nombre: o.nombre, precioAjuste: o.ajustePrecio, isActive: true,
                  tipoAjuste: ajuste?.tipoAjuste,
                  ajusteCantidad: ajuste?.cantidad,
                  insumoBaseNombre: ajuste?.insumoBase?.nombre,
                  insumoNuevoNombre: ajuste?.insumoNuevo?.nombre,
                };
              }),
            });
          }
        }

        const compradoProducts: Product[] = data.comprados.nodes
          .filter(n => n.disponible)
          .map(n => {
            const cat = n.producto.categoria;
            // Ensure comprado categories are registered even if not in categorias.nodes
            if (cat && !catMap.has(String(cat.id))) {
              catMap.set(String(cat.id), {
                id: String(cat.id), name: cat.nombre, description: cat.descripcion ?? '',
                color: cat.color || '#64748b', sortOrder: 0, isActive: true,
                createdAt: new Date(), updatedAt: new Date(),
              });
            }
            return {
              id: String(n.producto.id), code: String(n.producto.id),
              name: n.producto.nombre, description: n.producto.descripcion ?? '',
              tipo: 'comprado' as const,
              categoryId: cat ? String(cat.id) : '',
              unit: 'unidad', costPrice: n.costo_compra,
              salePrice: n.producto.precio, stock: n.stock_actual,
              minStock: 0, maxStock: 0, variations: [], isActive: true,
              hasVariations: false, createdAt: new Date(), updatedAt: new Date(),
            };
          });

        // Find existing combo category from backend, or create synthetic one
        const existingComboCat = [...catMap.values()].find(c =>
          c.name.toLowerCase().includes('combo')
        );
        const COMBO_CAT_ID = existingComboCat?.id ?? '__combos__';
        if (!existingComboCat) {
          catMap.set(COMBO_CAT_ID, {
            id: COMBO_CAT_ID, name: 'Combos', color: '#15803d',
            sortOrder: 99, isActive: true, createdAt: new Date(), updatedAt: new Date(),
          });
        }

        const comboProducts: Product[] = [];
        const newComboDetails: Record<string, ComboDetailItem[]> = {};

        for (const n of data.combos.nodes) {
          const id = String(n.producto.id);
          comboProducts.push({
            id, code: id,
            name: n.producto.nombre, description: n.producto.descripcion ?? '',
            tipo: 'combo', categoryId: COMBO_CAT_ID,
            unit: 'unidad', costPrice: 0,
            salePrice: n.producto.precio, stock: n.cantidadProducible,
            minStock: 0, maxStock: 0, variations: [], isActive: true,
            hasVariations: false, createdAt: new Date(), updatedAt: new Date(),
          });
          newComboDetails[id] = n.detalles.map(d => ({
            name: d.producto.nombre, quantity: d.cantidad, emoji: '•',
          }));
        }

        const cats = [...catMap.values()].filter(c => c.isActive);

        setCategories(cats);
        setProducts([...elaboradoProducts, ...compradoProducts, ...comboProducts]);
        setAtributos(mappedAtributos);
        setComboDetails(newComboDetails);
      } catch {
        toast.error('Error', 'No se pudieron cargar los productos.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getAtributosByProductId = useCallback((productId: string): VariacionAtributo[] => {
    return atributos.filter((a: VariacionAtributo) => a.productId === productId);
  }, [atributos]);

  // wire helper used by ProdCard
  getAttrCount = (p: Product) => getAtributosByProductId(p.id).length;

  const addSale = useCallback((saleInput: SaleInput) => api.post<Sale>('/ventas', saleInput), []);

  const getOrCreateProfile = useCallback((customerId: string): LoyaltyProfile | undefined => {
    const profile = loyaltyProfiles.find((p: LoyaltyProfile) => p.customerId === customerId);
    return profile;
  }, [loyaltyProfiles]);

  const calculatePointsForAmount = useCallback((customerId: string, total: number, hasCombo: boolean): PointsCalculation | null => {
    const profile = getOrCreateProfile(customerId);
    if (!profile) return null;

    const basePoints = Math.floor(total / 10);
    let bonusPoints = 0;
    const bonusReasons: string[] = [];

    // Happy hour logic (9am-3pm)
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 15) {
      bonusPoints += 2;
      bonusReasons.push('Happy Hour');
    }

    // Combo bonus
    if (hasCombo) {
      bonusPoints += 3;
      bonusReasons.push('Combo');
    }

    return {
      basePoints,
      bonusPoints,
      totalPoints: basePoints + bonusPoints,
      multiplier: 1,
      bonusReasons,
      isBirthday: false,
      isHappyHour: hour >= 9 && hour < 15,
      isDoubleDay: false,
      isCombo: hasCombo,
      isGroupPurchase: total >= 70,
    };
  }, [getOrCreateProfile]);

  const awardPointsForSale = useCallback((customerId: string, _saleId: string, total: number, hasCombo: boolean): PointsCalculation | null => {
    const calc = calculatePointsForAmount(customerId, total, hasCombo);
    if (!calc) return null;

    // In real implementation, this would call the API
    return calc;
  }, [calculatePointsForAmount]);

  const redeemReward = useCallback((customerId: string, rewardId: string): boolean => {
    const profile = getOrCreateProfile(customerId);
    const reward = rewards.find(r => r.id === rewardId);
    if (!profile || !reward || profile.points < reward.pointsCost) return false;
    setLoyaltyProfiles(prev => prev.map(p =>
      p.customerId === customerId ? { ...p, points: p.points - reward.pointsCost } : p
    ));
    return true;
  }, [getOrCreateProfile, rewards]);

  /* ── Mesa state ── */
  const [mesas, setMesas] = useState<Mesa[]>(initMesas);
  const [activeMesaId, setActiveMesaId] = useState<string | null>(null);
  const [modalView, setModalView] = useState<ModalView>('none');

  /* ── Nueva mesa form ── */
  const [nuevaMesaName, setNuevaMesaName] = useState('');
  const [editMesaId,    setEditMesaId]    = useState<string | null>(null);
  const [iniciarClienteId, setIniciarClienteId] = useState('');
  const [showNewCustomerForm,       setShowNewCustomerForm]       = useState(false);
  const [showDetalleNewCustomerForm, setShowDetalleNewCustomerForm] = useState(false);
  const [newCustomerName,  setNewCustomerName]  = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  /* ── Detalle view ── */
  const [detalleView, setDetalleView] = useState<'none' | 'pedido' | 'historial'>('none');

  /* ── Temp state for product picker ── */
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [tempCart,      setTempCart]      = useState<CartItem[]>([]);
  const [varPickerProduct, setVarPickerProduct] = useState<Product | null>(null);
  const [varPickerDirect, setVarPickerDirect] = useState(false);
  const [varPickerRewardId, setVarPickerRewardId] = useState<string | null>(null);
  const [redeemQtyState, setRedeemQtyState] = useState<{ product: Product; reward: Reward } | null>(null);
  const [comboDetailProduct, setComboDetailProduct] = useState<Product | null>(null);
  const [elaboradoDetailProduct, setElaboradoDetailProduct] = useState<Product | null>(null);
  const [elaboradoIngredientes, setElaboradoIngredientes] = useState<Record<string, ElaboradoIngrediente[]>>({});
  const [productSearch, setProductSearch] = useState('');

  /* ── Payment state ── */
  const [paymentMethod,    setPaymentMethod]    = useState<PaymentMethodType>('cash');
  const [cashReceived,     setCashReceived]     = useState('');
  const [isProcessing,     setIsProcessing]     = useState(false);
  const [lastSaleResult,   setLastSaleResult]   = useState<{ code: string; points: PointsCalculation | null; newBalance: number } | null>(null);

  /* ── Drag scroll refs ── */
  const dragScrollDetalleCat  = useDragScroll<HTMLDivElement>();
  const dragScrollDetalleProd = useDragScroll<HTMLDivElement>();

  /* ── Derived ── */
  const activeMesa = activeMesaId ? mesas.find(m => m.id === activeMesaId) ?? null : null;

  const activeCategories = useMemo(() => categories.filter(c => c.isActive), [categories]);

  // products for the selected category in "agregar" modal
  // when searching, ignores category filter and searches all products
  const pickerProducts = useMemo(() => {
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return products.filter(p => p.isActive && p.name.toLowerCase().includes(q));
    }
    const catId = selectedCatId || (activeCategories[0]?.id ?? '');
    return products.filter(p => p.isActive && p.categoryId === catId);
  }, [products, selectedCatId, activeCategories, productSearch]);

  const getEffectiveStock = useCallback((p: Product): { label: string; ok: boolean } => {
    // For elaborado products, we would need to check recipe availability
    // For now, simplified check
    return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: String(p.stock), ok: true };
  }, []);

  /* ── Mesa order totals ── */
  const mesaSubtotal   = activeMesa ? mesaOrderTotal(activeMesa.order) : 0;
  const loyaltyProfile = activeMesa?.customerId ? getOrCreateProfile(activeMesa.customerId) : null;

  const pointsSpentInOrder = useMemo(() => {
    if (!activeMesa) return 0;
    const countItems = (items: CartItem[]) =>
      items.filter(i => i.redeemRewardId).reduce((sum, i) => {
        const r = rewards.find(r => r.id === i.redeemRewardId);
        return sum + (r?.pointsCost ?? 0);
      }, 0);
    return countItems(activeMesa.order) + countItems(tempCart);
  }, [activeMesa, rewards, tempCart]);
  const availablePoints = loyaltyProfile ? loyaltyProfile.points - pointsSpentInOrder : 0;
  const mesaTotal      = mesaSubtotal;
  const cashNum        = parseFloat(cashReceived) || 0;
  const change         = Math.max(0, cashNum - mesaTotal);
  const hasCombo       = !!activeMesa?.order.some(i => i.product.tipo === 'combo' || i.product.name.toLowerCase().includes('combo'));
  const pointsPreview  = activeMesa?.customerId
    ? calculatePointsForAmount(activeMesa.customerId, mesaTotal, hasCombo)
    : null;

  /* ── Open / close helpers ── */
  const openModal = (mesaId: string, view: ModalView) => {
    setActiveMesaId(mesaId);
    setModalView(view);
  };
  const closeAll = () => {
    setActiveMesaId(null);
    setModalView('none');
    setTempCart([]);
    setProductSearch('');
    setCashReceived('');
    setDetalleView('none');
    setIniciarClienteId('');
    setShowNewCustomerForm(false);
    setShowDetalleNewCustomerForm(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  const handleCreateCustomer = (onCreated: (id: string) => void) => {
    const name  = newCustomerName.trim();
    const phone = newCustomerPhone.trim();
    if (!name || !phone) return;
    const id  = `cust_${Date.now()}`;
    const now = new Date();
    const newCustomer: Customer = {
      id, code: `CLI-${Date.now()}`, name, phone,
      totalPurchases: 0, isActive: true,
      createdAt: now, updatedAt: now,
    };
    const newProfile: LoyaltyProfile = {
      id: `prof_${Date.now()}`, customerId: id,
      points: 0, lifetimePoints: 0, purchaseCount: 0,
      level: 'bronce', referralCode: id.slice(-6).toUpperCase(),
      referralCount: 0, consecutiveDays: 0,
      uniqueProductsBought: [], completedMissions: [],
      createdAt: now, updatedAt: now,
    };
    setCustomers(prev => [...prev, newCustomer]);
    setLoyaltyProfiles(prev => [...prev, newProfile]);
    onCreated(id);
    setNewCustomerName('');
    setNewCustomerPhone('');
    toast.success('Cliente registrado', `${name} añadido correctamente.`);
  };

  /* ── Mesa operations ── */
  const updateMesa = (id: string, patch: Partial<Mesa>) =>
    setMesas(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  const handleIniciarMesa = (mesa: Mesa, customerId?: string) => {
    updateMesa(mesa.id, { status: 'ocupada', openedAt: Date.now(), customerId, order: [] });
    openModal(mesa.id, 'detalle');
  };

  const handleCerrarMesa = (mesaId: string) => {
    updateMesa(mesaId, { status: 'libre', openedAt: undefined, order: [], customerId: undefined });
    closeAll();
  };

  const openParaLlevar = () => {
    const pl = mesas.find(m => m.id === PARA_LLEVAR_ID)!;
    if (pl.status === 'libre') {
      updateMesa(PARA_LLEVAR_ID, { status: 'ocupada', openedAt: Date.now(), order: [], customerId: undefined });
    }
    openModal(PARA_LLEVAR_ID, 'detalle');
  };

  const openNuevaMesa = () => {
    setEditMesaId(null);
    setNuevaMesaName('');
    setModalView('nueva_mesa');
  };

  const openEditMesa = (mesa: Mesa, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMesaId(mesa.id);
    setNuevaMesaName(mesa.name);
    setActiveMesaId(mesa.id);
    setModalView('nueva_mesa');
  };

  const handleSaveMesa = () => {
    const trimmed = nuevaMesaName.trim();
    if (!trimmed) return;
    if (editMesaId) {
      updateMesa(editMesaId, { name: trimmed });
    } else {
      const maxNum = mesas.reduce((m, t) => Math.max(m, t.number), 0);
      const newMesa: Mesa = {
        id: `mesa-${Date.now()}`,
        number: maxNum + 1,
        name: trimmed,
        status: 'libre',
        order: [],
      };
      setMesas(prev => [...prev, newMesa]);
    }
    setModalView('none');
    setNuevaMesaName('');
    setEditMesaId(null);
    setActiveMesaId(null);
  };

  const handleDeleteMesa = (mesaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa || mesa.status !== 'libre') return;
    setMesas(prev => prev.filter(m => m.id !== mesaId));
  };

  /* ── Temp cart (product picker) ── */
  const addTempDirect = (product: Product, opciones?: OpcionSeleccionada[], precioFinal?: number) => {
    const price = precioFinal ?? product.salePrice;
    const key   = buildCartKey(product.id, opciones);
    setTempCart(prev => {
      const ex = prev.find(i => i.cartKey === key);
      if (ex) return prev.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, opciones, precioFinal: price, cartKey: key }];
    });
  };

  const addTempProduct = (product: Product) => {
    if (product.tipo === 'combo') {
      setComboDetailProduct(product);
    } else if (product.tipo === 'elaborado') {
      setElaboradoDetailProduct(product);
      // Carga lazy de ingredientes si aún no están en cache
      if (!elaboradoIngredientes[product.id]) {
        gql<{ elaborados: { nodes: Array<{ receta: { detalles: Array<{ cantidad: number; insumo: { nombre: string; unidad_min_uso: string } | null }> } | null }> } }>(
          GET_ELABORADO_INGREDIENTES,
          { id: parseInt(product.id, 10) }
        ).then(data => {
          const node = data.elaborados.nodes[0];
          if (node?.receta?.detalles) {
            const ings = node.receta.detalles
              .filter(d => d.insumo)
              .map(d => ({ nombre: d.insumo!.nombre, cantidad: d.cantidad, unidad: d.insumo!.unidad_min_uso }));
            setElaboradoIngredientes(prev => ({ ...prev, [product.id]: ings }));
          } else {
            setElaboradoIngredientes(prev => ({ ...prev, [product.id]: [] }));
          }
        }).catch(() => {
          setElaboradoIngredientes(prev => ({ ...prev, [product.id]: [] }));
        });
      }
    } else {
      addTempDirect(product);
    }
  };

  const incTempQty = (cartKey: string) =>
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i));
  const decTempQty = (cartKey: string) =>
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  const removeTempItem = (cartKey: string) =>
    setTempCart(prev => prev.filter(i => i.cartKey !== cartKey));
  const getTempQty = (productId: string) =>
    tempCart.filter(i => i.product.id === productId).reduce((s, i) => s + i.quantity, 0);

  const confirmAddToMesa = () => {
    if (!activeMesaId || tempCart.length === 0) return;
    setMesas(prev => prev.map(m => {
      if (m.id !== activeMesaId) return m;
      const merged = [...m.order];
      for (const newItem of tempCart) {
        const ex = merged.find(i => i.cartKey === newItem.cartKey);
        if (ex) ex.quantity += newItem.quantity;
        else merged.push({ ...newItem });
      }
      return { ...m, order: merged };
    }));
    setTempCart([]);
    setProductSearch('');
    setModalView('detalle');
    setDetalleView('historial');
    toast.success('Productos agregados', `${tempCart.reduce((s, i) => s + i.quantity, 0)} item(s) añadidos a la mesa`);
  };

  /* ── Canjear recompensa → va al tempCart (igual que productos normales) ── */
  const addRedeemToTempCart = (product: Product, rewardId: string, opciones?: OpcionSeleccionada[], qty = 1) => {
    const newItems = Array.from({ length: qty }, (_, i) => ({
      product,
      quantity: 1,
      precioFinal: 0,
      cartKey: `${product.id}__canje__${Date.now()}_${i}`,
      redeemRewardId: rewardId,
      ...(opciones ? { opciones } : {}),
    }));
    setTempCart(prev => [...prev, ...newItems]);
    setDetalleView('pedido');
  };

  /* ── Add directly to mesa order (inline product browser) ── */
  const addDirectToMesa = (product: Product, opciones?: OpcionSeleccionada[], precioFinal?: number) => {
    if (!activeMesaId) return;
    const price = precioFinal ?? product.salePrice;
    const key   = buildCartKey(product.id, opciones);
    setMesas(prev => prev.map(m => {
      if (m.id !== activeMesaId) return m;
      const ex = m.order.find(i => i.cartKey === key);
      if (ex) return { ...m, order: m.order.map(i => i.cartKey === key ? { ...i, quantity: i.quantity + 1 } : i) };
      return { ...m, order: [...m.order, { product, quantity: 1, opciones, precioFinal: price, cartKey: key }] };
    }));
  };


  /* ── Mesa order controls ── */
  const incMesaQty = (cartKey: string) =>
    setMesas(prev => prev.map(m =>
      m.id === activeMesaId
        ? { ...m, order: m.order.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i) }
        : m));
  const decMesaQty = (cartKey: string) =>
    setMesas(prev => prev.map(m =>
      m.id !== activeMesaId ? m : {
        ...m,
        order: m.order.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0),
      }));
  const removeMesaItem = (cartKey: string) =>
    setMesas(prev => prev.map(m =>
      m.id !== activeMesaId ? m : { ...m, order: m.order.filter(i => i.cartKey !== cartKey) }));

  const updateTempItemNote = (cartKey: string, notes: string) =>
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, notes } : i));

  const updateMesaItemNote = (cartKey: string, notes: string) =>
    setMesas(prev => prev.map(m =>
      m.id !== activeMesaId ? m : { ...m, order: m.order.map(i => i.cartKey === cartKey ? { ...i, notes } : i) }));

  /* ── Checkout ── */
  const handleRequestPayment = () => {
    if (!activeMesa || activeMesa.order.length === 0) {
      toast.warning('Sin pedidos', 'Agrega productos antes de cobrar.');
      return;
    }
    // Check stock for all items
    const outOfStock = activeMesa.order.filter((i: CartItem) => i.product.stock < i.quantity);
    if (outOfStock.length > 0) {
      return toast.error('Sin stock', outOfStock.map((i: CartItem) => `${i.product.name}: stock insuficiente`).join(' | '));
    }
    updateMesa(activeMesa.id, { status: 'esperando_pago' });
    setModalView('review');
  };

  const handleConfirmSale = async () => {
    if (!activeMesa) return;
    setIsProcessing(true);
    try {
      const saleInput: SaleInput = {
        customerId: activeMesa.customerId,
        items: activeMesa.order.map((i: CartItem) => ({ productId: i.product.id, quantity: i.quantity, discount: 0 })),
        discount: 0,
        taxPercentage: 18,
        paymentMethods: [{ type: paymentMethod, amount: mesaTotal }],
      };
      const newSale = await addSale(saleInput);

      // Update stock locally
      setProducts(prev => prev.map((p: Product) => {
        const item = activeMesa.order.find((i: CartItem) => i.product.id === p.id);
        if (item) {
          return { ...p, stock: p.stock - item.quantity };
        }
        return p;
      }));

      let earnedPoints: PointsCalculation | null = null;
      let newBalance = 0;
      if (activeMesa.customerId && newSale) {
        // canjear todas las recompensas incluidas en el order
        for (const item of activeMesa.order) {
          if (item.redeemRewardId) redeemReward(activeMesa.customerId, item.redeemRewardId);
        }
        earnedPoints = awardPointsForSale(activeMesa.customerId, newSale.id, mesaTotal, hasCombo);
        const profile = getOrCreateProfile(activeMesa.customerId);
        newBalance = profile?.points ?? 0;
      }
      setLastSaleResult({ code: newSale.code, points: earnedPoints, newBalance });
      setModalView('success');
    } catch {
      toast.error('Error', 'No se pudo registrar la venta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    if (activeMesaId) handleCerrarMesa(activeMesaId);
    setLastSaleResult(null);
    closeAll();
  };

  const nextMilestone = useMemo(() => {
    if (!loyaltyProfile) return null;
    const count = loyaltyProfile.purchaseCount + 1;
    return milestones.find(m => m.purchaseNumber === count) ?? null;
  }, [loyaltyProfile, milestones]);

  /* ── Init category for picker ── */
  useEffect(() => {
    if (activeCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(activeCategories[0].id);
    }
  }, [activeCategories, selectedCatId]);

  /* ══════════════════════════════════════════════════════════════════════
     STATUS CONFIG
  ═══════════════════════════════════════════════════════════════════════*/
  const STATUS_CFG: Record<MesaStatus, { label: string; dot: string; card: string; badge: string; icon: string; iconBg: string }> = {
    libre:          { label: 'Libre',          dot: 'bg-emerald-400',              card: 'bg-coffee-700/35 border-coffee-500/30 hover:bg-coffee-700/50 hover:border-coffee-400/50', badge: 'bg-emerald-500/20 text-emerald-300',  icon: 'text-coffee-300', iconBg: 'bg-coffee-800/70' },
    ocupada:        { label: 'Ocupada',        dot: 'bg-red-400 animate-pulse',    card: 'bg-red-900/45    border-red-500/55    hover:bg-red-900/60    hover:border-red-400/75',     badge: 'bg-red-500/20     text-red-300',         icon: 'text-red-300',    iconBg: 'bg-red-900/50'    },
    esperando_pago: { label: 'Esperando pago', dot: 'bg-amber-400 animate-pulse',  card: 'bg-amber-900/35  border-amber-500/50  hover:bg-amber-900/50  hover:border-amber-400/70',  badge: 'bg-amber-500/20   text-amber-300',       icon: 'text-amber-300',  iconBg: 'bg-amber-900/50'  },
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════*/
  return (
    <MainLayout>
      <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#160c02] overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-white text-xl sm:text-2xl leading-tight">Punto de Venta</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-red-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'ocupada').length}</span>
                <span className="hidden sm:inline"> ocupadas</span>
                <span className="sm:hidden"> ocup.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-amber-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'esperando_pago').length}</span>
                <span className="hidden sm:inline"> esperando</span>
                <span className="sm:hidden"> esp.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-emerald-400 font-semibold">{mesas.filter(m => m.tipo !== 'para_llevar' && m.status === 'libre').length}</span>
                <span className="hidden sm:inline"> libres</span>
                <span className="sm:hidden"> lib.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-400">{mesas.filter(m => m.tipo !== 'para_llevar').length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Legend — hidden on small screens */}
            <div className="hidden md:flex items-center gap-3 text-xs text-coffee-400 mr-2">
              {(['libre', 'ocupada', 'esperando_pago'] as MesaStatus[]).map(s => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={clsx('h-2 w-2 rounded-full', STATUS_CFG[s].dot.replace(' animate-pulse', ''))} />
                  {STATUS_CFG[s].label}
                </span>
              ))}
            </div>
            <button
              onClick={openParaLlevar}
              className={clsx(
                'flex items-center gap-2 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm',
                mesas.find(m => m.id === PARA_LLEVAR_ID)?.status !== 'libre'
                  ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50'
                  : 'bg-coffee-600 hover:bg-coffee-500',
              )}
            >
              <ShoppingBag className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Para llevar</span>
              {mesas.find(m => m.id === PARA_LLEVAR_ID)?.status !== 'libre' && (
                <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse flex-shrink-0" />
              )}
            </button>
            <button
              onClick={openNuevaMesa}
              className="flex items-center gap-2 bg-coffee-600 hover:bg-coffee-500 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Nueva Mesa</span>
            </button>
          </div>
        </div>

        {/* ── Mesa grid ──────────────────────────────────────────────── */}
        <div className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {mesas.filter(m => m.tipo !== 'para_llevar').map(mesa => {
            const cfg = STATUS_CFG[mesa.status];
            const total = mesaOrderTotal(mesa.order);
            const itemCount = mesa.order.reduce((s, i) => s + i.quantity, 0);
            const isLibre = mesa.status === 'libre';

            return (
              <div
                key={mesa.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isLibre) openModal(mesa.id, 'iniciar');
                  else openModal(mesa.id, 'detalle');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (isLibre) openModal(mesa.id, 'iniciar');
                    else openModal(mesa.id, 'detalle');
                  }
                }}
                className={clsx(
                  'group relative flex flex-col items-center cursor-pointer',
                  'border-2 rounded-2xl p-4 transition-all duration-200',
                  'active:scale-95',
                  cfg.card,
                )}
              >
                {/* Status dot */}
                <div className={clsx('absolute top-3 left-3 h-2 w-2 rounded-full', cfg.dot)} />

                {/* Edit + delete buttons (only libre, visible on hover) */}
                {isLibre && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => openEditMesa(mesa, e)}
                      className="h-6 w-6 rounded-lg bg-coffee-700 hover:bg-coffee-600 flex items-center justify-center text-coffee-300 hover:text-white"
                      title="Renombrar"
                    >
                      <PenLine className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => handleDeleteMesa(mesa.id, e)}
                      className="h-6 w-6 rounded-lg bg-coffee-700 hover:bg-red-600 flex items-center justify-center text-coffee-300 hover:text-white"
                      title="Eliminar mesa"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Table icon */}
                <div className={clsx(
                  'h-11 w-11 rounded-xl flex items-center justify-center mt-3 mb-2',
                  cfg.iconBg,
                )}>
                  <UtensilsCrossed className={clsx('h-5 w-5', cfg.icon)} />
                </div>

                {/* Name */}
                <p className="font-semibold text-white text-sm leading-tight text-center">
                  {mesa.name}
                </p>

                {/* Status badge */}
                <span className={clsx('mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
                  {cfg.label}
                </span>

                {/* Order info */}
                {!isLibre && (
                  <div className="mt-2.5 w-full space-y-0.5 text-center">
                    {itemCount > 0 && (
                      <p className="text-xs text-coffee-300">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                    )}
                    {total > 0 && (
                      <p className="text-sm font-bold text-white">{formatCurrency(total)}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MODAL: NUEVA / EDITAR MESA
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'nueva_mesa' && (
          <Overlay onClose={() => { setModalView('none'); setActiveMesaId(null); }}>
            <div className="bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-coffee-800 px-6 py-4 flex items-center justify-between">
                <h3 className="font-display font-bold text-white text-lg">
                  {editMesaId ? 'Editar mesa' : 'Nueva mesa'}
                </h3>
                <button
                  onClick={() => { setModalView('none'); setActiveMesaId(null); }}
                  className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-400 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Nombre de la mesa
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mesa 5, Terraza 1, Barra..."
                    value={nuevaMesaName}
                    onChange={e => setNuevaMesaName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveMesa()}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-coffee-500 focus:outline-none text-slate-900 text-sm font-medium"
                  />
                </div>
                <button
                  onClick={handleSaveMesa}
                  disabled={!nuevaMesaName.trim()}
                  className={clsx(
                    'w-full py-3.5 rounded-2xl font-bold text-sm transition-all',
                    nuevaMesaName.trim()
                      ? 'bg-coffee-600 hover:bg-coffee-500 text-white active:scale-95 shadow'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                  )}
                >
                  {editMesaId ? 'Guardar cambios' : 'Crear mesa'}
                </button>
              </div>
            </div>
          </Overlay>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL: INICIAR MESA
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'iniciar' && activeMesa && (
          <Overlay onClose={closeAll}>
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-coffee-800 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <UtensilsCrossed className="h-5 w-5 text-cream" />
                  </div>
                  <div>
                    <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Iniciar</p>
                    <h3 className="font-display font-bold text-cream text-lg">{activeMesa.name}</h3>
                  </div>
                </div>
                <button onClick={closeAll} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-coffee-400 uppercase tracking-wider">
                      Cliente <span className="font-normal text-coffee-300">(opcional)</span>
                    </label>
                    <button
                      onClick={() => { setShowNewCustomerForm(v => !v); setNewCustomerName(''); setNewCustomerPhone(''); }}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-500 transition-colors"
                    >
                      {showNewCustomerForm ? 'Cancelar' : '+ Registrar nuevo'}
                    </button>
                  </div>

                  {showNewCustomerForm ? (
                    <div className="space-y-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                      <p className="text-xs font-semibold text-amber-800">Nuevo cliente</p>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Nombre completo"
                        value={newCustomerName}
                        onChange={e => setNewCustomerName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-amber-200 focus:border-amber-400 focus:outline-none text-sm text-coffee-900 bg-white placeholder:text-coffee-300"
                      />
                      <input
                        type="tel"
                        placeholder="Número de teléfono"
                        value={newCustomerPhone}
                        onChange={e => setNewCustomerPhone(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateCustomer(id => { setIniciarClienteId(id); setShowNewCustomerForm(false); })}
                        className="w-full px-3 py-2.5 rounded-lg border border-amber-200 focus:border-amber-400 focus:outline-none text-sm text-coffee-900 bg-white placeholder:text-coffee-300"
                      />
                      <button
                        onClick={() => handleCreateCustomer(id => { setIniciarClienteId(id); setShowNewCustomerForm(false); })}
                        disabled={!newCustomerName.trim() || !newCustomerPhone.trim()}
                        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                      >
                        Guardar cliente
                      </button>
                    </div>
                  ) : (
                    <SearchableSelect
                      value={iniciarClienteId}
                      onChange={v => setIniciarClienteId(v)}
                      options={[
                        { value: '', label: '— Sin cliente —' },
                        ..._customers.map(c => {
                          const prof = getOrCreateProfile(c.id);
                          return { value: c.id, label: `${c.name}${prof ? ` · ${prof.points} pts` : ''}` };
                        }),
                      ]}
                      placeholder="— Sin cliente —"
                    />
                  )}
                </div>
                <button
                  onClick={() => { handleIniciarMesa(activeMesa, iniciarClienteId || undefined); setIniciarClienteId(''); }}
                  className="w-full py-4 rounded-2xl bg-coffee-800 text-cream font-bold text-base hover:bg-coffee-700 active:scale-95 transition-all shadow-lg"
                >
                  Iniciar {activeMesa.name}
                </button>
              </div>
            </div>
          </Overlay>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL: DETALLE DE MESA
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'detalle' && activeMesa && (
          <Overlay onClose={closeAll}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              {/* ── Header ── */}
              <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between flex-shrink-0">
                {detalleView !== 'none' ? (
                  /* Vista secundaria: botón volver + título */
                  <button
                    onClick={() => setDetalleView('none')}
                    className="flex items-center gap-2 text-cream hover:text-coffee-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="font-display font-bold text-lg">
                      {detalleView === 'historial' ? 'Historial' : 'Ver pedido'}
                    </span>
                  </button>
                ) : (
                  /* Vista normal: icon + mesa */
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                      {activeMesa.tipo === 'para_llevar'
                        ? <ShoppingBag className="h-5 w-5 text-cream" />
                        : <UtensilsCrossed className="h-5 w-5 text-cream" />
                      }
                    </div>
                    <div>
                      <p className="text-[10px] text-coffee-400 uppercase tracking-widest">
                        {activeMesa.tipo === 'para_llevar' ? 'Mostrador' : STATUS_CFG[activeMesa.status].label}
                      </p>
                      <h3 className="font-display font-bold text-cream text-lg">{activeMesa.name}</h3>
                      {(() => {
                        const cliente = _customers.find(c => c.id === activeMesa.customerId);
                        return activeMesa.customerId ? (
                          <p className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                            {cliente?.name ?? 'Cliente vinculado'}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {detalleView === 'none' && (
                    <button
                      onClick={() => setDetalleView(v => v === 'historial' ? 'none' : 'historial')}
                      className="h-8 rounded-xl flex items-center justify-center gap-1.5 px-2 sm:px-3 transition-all text-xs font-semibold bg-white/10 text-coffee-300 hover:bg-white/20"
                    >
                      <History className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Historial</span>
                    </button>
                  )}
                  <button onClick={closeAll} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Picker (categorías + productos) — solo visible en estado normal ── */}
              {detalleView === 'none' && (
                <>
                  {/* Buscador */}
                  <div className="px-4 pt-3 pb-1 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-coffee-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full pl-8 pr-8 py-2 rounded-xl bg-coffee-50 border border-coffee-100 text-xs text-coffee-900 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300"
                      />
                      {productSearch && (
                        <button
                          onClick={() => setProductSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    ref={dragScrollDetalleCat.ref}
                    onMouseDown={dragScrollDetalleCat.onMouseDown}
                    onMouseMove={dragScrollDetalleCat.onMouseMove}
                    onMouseUp={dragScrollDetalleCat.onMouseUp}
                    onMouseLeave={dragScrollDetalleCat.onMouseLeave}
                    className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {activeCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={clsx(
                          'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                          (selectedCatId || activeCategories[0]?.id) === cat.id
                            ? 'bg-coffee-800 text-cream shadow-md'
                            : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  <div
                    ref={dragScrollDetalleProd.ref}
                    onMouseDown={dragScrollDetalleProd.onMouseDown}
                    onMouseMove={dragScrollDetalleProd.onMouseMove}
                    onMouseUp={dragScrollDetalleProd.onMouseUp}
                    onMouseLeave={dragScrollDetalleProd.onMouseLeave}
                    className="flex gap-2.5 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 cursor-grab active:cursor-grabbing select-none border-b border-coffee-100"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {pickerProducts.length === 0 ? (
                      <div className="flex items-center gap-2 text-coffee-300 h-24 w-full justify-center">
                        <Coffee className="h-5 w-5 opacity-40" />
                        <p className="text-xs">Sin productos en esta categoría</p>
                      </div>
                    ) : pickerProducts.map(product => {
                      const stock = getEffectiveStock(product);
                      const qty   = getTempQty(product.id);
                      const reward = loyaltyProfile
                        ? rewards.find(r => r.isActive && r.productId === product.id) ?? null
                        : null;
                      const canAfford = reward != null && availablePoints >= reward.pointsCost;
                      const pointsShortfall = reward != null && !canAfford ? reward.pointsCost - availablePoints : null;
                      return (
                        <ProdCard
                          key={product.id}
                          product={product}
                          qty={qty}
                          unavailable={!stock.ok}
                          onAdd={() => addTempProduct(product)}
                          onInc={() => incTempQty(buildCartKey(product.id))}
                          onDec={() => decTempQty(buildCartKey(product.id))}
                          rewardInfo={reward ? { icon: reward.icon, pointsCost: reward.pointsCost } : null}
                          onRedeem={canAfford ? () => {
                            const attrs = getAtributosByProductId(product.id);
                            if (attrs.length > 0) {
                              setVarPickerProduct(product);
                              setVarPickerRewardId(reward!.id);
                            } else {
                              setRedeemQtyState({ product, reward: reward! });
                            }
                          } : undefined}
                          pointsShortfall={pointsShortfall}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Lista de selección actual (tempCart) ── */}
              {detalleView === 'pedido' && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {tempCart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-coffee-300">
                      <ShoppingBag className="h-8 w-8 opacity-30" />
                      <p className="text-xs">Aún no seleccionaste nada</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-coffee-50">
                        {tempCart.map((item, idx) => (
                          <div key={item.cartKey} className="px-5 py-3 space-y-1.5">
                            <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-coffee-300 w-4 flex-shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                                {item.redeemRewardId && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                    <Gift className="h-2.5 w-2.5" />Canje
                                  </span>
                                )}
                              </div>
                              {item.opciones?.length && (item.product.tipo === 'elaborado' || item.product.tipo === 'combo') ? (
                                <div className="mt-0.5 space-y-0.5">
                                  {item.opciones.map((o, oi) => (
                                    <p key={oi} className="text-xs text-coffee-400">
                                      <span className="font-medium text-coffee-500">{o.atributoNombre}:</span> {formatOpcionLabel(o)}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                {item.redeemRewardId
                                  ? <p className="text-sm font-bold text-amber-500">Gratis</p>
                                  : <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
                                }
                                <button onClick={() => removeTempItem(item.cartKey)} className="text-coffee-200 hover:text-red-400 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {item.redeemRewardId ? (
                                <span className="text-[11px] text-coffee-400">1 unidad</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => decTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600">
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold text-coffee-900">{item.quantity}</span>
                                  <button onClick={() => incTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            </div>{/* cierra flex items-center gap-3 */}
                            {/* Nota del ítem */}
                            <div className="flex items-center gap-2 pl-7">
                              <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Nota (ej: sin azúcar, extra caliente...)"
                                value={item.notes ?? ''}
                                onChange={e => updateTempItemNote(item.cartKey, e.target.value)}
                                className="flex-1 text-[11px] text-coffee-700 placeholder:text-coffee-300 bg-transparent border-b border-coffee-100 focus:border-coffee-400 focus:outline-none py-0.5"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-coffee-500">Subtotal</span>
                        <span className="text-lg font-display font-black text-coffee-900">
                          {formatCurrency(tempCart.reduce((s, i) => s + i.precioFinal * i.quantity, 0))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Historial: reemplaza el picker ── */}
              {detalleView === 'historial' && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeMesa.order.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-coffee-300">
                      <ShoppingBag className="h-8 w-8 opacity-30" />
                      <p className="text-xs">Sin pedidos añadidos aún</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-coffee-50">
                        {activeMesa.order.map((item, idx) => (
                          <div key={item.cartKey} className="px-5 py-3 space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-coffee-300 w-4 flex-shrink-0">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                                  {item.redeemRewardId && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                      <Gift className="h-2.5 w-2.5" />Canje
                                    </span>
                                  )}
                                </div>
                                {item.opciones?.length && (item.product.tipo === 'elaborado' || item.product.tipo === 'combo') ? (
                                  <div className="mt-0.5 space-y-0.5">
                                    {item.opciones.map((o, oi) => (
                                      <p key={oi} className="text-xs text-coffee-400">
                                        <span className="font-medium text-coffee-500">{o.atributoNombre}:</span> {formatOpcionLabel(o)}
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <div className="flex items-center gap-1.5">
                                  {item.redeemRewardId
                                    ? <p className="text-sm font-bold text-amber-500">Gratis</p>
                                    : <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
                                  }
                                  <button onClick={() => removeMesaItem(item.cartKey)} className="text-coffee-200 hover:text-red-400 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => decMesaQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600">
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-5 text-center text-sm font-bold text-coffee-900">{item.quantity}</span>
                                  <button onClick={() => incMesaQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {/* Nota editable del ítem ya enviado */}
                            <div className="flex items-center gap-2 pl-7">
                              <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                              <input
                                type="text"
                                placeholder="Nota (ej: sin cebolla, bien caliente...)"
                                value={item.notes ?? ''}
                                onChange={e => updateMesaItemNote(item.cartKey, e.target.value)}
                                className="flex-1 text-[11px] text-coffee-700 placeholder:text-coffee-300 bg-transparent border-b border-coffee-100 focus:border-coffee-400 focus:outline-none py-0.5"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between">
                        <span className="text-xs font-medium text-coffee-500">Total</span>
                        <span className="text-lg font-display font-black text-coffee-900">{formatCurrency(mesaSubtotal)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Cliente vinculado ── */}
              {detalleView === 'none' && (
                <div className="px-4 py-2.5 border-t border-coffee-100 flex-shrink-0">
                  {activeMesa.customerId ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-coffee-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">
                          {_customers.find(c => c.id === activeMesa.customerId)?.name ?? 'Cliente'}
                        </span>
                        <span className="text-coffee-400">
                          · {getOrCreateProfile(activeMesa.customerId)?.points ?? 0} pts
                        </span>
                      </div>
                      {activeMesa.order.some(i => i.redeemRewardId) ? (
                        <Tooltip text="No se puede quitar, hay productos canjeados en la orden" position="top">
                          <span className="text-[11px] text-coffee-200 cursor-not-allowed">Quitar</span>
                        </Tooltip>
                      ) : (
                        <button
                          onClick={() => updateMesa(activeMesa.id, { customerId: undefined })}
                          className="text-[11px] text-coffee-400 hover:text-red-400 transition-colors"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  ) : showDetalleNewCustomerForm ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-700">Nuevo cliente</span>
                        <button
                          onClick={() => { setShowDetalleNewCustomerForm(false); setNewCustomerName(''); setNewCustomerPhone(''); }}
                          className="text-[11px] text-coffee-400 hover:text-coffee-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nombre"
                          value={newCustomerName}
                          onChange={e => setNewCustomerName(e.target.value)}
                          className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border border-coffee-200 focus:border-amber-400 focus:outline-none text-coffee-900 bg-white placeholder:text-coffee-300"
                        />
                        <input
                          type="tel"
                          placeholder="Teléfono"
                          value={newCustomerPhone}
                          onChange={e => setNewCustomerPhone(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleCreateCustomer(id => { updateMesa(activeMesa.id, { customerId: id }); setShowDetalleNewCustomerForm(false); })}
                          className="w-28 text-xs px-2.5 py-1.5 rounded-lg border border-coffee-200 focus:border-amber-400 focus:outline-none text-coffee-900 bg-white placeholder:text-coffee-300"
                        />
                        <button
                          onClick={() => handleCreateCustomer(id => { updateMesa(activeMesa.id, { customerId: id }); setShowDetalleNewCustomerForm(false); })}
                          disabled={!newCustomerName.trim() || !newCustomerPhone.trim()}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold transition-colors flex-shrink-0"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-coffee-400 flex-shrink-0">Cliente:</span>
                      <SearchableSelect
                        value=""
                        onChange={v => { if (v) updateMesa(activeMesa.id, { customerId: v }); }}
                        options={[
                          { value: '', label: '— Vincular cliente —' },
                          ..._customers.map(c => {
                            const prof = getOrCreateProfile(c.id);
                            return { value: c.id, label: `${c.name}${prof ? ` · ${prof.points} pts` : ''}` };
                          }),
                        ]}
                        placeholder="— Vincular cliente —"
                        className="flex-1 text-xs"
                      />
                      <button
                        onClick={() => { setShowDetalleNewCustomerForm(true); setNewCustomerName(''); setNewCustomerPhone(''); }}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-500 transition-colors flex-shrink-0"
                      >
                        + Nuevo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Bottom bar ── */}
              <div className="px-4 py-3 border-t border-coffee-100 flex items-center gap-2 flex-shrink-0">
                {/* Ver pedido */}
                <button
                  onClick={() => setDetalleView(v => v === 'pedido' ? 'none' : 'pedido')}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0',
                    detalleView === 'pedido'
                      ? 'bg-coffee-800 text-cream'
                      : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                  )}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Ver pedido
                  {tempCart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {tempCart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>

                {/* Añadir pedido | Cobrar */}
                <div className="flex-1 flex justify-end">
                  {tempCart.length > 0 ? (
                    <button
                      onClick={confirmAddToMesa}
                      className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-coffee-800 text-cream text-xs font-bold hover:bg-coffee-700 active:scale-95 transition-all shadow-md"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir pedido
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-400 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {tempCart.reduce((s, i) => s + i.quantity, 0)}
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={handleRequestPayment}
                      disabled={activeMesa.order.length === 0}
                      className={clsx(
                        'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all',
                        activeMesa.order.length > 0
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 shadow-md'
                          : 'bg-coffee-100 text-coffee-400 cursor-not-allowed',
                      )}
                    >
                      Cobrar <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cerrar mesa vacía */}
              {activeMesa.order.length === 0 && tempCart.length === 0 && (
                <div className="px-5 pb-3 flex-shrink-0">
                  <button
                    onClick={() => handleCerrarMesa(activeMesa.id)}
                    className="w-full py-2 text-xs text-coffee-400 hover:text-red-500 transition-colors font-medium"
                  >
                    Cerrar mesa (sin pedidos)
                  </button>
                </div>
              )}
            </div>
          </Overlay>
        )}


        {/* ══════════════════════════════════════════════════════════════
            MODAL: REVIEW
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'review' && activeMesa && (
          <Overlay onClose={() => setModalView('detalle')}>
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-100 flex-shrink-0">
                <div>
                  <p className="text-xs text-coffee-400 uppercase tracking-wide font-semibold">Resumen</p>
                  <h3 className="font-display font-bold text-coffee-900 text-lg">{activeMesa.name}</h3>
                </div>
                <button onClick={() => setModalView('detalle')} className="h-8 w-8 rounded-xl bg-coffee-100 flex items-center justify-center text-coffee-600 hover:bg-coffee-200">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-coffee-50 min-h-0">
                {activeMesa.order.map(item => (
                  <div key={item.cartKey} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-9 w-9 rounded-xl bg-coffee-50 flex items-center justify-center text-xl flex-shrink-0">{getProductEmoji(item.product)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-coffee-900 line-clamp-1">{item.product.name}</p>
                        {item.redeemRewardId && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                            <Gift className="h-2.5 w-2.5" />Canje
                          </span>
                        )}
                      </div>
                      {item.opciones?.length && (item.product.tipo === 'elaborado' || item.product.tipo === 'combo') ? (
                        <div className="mt-0.5 space-y-0.5">
                          {item.opciones.map((o, oi) => (
                            <p key={oi} className="text-xs text-coffee-400">
                              <span className="font-medium text-coffee-500">{o.atributoNombre}:</span> {formatOpcionLabel(o)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {item.notes && <p className="text-xs text-coffee-500 italic mt-0.5">"{item.notes}"</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-coffee-400 bg-coffee-100 rounded-lg px-2 py-0.5 font-semibold">×{item.quantity}</span>
                      {item.redeemRewardId
                        ? <span className="text-sm font-bold text-amber-500">Gratis</span>
                        : <span className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-shrink-0 border-t border-coffee-100">
                <div className="px-5 py-3 bg-coffee-50">
                  <div className="flex justify-between font-bold text-coffee-900 text-lg">
                    <span>Total</span>
                    <span className="font-display">{formatCurrency(mesaTotal)}</span>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <button
                    onClick={() => setModalView('pago')}
                    className="w-full py-4 rounded-2xl bg-coffee-800 text-cream font-bold text-base hover:bg-coffee-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Confirmar y Cobrar <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Overlay>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL: PAGO
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'pago' && activeMesa && (
          <Overlay onClose={() => setModalView('review')}>
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-cream" />
                  </div>
                  <div>
                    <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Cobro de cuenta</p>
                    <p className="text-cream font-semibold text-sm">{activeMesa.name}</p>
                  </div>
                </div>
                <button onClick={() => setModalView('review')} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Total */}
                <div className="text-center py-2">
                  <p className="text-xs text-coffee-400 uppercase tracking-widest font-semibold mb-1">Total a pagar</p>
                  <p className="text-5xl font-display font-black text-coffee-900">{formatCurrency(mesaTotal)}</p>
                </div>

                {/* Canjes incluidos en el pedido */}
                {loyaltyProfile && activeMesa.order.some(i => i.redeemRewardId) && (
                  <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
                    <Gift className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-800">
                      {activeMesa.order.filter(i => i.redeemRewardId).length} recompensa(s) canjeada(s) en este pedido
                    </p>
                  </div>
                )}

                {/* Payment methods */}
                <div>
                  <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2.5">Método de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(pm => (
                      <button
                        key={pm.type}
                        onClick={() => { setPaymentMethod(pm.type); setCashReceived(''); }}
                        className={clsx(
                          'flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-xs font-semibold transition-all',
                          paymentMethod === pm.type ? 'bg-coffee-800 text-cream shadow-lg scale-105' : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                        )}
                      >
                        {pm.icon}
                        <span className="leading-tight text-center text-[11px]">{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash input */}
                {paymentMethod === 'cash' && (
                  <div>
                    <label className="text-xs font-bold text-coffee-400 uppercase tracking-wider">Efectivo recibido (Bs.)</label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-coffee-500 font-bold text-sm">S/</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 font-bold text-lg"
                        autoFocus
                      />
                    </div>
                    {cashNum >= mesaTotal && cashNum > 0 && (
                      <div className="mt-2 flex justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                        <span className="text-sm font-bold text-emerald-700">Vuelto</span>
                        <span className="text-sm font-black text-emerald-700">{formatCurrency(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* QR image */}
                {paymentMethod === 'transfer' && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider">Escanea para pagar</p>
                    <img src={qrPago} alt="QR de pago" className="w-44 h-44 rounded-xl border-2 border-coffee-200 shadow" />
                  </div>
                )}

                {/* Points preview */}
                {pointsPreview && pointsPreview.totalPoints > 0 && (
                  <div className="flex items-center gap-2.5 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">+{pointsPreview.totalPoints} puntos al completar</p>
                      {pointsPreview.bonusReasons.length > 0 && (
                        <p className="text-[11px] text-amber-600">{pointsPreview.bonusReasons.join(' · ')}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setModalView('review')} className="flex-1 py-3.5 rounded-2xl border-2 border-coffee-200 text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmSale}
                    disabled={isProcessing || (paymentMethod === 'cash' && cashNum > 0 && cashNum < mesaTotal)}
                    className={clsx(
                      'flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all',
                      isProcessing || (paymentMethod === 'cash' && cashNum > 0 && cashNum < mesaTotal)
                        ? 'bg-coffee-100 text-coffee-400 cursor-not-allowed'
                        : 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg',
                    )}
                  >
                    {isProcessing ? 'Procesando...' : 'Cobrar'}
                  </button>
                </div>
              </div>
            </div>
          </Overlay>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL: SUCCESS
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'success' && lastSaleResult && (
          <Overlay>
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-emerald-500 px-6 pt-8 pb-6 flex flex-col items-center text-white text-center">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="h-9 w-9 text-white" />
                </div>
                <h3 className="font-display font-bold text-2xl">¡Cobro exitoso!</h3>
                <p className="text-emerald-100 text-sm mt-1 font-mono">{lastSaleResult.code}</p>
                {activeMesa && <p className="text-emerald-200 text-xs mt-1">{activeMesa.name} liberada</p>}
              </div>

              <div className="p-5 space-y-3">
                {nextMilestone && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
                    <p className="text-2xl mb-1">{nextMilestone.icon}</p>
                    <p className="text-sm font-bold text-amber-800">¡Hito alcanzado!</p>
                    <p className="text-xs text-amber-600 mt-0.5">{nextMilestone.reward}</p>
                  </div>
                )}

                {lastSaleResult.points && lastSaleResult.points.totalPoints > 0 && (
                  <div className="bg-coffee-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      <div>
                        <p className="text-sm font-bold text-coffee-900">+{lastSaleResult.points.totalPoints} puntos</p>
                        {lastSaleResult.points.bonusReasons.length > 0 && (
                          <p className="text-xs text-coffee-500">{lastSaleResult.points.bonusReasons.join(' · ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-coffee-400">Saldo total</p>
                      <p className="text-sm font-bold text-coffee-800">{lastSaleResult.newBalance} pts</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => toast.info('Imprimiendo', 'Enviando a la impresora...')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-coffee-200 text-coffee-700 font-semibold text-sm hover:bg-coffee-50 transition-colors"
                  >
                    <Printer className="h-4 w-4" /> Recibo
                  </button>
                  <button
                    onClick={handleCloseSuccess}
                    className="flex-1 py-3 rounded-xl bg-coffee-800 text-cream font-bold text-sm hover:bg-coffee-700 active:scale-95 transition-all"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          </Overlay>
        )}


        {/* Combo detail */}
        {comboDetailProduct && (
          <Overlay onClose={() => setComboDetailProduct(null)}>
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Contenido del combo</p>
                  <h3 className="font-display font-bold text-cream text-lg">{comboDetailProduct.name}</h3>
                </div>
                <button onClick={() => setComboDetailProduct(null)} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="divide-y divide-coffee-50">
                {(comboDetails[comboDetailProduct.id] ?? []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <p className="flex-1 text-sm font-semibold text-coffee-900">{item.name}</p>
                    <span className="text-xs font-bold text-coffee-400 bg-coffee-50 rounded-full px-2.5 py-1">x{item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-coffee-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-coffee-400">Precio combo</p>
                  <p className="text-xl font-display font-black text-coffee-900">{formatCurrency(comboDetailProduct.salePrice)}</p>
                </div>
                <button
                  onClick={() => { addTempDirect(comboDetailProduct); setComboDetailProduct(null); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-coffee-800 text-cream text-sm font-bold hover:bg-coffee-700 active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" /> Agregar
                </button>
              </div>
            </div>
          </Overlay>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL: CANJE RÁPIDO (sin mesa)
        ═════════════════════════════════════════════════════════════════*/}

        {/* Elaborado detail modal */}
        {elaboradoDetailProduct && (
          <ElaboradoDetailModal
            isOpen
            onClose={() => setElaboradoDetailProduct(null)}
            product={elaboradoDetailProduct}
            atributos={getAtributosByProductId(elaboradoDetailProduct.id)}
            ingredientes={elaboradoIngredientes[elaboradoDetailProduct.id] ?? []}
            onConfirm={(opciones, precioFinal) => {
              addTempDirect(elaboradoDetailProduct, opciones, precioFinal);
              setElaboradoDetailProduct(null);
            }}
          />
        )}

        {/* Variacion picker (usado solo para canje de puntos) */}
        {varPickerProduct && (
          <VariacionPickerModal
            isOpen
            onClose={() => { setVarPickerProduct(null); setVarPickerDirect(false); setVarPickerRewardId(null); }}
            product={varPickerProduct}
            atributos={getAtributosByProductId(varPickerProduct.id)}
            isRedeem={varPickerRewardId != null}
            onConfirm={(opciones, precioFinal) => {
              if (varPickerRewardId) {
                addRedeemToTempCart(varPickerProduct, varPickerRewardId, opciones);
                toast.success('¡Canje agregado!', `${varPickerProduct.name} añadido al pedido.`);
                setVarPickerRewardId(null);
              } else if (varPickerDirect) {
                addDirectToMesa(varPickerProduct, opciones, precioFinal);
                setVarPickerDirect(false);
              } else {
                addTempDirect(varPickerProduct, opciones, precioFinal);
              }
              setVarPickerProduct(null);
            }}
          />
        )}

        {/* Redeem qty modal — productos sin variaciones */}
        {redeemQtyState && (
          <RedeemQtyModal
            isOpen
            onClose={() => setRedeemQtyState(null)}
            product={redeemQtyState.product}
            reward={redeemQtyState.reward}
            availablePoints={availablePoints}
            onConfirm={(qty) => {
              addRedeemToTempCart(redeemQtyState.product, redeemQtyState.reward.id, undefined, qty);
              toast.success('¡Canje agregado!', `${qty > 1 ? `${qty}× ` : ''}${redeemQtyState.reward.name} añadido al pedido.`);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};
