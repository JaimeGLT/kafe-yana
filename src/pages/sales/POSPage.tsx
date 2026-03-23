import React from 'react';
import { clsx } from 'clsx';
import {
  Plus, Minus, Trash2, Coffee, CheckCircle, Printer,
  CreditCard, Banknote, Smartphone, UserCheck, AlertTriangle,
  FlaskConical, Layers, X, User, Star, Users,
  UtensilsCrossed, ChevronRight, Search, PenLine,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { useSalesStore, useInventoryStore, useLoyaltyStore } from '../../stores';
import { useVariacionesStore } from '../../stores/variacionesStore';
import { formatCurrency } from '../../utils';
import type { Product, SaleInput, PaymentMethodType, OpcionSeleccionada } from '../../types';
import { useStockManager } from '../../hooks/useStockManager';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';
import type { PointsCalculation } from '../../types/loyalty';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════*/
interface CartItem {
  product: Product;
  quantity: number;
  opciones?: OpcionSeleccionada[];
  precioFinal: number;
  cartKey: string;
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
}

type ModalView =
  | 'none'
  | 'nueva_mesa'    // create / edit table
  | 'iniciar'       // confirm start table
  | 'detalle'       // table detail (order view)
  | 'agregar'       // product picker
  | 'review'        // order review before payment
  | 'pago'          // payment
  | 'success';      // done

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════*/
const TAX_RATE = 0.18;
const TOTAL_MESAS_INIT = 12;

const PAYMENT_METHODS: { type: PaymentMethodType; label: string; icon: React.ReactNode }[] = [
  { type: 'cash',     label: 'Efectivo',  icon: <Banknote   className="h-5 w-5" /> },
  { type: 'card',     label: 'Tarjeta',   icon: <CreditCard className="h-5 w-5" /> },
  { type: 'transfer', label: 'Yape/Plin', icon: <Smartphone className="h-5 w-5" /> },
  { type: 'credit',   label: 'Crédito',   icon: <UserCheck  className="h-5 w-5" /> },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════*/
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

const initMesas = (): Mesa[] =>
  Array.from({ length: TOTAL_MESAS_INIT }, (_, i) => ({
    id: `mesa-${i + 1}`,
    number: i + 1,
    name: `Mesa ${i + 1}`,
    status: 'libre',
    order: [],
  }));

const mesaOrderTotal = (order: CartItem[]) =>
  order.reduce((s, i) => s + i.precioFinal * i.quantity, 0);

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK — drag-to-scroll
═══════════════════════════════════════════════════════════════════════════*/
function useDragScroll<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const dragging = React.useRef(false);
  const startX   = React.useRef(0);
  const scrollL  = React.useRef(0);
  const moved    = React.useRef(false);

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
}
const ProdCard: React.FC<ProdCardProps> = ({ product, qty, unavailable, onAdd, onInc, onDec }) => (
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
    </div>
    {/* Info */}
    <div className="px-2.5 pt-2 pb-1 flex-1 flex flex-col">
      <p className="text-xs font-bold text-coffee-900 leading-tight line-clamp-2 font-display flex-1">{product.name}</p>
      <p className="text-sm font-black text-coffee-800 mt-1">{formatCurrency(product.salePrice)}</p>
    </div>
    {/* Controls */}
    <div className="px-2.5 pb-2.5">
      {qty === 0 ? (
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
    </div>
  </div>
);

// tiny helper used inside ProdCard — will be set in parent
let getAttrCount = (_p: Product) => 0;

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════*/
export const POSPage: React.FC = () => {
  const { products, categories } = useInventoryStore();
  const { customers, addSale } = useSalesStore();
  const { getAtributosByProductId } = useVariacionesStore();
  const { getElaboradoAvailability, checkStock, deductStock } = useStockManager();
  const {
    getOrCreateProfile, calculatePointsForAmount, awardPointsForSale,
    redeemPointsForDiscount, milestones,
  } = useLoyaltyStore();

  // wire helper used by ProdCard
  getAttrCount = (p: Product) => getAtributosByProductId(p.id).length;

  /* ── Mesa state ── */
  const [mesas, setMesas] = React.useState<Mesa[]>(initMesas);
  const [activeMesaId, setActiveMesaId] = React.useState<string | null>(null);
  const [modalView, setModalView] = React.useState<ModalView>('none');

  /* ── Nueva mesa form ── */
  const [nuevaMesaName, setNuevaMesaName] = React.useState('');
  const [editMesaId,    setEditMesaId]    = React.useState<string | null>(null);

  /* ── Temp state for "agregar" modal ── */
  const [selectedCatId, setSelectedCatId] = React.useState<string>('');
  const [tempCart,      setTempCart]      = React.useState<CartItem[]>([]);
  const [varPickerProduct, setVarPickerProduct] = React.useState<Product | null>(null);
  const [productSearch, setProductSearch] = React.useState('');
  const [showCartPreview, setShowCartPreview] = React.useState(false);

  /* ── Payment state ── */
  const [paymentMethod,  setPaymentMethod]  = React.useState<PaymentMethodType>('cash');
  const [cashReceived,   setCashReceived]   = React.useState('');
  const [isProcessing,   setIsProcessing]   = React.useState(false);
  const [usePoints,      setUsePoints]      = React.useState(false);
  const [pointsToRedeem, setPointsToRedeem] = React.useState(0);
  const [lastSaleResult, setLastSaleResult] = React.useState<{ code: string; points: PointsCalculation | null; newBalance: number } | null>(null);

  /* ── Drag scroll refs ── */
  const dragScroll    = useDragScroll<HTMLDivElement>();
  const dragScrollCat = useDragScroll<HTMLDivElement>();

  /* ── Derived ── */
  const activeMesa = activeMesaId ? mesas.find(m => m.id === activeMesaId) ?? null : null;

  const activeCategories = React.useMemo(() => categories.filter(c => c.isActive), [categories]);

  // products for the selected category in "agregar" modal
  const pickerProducts = React.useMemo(() => {
    const catId = selectedCatId || (activeCategories[0]?.id ?? '');
    return products.filter(p => {
      if (!p.isActive) return false;
      if (p.categoryId !== catId) return false;
      if (productSearch) {
        const q = productSearch.toLowerCase();
        if (!p.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, selectedCatId, activeCategories, productSearch]);

  const getEffectiveStock = React.useCallback((p: Product): { label: string; ok: boolean } => {
    if (p.tipo === 'elaborado') {
      const a = getElaboradoAvailability(p.id);
      return a === 0 ? { label: 'Sin insumos', ok: false } : { label: `~${a}`, ok: true };
    }
    return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: String(p.stock), ok: true };
  }, [getElaboradoAvailability]);

  /* ── Mesa order totals ── */
  const mesaSubtotal   = activeMesa ? mesaOrderTotal(activeMesa.order) : 0;
  const loyaltyProfile = activeMesa?.customerId ? getOrCreateProfile(activeMesa.customerId) : null;
  const maxRedeem      = loyaltyProfile ? Math.min(loyaltyProfile.points, Math.floor(mesaSubtotal * 0.3)) : 0;
  const pointsDiscount = usePoints ? pointsToRedeem : 0;
  const mesaTax        = (mesaSubtotal - pointsDiscount) * TAX_RATE;
  const mesaTotal      = mesaSubtotal - pointsDiscount + mesaTax;
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
    setUsePoints(false);
    setPointsToRedeem(0);
    setCashReceived('');
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
    const attrs = getAtributosByProductId(product.id);
    if (attrs.length > 0) setVarPickerProduct(product);
    else addTempDirect(product);
  };

  const incTempQty = (cartKey: string) =>
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i));
  const decTempQty = (cartKey: string) =>
    setTempCart(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
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
    setShowCartPreview(false);
    setModalView('detalle');
    toast.success('Productos agregados', `${tempCart.reduce((s, i) => s + i.quantity, 0)} item(s) añadidos a la mesa`);
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

  /* ── Checkout ── */
  const handleRequestPayment = () => {
    if (!activeMesa || activeMesa.order.length === 0) {
      toast.warning('Sin pedidos', 'Agrega productos antes de cobrar.');
      return;
    }
    const stockCart = activeMesa.order.map(i => ({ product: i.product, quantity: i.quantity, opciones: i.opciones, precioFinal: i.precioFinal }));
    const { canProceed, issues } = checkStock(stockCart);
    if (!canProceed) {
      const blockers = issues.filter(i => i.severity === 'error');
      return toast.error('Sin stock', blockers.map(i => `${i.productName}: ${i.issue}`).join(' | '));
    }
    updateMesa(activeMesa.id, { status: 'esperando_pago' });
    setModalView('review');
  };

  const handleConfirmSale = () => {
    if (!activeMesa) return;
    setIsProcessing(true);
    try {
      const saleInput: SaleInput = {
        customerId: activeMesa.customerId,
        items: activeMesa.order.map(i => ({ productId: i.product.id, quantity: i.quantity, discount: 0 })),
        discount: pointsDiscount,
        taxPercentage: 18,
        paymentMethods: [{ type: paymentMethod, amount: mesaTotal }],
      };
      const newSale = addSale(saleInput);
      deductStock(activeMesa.order.map(i => ({ product: i.product, quantity: i.quantity, opciones: i.opciones, precioFinal: i.precioFinal })));

      let earnedPoints: PointsCalculation | null = null;
      let newBalance = 0;
      if (activeMesa.customerId) {
        if (usePoints && pointsToRedeem > 0) redeemPointsForDiscount(activeMesa.customerId, pointsToRedeem);
        earnedPoints = awardPointsForSale(activeMesa.customerId, newSale.id, mesaTotal, hasCombo);
        newBalance = getOrCreateProfile(activeMesa.customerId).points;
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

  const nextMilestone = React.useMemo(() => {
    if (!loyaltyProfile) return null;
    const count = loyaltyProfile.purchaseCount + 1;
    return milestones.find(m => m.purchaseNumber === count) ?? null;
  }, [loyaltyProfile, milestones]);

  const customerOptions = [
    { value: '', label: 'Sin cliente registrado' },
    ...customers.filter(c => c.isActive).map(c => ({ value: c.id, label: c.name })),
  ];

  /* ── Init category for picker ── */
  React.useEffect(() => {
    if (activeCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(activeCategories[0].id);
    }
  }, [activeCategories, selectedCatId]);

  /* ══════════════════════════════════════════════════════════════════════
     STATUS CONFIG
  ═══════════════════════════════════════════════════════════════════════*/
  const STATUS_CFG: Record<MesaStatus, { label: string; dot: string; card: string; badge: string; icon: string; iconBg: string }> = {
    libre:          { label: 'Libre',          dot: 'bg-emerald-400',              card: 'bg-coffee-800/70 border-coffee-600/30 hover:bg-coffee-700/60 hover:border-coffee-500/60', badge: 'bg-emerald-950/80 text-emerald-400',  icon: 'text-coffee-400', iconBg: 'bg-coffee-900/60' },
    ocupada:        { label: 'Ocupada',        dot: 'bg-red-400 animate-pulse',    card: 'bg-red-950/40    border-red-600/60    hover:bg-red-950/60    hover:border-red-400',        badge: 'bg-red-950     text-red-400',          icon: 'text-red-400',    iconBg: 'bg-red-950/60'    },
    esperando_pago: { label: 'Esperando pago', dot: 'bg-amber-400 animate-pulse',  card: 'bg-amber-950/30  border-amber-600/60  hover:bg-amber-950/50  hover:border-amber-400',     badge: 'bg-amber-950   text-amber-400',        icon: 'text-amber-400',  iconBg: 'bg-amber-950/60'  },
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════*/
  return (
    <MainLayout>
      <div className="-m-6 min-h-[calc(100vh-4rem)] bg-coffee-900 overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-white text-2xl">Punto de Venta</h1>
            <p className="text-coffee-400 text-sm mt-0.5">
              <span className="text-red-400 font-medium">{mesas.filter(m => m.status === 'ocupada').length}</span> ocupadas ·{' '}
              <span className="text-amber-400 font-medium">{mesas.filter(m => m.status === 'esperando_pago').length}</span> esperando ·{' '}
              <span className="text-emerald-400 font-medium">{mesas.filter(m => m.status === 'libre').length}</span> libres
              {' '}· {mesas.length} total
            </p>
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
              onClick={openNuevaMesa}
              className="flex items-center gap-2 bg-coffee-600 hover:bg-coffee-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Nueva Mesa
            </button>
          </div>
        </div>

        {/* ── Mesa grid ──────────────────────────────────────────────── */}
        <div className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {mesas.map(mesa => {
            const cfg = STATUS_CFG[mesa.status];
            const total = mesaOrderTotal(mesa.order);
            const itemCount = mesa.order.reduce((s, i) => s + i.quantity, 0);
            const isLibre = mesa.status === 'libre';

            return (
              <button
                key={mesa.id}
                onClick={() => {
                  if (isLibre) openModal(mesa.id, 'iniciar');
                  else openModal(mesa.id, 'detalle');
                }}
                className={clsx(
                  'group relative flex flex-col items-center',
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
              </button>
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

              <div className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2 block">
                    Cliente (opcional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400 pointer-events-none" />
                    <select
                      defaultValue=""
                      id="iniciar-cliente"
                      className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-coffee-200 bg-white text-sm text-coffee-700 focus:outline-none focus:ring-2 focus:ring-coffee-400 appearance-none"
                    >
                      {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const sel = (document.getElementById('iniciar-cliente') as HTMLSelectElement)?.value ?? '';
                    handleIniciarMesa(activeMesa, sel || undefined);
                  }}
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
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <UtensilsCrossed className="h-5 w-5 text-cream" />
                  </div>
                  <div>
                    <p className="text-[10px] text-coffee-400 uppercase tracking-widest">
                      {STATUS_CFG[activeMesa.status].label}
                    </p>
                    <h3 className="font-display font-bold text-cream text-lg">{activeMesa.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={closeAll} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Customer info */}
              {activeMesa.customerId && (() => {
                const cust = customers.find(c => c.id === activeMesa.customerId);
                const prof = loyaltyProfile;
                return cust ? (
                  <div className="px-5 py-2.5 border-b border-coffee-100 flex items-center gap-2 bg-coffee-50 flex-shrink-0">
                    <Users className="h-4 w-4 text-coffee-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-coffee-700">{cust.name}</span>
                    {prof && (
                      <span className="ml-auto text-xs text-amber-600 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {prof.points} pts
                      </span>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Order items */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {activeMesa.order.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-coffee-300">
                    <Coffee className="h-10 w-10 opacity-30" />
                    <p className="text-sm text-coffee-400">Sin pedidos aún</p>
                  </div>
                ) : (
                  <div className="divide-y divide-coffee-50">
                    {activeMesa.order.map(item => (
                      <div key={item.cartKey} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-9 w-9 rounded-lg bg-coffee-50 flex items-center justify-center flex-shrink-0 text-lg">
                          {getProductEmoji(item.product)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-coffee-900 line-clamp-1">{item.product.name}</p>
                          {item.opciones?.length ? (
                            <p className="text-xs text-coffee-400 line-clamp-1">{item.opciones.map(o => o.opcionNombre).join(' · ')}</p>
                          ) : null}
                          <p className="text-xs text-coffee-500">{formatCurrency(item.precioFinal)} c/u</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => decMesaQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-coffee-900">{item.quantity}</span>
                          <button onClick={() => incMesaQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-right flex-shrink-0 min-w-[56px]">
                          <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
                          <button onClick={() => removeMesaItem(item.cartKey)} className="text-coffee-200 hover:text-red-400 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              {activeMesa.order.length > 0 && (
                <div className="px-5 py-3 bg-coffee-50 border-t border-coffee-100 flex items-center justify-between flex-shrink-0">
                  <span className="text-sm text-coffee-600">
                    Total del Pedido Actual
                  </span>
                  <span className="text-xl font-display font-black text-coffee-900">{formatCurrency(mesaSubtotal)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-4 border-t border-coffee-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => { setTempCart([]); setProductSearch(''); setShowCartPreview(false); setModalView('agregar'); }}
                  className="flex-1 py-3 rounded-2xl border-2 border-coffee-200 text-coffee-700 font-bold text-sm hover:bg-coffee-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Añadir Pedido
                </button>
                <button
                  onClick={handleRequestPayment}
                  disabled={activeMesa.order.length === 0}
                  className={clsx(
                    'flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5',
                    activeMesa.order.length > 0
                      ? 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg'
                      : 'bg-coffee-100 text-coffee-400 cursor-not-allowed',
                  )}
                >
                  Cobrar <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Close (empty) table */}
              {activeMesa.order.length === 0 && (
                <div className="px-5 pb-4 flex-shrink-0">
                  <button
                    onClick={() => handleCerrarMesa(activeMesa.id)}
                    className="w-full py-2.5 text-xs text-coffee-400 hover:text-red-500 transition-colors font-medium"
                  >
                    Cerrar mesa (sin pedidos)
                  </button>
                </div>
              )}
            </div>
          </Overlay>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL: AGREGAR PRODUCTOS
        ═════════════════════════════════════════════════════════════════*/}
        {modalView === 'agregar' && activeMesa && (
          <Overlay onClose={() => setModalView('detalle')}>
            <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-[10px] text-coffee-400 uppercase tracking-widest">Añadir a</p>
                  <h3 className="font-display font-bold text-cream text-lg">{activeMesa.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {tempCart.length > 0 && (
                    <button
                      onClick={() => setShowCartPreview(v => !v)}
                      className="flex items-center gap-1.5 text-xs bg-cream text-coffee-900 font-bold px-2.5 py-1 rounded-full hover:bg-coffee-50 active:scale-95 transition-all"
                    >
                      {tempCart.reduce((s, i) => s + i.quantity, 0)} items
                      <ChevronRight className={clsx('h-3 w-3 transition-transform', showCartPreview ? 'rotate-90' : '-rotate-90')} />
                    </button>
                  )}
                  <button onClick={() => setModalView('detalle')} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Cart preview dropdown */}
              {showCartPreview && tempCart.length > 0 && (
                <div className="bg-coffee-900 border-b border-coffee-700 flex-shrink-0 max-h-52 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {tempCart.map(item => (
                    <div key={item.cartKey} className="flex items-center gap-3 px-5 py-2.5 border-b border-coffee-800 last:border-0">
                      <span className="text-base">{getProductEmoji(item.product)}</span>
                      <p className="flex-1 text-sm font-semibold text-cream line-clamp-1">{item.product.name}</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => decTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-700 hover:bg-coffee-600 flex items-center justify-center text-coffee-200">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-cream">{item.quantity}</span>
                        <button onClick={() => incTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-600 hover:bg-coffee-500 flex items-center justify-center text-cream">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-cream w-16 text-right">{formatCurrency(item.precioFinal * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-coffee-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-coffee-200 text-sm text-coffee-800 placeholder-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-400"
                  />
                </div>
              </div>

              {/* Category tabs — drag-to-scroll */}
              <div
                ref={dragScrollCat.ref}
                onMouseDown={dragScrollCat.onMouseDown}
                onMouseMove={dragScrollCat.onMouseMove}
                onMouseUp={dragScrollCat.onMouseUp}
                onMouseLeave={dragScrollCat.onMouseLeave}
                className="px-4 pb-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {activeCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCatId(cat.id); setProductSearch(''); }}
                    className={clsx(
                      'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all',
                      selectedCatId === cat.id
                        ? 'bg-coffee-800 text-cream shadow-md'
                        : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Product row — SINGLE ROW, drag-to-scroll */}
              <div className="flex-shrink-0 border-t border-coffee-100">
                {pickerProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-coffee-300 gap-2">
                    <Coffee className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Sin productos en esta categoría</p>
                  </div>
                ) : (
                  <div
                    ref={dragScroll.ref}
                    onMouseDown={dragScroll.onMouseDown}
                    onMouseMove={dragScroll.onMouseMove}
                    onMouseUp={dragScroll.onMouseUp}
                    onMouseLeave={dragScroll.onMouseLeave}
                    className="flex gap-3 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {pickerProducts.map(product => {
                      const stock = getEffectiveStock(product);
                      const qty = getTempQty(product.id);
                      return (
                        <ProdCard
                          key={product.id}
                          product={product}
                          qty={qty}
                          unavailable={!stock.ok}
                          onAdd={() => addTempProduct(product)}
                          onInc={() => {
                            const key = buildCartKey(product.id);
                            incTempQty(key);
                          }}
                          onDec={() => {
                            const key = buildCartKey(product.id);
                            decTempQty(key);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm button */}
              <div className="px-5 py-4 border-t border-coffee-100 flex-shrink-0">
                <button
                  onClick={confirmAddToMesa}
                  disabled={tempCart.length === 0}
                  className={clsx(
                    'w-full py-4 rounded-2xl font-bold text-base transition-all',
                    tempCart.length > 0
                      ? 'bg-coffee-800 text-cream hover:bg-coffee-700 active:scale-95 shadow-lg'
                      : 'bg-coffee-100 text-coffee-400 cursor-not-allowed',
                  )}
                >
                  {tempCart.length > 0
                    ? `Añadir ${tempCart.reduce((s, i) => s + i.quantity, 0)} item(s) a ${activeMesa.name}`
                    : 'Selecciona productos'}
                </button>
              </div>
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
                      <p className="text-sm font-semibold text-coffee-900 line-clamp-1">{item.product.name}</p>
                      {item.opciones?.length ? <p className="text-xs text-coffee-400 line-clamp-1">{item.opciones.map(o => o.opcionNombre).join(' · ')}</p> : null}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-coffee-400 bg-coffee-100 rounded-lg px-2 py-0.5 font-semibold">×{item.quantity}</span>
                      <span className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-shrink-0 border-t border-coffee-100">
                <div className="px-5 py-3 space-y-1 bg-coffee-50">
                  <div className="flex justify-between text-sm text-coffee-600"><span>Subtotal</span><span>{formatCurrency(mesaSubtotal)}</span></div>
                  {usePoints && pointsToRedeem > 0 && (
                    <div className="flex justify-between text-sm text-amber-600 font-medium"><span>Descuento pts.</span><span>-{formatCurrency(pointsToRedeem)}</span></div>
                  )}
                  <div className="flex justify-between text-sm text-coffee-600"><span>IGV 18%</span><span>{formatCurrency(mesaTax)}</span></div>
                  <div className="flex justify-between font-bold text-coffee-900 text-lg border-t border-coffee-200 pt-2">
                    <span>Total a Enviar</span>
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

                {/* Points toggle */}
                {loyaltyProfile && loyaltyProfile.points >= 5 && (
                  <div className="flex items-center justify-between bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
                    <div>
                      <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        Usar {maxRedeem} pts = {formatCurrency(maxRedeem)} dto.
                      </p>
                    </div>
                    <button
                      onClick={() => { const n = !usePoints; setUsePoints(n); setPointsToRedeem(n ? maxRedeem : 0); }}
                      className={clsx('relative w-10 h-5 rounded-full transition-colors flex-shrink-0', usePoints ? 'bg-amber-500' : 'bg-coffee-200')}
                    >
                      <span className={clsx('absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform', usePoints ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                )}

                {/* Payment methods */}
                <div>
                  <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2.5">Método de pago</p>
                  <div className="grid grid-cols-4 gap-2">
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

        {/* Variacion picker */}
        {varPickerProduct && (
          <VariacionPickerModal
            isOpen
            onClose={() => setVarPickerProduct(null)}
            product={varPickerProduct}
            atributos={getAtributosByProductId(varPickerProduct.id)}
            onConfirm={(opciones, precioFinal) => {
              addTempDirect(varPickerProduct, opciones, precioFinal);
              setVarPickerProduct(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};
