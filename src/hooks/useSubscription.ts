'use client';

import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  useGetMySubscriptionQuery,
  useGetSubscriptionSummaryQuery,
  SubscriptionTier,
  SubscriptionDto,
  SubscriptionSummaryDto,
} from '@/lib/store/api/subscriptionsApi';
import {
  useGetPricingQuery,
  useInitializePaymentMutation,
  PricingResponse,
} from '@/lib/store/api/paymentsApi';

export interface SubscriptionManagement {
  // Current subscription
  subscription: SubscriptionDto | null;
  summary: SubscriptionSummaryDto | null;
  isLoading: boolean;

  // Pricing
  pricing: PricingResponse | null;

  // Upgrade flow
  upgrade: (tier: SubscriptionTier, isYearly: boolean) => Promise<{ success: boolean; url?: string; error?: string }>;
  isUpgrading: boolean;

  // Helper functions
  canUpgradeTo: (tier: SubscriptionTier) => boolean;
  getPriceForTier: (tier: SubscriptionTier, isYearly: boolean) => number | null;
  getFeatureComparison: () => FeatureComparison[];
}

export interface FeatureComparison {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
  proPlus: boolean | string;
}

/**
 * Hook for managing subscription and payments
 * 
 * @example
 * ```tsx
 * function UpgradePage() {
 *   const { subscription, pricing, upgrade, isUpgrading } = useSubscription();
 * 
 *   const handleUpgrade = async () => {
 *     const result = await upgrade(SubscriptionTier.PROFESSIONAL, true);
 *     if (result.success && result.url) {
 *       window.location.href = result.url; // Redirect to Paystack
 *     }
 *   };
 * 
 *   return <button onClick={handleUpgrade}>Upgrade to Professional</button>;
 * }
 * ```
 */
export function useSubscription(): SubscriptionManagement {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = !!user;

  // Fetch subscription data
  const { data: subscriptionResponse, isLoading: isLoadingSubscription } = useGetMySubscriptionQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { data: summaryResponse, isLoading: isLoadingSummary } = useGetSubscriptionSummaryQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Fetch pricing
  const { data: pricingResponse } = useGetPricingQuery();

  // Payment mutation
  const [initializePayment, { isLoading: isUpgrading }] = useInitializePaymentMutation();

  const subscription = subscriptionResponse?.data || null;
  const summary = summaryResponse?.data || null;
  const pricing = pricingResponse?.data || null;

  /**
   * Check if user can upgrade to a tier
   */
  const canUpgradeTo = useCallback((tier: SubscriptionTier): boolean => {
    if (!subscription) return true;

    const tierOrder: Partial<Record<SubscriptionTier, number>> = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PRO]: 1,
      [SubscriptionTier.PRO_PLUS]: 2,
      [SubscriptionTier.CUSTOM]: 3,
    };

    const current = tierOrder[subscription.tier] ?? 0;
    const target = tierOrder[tier] ?? -1;
    return target > current;
  }, [subscription]);

  /**
   * Get price for a tier
   */
  const getPriceForTier = useCallback((tier: SubscriptionTier, isYearly: boolean): number | null => {
    if (!pricing) return null;
    if (tier === SubscriptionTier.CUSTOM) return null;
    const plan = pricing[tier];
    if (!plan) return null;
    return isYearly ? plan.yearly : plan.monthly;
  }, [pricing]);

  /**
   * Start upgrade flow
   */
  const upgrade = useCallback(async (
    tier: SubscriptionTier,
    isYearly: boolean,
    callbackUrl?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (tier === SubscriptionTier.FREE) {
      return { success: false, error: 'Cannot upgrade to free tier' };
    }

    if (tier === SubscriptionTier.CUSTOM) {
      // Custom requires custom handling
      return { success: false, error: 'Please contact sales for custom pricing' };
    }

    try {
      const resolvedCallback =
        callbackUrl ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard/school/subscription/callback`
          : undefined);
      const result = await initializePayment({ tier, isYearly, callbackUrl: resolvedCallback }).unwrap();

      if (result.success && result.data?.authorizationUrl) {
        return { success: true, url: result.data.authorizationUrl };
      }

      return { success: false, error: result.message || 'Failed to initialize payment' };
    } catch (error: any) {
      return { success: false, error: error.data?.message || 'Failed to start upgrade' };
    }
  }, [initializePayment]);

  /**
   * Get feature comparison table data
   */
  const getFeatureComparison = useCallback((): FeatureComparison[] => {
    return [
      { feature: 'Students', free: '100', pro: '800', proPlus: '2,000' },
      { feature: 'Teachers', free: '10', pro: '80', proPlus: '150' },
      { feature: 'Admins', free: '2', pro: '20', proPlus: '35' },
      { feature: 'Core Platform', free: true, pro: true, proPlus: true },
      { feature: 'Myschoolbud AI Generation', free: false, pro: true, proPlus: true },
      { feature: 'RollCall', free: false, pro: false, proPlus: true },
      { feature: 'Bursary Pro', free: 'Basic', pro: 'Full', proPlus: 'Full' },
      { feature: 'AI Credits/Month', free: '0', pro: '10,000', proPlus: '25,000' },
      { feature: 'Support', free: 'Community', pro: 'Email', proPlus: 'Priority' },
    ];
  }, []);

  return {
    subscription,
    summary,
    isLoading: isLoadingSubscription || isLoadingSummary,
    pricing,
    upgrade,
    isUpgrading,
    canUpgradeTo,
    getPriceForTier,
    getFeatureComparison,
  };
}

export { SubscriptionTier };

