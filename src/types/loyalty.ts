import type { UUID, BaseEntity } from './common';

export type LoyaltyLevel = 'bronce' | 'plata' | 'oro' | 'platino';

export interface LoyaltyProfile extends BaseEntity {
  customerId: UUID;
  points: number;          // current redeemable points
  lifetimePoints: number;  // all-time earned
  purchaseCount: number;   // total purchases ever
  level: LoyaltyLevel;
  birthday?: string;       // YYYY-MM-DD
  referralCode: string;
  referredByCode?: string;
  referralCount: number;
  consecutiveDays: number;
  lastPurchaseDate?: string;  // ISO date string
  uniqueProductsBought: string[];  // product IDs
  completedMissions: string[];
}

export interface LoyaltyTransaction extends BaseEntity {
  customerId: UUID;
  saleId?: UUID;
  points: number;       // positive = earned, negative = spent/redeemed
  type: 'earned' | 'redeemed' | 'birthday_bonus' | 'referral' | 'mission' | 'manual' | 'combo_bonus' | 'happy_hour' | 'double_day';
  description: string;
  date: string;  // ISO string
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'diario' | 'temporal' | 'hito' | 'premio_mayor';
  month?: number;   // 1-12 for seasonal rewards (5=May, 6=Jun...)
  monthName?: string;
  icon: string;     // emoji
  isActive: boolean;
  highlight?: boolean;
  productId?: string;  // producto canjeable en el POS
  disponible?: string; // 'Mesas' | 'ParaLlevar' | 'MesasYParaLlevar'
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  bonusPoints: number;
  icon: string;     // emoji
  requirement: number;
  type: 'consecutive_days' | 'unique_products' | 'referral' | 'combo';
  isActive: boolean;
}

export interface MilestoneReward {
  purchaseNumber: number;
  reward: string;
  icon: string;
  description: string;
}

export interface MilestoneVoucher {
  id: string;
  customerId: string;
  milestoneNumber: number;
  reward: string;
  icon: string;
  isRedeemed: boolean;
  generatedAt: string;   // ISO date
  redeemedAt?: string;
}

export type PromotionType = 'canje_puntos' | 'puntos_dobles_categoria';

export interface Promotion {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: PromotionType;
  // canje_puntos
  pointsCost?: number;
  // puntos_dobles_categoria
  category?: string;
  multiplier?: number;
  // Scheduling
  month: number;          // 1-12
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  isActive: boolean;
}

export interface PointsCalculation {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  multiplier: number;
  bonusReasons: string[];
  isBirthday: boolean;
  isHappyHour: boolean;
  isDoubleDay: boolean;
  isCombo: boolean;
  isGroupPurchase: boolean;
}

export type ConditionType = 'n_purchases' | 'min_amount' | 'referral' | 'combo_specific';
export type RewardType = 'free_product' | 'extra_points' | 'discount';

export interface PermanentPromotion {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditionType: ConditionType;
  conditionValue: number;
  rewardType: RewardType;
  rewardValue: number;
  productId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyStoreState {
  profiles: LoyaltyProfile[];
  transactions: LoyaltyTransaction[];
  rewards: Reward[];
  missions: Mission[];
  milestones: MilestoneReward[];

  // Actions
  getProfile: (customerId: UUID) => LoyaltyProfile | undefined;
  getOrCreateProfile: (customerId: UUID) => LoyaltyProfile;
  addTransaction: (customerId: UUID, saleId: UUID | undefined, points: number, type: LoyaltyTransaction['type'], description: string) => void;
  awardPointsForSale: (customerId: UUID, saleId: UUID, total: number, hasCombo: boolean) => PointsCalculation;
  redeemPoints: (customerId: UUID, rewardId: string) => boolean;
  redeemPointsForDiscount: (customerId: UUID, points: number) => boolean;
  getTransactions: (customerId: UUID) => LoyaltyTransaction[];
  calculatePointsForAmount: (customerId: UUID, total: number, hasCombo: boolean) => PointsCalculation;
  getLevelInfo: (points: number) => { level: LoyaltyLevel; nextLevel: LoyaltyLevel | null; pointsToNext: number; progress: number };
  registerReferral: (referralCode: string, newCustomerId: UUID) => void;
  updateConsecutiveDays: (profile: LoyaltyProfile) => number;
  checkMissions: (customerId: UUID) => string[];
}
