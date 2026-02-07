// ============================================================================
// FILE: config/billing.ts
// PURPOSE: Billing and pricing configuration
// ============================================================================

import type { 
  SubscriptionTier, 

  BillingInterval,

} from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PlanFeature {
  id: string;
  name: string;
  description?: string;
  included: boolean;
  limit?: number | string;
  highlight?: boolean;
}

export interface PricingPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  badge?: string;
  popular?: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId?: string; // Stripe price ID
  yearlyPriceId?: string;  // Stripe price ID
  productId?: string;       // Stripe product ID
  features: PlanFeature[];
  limits: PlanLimits;
  cta: string;
  ctaVariant?: 'default' | 'primary' | 'outline';
  color?: string;
  icon?: string;
}

export interface PlanLimits {
  platformLimit: number;
  syncFrequencyMinutes: number;
  exportLimitMonthly: number;
  apiRequestsDaily: number;
  teamMembers?: number;
  customIntegrations?: number;
  dataRetentionDays?: number;
  prioritySupport?: boolean;
  customBranding?: boolean;
  webhooks?: boolean;
  bulkOperations?: boolean;
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'tracking' | 'analytics' | 'collaboration' | 'automation' | 'support' | 'enterprise';
  tiers: SubscriptionTier[];
}

export interface ReferralReward {
  referrerReward: number; // Percentage or fixed amount
  refereeDiscount: number; // Percentage discount
  refereeTrialDays?: number;
  minimumTier?: SubscriptionTier;
  maxRedemptions?: number;
  expiryDays?: number;
}

export interface BillingConfig {
  currency: string;
  currencySymbol: string;
  trialDays: number;
  gracePeriodDays: number;
  refundPeriodDays: number;
  taxRate: number; // Default tax rate percentage
  intervals: BillingInterval[];
  yearlyDiscount: number; // Percentage
  referralProgram: ReferralReward;
}

// ============================================================================
// BILLING CONFIGURATION
// ============================================================================

export const BILLING_CONFIG: BillingConfig = {
  currency: 'usd',
  currencySymbol: '$',
  trialDays: 14,
  gracePeriodDays: 3,
  refundPeriodDays: 30,
  taxRate: 0, // Will be calculated based on location
  intervals: ['MONTHLY', 'YEARLY'],
  yearlyDiscount: 20, // 20% discount for yearly billing
  referralProgram: {
    referrerReward: 30, // $30 credit
    refereeDiscount: 20, // 20% off first month
    refereeTrialDays: 30, // Extended trial
    minimumTier: 'STARTER',
    maxRedemptions: 10,
    expiryDays: 90,
  },
};

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

export const STRIPE_CONFIG = {
  // Product IDs (from Stripe Dashboard)
  products: {
    FREE: process.env.STRIPE_FREE_PRODUCT_ID || '',
    STARTER: process.env.STRIPE_STARTER_PRODUCT_ID || 'prod_starter',
    PRO: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_pro',
    TEAM: process.env.STRIPE_TEAM_PRODUCT_ID || 'prod_team',
    ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_enterprise',
  },

  // Price IDs (from Stripe Dashboard)
  prices: {
    STARTER: {
      monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly',
      yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly',
    },
    PRO: {
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
    },
    TEAM: {
      monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
      yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly',
    },
    ENTERPRISE: {
      monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
      yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
    },
  },

  // Webhook events to handle
  webhookEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'payment_method.attached',
    'payment_method.detached',
  ],
};

// ============================================================================
// PRICING PLANS
// ============================================================================

export const PLANS: Record<SubscriptionTier, PricingPlan> = {
  FREE: {
    id: 'free',
    tier: 'FREE',
    name: 'Free',
    description: 'Perfect for getting started with basic tracking',
    monthlyPrice: 0,
    yearlyPrice: 0,
    productId: STRIPE_CONFIG.products.FREE,
    cta: 'Get Started',
    ctaVariant: 'outline',
    features: [
      { id: 'platforms', name: 'Platform Connections', included: true, limit: '3 platforms' },
      { id: 'sync', name: 'Manual Sync', included: true },
      { id: 'auto_sync', name: 'Auto Sync', included: true, limit: 'Daily' },
      { id: 'tracker', name: 'Basic Activity Tracking', included: true },
      { id: 'streak', name: 'Streak Tracking', included: true },
      { id: 'export', name: 'Data Export', included: true, limit: '1 per month' },
      { id: 'dashboard', name: 'Basic Dashboard', included: true },
      { id: 'achievements', name: 'Achievements', included: false },
      { id: 'goals', name: 'Goal Setting', included: false },
      { id: 'analytics', name: 'Advanced Analytics', included: false },
      { id: 'api', name: 'API Access', included: false },
      { id: 'support', name: 'Community Support', included: true },
    ],
    limits: {
      platformLimit: 3,
      syncFrequencyMinutes: 1440, // 24 hours
      exportLimitMonthly: 1,
      apiRequestsDaily: 50,
      dataRetentionDays: 90,
    },
  },

  STARTER: {
    id: 'starter',
    tier: 'STARTER',
    name: 'Starter',
    description: 'For individuals who want more platforms and features',
    badge: 'Most Popular',
    popular: true,
    monthlyPrice: 9,
    yearlyPrice: 86, // ~$7.20/month with 20% discount
    monthlyPriceId: STRIPE_CONFIG.prices.STARTER.monthly,
    yearlyPriceId: STRIPE_CONFIG.prices.STARTER.yearly,
    productId: STRIPE_CONFIG.products.STARTER,
    cta: 'Start Free Trial',
    ctaVariant: 'primary',
    color: '#10B981',
    features: [
      { id: 'platforms', name: 'Platform Connections', included: true, limit: '5 platforms' },
      { id: 'sync', name: 'Manual Sync', included: true },
      { id: 'auto_sync', name: 'Auto Sync', included: true, limit: 'Every 12 hours', highlight: true },
      { id: 'tracker', name: 'Advanced Activity Tracking', included: true },
      { id: 'streak', name: 'Streak Tracking & Freeze', included: true, highlight: true },
      { id: 'export', name: 'Data Export', included: true, limit: '5 per month' },
      { id: 'dashboard', name: 'Custom Dashboard', included: true },
      { id: 'achievements', name: 'All Achievements', included: true, highlight: true },
      { id: 'goals', name: 'Goal Setting & Tracking', included: true, highlight: true },
      { id: 'analytics', name: 'Basic Analytics', included: true },
      { id: 'api', name: 'API Access', included: false },
      { id: 'support', name: 'Email Support', included: true },
    ],
    limits: {
      platformLimit: 5,
      syncFrequencyMinutes: 720, // 12 hours
      exportLimitMonthly: 5,
      apiRequestsDaily: 200,
      dataRetentionDays: 365,
    },
  },

  PRO: {
    id: 'pro',
    tier: 'PRO',
    name: 'Pro',
    description: 'For power users who need advanced features and automation',
    monthlyPrice: 19,
    yearlyPrice: 182, // ~$15.20/month with 20% discount
    monthlyPriceId: STRIPE_CONFIG.prices.PRO.monthly,
    yearlyPriceId: STRIPE_CONFIG.prices.PRO.yearly,
    productId: STRIPE_CONFIG.products.PRO,
    cta: 'Start Free Trial',
    ctaVariant: 'primary',
    color: '#6366F1',
    features: [
      { id: 'platforms', name: 'Platform Connections', included: true, limit: '15 platforms', highlight: true },
      { id: 'sync', name: 'Manual Sync', included: true },
      { id: 'auto_sync', name: 'Auto Sync', included: true, limit: 'Hourly', highlight: true },
      { id: 'tracker', name: 'Advanced Activity Tracking', included: true },
      { id: 'streak', name: 'Streak Tracking & Unlimited Freeze', included: true },
      { id: 'export', name: 'Data Export', included: true, limit: '25 per month' },
      { id: 'dashboard', name: 'Custom Dashboard & Widgets', included: true },
      { id: 'achievements', name: 'All Achievements + Secret', included: true },
      { id: 'goals', name: 'Unlimited Goals & Milestones', included: true, highlight: true },
      { id: 'analytics', name: 'Advanced Analytics & Insights', included: true, highlight: true },
      { id: 'api', name: 'Full API Access', included: true, highlight: true },
      { id: 'webhooks', name: 'Webhooks', included: true },
      { id: 'integrations', name: 'Custom Integrations', included: true, limit: '3' },
      { id: 'reports', name: 'Weekly & Monthly Reports', included: true },
      { id: 'support', name: 'Priority Support', included: true, highlight: true },
    ],
    limits: {
      platformLimit: 15,
      syncFrequencyMinutes: 60, // 1 hour
      exportLimitMonthly: 25,
      apiRequestsDaily: 1000,
      customIntegrations: 3,
      dataRetentionDays: -1, // Unlimited
      webhooks: true,
      prioritySupport: true,
    },
  },

  TEAM: {
    id: 'team',
    tier: 'TEAM',
    name: 'Team',
    description: 'For teams and organizations with collaboration needs',
    monthlyPrice: 49,
    yearlyPrice: 470, // ~$39.20/month with 20% discount
    monthlyPriceId: STRIPE_CONFIG.prices.TEAM.monthly,
    yearlyPriceId: STRIPE_CONFIG.prices.TEAM.yearly,
    productId: STRIPE_CONFIG.products.TEAM,
    cta: 'Contact Sales',
    ctaVariant: 'primary',
    color: '#8B5CF6',
    features: [
      { id: 'platforms', name: 'Platform Connections', included: true, limit: '50 platforms', highlight: true },
      { id: 'sync', name: 'Real-time Sync', included: true, highlight: true },
      { id: 'auto_sync', name: 'Auto Sync', included: true, limit: 'Every 30 min', highlight: true },
      { id: 'tracker', name: 'Team Activity Tracking', included: true, highlight: true },
      { id: 'team_members', name: 'Team Members', included: true, limit: 'Up to 10', highlight: true },
      { id: 'roles', name: 'Role-based Access Control', included: true },
      { id: 'export', name: 'Unlimited Data Export', included: true, limit: '100 per month' },
      { id: 'dashboard', name: 'Team Dashboards', included: true, highlight: true },
      { id: 'achievements', name: 'Team Achievements', included: true },
      { id: 'goals', name: 'Team Goals & OKRs', included: true, highlight: true },
      { id: 'analytics', name: 'Team Analytics & Leaderboards', included: true, highlight: true },
      { id: 'api', name: 'Full API Access', included: true },
      { id: 'webhooks', name: 'Unlimited Webhooks', included: true },
      { id: 'integrations', name: 'Custom Integrations', included: true, limit: '10' },
      { id: 'reports', name: 'Custom Reports', included: true },
      { id: 'audit', name: 'Audit Logs', included: true },
      { id: 'sso', name: 'SSO Authentication', included: true },
      { id: 'support', name: 'Dedicated Support', included: true, highlight: true },
    ],
    limits: {
      platformLimit: 50,
      syncFrequencyMinutes: 30,
      exportLimitMonthly: 100,
      apiRequestsDaily: 5000,
      teamMembers: 10,
      customIntegrations: 10,
      dataRetentionDays: -1, // Unlimited
      webhooks: true,
      prioritySupport: true,
      bulkOperations: true,
    },
  },

  ENTERPRISE: {
    id: 'enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    monthlyPrice: -1, // Custom pricing
    yearlyPrice: -1,  // Custom pricing
    productId: STRIPE_CONFIG.products.ENTERPRISE,
    cta: 'Contact Sales',
    ctaVariant: 'outline',
    color: '#DC2626',
    features: [
      { id: 'platforms', name: 'Platform Connections', included: true, limit: 'Unlimited', highlight: true },
      { id: 'sync', name: 'Real-time Sync', included: true },
      { id: 'auto_sync', name: 'Auto Sync', included: true, limit: 'Every 5 min', highlight: true },
      { id: 'tracker', name: 'Enterprise Activity Tracking', included: true },
      { id: 'team_members', name: 'Team Members', included: true, limit: 'Unlimited', highlight: true },
      { id: 'roles', name: 'Advanced RBAC', included: true },
      { id: 'export', name: 'Unlimited Data Export', included: true, limit: 'Unlimited' },
      { id: 'dashboard', name: 'White-label Dashboards', included: true, highlight: true },
      { id: 'achievements', name: 'Custom Achievements', included: true },
      { id: 'goals', name: 'Enterprise Goal Management', included: true },
      { id: 'analytics', name: 'Advanced Analytics & BI', included: true },
      { id: 'api', name: 'Enterprise API', included: true, highlight: true },
      { id: 'webhooks', name: 'Unlimited Webhooks', included: true },
      { id: 'integrations', name: 'Unlimited Integrations', included: true, limit: 'Unlimited' },
      { id: 'reports', name: 'Custom Reports & BI', included: true },
      { id: 'audit', name: 'Advanced Audit Logs', included: true },
      { id: 'sso', name: 'Enterprise SSO & SAML', included: true, highlight: true },
      { id: 'compliance', name: 'Compliance & Security', included: true, highlight: true },
      { id: 'sla', name: '99.9% SLA', included: true, highlight: true },
      { id: 'support', name: '24/7 Dedicated Support', included: true, highlight: true },
      { id: 'training', name: 'Onboarding & Training', included: true },
    ],
    limits: {
      platformLimit: -1, // Unlimited
      syncFrequencyMinutes: 5,
      exportLimitMonthly: -1, // Unlimited
      apiRequestsDaily: -1, // Unlimited
      teamMembers: -1, // Unlimited
      customIntegrations: -1, // Unlimited
      dataRetentionDays: -1, // Unlimited
      webhooks: true,
      prioritySupport: true,
      customBranding: true,
      bulkOperations: true,
    },
  },
};

// ============================================================================
// FEATURES CONFIGURATION
// ============================================================================

export const FEATURES: FeatureDefinition[] = [
  // Core Features
  {
    id: 'platform_connections',
    name: 'Platform Connections',
    description: 'Connect and sync data from multiple platforms',
    category: 'core',
    tiers: ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'manual_sync',
    name: 'Manual Data Sync',
    description: 'Manually trigger data synchronization',
    category: 'core',
    tiers: ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'auto_sync',
    name: 'Automatic Sync',
    description: 'Automatically sync data at regular intervals',
    category: 'automation',
    tiers: ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'data_export',
    name: 'Data Export',
    description: 'Export your data in various formats',
    category: 'core',
    tiers: ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },

  // Tracking Features
  {
    id: 'activity_tracking',
    name: 'Activity Tracking',
    description: 'Track coding activities across platforms',
    category: 'tracking',
    tiers: ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'streak_tracking',
    name: 'Streak Tracking',
    description: 'Monitor and maintain coding streaks',
    category: 'tracking',
    tiers: ['FREE', 'STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Freeze your streak when you need a break',
    category: 'tracking',
    tiers: ['STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'goals',
    name: 'Goals & Milestones',
    description: 'Set and track personal coding goals',
    category: 'tracking',
    tiers: ['STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'achievements',
    name: 'Achievements & Badges',
    description: 'Unlock achievements and earn badges',
    category: 'tracking',
    tiers: ['STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },

  // Analytics Features
  {
    id: 'basic_analytics',
    name: 'Basic Analytics',
    description: 'View basic statistics and trends',
    category: 'analytics',
    tiers: ['STARTER', 'PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Deep insights with advanced analytics',
    category: 'analytics',
    tiers: ['PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'custom_reports',
    name: 'Custom Reports',
    description: 'Generate custom reports and insights',
    category: 'analytics',
    tiers: ['TEAM', 'ENTERPRISE'],
  },
  {
    id: 'leaderboards',
    name: 'Leaderboards',
    description: 'Compare progress with others',
    category: 'analytics',
    tiers: ['TEAM', 'ENTERPRISE'],
  },

  // Automation Features
  {
    id: 'api_access',
    name: 'API Access',
    description: 'Programmatic access to your data',
    category: 'automation',
    tiers: ['PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Real-time notifications for events',
    category: 'automation',
    tiers: ['PRO', 'TEAM', 'ENTERPRISE'],
  },
  {
    id: 'custom_integrations',
    name: 'Custom Integrations',
    description: 'Build custom integrations',
    category: 'automation',
    tiers: ['PRO', 'TEAM', 'ENTERPRISE'],
  },

  // Team Features
  {
    id: 'team_members',
    name: 'Team Members',
    description: 'Add and manage team members',
    category: 'collaboration',
    tiers: ['TEAM', 'ENTERPRISE'],
  },
  {
    id: 'rbac',
    name: 'Role-Based Access Control',
    description: 'Control access with roles and permissions',
    category: 'collaboration',
    tiers: ['TEAM', 'ENTERPRISE'],
  },
  {
    id: 'team_dashboard',
    name: 'Team Dashboard',
    description: 'Shared team dashboard and insights',
    category: 'collaboration',
    tiers: ['TEAM', 'ENTERPRISE'],
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    description: 'Track all activities and changes',
    category: 'collaboration',
    tiers: ['TEAM', 'ENTERPRISE'],
  },

  // Enterprise Features
  {
    id: 'sso',
    name: 'Single Sign-On',
    description: 'Enterprise SSO authentication',
    category: 'enterprise',
    tiers: ['TEAM', 'ENTERPRISE'],
  },
  {
    id: 'white_label',
    name: 'White Labeling',
    description: 'Custom branding and white labeling',
    category: 'enterprise',
    tiers: ['ENTERPRISE'],
  },
  {
    id: 'sla',
    name: 'Service Level Agreement',
    description: 'Guaranteed uptime and response times',
    category: 'enterprise',
    tiers: ['ENTERPRISE'],
  },
  {
    id: 'compliance',
    name: 'Compliance & Security',
    description: 'Advanced security and compliance features',
    category: 'enterprise',
    tiers: ['ENTERPRISE'],
  },

  // Support Features
  {
    id: 'community_support',
    name: 'Community Support',
    description: 'Access to community forums',
    category: 'support',
    tiers: ['FREE'],
  },
  {
    id: 'email_support',
    name: 'Email Support',
    description: 'Email support within 48 hours',
    category: 'support',
    tiers: ['STARTER'],
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: 'Priority email support within 12 hours',
    category: 'support',
    tiers: ['PRO'],
  },
  {
    id: 'dedicated_support',
    name: 'Dedicated Support',
    description: 'Dedicated account manager',
    category: 'support',
    tiers: ['TEAM', 'ENTERPRISE'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get plan by tier
 */
export function getPlanByTier(tier: SubscriptionTier): PricingPlan {
  return PLANS[tier];
}

/**
 * Get all available plans (excluding enterprise for public display)
 */
export function getPublicPlans(): PricingPlan[] {
  return Object.values(PLANS).filter(plan => plan.monthlyPrice >= 0);
}

/**
 * Calculate price with discount
 */
export function calculateDiscountedPrice(
  basePrice: number, 
  discountPercentage: number
): number {
  return Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;
}

/**
 * Calculate yearly savings
 */
export function calculateYearlySavings(plan: PricingPlan): number {
  if (plan.monthlyPrice === 0) return 0;
  const yearlyWithoutDiscount = plan.monthlyPrice * 12;
  return yearlyWithoutDiscount - plan.yearlyPrice;
}

/**
 * Get feature availability for a tier
 */
export function hasFeature(tier: SubscriptionTier, featureId: string): boolean {
  const feature = FEATURES.find(f => f.id === featureId);
  return feature ? feature.tiers.includes(tier) : false;
}

/**
 * Get all features for a tier
 */
export function getTierFeatures(tier: SubscriptionTier): FeatureDefinition[] {
  return FEATURES.filter(f => f.tiers.includes(tier));
}

/**
 * Format price for display
 */
export function formatPrice(
  amount: number, 
  currency: string = BILLING_CONFIG.currency
): string {
  if (amount === -1) return 'Custom';
  if (amount === 0) return 'Free';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format billing interval
 */
export function formatInterval(interval: BillingInterval): string {
  const intervals: Record<BillingInterval, string> = {
    MONTHLY: 'month',
    YEARLY: 'year',
    LIFETIME: 'lifetime',
  };
  return intervals[interval] || 'month';
}

/**
 * Get Stripe price ID for a plan
 */
export function getStripePriceId(
  tier: SubscriptionTier, 
  interval: BillingInterval
): string | undefined {
  if (tier === 'FREE') return undefined;
  
  const plan = PLANS[tier];
  return interval === 'YEARLY' ? plan.yearlyPriceId : plan.monthlyPriceId;
}

/**
 * Calculate referral reward amount
 */
export function calculateReferralReward(
  subscriptionAmount: number
): number {
  const { referrerReward } = BILLING_CONFIG.referralProgram;
  // If referrerReward is a percentage (< 100), calculate percentage
  // Otherwise, treat as fixed amount
  if (referrerReward < 100) {
    return Math.round(subscriptionAmount * (referrerReward / 100) * 100) / 100;
  }
  return referrerReward;
}

/**
 * Check if user qualifies for trial
 */
export function isEligibleForTrial(
  previousSubscriptions: number = 0,
  hasUsedTrial: boolean = false
): boolean {
  // First-time users get a trial
  if (previousSubscriptions === 0 && !hasUsedTrial) {
    return true;
  }
  return false;
}

/**
 * Get trial end date
 */
export function getTrialEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + BILLING_CONFIG.trialDays);
  return endDate;
}

/**
 * Check if a plan has a specific limit
 */
export function getPlanLimit(
  tier: SubscriptionTier, 
  limitKey: keyof PlanLimits
): number | boolean | undefined {
  const plan = PLANS[tier];
  return plan.limits[limitKey];
}

/**
 * Compare two plans
 */
export function comparePlans(
  tier1: SubscriptionTier, 
  tier2: SubscriptionTier
): {
  tier1Better: string[];
  tier2Better: string[];
  same: string[];
} {
  const plan1 = PLANS[tier1];
  const plan2 = PLANS[tier2];
  
  const tier1Better: string[] = [];
  const tier2Better: string[] = [];
  const same: string[] = [];
  
  // Compare features
  plan1.features.forEach(feature => {
    const plan2Feature = plan2.features.find(f => f.id === feature.id);
    
    if (!plan2Feature || !plan2Feature.included) {
      if (feature.included) tier1Better.push(feature.name);
    } else if (feature.included && plan2Feature.included) {
      if (feature.limit && plan2Feature.limit) {
        // Compare limits (simplified comparison)
        same.push(feature.name);
      } else {
        same.push(feature.name);
      }
    }
  });
  
  plan2.features.forEach(feature => {
    if (!feature.included) return;
    const plan1Feature = plan1.features.find(f => f.id === feature.id);
    if (!plan1Feature || !plan1Feature.included) {
      tier2Better.push(feature.name);
    }
  });
  
  return { tier1Better, tier2Better, same };
}

// ============================================================================
// USAGE LIMITS
// ============================================================================

export const USAGE_LIMITS = {
  // Free tier strict limits
  FREE_DAILY_SYNCS: 1,
  FREE_API_CALLS: 50,
  
  // Rate limiting (requests per minute)
  RATE_LIMITS: {
    FREE: 10,
    STARTER: 30,
    PRO: 60,
    TEAM: 120,
    ENTERPRISE: -1, // Unlimited
  },
  
  // Storage limits (in MB)
  STORAGE_LIMITS: {
    FREE: 100,
    STARTER: 500,
    PRO: 2000,
    TEAM: 10000,
    ENTERPRISE: -1, // Unlimited
  },
  
  // Webhook limits
  WEBHOOK_LIMITS: {
    FREE: 0,
    STARTER: 0,
    PRO: 5,
    TEAM: 25,
    ENTERPRISE: -1, // Unlimited
  },
};

// ============================================================================
// TRIAL CONFIGURATION
// ============================================================================

export const TRIAL_CONFIG = {
  // Standard trial duration
  STANDARD_DAYS: BILLING_CONFIG.trialDays,
  
  // Extended trial for special cases
  EXTENDED_DAYS: 30,
  
  // Trial features (PRO tier features during trial)
  TRIAL_TIER: 'PRO' as SubscriptionTier,
  
  // Trial limitations
  TRIAL_PLATFORM_LIMIT: 10,
  TRIAL_EXPORT_LIMIT: 10,
  
  // Trial expiry warnings (days before expiry)
  WARNING_DAYS: [7, 3, 1],
};

// ============================================================================
// DISCOUNT CODES
// ============================================================================

export interface DiscountCode {
  code: string;
  description: string;
  discountPercentage: number;
  validTiers: SubscriptionTier[];
  validUntil?: Date;
  maxRedemptions?: number;
  firstTimeOnly?: boolean;
}

export const DISCOUNT_CODES: DiscountCode[] = [
  {
    code: 'LAUNCH50',
    description: 'Launch discount - 50% off first month',
    discountPercentage: 50,
    validTiers: ['STARTER', 'PRO'],
    firstTimeOnly: true,
  },
  {
    code: 'STUDENT20',
    description: 'Student discount - 20% off',
    discountPercentage: 20,
    validTiers: ['STARTER', 'PRO'],
  },
  {
    code: 'TEAM30',
    description: 'Team discount - 30% off Team plan',
    discountPercentage: 30,
    validTiers: ['TEAM'],
  },
];

// ============================================================================
// EXPORTS
// ============================================================================
const  billingconfig ={
  BILLING_CONFIG,
  STRIPE_CONFIG,
  PLANS,
  FEATURES,
  USAGE_LIMITS,
  TRIAL_CONFIG,
  DISCOUNT_CODES,
  // Helper functions
  getPlanByTier,
  getPublicPlans,
  calculateDiscountedPrice,
  calculateYearlySavings,
  hasFeature,
  getTierFeatures,
  formatPrice,
  formatInterval,
  getStripePriceId,
  calculateReferralReward,
  isEligibleForTrial,
  getTrialEndDate,
  getPlanLimit,
  comparePlans,
};

export default billingconfig;


