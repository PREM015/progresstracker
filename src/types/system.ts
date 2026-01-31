// src/types/system.ts
// ===== FILE: src/types/system.ts =====
// Complete system types for feature flags and system settings

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Setting category */
export type SettingCategory = 
  | 'general'
  | 'security'
  | 'email'
  | 'sync'
  | 'billing'
  | 'features'
  | 'maintenance'
  | 'advanced';

/** Setting value type */
export type SettingValueType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'array'
  | 'date';

/** Feature flag rollout strategy */
export type RolloutStrategy = 
  | 'all'
  | 'percentage'
  | 'users'
  | 'tiers'
  | 'beta'
  | 'staff';

// =============================================================================
// FEATURE FLAG TYPES
// =============================================================================

/** Feature flag (matches Prisma FeatureFlag model) */
export interface FeatureFlag {
  id: string;

  // Identity
  key: string;
  name: string;
  description?: string;

  // Status
  isEnabled: boolean;

  // Targeting
  enabledForAll: boolean;
  enabledUserIds: string[];
  enabledTiers: string[];
  enabledPercentage: number;

  // Metadata
  metadata?: Record<string, unknown>;

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
  affectedUsers: number;
  formattedDate: string;
}

/** Feature flag evaluation result */
export interface FeatureFlagEvaluation {
  key: string;
  isEnabled: boolean;
  reason: 'all_enabled' | 'user_in_list' | 'tier_match' | 'percentage_match' | 'disabled';
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SYSTEM SETTINGS TYPES
// =============================================================================

/** System setting (matches Prisma SystemSettings model) */
export interface SystemSetting {
  id: string;

  // Identity
  key: string;
  value: unknown;

  // Meta
  description?: string;
  category?: string;

  // Visibility
  isPublic: boolean;

  // Audit
  updatedAt: Date;
  updatedBy?: string;
}

/** System setting for display */
export interface SystemSettingDisplay extends SystemSetting {
  valueType: SettingValueType;
  formattedValue: string;
  categoryLabel: string;
  categoryColor: string;
  isEditable: boolean;
  isSecret: boolean;
}

/** System setting group */
export interface SystemSettingGroup {
  category: SettingCategory;
  label: string;
  icon: string;
  color: string;
  settings: SystemSetting[];
}

// =============================================================================
// APPLICATION CONFIG TYPES
// =============================================================================

/** Application configuration */
export interface AppConfig {
  // General
  appName: string;
  appUrl: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';

  // Features
  features: {
    enableSignup: boolean;
    enableOAuth: boolean;
    enableSync: boolean;
    enableExport: boolean;
    enableNotifications: boolean;
    enableBilling: boolean;
    enableAnalytics: boolean;
  };

  // Limits
  limits: {
    maxPlatformsPerUser: number;
    maxGoalsPerUser: number;
    maxExportsPerMonth: number;
    maxApiRequestsPerDay: number;
    maxFileUploadSize: number; // bytes
  };

  // Sync
  sync: {
    defaultInterval: number; // minutes
    maxRetries: number;
    retryBackoff: number; // seconds
  };

  // Email
  email: {
    enabled: boolean;
    from: string;
    replyTo?: string;
  };

  // Maintenance
  maintenance: {
    mode: boolean;
    message?: string;
    allowedIps: string[];
  };
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
  enabledTiers?: string[];
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
  enabledTiers?: string[];
  enabledPercentage?: number;
  metadata?: Record<string, unknown>;
}

/** Update system setting input */
export interface UpdateSystemSettingInput {
  key: string;
  value: unknown;
  description?: string;
  category?: SettingCategory;
  isPublic?: boolean;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Setting category configuration */
export const SETTING_CATEGORY_CONFIG: Record<SettingCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  general: {
    label: 'General',
    icon: 'Settings',
    color: '#6B7280',
    description: 'General application settings'
  },
  security: {
    label: 'Security',
    icon: 'Shield',
    color: '#EF4444',
    description: 'Security and authentication settings'
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    color: '#3B82F6',
    description: 'Email service configuration'
  },
  sync: {
    label: 'Sync',
    icon: 'RefreshCw',
    color: '#10B981',
    description: 'Platform sync settings'
  },
  billing: {
    label: 'Billing',
    icon: 'CreditCard',
    color: '#F59E0B',
    description: 'Billing and subscription settings'
  },
  features: {
    label: 'Features',
    icon: 'Sparkles',
    color: '#8B5CF6',
    description: 'Feature toggles'
  },
  maintenance: {
    label: 'Maintenance',
    icon: 'Tool',
    color: '#EC4899',
    description: 'Maintenance mode settings'
  },
  advanced: {
    label: 'Advanced',
    icon: 'Code',
    color: '#6366F1',
    description: 'Advanced configuration'
  },
};

/** Rollout strategy configuration */
export const ROLLOUT_STRATEGY_CONFIG: Record<RolloutStrategy, {
  label: string;
  icon: string;
  color: string;
}> = {
  all: {
    label: 'All Users',
    icon: 'Users',
    color: '#10B981'
  },
  percentage: {
    label: 'Percentage Rollout',
    icon: 'Percent',
    color: '#3B82F6'
  },
  users: {
    label: 'Specific Users',
    icon: 'UserCheck',
    color: '#8B5CF6'
  },
  tiers: {
    label: 'By Subscription Tier',
    icon: 'Crown',
    color: '#F59E0B'
  },
  beta: {
    label: 'Beta Users Only',
    icon: 'Beaker',
    color: '#EC4899'
  },
  staff: {
    label: 'Staff Only',
    icon: 'Shield',
    color: '#EF4444'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Determine rollout strategy */
export function determineRolloutStrategy(flag: FeatureFlag): RolloutStrategy {
  if (flag.enabledForAll) return 'all';
  if (flag.enabledUserIds.length > 0) return 'users';
  if (flag.enabledTiers.length > 0) return 'tiers';
  if (flag.enabledPercentage > 0) return 'percentage';
  return 'all';
}

/** Evaluate feature flag for user */
export function evaluateFeatureFlag(
  flag: FeatureFlag,
  userId?: string,
  userTier?: string
): FeatureFlagEvaluation {
  // Flag is disabled
  if (!flag.isEnabled) {
    return { key: flag.key, isEnabled: false, reason: 'disabled' };
  }

  // Enabled for all
  if (flag.enabledForAll) {
    return { key: flag.key, isEnabled: true, reason: 'all_enabled', metadata: flag.metadata };
  }

  // Check user ID
  if (userId && flag.enabledUserIds.includes(userId)) {
    return { key: flag.key, isEnabled: true, reason: 'user_in_list', metadata: flag.metadata };
  }

  // Check tier
  if (userTier && flag.enabledTiers.includes(userTier)) {
    return { key: flag.key, isEnabled: true, reason: 'tier_match', metadata: flag.metadata };
  }

  // Check percentage
  if (flag.enabledPercentage > 0 && userId) {
    const hash = hashString(userId + flag.key);
    const bucket = hash % 100;
    if (bucket < flag.enabledPercentage) {
      return { key: flag.key, isEnabled: true, reason: 'percentage_match', metadata: flag.metadata };
    }
  }

  return { key: flag.key, isEnabled: false, reason: 'disabled' };
}

/** Simple string hash function */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Get setting category config */
export function getSettingCategoryConfig(category: SettingCategory) {
  return SETTING_CATEGORY_CONFIG[category];
}

/** Determine setting value type */
export function determineValueType(value: unknown): SettingValueType {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'json';
  return 'string';
}

/** Format setting value for display */
export function formatSettingValue(value: unknown, type: SettingValueType): string {
  switch (type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      return String(value);
    case 'date':
      return value instanceof Date ? value.toLocaleString() : String(value);
    case 'array':
      return Array.isArray(value) ? value.join(', ') : '[]';
    case 'json':
      return JSON.stringify(value, null, 2);
    case 'string':
    default:
      return String(value);
  }
}

/** Parse setting value from string */
export function parseSettingValue(stringValue: string, type: SettingValueType): unknown {
  switch (type) {
    case 'boolean':
      return stringValue.toLowerCase() === 'true';
    case 'number':
      return parseFloat(stringValue);
    case 'date':
      return new Date(stringValue);
    case 'array':
      return stringValue.split(',').map(s => s.trim());
    case 'json':
      try {
        return JSON.parse(stringValue);
      } catch {
        return stringValue;
      }
    case 'string':
    default:
      return stringValue;
  }
}

/** Check if setting is secret */
export function isSecretSetting(key: string): boolean {
  const secretKeywords = [
    'secret',
    'password',
    'token',
    'key',
    'credential',
    'private',
    'api_key',
  ];
  
  const lowerKey = key.toLowerCase();
  return secretKeywords.some(keyword => lowerKey.includes(keyword));
}

/** Group settings by category */
export function groupSettingsByCategory(settings: SystemSetting[]): SystemSettingGroup[] {
  const grouped = settings.reduce((acc, setting) => {
    const category = (setting.category as SettingCategory) || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<SettingCategory, SystemSetting[]>);

  return Object.entries(grouped).map(([category, categorySettings]) => {
    const config = SETTING_CATEGORY_CONFIG[category as SettingCategory];
    return {
      category: category as SettingCategory,
      label: config.label,
      icon: config.icon,
      color: config.color,
      settings: categorySettings,
    };
  });
}

/** Validate setting value */
export function validateSettingValue(
  key: string,
  value: unknown,
  type: SettingValueType
): { valid: boolean; error?: string } {
  // Type validation
  const actualType = determineValueType(value);
  if (actualType !== type && type !== 'json') {
    return { valid: false, error: `Expected type ${type}, got ${actualType}` };
  }

  // Specific validations
  if (type === 'number' && typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return { valid: false, error: 'Invalid number value' };
    }
  }

  if (type === 'json' && typeof value === 'object') {
    try {
      JSON.stringify(value);
    } catch {
      return { valid: false, error: 'Invalid JSON value' };
    }
  }

  return { valid: true };
}

/** Get default app config */
export function getDefaultAppConfig(): AppConfig {
  return {
    appName: 'Progress Tracker',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    appVersion: '1.0.0',
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
    features: {
      enableSignup: true,
      enableOAuth: true,
      enableSync: true,
      enableExport: true,
      enableNotifications: true,
      enableBilling: true,
      enableAnalytics: true,
    },
    limits: {
      maxPlatformsPerUser: 20,
      maxGoalsPerUser: 50,
      maxExportsPerMonth: 10,
      maxApiRequestsPerDay: 1000,
      maxFileUploadSize: 10 * 1024 * 1024, // 10MB
    },
    sync: {
      defaultInterval: 1440, // 24 hours
      maxRetries: 3,
      retryBackoff: 60, // 1 minute
    },
    email: {
      enabled: true,
      from: process.env.EMAIL_FROM || 'noreply@progresstracker.com',
    },
    maintenance: {
      mode: false,
      allowedIps: [],
    },
  };
}

export default FeatureFlag;