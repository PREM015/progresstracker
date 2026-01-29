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

/** Week start options */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

// =============================================================================
// CORE SETTINGS INTERFACES
// =============================================================================

/** Complete user settings */
export interface UserSettings {
  id: string;
  userId: string;
  
  // Appearance
  appearance: AppearanceSettings;
  
  // Localization
  localization: LocalizationSettings;
  
  // Sync
  sync: SyncSettings;
  
  // Privacy
  privacy: PrivacySettings;
  
  // Dashboard
  dashboard: DashboardSettings;
  
  // Features
  features: FeatureSettings;
  
  // Data
  data: DataSettings;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Appearance settings */
export interface AppearanceSettings {
  theme: ThemeMode;
  accentColor: string;
  compactMode: boolean;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
  sidebarCollapsed?: boolean;
  showAnimations?: boolean;
}

/** Localization settings */
export interface LocalizationSettings {
  language: string;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartsOn: WeekStart;
  numberFormat: string;
  currency?: string;
}

/** Sync settings */
export interface SyncSettings {
  autoSync: boolean;
  syncFrequency: SyncFrequency;
  syncOnLogin: boolean;
  syncInBackground: boolean;
  syncNotifications: boolean;
  syncErrorNotifications: boolean;
  preferredSyncTime?: string; // HH:MM format
  pauseSyncUntil?: Date;
}

/** Privacy settings */
export interface PrivacySettings {
  publicProfile: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showActivity: boolean;
  showAchievements: boolean;
  showGoals: boolean;
  showPlatforms: boolean;
  showStreak: boolean;
  showInLeaderboard: boolean;
  allowAnalytics: boolean;
  allowCookies: boolean;
  allowDataCollection: boolean;
}

/** Dashboard settings */
export interface DashboardSettings {
  defaultDateRange: string;
  showWelcomeBanner: boolean;
  layout: DashboardLayout;
  widgets: DashboardWidgetConfig[];
  refreshInterval?: number; // minutes
  defaultView?: 'overview' | 'detailed' | 'minimal';
}

/** Dashboard layout configuration */
export interface DashboardLayout {
  type: 'grid' | 'list' | 'masonry';
  columns?: number;
  gap?: number;
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

/** Feature settings */
export interface FeatureSettings {
  keyboardShortcuts: boolean;
  soundEffects: boolean;
  desktopNotifications: boolean;
  emailDigest: boolean;
  betaFeatures: boolean;
  developerMode: boolean;
  experimentalFeatures?: string[];
}

/** Data settings */
export interface DataSettings {
  dataRetentionDays: number;
  autoDeleteOldData: boolean;
  exportFormat: 'csv' | 'json' | 'pdf';
  backupEnabled: boolean;
  backupFrequency?: 'daily' | 'weekly' | 'monthly';
  lastBackupAt?: Date;
}

// =============================================================================
// NOTIFICATION SETTINGS
// =============================================================================

/** Complete notification preferences */
export interface NotificationSettings {
  id: string;
  userId: string;
  
  // Global
  enabled: boolean;
  
  // Channels
  channels: ChannelSettings;
  
  // Type preferences
  types: NotificationTypeSettings;
  
  // Schedule
  schedule: NotificationSchedule;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Channel settings */
export interface ChannelSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  emailAddress?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
}

/** Notification type settings */
export interface NotificationTypeSettings {
  achievements: boolean;
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

/** Notification schedule */
export interface NotificationSchedule {
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM
  quietHoursEnd: string; // HH:MM
  quietHoursTimezone: string;
  
  // Digest
  digestEnabled: boolean;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
  digestTime: string; // HH:MM
  digestDay: number; // 0-6 for weekly
  
  // Do Not Disturb
  dndEnabled: boolean;
  dndUntil?: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Update settings input */
export interface UpdateSettingsInput {
  appearance?: Partial<AppearanceSettings>;
  localization?: Partial<LocalizationSettings>;
  sync?: Partial<SyncSettings>;
  privacy?: Partial<PrivacySettings>;
  dashboard?: Partial<DashboardSettings>;
  features?: Partial<FeatureSettings>;
  data?: Partial<DataSettings>;
}

/** Update notification settings input */
export interface UpdateNotificationSettingsInput {
  enabled?: boolean;
  channels?: Partial<ChannelSettings>;
  types?: Partial<NotificationTypeSettings>;
  schedule?: Partial<NotificationSchedule>;
}

// =============================================================================
// DEFAULTS
// =============================================================================

/** Default appearance settings */
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'system',
  accentColor: 'blue',
  compactMode: false,
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  sidebarCollapsed: false,
  showAnimations: true,
};

/** Default localization settings */
export const DEFAULT_LOCALIZATION: LocalizationSettings = {
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  weekStartsOn: 0,
  numberFormat: 'en-US',
};

/** Default sync settings */
export const DEFAULT_SYNC: SyncSettings = {
  autoSync: true,
  syncFrequency: 'daily',
  syncOnLogin: true,
  syncInBackground: true,
  syncNotifications: false,
  syncErrorNotifications: true,
};

/** Default privacy settings */
export const DEFAULT_PRIVACY: PrivacySettings = {
  publicProfile: false,
  showEmail: false,
  showLocation: true,
  showActivity: true,
  showAchievements: true,
  showGoals: false,
  showPlatforms: true,
  showStreak: true,
  showInLeaderboard: true,
  allowAnalytics: true,
  allowCookies: true,
  allowDataCollection: false,
};

/** Default dashboard settings */
export const DEFAULT_DASHBOARD: DashboardSettings = {
  defaultDateRange: '7d',
  showWelcomeBanner: true,
  layout: { type: 'grid', columns: 3, gap: 16 },
  widgets: [],
  refreshInterval: 5,
  defaultView: 'overview',
};

/** Default feature settings */
export const DEFAULT_FEATURES: FeatureSettings = {
  keyboardShortcuts: true,
  soundEffects: false,
  desktopNotifications: true,
  emailDigest: false,
  betaFeatures: false,
  developerMode: false,
};

/** Default data settings */
export const DEFAULT_DATA: DataSettings = {
  dataRetentionDays: 365,
  autoDeleteOldData: false,
  exportFormat: 'csv',
  backupEnabled: false,
};

/** Default notification type settings */
export const DEFAULT_NOTIFICATION_TYPES: NotificationTypeSettings = {
  achievements: true,
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Merge settings with defaults */
export function mergeWithDefaults(settings: Partial<UserSettings>): UserSettings {
  return {
    id: settings.id || '',
    userId: settings.userId || '',
    appearance: { ...DEFAULT_APPEARANCE, ...settings.appearance },
    localization: { ...DEFAULT_LOCALIZATION, ...settings.localization },
    sync: { ...DEFAULT_SYNC, ...settings.sync },
    privacy: { ...DEFAULT_PRIVACY, ...settings.privacy },
    dashboard: { ...DEFAULT_DASHBOARD, ...settings.dashboard },
    features: { ...DEFAULT_FEATURES, ...settings.features },
    data: { ...DEFAULT_DATA, ...settings.data },
    createdAt: settings.createdAt || new Date(),
    updatedAt: settings.updatedAt || new Date(),
  };
}

/** Get resolved theme (handles 'system') */
export function getResolvedTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return theme;
}

/** Format date according to settings */
export function formatDateWithSettings(date: Date, format: DateFormat): string {
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

/** Format time according to settings */
export function formatTimeWithSettings(date: Date, format: TimeFormat): string {
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

export default UserSettings;