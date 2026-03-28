// src/types/subscription-info.ts
// Subscription info / feature flags for client-side usage

import type { SubscriptionPlan, SubscriptionStatus } from './subscription';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Client-safe subscription info (matches Prisma SubscriptionInfo view / computed) */
export interface SubscriptionInfo {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isActive: boolean;
  isTrialing: boolean;
  isPastDue: boolean;
  trialEndsAt?: Date | null;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
}

/** Feature flags per plan */
export interface SubscriptionFeatures {
  advancedAnalytics: boolean;
  customIntegrations: boolean;
  apiAccess: boolean;
  prioritySync: boolean;
  pdfExport: boolean;
  unlimitedGoals: boolean;
  unlimitedPlatforms: boolean;
  prioritySupport: boolean;
  teamCollaboration: boolean;
  whiteLabel: boolean;
}

/** Numeric limits per plan */
export interface SubscriptionLimits {
  maxPlatforms: number; // -1 = unlimited
  maxGoals: number;
  maxApiKeys: number;
  dataRetentionDays: number;
  maxExportsPerMonth: number;
}

/** Current usage against limits */
export interface SubscriptionUsage {
  platforms: number;
  goals: number;
  apiKeys: number;
  exportsThisMonth: number;
}

/** Upgrade prompt data */
export interface UpgradePrompt {
  feature: keyof SubscriptionFeatures | string;
  currentPlan: SubscriptionPlan;
  requiredPlan: SubscriptionPlan;
  message: string;
  ctaText: string;
  ctaUrl: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isFeatureAvailable(
  info: Pick<SubscriptionInfo, 'features'>,
  feature: keyof SubscriptionFeatures
): boolean {
  return info.features[feature];
}

export function isAtLimit(
  info: Pick<SubscriptionInfo, 'limits' | 'usage'>,
  resource: keyof SubscriptionUsage
): boolean {
  const limit = info.limits[resource as keyof SubscriptionLimits];
  if (limit === -1) return false; // Unlimited
  return info.usage[resource] >= limit;
}

export function getLimitRemaining(
  info: Pick<SubscriptionInfo, 'limits' | 'usage'>,
  resource: keyof SubscriptionUsage & keyof SubscriptionLimits
): number | null {
  const limit = info.limits[resource];
  if (limit === -1) return null; // Unlimited
  return Math.max(0, limit - info.usage[resource]);
}

export default SubscriptionInfo;
