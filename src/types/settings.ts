// src/types/settings.ts
// ===== FILE: src/types/settings.ts =====
// Complete settings types matching Prisma schema

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Theme options */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Font size options */
export type FontSize = 'small' | 'medium' | 'large';

/** Time format options */
export type TimeFormat = '12h' | '24h';

/** Date format options */
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

/** Sync frequency options */
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'manual';

/** Digest frequency options */
export type DigestFrequency = 'realtime' | 'daily' | 'weekly';

/** Week start options */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

// =============================================================================
// DATABASE MODELS - Match Prisma Schema Exactly
// =============================================================================

/**
 * UserSettings model from Prisma schema
 * This matches the flat structure in the database
 */
export interface UserSettings {
  id: string;
  userId: string;

  // Appearance
  theme: string;
  accentColor: string;
  compactMode: boolean;
  fontSize: string;
  reducedMotion: boolean;
  highContrast: boolean;

  // Localization
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  weekStartsOn: number;
  numberFormat: string;

  // Sync Preferences
  autoSync: boolean;
  syncFrequency: string;
  syncOnLogin: boolean;
  syncInBackground: boolean;

  // Privacy
  publicProfile: boolean;
  showInLeaderboard: boolean;
  allowAnalytics: boolean;
  allowCookies: boolean;

  // Dashboard
  dashboardLayout: DashboardLayoutConfig | null;
  defaultDateRange: string;
  showWelcomeBanner: boolean;

  // Features
  keyboardShortcuts: boolean;
  soundEffects: boolean;
  desktopNotifications: boolean;

  // Data
  dataRetentionDays: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NotificationPreferences model from Prisma schema
 */
export interface NotificationPreferences {
  id: string;
  userId: string;

  // Global Settings
  enabled: boolean;

  // Channels
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;

  // Email Preferences
  emailAddress?: string;
  emailVerified: boolean;

  // Notification Types
  achievementAlerts: boolean;
  goalReminders: boolean;
  goalCompleted: boolean;
  streakAlerts: boolean;
  syncComplete: boolean;
  syncFailed: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  securityAlerts: boolean;
  billingAlerts: boolean;
  newFeatures: boolean;
  tips: boolean;
  communityUpdates: boolean;
  marketingEmails: boolean;

  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;

  // Digest Settings
  digestEnabled: boolean;
  digestFrequency: string;
  digestTime: string;
  digestDay: number;

  // DND
  dndEnabled: boolean;
  dndUntil: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// DASHBOARD LAYOUT TYPES (for JSON field)
// =============================================================================

/** Dashboard layout configuration (stored as JSON in database) */
export interface DashboardLayoutConfig {
  type: 'grid' | 'list' | 'masonry';
  columns?: number;
  gap?: number;
  widgets?: DashboardWidgetConfig[];
}

/** Dashboard widget configuration */
export interface DashboardWidgetConfig {
  id: string;
  type: string;
  title?: string;
  visible: boolean;
  position: { row: number; col: number };
  size: { width: number; height: number };
  config?: Record<string, unknown>;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Update profile request - matches User model fields - FIXED: avatar -> image
 */
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  username?: string;
  bio?: string;
  image?: string; // ✅ FIXED: Changed from avatar to image
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  discordUsername?: string;
}

/**
 * Update settings request - flat structure matching UserSettings model
 */
export interface UpdateSettingsRequest {
  // Appearance
  theme?: string;
  accentColor?: string;
  compactMode?: boolean;
  fontSize?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;

  // Localization
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  weekStartsOn?: number;
  numberFormat?: string;

  // Sync Preferences
  autoSync?: boolean;
  syncFrequency?: string;
  syncOnLogin?: boolean;
  syncInBackground?: boolean;

  // Privacy
  publicProfile?: boolean;
  showInLeaderboard?: boolean;
  allowAnalytics?: boolean;
  allowCookies?: boolean;

  // Dashboard
  dashboardLayout?: DashboardLayoutConfig | null;
  defaultDateRange?: string;
  showWelcomeBanner?: boolean;

  // Features
  keyboardShortcuts?: boolean;
  soundEffects?: boolean;
  desktopNotifications?: boolean;

  // Data
  dataRetentionDays?: number;
}

/**
 * Update notifications request - flat structure matching NotificationPreferences model
 */
export interface UpdateNotificationsRequest {
  // Global Settings
  enabled?: boolean;

  // Channels
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;

  // Email Preferences
  emailAddress?: string;

  // Notification Types
  achievementAlerts?: boolean;
  goalReminders?: boolean;
  goalCompleted?: boolean;
  streakAlerts?: boolean;
  syncComplete?: boolean;
  syncFailed?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  securityAlerts?: boolean;
  billingAlerts?: boolean;
  newFeatures?: boolean;
  tips?: boolean;
  communityUpdates?: boolean;
  marketingEmails?: boolean;

  // Quiet Hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;

  // Digest Settings
  digestEnabled?: boolean;
  digestFrequency?: string;
  digestTime?: string;
  digestDay?: number;

  // DND
  dndEnabled?: boolean;
  dndUntil?: Date | null;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Delete account request
 */
export interface DeleteAccountRequest {
  password: string;
  confirmation?: string;
}

/**
 * Update user profile input - FIXED: avatar -> image
 */
export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  image?: string; // ✅ FIXED: Changed from avatar to image
}

// =============================================================================
// GROUPED SETTINGS TYPES (for UI organization)
// =============================================================================

/** Appearance settings group (for UI) */
export interface AppearanceSettingsGroup {
  theme: ThemeMode;
  accentColor: string;
  compactMode: boolean;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
}

/** Localization settings group (for UI) */
export interface LocalizationSettingsGroup {
  language: string;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStart;
  numberFormat: string;
}

/** Sync settings group (for UI) */
export interface SyncSettingsGroup {
  autoSync: boolean;
  syncFrequency: SyncFrequency;
  syncOnLogin: boolean;
  syncInBackground: boolean;
}

/** Privacy settings group (for UI) */
export interface PrivacySettingsGroup {
  publicProfile: boolean;
  showInLeaderboard: boolean;
  allowAnalytics: boolean;
  allowCookies: boolean;
}

/** Feature settings group (for UI) */
export interface FeatureSettingsGroup {
  keyboardShortcuts: boolean;
  soundEffects: boolean;
  desktopNotifications: boolean;
}

/** Notification channels group (for UI) */
export interface NotificationChannelsGroup {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
}

/** Notification types group (for UI) */
export interface NotificationTypesGroup {
  achievementAlerts: boolean;
  goalReminders: boolean;
  goalCompleted: boolean;
  streakAlerts: boolean;
  syncComplete: boolean;
  syncFailed: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  securityAlerts: boolean;
  billingAlerts: boolean;
  newFeatures: boolean;
  tips: boolean;
  communityUpdates: boolean;
  marketingEmails: boolean;
}

/** Quiet hours settings group (for UI) */
export interface QuietHoursGroup {
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
}

/** Digest settings group (for UI) */
export interface DigestSettingsGroup {
  digestEnabled: boolean;
  digestFrequency: DigestFrequency;
  digestTime: string;
  digestDay: number;
}

// =============================================================================
// USER PROFILE VISIBILITY SETTINGS (from User model)
// =============================================================================

/** Profile visibility settings (stored on User model) */
export interface ProfileVisibilitySettings {
  isPublic: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showActivity: boolean;
  showAchievements: boolean;
  showGoals: boolean;
  showPlatforms: boolean;
  showStreak: boolean;
}

/** Update profile visibility request */
export interface UpdateProfileVisibilityRequest {
  isPublic?: boolean;
  showEmail?: boolean;
  showLocation?: boolean;
  showActivity?: boolean;
  showAchievements?: boolean;
  showGoals?: boolean;
  showPlatforms?: boolean;
  showStreak?: boolean;
}

// =============================================================================
// DEFAULTS - Match Prisma Schema Defaults
// =============================================================================

/** Default user settings (matches Prisma defaults) */
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  // Appearance
  theme: 'system',
  accentColor: 'blue',
  compactMode: false,
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,

  // Localization
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  weekStartsOn: 0,
  numberFormat: 'en-US',

  // Sync Preferences
  autoSync: true,
  syncFrequency: 'daily',
  syncOnLogin: true,
  syncInBackground: true,

  // Privacy
  publicProfile: false,
  showInLeaderboard: true,
  allowAnalytics: true,
  allowCookies: true,

  // Dashboard
  dashboardLayout: null,
  defaultDateRange: '7d',
  showWelcomeBanner: true,

  // Features
  keyboardShortcuts: true,
  soundEffects: false,
  desktopNotifications: true,

  // Data
  dataRetentionDays: 365,
};

/** Default notification preferences (matches Prisma defaults) */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  // Global Settings
  enabled: true,

  // Channels
  emailEnabled: true,
  pushEnabled: false,
  inAppEnabled: true,
  smsEnabled: false,

  // Email Preferences
  emailAddress: undefined,
  emailVerified: false,

  // Notification Types
  achievementAlerts: true,
  goalReminders: true,
  goalCompleted: true,
  streakAlerts: true,
  syncComplete: false,
  syncFailed: true,
  weeklyReport: true,
  monthlyReport: true,
  securityAlerts: true,
  billingAlerts: true,
  newFeatures: true,
  tips: true,
  communityUpdates: false,
  marketingEmails: false,

  // Quiet Hours
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  quietHoursTimezone: 'UTC',

  // Digest Settings
  digestEnabled: false,
  digestFrequency: 'daily',
  digestTime: '09:00',
  digestDay: 1,

  // DND
  dndEnabled: false,
  dndUntil: null,
};

/** Default profile visibility (matches Prisma User model defaults) */
export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibilitySettings = {
  isPublic: false,
  showEmail: false,
  showLocation: true,
  showActivity: true,
  showAchievements: true,
  showGoals: false,
  showPlatforms: true,
  showStreak: true,
};

// =============================================================================
// CONFIGURATION OPTIONS
// =============================================================================

/** Available themes */
export const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: 'Sun' },
  { value: 'dark', label: 'Dark', icon: 'Moon' },
  { value: 'system', label: 'System', icon: 'Monitor' },
];

/** Available accent colors */
export const ACCENT_COLORS: Array<{ value: string; label: string; color: string }> = [
  { value: 'blue', label: 'Blue', color: '#3B82F6' },
  { value: 'indigo', label: 'Indigo', color: '#6366F1' },
  { value: 'purple', label: 'Purple', color: '#8B5CF6' },
  { value: 'pink', label: 'Pink', color: '#EC4899' },
  { value: 'red', label: 'Red', color: '#EF4444' },
  { value: 'orange', label: 'Orange', color: '#F97316' },
  { value: 'yellow', label: 'Yellow', color: '#F59E0B' },
  { value: 'green', label: 'Green', color: '#10B981' },
  { value: 'teal', label: 'Teal', color: '#14B8A6' },
  { value: 'cyan', label: 'Cyan', color: '#06B6D4' },
];

/** Available font sizes */
export const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

/** Available languages */
export const LANGUAGE_OPTIONS: Array<{ value: string; label: string; native: string }> = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'es', label: 'Spanish', native: 'Español' },
  { value: 'fr', label: 'French', native: 'Français' },
  { value: 'de', label: 'German', native: 'Deutsch' },
  { value: 'pt', label: 'Portuguese', native: 'Português' },
  { value: 'zh', label: 'Chinese', native: '中文' },
  { value: 'ja', label: 'Japanese', native: '日本語' },
  { value: 'ko', label: 'Korean', native: '한국어' },
  { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

/** Common timezones */
export const TIMEZONE_OPTIONS: Array<{ value: string; label: string; offset: string }> = [
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'America/New_York', label: 'Eastern Time', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', offset: '-08:00' },
  { value: 'Europe/London', label: 'London', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: '+01:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: '+08:00' },
  { value: 'Asia/Kolkata', label: 'India', offset: '+05:30' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: '+11:00' },
];

/** Date format options */
export const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string; example: string }> = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
];

/** Time format options */
export const TIME_FORMAT_OPTIONS: Array<{ value: TimeFormat; label: string; example: string }> = [
  { value: '12h', label: '12-hour', example: '2:30 PM' },
  { value: '24h', label: '24-hour', example: '14:30' },
];

/** Week start options */
export const WEEK_START_OPTIONS: Array<{ value: WeekStart; label: string }> = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 6, label: 'Saturday' },
];

/** Sync frequency options */
export const SYNC_FREQUENCY_OPTIONS: Array<{ value: SyncFrequency; label: string; description: string }> = [
  { value: 'realtime', label: 'Real-time', description: 'Sync immediately when changes occur' },
  { value: 'hourly', label: 'Hourly', description: 'Sync once every hour' },
  { value: 'daily', label: 'Daily', description: 'Sync once per day' },
  { value: 'manual', label: 'Manual', description: 'Only sync when you request it' },
];

/** Digest frequency options */
export const DIGEST_FREQUENCY_OPTIONS: Array<{ value: DigestFrequency; label: string }> = [
  { value: 'realtime', label: 'Immediate' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
];

/** Default date range options */
export const DATE_RANGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Merge partial settings with defaults
 */
export function mergeSettingsWithDefaults(
  partial: Partial<UpdateSettingsRequest>
): UpdateSettingsRequest {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...partial,
  };
}

/**
 * Merge partial notification preferences with defaults
 */
export function mergeNotificationsWithDefaults(
  partial: Partial<UpdateNotificationsRequest>
): UpdateNotificationsRequest {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...partial,
  };
}

/**
 * Get resolved theme (handles 'system')
 */
export function getResolvedTheme(theme: ThemeMode | string): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme as 'light' | 'dark';
}

/**
 * Format date according to settings
 */
export function formatDateWithSettings(date: Date | string, format: DateFormat | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Format time according to settings
 */
export function formatTimeWithSettings(date: Date | string, format: TimeFormat | string): string {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

/**
 * Parse time string to Date
 */
export function parseTimeString(timeStr: string, baseDate?: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(
  quietHoursStart: string,
  quietHoursEnd: string,
  timezone: string = 'UTC'
): boolean {
  const now = new Date();
  
  // Simple implementation - for production, use a proper timezone library
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });

  const current = currentTime.replace(':', '');
  const start = quietHoursStart.replace(':', '');
  const end = quietHoursEnd.replace(':', '');

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return current >= start || current < end;
  }

  return current >= start && current < end;
}

/**
 * Validate settings update request
 */
export function validateSettingsUpdate(data: UpdateSettingsRequest): string[] {
  const errors: string[] = [];

  if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
    errors.push('Invalid theme value');
  }

  if (data.fontSize && !['small', 'medium', 'large'].includes(data.fontSize)) {
    errors.push('Invalid font size value');
  }

  if (data.weekStartsOn !== undefined && (data.weekStartsOn < 0 || data.weekStartsOn > 6)) {
    errors.push('Week start day must be between 0 and 6');
  }

  if (data.dataRetentionDays !== undefined && data.dataRetentionDays < 30) {
    errors.push('Data retention must be at least 30 days');
  }

  return errors;
}

/**
 * Validate notification settings update request
 */
export function validateNotificationsUpdate(data: UpdateNotificationsRequest): string[] {
  const errors: string[] = [];

  if (data.quietHoursStart && !/^\d{2}:\d{2}$/.test(data.quietHoursStart)) {
    errors.push('Invalid quiet hours start time format (use HH:MM)');
  }

  if (data.quietHoursEnd && !/^\d{2}:\d{2}$/.test(data.quietHoursEnd)) {
    errors.push('Invalid quiet hours end time format (use HH:MM)');
  }

  if (data.digestTime && !/^\d{2}:\d{2}$/.test(data.digestTime)) {
    errors.push('Invalid digest time format (use HH:MM)');
  }

  if (data.digestDay !== undefined && (data.digestDay < 0 || data.digestDay > 6)) {
    errors.push('Digest day must be between 0 and 6');
  }

  return errors;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isValidTheme(value: unknown): value is ThemeMode {
  return typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
}

export function isValidFontSize(value: unknown): value is FontSize {
  return typeof value === 'string' && ['small', 'medium', 'large'].includes(value);
}

export function isValidTimeFormat(value: unknown): value is TimeFormat {
  return typeof value === 'string' && ['12h', '24h'].includes(value);
}

export function isValidDateFormat(value: unknown): value is DateFormat {
  return typeof value === 'string' && ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(value);
}

export function isValidSyncFrequency(value: unknown): value is SyncFrequency {
  return typeof value === 'string' && ['realtime', 'hourly', 'daily', 'manual'].includes(value);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  UserSettings as Settings,
  NotificationPreferences as NotificationSettings,
};