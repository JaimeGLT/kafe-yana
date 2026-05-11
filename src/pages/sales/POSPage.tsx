import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { clsx } from 'clsx';
import {
  Plus, Minus, Trash2, Coffee, Printer,
  X, Star, Gift, Search,
  UtensilsCrossed, ChevronLeft, ChevronRight, PenLine, History, ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { gql } from '../../lib/graphql';
import { GET_POS_DATA } from '../../lib/queries/products.queries';
import { GET_ELABORADO_INGREDIENTES } from '../../lib/queries/elaborados.queries';
import { usePOSMesas } from '../../hooks/usePOSMesas';
import { useVenta } from '../../hooks/useVenta';
import { usePOSCart } from '../../hooks/usePOSCart';
import { usePOSLoyalty } from '../../hooks/usePOSLoyalty';
import { formatCurrency } from '../../utils';
import { formatOpcionLabel, formatOpcionLabelString } from '../../utils/opcionUtils';
import { SkeletonMesaGrid, SkeletonCategoryTabs, SkeletonProductScroll, Overlay, ConfirmModal } from '../../components/ui';
import { MesaCard } from '../../components/pos/MesaCard';
import { NuevaMesaModal } from '../../components/pos/NuevaMesaModal';
import { IniciarMesaModal } from '../../components/pos/IniciarMesaModal';
import { ComboDetailPanel } from '../../components/pos/ComboDetailPanel';
import type { Product, Category, Customer, SaleInput, PaymentMethodType, VariacionAtributo } from '../../types';
import type { Reward, MilestoneReward, PointsCalculation } from '../../types/loyalty';
import { VariacionPickerModal } from '../../components/modals/VariacionPickerModal';
import { ElaboradoDetailModal } from '../../components/modals/ElaboradoDetailModal';
import { ProdCard } from '../../components/modals/ProdCard';
import { RedeemQtyModal } from '../../components/modals/RedeemQtyModal';
import { SearchableSelect } from '../../components/ui/Select';
import { Tooltip } from '../../components/ui/Tooltip';

const ReviewPanel = lazy(() => import('../../components/pos/ReviewPanel').then(m => ({ default: m.ReviewPanel })));
const PagoPanel = lazy(() => import('../../components/pos/PagoPanel').then(m => ({ default: m.PagoPanel })));
const SuccessPanel = lazy(() => import('../../components/pos/SuccessPanel').then(m => ({ default: m.SuccessPanel })));

type ModalView = 'none' | 'nueva_mesa' | 'iniciar' | 'iniciar_para_llevar' | 'detalle' | 'review' | 'pago' | 'success';
type DetalleView = 'none' | 'pedido' | 'historial';

const TIPO_PAGO_MAP: Record<string, number> = {
  cash: 1,
  transfer: 2,
  card: 3,
};

const mesaOrderTotal = (order: any[]) =>
  order.reduce((s, i) => s + i.precioFinal * i.quantity, 0);

const printComanda = (mesaName: string, roundNumber: number, items: any[]) => {
  const win = window.open('', '_blank', 'width=320,height=500');
  if (!win) return;
  const now = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  const rows = items.map(i => {
    const nota = i.notes ? `<div style="font-size:10px;color:#555;padding-left:8px">↳ ${i.notes}</div>` : '';
    const opciones = i.opciones?.map((o: any) => `<div style="font-size:10px;color:#555;padding-left:8px">· ${formatOpcionLabelString(o)}</div>`).join('') ?? '';
    return `<div style="margin-bottom:6px"><strong>${i.quantity}×</strong> ${i.product.name}${opciones}${nota}</div>`;
  }).join('');
  win.document.write(`
    <html><body style="font-family:monospace;font-size:13px;padding:16px;max-width:300px">
      <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:8px;margin-bottom:8px">
        <strong style="font-size:16px">${mesaName}</strong><br/>
        <span>Ronda #${roundNumber} · ${now}</span>
      </div>
      ${rows}
      <div style="border-top:2px dashed #000;margin-top:8px;padding-top:6px;text-align:center;font-size:11px">
        — COMANDA —
      </div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  win.print();
  win.close();
};

function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollL = useRef(0);
  const moved = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollL.current = ref.current.scrollLeft;
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

type MesaStatus = 'libre' | 'ocupada' | 'esperando_pago';

const STATUS_CFG: Record<MesaStatus, { label: string; dot: string; card: string; badge: string; icon: string; iconBg: string }> = {
  libre:          { label: 'Libre',          dot: 'bg-emerald-400',              card: 'bg-coffee-700/35 border-coffee-500/30 hover:bg-coffee-700/50 hover:border-coffee-400/50', badge: 'bg-emerald-500/20 text-emerald-300',  icon: 'text-coffee-300', iconBg: 'bg-coffee-800/70' },
  ocupada:        { label: 'Ocupada',        dot: 'bg-red-400 animate-pulse',    card: 'bg-red-900/45    border-red-500/55    hover:bg-red-900/60    hover:border-red-400/75',     badge: 'bg-red-500/20     text-red-300',         icon: 'text-red-300',    iconBg: 'bg-red-900/50'    },
  esperando_pago: { label: 'Esperando pago', dot: 'bg-amber-400 animate-pulse',  card: 'bg-amber-900/35  border-amber-500/50  hover:bg-amber-900/50  hover:border-amber-400/70',  badge: 'bg-amber-500/20   text-amber-300',       icon: 'text-amber-300',  iconBg: 'bg-amber-900/50'  },
};

export const POSPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [atributos, setAtributos] = useState<VariacionAtributo[]>([]);
  const [comboDetails, setComboDetails] = useState<Record<string, { name: string; quantity: number; emoji: string }[]>>({});
  const [rewards, _setRewards] = useState<Reward[]>([]);
  const [milestones, _setMilestones] = useState<MilestoneReward[]>([]);
  const [, setLoading] = useState(true);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [elaboradoExtras, setElaboradoExtras] = useState<Record<string, {
    insumosStock: Array<{ id: string; nombre: string; stock: number }>;
    opcionesStockInfo: Array<{ opcionId: string; tipoAjuste: string; cantidad: number; insumoRequeridoId: string | null; insumoReemplazoId: string | null }>;
    receta: { detalles: Array<{ insumo: { id: string; nombre: string }; cantidad: number }> } | null;
    variaciones: Array<{ opciones: Array<{ id: string; ajustes: Array<{ tipoAjuste: string; cantidad: number; insumoBase: { id: string }; insumoNuevo: { id: string } | null }> }> }>;
    stockInsumos: Record<string, number>;
  }>>({});
  const [stockInsumosGlobal, setStockInsumosGlobal] = useState<Record<string, number>>({});

  const {
    tempCart,
    varPickerProduct, setVarPickerProduct,
    varPickerDirect, setVarPickerDirect,
    varPickerRewardId, setVarPickerRewardId,
    redeemQtyState, setRedeemQtyState,
    comboDetailProduct, setComboDetailProduct,
    elaboradoDetailProduct, setElaboradoDetailProduct,
    elaboradoIngredientes, setElaboradoIngredientes,
    buildCartKey,
    addTempDirect,
    addRedeemToTempCart,
    incTempQty, decTempQty, removeTempItem,
    getTempQty, updateTempItemNote, clearTempCart,
  } = usePOSCart();

  const {
    loyaltyProfiles: _lp,
    setLoyaltyProfiles,
    getOrCreateProfile,
    calculatePointsForAmount,
    awardPointsForSale,
    redeemReward,
  } = usePOSLoyalty();

  const {
    mesas,
    activeMesa,
    activeMesaId,
    setActiveMesaId,
    loadingMesas,
    openParaLlevar,
    openNuevaMesa,
    openEditMesa,
    handleSaveMesa,
    handleDeleteMesa,
    handleIniciarMesa,
    handleCerrarMesa,
    sendToKitchen,
    updateMesa,
    isSendingToKitchen,
    isClosingMesa,
    isSavingMesa,
    isStartingMesa,
    isDeletingMesa,
    nuevaMesaName,
    setNuevaMesaName,
    editMesaId,
  } = usePOSMesas();

  const { cobrarParaLlevar } = useVenta();

  const loadProducts = useCallback(async () => {
    if (productsLoaded) return;
    try {
      const data = await gql<{
        elaborados: { nodes: Array<{
          id_Producto: number; unidad_medida: string;
          producible: boolean; stock_actual: number;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; imagen?: string;
            categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
          receta: { id: number; cantidadProducible: number };
          variaciones: Array<{ id: number; nombre: string; requerido: boolean;
            opciones: Array<{ id: number; nombre: string; ajustePrecio: number; id_variacion: number;
              ajustes: Array<{ tipoAjuste: string; cantidad: number; insumoBase: { id: number; nombre: string } | null; insumoNuevo: { id: number; nombre: string } | null }> }> }>;
        }> };
        comprados: { nodes: Array<{
          costo_compra: number; stock_actual: number; disponible: boolean;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; imagen?: string;
            categoria: { id: number; nombre: string; descripcion: string; estado: boolean; color: string } | null };
        }> };
        combos: { nodes: Array<{
          cantidadProducible: number;
          producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; imagen?: string };
          detalles: Array<{ producto: { id: number; nombre: string; descripcion: string; precio: number; tipo: string; imagen?: string }; cantidad: number; opcional: boolean }>;
        }> };
        categorias: { nodes: Array<{ id: number; nombre: string; descripcion: string; color: string; estado: boolean }> };
        clientes: { nodes: Array<{ dni: string; nombre: string; celular: string; correo: string; fecha_nacimiento: string; direccion: string; puntos: number; estado: boolean; id: string }> };
      }>(GET_POS_DATA);

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
          image: n.producto.imagen ?? undefined,
          tipo: 'elaborado', categoryId: cat ? String(cat.id) : '',
          unit: n.unidad_medida ?? 'unidad', costPrice: 0,
          salePrice: n.producto.precio, stock: n.stock_actual ?? 999,
          minStock: 0, maxStock: 0, variations: [], isActive: true,
          hasVariations: n.variaciones.length > 0,
          producible: n.producible,
          cantidadProducible: n.receta?.cantidadProducible,
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
            image: n.producto.imagen ?? undefined,
            tipo: 'comprado' as const,
            categoryId: cat ? String(cat.id) : '',
            unit: 'unidad', costPrice: n.costo_compra,
            salePrice: n.producto.precio, stock: n.stock_actual,
            minStock: 0, maxStock: 0, variations: [], isActive: true,
            hasVariations: false, createdAt: new Date(), updatedAt: new Date(),
          };
        });

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
      const newComboDetails: Record<string, { name: string; quantity: number; emoji: string }[]> = {};

      for (const n of data.combos.nodes) {
        const id = String(n.producto.id);
        comboProducts.push({
          id, code: id,
          name: n.producto.nombre, description: n.producto.descripcion ?? '',
          image: n.producto.imagen ?? undefined,
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
      setCustomers(data.clientes.nodes as Customer[]);
      setProductsLoaded(true);
    } catch {
      toast.error('Error', 'No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, [productsLoaded]);

  const refreshStock = useCallback(async () => {
  try {
    const data = await gql<any>(GET_POS_DATA);
    setProducts(prev => prev.map(p => {
      if (p.tipo === 'comprado') {
        const found = data.comprados.nodes.find((n: any) => String(n.producto.id) === p.id);
        return found ? { ...p, stock: found.stock_actual } : p;
      }
      if (p.tipo === 'elaborado') {
        const found = data.elaborados.nodes.find((n: any) => String(n.id_Producto) === p.id);
        return found ? { ...p, stock: found.stock_actual, cantidadProducible: found.receta?.cantidadProducible } : p;
      }
      return p;
    }));
    setElaboradoExtras({});
    setStockInsumosGlobal({});
  } catch {
    // silencioso
  }
}, []);

  const getAtributosByProductId = useCallback((productId: string): VariacionAtributo[] => {
    return atributos.filter((a: VariacionAtributo) => a.productId === productId);
  }, [atributos]);

  const addSale = useCallback((saleInput: SaleInput) => api.post<any>('/ventas', saleInput), []);

  const [modalView, setModalView] = useState<ModalView>('none');
  const [detalleView, setDetalleView] = useState<DetalleView>('none');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');

  const [iniciarClienteId, setIniciarClienteId] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showDetalleNewCustomerForm, setShowDetalleNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [reviewClienteId, setReviewClienteId] = useState<string | null>(null);
  const [reviewShowNewCustomerForm, setReviewShowNewCustomerForm] = useState(false);
  const [reviewNewCustomerName, setReviewNewCustomerName] = useState('');
  const [reviewNewCustomerPhone, setReviewNewCustomerPhone] = useState('');
  const [confirmDeleteMesaId, setConfirmDeleteMesaId] = useState<string | null>(null);
  const [mesaToDeleteName, setMesaToDeleteName] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isOpeningParaLlevar, setIsOpeningParaLlevar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaleResult, setLastSaleResult] = useState<{ code: string; points: PointsCalculation | null; newBalance: number } | null>(null);

  const dragScrollDetalleCat = useDragScroll<HTMLDivElement>();
  const dragScrollDetalleProd = useDragScroll<HTMLDivElement>();

  const activeCategories = useMemo(() => categories.filter(c => c.isActive), [categories]);

  const pickerProducts = useMemo(() => {
    if (productSearch) {
      const q = productSearch.toLowerCase();
      return products.filter(p => p.isActive && p.name.toLowerCase().includes(q));
    }
    const catId = selectedCatId || (activeCategories[0]?.id ?? '');
    return products.filter(p => p.isActive && p.categoryId === catId);
  }, [products, selectedCatId, activeCategories, productSearch]);

  const getEffectiveStock = useCallback((p: Product): { label: string; ok: boolean } => {
    if (p.tipo === 'comprado') {
      return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${p.stock}`, ok: true };
    }
    if (p.tipo === 'combo') {
      return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${p.stock}`, ok: true };
    }
    if (p.tipo === 'elaborado') {
      if (!p.producible) {
        return { label: '', ok: true };
      }
      return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: `Stock: ${p.stock}`, ok: true };
    }
    return p.stock <= 0 ? { label: 'Agotado', ok: false } : { label: String(p.stock), ok: true };
  }, []);

  const mesaSubtotal = activeMesa ? mesaOrderTotal(activeMesa.order) : 0;
  const loyaltyProfile = activeMesa?.customerId ? getOrCreateProfile(activeMesa.customerId) : null;

  const pointsSpentInOrder = useMemo(() => {
    if (!activeMesa) return 0;
    const countItems = (items: any[]) =>
      items.filter(i => i.redeemRewardId).reduce((sum, i) => {
        const r = rewards.find(r => r.id === i.redeemRewardId);
        return sum + (r?.pointsCost ?? 0);
      }, 0);
    return countItems(activeMesa.order) + countItems(tempCart);
  }, [activeMesa, rewards, tempCart]);

  const availablePoints = loyaltyProfile ? loyaltyProfile.points - pointsSpentInOrder : 0;
  const mesaTotal = mesaSubtotal;
  const cashNum = parseFloat(cashReceived) || 0;
  const change = Math.max(0, cashNum - mesaTotal);
  const hasCombo = !!activeMesa?.order.some(i => i.product.tipo === 'combo' || i.product.name.toLowerCase().includes('combo'));
  const pointsPreview = activeMesa?.customerId
    ? calculatePointsForAmount(activeMesa.customerId, mesaTotal, hasCombo)
    : null;

  const handleIniciarParaLlevar = async (clienteIdOverride?: string) => {
    const id = clienteIdOverride ?? iniciarClienteId;
    const clienteId = id ? parseInt(id, 10) : null;
    setIsOpeningParaLlevar(true);
    const mesaId = await openParaLlevar(clienteId);
    setIsOpeningParaLlevar(false);
    if (!mesaId) {
      toast.error('Error', 'No se pudo iniciar el pedido para llevar.');
      return;
    }
    if (id) {
      const cliente = customers.find(c => c.id === id);
      if (cliente) {
        updateMesa(mesaId, {
          customerId: id,
          cliente: { id: parseInt(id, 10), nombre: cliente.nombre, puntos: cliente.puntos ?? 0, celular: cliente.celular ?? '', estado: true },
        });
      }
    }
    setIniciarClienteId('');
    setShowNewCustomerForm(false);
    setModalView('detalle');
    if (!productsLoaded) loadProducts();
  };

  const openModal = (mesaId: string, view: ModalView) => {
    setActiveMesaId(mesaId);
    setModalView(view);
    if (!productsLoaded && view !== 'none') {
      loadProducts();
    }
  };

  const closeAll = () => {
    setActiveMesaId(null);
    setModalView('none');
    clearTempCart();
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
    const name = newCustomerName.trim();
    const phone = newCustomerPhone.trim();
    if (!name || !phone) return;
    setIsCreatingCustomer(true);
    const id = `cust_${Date.now()}`;
    const now = new Date();
    const newCustomer: Customer = {
      id, nombre: name, celular: phone, puntos: 0, estado: true,
    };
    const newProfile = {
      id: `prof_${Date.now()}`, customerId: id,
      points: 0, lifetimePoints: 0, purchaseCount: 0,
      level: 'bronce' as const, referralCode: id.slice(-6).toUpperCase(),
      referralCount: 0, consecutiveDays: 0,
      uniqueProductsBought: [], completedMissions: [],
      createdAt: now, updatedAt: now,
    };
    setCustomers(prev => [...prev, newCustomer]);
    setLoyaltyProfiles(prev => [...prev, newProfile as any]);
    onCreated(id);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setIsCreatingCustomer(false);
    toast.success('Cliente registrado', `${name} añadido correctamente.`);
  };

  const handleCreateCustomerReview = (name: string, phone: string, onCreated: (id: string) => void) => {
    if (!name || !phone) return;
    setIsCreatingCustomer(true);
    const id = `cust_${Date.now()}`;
    const now = new Date();
    const newCustomer: Customer = {
      id, nombre: name, celular: phone, puntos: 0, estado: true,
    };
    const newProfile = {
      id: `prof_${Date.now()}`, customerId: id,
      points: 0, lifetimePoints: 0, purchaseCount: 0,
      level: 'bronce' as const, referralCode: id.slice(-6).toUpperCase(),
      referralCount: 0, consecutiveDays: 0,
      uniqueProductsBought: [], completedMissions: [],
      createdAt: now, updatedAt: now,
    };
    setCustomers(prev => [...prev, newCustomer]);
    setLoyaltyProfiles(prev => [...prev, newProfile as any]);
    onCreated(id);
    setIsCreatingCustomer(false);
    toast.success('Cliente registrado', `${name} añadido correctamente.`);
  };

  const addTempProduct = (product: Product) => {
    if (product.tipo === 'combo') {
      setComboDetailProduct(product);
    } else if (product.tipo === 'elaborado') {
      setElaboradoDetailProduct(product);
      if (!elaboradoIngredientes[product.id]) {
        gql<any>(GET_ELABORADO_INGREDIENTES, { id: parseInt(product.id, 10) })
          .then(data => {
            const node = data.elaborados.nodes[0];
            if (node?.receta?.detalles) {
              const ings = node.receta.detalles
                .filter((d: any) => d.insumo)
                .map((d: any) => ({ id: String(d.insumo.id), nombre: d.insumo.nombre, cantidad: d.cantidad, unidad: d.insumo.unidad_min_uso }));
              setElaboradoIngredientes(prev => ({ ...prev, [product.id]: ings }));
            } else {
              setElaboradoIngredientes(prev => ({ ...prev, [product.id]: [] }));
            }

            const opcionesStockInfo: Array<{ opcionId: string; tipoAjuste: string; cantidad: number; insumoRequeridoId: string | null; insumoReemplazoId: string | null }> = [];
            const usedInsumoIds = new Set<string>();
            if (node?.receta?.detalles) {
              for (const det of node.receta.detalles) {
                if (det.insumo?.id) usedInsumoIds.add(String(det.insumo.id));
              }
            }
            if (node?.variaciones) {
              for (const attr of node.variaciones) {
                for (const opc of attr.opciones) {
                  for (const aj of opc.ajustes ?? []) {
                    opcionesStockInfo.push({
                      opcionId: String(opc.id),
                      tipoAjuste: aj.tipoAjuste,
                      cantidad: aj.cantidad,
                      insumoRequeridoId: aj.id_Insumo ? String(aj.id_Insumo) : null,
                      insumoReemplazoId: aj.id_InsumoNuevo ? String(aj.id_InsumoNuevo) : null,
                    });
                    if (aj.id_Insumo) usedInsumoIds.add(String(aj.id_Insumo));
                    if (aj.id_InsumoNuevo) usedInsumoIds.add(String(aj.id_InsumoNuevo));
                  }
                }
              }
            }

            const insumosStock = (data.insumos?.nodes ?? [])
              .filter((i: any) => usedInsumoIds.has(String(i.id)))
              .map((i: any) => ({ id: String(i.id), nombre: i.nombre, stock: i.stock_actual ?? 0 }));

            const receta = node?.receta ? {
              detalles: (node.receta.detalles ?? []).map((d: any) => ({
                insumo: { id: String(d.insumo?.id ?? d.id_insumo), nombre: d.insumo?.nombre ?? d.insumo?.id ?? '' },
                cantidad: d.cantidad,
              })),
            } : null;

            const variaciones = (node?.variaciones ?? []).map((attr: any) => ({
              opciones: (attr.opciones ?? []).map((opc: any) => ({
                id: String(opc.id),
                ajustes: (opc.ajustes ?? []).map((aj: any) => ({
                  tipoAjuste: aj.tipoAjuste,
                  cantidad: aj.cantidad,
                  insumoBase: { id: aj.id_Insumo ? String(aj.id_Insumo) : '' },
                  insumoNuevo: aj.id_InsumoNuevo ? { id: String(aj.id_InsumoNuevo) } : null,
                })),
              })),
            }));

            const stockInsumos: Record<string, number> = {};
            for (const i of insumosStock) {
              stockInsumos[i.id] = i.stock;
            }

            setElaboradoExtras(prev => ({ ...prev, [product.id]: { insumosStock, opcionesStockInfo, receta, variaciones, stockInsumos } }));
            setStockInsumosGlobal(prev => ({ ...prev, ...stockInsumos }));
          }).catch(() => {
            setElaboradoIngredientes(prev => ({ ...prev, [product.id]: [] }));
            setElaboradoExtras(prev => ({ ...prev, [product.id]: { insumosStock: [], opcionesStockInfo: [], receta: null, variaciones: [], stockInsumos: {} } }));
          });
      }
    } else {
      addTempDirect(product);
    }
  };

  const handleSendToKitchen = async () => {
    if (!activeMesaId || tempCart.length === 0) return;
    const mesa = mesas.find(m => m.id === activeMesaId);
    if (!mesa) return;

    const success = await sendToKitchen(activeMesaId, tempCart, printComanda);
    if (!success) return;

    clearTempCart();
    setProductSearch('');
    setDetalleView('historial');
    refreshStock();
    toast.success('🖨️ Comanda enviada', `Ronda ${mesa.currentRound - 1} · ${tempCart.reduce((s, i) => s + i.quantity, 0)} producto(s)`);
  };

  const handleRequestPayment = () => {
    if (!activeMesa || activeMesa.order.length === 0) {
      toast.warning('Sin pedidos', 'Envía productos a cocina antes de cobrar.');
      return;
    }
    if (tempCart.length > 0) {
      toast.warning('Pedido pendiente', 'Envía los productos a cocina/barra antes de cobrar.');
      return;
    }
    updateMesa(activeMesa.id, { status: 'esperando_pago' });
    setReviewClienteId(activeMesa.customerId ?? null);
    setModalView('review');
  };

  const handleConfirmSale = async () => {
    if (!activeMesa) return;
    if (!activeMesa.customerId && !reviewClienteId) {
      toast.warning('Cliente requerido', 'Selecciona un cliente antes de cobrar.');
      return;
    }
    setIsProcessing(true);
    try {
      const isMesa = activeMesa.tipo === 'mesa';
      const isParaLlevar = activeMesa.tipo === 'para_llevar';
      const pedidoId = (activeMesa as any).pedidoId;

      if ((isMesa || isParaLlevar) && pedidoId) {
        const tipoPago = TIPO_PAGO_MAP[paymentMethod] ?? 1;
        const efectivoRecibido = paymentMethod === 'cash' ? cashNum : 0;
        const idCliente = reviewClienteId ? parseInt(reviewClienteId, 10) : null;

        let success = false;
        if (isParaLlevar) {
          success = await cobrarParaLlevar(pedidoId, idCliente, tipoPago, efectivoRecibido);
        } else {
          success = await api.post<any>(`/Mesa/cobrar/${activeMesa.id}`, {
            id_Pedido: pedidoId,
            id_Cliente: idCliente,
            tipoPago,
            efectivoRecibido,
          });
        }

        if (success) {
          setLastSaleResult({ code: isParaLlevar ? `PL-${pedidoId}` : `MESA-${activeMesa.id}`, points: null, newBalance: 0 });
          setModalView('success');
        }
      } else {
        const saleInput: SaleInput = {
          customerId: activeMesa.customerId,
          items: activeMesa.order.map((i: any) => ({ productId: i.product.id, quantity: i.quantity, discount: 0 })),
          discount: 0,
          taxPercentage: 18,
          paymentMethods: [{ type: paymentMethod, amount: mesaTotal }],
        };
        const newSale = await addSale(saleInput);

        let earnedPoints: PointsCalculation | null = null;
        let newBalance = 0;
        if (activeMesa.customerId && newSale) {
          for (const item of activeMesa.order) {
            if (item.redeemRewardId) redeemReward(activeMesa.customerId, item.redeemRewardId, rewards);
          }
          earnedPoints = awardPointsForSale(activeMesa.customerId, newSale.id, mesaTotal, hasCombo);
          const profile = getOrCreateProfile(activeMesa.customerId);
          newBalance = profile?.points ?? 0;
        }
        setLastSaleResult({ code: newSale.code, points: earnedPoints, newBalance });
        setModalView('success');
      }
    } catch {
      toast.error('Error', 'No se pudo registrar la venta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    if (activeMesaId) handleCerrarMesa(activeMesaId, true);
    setLastSaleResult(null);
    closeAll();
  };

  const nextMilestone = useMemo(() => {
    if (!loyaltyProfile) return null;
    const count = loyaltyProfile.purchaseCount + 1;
    return milestones.find(m => m.purchaseNumber === count) ?? null;
  }, [loyaltyProfile, milestones]);

  useEffect(() => {
    if (activeCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(activeCategories[0].id);
    }
  }, [activeCategories, selectedCatId]);

  return (
    <MainLayout>
      <div className="-m-6 min-h-[calc(100vh-4rem)] bg-[#160c02] overflow-y-auto">

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
            <div className="hidden md:flex items-center gap-3 text-xs text-coffee-400 mr-2">
              {(['libre', 'ocupada', 'esperando_pago'] as MesaStatus[]).map(s => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={clsx('h-2 w-2 rounded-full', STATUS_CFG[s].dot.replace(' animate-pulse', ''))} />
                  {STATUS_CFG[s].label}
                </span>
              ))}
            </div>
            {(() => {
              const activeParaLlevar = mesas.find(m => m.tipo === 'para_llevar' && m.status !== 'libre');
              return (
                <button
                  disabled={isOpeningParaLlevar}
                  onClick={() => {
                    if (activeParaLlevar) {
                      setActiveMesaId(activeParaLlevar.id);
                      setModalView('detalle');
                      if (!productsLoaded) loadProducts();
                    } else {
                      setIniciarClienteId('');
                      setShowNewCustomerForm(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                      setModalView('iniciar_para_llevar');
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-2 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60',
                    activeParaLlevar
                      ? 'bg-amber-600 hover:bg-amber-500 ring-2 ring-amber-400/50'
                      : 'bg-coffee-600 hover:bg-coffee-500',
                  )}
                >
                  {isOpeningParaLlevar
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin flex-shrink-0" />
                    : <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                  }
                  <span className="hidden sm:inline">Para llevar</span>
                  {activeParaLlevar && !isOpeningParaLlevar && (
                    <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse flex-shrink-0" />
                  )}
                </button>
              );
            })()}
            <button
              onClick={() => { openNuevaMesa(); setModalView('nueva_mesa'); }}
              className="flex items-center gap-2 bg-coffee-600 hover:bg-coffee-500 text-white font-semibold text-sm px-3 sm:px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Nueva Mesa</span>
            </button>
          </div>
        </div>

        {loadingMesas ? (
          <SkeletonMesaGrid count={6} />
        ) : mesas.filter(m => m.tipo !== 'para_llevar').length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-24 gap-5 select-none">
            <div className="h-20 w-20 rounded-3xl bg-coffee-800/60 flex items-center justify-center">
              <UtensilsCrossed className="h-10 w-10 text-coffee-500" />
            </div>
            <div className="text-center">
              <p className="text-coffee-200 font-semibold text-lg">No hay mesas</p>
              <p className="text-coffee-500 text-sm mt-1">Crea una mesa para empezar a tomar pedidos</p>
            </div>
            <button
              onClick={() => { openNuevaMesa(); setModalView('nueva_mesa'); }}
              className="flex items-center gap-2 bg-coffee-600 hover:bg-coffee-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva Mesa
            </button>
          </div>
        ) : (
          <div className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {mesas.filter(m => m.tipo !== 'para_llevar').map(mesa => (
              <MesaCard
                key={mesa.id}
                mesa={mesa as any}
                statusCfg={STATUS_CFG}
                formatCurrency={formatCurrency}
                mesaOrderTotal={mesaOrderTotal}
                onOpen={openModal}
                onEdit={(mesa, e) => { openEditMesa(mesa, e); setModalView('nueva_mesa'); }}
                onDelete={(mesaId, _e) => { const m = mesas.find(x => x.id === mesaId); setMesaToDeleteName(m?.name ?? ''); setConfirmDeleteMesaId(mesaId); }}
                isDeletingMesa={isDeletingMesa}
              />
            ))}
          </div>
        )}

        {modalView === 'iniciar_para_llevar' && (
          <IniciarMesaModal
            tipo="para_llevar"
            mesa={{ id: 'para_llevar', name: 'Para llevar' }}
            iniciarClienteId={iniciarClienteId}
            showNewCustomerForm={showNewCustomerForm}
            isStartingMesa={isOpeningParaLlevar}
            customers={customers}
            getOrCreateProfile={getOrCreateProfile as any}
            onClienteChange={setIniciarClienteId}
            onToggleNewCustomerForm={() => { setShowNewCustomerForm(v => !v); setNewCustomerName(''); setNewCustomerPhone(''); }}
            onIniciar={handleIniciarParaLlevar}
            onClose={() => setModalView('none')}
            newCustomerName={newCustomerName}
            newCustomerPhone={newCustomerPhone}
            isCreatingCustomer={isCreatingCustomer}
            onNewCustomerNameChange={setNewCustomerName}
            onNewCustomerPhoneChange={setNewCustomerPhone}
            onCreateCustomer={handleCreateCustomer}
          />
        )}

        {modalView === 'nueva_mesa' && (
          <NuevaMesaModal
            editMesaId={editMesaId}
            nuevaMesaName={nuevaMesaName}
            isSavingMesa={isSavingMesa}
            onNameChange={setNuevaMesaName}
            onSave={handleSaveMesa}
            onClose={() => { setModalView('none'); setActiveMesaId(null); }}
          />
        )}

        {modalView === 'iniciar' && activeMesa && (
          <IniciarMesaModal
            mesa={activeMesa}
            iniciarClienteId={iniciarClienteId}
            showNewCustomerForm={showNewCustomerForm}
            isStartingMesa={isStartingMesa}
            customers={customers}
            getOrCreateProfile={getOrCreateProfile as any}
            onClienteChange={setIniciarClienteId}
            onToggleNewCustomerForm={() => { setShowNewCustomerForm(v => !v); setNewCustomerName(''); setNewCustomerPhone(''); }}
            onIniciar={(overrideId) => { setModalView('none'); handleIniciarMesa(activeMesa, (overrideId ?? iniciarClienteId) || undefined); setIniciarClienteId(''); }}
            onClose={closeAll}
            newCustomerName={newCustomerName}
            newCustomerPhone={newCustomerPhone}
            isCreatingCustomer={isCreatingCustomer}
            onNewCustomerNameChange={setNewCustomerName}
            onNewCustomerPhoneChange={setNewCustomerPhone}
            onCreateCustomer={handleCreateCustomer}
          />
        )}

        {modalView === 'detalle' && activeMesa && (
          <Overlay onClose={closeAll}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              <div className="bg-coffee-800 px-5 py-4 flex items-center justify-between flex-shrink-0">
                {detalleView !== 'none' ? (
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
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                      {activeMesa.tipo === 'para_llevar'
                        ? <ShoppingBag className="h-5 w-5 text-cream" />
                        : <UtensilsCrossed className="h-5 w-5 text-cream" />
                      }
                    </div>
                    <div>
                      <p className="text-[10px] text-coffee-400 uppercase tracking-widest">
                        {activeMesa.tipo === 'para_llevar' ? 'Mostrador' : STATUS_CFG[activeMesa.status as MesaStatus].label}
                      </p>
                      <h3 className="font-display font-bold text-cream text-lg">{activeMesa.name}</h3>
                      {(() => {
                        return activeMesa.cliente ? (
                          <p className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                            {activeMesa.cliente.nombre}
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
                      className="relative h-8 rounded-xl flex items-center justify-center gap-1.5 px-2 sm:px-3 transition-all text-xs font-semibold bg-white/10 text-coffee-300 hover:bg-white/20"
                    >
                      <History className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Historial</span>
                      {activeMesa.order.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {activeMesa.order.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      )}
                    </button>
                  )}
                  <button onClick={closeAll} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-coffee-300 hover:bg-white/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {detalleView === 'none' && (
                <>
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

                  {!productsLoaded ? (
                    <>
                      <SkeletonCategoryTabs />
                      <SkeletonProductScroll />
                    </>
                  ) : (
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
                          const qty = getTempQty(product.id);
                          const reward = loyaltyProfile
                            ? rewards.find(r => r.isActive && r.productId === product.id) ?? null
                            : null;
                          const canAfford = reward != null && availablePoints >= reward.pointsCost;
                          const pointsShortfall = reward != null && !canAfford ? reward.pointsCost - availablePoints : null;
                          const attrCount = getAtributosByProductId(product.id).length;
                          return (
                            <ProdCard
                              key={product.id}
                              product={product}
                              qty={qty}
                              unavailable={!stock.ok}
                              attrCount={attrCount}
                              onAdd={() => addTempProduct(product)}
                              onInc={() => incTempQty(buildCartKey(product.id), stockInsumosGlobal)}
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
                              stockLabel={stock.label}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}

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
                              {item.opciones && item.opciones.length > 0 ? (
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
                                  <button onClick={() => incTempQty(item.cartKey, stockInsumosGlobal)} className="h-6 w-6 rounded-md bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center text-cream">
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            </div>
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

              {detalleView === 'historial' && (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {activeMesa.order.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-coffee-300">
                      <ShoppingBag className="h-8 w-8 opacity-30" />
                      <p className="text-xs">Sin pedidos enviados aún</p>
                    </div>
                  ) : (() => {
                    const rounds = activeMesa.roundsSent.length > 0
                      ? activeMesa.roundsSent
                      : [{ number: 1, sentAt: activeMesa.openedAt ?? Date.now(), subTotal: 0 }];
                    return (
                      <>
                        {rounds.map(ronda => {
                          const rondaItems = activeMesa.order.filter(i => (i.roundNumber ?? 1) === ronda.number);
                          if (rondaItems.length === 0) return null;
                          const rondaTime = new Date(ronda.sentAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={ronda.number}>
                              <div className="flex items-center gap-2 px-5 py-2 bg-coffee-50 border-y border-coffee-100 sticky top-0 z-10">
                                <Printer className="h-3 w-3 text-coffee-400" />
                                <span className="text-[11px] font-bold text-coffee-600 uppercase tracking-wider">
                                  Ronda {ronda.number}
                                </span>
                                <span className="text-[11px] text-coffee-400 ml-auto">{rondaTime}</span>
                                <span className="text-[11px] font-semibold text-coffee-700">
                                  {formatCurrency(ronda.subTotal)}
                                </span>
                              </div>
                              <div className="divide-y divide-coffee-50">
                                {rondaItems.map(item => (
                                  <div key={item.cartKey} className="px-5 py-3 space-y-1.5">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="text-sm font-semibold text-coffee-900 line-clamp-2 leading-snug">{item.product.name}</p>
                                          {item.redeemRewardId && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                              <Gift className="h-2.5 w-2.5" />Canje
                                            </span>
                                          )}
                                        </div>
                                        {item.opciones && item.opciones.length > 0 ? (
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
                                        </div>
                                        <span className="text-xs text-coffee-400 font-semibold">×{item.quantity}</span>
                                      </div>
                                    </div>
                                    {item.notes && (
                                      <div className="flex items-center gap-2 pl-1">
                                        <PenLine className="h-3 w-3 text-coffee-300 flex-shrink-0" />
                                        <span className="text-[11px] text-coffee-500 italic">"{item.notes}"</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <div className="px-5 py-3 bg-coffee-50 flex items-center justify-between border-t border-coffee-100">
                          <span className="text-xs font-medium text-coffee-500">Total acumulado</span>
                          <span className="text-lg font-display font-black text-coffee-900">{formatCurrency(mesaSubtotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {detalleView === 'none' && (
                <div className="px-4 py-2.5 border-t border-coffee-100 flex-shrink-0">
                  {activeMesa.customerId ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-coffee-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">
                          {activeMesa.cliente?.nombre ?? 'Cliente'}
                        </span>
                        <span className="text-coffee-400">
                          · {activeMesa.cliente?.puntos ?? 0} pts
                        </span>
                      </div>
                      {activeMesa.order.some(i => i.redeemRewardId) ? (
                        <Tooltip text="No se puede quitar, hay productos canjeados en la orden" position="top">
                          <span className="text-[11px] text-coffee-200 cursor-not-allowed">Quitar</span>
                        </Tooltip>
                      ) : (
                        <button
                          onClick={() => updateMesa(activeMesa.id, { customerId: undefined, cliente: undefined })}
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
                          ...customers.map(c => {
                            const prof = getOrCreateProfile(c.id);
                            return { value: c.id, label: `${c.nombre}${prof ? ` · ${prof.points} pts` : ''}` };
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

              <div className="px-4 py-3 border-t border-coffee-100 flex items-center gap-2 flex-shrink-0">
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

                <div className="flex-1 flex justify-end gap-2">
                  {tempCart.length > 0 && (
                    <button
                      onClick={handleSendToKitchen}
                      disabled={isSendingToKitchen}
                      className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-coffee-800 text-cream text-xs font-bold hover:bg-coffee-700 active:scale-95 transition-all shadow-md disabled:opacity-60"
                    >
                      {isSendingToKitchen ? (
                        <div className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                      {isSendingToKitchen ? 'Enviando...' : 'Enviar a cocina/barra'}
                      {!isSendingToKitchen && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-400 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {tempCart.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      )}
                    </button>
                  )}
                  {tempCart.length === 0 && (
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

              {activeMesa.order.length === 0 && tempCart.length === 0 && (
                <div className="px-5 pb-3 flex-shrink-0">
                  <button
                    onClick={() => handleCerrarMesa(activeMesa.id)}
                    disabled={!!isClosingMesa}
                    className="w-full py-2 text-xs text-coffee-400 hover:text-red-500 transition-colors font-medium disabled:opacity-50"
                  >
                    {isClosingMesa ? 'Cerrando...' : 'Cerrar mesa (sin pedidos)'}
                  </button>
                </div>
              )}
            </div>
          </Overlay>
        )}

        {modalView === 'review' && activeMesa && (
          <Overlay onClose={() => setModalView('detalle')}>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <ReviewPanel
                mesaName={activeMesa.name}
                order={activeMesa.order as any}
                mesaTotal={mesaTotal}
                formatCurrency={formatCurrency}
                onBack={() => setModalView('detalle')}
                onConfirm={() => setModalView('pago')}
              />
            </Suspense>
          </Overlay>
        )}

        {modalView === 'pago' && activeMesa && (
          <Overlay onClose={() => setModalView('review')}>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <PagoPanel
                mesaName={activeMesa.name}
                mesaTotal={mesaTotal}
                paymentMethod={paymentMethod}
                cashReceived={cashReceived}
                isProcessing={isProcessing}
                cashNum={cashNum}
                change={change}
                loyaltyProfile={loyaltyProfile as any}
                pointsPreview={pointsPreview}
                formatCurrency={formatCurrency}
                onPaymentMethodChange={setPaymentMethod}
                onCashReceivedChange={setCashReceived}
                onBack={() => setModalView('review')}
                onConfirm={handleConfirmSale}
                activeMesaOrder={activeMesa.order as any}
                reviewClienteId={reviewClienteId}
                onReviewClienteChange={setReviewClienteId}
                customers={customers}
                onCreateCustomer={handleCreateCustomerReview}
                isCreatingCustomer={isCreatingCustomer}
                reviewShowNewCustomerForm={reviewShowNewCustomerForm}
                onToggleReviewNewCustomerForm={() => { setReviewShowNewCustomerForm(v => !v); setReviewNewCustomerName(''); setReviewNewCustomerPhone(''); }}
                reviewNewCustomerName={reviewNewCustomerName}
                reviewNewCustomerPhone={reviewNewCustomerPhone}
                onReviewNewCustomerNameChange={setReviewNewCustomerName}
                onReviewNewCustomerPhoneChange={setReviewNewCustomerPhone}
              />
            </Suspense>
          </Overlay>
        )}

        {modalView === 'success' && lastSaleResult && (
          <Overlay>
            <Suspense fallback={<div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-8 flex items-center justify-center"><div className="w-8 h-8 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" /></div>}>
              <SuccessPanel
                saleCode={lastSaleResult.code}
                mesaName={activeMesa?.name ?? ''}
                newBalance={lastSaleResult.newBalance}
                onPrint={() => toast.info('Imprimiendo', 'Enviando a la impresora...')}
                onClose={handleCloseSuccess}
                nextMilestone={nextMilestone}
                pointsResult={lastSaleResult.points}
              />
            </Suspense>
          </Overlay>
        )}

        {comboDetailProduct && (
          <Overlay onClose={() => setComboDetailProduct(null)}>
            <ComboDetailPanel
              product={comboDetailProduct as any}
              details={comboDetails[comboDetailProduct.id] ?? []}
              formatCurrency={formatCurrency}
              onAdd={() => { addTempDirect(comboDetailProduct); setComboDetailProduct(null); }}
              onClose={() => setComboDetailProduct(null)}
            />
          </Overlay>
        )}

        {elaboradoDetailProduct && (
          <ElaboradoDetailModal
            isOpen
            onClose={() => setElaboradoDetailProduct(null)}
            product={elaboradoDetailProduct}
            atributos={getAtributosByProductId(elaboradoDetailProduct.id)}
            ingredientes={elaboradoIngredientes[elaboradoDetailProduct.id] ?? []}
            insumosStock={elaboradoExtras[elaboradoDetailProduct.id]?.insumosStock ?? []}
            opcionesStockInfo={elaboradoExtras[elaboradoDetailProduct.id]?.opcionesStockInfo ?? []}
            receta={elaboradoExtras[elaboradoDetailProduct.id]?.receta ?? null}
            variaciones={elaboradoExtras[elaboradoDetailProduct.id]?.variaciones ?? []}
            onConfirm={(opciones, precioFinal, qty, consumoInsumos) => {
              addTempDirect(elaboradoDetailProduct, opciones, precioFinal, qty, consumoInsumos);
              setElaboradoDetailProduct(null);
            }}
          />
        )}

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
                toast.success('Producto agregado', `${varPickerProduct.name} añadido al pedido.`);
                setVarPickerDirect(false);
              } else {
                addTempDirect(varPickerProduct, opciones, precioFinal);
              }
              setVarPickerProduct(null);
            }}
          />
        )}

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

        {confirmDeleteMesaId && (
          <ConfirmModal
            isOpen
            onClose={() => setConfirmDeleteMesaId(null)}
            onConfirm={() => { handleDeleteMesa(confirmDeleteMesaId, { stopPropagation: () => {} } as any); setConfirmDeleteMesaId(null); }}
            title="Eliminar mesa"
            message={`¿Eliminar la mesa "${mesaToDeleteName}"? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            variant="danger"
          />
        )}
      </div>
    </MainLayout>
  );
};
