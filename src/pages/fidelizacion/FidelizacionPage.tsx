import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Star, Gift, Coffee, Zap, Trophy, Users, Calendar, Clock,
  Sparkles, Heart, Target, CheckCircle,
  Search, TrendingUp, RotateCcw, Plus, Minus, ArrowUpCircle,
  ArrowDownCircle, Crown, Flame, Cake, Settings, ShoppingBag,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
// UI primitives not needed - page uses custom inline components
import { toast } from '../../components/ui/Toast';
import { SearchableSelect } from '../../components/ui/Select';
import { formatDateTime } from '../../utils/formatters';
import type { LoyaltyProfile, LoyaltyLevel, MilestoneReward, MilestoneVoucher, LoyaltyTransaction, Reward, Mission, Promotion, PermanentPromotion, ConditionType, RewardType } from '../../types/loyalty';
import type { Customer } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'recompensas' | 'promos' | 'promos_permanentes' | 'misiones' | 'historial' | 'config';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', nombre: 'Ana Quispe',    celular: '70011122', correo: 'ana@email.com', estado: true, puntos: 0 },
  { id: 'c2', nombre: 'Carlos Mamani', celular: '70033344', estado: true, puntos: 0 },
  { id: 'c3', nombre: 'Lucía Flores',  celular: '70055566', correo: 'lucia@email.com', estado: true, puntos: 0 },
  { id: 'c4', nombre: 'Diego Vargas',  celular: '70077788', estado: true, puntos: 0 },
];

const MOCK_PROFILES: LoyaltyProfile[] = [
  { id: 'p1', customerId: 'c1', points: 340, lifetimePoints: 520, purchaseCount: 18, level: 'plata', birthday: '1995-04-14', referralCode: 'ANA520', referralCount: 2, consecutiveDays: 3, lastPurchaseDate: '2026-04-13', uniqueProductsBought: ['prod1','prod2','prod3'], completedMissions: ['m2'], createdAt: new Date('2024-01-10'), updatedAt: new Date() },
  { id: 'p2', customerId: 'c2', points: 80, lifetimePoints: 150, purchaseCount: 6, level: 'bronce', referralCode: 'CAR150', referralCount: 0, consecutiveDays: 1, uniqueProductsBought: ['prod1'], completedMissions: [], createdAt: new Date('2024-02-15'), updatedAt: new Date() },
  { id: 'p3', customerId: 'c3', points: 610, lifetimePoints: 1120, purchaseCount: 42, level: 'oro', birthday: '1990-07-22', referralCode: 'LUC1120', referralCount: 5, consecutiveDays: 7, lastPurchaseDate: '2026-04-12', uniqueProductsBought: ['prod1','prod2','prod3','prod4','prod5'], completedMissions: ['m1','m2','m3'], createdAt: new Date('2024-03-01'), updatedAt: new Date() },
  { id: 'p4', customerId: 'c4', points: 20, lifetimePoints: 30, purchaseCount: 2, level: 'bronce', referralCode: 'DIE030', referralCount: 0, consecutiveDays: 0, uniqueProductsBought: ['prod1'], completedMissions: [], createdAt: new Date('2024-04-20'), updatedAt: new Date() },
];

const MOCK_TRANSACTIONS: LoyaltyTransaction[] = [
  { id: 't1', customerId: 'c1', points: 15, type: 'earned', description: 'Compra Bs.150 — puntos dobles (>Bs.100)', date: '2026-04-13T10:30:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't2', customerId: 'c1', points: 3, type: 'combo_bonus', description: 'Bonus combo pedido', date: '2026-04-13T10:30:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't3', customerId: 'c1', points: 8, type: 'earned', description: 'Compra Bs.80', date: '2026-04-10T09:15:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't4', customerId: 'c1', points: -20, type: 'redeemed', description: 'Canje: Brownie Casero', date: '2026-04-08T11:00:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't5', customerId: 'c1', points: 30, type: 'birthday_bonus', description: '🎂 Cumpleaños — puntos x3', date: '2026-04-14T08:00:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't6', customerId: 'c1', points: 10, type: 'referral', description: 'Referiste a Diego Vargas', date: '2026-04-05T14:20:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't7', customerId: 'c3', points: 12, type: 'earned', description: 'Compra Bs.120 — puntos dobles (>Bs.100)', date: '2026-04-12T10:00:00Z', createdAt: new Date(), updatedAt: new Date() },
  { id: 't8', customerId: 'c3', points: 3, type: 'combo_bonus', description: 'Bonus combo pedido', date: '2026-04-12T10:00:00Z', createdAt: new Date(), updatedAt: new Date() },
];

const MOCK_REWARDS: Reward[] = [
  // Diarios
  { id: 'r1', name: 'Café Americano Gratis', description: 'Un americano de 12oz para el cliente', pointsCost: 20, category: 'diario', icon: '☕', isActive: true },
  { id: 'r2', name: 'Té de Hierbas Gratis', description: 'Té caliente a elección', pointsCost: 15, category: 'diario', icon: '🍵', isActive: true },
  { id: 'r3', name: 'Brownie Casero Gratis', description: 'Brownie de chocolate recién horneado', pointsCost: 25, category: 'diario', icon: '🍫', isActive: true },
  { id: 'r4', name: 'Cookie de Choco Gratis', description: 'Cookie artesanal de chocolate', pointsCost: 20, category: 'diario', icon: '🍪', isActive: true },
  { id: 'r5', name: 'Empanada de Queso Gratis', description: 'Empanada horneada de queso', pointsCost: 30, category: 'diario', icon: '🥐', isActive: true },
  // Premio mayor
  { id: 'r6', name: 'Almuerzo Completo Gratis', description: 'Almuerzo del día con bebida incluida', pointsCost: 200, category: 'premio_mayor', icon: '🍽️', isActive: true, highlight: true },
];

const MOCK_MISSIONS: Mission[] = [
  { id: 'm1', name: 'Semana Perfecta', description: 'Visita 7 días seguidos', bonusPoints: 50, icon: '🔥', requirement: 7, type: 'consecutive_days', isActive: true },
  { id: 'm2', name: 'Explorador del Menú', description: 'Prueba 5 productos distintos', bonusPoints: 30, icon: '🗺️', requirement: 5, type: 'unique_products', isActive: true },
  { id: 'm3', name: 'Embajador Yana', description: 'Refiere a 1 amigo al programa', bonusPoints: 20, icon: '🤝', requirement: 1, type: 'referral', isActive: true },
  { id: 'm4', name: 'Combo Lover', description: 'Pide un combo en tu próxima visita', bonusPoints: 10, icon: '🎯', requirement: 1, type: 'combo', isActive: true },
];

const MOCK_MILESTONES: MilestoneReward[] = [
  { purchaseNumber: 10,  reward: 'Café Americano',    icon: '☕', description: 'Café gratis en tu 10ma visita' },
  { purchaseNumber: 20,  reward: 'Desayuno Completo', icon: '🥐', description: 'Desayuno gratis en tu 20va visita' },
  { purchaseNumber: 30,  reward: 'Postre Especial',   icon: '🍰', description: 'Postre gratis en tu 30va visita' },
  { purchaseNumber: 40,  reward: 'Brunch para Dos',   icon: '🥳', description: 'Brunch gratis para dos en tu 40va visita' },
  { purchaseNumber: 60,  reward: 'Almuerzo Completo', icon: '🍽️', description: 'Almuerzo gratis en tu 60va visita' },
  { purchaseNumber: 100, reward: 'Experiencia Yana',  icon: '💎', description: 'Experiencia premium en tu 100va visita' },
];

const MOCK_VOUCHERS: MilestoneVoucher[] = [
  // Ana (18 compras) — alcanzó hito 10, pendiente de canje
  { id: 'v1', customerId: 'c1', milestoneNumber: 10, reward: 'Café Americano', icon: '☕', isRedeemed: false, generatedAt: '2026-03-20T10:00:00Z' },
  // Lucía (42 compras) — alcanzó 10, 20 (ya canjeados), 40 pendiente
  { id: 'v2', customerId: 'c3', milestoneNumber: 10, reward: 'Café Americano', icon: '☕', isRedeemed: true,  generatedAt: '2025-08-15T09:00:00Z', redeemedAt: '2025-08-15T09:30:00Z' },
  { id: 'v3', customerId: 'c3', milestoneNumber: 20, reward: 'Desayuno Completo', icon: '🥐', isRedeemed: true, generatedAt: '2025-11-10T10:00:00Z', redeemedAt: '2025-11-10T11:00:00Z' },
  { id: 'v4', customerId: 'c3', milestoneNumber: 30, reward: 'Postre Especial', icon: '🍰', isRedeemed: true, generatedAt: '2026-02-05T10:00:00Z', redeemedAt: '2026-02-05T10:15:00Z' },
  { id: 'v5', customerId: 'c3', milestoneNumber: 40, reward: 'Brunch para Dos', icon: '🥳', isRedeemed: false, generatedAt: '2026-04-10T10:00:00Z' },
];

const MOCK_PROMOTIONS: Promotion[] = [
  // Abril
  { id: 'promo1', name: 'Café Frío Especial', description: 'Cold brew de temporada para el verano tardío.', icon: '🧊', type: 'canje_puntos', pointsCost: 35, month: 4, startDate: '2026-04-01', endDate: '2026-04-30', isActive: true },
  { id: 'promo2', name: 'Limonada Refrescante', description: 'Limonada fresca con jengibre y menta.', icon: '🍋', type: 'canje_puntos', pointsCost: 25, month: 4, startDate: '2026-04-10', endDate: '2026-04-30', isActive: true },
  { id: 'promo3', name: 'x2 en Bebidas Frías', description: 'Todas las bebidas frías acumulan puntos dobles.', icon: '✨', type: 'puntos_dobles_categoria', category: 'Bebidas Frías', multiplier: 2, month: 4, startDate: '2026-04-15', endDate: '2026-04-30', isActive: false },
  // Mayo
  { id: 'promo4', name: 'Tarta Día de la Madre', description: 'Tarta especial de fresas en honor al Día de la Madre.', icon: '🍓', type: 'canje_puntos', pointsCost: 40, month: 5, startDate: '2026-05-01', endDate: '2026-05-31', isActive: false },
  { id: 'promo5', name: 'Chocolate Caliente Gratis', description: 'Chocolate artesanal con canela para entrar al invierno.', icon: '☕', type: 'canje_puntos', pointsCost: 30, month: 5, startDate: '2026-05-15', endDate: '2026-05-31', isActive: false },
  { id: 'promo6', name: 'x2 en Postres', description: 'Todos los postres y tortas acumulan puntos dobles en mayo.', icon: '✨', type: 'puntos_dobles_categoria', category: 'Postres', multiplier: 2, month: 5, startDate: '2026-05-01', endDate: '2026-05-31', isActive: false },
  // Junio
  { id: 'promo7', name: 'Café de Invierno', description: 'Café caliente especial de la temporada de frío.', icon: '🔥', type: 'canje_puntos', pointsCost: 30, month: 6, startDate: '2026-06-01', endDate: '2026-06-30', isActive: false },
  { id: 'promo8', name: 'x2 en Bebidas Calientes', description: 'Cafés, tés y chocolates acumulan el doble en junio.', icon: '✨', type: 'puntos_dobles_categoria', category: 'Bebidas Calientes', multiplier: 2, month: 6, startDate: '2026-06-01', endDate: '2026-06-30', isActive: false },
  // Julio
  { id: 'promo9', name: 'Combo de Invierno', description: 'Combo bebida caliente + postre con descuento especial.', icon: '🥐', type: 'canje_puntos', pointsCost: 45, month: 7, startDate: '2026-07-01', endDate: '2026-07-31', isActive: false },
  { id: 'promo10', name: 'x3 en Almuerzos', description: 'Los almuerzos completos acumulan puntos triplicados en julio.', icon: '✨', type: 'puntos_dobles_categoria', category: 'Almuerzos', multiplier: 3, month: 7, startDate: '2026-07-01', endDate: '2026-07-31', isActive: false },
];

const MOCK_PERMANENT_PROMOTIONS: PermanentPromotion[] = [
  { id: 'perm1', name: 'Café de Regalo', description: 'Compra 10 cafés y recibe 1 gratis', isActive: true, conditionType: 'n_purchases', conditionValue: 10, rewardType: 'free_product', rewardValue: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'perm2', name: 'Referido Exitoso', description: 'Refiere a un amigo y ambos reciben 50 puntos extra', isActive: true, conditionType: 'referral', conditionValue: 1, rewardType: 'extra_points', rewardValue: 50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'perm3', name: 'Descuento Grupal', description: 'Grupos de 4+ personas reciben 10% de descuento', isActive: false, conditionType: 'min_amount', conditionValue: 4, rewardType: 'discount', rewardValue: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

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

const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

const MONTH_ICONS: Record<number, string> = {
  1: '❄️', 2: '💝', 3: '🌱', 4: '🌸',
  5: '💐', 6: '☀️', 7: '🏖️', 8: '🌻',
  9: '🌺', 10: '🌕', 11: '🍂', 12: '🎄',
};

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
  onAdjustPoints: () => void;
}

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  profile,
  customerName,
  levelInfo,
  onViewHistory,
  onAdjustPoints,
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
        <button
          onClick={onAdjustPoints}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-body font-medium border border-white/20"
        >
          <Zap className="w-3.5 h-3.5" />
          Ajustar Puntos
        </button>
      </div>
    </div>
  );
};

interface MilestoneTrackerProps {
  purchaseCount: number;
  milestones: MilestoneReward[];
}

const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ purchaseCount, milestones }) => {
  const sorted = [...milestones].sort((a, b) => a.purchaseNumber - b.purchaseNumber);
  const next = sorted.find(m => m.purchaseNumber > purchaseCount);

  return (
    <div className="bg-coffee-50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-coffee-500" />
        <span className="text-sm font-body font-semibold text-coffee-700">Próximo hito</span>
      </div>
      {next ? (
        <>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{next.icon}</span>
            <div>
              <div className="font-display font-semibold text-coffee-900 text-sm">{next.reward}</div>
              <div className="text-xs text-coffee-500 font-body">{next.description}</div>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-coffee-500 mb-1 font-body">
              <span>{purchaseCount} visitas</span>
              <span>{next.purchaseNumber} visitas</span>
            </div>
            <div className="w-full bg-coffee-200 rounded-full h-1.5">
              <div
                className="bg-coffee-500 rounded-full h-1.5 transition-all duration-700"
                style={{ width: `${Math.min(100, (purchaseCount / next.purchaseNumber) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-coffee-500 mt-1 font-body text-center">
              Faltan {next.purchaseNumber - purchaseCount} visitas
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 text-coffee-600">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm font-body font-medium">¡Todos los hitos completados! 🎉</span>
        </div>
      )}
    </div>
  );
};

// ─── Stamp Card ───────────────────────────────────────────────────────────────
interface StampCardProps {
  label: string;
  icon: string;
  total: number;
  filled: number;
  reward: string;
}

const StampCard: React.FC<StampCardProps> = ({ label, icon, total, filled, reward }) => (
  <div className="bg-gradient-to-br from-coffee-50 to-cream-light rounded-2xl p-4 border border-coffee-100">
    <div className="flex items-center justify-between mb-3">
      <span className="font-display font-semibold text-coffee-800 text-sm">{label}</span>
      <span className="text-xs font-body text-coffee-500 bg-white px-2 py-0.5 rounded-full border border-coffee-100">
        {reward}
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all duration-300',
            i < filled
              ? 'bg-coffee-500 shadow-coffee'
              : 'bg-white border-2 border-dashed border-coffee-200',
          )}
        >
          {i < filled ? icon : ''}
        </div>
      ))}
    </div>
    <div className="mt-2 text-xs font-body text-coffee-500">{filled}/{total} completados</div>
  </div>
);

// ─── Adjust Points Modal ──────────────────────────────────────────────────────
interface AdjustModalProps {
  customerName: string;
  currentPoints: number;
  onConfirm: (delta: number, reason: string) => void;
  onClose: () => void;
}

const AdjustModal: React.FC<AdjustModalProps> = ({ customerName, currentPoints, onConfirm, onClose }) => {
  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    const pts = parseInt(amount, 10);
    if (!pts || pts <= 0 || !reason.trim()) return;
    onConfirm(mode === 'add' ? pts : -pts, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">Ajustar Puntos</h3>
        <p className="text-sm font-body text-coffee-500 mb-5">{customerName} · {currentPoints} pts actuales</p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('add')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-medium transition-all',
              mode === 'add'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-green-50 text-green-600 hover:bg-green-100',
            )}
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
          <button
            onClick={() => setMode('subtract')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-medium transition-all',
              mode === 'subtract'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-red-50 text-red-600 hover:bg-red-100',
            )}
          >
            <Minus className="w-4 h-4" /> Quitar
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <input
            type="number"
            placeholder="Cantidad de puntos"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
          />
          <input
            type="text"
            placeholder="Motivo del ajuste"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!amount || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

interface PermanentPromotionModalProps {
  promo: PermanentPromotion | null;
  onSave: (promo: PermanentPromotion) => void;
  onClose: () => void;
}

const PermanentPromotionModal: React.FC<PermanentPromotionModalProps> = ({ promo, onSave, onClose }) => {
  const [name, setName] = useState(promo?.name ?? '');
  const [description, setDescription] = useState(promo?.description ?? '');
  const [conditionType, setConditionType] = useState<ConditionType>(promo?.conditionType ?? 'n_purchases');
  const [conditionValue, setConditionValue] = useState(promo?.conditionValue ?? 1);
  const [rewardType, setRewardType] = useState<RewardType>(promo?.rewardType ?? 'extra_points');
  const [rewardValue, setRewardValue] = useState(promo?.rewardValue ?? 1);
  const [isActive, setIsActive] = useState(promo?.isActive ?? true);

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;
    onSave({
      id: promo?.id ?? '',
      name: name.trim(),
      description: description.trim(),
      conditionType,
      conditionValue,
      rewardType,
      rewardValue,
      isActive,
      createdAt: promo?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const CONDITION_OPTIONS: { value: ConditionType; label: string }[] = [
    { value: 'n_purchases', label: 'N compras' },
    { value: 'min_amount', label: 'Monto mínimo' },
    { value: 'referral', label: 'Referidos' },
    { value: 'combo_specific', label: 'Combo específico' },
  ];

  const REWARD_OPTIONS: { value: RewardType; label: string }[] = [
    { value: 'extra_points', label: 'Puntos extra' },
    { value: 'free_product', label: 'Producto gratis' },
    { value: 'discount', label: 'Descuento (%)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-display font-bold text-xl text-coffee-900 mb-1">
          {promo ? 'Editar' : 'Nueva'} Promoción Permanente
        </h3>
        <p className="text-sm font-body text-coffee-500 mb-5">
          Configura la condición y recompensa de la promoción
        </p>

        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Nombre</label>
            <input
              type="text"
              placeholder="Ej: Café de Regalo"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300"
            />
          </div>

          <div>
            <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Descripción</label>
            <textarea
              placeholder="Ej: Compra 10 cafés y recibe 1 gratis"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400 placeholder-coffee-300 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Tipo de condición</label>
              <select
                value={conditionType}
                onChange={e => setConditionType(e.target.value as ConditionType)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                {CONDITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Valor de condición</label>
              <input
                type="number"
                min={1}
                value={conditionValue}
                onChange={e => setConditionValue(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Tipo de recompensa</label>
              <select
                value={rewardType}
                onChange={e => setRewardType(e.target.value as RewardType)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              >
                {REWARD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-body font-medium text-coffee-600 mb-1">Valor de recompensa</label>
              <input
                type="number"
                min={1}
                value={rewardValue}
                onChange={e => setRewardValue(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 text-coffee-900 text-sm font-body focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-coffee-700">Activo / Inactivo</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                isActive ? 'bg-green-400' : 'bg-gray-200',
              )}
            >
              <span className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                isActive ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-coffee-200 text-coffee-600 text-sm font-body font-medium hover:bg-coffee-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !description.trim()}
            className="flex-1 py-2.5 rounded-xl bg-coffee-500 text-white text-sm font-body font-medium hover:bg-coffee-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {promo ? 'Guardar Cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const FidelizacionPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<LoyaltyProfile[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [milestones, setMilestones] = useState<MilestoneReward[]>([]);
  const [vouchers, setVouchers] = useState<MilestoneVoucher[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [permanentPromotions, setPermanentPromotions] = useState<PermanentPromotion[]>([]);
  const [activePromoMonth, setActivePromoMonth] = useState<number>(new Date().getMonth() + 1);
  const [_loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('recompensas');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PermanentPromotion | null>(null);

  // Load mock data
  useEffect(() => {
    setCustomers(MOCK_CUSTOMERS);
    setProfiles(MOCK_PROFILES);
    setTransactions(MOCK_TRANSACTIONS);
    setRewards(MOCK_REWARDS);
    setMissions(MOCK_MISSIONS);
    setMilestones(MOCK_MILESTONES);
    setVouchers(MOCK_VOUCHERS);
    setPromotions(MOCK_PROMOTIONS);
    setPermanentPromotions(MOCK_PERMANENT_PROMOTIONS);
    setLoading(false);
  }, []);

  const getProfile = useCallback((customerId: string): LoyaltyProfile | undefined => {
    return profiles.find((p: LoyaltyProfile) => p.customerId === customerId);
  }, [profiles]);

  const getOrCreateProfile = useCallback((customerId: string): LoyaltyProfile => {
    const profile = getProfile(customerId);
    if (profile) return profile;

    // Return a default profile structure if not found
    const newProfile: LoyaltyProfile = {
      id: '',
      customerId,
      points: 0,
      lifetimePoints: 0,
      purchaseCount: 0,
      level: 'bronce',
      referralCode: '',
      referralCount: 0,
      consecutiveDays: 0,
      uniqueProductsBought: [],
      completedMissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newProfile;
  }, [getProfile]);

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

  const redeemPoints = useCallback((_customerId: string, rewardId: string): boolean => {
    const profile = getProfile(_customerId);
    const reward = rewards.find((r: Reward) => r.id === rewardId);
    if (!profile || !reward || profile.points < reward.pointsCost) return false;
    setProfiles(prev => prev.map((p: LoyaltyProfile) =>
      p.customerId === _customerId ? { ...p, points: p.points - reward.pointsCost } : p
    ));
    const tx: LoyaltyTransaction = {
      id: `tx-${Date.now()}`, customerId: _customerId, points: -reward.pointsCost,
      type: 'redeemed', description: `Canje: ${reward.name}`, date: new Date().toISOString(),
      createdAt: new Date(), updatedAt: new Date(),
    };
    setTransactions(prev => [tx, ...prev]);
    return true;
  }, [getProfile, rewards]);

  const addTransaction = useCallback((_customerId: string, _saleId: string | undefined, points: number, type: LoyaltyTransaction['type'], description: string) => {
    const tx: LoyaltyTransaction = {
      id: `tx-${Date.now()}`, customerId: _customerId, saleId: _saleId,
      points, type, description, date: new Date().toISOString(),
      createdAt: new Date(), updatedAt: new Date(),
    };
    setTransactions(prev => [tx, ...prev]);
    if (points !== 0) {
      setProfiles(prev => prev.map((p: LoyaltyProfile) =>
        p.customerId === _customerId
          ? { ...p, points: p.points + points, lifetimePoints: points > 0 ? p.lifetimePoints + points : p.lifetimePoints }
          : p
      ));
    }
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const activeCustomers = useMemo(
    () => customers.filter(c => c.estado),
    [customers],
  );

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return activeCustomers;
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

  const selectedProfile = useMemo(
    () => selectedCustomerId ? getProfile(selectedCustomerId) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCustomerId, profiles],
  );

  const levelInfo = useMemo(
    () => selectedProfile ? getLevelInfo(selectedProfile.lifetimePoints) : null,
    [selectedProfile, getLevelInfo],
  );

  const customerTransactions = useMemo(
    () => selectedCustomerId
      ? transactions
          .filter(t => t.customerId === selectedCustomerId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [],
     
    [selectedCustomerId, transactions],
  );

  // ── Global stats ────────────────────────────────────────────────────────────
  const statsCustomersWithPoints = profiles.filter(p => p.points > 0).length;
  const statsCirculatingPoints = profiles.reduce((s, p) => s + p.points, 0);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const statsRedeemedThisWeek = transactions.filter(
    t => t.type === 'redeemed' && new Date(t.date) >= weekAgo,
  ).length;

  // ── Current month ────────────────────────────────────────────────────────────
  const currentMonth = new Date().getMonth() + 1;

  const dailyRewards = useMemo(() => rewards.filter(r => r.category === 'diario'), [rewards]);
  const grandPrize = useMemo(() => rewards.filter(r => r.category === 'premio_mayor'), [rewards]);

  // ── Stamp card progress (mock based on purchase count) ───────────────────────
  const cafeStamps = selectedProfile
    ? selectedProfile.purchaseCount % 10
    : 0;
  const postreStamps = selectedProfile
    ? selectedProfile.purchaseCount % 5
    : 0;

  // ── Vouchers del cliente seleccionado ────────────────────────────────────────
  const customerVouchers = useMemo(
    () => selectedCustomerId
      ? vouchers.filter(v => v.customerId === selectedCustomerId)
      : [],
    [selectedCustomerId, vouchers],
  );

  const pendingVouchers = useMemo(
    () => customerVouchers.filter(v => !v.isRedeemed),
    [customerVouchers],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    getOrCreateProfile(id);
    setSearch('');
  };

  const handleRedeem = (rewardId: string) => {
    if (!selectedCustomerId || !selectedProfile) return;
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;
    const ok = redeemPoints(selectedCustomerId, rewardId);
    if (ok) {
      toast.success('¡Recompensa canjeada!', `${reward.name} canjeado exitosamente.`);
    } else {
      toast.error('Puntos insuficientes', `Necesitas ${reward.pointsCost} pts.`);
    }
  };

  const handleTogglePromo = (promoId: string) => {
    setPromotions(prev => prev.map(p =>
      p.id === promoId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const handleTogglePermanentPromo = (promoId: string) => {
    setPermanentPromotions(prev => prev.map(p =>
      p.id === promoId ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const handleOpenPromoModal = (promo?: PermanentPromotion) => {
    setEditingPromo(promo ?? null);
    setShowPromoModal(true);
  };

  const handleSavePromo = (promo: PermanentPromotion) => {
    if (editingPromo) {
      setPermanentPromotions(prev => prev.map(p => p.id === promo.id ? promo : p));
      toast.success('Promoción actualizada', promo.name);
    } else {
      setPermanentPromotions(prev => [...prev, { ...promo, id: `perm-${Date.now()}` }]);
      toast.success('Promoción creada', promo.name);
    }
    setShowPromoModal(false);
    setEditingPromo(null);
  };

  const promoMonths = useMemo(() => {
    const months = [...new Set(promotions.map(p => p.month))].sort((a, b) => a - b);
    // Reorder starting from current month
    const idx = months.indexOf(currentMonth);
    if (idx === -1) return months;
    return [...months.slice(idx), ...months.slice(0, idx)];
  }, [promotions, currentMonth]);

  const visiblePromos = useMemo(
    () => promotions.filter(p => p.month === activePromoMonth),
    [promotions, activePromoMonth],
  );

  const handleRedeemVoucher = (voucherId: string) => {
    setVouchers(prev => prev.map(v =>
      v.id === voucherId
        ? { ...v, isRedeemed: true, redeemedAt: new Date().toISOString() }
        : v
    ));
    const v = vouchers.find(x => x.id === voucherId);
    if (v) toast.success('¡Beneficio canjeado!', `${v.reward} registrado. Entregar al cliente.`);
  };

  const handleAdjust = (delta: number, reason: string) => {
    if (!selectedCustomerId) return;
    addTransaction(selectedCustomerId, undefined, delta, 'manual', reason);
    toast.success(
      delta > 0 ? `+${delta} puntos agregados` : `${delta} puntos removidos`,
      reason,
    );
    setShowAdjustModal(false);
  };

  // ── Tabs config ───────────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'recompensas', label: 'Recompensas Diarias', icon: <Gift className="w-4 h-4" /> },
    { id: 'promos', label: 'Promos del Mes', icon: <Calendar className="w-4 h-4" /> },
    { id: 'promos_permanentes', label: 'Promos Permanentes', icon: <Zap className="w-4 h-4" /> },
    { id: 'misiones', label: 'Misiones Yana', icon: <Target className="w-4 h-4" /> },
    { id: 'historial', label: 'Historial', icon: <Clock className="w-4 h-4" /> },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  // ── Transaction type labels/icons ─────────────────────────────────────────────
  const txConfig = (type: string) => {
    switch (type) {
      case 'earned': return { icon: <ArrowUpCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50', label: 'Ganado' };
      case 'redeemed': return { icon: <ArrowDownCircle className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-50', label: 'Canjeado' };
      case 'referral': return { icon: <Users className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Referido' };
      case 'mission': return { icon: <Trophy className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Misión' };
      case 'birthday': return { icon: <Cake className="w-4 h-4" />, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Cumpleaños' };
      default: return { icon: <Zap className="w-4 h-4" />, color: 'text-coffee-500', bg: 'bg-coffee-50', label: 'Ajuste' };
    }
  };

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
              <span className="font-accent text-cream-light text-lg">Café Yana</span>
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
              label="Canjes esta semana"
              value={statsRedeemedThisWeek}
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
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-coffee-400" />
              <h2 className="font-display font-semibold text-coffee-900">Buscar Cliente</h2>
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
                {filteredCustomers.map((c: Customer) => {
                  const cProf = getProfile(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-coffee-50 transition-colors text-left"
                    >
                      <div>
                        <div className="text-sm font-body font-medium text-coffee-800">{c.nombre}</div>
                        <div className="text-xs text-coffee-400 font-body">{c.celular}</div>
                      </div>
                      {cProf && (
                        <span className={clsx(
                          'text-xs font-body font-semibold px-2 py-0.5 rounded-full',
                          LEVEL_CONFIG[cProf.level].badge,
                        )}>
                          {cProf.points} pts
                        </span>
                      )}
                    </button>
                  );
                })}
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
                onViewHistory={() => setActiveTab('historial')}
                onAdjustPoints={() => setShowAdjustModal(true)}
              />

              {/* Beneficios por hito disponibles */}
              {pendingVouchers.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-coffee overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-white" />
                      <span className="font-display font-bold text-white text-sm">Beneficios por Hito</span>
                    </div>
                    <span className="bg-white/30 text-white text-xs font-body font-bold px-2 py-0.5 rounded-full">
                      {pendingVouchers.length} pendiente{pendingVouchers.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    {pendingVouchers.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <span className="text-2xl">{v.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold text-coffee-900 text-sm">{v.reward}</div>
                          <div className="text-xs font-body text-coffee-500">Hito #{v.milestoneNumber} — Gratis</div>
                        </div>
                        <button
                          onClick={() => handleRedeemVoucher(v.id)}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-body font-bold hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          Canjear
                        </button>
                      </div>
                    ))}
                    <p className="text-xs font-body text-coffee-400 text-center pt-1">
                      Independiente de puntos · Solo cuenta visitas
                    </p>
                  </div>
                </div>
              )}

              {/* Milestone tracker */}
              <MilestoneTracker
                purchaseCount={selectedProfile.purchaseCount}
                milestones={milestones}
              />

              {/* Stamp cards */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-coffee-800 text-sm flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-coffee-500" />
                  Tarjetas de Sello
                </h3>
                <StampCard
                  label="Cafés"
                  icon="☕"
                  total={10}
                  filled={cafeStamps}
                  reward="Café gratis al 10"
                />
                <StampCard
                  label="Postres"
                  icon="🍰"
                  total={5}
                  filled={postreStamps}
                  reward="Postre gratis al 5"
                />
              </div>
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

          {/* ── TAB: Recompensas Diarias ─────────────────────────────────────── */}
          {activeTab === 'recompensas' && (
            <div className="space-y-4">
              {/* Grand Prize spotlight */}
              {grandPrize.map(r => (
                <div
                  key={r.id}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 p-5 shadow-lg"
                >
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/20 rounded-full pointer-events-none" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{r.icon}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="bg-white/30 text-white text-xs font-body font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Premio Mayor
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-white text-lg">{r.name}</h3>
                        <p className="text-yellow-100 text-xs font-body">{r.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-display font-black text-white">{r.pointsCost}</div>
                      <div className="text-yellow-100 text-xs font-body">puntos</div>
                      <button
                        onClick={() => handleRedeem(r.id)}
                        disabled={!selectedProfile || (selectedProfile?.points ?? 0) < r.pointsCost}
                        className="mt-2 px-4 py-1.5 rounded-xl bg-white text-amber-600 text-sm font-body font-bold hover:bg-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Canjear
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Daily rewards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dailyRewards.map(reward => {
                  const canRedeem = selectedProfile && selectedProfile.points >= reward.pointsCost;
                  const hasCustomer = !!selectedCustomer;
                  return (
                    <div
                      key={reward.id}
                      className={clsx(
                        'relative bg-white rounded-2xl border p-4 flex flex-col gap-2 transition-all duration-200',
                        hasCustomer
                          ? canRedeem
                            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                            : 'border-coffee-100 opacity-70'
                          : 'border-coffee-100',
                      )}
                    >
                      {canRedeem && hasCustomer && (
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-green-400" />
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none">{reward.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-body font-semibold text-coffee-900 text-sm leading-tight">{reward.name}</h4>
                          <p className="text-coffee-400 text-xs font-body mt-0.5 leading-snug">{reward.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
                          <span className="text-sm font-display font-bold text-coffee-700">{reward.pointsCost} pts</span>
                        </div>
                        <button
                          onClick={() => handleRedeem(reward.id)}
                          disabled={!hasCustomer || !canRedeem}
                          className={clsx(
                            'px-3 py-1 rounded-lg text-xs font-body font-semibold transition-all',
                            canRedeem && hasCustomer
                              ? 'bg-coffee-500 text-white hover:bg-coffee-600 shadow-coffee'
                              : 'bg-coffee-100 text-coffee-300 cursor-not-allowed',
                          )}
                        >
                          Canjear
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!selectedCustomer && (
                <div className="text-center py-4 text-sm font-body text-coffee-400 bg-coffee-50 rounded-xl">
                  Selecciona un cliente para habilitar los canjes
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Promos del Mes ──────────────────────────────────────────── */}
          {activeTab === 'promos' && (
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-coffee-900 text-base">Administrar Promociones</h3>
                  <p className="text-xs font-body text-coffee-400 mt-0.5">Activa o desactiva promos por mes. Los cambios aplican inmediatamente en el POS.</p>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coffee-500 text-white text-sm font-body font-semibold hover:bg-coffee-600 transition-colors shadow-coffee">
                  <Plus className="w-4 h-4" />
                  Nueva Promo
                </button>
              </div>

              {/* Month tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {promoMonths.map(month => {
                  const isSelected = month === activePromoMonth;
                  const isCurrent = month === currentMonth;
                  const activeCount = promotions.filter(p => p.month === month && p.isActive).length;
                  const total = promotions.filter(p => p.month === month).length;
                  return (
                    <button
                      key={month}
                      onClick={() => setActivePromoMonth(month)}
                      className={clsx(
                        'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
                        isSelected
                          ? 'bg-coffee-500 text-white border-coffee-500 shadow-md'
                          : 'bg-white text-coffee-600 border-coffee-100 hover:border-coffee-300 hover:bg-coffee-50',
                      )}
                    >
                      <span>{MONTH_ICONS[month] ?? '📅'}</span>
                      <span>{MONTH_NAMES[month]}</span>
                      {isCurrent && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}
                      <span className={clsx(
                        'text-xs font-bold px-1.5 py-0.5 rounded-full',
                        isSelected
                          ? 'bg-white/20 text-white'
                          : activeCount > 0 ? 'bg-green-100 text-green-700' : 'bg-coffee-100 text-coffee-400',
                      )}>
                        {activeCount}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Promo cards for selected month */}
              <div className="space-y-3">
                {visiblePromos.map(promo => {
                  const isCanjeType = promo.type === 'canje_puntos';
                  const canCustomerRedeem = selectedProfile && isCanjeType && promo.pointsCost != null && selectedProfile.points >= promo.pointsCost;

                  return (
                    <div
                      key={promo.id}
                      className={clsx(
                        'bg-white rounded-2xl border transition-all duration-200',
                        promo.isActive ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100 opacity-70',
                      )}
                    >
                      <div className="p-4 flex items-start gap-4">
                        {/* Icon */}
                        <div className={clsx(
                          'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                          promo.isActive ? 'bg-coffee-100' : 'bg-gray-100',
                        )}>
                          {promo.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap mb-1">
                            <span className="font-display font-bold text-coffee-900">{promo.name}</span>
                            {/* Type badge */}
                            {isCanjeType ? (
                              <span className="flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                <Star className="w-3 h-3" />
                                Canje · {promo.pointsCost} pts
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                <Zap className="w-3 h-3" />
                                x{promo.multiplier} en {promo.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-body text-coffee-500 mb-2">{promo.description}</p>

                          {/* Date range */}
                          <div className="flex items-center gap-1.5 text-xs font-body text-coffee-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(promo.startDate).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                              {' — '}
                              {new Date(promo.endDate).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>

                        {/* Right: toggle + canjear */}
                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                          {/* Toggle */}
                          <button
                            onClick={() => handleTogglePromo(promo.id)}
                            className={clsx(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                              promo.isActive ? 'bg-green-400' : 'bg-gray-200',
                            )}
                            title={promo.isActive ? 'Desactivar' : 'Activar'}
                          >
                            <span className={clsx(
                              'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                              promo.isActive ? 'translate-x-6' : 'translate-x-1',
                            )} />
                          </button>
                          <span className={clsx(
                            'text-xs font-body font-bold',
                            promo.isActive ? 'text-green-600' : 'text-gray-400',
                          )}>
                            {promo.isActive ? 'Activa' : 'Inactiva'}
                          </span>

                          {/* Canjear button (only for canje_puntos when customer selected) */}
                          {isCanjeType && selectedCustomer && (
                            <button
                              onClick={() => handleRedeem(promo.id)}
                              disabled={!promo.isActive || !canCustomerRedeem}
                              className={clsx(
                                'px-3 py-1.5 rounded-xl text-xs font-body font-semibold transition-all',
                                promo.isActive && canCustomerRedeem
                                  ? 'bg-coffee-500 text-white hover:bg-coffee-600'
                                  : 'bg-coffee-100 text-coffee-300 cursor-not-allowed',
                              )}
                            >
                              Canjear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {visiblePromos.length === 0 && (
                  <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
                    <Calendar className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
                    <p className="text-sm font-body text-coffee-400">Sin promociones para {MONTH_NAMES[activePromoMonth]}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Promos Permanentes ───────────────────────────────────────── */}
          {activeTab === 'promos_permanentes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-coffee-900 text-base">Promociones Permanentes</h3>
                  <p className="text-xs font-body text-coffee-400 mt-0.5">Aceleradores de comportamiento. Siempre activos (puedes desactivarlos).</p>
                </div>
                <button
                  onClick={() => handleOpenPromoModal()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coffee-500 text-white text-sm font-body font-semibold hover:bg-coffee-600 transition-colors shadow-coffee"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Promo
                </button>
              </div>

              <div className="space-y-3">
                {permanentPromotions.map(promo => {
                  const conditionLabels: Record<ConditionType, string> = {
                    n_purchases: `Compra ${promo.conditionValue} veces`,
                    min_amount: `Monto mínimo Bs. ${promo.conditionValue}`,
                    referral: `${promo.conditionValue} referido(s)`,
                    combo_specific: `Combo específico`,
                  };
                  const rewardLabels: Record<RewardType, string> = {
                    free_product: `${promo.rewardValue} producto(s) gratis`,
                    extra_points: `${promo.rewardValue} pts extra`,
                    discount: `${promo.rewardValue}% descuento`,
                  };

                  return (
                    <div
                      key={promo.id}
                      className={clsx(
                        'bg-white rounded-2xl border transition-all duration-200',
                        promo.isActive ? 'border-coffee-200 shadow-coffee' : 'border-coffee-100 opacity-70',
                      )}
                    >
                      <div className="p-4 flex items-start gap-4">
                        <div className={clsx(
                          'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0',
                          promo.isActive ? 'bg-coffee-100' : 'bg-gray-100',
                        )}>
                          {promo.conditionType === 'n_purchases' ? '☕' :
                           promo.conditionType === 'referral' ? '👥' :
                           promo.conditionType === 'min_amount' ? '💰' : '🎯'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap mb-1">
                            <span className="font-display font-bold text-coffee-900">{promo.name}</span>
                            <span className={clsx(
                              'flex items-center gap-1 text-xs font-body font-bold px-2 py-0.5 rounded-full',
                              promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                            )}>
                              {promo.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <p className="text-xs font-body text-coffee-500 mb-2">{promo.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs font-body">
                            <span className="flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-coffee-400" />
                              <span className="text-coffee-600 font-medium">Condición:</span>
                              <span className="text-coffee-500">{conditionLabels[promo.conditionType]}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Gift className="w-3.5 h-3.5 text-coffee-400" />
                              <span className="text-coffee-600 font-medium">Recompensa:</span>
                              <span className="text-coffee-500">{rewardLabels[promo.rewardType]}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3 flex-shrink-0">
                          <button
                            onClick={() => handleTogglePermanentPromo(promo.id)}
                            className={clsx(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none',
                              promo.isActive ? 'bg-green-400' : 'bg-gray-200',
                            )}
                          >
                            <span className={clsx(
                              'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                              promo.isActive ? 'translate-x-6' : 'translate-x-1',
                            )} />
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenPromoModal(promo)}
                              className="p-1.5 rounded-lg bg-coffee-50 text-coffee-600 hover:bg-coffee-100 transition-colors"
                              title="Editar"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {permanentPromotions.length === 0 && (
                  <div className="text-center py-10 bg-coffee-50 rounded-2xl border border-dashed border-coffee-200">
                    <Zap className="w-8 h-8 text-coffee-200 mx-auto mb-2" />
                    <p className="text-sm font-body text-coffee-400">Sin promociones permanentes aún</p>
                    <button
                      onClick={() => handleOpenPromoModal()}
                      className="mt-3 text-sm font-body font-semibold text-coffee-600 hover:text-coffee-700"
                    >
                      Crear la primera
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Misiones Yana ───────────────────────────────────────────── */}
          {activeTab === 'misiones' && (
            <div className="space-y-5">
              {/* Missions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {missions.map((mission: Mission) => {
                  const isCompleted = selectedProfile?.completedMissions.includes(mission.id) ?? false;
                  let progress = 0;
                  if (selectedProfile) {
                    switch (mission.type) {
                      case 'consecutive_days': progress = Math.min(1, selectedProfile.consecutiveDays / mission.requirement); break;
                      case 'unique_products': progress = Math.min(1, selectedProfile.uniqueProductsBought.length / mission.requirement); break;
                      case 'referral': progress = Math.min(1, selectedProfile.referralCount / mission.requirement); break;
                      default: progress = isCompleted ? 1 : 0;
                    }
                  }

                  return (
                    <div
                      key={mission.id}
                      className={clsx(
                        'relative rounded-2xl border p-4 transition-all',
                        isCompleted
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                          : 'bg-white border-coffee-100 hover:border-coffee-200 hover:shadow-coffee',
                      )}
                    >
                      {isCompleted && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={clsx(
                          'w-10 h-10 rounded-2xl flex items-center justify-center text-xl',
                          isCompleted ? 'bg-green-100' : 'bg-coffee-100',
                        )}>
                          {mission.icon}
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-coffee-900">{mission.name}</h4>
                          <p className="text-xs font-body text-coffee-500 mt-0.5">{mission.description}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {!isCompleted && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs font-body text-coffee-400 mb-1">
                            <span>Progreso</span>
                            <span>{Math.round(progress * 100)}%</span>
                          </div>
                          <div className="w-full bg-coffee-100 rounded-full h-1.5">
                            <div
                              className="bg-coffee-500 rounded-full h-1.5 transition-all duration-700"
                              style={{ width: `${Math.max(2, progress * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-sm font-body font-bold text-coffee-700">+{mission.bonusPoints} pts</span>
                        </div>
                        {isCompleted ? (
                          <span className="text-xs font-body font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            Completada ✓
                          </span>
                        ) : (
                          <span className="text-xs font-body text-coffee-400">
                            {mission.requirement === 1 ? '1 vez' : `${mission.requirement} veces`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mechanics info cards */}
              <div>
                <h3 className="font-display font-semibold text-coffee-800 text-base mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Mecánicas de Puntos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { icon: <TrendingUp className="w-4 h-4 text-coffee-400" />, title: 'Base', desc: 'Bs.10 = 1 punto en cada compra', color: 'from-coffee-50 to-cream-light border-coffee-100' },
                    { icon: <Cake className="w-4 h-4 text-pink-400" />, title: 'Cumpleaños', desc: 'El día de tu cumpleaños · ¡Puntos x3!', color: 'from-pink-50 to-rose-50 border-pink-100' },
                    { icon: <ShoppingBag className="w-4 h-4 text-green-400" />, title: 'Compra Grande', desc: 'Compra > Bs.100 · ¡Puntos dobles!', color: 'from-green-50 to-emerald-50 border-green-100' },
                    { icon: <Gift className="w-4 h-4 text-purple-400" />, title: 'Combo Bonus', desc: 'Al pedir combo · +3 pts extra', color: 'from-purple-50 to-violet-50 border-purple-100' },
                    { icon: <Clock className="w-4 h-4 text-orange-400" />, title: 'Happy Hour', desc: '9am – 3pm · +2 pts bonus en cada compra', color: 'from-orange-50 to-amber-50 border-orange-100' },
                    { icon: <Calendar className="w-4 h-4 text-blue-400" />, title: 'Días Doble', desc: 'Lunes y Martes · ¡Puntos dobles todo el día!', color: 'from-blue-50 to-indigo-50 border-blue-100' },
                  ].map(item => (
                    <div key={item.title} className={clsx('rounded-xl border p-3 bg-gradient-to-br', item.color)}>
                      <div className="flex items-center gap-2 mb-1">
                        {item.icon}
                        <span className="font-body font-semibold text-coffee-800 text-sm">{item.title}</span>
                      </div>
                      <p className="text-xs font-body text-coffee-500 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Configuración (Fase 1) ─────────────────────────────────── */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Fase badge */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-coffee-500 text-white px-4 py-1.5 rounded-full text-sm font-body font-bold shadow-coffee">
                  <CheckCircle className="w-4 h-4" />
                  Fase 1 — La Base
                </div>
                <span className="text-xs font-body text-coffee-400">Reglas activas del programa</span>
              </div>

              {/* Regla de acumulación */}
              <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
                <div className="px-5 py-3 border-b border-coffee-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-coffee-500" />
                    <h3 className="font-display font-semibold text-coffee-900">Regla de Acumulación</h3>
                  </div>
                  <span className="text-xs font-body bg-green-100 text-green-700 font-bold px-2.5 py-0.5 rounded-full">Activa</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-4 p-4 bg-coffee-50 rounded-xl border border-coffee-100">
                    <div className="w-14 h-14 rounded-2xl bg-coffee-500 flex items-center justify-center text-white text-2xl font-display font-black shadow-coffee">
                      10
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-bold text-coffee-900 text-lg">Bs. 10 = 1 punto</div>
                      <div className="text-sm font-body text-coffee-500 mt-0.5">
                        Por cada 10 bolivianos gastados, el cliente acumula 1 punto en su tarjeta Yana.
                      </div>
                    </div>
                    <div className="text-right text-xs font-body text-coffee-400">
                      <div>Ej: Bs.50 → <strong className="text-coffee-700">5 pts</strong></div>
                      <div>Ej: Bs.120 → <strong className="text-coffee-700">12 pts</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aceleradores */}
              <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
                <div className="px-5 py-3 border-b border-coffee-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <h3 className="font-display font-semibold text-coffee-900">Aceleradores de Puntos</h3>
                  </div>
                  <span className="text-xs font-body text-coffee-400">Se aplican automáticamente</span>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Cumpleaños */}
                  <div className="relative rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎂</span>
                      <div>
                        <div className="font-display font-bold text-coffee-900 text-sm">Cumpleaños</div>
                        <span className="text-xs font-body bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full">x3 puntos</span>
                      </div>
                    </div>
                    <p className="text-xs font-body text-coffee-500 leading-snug">
                      El día del cumpleaños del cliente, todos los puntos ganados se <strong>triplican</strong>.
                    </p>
                    <div className="mt-3 text-xs font-body text-pink-600">
                      Ej: compra Bs.100 → <strong>30 pts</strong> (en vez de 10)
                    </div>
                  </div>

                  {/* Compra grande */}
                  <div className="relative rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🛍️</span>
                      <div>
                        <div className="font-display font-bold text-coffee-900 text-sm">Compra {'>'}Bs.100</div>
                        <span className="text-xs font-body bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">x2 puntos</span>
                      </div>
                    </div>
                    <p className="text-xs font-body text-coffee-500 leading-snug">
                      Cuando el total de la compra supera los <strong>Bs.100</strong>, los puntos se <strong>duplican</strong>.
                    </p>
                    <div className="mt-3 text-xs font-body text-green-600">
                      Ej: compra Bs.120 → <strong>24 pts</strong> (en vez de 12)
                    </div>
                  </div>

                  {/* Combo */}
                  <div className="relative rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎯</span>
                      <div>
                        <div className="font-display font-bold text-coffee-900 text-sm">Pedir Combo</div>
                        <span className="text-xs font-body bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">+3 pts extra</span>
                      </div>
                    </div>
                    <p className="text-xs font-body text-coffee-500 leading-snug">
                      Cuando el pedido incluye un <strong>combo</strong>, se suman 3 puntos extra al total.
                    </p>
                    <div className="mt-3 text-xs font-body text-purple-600">
                      Se acumula con otros aceleradores
                    </div>
                  </div>
                </div>
              </div>

              {/* Regalos diarios del POS */}
              <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
                <div className="px-5 py-3 border-b border-coffee-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-coffee-500" />
                    <h3 className="font-display font-semibold text-coffee-900">Regalos Diarios del POS</h3>
                  </div>
                  <span className="text-xs font-body text-coffee-400">Canjeables en caja con puntos</span>
                </div>
                <div className="p-5">
                  <p className="text-sm font-body text-coffee-500 mb-4">
                    Los clientes pueden canjear sus puntos por estos productos directamente en caja. El cajero valida el canje en el POS.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {MOCK_REWARDS.filter(r => r.category === 'diario').map(r => (
                      <div key={r.id} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-coffee-50 border border-coffee-100 text-center">
                        <span className="text-3xl">{r.icon}</span>
                        <span className="text-xs font-body font-semibold text-coffee-800 leading-tight">{r.name.replace(' Gratis', '')}</span>
                        <span className="text-xs font-display font-bold text-coffee-500">{r.pointsCost} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resumen visual de la lógica */}
              <div className="bg-gradient-to-br from-coffee-800 to-coffee-600 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="font-display font-bold">¿Cómo se calculan los puntos?</span>
                </div>
                <div className="space-y-2 text-sm font-body">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-300 font-bold mt-0.5">1.</span>
                    <span className="text-white/80">Se calcula la <strong className="text-white">base</strong>: total ÷ 10 = puntos base</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-300 font-bold mt-0.5">2.</span>
                    <span className="text-white/80">Si es <strong className="text-white">cumpleaños</strong>: puntos base × 3</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-300 font-bold mt-0.5">3.</span>
                    <span className="text-white/80">Si compra <strong className="text-white">&gt; Bs.100</strong>: puntos × 2</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-300 font-bold mt-0.5">4.</span>
                    <span className="text-white/80">Si incluye <strong className="text-white">combo</strong>: +3 puntos extra al final</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/20 text-white/60 text-xs">
                    Ejemplo: cumpleaños + Bs.120 + combo = (12 × 3 × 2) + 3 = <strong className="text-yellow-300">75 puntos</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Historial ───────────────────────────────────────────────── */}
          {activeTab === 'historial' && (
            <div>
              {!selectedCustomer ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <Clock className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-400">Selecciona un cliente para ver su historial</p>
                </div>
              ) : customerTransactions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-coffee-100">
                  <RotateCcw className="w-10 h-10 text-coffee-200 mx-auto mb-3" />
                  <p className="font-body text-coffee-500 font-medium">{selectedCustomer.nombre}</p>
                  <p className="font-body text-coffee-400 text-sm mt-1">Sin transacciones registradas todavía</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-coffee-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-coffee-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-coffee-900">{selectedCustomer.nombre}</h3>
                      <p className="text-xs font-body text-coffee-400">{customerTransactions.length} transacciones</p>
                    </div>
                    <span className={clsx(
                      'text-sm font-body font-bold px-3 py-1 rounded-full',
                      selectedProfile ? LEVEL_CONFIG[selectedProfile.level].badge : 'bg-coffee-100 text-coffee-700',
                    )}>
                      {selectedProfile?.points ?? 0} pts disponibles
                    </span>
                  </div>

                  <div className="divide-y divide-coffee-50 max-h-[480px] overflow-y-auto">
                    {customerTransactions.map((tx: LoyaltyTransaction, idx: number) => {
                      const cfg = txConfig(tx.type);
                      const isPositive = tx.points > 0;
                      return (
                        <div key={tx.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-coffee-50/40 transition-colors">
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center mt-1">
                            <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', cfg.bg, cfg.color)}>
                              {cfg.icon}
                            </div>
                            {idx < customerTransactions.length - 1 && (
                              <div className="w-px h-6 bg-coffee-100 mt-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-body font-medium text-coffee-800 leading-tight">
                                  {tx.description}
                                </p>
                                <p className="text-xs font-body text-coffee-400 mt-0.5">
                                  {formatDateTime(tx.date)}
                                </p>
                              </div>
                              <span className={clsx(
                                'text-base font-display font-black flex-shrink-0',
                                isPositive ? 'text-green-600' : 'text-red-500',
                              )}>
                                {isPositive ? '+' : ''}{tx.points}
                              </span>
                            </div>
                            <span className={clsx(
                              'inline-block mt-1 text-xs font-body px-1.5 py-0.5 rounded-md',
                              cfg.bg, cfg.color,
                            )}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MILESTONES SECTION (Full width)
      ═══════════════════════════════════════════ */}
      <div className="mt-6 bg-white rounded-3xl border border-coffee-100 shadow-coffee overflow-hidden">
        <div className="px-6 py-4 border-b border-coffee-50 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="font-display font-bold text-coffee-900 text-lg">Hitos por N° de Compra</h2>
              <span className="text-xs font-body bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Independiente de puntos</span>
            </div>
            <p className="text-xs font-body text-coffee-400 ml-7">
              Al completar la compra N, el beneficio se genera automáticamente y queda disponible para canjear en caja.
            </p>
          </div>
          {selectedProfile && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-body text-coffee-500">
                {selectedCustomer?.nombre} · <strong className="text-coffee-700">{selectedProfile.purchaseCount}</strong> visitas
              </span>
              {pendingVouchers.length > 0 && (
                <span className="text-xs font-body bg-amber-500 text-white font-bold px-2.5 py-1 rounded-full">
                  {pendingVouchers.length} beneficio{pendingVouchers.length > 1 ? 's' : ''} sin canjear
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-6 overflow-x-auto">
          <div className="flex items-start gap-2 min-w-max">
            {[...milestones]
              .sort((a: MilestoneReward, b: MilestoneReward) => a.purchaseNumber - b.purchaseNumber)
              .map((milestone: MilestoneReward, idx: number, arr: MilestoneReward[]) => {
                const reached = selectedProfile
                  ? selectedProfile.purchaseCount >= milestone.purchaseNumber
                  : false;
                const isNext = selectedProfile
                  ? selectedProfile.purchaseCount < milestone.purchaseNumber &&
                    (idx === 0 || selectedProfile.purchaseCount >= arr[idx - 1].purchaseNumber)
                  : false;

                return (
                  <React.Fragment key={milestone.purchaseNumber}>
                    {/* Connector line */}
                    {idx > 0 && (
                      <div className={clsx(
                        'flex-shrink-0 h-0.5 w-8 mt-6 self-start',
                        reached ? 'bg-coffee-400' : 'bg-coffee-100',
                      )} />
                    )}

                    <div className={clsx(
                      'flex flex-col items-center gap-1.5 w-28 text-center flex-shrink-0',
                    )}>
                      {/* Icon circle */}
                      <div className={clsx(
                        'w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border-2 transition-all duration-300',
                        reached
                          ? 'bg-coffee-500 border-coffee-400 shadow-coffee'
                          : isNext
                            ? 'bg-coffee-50 border-coffee-300 ring-2 ring-coffee-300 ring-offset-2 animate-pulse'
                            : 'bg-white border-coffee-100',
                      )}>
                        {reached ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : (
                          <span className={isNext ? '' : 'opacity-50'}>{milestone.icon}</span>
                        )}
                      </div>

                      {/* Purchase number badge */}
                      <span className={clsx(
                        'text-xs font-body font-bold px-2 py-0.5 rounded-full',
                        reached
                          ? 'bg-coffee-100 text-coffee-700'
                          : isNext
                            ? 'bg-coffee-500 text-white'
                            : 'bg-gray-100 text-gray-400',
                      )}>
                        #{milestone.purchaseNumber}
                      </span>

                      {/* Reward name */}
                      <p className={clsx(
                        'text-xs font-body leading-tight',
                        reached ? 'text-coffee-700 font-medium' : isNext ? 'text-coffee-600' : 'text-coffee-300',
                      )}>
                        {milestone.reward}
                      </p>

                      {isNext && (
                        <span className="text-xs font-accent text-coffee-500">¡Próximo!</span>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Adjust Points Modal ─────────────────────────────────────────────── */}
      {showAdjustModal && selectedCustomer && selectedProfile && (
        <AdjustModal
          customerName={selectedCustomer.nombre}
          currentPoints={selectedProfile.points}
          onConfirm={handleAdjust}
          onClose={() => setShowAdjustModal(false)}
        />
      )}

      {/* ── Promotion Modal ──────────────────────────────────────────────── */}
      {showPromoModal && (
        <PermanentPromotionModal
          promo={editingPromo}
          onSave={handleSavePromo}
          onClose={() => { setShowPromoModal(false); setEditingPromo(null); }}
        />
      )}
    </MainLayout>
  );
};
