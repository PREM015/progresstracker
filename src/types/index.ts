// src/types/index.ts
// ===== FILE: src/types/index.ts =====
// Central export file for all types

// ============================================================================
// CORE TYPES
// ============================================================================

export * from './user';
export * from './platform';
export * from './tracker';
export * from './achievement';

// ============================================================================
// GOAL TYPES (explicit to avoid GoalProgress conflict with report.ts)
// ============================================================================

export type {
  GoalType,
  GoalStatus,
  GoalMetric,
  GoalCategory,
  Goal,
  GoalReminder,
  GoalWithProgress,
  GoalStats,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalFormData,
  GoalFilter,
  GoalSortOptions,
  GoalTemplate,
  GoalMilestone,
  GoalBestDay,
} from './goal';

// Re-export GoalProgress explicitly from goal.ts (not report.ts)
export type { GoalProgress } from './goal';

// ============================================================================
// ANALYTICS & STATS
// ============================================================================

export type {
  DateGrouping,
  TimeRange,
  ChartType,
  InsightType,
  InsightPriority,
  ComparisonPeriod,
  TrendDirection,
  Stats,
  PlatformStat,
  CategoryStat,
  Activity,
  ChartDataPoint,
  TimeSeriesPoint,
  MultiSeriesData,
  MonthlyData,
  HeatmapData,
  TrendData,
  PieChartData,
  RadarChartData,
  ComparisonData,
  ChangeMetric,
  Insight,
  WeeklyReport,
  MonthlyReport,
  AnalyticsQuery,
  DashboardWidget,
  AnalyticsExportOptions,
  calculateChange,
  getTrendDirection,
  calculateActivityLevel,
  getTimeRangeDates,
  getInsightColor,
  getInsightIcon,
} from './analytics';

// Re-export formatDuration explicitly from analytics (not maintenance)
export { formatDuration as formatAnalyticsDuration } from './analytics';

// ============================================================================
// SYNC & SCRAPER (explicit to avoid ScrapedData/ScraperResult conflicts)
// ============================================================================

export type {
  SyncStatus,
  SyncJob,
  SyncPlatformStatus,
  SyncRequestOptions,
  SyncResult,
  SyncLogEntry,
  SyncQueueStatus,
  GitHubWebhookPayload,
  GitLabWebhookPayload,
  BitbucketWebhookPayload,
  PlatformSyncConfig,
  toPrismaSyncStatus,
} from './sync';

// Re-export from sync explicitly
export type { ScrapedData as SyncScrapedData, ScraperResult as SyncScraperResult } from './sync';

export type {
  ScraperStatus,
  ScraperMethod,
  DataSourceType,
  ScraperAuthMethod,
  ScraperConfig,
  ScraperEndpoint,
  EndpointParam,
  ScraperSelectors,
  SelectorConfig,
  DataTransformer,
  ProxyConfig,
  ScrapedProfile,
  ScrapedStats,
  ScrapedActivity,
  ScrapedSubmission,
  ScrapedProblem,
  ScrapedContest,
  ScrapedContribution,
  ScrapedCourse,
  ScrapedCertification,
  ScrapedProject,
  ScraperMetadata,
  ScraperError,
  ScraperErrorCode,
  PlatformScraperInfo,
  SCRAPER_REGISTRY,
  isRetryableError,
  getRetryDelay,
  createScraperError,
  normalizeScrapedData,
} from './scraper';

// Re-export from scraper explicitly  
export type { ScrapedData as ScraperScrapedData, ScraperResult as ScraperScraperResult } from './scraper';

// ============================================================================
// NOTIFICATIONS (explicit to avoid NotificationPreferences/sortByPriority conflicts)
// ============================================================================

export type {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  Notification,
  NotificationGroup,
  NotificationStats,
  CreateNotificationInput,
  UpdateNotificationPreferencesInput,
  MarkNotificationsInput,
  NotificationFilter,
  PushSubscription,
  NOTIFICATION_TYPE_CONFIG,
  PRIORITY_CONFIG,
  CHANNEL_CONFIG,
  getNotificationTypeConfig,
  getPriorityConfig,
  isNotificationExpired,
  groupNotificationsByType,
  formatNotificationTime,
  isInQuietHours,
} from './notification';

// Re-export NotificationPreferences from notification (not settings)
export type { NotificationPreferences } from './notification';

// Re-export sortByPriority from notification (renamed to avoid conflict)
export { sortByPriority as sortNotificationsByPriority } from './notification';

// ============================================================================
// SETTINGS & PREFERENCES
// ============================================================================

export type {
  ThemeMode,
  FontSize,
  TimeFormat,
  DateFormat,
  SyncFrequency,
  DigestFrequency,
  WeekStart,
  UserSettings,
  DashboardLayoutConfig,
  DashboardWidgetConfig,
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateNotificationsRequest,
  ChangePasswordRequest,
  DeleteAccountRequest,
  AppearanceSettingsGroup,
  LocalizationSettingsGroup,
  SyncSettingsGroup,
  PrivacySettingsGroup,
  FeatureSettingsGroup,
  NotificationChannelsGroup,
  NotificationTypesGroup,
  QuietHoursGroup,
  DigestSettingsGroup,
  ProfileVisibilitySettings,
  UpdateProfileVisibilityRequest,
  DEFAULT_USER_SETTINGS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_PROFILE_VISIBILITY,
  THEME_OPTIONS,
  ACCENT_COLORS,
  FONT_SIZE_OPTIONS,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  WEEK_START_OPTIONS,
  SYNC_FREQUENCY_OPTIONS,
  DIGEST_FREQUENCY_OPTIONS,
  DATE_RANGE_OPTIONS,
  mergeSettingsWithDefaults,
  mergeNotificationsWithDefaults,
  getResolvedTheme,
  formatDateWithSettings,
  formatTimeWithSettings,
  parseTimeString,
  isWithinQuietHours,
  validateSettingsUpdate,
  validateNotificationsUpdate,
  isValidTheme,
  isValidFontSize,
  isValidTimeFormat,
  isValidDateFormat,
  isValidSyncFrequency,
} from './settings';

// Re-export as aliases to avoid conflicts
export type { UserSettings as Settings, NotificationPreferences as NotificationSettings } from './settings';

// ============================================================================
// EXPORT
// ============================================================================

export * from './export';

//===========================================================================
// EMAILS & COMMUNICATION
// ============================================================================
export * from './email';

// ============================================================================
// API & REQUESTS
// ============================================================================

export * from './api';

// ============================================================================
// AUTH & OAUTH
// ============================================================================

export * from './oauth';

// ============================================================================
// SECURITY (explicit exports to avoid conflicts)
// ============================================================================

export type {
  SecurityEventType,
  SessionStatus,
  DeviceType,
  TwoFactorMethod,
  RefreshToken,
  PasswordReset,
  EmailVerification,
  EmailChangeRequest,
  TwoFactorAuth,
  BackupCode,
  LoginAttempt,
  LoginHistoryItem,
  Enable2FAInput,
  Verify2FAInput,
  CreateApiKeyInput,
  UpdateApiKeyInput,
  RevokeSessionInput,
  TwoFactorSetupData,
  TwoFactorVerifyInput,
  SuspiciousActivityAlert,
} from './security';

// Re-export with 'Security' prefix to avoid conflicts
export type {
  ActiveSession as SecurityActiveSession,
  SessionDisplay as SecuritySessionDisplay,
  ApiKey as SecurityApiKey,
  ApiKeyDisplay as SecurityApiKeyDisplay,
  SecurityEvent,
} from './security';

export {
  SECURITY_EVENT_CONFIG,
  getSessionStatus,
  determineDeviceType,
  formatDeviceLabel,
  formatLocationLabel,
  isSessionExpiringSoon,
  maskApiKey,
  isApiKeyExpired,
  getDaysUntilExpiry,
  generateBackupCodes,
  hashBackupCode,
  detectSuspiciousLogin,
} from './security';

// ============================================================================
// ADMIN & BILLING
// ============================================================================

export type {
  AdminUser,
  AdminStats,
  SystemHealth,
  ComponentHealth,
  HealthCheck,
  SystemMetrics,
  AdminAction,
  AdminUserFilter,
  UpdateUserAdminRequest,
  CreateFeatureFlagRequest,
  CreateMaintenanceWindowRequest,
  calculateSystemHealth,
  formatUptime,
  formatBytes,
} from './admin';

// Re-export with 'Admin' prefix to avoid conflicts
export type {
  AuditLog as AdminAuditLog,
  AuditLogFilter as AdminAuditLogFilter,
  FeatureFlag as AdminFeatureFlag,
  SystemSetting as AdminSystemSetting,
  MaintenanceWindow as AdminMaintenanceWindow,
} from './admin';

export {
  AUDIT_ACTION_CONFIG as ADMIN_AUDIT_ACTION_CONFIG,
  getAuditActionConfig as getAdminAuditActionConfig,
  getComponentConfig,
} from './admin';

export * from './billing';

// ============================================================================
// AUDIT (explicit to avoid conflicts with admin.ts)
// ============================================================================

export type {
  AuditAction,
  AuditStatus,
  AuditEntityType,
  AuditLogEntry,
  FormattedChange,
  AuditLogSummary,
  CreateAuditLogInput,
  AuditLogSortOptions,
  SuspiciousActivity,
  AuditLogExport,
  formatChanges,
  createAuditLogEntry,
  isSecurityAction,
  isCriticalAction,
  groupLogsByDate,
  getLogsForUser,
  getFailedLoginAttempts,
  detectSuspiciousActivity,
  exportAuditLogs,
} from './audit';

// Re-export to distinguish from admin
export type { AuditLog, AuditLogFilter } from './audit';

export { AUDIT_ACTION_CONFIG, getAuditActionConfig, getAuditStatusConfig } from './audit';

// ============================================================================
// CONTENT & COMMUNICATION
// ============================================================================

export * from './content';

export type {
  NewsletterFrequency,
  SubscriptionStatus as NewsletterSubscriptionStatus,
  NewsletterTopic,
  NewsletterSubscriber,
  NewsletterSubscriberDisplay,
  NewsletterCampaign,
  NewsletterStats,
  SubscribeNewsletterInput,
  UpdateNewsletterSubscriptionInput,
  UnsubscribeNewsletterInput,
  NewsletterFilter,
  NEWSLETTER_FREQUENCY_CONFIG,
  NEWSLETTER_TOPIC_CONFIG,
  SUBSCRIPTION_STATUS_CONFIG as NEWSLETTER_SUBSCRIPTION_STATUS_CONFIG,
  getNewsletterFrequencyConfig,
  getNewsletterTopicConfig,
  getSubscriptionStatusConfig as getNewsletterSubscriptionStatusConfig,
  formatNewsletterSubscriber,
  generateUnsubscribeToken,
  getActiveSubscribers,
  getSubscribersByFrequency,
  getSubscribersByTopic,
  calculateCampaignMetrics,
} from './newsletter';

// Re-export isValidEmail from newsletter (renamed to avoid conflict with waitlist)
export { isValidEmail as isValidNewsletterEmail } from './newsletter';

export {
 
  sortByPriority,
} from './feedback';


export type {
  ReportType,
  ReportStatus,
  ReportFormat,
  ReportDeliveryMethod,
  Report,
  ReportData,
  ReportStats,
  ReportHighlight,
  ReportInsight,
  ReportRecommendation,
  ReportChart,
  ReportComparison,
  PlatformBreakdown,
  CategoryBreakdown,
  DailyActivity,
  AchievementSummary,
  GenerateReportInput,
  ScheduleReportInput,
  ReportFilter,
  REPORT_TYPE_CONFIG,
  REPORT_STATUS_CONFIG,
  getReportTypeConfig,
  getReportStatusConfig,
  generateReportTitle,
  calculateHighlights,
  generateInsights,
  generateRecommendations,
  formatPeriodString,
  calculateComparison,
  validateReportPeriod,
} from './report';

// ============================================================================
// SUPPORT & MAINTENANCE
// ============================================================================

export * from './support';

export type {
  MaintenanceStatus,
  AffectedService,
  MaintenanceSeverity,
  MaintenanceWindowDisplay,
  MaintenanceSummary,
  CreateMaintenanceWindowInput,
  UpdateMaintenanceWindowInput,
  MaintenanceWindowFilter,
  SERVICE_CONFIG,
  MAINTENANCE_STATUS_CONFIG,
  MAINTENANCE_SEVERITY_CONFIG,
  getMaintenanceStatus,
  getTimeUntilStart,
  getTimeUntilEnd,
  calculateDuration as calculateMaintenanceDuration,
  determineSeverity,
  formatMaintenanceWindow,
  isServiceAffected,
  getCurrentMaintenance,
  getUpcomingMaintenance,
  validateMaintenanceWindow,
} from './maintenance';

// Re-export with prefix to avoid conflict with analytics
export { formatDuration as formatMaintenanceDuration } from './maintenance';

// Re-export MaintenanceWindow to avoid conflict with admin
export type { MaintenanceWindow } from './maintenance';

// ============================================================================
// SYSTEM & CONFIGURATION
// ============================================================================

export * from './system';
export * from './waitlist';

// ============================================================================
// RE-EXPORT PRISMA TYPES (for convenience)
// ============================================================================

export type {
  PlatformCategory,
  AuthType,
  SyncStatus as PrismaSyncStatus,
  NotificationType as PrismaNotificationType,
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
  GoalStatus as PrismaGoalStatus,
  GoalType as PrismaGoalType,
  GoalMetric as PrismaGoalMetric,
  SubscriptionStatus,
  SubscriptionTier,
  BillingInterval,
  PaymentStatus,
  ExportFormat as PrismaExportFormat,
  ExportStatus as PrismaExportStatus,
  AuditAction as PrismaAuditAction,
  TicketStatus,
  TicketPriority,
  Role,
} from '@prisma/client';

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

/** Make some properties required */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/** Make some properties optional */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make all properties nullable */
export type Nullable<T> = { [P in keyof T]: T[P] | null };

/** Deep partial type */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/** Extract id from type */
export type IdOf<T extends { id: string }> = T['id'];

/** Pagination params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/** Sort params */
export interface SortParams<T extends string = string> {
  sortBy?: T;
  sortOrder?: 'asc' | 'desc';
}

/** Search params */
export interface SearchParams {
  search?: string;
  searchFields?: string[];
}

/** Common list query params */
export interface ListQueryParams<T extends string = string>
  extends PaginationParams,
    SortParams<T>,
    SearchParams {
  filters?: Record<string, unknown>;
  include?: string[];
}

/** API action result */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Async action result */
export type AsyncActionResult<T = unknown> = Promise<ActionResult<T>>;

/** Form state */
export interface FormState<T = unknown> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

/** Modal state */
export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

/** Toast notification */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

/** Date range */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Time period */
export interface TimePeriod {
  value: number;
  unit: 'day' | 'week' | 'month' | 'year';
}

/** Coordinates */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Address */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/** Common component props */
export interface CommonProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

/** Children prop */
export interface ChildrenProps {
  children: React.ReactNode;
}

/** Loading state prop */
export interface LoadingProps {
  isLoading?: boolean;
  loadingText?: string;
}

/** Error state prop */
export interface ErrorProps {
  error?: string | Error | null;
  onRetry?: () => void;
}

/** Empty state prop */
export interface EmptyProps {
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

/** Combined state props */
export interface StateProps extends LoadingProps, ErrorProps, EmptyProps {}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/** Data fetching hook return */
export interface UseDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (data: T | ((prev: T | null) => T)) => void;
}

/** Pagination hook return */
export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

/** Filter hook return */
export interface UseFilterReturn<T> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (filters: Partial<T>) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof T) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

/** Sort hook return */
export interface UseSortReturn<T extends string> {
  sortBy: T | null;
  sortOrder: 'asc' | 'desc';
  setSort: (field: T, order?: 'asc' | 'desc') => void;
  toggleSort: (field: T) => void;
  clearSort: () => void;
}