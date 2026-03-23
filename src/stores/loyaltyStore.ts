import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  LoyaltyProfile, LoyaltyTransaction, Reward, Mission, MilestoneReward,
  LoyaltyLevel, LoyaltyStoreState,
} from '../types/loyalty';

// --- Static data ---

const REWARDS: Reward[] = [
  // DIARIO
  { id: 'r01', name: 'Café Americano Gratis', description: 'Un café americano para disfrutar', pointsCost: 5, category: 'diario', icon: '☕', isActive: true },
  { id: 'r02', name: 'Té Gratis', description: 'Una taza de té a tu elección', pointsCost: 3, category: 'diario', icon: '🍵', isActive: true },
  { id: 'r03', name: 'Galleta o Masita Gratis', description: 'Una galleta o masita para acompañar', pointsCost: 7, category: 'diario', icon: '🍪', isActive: true },
  { id: 'r04', name: 'Upgrade a Tamaño Grande', description: 'Sube el tamaño de cualquier bebida', pointsCost: 7, category: 'diario', icon: '⬆️', isActive: true },
  { id: 'r05', name: 'Jugo del Día Extra', description: 'Un jugo del día gratis', pointsCost: 5, category: 'diario', icon: '🥤', isActive: true },
  { id: 'r06', name: 'Empanada de Queso Gratis', description: 'Una empanada de queso recién hecha', pointsCost: 10, category: 'diario', icon: '🥐', isActive: true },
  { id: 'r07', name: 'Ice Tea Gratis', description: 'Un Ice Tea refrescante', pointsCost: 7, category: 'diario', icon: '🧊', isActive: true },
  { id: 'r08', name: 'Refill de Café Gratis', description: 'Un refill de tu café', pointsCost: 5, category: 'diario', icon: '♻️', isActive: true },
  { id: 'r09', name: 'Descuento Bs.5', description: 'Descuento de Bs.5 en tu próxima compra', pointsCost: 3, category: 'diario', icon: '💰', isActive: true },
  { id: 'r10', name: 'Combo Café + Masita Especial', description: 'Café + masita a precio especial', pointsCost: 5, category: 'diario', icon: '🎁', isActive: true },
  { id: 'r11', name: 'Café del Día Gratis', description: 'El café del día de la casa', pointsCost: 7, category: 'diario', icon: '🌟', isActive: true },
  { id: 'r12', name: 'Mini Brownie de Regalo', description: 'Un delicioso mini brownie', pointsCost: 8, category: 'diario', icon: '🍫', isActive: true },

  // TEMPORAL - May
  { id: 'r-may1', name: 'Torta para 20 personas', description: 'Torta especial para celebrar', pointsCost: 70, category: 'temporal', month: 5, monthName: 'Mayo', icon: '🎂', isActive: true, highlight: true },
  { id: 'r-may2', name: 'Desayuno Especial para Mamá', description: 'Desayuno gratis para mamá', pointsCost: 35, category: 'temporal', month: 5, monthName: 'Mayo', icon: '💐', isActive: true },
  { id: 'r-may3', name: 'Puntos Dobles Compras Familiares', description: 'Puntos dobles en compras mayores a Bs.50', pointsCost: 0, category: 'temporal', month: 5, monthName: 'Mayo', icon: '👨‍👩‍👧', isActive: true },

  // TEMPORAL - June
  { id: 'r-jun1', name: 'Café + Panini Gratis', description: 'Combo especial junio', pointsCost: 30, category: 'temporal', month: 6, monthName: 'Junio', icon: '🥪', isActive: true },
  { id: 'r-jun2', name: 'Sorteo Desayuno para 4', description: 'Participa en el sorteo', pointsCost: 50, category: 'temporal', month: 6, monthName: 'Junio', icon: '🎰', isActive: true },

  // TEMPORAL - July
  { id: 'r-jul1', name: 'Ice Coffee o Ice Tea Gratis', description: 'Una bebida fría de regalo', pointsCost: 10, category: 'temporal', month: 7, monthName: 'Julio', icon: '🧋', isActive: true },
  { id: 'r-jul2', name: 'Bebidas Frías 2x Puntos', description: 'Puntos dobles en Ice Coffee, Ice Tea y Jugos', pointsCost: 0, category: 'temporal', month: 7, monthName: 'Julio', icon: '❄️', isActive: true },
  { id: 'r-jul3', name: 'Promo "Trae un Amigo"', description: 'Puntos triples en combos si traes un amigo', pointsCost: 0, category: 'temporal', month: 7, monthName: 'Julio', icon: '👥', isActive: true },

  // TEMPORAL - September
  { id: 'r-sep1', name: 'Café + Empanada', description: 'Combo especial primavera', pointsCost: 5, category: 'temporal', month: 9, monthName: 'Septiembre', icon: '🌸', isActive: true },
  { id: 'r-sep2', name: 'Combo Parejas', description: 'Especial día del amor y la amistad', pointsCost: 30, category: 'temporal', month: 9, monthName: 'Septiembre', icon: '💑', isActive: true },

  // TEMPORAL - October
  { id: 'r-oct1', name: 'Café 2x1', description: 'Dos cafés por el precio de uno', pointsCost: 10, category: 'temporal', month: 10, monthName: 'Octubre', icon: '🌕', isActive: true },
  { id: 'r-oct2', name: 'Postre para Compartir', description: 'Pie de Limón, Maracuyá o Manzana', pointsCost: 5, category: 'temporal', month: 10, monthName: 'Octubre', icon: '🥧', isActive: true },

  // TEMPORAL - December
  { id: 'r-dec1', name: 'Caja Navideña', description: 'Panadería + café navideño', pointsCost: 70, category: 'temporal', month: 12, monthName: 'Diciembre', icon: '🎄', isActive: true, highlight: true },
  { id: 'r-dec2', name: 'Torta Navideña', description: 'Torta navideña especial', pointsCost: 100, category: 'temporal', month: 12, monthName: 'Diciembre', icon: '🎅', isActive: true },

  // GRAND PRIZE
  { id: 'r-grand', name: 'Cafetera Nespresso', description: 'Cafetera compatible con cápsulas tipo Nespresso', pointsCost: 300, category: 'premio_mayor', icon: '🏆', isActive: true, highlight: true },
];

const MISSIONS: Mission[] = [
  { id: 'm1', name: '3 Días Seguidos', description: 'Visítanos 3 días consecutivos', bonusPoints: 10, icon: '📅', requirement: 3, type: 'consecutive_days', isActive: true },
  { id: 'm2', name: 'Explorador Yana', description: 'Prueba 3 productos distintos', bonusPoints: 8, icon: '🔍', requirement: 3, type: 'unique_products', isActive: true },
  { id: 'm3', name: 'Embajador Yana', description: 'Trae a un amigo con tu código', bonusPoints: 5, icon: '🤝', requirement: 1, type: 'referral', isActive: true },
  { id: 'm4', name: 'Combo Lover', description: 'Compra 5 combos en total', bonusPoints: 15, icon: '🎯', requirement: 5, type: 'combo', isActive: true },
];

const MILESTONES: MilestoneReward[] = [
  { purchaseNumber: 10, reward: 'Café gratis (sello 10)', icon: '☕', description: 'Compra 10 cafés y obtén 1 gratis' },
  { purchaseNumber: 5, reward: 'Postre gratis (sello 5)', icon: '🍰', description: 'Compra 5 postres y obtén 1 gratis' },
  { purchaseNumber: 20, reward: 'Desayuno gratis', icon: '🍳', description: 'Desayuno completo de regalo' },
  { purchaseNumber: 40, reward: 'Brunch para 2', icon: '🥂', description: 'Panini + café/jugo para dos' },
  { purchaseNumber: 60, reward: '1 Kilo de Café', icon: '☕', description: 'Nuestro café especial de la casa' },
  { purchaseNumber: 80, reward: 'Torta Mediana (10 personas)', icon: '🎂', description: 'Torta especial mediana' },
  { purchaseNumber: 90, reward: 'Kit Café Yana', icon: '🎁', description: 'Taza personalizada + 1kg café molido' },
  { purchaseNumber: 100, reward: 'Box Desayuno Premium para 2', icon: '📦', description: 'Desayuno premium para dos personas' },
  { purchaseNumber: 120, reward: 'Vale Consumo Bs.100', icon: '🏷️', description: 'Vale de consumo por Bs.100' },
];

const LEVEL_THRESHOLDS = { bronce: 0, plata: 50, oro: 150, platino: 300 };

function getLevelInfo(lifetimePoints: number): { level: LoyaltyLevel; nextLevel: LoyaltyLevel | null; pointsToNext: number; progress: number } {
  if (lifetimePoints >= LEVEL_THRESHOLDS.platino) return { level: 'platino', nextLevel: null, pointsToNext: 0, progress: 100 };
  if (lifetimePoints >= LEVEL_THRESHOLDS.oro) {
    const progress = ((lifetimePoints - LEVEL_THRESHOLDS.oro) / (LEVEL_THRESHOLDS.platino - LEVEL_THRESHOLDS.oro)) * 100;
    return { level: 'oro', nextLevel: 'platino', pointsToNext: LEVEL_THRESHOLDS.platino - lifetimePoints, progress: Math.min(progress, 100) };
  }
  if (lifetimePoints >= LEVEL_THRESHOLDS.plata) {
    const progress = ((lifetimePoints - LEVEL_THRESHOLDS.plata) / (LEVEL_THRESHOLDS.oro - LEVEL_THRESHOLDS.plata)) * 100;
    return { level: 'plata', nextLevel: 'oro', pointsToNext: LEVEL_THRESHOLDS.oro - lifetimePoints, progress: Math.min(progress, 100) };
  }
  const progress = (lifetimePoints / LEVEL_THRESHOLDS.plata) * 100;
  return { level: 'bronce', nextLevel: 'plata', pointsToNext: LEVEL_THRESHOLDS.plata - lifetimePoints, progress: Math.min(progress, 100) };
}

function generateReferralCode(): string {
  return 'YANA-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function isHappyHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour < 15;
}

function isDoubleDay(): boolean {
  const day = new Date().getDay();
  return day === 1 || day === 2; // Monday and Tuesday
}

function isBirthdayToday(birthday?: string): boolean {
  if (!birthday) return false;
  const today = new Date();
  const [, month, day] = birthday.split('-');
  return parseInt(month) === today.getMonth() + 1 && parseInt(day) === today.getDate();
}

export const useLoyaltyStore = create<LoyaltyStoreState>((set, get) => ({
  profiles: [],
  transactions: [],
  rewards: REWARDS,
  missions: MISSIONS,
  milestones: MILESTONES,

  getProfile: (customerId) => {
    return get().profiles.find(p => p.customerId === customerId);
  },

  getOrCreateProfile: (customerId) => {
    const existing = get().profiles.find(p => p.customerId === customerId);
    if (existing) return existing;

    const newProfile: LoyaltyProfile = {
      id: uuidv4(),
      customerId,
      points: 0,
      lifetimePoints: 0,
      purchaseCount: 0,
      level: 'bronce',
      referralCode: generateReferralCode(),
      referralCount: 0,
      consecutiveDays: 0,
      uniqueProductsBought: [],
      completedMissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set(state => ({ profiles: [...state.profiles, newProfile] }));
    return newProfile;
  },

  addTransaction: (customerId, saleId, points, type, description) => {
    const tx: LoyaltyTransaction = {
      id: uuidv4(),
      customerId,
      saleId,
      points,
      type,
      description,
      date: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set(state => {
      const profiles = state.profiles.map(p => {
        if (p.customerId !== customerId) return p;
        const newPoints = Math.max(0, p.points + points);
        const newLifetime = points > 0 ? p.lifetimePoints + points : p.lifetimePoints;
        const { level } = getLevelInfo(newLifetime);
        return { ...p, points: newPoints, lifetimePoints: newLifetime, level, updatedAt: new Date() };
      });
      return { profiles, transactions: [...state.transactions, tx] };
    });
  },

  calculatePointsForAmount: (customerId, total, hasCombo) => {
    const profile = get().getProfile(customerId);
    const birthday = profile?.birthday;

    const basePoints = Math.floor(total / 10);
    let bonusPoints = 0;
    let multiplier = 1;
    const bonusReasons: string[] = [];
    const isBirthday = isBirthdayToday(birthday);
    const happyHour = isHappyHour();
    const doubleDay = isDoubleDay();
    const isCombo = hasCombo;
    const isGroupPurchase = total >= 70;

    if (isBirthday) {
      multiplier = 3;
      bonusReasons.push('🎂 ¡Cumpleaños! (x3)');
    } else if (total >= 100) {
      multiplier = 2;
      bonusReasons.push('💎 Compra mayor a Bs.100 (x2)');
    }

    if (happyHour && multiplier < 2) {
      bonusPoints += 2;
      bonusReasons.push('⏰ Happy Hour (+2)');
    }
    if (doubleDay && multiplier < 2) {
      bonusPoints += basePoints;
      bonusReasons.push('📅 Día doble (+puntos extra)');
    }
    if (total >= 70 && !isBirthday) {
      bonusPoints += 2;
      bonusReasons.push('🛍️ Compra >Bs.70 (+2)');
    }
    if (isCombo) {
      bonusPoints += 3;
      bonusReasons.push('🎯 Combo (+3)');
    }
    if (isGroupPurchase && total >= 70) {
      bonusPoints += 10;
      bonusReasons.push('👥 Compra grupal (+10)');
    }

    const totalPoints = Math.round(basePoints * multiplier) + bonusPoints;

    return {
      basePoints,
      bonusPoints,
      totalPoints,
      multiplier,
      bonusReasons,
      isBirthday,
      isHappyHour: happyHour,
      isDoubleDay: doubleDay,
      isCombo,
      isGroupPurchase,
    };
  },

  awardPointsForSale: (customerId, saleId, total, hasCombo) => {
    const profile = get().getOrCreateProfile(customerId);
    const calc = get().calculatePointsForAmount(customerId, total, hasCombo);

    // Award base + bonus
    get().addTransaction(customerId, saleId, calc.totalPoints, 'earned',
      `Venta completada - ${calc.bonusReasons.length > 0 ? calc.bonusReasons.join(', ') : 'puntos base'}`);

    // Update purchase count and consecutive days
    const today = new Date().toISOString().split('T')[0];
    const lastDate = profile.lastPurchaseDate;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newConsecutive = lastDate === yesterday ? profile.consecutiveDays + 1 : 1;

    set(state => ({
      profiles: state.profiles.map(p => {
        if (p.customerId !== customerId) return p;
        return {
          ...p,
          purchaseCount: p.purchaseCount + 1,
          lastPurchaseDate: today,
          consecutiveDays: newConsecutive,
          updatedAt: new Date(),
        };
      }),
    }));

    // Check and award birthday bonus separately if needed
    if (calc.isBirthday && calc.multiplier === 3) {
      // Already included in multiplier
    }

    return calc;
  },

  redeemPoints: (customerId, rewardId) => {
    const profile = get().getProfile(customerId);
    const reward = get().rewards.find(r => r.id === rewardId);
    if (!profile || !reward || profile.points < reward.pointsCost) return false;

    get().addTransaction(customerId, undefined, -reward.pointsCost, 'redeemed',
      `Canjeado: ${reward.name}`);
    return true;
  },

  redeemPointsForDiscount: (customerId, points) => {
    const profile = get().getProfile(customerId);
    if (!profile || profile.points < points) return false;

    get().addTransaction(customerId, undefined, -points, 'redeemed',
      `Descuento canjeado: ${points} puntos`);
    return true;
  },

  getTransactions: (customerId) => {
    return get().transactions
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getLevelInfo,

  registerReferral: (referralCode, newCustomerId) => {
    const referrerProfile = get().profiles.find(p => p.referralCode === referralCode);
    if (!referrerProfile) return;

    // +5 points for referrer
    get().addTransaction(referrerProfile.customerId, undefined, 5, 'referral',
      'Referido exitoso (+5 puntos)');

    // Update referral count
    set(state => ({
      profiles: state.profiles.map(p =>
        p.customerId === referrerProfile.customerId
          ? { ...p, referralCount: p.referralCount + 1 }
          : p
      ),
    }));

    // +5 for new customer too
    get().getOrCreateProfile(newCustomerId);
    get().addTransaction(newCustomerId, undefined, 5, 'referral',
      'Bienvenido de parte de un amigo (+5 puntos)');
  },

  updateConsecutiveDays: (profile) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (profile.lastPurchaseDate === yesterday) return profile.consecutiveDays + 1;
    if (profile.lastPurchaseDate === today) return profile.consecutiveDays;
    return 1;
  },

  checkMissions: (customerId) => {
    const profile = get().getProfile(customerId);
    if (!profile) return [];
    const newlyCompleted: string[] = [];

    const missions = get().missions;
    missions.forEach(mission => {
      if (profile.completedMissions.includes(mission.id)) return;

      let completed = false;
      switch (mission.type) {
        case 'consecutive_days':
          completed = profile.consecutiveDays >= mission.requirement;
          break;
        case 'unique_products':
          completed = profile.uniqueProductsBought.length >= mission.requirement;
          break;
        case 'referral':
          completed = profile.referralCount >= mission.requirement;
          break;
        case 'combo':
          // tracked separately
          break;
      }

      if (completed) {
        newlyCompleted.push(mission.id);
        get().addTransaction(customerId, undefined, mission.bonusPoints, 'mission',
          `Misión completada: ${mission.name} (+${mission.bonusPoints} puntos)`);

        set(state => ({
          profiles: state.profiles.map(p =>
            p.customerId === customerId
              ? { ...p, completedMissions: [...p.completedMissions, mission.id] }
              : p
          ),
        }));
      }
    });

    return newlyCompleted;
  },
}));
