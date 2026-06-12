import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Star, Gift, Zap, Trophy, Users, Calendar, Clock,
  Sparkles, Heart, Target, CheckCircle,
  Search, TrendingUp, RotateCcw, ArrowUpCircle,
  Crown, ShoppingBag,
  UserPlus, Info, ShoppingCart,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { toast } from '../../components/ui/Toast';
import { SearchableSelect } from '../../components/ui/Select';
import { CustomerModal } from '../../components/modals/CustomerModal';
import { PrintReciboModal, type PrintReciboData } from '../../components/pos/PrintReciboModal';
import { formatDateTime } from '../../utils/formatters';
import { api } from '../../lib/api';
import { useFidelizacion } from '../../hooks/useFidelizacion';
import type { ProductoCanjeable, HistorialPuntosItem, DtoPromocionGratisItem } from '../../hooks/useFidelizacion';
import type { LoyaltyProfile, LoyaltyLevel } from '../../types/loyalty';
import type { Customer, CustomerInput } from '../../types';
import { useHitosCompra, type HitoCompra } from '../../hooks/useHitosCompra';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'recompensas' | 'promos' | 'promos_permanentes' | 'historial' | 'compras' | 'info';


// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  bronce: {
    label: 'Bronce',
    color: 'from-amber-600 to-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    icon: '🥉',
    glow: 'shadow-amber-200',
  },
  plata: {
    label: 'Plata',
    color: 'from-slate-400 to-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700',
    icon: '🥈',
    glow: 'shadow-slate-200',
  },
  oro: {
    label: 'Oro',
    color: 'from-yellow-400 to-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '🥇',
    glow: 'shadow-yellow-200',
  },
  platino: {
    label: 'Platino',
    color: 'from-purple-400 to-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
    icon: '💎',
    glow: 'shadow-purple-300',
  },
} satisfies Record<LoyaltyLevel, { label: string; color: string; bg: string; border: string; text: string; badge: string; icon: string; glow: string }>;


// ─── Subcomponents ─────────────────────────────────────────────────────────────

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const StatPill: React.FC<StatPillProps> = ({ icon, label, value, color }) => (
  <div className={clsx('flex items-center gap-3 px-5 py-3 rounded-2xl', color)}>
    <div className="text-xl">{icon}</div>
    <div>
      <div className="text-xs font-body font-medium opacity-70 uppercase tracking-wide">{label}</div>
      <div className="text-xl font-display font-bold leading-tight">{value}</div>
    </div>
  </div>
);

type LevelInfo = { level: LoyaltyLevel; nextLevel: LoyaltyLevel | null; pointsToNext: number; progress: number };

interface LoyaltyCardProps {
  profile: LoyaltyProfile | undefined;
  customerName: string;
  levelInfo: LevelInfo;
  onViewHistory: () => void;
}

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  profile,
  customerName,
  levelInfo,
  onViewHistory,
}) => {
  if (!profile) return null;
  const cfg = LEVEL_CONFIG[profile.level];

  return (
    <div className={clsx(
      'relative overflow-hidden rounded-3xl p-6 shadow-xl',
      `bg-gradient-to-br ${cfg.color}`,
      'text-white',
    )}>
      {/* Decorative coffee rings */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border-4 border-white/10 pointer-events-none" />
      <div className="absolute -top-2 -right-2 w-24 h-24 rounded-full border-4 border-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full border-4 border-white/10 pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-body font-semibold uppercase tracking-widest text-white/60 mb-0.5">
            Tarjeta Yana
          </p>
          <h2 className="text-2xl font-display font-bold leading-tight">{customerName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-accent text-base text-white/80">{profile.referralCode}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-xs text-white/60 font-body">{profile.purchaseCount} visitas</span>
          </div>
        </div>
        <div className={clsx(
          'flex flex-col items-center justify-center w-16 h-16 rounded-2xl',
          'bg-white/20 backdrop-blur-sm border border-white/30',
          'shadow-lg',
        )}>
          <span className="text-2xl">{cfg.icon}</span>
          <span className="text-xs font-body font-bold mt-0.5">{cfg.label}</span>
        </div>
      </div>

      {/* Points display */}
      <div className="my-5">
        <div className="flex items-end gap-2">
          <span className="text-6xl font-display font-black leading-none tracking-tight">{profile.points}</span>
          <div className="pb-2">
            <div className="text-sm font-body font-medium text-white/70">puntos</div>
            <div className="text-xs font-body text-white/50">{profile.lifetimePoints} totales</div>
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      {levelInfo.nextLevel && (
        <div className="mb-5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-body text-white/70">
              Hacia nivel {LEVEL_CONFIG[levelInfo.nextLevel].label}
            </span>
            <span className="text-xs font-body font-semibold text-white/90">
              {levelInfo.pointsToNext} pts más
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(3, levelInfo.progress)}%` }}
            />
          </div>
        </div>
      )}
      {!levelInfo.nextLevel && (
        <div className="mb-5 flex items-center gap-2">
          <Crown className="w-4 h-4 text-white/80" />
          <span className="text-sm font-body font-semibold text-white/80">¡Nivel máximo alcanzado!</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onViewHistory}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-body font-medium border border-white/20"
        >
          <Clock className="w-3.5 h-3.5" />
          Ver Historial
        </button>
      </div>
    </div>
  );
};



// ─── Main Page ─────────────────────────────────────────────────────────────────
export const FidelizacionPage: React.FC = () => {
  const {
    clientes,
    productosCanjeables,
    ventasCliente,
    historialPuntos,
    promocionesPermanentes,
    promocionesTemporada,
    promosGratisCliente,
    hitosReclamados,
    isLoadingHitosReclamados,
    isLoadingVentas,
    isLoadingHistorial,
    isLoadingPromosGratis,
    refreshClientes,
    fetchVentasCliente,
    fetchHistorialPuntos,
    fetchPromosGratisCliente,
    fetchHitosReclamados,
    createCliente,
  } = useFidelizacion();

  const { hitos, load: loadHitos } = useHitosCompra();
  useEffect(() => { loadHitos(); }, [loadHitos]);

  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('recompensas');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmReward, setConfirmReward] = useState<ProductoCanjeable | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [confirmHito, setConfirmHito] = useState<HitoCompra | null>(null);
  const [isRedeemingHito, setIsRedeemingHito] = useState(false);
  const [confirmPromoGratis, setConfirmPromoGratis] = useState<DtoPromocionGratisItem | null>(null);
  const [isRedeemingPromoGratis, setIsRedeemingPromoGratis] = useState(false);
  const [reclamadosPromos, setReclamadosPromos] = useState<Set<number>>(new Set());
  const [printReciboData, setPrintReciboData] = useState<PrintReciboData | null>(null);



  const getLevelInfo = useCallback((points: number): { level: LoyaltyLevel; nextLevel: LoyaltyLevel | null; pointsToNext: number; progress: number } => {
    const levels: LoyaltyLevel[] = ['bronce', 'plata', 'oro', 'platino'];
    const thresholds = [0, 100, 500, 1000];

    let currentLevel: LoyaltyLevel = 'bronce';
    let nextLevel: LoyaltyLevel | null = 'plata';
    let currentThreshold = 0;
    let nextThreshold = 100;

    for (let i = 0; i < levels.length; i++) {
      if (points >= thresholds[i]) {
        currentLevel = levels[i];
        currentThreshold = thresholds[i];
        if (i < levels.length - 1) {
          nextLevel = levels[i + 1];
          nextThreshold = thresholds[i + 1];
        } else {
          nextLevel = null;
          nextThreshold = currentThreshold;
        }
      }
    }

    const pointsToNext = nextLevel ? nextThreshold - points : 0;
    const progress = nextLevel ? ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100 : 100;

    return { level: currentLevel, nextLevel, pointsToNext, progress };
  }, []);


  // ── Derived data ────────────────────────────────────────────────────────────
  const activeCustomers = useMemo(
    () => clientes.filter(c => c.estado),
    [clientes],
  );

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return activeCustomers.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.celular.includes(q) ||
      (c.correo || '').toLowerCase().includes(q),
    );
  }, [activeCustomers, search]);

  const selectedCustomer = useMemo(
    () => activeCustomers.find(c => c.id === selectedCustomerId) ?? null,
    [activeCustomers, selectedCustomerId],
  );

  const selectedProfile = useMemo((): LoyaltyProfile | null => {
    if (!selectedCustomerId) return null;
    const customer = activeCustomers.find(c => c.id === selectedCustomerId);
    if (!customer) return null;
    const levelInfo = getLevelInfo(customer.puntos);
    return {
      id: '',
      customerId: selectedCustomerId,
      points: customer.puntos,
      lifetimePoints: customer.puntos,
      purchaseCount: ventasCliente.length,
      level: levelInfo.level,
      referralCode: '',
      referralCount: 0,
      consecutiveDays: 0,
      uniqueProductsBought: [],
      completedMissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }, [selectedCustomerId, activeCustomers, ventasCliente, getLevelInfo]);

  const levelInfo = useMemo(
    () => selectedProfile ? getLevelInfo(selectedProfile.lifetimePoints) : null,
    [selectedProfile, getLevelInfo],
  );

  const reclamadosHitosSet = useMemo(() => {
    const set = new Set(hitosReclamados.map(r => r.IdHitoCompra));
    if (hitosReclamados.length > 0) {
      console.log('[reclamadosHitosSet] IDs reclamados:', [...set]);
      console.log('[hitos catalogo] IDs:', hitos.map(h => h.id));
    }
    return set;
  }, [hitosReclamados, hitos]);

  // ── Global stats ────────────────────────────────────────────────────────────
  const statsCustomersWithPoints = clientes.filter(c => c.puntos > 0).length;
  const statsCirculatingPoints = clientes.reduce((s, c) => s + c.puntos, 0);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setSearch('');
    setReclamadosPromos(new Set());
    const customer = activeCustomers.find(c => c.id === id);
    if (customer) fetchVentasCliente(customer.nombre);
    fetchHistorialPuntos(Number(id));
    fetchPromosGratisCliente(Number(id));
    fetchHitosReclamados(Number(id));
  };

  const handleCreateCliente = async (input: CustomerInput, _isEdit: boolean, _id?: string) => {
    await createCliente(input);
    await refreshClientes();
  };

  const handleRedeem = (prod: ProductoCanjeable) => {
    if (!selectedCustomerId || !selectedProfile) return;
    if (selectedProfile.points < prod.puntos) {
      toast.error('Puntos insuficientes', `Necesitas ${prod.puntos} pts.`);
      return;
    }
    setConfirmReward(prod);
  };

  const handleRedeemHito = (hito: HitoCompra) => {
    if (!selectedCustomerId) return;
    setConfirmHito(hito);
  };

  const handleConfirmHito = async () => {
    if (!confirmHito || !selectedCustomer) return;
    setIsRedeemingHito(true);
    try {
      const res = await api.post<{ Mensaje: string; NombreProducto: string }>(
        '/ProductoCanjeable/reclamar-hito',
        { IdCliente: Number(selectedCustomer.id), IdHitoCompra: confirmHito.id },
      );
      toast.success('¡Hito reclamado!', res.Mensaje ?? `${confirmHito.productoCanjeable.nombreProducto} entregado.`);
      setPrintReciboData({
        mesaName: selectedCustomer.nombre,
        saleCode: 'HITO',
        total: 0,
        metodoPago: 'Hito de compra',
        items: [{ cantidad: 1, nombre: confirmHito.productoCanjeable.nombreProducto, precio: 0, total: 0 }],
      });
      setConfirmHito(null);
      await Promise.all([
        refreshClientes(),
        fetchHitosReclamados(Number(selectedCustomer.id)),
      ]);
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'No se pudo reclamar el hito.');
    } finally {
      setIsRedeemingHito(false);
    }
  };

  const handleConfirmPromoGratis = async () => {
    if (!confirmPromoGratis || !selectedCustomer) return;
    setIsRedeemingPromoGratis(true);
    try {
      const res = await api.post<{ Mensaje: string; NombreProducto: string }>(
        '/ProductoCanjeable/reclamar-promocion-gratis',
        { IdCliente: Number(selectedCustomer.id), IdPromocionPermanente: confirmPromoGratis.IdPromocionPermanente },
      );
      toast.success('¡Promoción reclamada!', res.Mensaje ?? `${confirmPromoGratis.NombreProducto} entregado.`);
      setPrintReciboData({
        mesaName: selectedCustomer.nombre,
        saleCode: 'PROMO',
        total: 0,
        metodoPago: 'Promoción gratuita',
        items: [{ cantidad: 1, nombre: confirmPromoGratis.NombreProducto, precio: 0, total: 0 }],
      });
      setReclamadosPromos(prev => new Set(prev).add(confirmPromoGratis.IdPromocionPermanente));
      setConfirmPromoGratis(null);
      await Promise.all([
        refreshClientes(),
        fetchPromosGratisCliente(Number(selectedCustomer.id)),
      ]);
    } catch (e) {
      toast.error('Error', e instanceof Error ? e.message : 'No se pudo reclamar la promoción.');
    } finally {
      setIsRedeemingPromoGratis(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!confirmReward || !selectedCustomerId || !selectedCustomer) return;
    setIsRedeeming(true);
    try {
      await api.post('/ProductoCanjeable/canje', {
        idProductoCanjeable: Number(confirmReward.id),
        idCliente: Number(selectedCustomer.id),
      });
      toast.success('¡Canje exitoso!', `${confirmReward.nombreProducto} canjeado correctamente.`);
      setPrintReciboData({
        mesaName: selectedCustomer.nombre,
        saleCode: 'CANJE',
        total: 0,
        metodoPago: 'Canje de puntos',
        items: [{ cantidad: 1, nombre: confirmReward.nombreProducto, precio: 0, total: 0 }],
      });
      await refreshClientes();
    } catch (e) {
      toast.error('Error al canjear', e instanceof Error ? e.message : 'No se pudo registrar el canje. Intenta de nuevo.');
    } finally {
      setIsRedeeming(false);
      setConfirmReward(null);
    }
  };

  // ── Tabs config ───────────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'recompensas', label: 'Recompensas', icon: <Gift className="w-4 h-4" /> },
    { id: 'promos', label: 'Temporada', icon: <Calendar className="w-4 h-4" /> },
    { id: 'promos_permanentes', label: 'Permanentes', icon: <Zap className="w-4 h-4" /> },
    { id: 'historial', label: 'Historial Pts', icon: <Clock className="w-4 h-4" /> },
    { id: 'compras', label: 'Compras', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'info', label: 'Info Cliente', icon: <Info className="w-4 h-4" /> },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      {/* ═══════════════════════════════════════════
          HERO HEADER
      ═══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title block */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="font-accent text-cream-light text-lg">Kafe Yana</span>
            </div>
            <h1 className="text-4xl font-display font-black text-white leading-tight mb-2">
              Programa de<br />
              <span className="text-yellow-300">Fidelización</span> Yana
            </h1>
            <p className="text-coffee-200 font-body text-sm max-w-sm">
              Cada sorbo cuenta. Premia a tus clientes más fieles con experiencias únicas y recompensas exclusivas.
            </p>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-3">
            <StatPill
              icon={<Users className="w-5 h-5 text-blue-300" />}
              label="Clientes con puntos"
              value={statsCustomersWithPoints}
              color="bg-white/10 text-white border border-white/20"
            />
            <StatPill
              icon={<Sparkles className="w-5 h-5 text-yellow-300" />}
              label="Puntos en circulación"
              value={statsCirculatingPoints.toLocaleString()}
              color="bg-white/10 text-white border border-white/20"
            />
            <StatPill
              icon={<Gift className="w-5 h-5 text-pink-300" />}
              label="Productos canjeables"
              value={productosCanjeables.filter(p => p.activo).length}
              color="bg-white/10 text-white border border-white/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ═══════════════════════════════════════════
            LEFT COL – Customer lookup + loyalty card
        ═══════════════════════════════════════════ */}
        <div className="xl:col-span-1 space-y-5">

          {/* Search panel */}
          <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-coffee-400" />
                <h2 className="font-display font-semibold text-coffee-900">Buscar Cliente</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-coffee-500 text-white text-xs font-body font-semibold hover:bg-coffee-600 transition-colors shadow-coffee"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Nuevo
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre, teléfono o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-coffee-200 text-sm font-body text-coffee-900 placeholder-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-400 transition-all"
              />
            </div>

            {/* Dropdown list */}
            {search.trim() && filteredCustomers.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-coffee-100 divide-y divide-coffee-50">
                {filteredCustomers.map((c: Customer) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-coffee-50 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-body font-medium text-coffee-800">{c.nombre}</div>
                      <div className="text-xs text-coffee-400 font-body">{c.celular}</div>
                    </div>
                    {c.puntos > 0 && (
                      <span className="text-xs font-body font-semibold px-2 py-0.5 rounded-full bg-coffee-100 text-coffee-700">
                        {c.puntos} pts
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {search.trim() && filteredCustomers.length === 0 && (
              <div className="text-center py-4 text-sm font-body text-coffee-400">
                No se encontraron clientes
              </div>
            )}

            {/* Or pick from all active */}
            {!search.trim() && (
              <div>
                <label className="block text-xs font-body font-medium text-coffee-500 uppercase tracking-wide mb-2">
                  O selecciona directamente
                </label>
                <SearchableSelect
                  value={selectedCustomerId ?? ''}
                  onChange={v => v && handleSelectCustomer(v)}
                  options={activeCustomers.map((c: Customer) => ({ value: c.id, label: c.nombre }))}
                  placeholder="— Elegir cliente —"
                />
              </div>
            )}
          </div>

          {/* Loyalty card */}
          {selectedCustomer && selectedProfile && levelInfo ? (
            <>
              <LoyaltyCard
                profile={selectedProfile}
                customerName={selectedCustomer.nombre}
                levelInfo={levelInfo}
                onViewHistory={() => setActiveTab('compras')}
              />

              {/* Hitos */}
              {hitos.filter(h => h.activo).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-display font-semibold text-coffee-800 text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Hitos de Compra
                  </h3>
                  {hitos.filter(h => h.activo).map(hito => {
                    const purchaseCount = selectedCustomer.numeroCompras ?? 0;
                    const reached = purchaseCount >= hito.numeroCompras;
                    const yaReclamado = reclamadosHitosSet.has(hito.id);
                    const progress = Math.min(100, (purchaseCount / hito.numeroCompras) * 100);
                    return (
                      <div
                        key={hito.id}
                        className={clsx(
                          'rounded-2xl p-3 border transition-all',
                          reached
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-coffee-50 border-coffee-100',
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{hito.icono}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-body font-semibold text-coffee-800 truncate">
                                {hito.productoCanjeable.nombreProducto}
                              </span>
                              <span className="text-xs font-body text-coffee-400 whitespace-nowrap flex-shrink-0">
                                {purchaseCount}/{hito.numeroCompras}
                              </span>
                            </div>
                            <div className="w-full bg-coffee-200 rounded-full h-1.5 mt-1">
                              <div
                                className={clsx(
                                  'h-1.5 rounded-full transition-all duration-500',
                                  reached ? 'bg-yellow-400' : 'bg-coffee-500',
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {reached && (
                          yaReclamado ? (
                            <div className="w-full py-1.5 rounded-xl text-xs font-body font-bold flex items-center justify-center gap-1.5 bg-green-100 text-green-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Ya canjeado
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRedeemHito(hito)}
                              disabled={isLoadingHitosReclamados || isRedeemingHito}
                              className={clsx(
                                'w-full py-1.5 rounded-xl text-xs font-body font-bold transition-colors flex items-center justify-center gap-1.5',
                                isLoadingHitosReclamados
                                  ? 'bg-gray-100 text-gray-400 cursor-wait'
                                  : 'bg-yellow-400 text-coffee-900 hover:bg-yellow-300',
                              )}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              {isLoadingHitosReclamados ? 'Verificando...' : 'Reclamar recompensa'}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-gradient-to-br from-coffee-50 to-cream-light rounded-2xl p-8 text-center border border-coffee-100">
              <div className="w-16 h-16 rounded-full bg-coffee-100 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-coffee-400" />
              </div>
              <h3 className="font-display font-semibold text-coffee-800 mb-1">Sin cliente seleccionado</h3>
              <p className="text-sm font-body text-coffee-500">
                Busca o selecciona un cliente para ver su tarjeta de fidelización
              </p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            RIGHT COL – Tabs
        ═══════════════════════════════════════════ */}
        <div className="xl:col-span-2 space-y-5">

          {/* Tab bar */}
          <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee p-1.5">
            <div className="flex gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-body font-medium transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-coffee-500 text-white shadow-md'
                      : 'text-coffee-500 hover:bg-coffee-50 hover:text-coffee-700',
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB: Recompensas ─────────────────────────────────────────────── */}
          {activeTab === 'recompensas' && (
            <div className="space-y-5">
              {productosCanjeables.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <Gift className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-400">Sin productos canjeables configurados</p>
                </div>
              ) : (
                <>
                  {/* Puede reclamar ahora */}
                  {selectedCustomer && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <h3 className="font-display font-semibold text-coffee-900 text-sm">
                          Puede reclamar ahora
                          <span className="ml-2 text-xs font-body font-normal text-coffee-400">
                            ({selectedCustomer.puntos} pts disponibles)
                          </span>
                        </h3>
                      </div>
                      {(() => {
                        const disponibles = productosCanjeables.filter(p => p.activo && p.puntos <= selectedCustomer.puntos);
                        if (disponibles.length === 0) {
                          return (
                            <div className="text-center py-6 bg-coffee-50 rounded-xl text-sm font-body text-coffee-400">
                              Sin puntos suficientes para ninguna recompensa aún
                            </div>
                          );
                        }
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {disponibles.map(prod => (
                              <div
                                key={prod.id}
                                className="relative bg-white rounded-2xl border border-green-200 p-4 flex flex-col gap-2 hover:border-green-300 hover:shadow-md transition-all"
                              >
                                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-green-400" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-body font-semibold text-coffee-900 text-sm leading-tight">{prod.nombreProducto}</h4>
                                  <p className="text-coffee-400 text-xs font-body mt-0.5">{prod.categoria}</p>
                                  <p className="text-coffee-300 text-xs font-body">{prod.disponible}</p>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
                                    <span className="text-sm font-display font-bold text-coffee-700">{prod.puntos} pts</span>
                                  </div>
                                  <button
                                    onClick={() => handleRedeem(prod)}
                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-body font-semibold hover:bg-green-600 transition-colors"
                                  >
                                    <Gift className="w-3 h-3" />
                                    Canjear
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Todas las recompensas activas */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="w-4 h-4 text-coffee-500" />
                      <h3 className="font-display font-semibold text-coffee-900 text-sm">Todas las recompensas activas</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {productosCanjeables.filter(p => p.activo).map(prod => {
                        const canRedeem = selectedCustomer && selectedCustomer.puntos >= prod.puntos;
                        return (
                          <div
                            key={prod.id}
                            className={clsx(
                              'bg-white rounded-2xl border p-4 flex flex-col gap-2 transition-all',
                              selectedCustomer
                                ? canRedeem
                                  ? 'border-coffee-200 hover:shadow-coffee'
                                  : 'border-coffee-100 opacity-60'
                                : 'border-coffee-100',
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-body font-semibold text-coffee-900 text-sm leading-tight">{prod.nombreProducto}</h4>
                              <p className="text-coffee-400 text-xs font-body mt-0.5">{prod.categoria}</p>
                              <p className="text-coffee-300 text-xs font-body">{prod.disponible}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
                                <span className="text-sm font-display font-bold text-coffee-700">{prod.puntos} pts</span>
                              </div>
                              {selectedCustomer && (
                                <span className={clsx(
                                  'text-xs font-body font-semibold px-2 py-0.5 rounded-lg',
                                  canRedeem ? 'bg-coffee-100 text-coffee-600' : 'bg-gray-100 text-gray-400',
                                )}>
                                  {canRedeem ? 'Alcanzable' : `Faltan ${prod.puntos - selectedCustomer.puntos} pts`}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedCustomer && (
                    <div className="text-center py-3 text-sm font-body text-coffee-400 bg-coffee-50 rounded-xl">
                      Selecciona un cliente para ver qué puede reclamar
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── TAB: Promos de Temporada ─────────────────────────────────────── */}
          {activeTab === 'promos' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-bold text-coffee-900 text-base">Promociones de Temporada</h3>
                <p className="text-xs font-body text-coffee-400 mt-0.5">Promociones activas con sus productos canjeables asociados.</p>
              </div>

              {promocionesTemporada.length === 0 ? (
                <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
                  <Calendar className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
                  <p className="text-sm font-body text-coffee-400">Sin promociones de temporada configuradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {promocionesTemporada.map(promo => (
                    <div
                      key={promo.id}
                      className={clsx(
                        'bg-white rounded-2xl border p-4 transition-all',
                        promo.activo ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100 opacity-70',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-display font-bold text-coffee-900">{promo.nombre}</span>
                            <span className={clsx(
                              'text-xs font-body font-bold px-2 py-0.5 rounded-full',
                              promo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                            )}>
                              {promo.activo ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-body text-coffee-400 mb-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(promo.fechaInicio).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                              {' — '}
                              {new Date(promo.fechaFin).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          {promo.productosCanjeables.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              {promo.productosCanjeables.map(pc => {
                                const prod = pc.productoCanjeable;
                                const canCanje = promo.activo && prod.activo && !!selectedCustomer;
                                const hasPoints = selectedCustomer ? selectedCustomer.puntos >= prod.puntos : false;
                                return (
                                  <div
                                    key={pc.id_ProductoCanjeable}
                                    className={clsx(
                                      'flex items-center justify-between gap-2 rounded-xl border px-3 py-2',
                                      canCanje && hasPoints
                                        ? 'bg-white border-coffee-200'
                                        : 'bg-coffee-50 border-coffee-100',
                                    )}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-body font-semibold text-coffee-900 truncate">{prod.nombreProducto}</p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                                        <span className="text-xs font-display font-bold text-coffee-700">{prod.puntos} pts</span>
                                      </div>
                                    </div>
                                    {canCanje ? (
                                      <button
                                        onClick={() => handleRedeem({
                                          id: String(pc.id_ProductoCanjeable),
                                          id_Producto: String(pc.id_ProductoCanjeable),
                                          nombreProducto: prod.nombreProducto,
                                          categoria: prod.categoria,
                                          puntos: prod.puntos,
                                          disponible: prod.disponible,
                                          activo: prod.activo,
                                        })}
                                        disabled={!hasPoints}
                                        className={clsx(
                                          'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-body font-semibold flex-shrink-0 transition-colors',
                                          hasPoints
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                                        )}
                                      >
                                        <Gift className="w-3 h-3" />
                                        {hasPoints ? 'Canjear' : 'Sin pts'}
                                      </button>
                                    ) : (
                                      <span className="text-xs font-body text-coffee-300 flex-shrink-0">
                                        {!prod.activo ? 'Inactivo' : '—'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Promos Permanentes ───────────────────────────────────────── */}
          {activeTab === 'promos_permanentes' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display font-bold text-coffee-900 text-base">Promociones Permanentes</h3>
                <p className="text-xs font-body text-coffee-400 mt-0.5">Productos gratis por condición de compra.</p>
              </div>

              {/* Sección por cliente: Disponibles + En progreso */}
              {!selectedCustomer ? (
                <div className="text-center py-8 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
                  <Zap className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
                  <p className="text-sm font-body text-coffee-400">Selecciona un cliente para ver sus promociones disponibles</p>
                </div>
              ) : isLoadingPromosGratis ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-coffee-100">
                  <RotateCcw className="w-8 h-8 text-coffee-200 mx-auto mb-2 animate-spin" />
                  <p className="text-sm font-body text-coffee-400">Cargando promociones...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Disponibles para reclamar */}
                  {promosGratisCliente && promosGratisCliente.Disponibles.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <h4 className="font-display font-semibold text-coffee-900 text-sm">Puede reclamar ahora</h4>
                      </div>
                      <div className="space-y-3">
                        {promosGratisCliente.Disponibles.map(promo => {
                          const yaReclamado = reclamadosPromos.has(promo.IdPromocionPermanente);
                          return (
                            <div
                              key={promo.IdPromocionPermanente}
                              className="bg-white rounded-2xl border border-green-200 p-4 flex items-center gap-4 shadow-sm"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">
                                {promo.TipoCondicion === 'NCompras' ? '☕' : '💰'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-display font-bold text-coffee-900 text-sm">{promo.NombrePromocion}</p>
                                <p className="text-xs font-body text-coffee-500 mt-0.5">
                                  {promo.NombreProducto} · {promo.Categoria}
                                </p>
                                {promo.TipoCondicion === 'NCompras' && promo.ProgresoActual !== null && (
                                  <span className="text-xs font-body text-green-600 font-semibold">
                                    {promo.ProgresoActual}/{promo.ValorCondicion} compras ✓
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => setConfirmPromoGratis(promo)}
                                disabled={yaReclamado || isRedeemingPromoGratis}
                                className={clsx(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-bold transition-colors flex-shrink-0',
                                  yaReclamado
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 text-white hover:bg-green-600',
                                )}
                              >
                                <Gift className="w-3.5 h-3.5" />
                                {yaReclamado ? 'Reclamado' : 'Reclamar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* En progreso */}
                  {promosGratisCliente && promosGratisCliente.EnProgreso.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-coffee-400" />
                        <h4 className="font-display font-semibold text-coffee-900 text-sm">En progreso</h4>
                      </div>
                      <div className="space-y-3">
                        {promosGratisCliente.EnProgreso.map(promo => {
                          const progreso = promo.ProgresoActual ?? 0;
                          const pct = Math.min(100, (progreso / promo.ValorCondicion) * 100);
                          return (
                            <div
                              key={promo.IdPromocionPermanente}
                              className="bg-white rounded-2xl border border-coffee-100 p-4"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center text-xl flex-shrink-0">
                                  {promo.TipoCondicion === 'NCompras' ? '☕' : '💰'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-display font-bold text-coffee-900 text-sm">{promo.NombrePromocion}</p>
                                  <p className="text-xs font-body text-coffee-500">{promo.NombreProducto} · {promo.Categoria}</p>
                                </div>
                                {promo.TipoCondicion === 'NCompras' && (
                                  <span className="text-xs font-body font-bold text-coffee-500 flex-shrink-0">
                                    {progreso}/{promo.ValorCondicion}
                                  </span>
                                )}
                              </div>
                              {promo.TipoCondicion === 'NCompras' && (
                                <div className="w-full bg-coffee-100 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-coffee-500 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {promosGratisCliente &&
                    promosGratisCliente.Disponibles.length === 0 &&
                    promosGratisCliente.EnProgreso.length === 0 && (
                    <div className="text-center py-6 bg-coffee-50 rounded-xl text-sm font-body text-coffee-400">
                      Sin promociones activas para este cliente
                    </div>
                  )}
                </div>
              )}

              {/* Todas las permanentes (no ProductoGratis) — multiplicadores y otros */}
              {(() => {
                const otras = promocionesPermanentes.filter(p => p.tipoRecompensa !== 'ProductoGratis');
                if (otras.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-coffee-400" />
                      <h4 className="font-display font-semibold text-coffee-900 text-sm">Multiplicadores de puntos</h4>
                    </div>
                    {otras.map(promo => (
                      <div
                        key={promo.id}
                        className={clsx(
                          'bg-white rounded-2xl border p-4 transition-all duration-200',
                          promo.activo ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100 opacity-70',
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={clsx(
                            'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                            promo.activo ? 'bg-coffee-100' : 'bg-gray-100',
                          )}>
                            {promo.tipoCondicion === 'NCompras' ? '☕' :
                             promo.tipoCondicion === 'MontoMinimo' ? '💰' : '🎯'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-display font-bold text-coffee-900">{promo.nombre}</span>
                              <span className={clsx(
                                'text-xs font-body font-bold px-2 py-0.5 rounded-full',
                                promo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                              )}>
                                {promo.activo ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            <p className="text-xs font-body text-coffee-500 mb-2">{promo.descripcion}</p>
                            <div className="flex flex-wrap gap-3 text-xs font-body">
                              <span className="flex items-center gap-1">
                                <Target className="w-3.5 h-3.5 text-coffee-400" />
                                <span className="text-coffee-600 font-medium">Condición:</span>
                                <span className="text-coffee-500">{promo.tipoCondicion} · {promo.valorCondicion}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Gift className="w-3.5 h-3.5 text-coffee-400" />
                                <span className="text-coffee-600 font-medium">Recompensa:</span>
                                <span className="text-coffee-500">{promo.tipoRecompensa} · {promo.valorRecompensa}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}



          {/* ── TAB: Historial Compras ───────────────────────────────────────── */}
          {activeTab === 'compras' && (
            <div>
              {!selectedCustomer ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <ShoppingCart className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-400">Selecciona un cliente para ver su historial de compras</p>
                </div>
              ) : isLoadingVentas ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <RotateCcw className="w-10 h-10 text-coffee-200 mx-auto mb-3 animate-spin" />
                  <p className="font-body text-coffee-400">Cargando compras...</p>
                </div>
              ) : (() => {
                const allVentas = [...ventasCliente].sort(
                  (a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime(),
                );
                if (allVentas.length === 0) return (
                  <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                    <ShoppingCart className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                    <p className="font-body text-coffee-500 font-medium">{selectedCustomer.nombre}</p>
                    <p className="font-body text-coffee-400 text-sm mt-1">Sin compras registradas todavía</p>
                  </div>
                );
                return (
                <div className="bg-white rounded-2xl border border-coffee-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-coffee-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-coffee-900">{selectedCustomer.nombre}</h3>
                      <p className="text-xs font-body text-coffee-400">{allVentas.length} registros</p>
                    </div>
                    <span className="text-sm font-body font-bold px-3 py-1 rounded-full bg-coffee-100 text-coffee-700">
                      {selectedCustomer.puntos} pts
                    </span>
                  </div>

                  <div className="divide-y divide-coffee-50 max-h-[500px] overflow-y-auto">
                    {allVentas.map((venta) => {
                      const totalNum = typeof venta.montoTotal === 'number' ? venta.montoTotal : parseFloat(venta.montoTotal) || 0;
                      const isGratis = totalNum === 0;
                      return (
                      <div key={venta.id} className={clsx('px-5 py-4 transition-colors', isGratis ? 'bg-green-50/40 hover:bg-green-50' : 'hover:bg-coffee-50/40')}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-body font-semibold text-coffee-500 bg-coffee-100 px-2 py-0.5 rounded-full">
                                #{venta.numeroFactura}
                              </span>
                              {isGratis && (
                                <span className="text-xs font-body font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Gift className="w-3 h-3" />
                                  Canje gratuito
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-body text-coffee-400 mt-1">
                              {formatDateTime(venta.fechaEmision)}
                            </p>
                          </div>
                          <span className={clsx('text-base font-display font-black flex-shrink-0', isGratis ? 'text-green-600' : 'text-coffee-800')}>
                            {isGratis ? 'Gratis' : `Bs. ${totalNum.toFixed(2)}`}
                          </span>
                        </div>
                        {venta.detalles && venta.detalles.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {venta.detalles.map((d, i) => {
                              const subTotalNum = typeof d.subTotal === 'number' ? d.subTotal : parseFloat(d.subTotal) || 0;
                              return (
                                <div key={i} className="flex justify-between text-xs font-body text-coffee-500">
                                  <span>{d.cantidad}× {d.descripcion}</span>
                                  <span>{isGratis ? '— Gratis' : `Bs. ${subTotalNum.toFixed(2)}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}
            </div>
          )}

          {/* ── TAB: Info Cliente ─────────────────────────────────────────────── */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {!selectedCustomer ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <Info className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-400">Selecciona un cliente para ver su información completa</p>
                </div>
              ) : (
                <>
                  {/* Datos personales */}
                  <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
                    <div className="px-5 py-3 border-b border-coffee-50 flex items-center gap-2">
                      <Users className="w-4 h-4 text-coffee-500" />
                      <h3 className="font-display font-semibold text-coffee-900">Datos del Cliente</h3>
                    </div>
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-body text-coffee-400 uppercase tracking-wide mb-0.5">Nombre</p>
                        <p className="font-body font-semibold text-coffee-900">{selectedCustomer.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs font-body text-coffee-400 uppercase tracking-wide mb-0.5">Teléfono</p>
                        <p className="font-body font-semibold text-coffee-900">{selectedCustomer.celular}</p>
                      </div>
                      {selectedCustomer.correo && (
                        <div>
                          <p className="text-xs font-body text-coffee-400 uppercase tracking-wide mb-0.5">Correo</p>
                          <p className="font-body font-semibold text-coffee-900">{selectedCustomer.correo}</p>
                        </div>
                      )}
                      {selectedCustomer.dni && (
                        <div>
                          <p className="text-xs font-body text-coffee-400 uppercase tracking-wide mb-0.5">CI</p>
                          <p className="font-body font-semibold text-coffee-900">{selectedCustomer.dni}</p>
                        </div>
                      )}
                      {selectedCustomer.fecha_nacimiento && (
                        <div>
                          <p className="text-xs font-body text-coffee-400 uppercase tracking-wide mb-0.5">Cumpleaños</p>
                          <p className="font-body font-semibold text-coffee-900">
                            {new Date(selectedCustomer.fecha_nacimiento).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      {selectedCustomer.direccion && (
                        <div>
                          <p className="text-xs font-body text-coffee-400 uppercase tracking-wide mb-0.5">Dirección</p>
                          <p className="font-body font-semibold text-coffee-900">{selectedCustomer.direccion}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estadísticas de fidelización */}
                  <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
                    <div className="px-5 py-3 border-b border-coffee-50 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-coffee-500" />
                      <h3 className="font-display font-semibold text-coffee-900">Resumen de Fidelización</h3>
                    </div>
                    <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-coffee-50 rounded-xl">
                        <div className="text-2xl font-display font-black text-coffee-800">{selectedCustomer.puntos}</div>
                        <div className="text-xs font-body text-coffee-500 mt-0.5">Puntos actuales</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <div className="text-2xl font-display font-black text-blue-700">{ventasCliente.length}</div>
                        <div className="text-xs font-body text-blue-500 mt-0.5">Total compras</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-xl">
                        <div className="text-2xl font-display font-black text-green-700">
                          {historialPuntos.length}
                        </div>
                        <div className="text-xs font-body text-green-500 mt-0.5">Registros puntos</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-xl">
                        <div className="text-2xl font-display font-black text-amber-700">
                          {selectedProfile ? LEVEL_CONFIG[selectedProfile.level].icon : '🥉'}
                        </div>
                        <div className="text-xs font-body text-amber-500 mt-0.5">
                          {selectedProfile ? LEVEL_CONFIG[selectedProfile.level].label : 'Bronce'}
                        </div>
                      </div>
                    </div>

                    {/* Gasto total estimado */}
                    {ventasCliente.length > 0 && (
                      <div className="px-5 pb-4">
                        <div className="flex items-center justify-between p-3 bg-coffee-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-coffee-500" />
                            <span className="text-sm font-body font-medium text-coffee-700">Gasto total registrado</span>
                          </div>
                          <span className="font-display font-black text-coffee-900">
                            Bs. {ventasCliente.reduce((s, v) => s + (typeof v.montoTotal === 'number' ? v.montoTotal : parseFloat(v.montoTotal) || 0), 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hitos: todos + posición actual */}
                  <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
                    <div className="px-5 py-3 border-b border-coffee-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <h3 className="font-display font-semibold text-coffee-900">Hitos de Compra</h3>
                      </div>
                      <span className="text-xs font-body text-coffee-400">
                        {selectedCustomer?.numeroCompras ?? 0} visitas
                      </span>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      {hitos.filter(h => h.activo).length === 0 ? (
                        <p className="text-sm font-body text-coffee-400 text-center py-4">Sin hitos configurados</p>
                      ) : (
                        <div className="flex items-start gap-2 min-w-max">
                          {hitos.filter(h => h.activo).map((hito, idx, arr) => {
                            const purchaseCount = selectedCustomer?.numeroCompras ?? 0;
                            const reached = purchaseCount >= hito.numeroCompras;
                            const isNext = !reached && (idx === 0 || purchaseCount >= arr[idx - 1].numeroCompras);
                            const canjeado = reclamadosHitosSet.has(hito.id);
                            return (
                              <React.Fragment key={hito.id}>
                                {idx > 0 && (
                                  <div className={clsx('flex-shrink-0 h-0.5 w-6 mt-5 self-start', reached ? 'bg-coffee-400' : 'bg-coffee-100')} />
                                )}
                                <div className="flex flex-col items-center gap-1 w-20 text-center flex-shrink-0">
                                  <div className={clsx(
                                    'w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 transition-all',
                                    canjeado ? 'bg-green-500 border-green-400' : reached ? 'bg-coffee-500 border-coffee-400' : isNext ? 'bg-coffee-50 border-coffee-300 ring-2 ring-coffee-300 ring-offset-1 animate-pulse' : 'bg-white border-coffee-100',
                                  )}>
                                    {canjeado ? <CheckCircle className="w-5 h-5 text-white" /> : reached ? <CheckCircle className="w-5 h-5 text-white" /> : <span className={isNext ? '' : 'opacity-40'}>{hito.icono}</span>}
                                  </div>
                                  <span className={clsx(
                                    'text-xs font-body font-bold px-1.5 py-0.5 rounded-full',
                                    canjeado ? 'bg-green-100 text-green-700' : reached ? 'bg-coffee-100 text-coffee-700' : isNext ? 'bg-coffee-500 text-white' : 'bg-gray-100 text-gray-400',
                                  )}>
                                    #{hito.numeroCompras}
                                  </span>
                                  <p className={clsx('text-xs font-body leading-tight', canjeado ? 'text-green-600 font-medium' : reached ? 'text-coffee-600 font-medium' : isNext ? 'text-coffee-500' : 'text-coffee-200')}>
                                    {hito.productoCanjeable.nombreProducto}
                                  </p>
                                  {canjeado && (
                                    <span className="text-xs font-body font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded-full leading-tight">
                                      Canjeado
                                    </span>
                                  )}
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Historial Puntos ─────────────────────────────────────────── */}
          {activeTab === 'historial' && (
            <div>
              {!selectedCustomer ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <Clock className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-400">Selecciona un cliente para ver su historial de puntos</p>
                </div>
              ) : isLoadingHistorial ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <RotateCcw className="w-10 h-10 text-coffee-200 mx-auto mb-3 animate-spin" />
                  <p className="font-body text-coffee-400">Cargando historial...</p>
                </div>
              ) : historialPuntos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <Clock className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-500 font-medium">{selectedCustomer.nombre}</p>
                  <p className="font-body text-coffee-400 text-sm mt-1">Sin historial de puntos registrado todavía</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-coffee-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-coffee-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-coffee-900">{selectedCustomer.nombre}</h3>
                      <p className="text-xs font-body text-coffee-400">{historialPuntos.length} registros</p>
                    </div>
                    <span className={clsx(
                      'text-sm font-body font-bold px-3 py-1 rounded-full',
                      selectedProfile ? LEVEL_CONFIG[selectedProfile.level].badge : 'bg-coffee-100 text-coffee-700',
                    )}>
                      {selectedProfile?.points ?? 0} pts disponibles
                    </span>
                  </div>

                  <div className="divide-y divide-coffee-50 max-h-[480px] overflow-y-auto">
                    {historialPuntos.map((item: HistorialPuntosItem, idx: number) => (
                      <div key={item.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-coffee-50/40 transition-colors">
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-7 h-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                            <ArrowUpCircle className="w-4 h-4" />
                          </div>
                          {idx < historialPuntos.length - 1 && (
                            <div className="w-px h-6 bg-coffee-100 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-body font-medium text-coffee-800 leading-tight">
                                {item.desglose ?? `Compra #${item.codigoVenta}`}
                              </p>
                              <p className="text-xs font-body text-coffee-400 mt-0.5">
                                {formatDateTime(item.fecha)}
                              </p>
                            </div>
                            <span className="text-base font-display font-black flex-shrink-0 text-green-600">
                              +{item.puntosFinales}
                            </span>
                          </div>
                          <span className="inline-block mt-1 text-xs font-body px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
                            Base: {item.puntosBase} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm Redeem Modal ────────────────────────────────────────────── */}
      {confirmReward && selectedCustomer && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmReward(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">Confirmar canje</h3>
            <p className="text-sm font-body text-coffee-500 mb-5">
              Verificá que el producto está listo para entregar al cliente.
            </p>

            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900">{confirmReward.nombreProducto}</p>
                  <p className="text-xs font-body text-coffee-500">{confirmReward.categoria}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm font-body border-t border-green-200 pt-3">
                <span className="text-coffee-600">Cliente</span>
                <span className="font-semibold text-coffee-900">{selectedCustomer.nombre}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Puntos a descontar</span>
                <span className="font-display font-bold text-red-500">−{confirmReward.puntos} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Saldo después</span>
                <span className="font-display font-bold text-coffee-900">{selectedProfile.points - confirmReward.puntos} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Total cobrado</span>
                <span className="font-display font-bold text-green-600">Bs. 0.00 — Gratis</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReward(null)}
                disabled={isRedeeming}
                className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRedeem}
                disabled={isRedeeming}
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-body font-semibold hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRedeeming ? 'Canjeando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Hito Modal ───────────────────────────────────────────── */}
      {confirmHito && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmHito(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">Confirmar hito</h3>
            <p className="text-sm font-body text-coffee-500 mb-5">
              Verificá que el producto está listo para entregar al cliente.
            </p>

            <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-xl flex-shrink-0">
                  {confirmHito.icono}
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900">{confirmHito.productoCanjeable.nombreProducto}</p>
                  <p className="text-xs font-body text-coffee-500">{confirmHito.productoCanjeable.categoria}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm font-body border-t border-yellow-200 pt-3">
                <span className="text-coffee-600">Cliente</span>
                <span className="font-semibold text-coffee-900">{selectedCustomer.nombre}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Compras del cliente</span>
                <span className="font-display font-bold text-coffee-900">{selectedCustomer.numeroCompras ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Hito requerido</span>
                <span className="font-display font-bold text-yellow-600">{confirmHito.numeroCompras} compras</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Costo en puntos</span>
                <span className="font-display font-bold text-green-600">Gratis — sin descuento de puntos</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmHito(null)}
                disabled={isRedeemingHito}
                className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmHito}
                disabled={isRedeemingHito}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-coffee-900 text-sm font-body font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRedeemingHito ? 'Reclamando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Promo Gratis Modal ────────────────────────────────────── */}
      {confirmPromoGratis && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmPromoGratis(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">Confirmar promoción</h3>
            <p className="text-sm font-body text-coffee-500 mb-5">
              Verificá que el producto está listo para entregar al cliente.
            </p>

            <div className="p-4 rounded-2xl bg-green-50 border border-green-200 mb-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
                  {confirmPromoGratis.TipoCondicion === 'NCompras' ? '☕' : '💰'}
                </div>
                <div>
                  <p className="font-display font-bold text-coffee-900">{confirmPromoGratis.NombreProducto}</p>
                  <p className="text-xs font-body text-coffee-500">{confirmPromoGratis.Categoria}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm font-body border-t border-green-200 pt-3">
                <span className="text-coffee-600">Promoción</span>
                <span className="font-semibold text-coffee-900 text-right text-xs">{confirmPromoGratis.NombrePromocion}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Cliente</span>
                <span className="font-semibold text-coffee-900">{selectedCustomer.nombre}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-body">
                <span className="text-coffee-600">Costo en puntos</span>
                <span className="font-display font-bold text-green-600">Gratis — sin descuento</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmPromoGratis(null)}
                disabled={isRedeemingPromoGratis}
                className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPromoGratis}
                disabled={isRedeemingPromoGratis}
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-body font-semibold hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRedeemingPromoGratis ? 'Reclamando...' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Print Recibo Modal (reclamo) ──────────────────────────────────── */}
      <PrintReciboModal
        data={printReciboData}
        onClose={() => setPrintReciboData(null)}
      />

      {/* ── Create Customer Modal ─────────────────────────────────────────── */}
      <CustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refreshClientes()}
        onSave={handleCreateCliente}
      />
    </MainLayout>
  );
};
