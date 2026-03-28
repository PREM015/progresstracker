// src/types/system-settings.ts
// System-wide settings types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type MaintenanceMode = 'off' | 'scheduled' | 'active';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** System settings record (matches Prisma SystemSettings model) */
export interface SystemSettings {
  id: string;
  key: string;
  value: string;
  category: SystemSettingsCategory;
  description?: string | null;
  isPublic: boolean; // Can be read by clients
  isEditable: boolean; // Can be changed via admin UI
  dataType: SystemSettingsDataType;
  defaultValue?: string | null;
  allowedValues?: string[] | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SystemSettingsCategory =
  | 'general'
  | 'auth'
  | 'email'
  | 'billing'
  | 'sync'
  | 'platform'
  | 'notifications'
  | 'limits'
  | 'features'
  | 'maintenance';

export type SystemSettingsDataType = 'string' | 'number' | 'boolean' | 'json' | 'array';

/** Parsed system settings as a typed map */
export interface SystemConfig {
  // General
  appName: string;
  appUrl: string;
  supportEmail: string;
  maintenanceMode: MaintenanceMode;
  maintenanceMessage?: string;
  // Auth
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  sessionMaxAgeDays: number;
  // Billing
  stripeEnabled: boolean;
  trialDurationDays: number;
  // Sync
  defaultSyncIntervalHours: number;
  maxSyncRetries: number;
  // Limits
  maxUsersPerPlan: Record<string, number>;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface UpdateSystemSettingInput {
  key: string;
  value: string;
  description?: string;
}

export interface BulkUpdateSystemSettingsInput {
  settings: Array<{ key: string; value: string }>;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface SystemSettingsResponse {
  settings: SystemSettings[];
  total: number;
  byCategory: Record<SystemSettingsCategory, SystemSettings[]>;
}

export default SystemSettings;
