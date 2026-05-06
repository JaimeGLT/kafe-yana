import { useState, useCallback } from 'react';
import type { LoyaltyProfile, PointsCalculation, Reward } from '../types/loyalty';

export function usePOSLoyalty() {
  const [loyaltyProfiles, setLoyaltyProfiles] = useState<LoyaltyProfile[]>([]);

  const getOrCreateProfile = useCallback((customerId: string): LoyaltyProfile | undefined => {
    return loyaltyProfiles.find(p => p.customerId === customerId);
  }, [loyaltyProfiles]);

  const calculatePointsForAmount = useCallback((
    customerId: string,
    total: number,
    hasCombo: boolean,
  ): PointsCalculation | null => {
    const profile = getOrCreateProfile(customerId);
    if (!profile) return null;

    const basePoints = Math.floor(total / 10);
    let bonusPoints = 0;
    const bonusReasons: string[] = [];

    const hour = new Date().getHours();
    if (hour >= 9 && hour < 15) {
      bonusPoints += 2;
      bonusReasons.push('Happy Hour');
    }

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

  const awardPointsForSale = useCallback((
    customerId: string,
    _saleId: string,
    total: number,
    hasCombo: boolean,
  ): PointsCalculation | null => {
    return calculatePointsForAmount(customerId, total, hasCombo);
  }, [calculatePointsForAmount]);

  const redeemReward = useCallback((customerId: string, rewardId: string, rewards: Reward[]): boolean => {
    const profile = getOrCreateProfile(customerId);
    const reward = rewards.find(r => r.id === rewardId);
    if (!profile || !reward || profile.points < reward.pointsCost) return false;
    setLoyaltyProfiles(prev => prev.map(p =>
      p.customerId === customerId ? { ...p, points: p.points - reward.pointsCost } : p
    ));
    return true;
  }, [getOrCreateProfile]);

  return {
    loyaltyProfiles,
    setLoyaltyProfiles,
    getOrCreateProfile,
    calculatePointsForAmount,
    awardPointsForSale,
    redeemReward,
  };
}
