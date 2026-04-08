import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Minus, Trash2, Coffee, CheckCircle, Printer,
  CreditCard, Banknote, Smartphone, AlertTriangle,
  FlaskConical, Layers, X, Star, Gift,
  UtensilsCrossed, ChevronLeft, ChevronRight, PenLine, History, ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
// import { api } from '../../lib/api'; // TODO: reconectar cuando el backend esté listo
import {
  MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_ATRIBUTOS,
  MOCK_CUSTOMERS, MOCK_LOYALTY_PROFILES, MOCK_MILESTONES, MOCK_REWARDS,
  MOCK_COMBO_DETAILS,
  mockAddSale, mockGenerateInvoice,
} from './posMocks';
import { formatCurrency } from '../../utils';
import qrPago from '../../assets/qr-pago.svg';
import type { Product, Category, Customer, SaleInput, PaymentMethodType, OpcionSeleccionada, VariacionAtributo } from '../../types';
import type { BillingData } from '../../components/modals/BillingModal';
import type { LoyaltyProfile, PointsCalculation, MilestoneReward, Reward } from '../../types/loyalty';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';
import { BillingModal } from '../../components/modals/BillingModal';

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
  | 'review'        // order review before payment
  | 'pago'          // payment
  | 'billing'       // billing data after payment
  | 'success'       // done
  | 'canje_rapido'; // standalone reward redemption

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════*/
const TAX_RATE = 0.18;
const TOTAL_MESAS_INIT = 12;

const PAYMENT_METHODS: { type: PaymentMethodType; label: string; icon: React.ReactNode }[] = [
  { type: 'cash',     label: 'Efectivo',  icon: <Banknote   className="h-5 w-5" /> },
  { type: 'card',     label: 'Tarjeta',   icon: <CreditCard className="h-5 w-5" /> },
  { type: 'transfer', label: 'QR', icon: <Smartphone className="h-5 w-5" /> },
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
  alreadyRedeemed?: boolean;
}
const ProdCard: React.FC<ProdCardProps> = ({ product, qty, unavailable, onAdd, onInc, onDec, onInfo, rewardInfo, onRedeem, alreadyRedeemed }) => (
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
      {rewardInfo && onRedeem && (
        <button
          disabled={alreadyRedeemed}
          onClick={e => { e.stopPropagation(); onRedeem(); }}
          className={clsx(
            'mt-1.5 w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all border',
            alreadyRedeemed
              ? 'bg-amber-50 border-amber-200 text-amber-300 cursor-not-allowed'
              : 'bg-amber-400 border-amber-400 text-white hover:bg-amber-300 active:scale-95',
          )}
        >
          <Gift className="h-3 w-3" />
          {alreadyRedeemed ? 'Canjeado' : `Canjear · ${rewardInfo.pointsCost} pts`}
        </button>
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [_customers, setCustomers] = useState<Customer[]>([]);
  const [atributos, setAtributos] = useState<VariacionAtributo[]>([]);
  const [loyaltyProfiles, setLoyaltyProfiles] = useState<LoyaltyProfile[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [milestones, setMilestones] = useState<MilestoneReward[]>([]);
  const [_loading, setLoading] = useState(true);

  // TODO: reemplazar mocks con llamadas reales cuando el backend esté listo
  useEffect(() => {
    // Simula una pequeña latencia de carga
    const t = setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      setCategories(MOCK_CATEGORIES);
      setCustomers(MOCK_CUSTOMERS);
      setAtributos(MOCK_ATRIBUTOS);
      setLoyaltyProfiles(MOCK_LOYALTY_PROFILES);
      setMilestones(MOCK_MILESTONES);
      setRewards(MOCK_REWARDS);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const getAtributosByProductId = useCallback((productId: string): VariacionAtributo[] => {
    return atributos.filter((a: VariacionAtributo) => a.productId === productId);
  }, [atributos]);

  // wire helper used by ProdCard
  getAttrCount = (p: Product) => getAtributosByProductId(p.id).length;

  // TODO: reconectar con api.post cuando el backend esté listo
  const addSale = useCallback((saleInput: SaleInput) => mockAddSale(saleInput), []);

  const generateInvoiceForSale = useCallback(async (saleId: string, billing: { tipoDocumento: 'boleta' | 'factura'; ruc?: string; razonSocial?: string; direccionFiscal?: string }) => {
    return mockGenerateInvoice(saleId, billing);
  }, []);

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

  /* ── Detalle view ── */
  const [detalleView, setDetalleView] = useState<'none' | 'pedido' | 'historial'>('none');

  /* ── Temp state for product picker ── */
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [tempCart,      setTempCart]      = useState<CartItem[]>([]);
  const [varPickerProduct, setVarPickerProduct] = useState<Product | null>(null);
  const [varPickerDirect, setVarPickerDirect] = useState(false);
  const [comboDetailProduct, setComboDetailProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');

  /* ── Payment state ── */
  const [paymentMethod,    setPaymentMethod]    = useState<PaymentMethodType>('cash');
  const [cashReceived,     setCashReceived]     = useState('');
  const [isProcessing,     setIsProcessing]     = useState(false);
  const [canjeClienteId,   setCanjeClienteId]   = useState('');
  const [lastSaleResult,   setLastSaleResult]   = useState<{ code: string; points: PointsCalculation | null; newBalance: number } | null>(null);
  const [pendingBillingSaleId, setPendingBillingSaleId] = useState<string | null>(null);

  /* ── Drag scroll refs ── */
  const dragScrollDetalleCat  = useDragScroll<HTMLDivElement>();
  const dragScrollDetalleProd = useDragScroll<HTMLDivElement>();

  /* ── Derived ── */
  const activeMesa = activeMesaId ? mesas.find(m => m.id === activeMesaId) ?? null : null;

  const activeCategories = useMemo(() => categories.filter(c => c.isActive), [categories]);

  // products for the selected category in "agregar" modal
  const pickerProducts = useMemo(() => {
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

  const getEffectiveStock = useCallback((p: Product): { label: string; ok: boolean } => {
    // For elaborado products, we would need to check recipe availability
    // For now, simplified check
    return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: String(p.stock), ok: true };
  }, []);

  /* ── Mesa order totals ── */
  const mesaSubtotal   = activeMesa ? mesaOrderTotal(activeMesa.order) : 0;
  const loyaltyProfile = activeMesa?.customerId ? getOrCreateProfile(activeMesa.customerId) : null;
  const mesaTax        = mesaSubtotal * TAX_RATE;
  const mesaTotal      = mesaSubtotal + mesaTax;
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

  /* ── Canjear recompensa directo al order de la mesa ── */
  const addRedeemToMesa = (product: Product, rewardId: string) => {
    if (!activeMesaId) return;
    const canjeKey = `${product.id}__canje`;
    setMesas(prev => prev.map(m => {
      if (m.id !== activeMesaId) return m;
      if (m.order.some(i => i.redeemRewardId === rewardId)) return m; // ya canjeado
      return { ...m, order: [...m.order, { product, quantity: 1, precioFinal: 0, cartKey: canjeKey, redeemRewardId: rewardId }] };
    }));
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
      setPendingBillingSaleId(newSale.id);
      setModalView('billing');
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
                <span className="text-red-400 font-semibold">{mesas.filter(m => m.status === 'ocupada').length}</span>
                <span className="hidden sm:inline"> ocupadas</span>
                <span className="sm:hidden"> ocup.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-amber-400 font-semibold">{mesas.filter(m => m.status === 'esperando_pago').length}</span>
                <span className="hidden sm:inline"> esperando</span>
                <span className="sm:hidden"> esp.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-300">
                <span className="text-emerald-400 font-semibold">{mesas.filter(m => m.status === 'libre').length}</span>
                <span className="hidden sm:inline"> libres</span>
                <span className="sm:hidden"> lib.</span>
              </span>
              <span className="text-coffee-500 text-xs">·</span>
              <span className="text-xs sm:text-sm text-coffee-400">{mesas.length} total</span>
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
              onClick={() => { setCanjeClienteId(''); setModalView('canje_rapido'); }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Gift className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Canjear</span>
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

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-coffee-400 uppercase tracking-wider">
                    Cliente <span className="font-normal text-coffee-300">(opcional)</span>
                  </label>
                  <select
                    value={iniciarClienteId}
                    onChange={e => setIniciarClienteId(e.target.value)}
                    className="mt-1.5 w-full px-3.5 py-3 rounded-xl border-2 border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 text-sm font-medium bg-white"
                  >
                    <option value="">— Sin cliente —</option>
                    {_customers.map(c => {
                      const prof = getOrCreateProfile(c.id);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name}{prof ? ` · ${prof.points} pts` : ''}
                        </option>
                      );
                    })}
                  </select>
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
                      <UtensilsCrossed className="h-5 w-5 text-cream" />
                    </div>
                    <div>
                      <p className="text-[10px] text-coffee-400 uppercase tracking-widest">
                        {STATUS_CFG[activeMesa.status].label}
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
                        ? rewards.find(r => r.isActive && r.productId === product.id && loyaltyProfile.points >= r.pointsCost) ?? null
                        : null;
                      const alreadyRedeemed = !!activeMesa.order.find(i => i.redeemRewardId && rewards.find(r => r.id === i.redeemRewardId)?.productId === product.id);
                      return (
                        <ProdCard
                          key={product.id}
                          product={product}
                          qty={qty}
                          unavailable={!stock.ok}
                          onAdd={() => addTempProduct(product)}
                          onInc={() => incTempQty(buildCartKey(product.id))}
                          onDec={() => decTempQty(buildCartKey(product.id))}
                          onInfo={product.tipo === 'combo' ? () => setComboDetailProduct(product) : undefined}
                          rewardInfo={reward ? { icon: reward.icon, pointsCost: reward.pointsCost } : null}
                          onRedeem={reward ? () => {
                            addRedeemToMesa(product, reward.id);
                            toast.success('¡Canje agregado!', `${reward.name} añadido al pedido.`);
                          } : undefined}
                          alreadyRedeemed={alreadyRedeemed}
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
                          <div key={item.cartKey} className="flex items-center gap-3 px-5 py-3">
                            <span className="text-xs font-bold text-coffee-300 w-4 flex-shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                              {item.opciones?.length ? (
                                <p className="text-xs text-coffee-400 line-clamp-1 mt-0.5">{item.opciones.map(o => o.opcionNombre).join(' · ')}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
                                <button onClick={() => removeTempItem(item.cartKey)} className="text-coffee-200 hover:text-red-400 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => decTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-100 hover:bg-coffee-200 flex items-center justify-center text-coffee-600">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-5 text-center text-sm font-bold text-coffee-900">{item.quantity}</span>
                                <button onClick={() => incTempQty(item.cartKey)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
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
                          <div key={item.cartKey} className="flex items-center gap-3 px-5 py-3">
                            <span className="text-xs font-bold text-coffee-300 w-4 flex-shrink-0">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                              {item.opciones?.length ? (
                                <p className="text-xs text-coffee-400 line-clamp-1 mt-0.5">{item.opciones.map(o => o.opcionNombre).join(' · ')}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-coffee-900">{formatCurrency(item.precioFinal * item.quantity)}</p>
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
                      <button
                        onClick={() => updateMesa(activeMesa.id, { customerId: undefined })}
                        className="text-[11px] text-coffee-400 hover:text-red-400 transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-coffee-400 flex-shrink-0">Cliente:</span>
                      <select
                        value=""
                        onChange={e => { if (e.target.value) updateMesa(activeMesa.id, { customerId: e.target.value }); }}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-coffee-200 focus:border-coffee-500 focus:outline-none text-coffee-900 bg-white"
                      >
                        <option value="">— Vincular cliente —</option>
                        {_customers.map(c => {
                          const prof = getOrCreateProfile(c.id);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name}{prof ? ` · ${prof.points} pts` : ''}
                            </option>
                          );
                        })}
                      </select>
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

        {/* ══════════════════════════════════════════════════════════════
            MODAL: BILLING
        ═════════════════════════════════════════════════════════════════*/}
        <BillingModal
          isOpen={modalView === 'billing'}
          saleCode={lastSaleResult?.code}
          customers={_customers}
          onDone={async (billing: BillingData) => {
            if (pendingBillingSaleId) {
              const invoicePayload = billing.nit === '0'
                ? { tipoDocumento: 'boleta' as const }
                : { tipoDocumento: 'factura' as const, ruc: billing.nit, razonSocial: billing.name };
              await generateInvoiceForSale(pendingBillingSaleId, invoicePayload);
            }
            setPendingBillingSaleId(null);
            setModalView('success');
          }}
        />

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
                {(MOCK_COMBO_DETAILS[comboDetailProduct.id] ?? []).map((item, idx) => (
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
                  onClick={() => { addTempProduct(comboDetailProduct); setComboDetailProduct(null); }}
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
        {modalView === 'canje_rapido' && (() => {
          const canjeProfile = canjeClienteId ? getOrCreateProfile(canjeClienteId) : null;
          const canjeRewards = canjeProfile
            ? rewards.filter(r => r.isActive && canjeProfile.points >= r.pointsCost)
            : [];
          return (
            <Overlay onClose={() => setModalView('none')}>
              <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-amber-600 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-200 uppercase tracking-widest">Fidelización</p>
                      <p className="text-white font-semibold text-sm">Canje de recompensa</p>
                    </div>
                  </div>
                  <button onClick={() => setModalView('none')} className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Selector de cliente */}
                  <div>
                    <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2">Cliente</p>
                    <select
                      value={canjeClienteId}
                      onChange={e => setCanjeClienteId(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl border-2 border-coffee-200 focus:border-amber-400 focus:outline-none text-coffee-900 text-sm font-medium bg-white"
                    >
                      <option value="">— Seleccionar cliente —</option>
                      {_customers.map(c => {
                        const prof = getOrCreateProfile(c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name}{prof ? ` · ${prof.points} pts` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Recompensas disponibles */}
                  {canjeProfile && (
                    <div>
                      <p className="text-xs font-bold text-coffee-400 uppercase tracking-wider mb-2">
                        Recompensas disponibles
                        <span className="ml-1.5 font-normal text-amber-600">{canjeProfile.points} pts</span>
                      </p>
                      {canjeRewards.length === 0 ? (
                        <p className="text-sm text-coffee-400 italic text-center py-4">
                          No hay recompensas disponibles con los puntos actuales.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {canjeRewards.map(r => (
                            <div key={r.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-coffee-200 bg-white">
                              <span className="text-2xl leading-none">{r.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-coffee-900 leading-tight">{r.name}</p>
                                <p className="text-xs text-coffee-400 leading-tight">{r.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-bold text-amber-700">{r.pointsCost} pts</span>
                                </div>
                                <button
                                  onClick={() => {
                                    const ok = redeemReward(canjeClienteId, r.id);
                                    if (ok) {
                                      toast.success('¡Canje exitoso!', `${r.name} canjeado correctamente.`);
                                      setModalView('none');
                                    } else {
                                      toast.error('Error', 'No se pudo completar el canje.');
                                    }
                                  }}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white transition-colors"
                                >
                                  Canjear
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!canjeProfile && canjeClienteId && (
                    <p className="text-sm text-coffee-400 italic text-center py-4">
                      Este cliente no tiene perfil de puntos aún.
                    </p>
                  )}
                </div>
              </div>
            </Overlay>
          );
        })()}

        {/* Variacion picker */}
        {varPickerProduct && (
          <VariacionPickerModal
            isOpen
            onClose={() => { setVarPickerProduct(null); setVarPickerDirect(false); }}
            product={varPickerProduct}
            atributos={getAtributosByProductId(varPickerProduct.id)}
            onConfirm={(opciones, precioFinal) => {
              if (varPickerDirect) {
                addDirectToMesa(varPickerProduct, opciones, precioFinal);
                setVarPickerDirect(false);
              } else {
                addTempDirect(varPickerProduct, opciones, precioFinal);
              }
              setVarPickerProduct(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};
