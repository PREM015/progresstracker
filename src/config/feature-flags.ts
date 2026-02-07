// ============================================================================
// FILE: types/feature-flag.ts
// PURPOSE: Feature flag type definitions
// ============================================================================

// ============================================================================

import type {
  SubscriptionTier,



} from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Rollout strategy types */
export type RolloutStrategy =
  | 'all'           // Enabled for all users
  | 'percentage'    // Percentage-based rollout
  | 'users'         // Specific user IDs
  | 'tiers'         // By subscription tier
  | 'beta'          // Beta users only
  | 'staff'         // Staff/admin only
  | 'custom';       // Custom logic

/** Feature flag category */
export type FeatureFlagCategory =
  | 'core'          // Core features
  | 'beta'          // Beta features
  | 'experimental'  // Experimental features
  | 'premium'       // Premium/paid features
  | 'ui'            // UI/UX features
  | 'integration'   // Third-party integrations
  | 'performance'   // Performance optimizations
  | 'security'      // Security features
  | 'admin'         // Admin-only features
  | 'other';        // Other features

/** Feature flag status */
export type FeatureFlagStatus = 'enabled' | 'disabled' | 'partial';

/** Evaluation reason */
export type EvaluationReason =
  | 'all_enabled'      // Flag enabled for all users
  | 'user_in_list'     // User ID in enabled list
  | 'tier_match'       // Subscription tier matches
  | 'percentage_match' // User in percentage rollout
  | 'admin_override'   // Admin user override
  | 'disabled'         // Flag is disabled
  | 'not_found';       // Flag doesn't exist

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Feature flag (matches Prisma FeatureFlag model) */
export interface FeatureFlag {
  id: string;

  // Identity
  key: string;
  name: string;
  description?: string | null;

  // Status
  isEnabled: boolean;

  // Targeting
  enabledForAll: boolean;
  enabledUserIds: string[];
  enabledTiers: SubscriptionTier[];
  enabledPercentage: number;

  // Metadata
  metadata?: Record<string, unknown> | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Feature flag for display */
export interface FeatureFlagDisplay extends FeatureFlag {
  rolloutStrategy: RolloutStrategy;
  rolloutLabel: string;
  statusLabel: string;
  statusColor: string;
  category?: FeatureFlagCategory;
  affectedUsers?: number;
  formattedDate: string;
  isCustom: boolean;
}

/** Feature flag evaluation context */
export interface FeatureFlagContext {
  userId?: string;
  tier?: SubscriptionTier;
  email?: string;
  isAdmin?: boolean;
  isBeta?: boolean;
  customProperties?: Record<string, unknown>;
}

/** Feature flag evaluation result */
export interface FeatureFlagEvaluation {
  key: string;
  isEnabled: boolean;
  reason: EvaluationReason;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/** Feature flag targeting rules */
export interface FeatureFlagTargeting {
  enabledForAll: boolean;
  userIds?: string[];
  tiers?: SubscriptionTier[];
  percentage?: number;
  conditions?: FeatureFlagCondition[];
}

/** Feature flag condition */
export interface FeatureFlagCondition {
  property: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
}

/** User feature flags map */
export interface UserFeatureFlags {
  [key: string]: boolean;
}

/** Feature flag with evaluation */
export interface FeatureFlagWithEvaluation extends FeatureFlag {
  evaluation: FeatureFlagEvaluation;
  isEnabledForUser: boolean;
}

/** Feature flag statistics */
export interface FeatureFlagStats {
  total: number;
  enabled: number;
  disabled: number;
  partial: number;
  byCategory: Record<FeatureFlagCategory, number>;
  byStrategy: Record<RolloutStrategy, number>;
  totalUsers: number;
  affectedUsers: number;
  rolloutPercentage: number;
}

/** Feature flag history entry */
export interface FeatureFlagHistoryEntry {
  id: string;
  flagKey: string;
  action: 'created' | 'enabled' | 'disabled' | 'updated' | 'deleted';
  changes?: Record<string, { old: unknown; new: unknown }>;
  performedBy: string;
  performedAt: Date;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create feature flag input */
export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  enabledForAll?: boolean;
  enabledUserIds?: string[];
  enabledTiers?: SubscriptionTier[];
  enabledPercentage?: number;
  metadata?: Record<string, unknown>;
}

/** Update feature flag input */
export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  enabledForAll?: boolean;
  enabledUserIds?: string[];
  enabledTiers?: SubscriptionTier[];
  enabledPercentage?: number;
  metadata?: Record<string, unknown>;
}

/** Feature flag form data */
export interface FeatureFlagFormData {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutStrategy: RolloutStrategy;
  enabledForAll: boolean;
  enabledUserIds: string[];
  enabledTiers: SubscriptionTier[];
  enabledPercentage: number;
  category?: FeatureFlagCategory;
  metadata?: Record<string, unknown>;
}

/** Batch update feature flags input */
export interface BatchUpdateFeatureFlagsInput {
  flags: Array<{
    key: string;
    isEnabled: boolean;
  }>;
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/** Feature flag filters */
export interface FeatureFlagFilters {
  isEnabled?: boolean;
  category?: FeatureFlagCategory;
  strategy?: RolloutStrategy;
  search?: string;
  tiers?: SubscriptionTier[];
  includeMetadata?: boolean;
}

/** Feature flag sort options */
export interface FeatureFlagSortOptions {
  field: 'key' | 'name' | 'createdAt' | 'updatedAt' | 'isEnabled';
  order: 'asc' | 'desc';
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Single feature flag response */
export interface FeatureFlagResponse {
  success: boolean;
  flag: FeatureFlag | null;
  error?: string;
  requestId?: string;
}

/** Feature flags list response */
export interface FeatureFlagsListResponse {
  success: boolean;
  flags: FeatureFlag[];
  total: number;
  error?: string;
  requestId?: string;
  meta?: {
    authenticated: boolean;
    userTier?: SubscriptionTier | null;
  };
}

/** Feature flag evaluation response */
export interface FeatureFlagEvaluationResponse {
  success: boolean;
  evaluation: FeatureFlagEvaluation;
  error?: string;
  requestId?: string;
}

/** User feature flags response */
export interface UserFeatureFlagsResponse {
  success: boolean;
  flags: UserFeatureFlags;
  enabledFeatures: string[];
  error?: string;
  requestId?: string;
}

/** Feature flag mutation response */
export interface FeatureFlagMutationResponse {
  success: boolean;
  flag?: FeatureFlag;
  error?: string;
  message?: string;
  requestId?: string;
}

/** Feature flag stats response */
export interface FeatureFlagStatsResponse {
  success: boolean;
  stats: FeatureFlagStats;
  error?: string;
  requestId?: string;
}

/** Batch operation response */
export interface BatchFeatureFlagResponse {
  success: boolean;
  updated: number;
  failed: number;
  errors?: Array<{
    key: string;
    error: string;
  }>;
  requestId?: string;
}

// =============================================================================
// PREDEFINED FEATURE FLAGS
// =============================================================================

/** Feature flag keys enum for type safety */
export const FeatureFlagKeys = {
  // Core features
  DARK_MODE: 'dark_mode',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_PDF: 'export_pdf',
  EXPORT_CSV: 'export_csv',
  CUSTOM_PLATFORMS: 'custom_platforms',
  SCHEDULED_EXPORTS: 'scheduled_exports',

  // Sync features
  REALTIME_SYNC: 'realtime_sync',
  AUTO_SYNC: 'auto_sync',
  WEBHOOK_SYNC: 'webhook_sync',
  BATCH_SYNC: 'batch_sync',

  // Beta features
  AI_INSIGHTS: 'ai_insights',
  TEAM_FEATURES: 'team_features',
  WEBHOOKS: 'webhooks',
  API_ACCESS: 'api_access',
  ADVANCED_GOALS: 'advanced_goals',
  SOCIAL_SHARING: 'social_sharing',

  // UI features
  NEW_DASHBOARD: 'new_dashboard',
  COMPACT_MODE: 'compact_mode',
  CUSTOM_THEMES: 'custom_themes',
  RICH_TEXT_EDITOR: 'rich_text_editor',

  // Integration features
  GITHUB_INTEGRATION: 'github_integration',
  SLACK_INTEGRATION: 'slack_integration',
  DISCORD_INTEGRATION: 'discord_integration',
  NOTION_INTEGRATION: 'notion_integration',

  // Premium features
  UNLIMITED_PLATFORMS: 'unlimited_platforms',
  PRIORITY_SUPPORT: 'priority_support',
  WHITE_LABEL: 'white_label',
  SSO: 'sso',

  // Experimental
  MOBILE_APP: 'mobile_app',
  VOICE_COMMANDS: 'voice_commands',
  AR_VISUALIZATIONS: 'ar_visualizations',

  // Admin features
  ADMIN_DASHBOARD: 'admin_dashboard',
  USER_IMPERSONATION: 'user_impersonation',
  FEATURE_FLAG_MANAGEMENT: 'feature_flag_management',
} as const;

export type FeatureFlagKey = typeof FeatureFlagKeys[keyof typeof FeatureFlagKeys];

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Rollout strategy configuration */
export const ROLLOUT_STRATEGY_CONFIG: Record<RolloutStrategy, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  all: {
    label: 'All Users',
    icon: 'Users',
    color: '#10B981',
    description: 'Feature is enabled for all users',
  },
  percentage: {
    label: 'Percentage Rollout',
    icon: 'Percent',
    color: '#3B82F6',
    description: 'Feature is enabled for a percentage of users',
  },
  users: {
    label: 'Specific Users',
    icon: 'UserCheck',
    color: '#8B5CF6',
    description: 'Feature is enabled for specific user IDs',
  },
  tiers: {
    label: 'Subscription Tiers',
    icon: 'Crown',
    color: '#F59E0B',
    description: 'Feature is enabled for specific subscription tiers',
  },
  beta: {
    label: 'Beta Users',
    icon: 'Beaker',
    color: '#EC4899',
    description: 'Feature is enabled for beta testers',
  },
  staff: {
    label: 'Staff Only',
    icon: 'Shield',
    color: '#EF4444',
    description: 'Feature is enabled for staff members only',
  },
  custom: {
    label: 'Custom Rules',
    icon: 'Settings',
    color: '#6B7280',
    description: 'Feature uses custom targeting rules',
  },
};

/** Feature flag category configuration */
export const FEATURE_FLAG_CATEGORY_CONFIG: Record<FeatureFlagCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  core: {
    label: 'Core Features',
    icon: 'Layers',
    color: '#6366F1',
    description: 'Essential platform features',
  },
  beta: {
    label: 'Beta Features',
    icon: 'Beaker',
    color: '#EC4899',
    description: 'Features in beta testing',
  },
  experimental: {
    label: 'Experimental',
    icon: 'FlaskConical',
    color: '#F59E0B',
    description: 'Experimental features under development',
  },
  premium: {
    label: 'Premium Features',
    icon: 'Crown',
    color: '#8B5CF6',
    description: 'Premium subscription features',
  },
  ui: {
    label: 'UI/UX',
    icon: 'Palette',
    color: '#3B82F6',
    description: 'User interface enhancements',
  },
  integration: {
    label: 'Integrations',
    icon: 'Plug',
    color: '#10B981',
    description: 'Third-party integrations',
  },
  performance: {
    label: 'Performance',
    icon: 'Zap',
    color: '#14B8A6',
    description: 'Performance optimizations',
  },
  security: {
    label: 'Security',
    icon: 'Shield',
    color: '#EF4444',
    description: 'Security enhancements',
  },
  admin: {
    label: 'Admin',
    icon: 'Settings',
    color: '#6B7280',
    description: 'Admin-only features',
  },
  other: {
    label: 'Other',
    icon: 'MoreHorizontal',
    color: '#9CA3AF',
    description: 'Other features',
  },
};

/** Feature flag status configuration */
export const FEATURE_FLAG_STATUS_CONFIG: Record<FeatureFlagStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  enabled: {
    label: 'Enabled',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle',
  },
  disabled: {
    label: 'Disabled',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'XCircle',
  },
  partial: {
    label: 'Partial Rollout',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'AlertCircle',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Determine rollout strategy from flag */
export function determineRolloutStrategy(flag: FeatureFlag): RolloutStrategy {
  if (flag.enabledForAll) return 'all';
  if (flag.enabledUserIds.length > 0) return 'users';
  if (flag.enabledTiers.length > 0) return 'tiers';
  if (flag.enabledPercentage > 0 && flag.enabledPercentage < 100) return 'percentage';
  return 'custom';
}

/** Get rollout strategy label */
export function getRolloutStrategyLabel(strategy: RolloutStrategy): string {
  return ROLLOUT_STRATEGY_CONFIG[strategy].label;
}

/** Get rollout strategy config */
export function getRolloutStrategyConfig(strategy: RolloutStrategy) {
  return ROLLOUT_STRATEGY_CONFIG[strategy];
}

/** Get feature flag category config */
export function getFeatureFlagCategoryConfig(category: FeatureFlagCategory) {
  return FEATURE_FLAG_CATEGORY_CONFIG[category];
}

/** Get feature flag status */
export function getFeatureFlagStatus(flag: FeatureFlag): FeatureFlagStatus {
  if (!flag.isEnabled) return 'disabled';
  if (flag.enabledForAll) return 'enabled';
  return 'partial';
}

/** Get feature flag status config */
export function getFeatureFlagStatusConfig(status: FeatureFlagStatus) {
  return FEATURE_FLAG_STATUS_CONFIG[status];
}

/** Hash user ID for percentage rollout */
export function hashUserIdForRollout(userId: string, flagKey: string): number {
  const combined = `${userId}:${flagKey}`;
  let hash = 0;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash) % 100;
}

/** Evaluate feature flag */
export function evaluateFeatureFlag(
  flag: FeatureFlag,
  context: FeatureFlagContext
): FeatureFlagEvaluation {
  // Flag is disabled
  if (!flag.isEnabled) {
    return {
      key: flag.key,
      isEnabled: false,
      reason: 'disabled',
      timestamp: new Date(),
    };
  }

  // Admin override
  if (context.isAdmin) {
    return {
      key: flag.key,
      isEnabled: true,
      reason: 'admin_override',
      metadata: flag.metadata || undefined,
      timestamp: new Date(),
    };
  }

  // Enabled for all
  if (flag.enabledForAll) {
    return {
      key: flag.key,
      isEnabled: true,
      reason: 'all_enabled',
      metadata: flag.metadata || undefined,
      timestamp: new Date(),
    };
  }

  // Check user ID
  if (context.userId && flag.enabledUserIds.includes(context.userId)) {
    return {
      key: flag.key,
      isEnabled: true,
      reason: 'user_in_list',
      metadata: flag.metadata || undefined,
      timestamp: new Date(),
    };
  }

  // Check tier
  if (context.tier && flag.enabledTiers.includes(context.tier)) {
    return {
      key: flag.key,
      isEnabled: true,
      reason: 'tier_match',
      metadata: flag.metadata || undefined,
      timestamp: new Date(),
    };
  }

  // Check percentage
  if (flag.enabledPercentage > 0 && context.userId) {
    const hash = hashUserIdForRollout(context.userId, flag.key);
    if (hash < flag.enabledPercentage) {
      return {
        key: flag.key,
        isEnabled: true,
        reason: 'percentage_match',
        metadata: flag.metadata || undefined,
        timestamp: new Date(),
      };
    }
  }

  return {
    key: flag.key,
    isEnabled: false,
    reason: 'disabled',
    timestamp: new Date(),
  };
}

/** Evaluate multiple feature flags for user */
export function evaluateUserFeatureFlags(
  flags: FeatureFlag[],
  context: FeatureFlagContext
): UserFeatureFlags {
  const result: UserFeatureFlags = {};

  for (const flag of flags) {
    const evaluation = evaluateFeatureFlag(flag, context);
    result[flag.key] = evaluation.isEnabled;
  }

  return result;
}

/** Get enabled features for user */
export function getEnabledFeatures(
  flags: FeatureFlag[],
  context: FeatureFlagContext
): string[] {
  return flags
    .filter(flag => evaluateFeatureFlag(flag, context).isEnabled)
    .map(flag => flag.key);
}

/** Validate feature flag key */
export function isValidFeatureFlagKey(key: string): boolean {
  // Key must be lowercase, alphanumeric, underscores only
  const keyRegex = /^[a-z0-9_]+$/;
  return keyRegex.test(key) && key.length >= 2 && key.length <= 100;
}

/** Validate percentage value */
export function isValidPercentage(value: number): boolean {
  return value >= 0 && value <= 100 && Number.isInteger(value);
}

/** Validate feature flag input */
export function validateFeatureFlagInput(input: CreateFeatureFlagInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.key || !isValidFeatureFlagKey(input.key)) {
    errors.push('Invalid key format (lowercase, alphanumeric, underscores only)');
  }

  if (!input.name || input.name.trim().length < 3) {
    errors.push('Name must be at least 3 characters');
  }

  if (input.name && input.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  if (input.description && input.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  if (input.enabledPercentage !== undefined && !isValidPercentage(input.enabledPercentage)) {
    errors.push('Percentage must be between 0 and 100');
  }

  if (input.enabledUserIds && input.enabledUserIds.length > 1000) {
    errors.push('Maximum 1000 user IDs allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/** Format feature flag for display */
export function formatFeatureFlagForDisplay(flag: FeatureFlag): FeatureFlagDisplay {
  const rolloutStrategy = determineRolloutStrategy(flag);
  const status = getFeatureFlagStatus(flag);
  const statusConfig = getFeatureFlagStatusConfig(status);
  const strategyConfig = getRolloutStrategyConfig(rolloutStrategy);

  return {
    ...flag,
    rolloutStrategy,
    rolloutLabel: strategyConfig.label,
    statusLabel: statusConfig.label,
    statusColor: statusConfig.color,
    category: flag.metadata?.category as FeatureFlagCategory | undefined,
    formattedDate: flag.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    isCustom: rolloutStrategy === 'custom',
  };
}

/** Calculate affected users estimate */
export function estimateAffectedUsers(
  flag: FeatureFlag,
  totalUsers: number
): number {
  if (!flag.isEnabled) return 0;
  if (flag.enabledForAll) return totalUsers;
  if (flag.enabledUserIds.length > 0) return flag.enabledUserIds.length;
  if (flag.enabledPercentage > 0) {
    return Math.round((totalUsers * flag.enabledPercentage) / 100);
  }
  return 0;
}

/** Group flags by category */
export function groupFlagsByCategory(flags: FeatureFlag[]): Record<FeatureFlagCategory, FeatureFlag[]> {
  const grouped: Record<FeatureFlagCategory, FeatureFlag[]> = {
    core: [],
    beta: [],
    experimental: [],
    premium: [],
    ui: [],
    integration: [],
    performance: [],
    security: [],
    admin: [],
    other: [],
  };

  for (const flag of flags) {
    const category = (flag.metadata?.category as FeatureFlagCategory) || 'other';
    if (grouped[category]) {
      grouped[category].push(flag);
    } else {
      grouped.other.push(flag);
    }
  }

  return grouped;
}

/** Calculate feature flag statistics */
export function calculateFeatureFlagStats(flags: FeatureFlag[], totalUsers: number = 0): FeatureFlagStats {
  const byCategory: Record<FeatureFlagCategory, number> = {
    core: 0,
    beta: 0,
    experimental: 0,
    premium: 0,
    ui: 0,
    integration: 0,
    performance: 0,
    security: 0,
    admin: 0,
    other: 0,
  };

  const byStrategy: Record<RolloutStrategy, number> = {
    all: 0,
    percentage: 0,
    users: 0,
    tiers: 0,
    beta: 0,
    staff: 0,
    custom: 0,
  };

  let enabled = 0;
  let disabled = 0;
  let partial = 0;
  let totalAffected = 0;

  for (const flag of flags) {
    const status = getFeatureFlagStatus(flag);
    const strategy = determineRolloutStrategy(flag);
    const category = (flag.metadata?.category as FeatureFlagCategory) || 'other';

    if (status === 'enabled') enabled++;
    else if (status === 'disabled') disabled++;
    else partial++;

    byCategory[category]++;
    byStrategy[strategy]++;

    totalAffected += estimateAffectedUsers(flag, totalUsers);
  }

  return {
    total: flags.length,
    enabled,
    disabled,
    partial,
    byCategory,
    byStrategy,
    totalUsers,
    affectedUsers: totalAffected,
    rolloutPercentage: totalUsers > 0 ? Math.round((totalAffected / totalUsers) * 100) : 0,
  };
}

export default FeatureFlag;