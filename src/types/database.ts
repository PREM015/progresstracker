// Auto-generated type definitions for database models
// This file helps with type safety across the application

import type {
  User,
  Platform,
  UserPlatform,
  TrackerEntry,
  Goal,
  Achievement,
  UserAchievement,
  Notification,
  SyncLog,
  DailyStats,
  UserSettings,
  NotificationPreferences,
  Subscription,
  Invoice,
  PaymentMethod,
  ExportJob,
  ScheduledExport,
  SupportTicket,
  ApiKey,
  AuditLog,
  Session,
  Account,
  RefreshToken,
  PasswordReset,
  EmailVerification,
  EmailChangeRequest,
  TwoFactorAuth,
  BackupCode,
  LoginAttempt,
  ActiveSession,
  GoalReminder,
  GoalTemplate,
  CustomPlatform,
  StreakHistory,
  PlatformDailyStats,
  PushSubscription,
  PaymentEvent,
  TicketReply,
  Feedback,
  Waitlist,
  NewsletterSubscriber,
  FeatureFlag,
  SystemSettings,
  MaintenanceWindow,
  BlogPost,
  ChangelogEntry,
  Report,
  VerificationToken,
  Prisma,
  PrismaClient
} from '@prisma/client';

// Re-export for easier imports
export type {
  User,
  Platform,
  UserPlatform,
  TrackerEntry,
  Goal,
  Achievement,
  UserAchievement,
  Notification,
  SyncLog,
  DailyStats,
  UserSettings,
  NotificationPreferences,
  Subscription,
  Invoice,
  PaymentMethod,
  ExportJob,
  ScheduledExport,
  SupportTicket,
  ApiKey,
  AuditLog,
  Session,
  Account,
  RefreshToken,
  PasswordReset,
  EmailVerification,
  EmailChangeRequest,
  TwoFactorAuth,
  BackupCode,
  LoginAttempt,
  ActiveSession,
  GoalReminder,
  GoalTemplate,
  CustomPlatform,
  StreakHistory,
  PlatformDailyStats,
  PushSubscription,
  PaymentEvent,
  TicketReply,
  Feedback,
  Waitlist,
  NewsletterSubscriber,
  FeatureFlag,
  SystemSettings,
  MaintenanceWindow,
  BlogPost,
  ChangelogEntry,
  Report,
  VerificationToken
};

// Common type patterns
export type ID = string;
export type Timestamp = Date | string;
export type Json = Record<string, any>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Prisma query types
export type WhereClause<T> = Prisma.SelectSubset<T, any>;
export type OrderByClause<T> = Prisma.SelectSubset<T, any>;

// Helper types for common patterns
export type WithUser<T> = T & { user: User };
export type WithPlatform<T> = T & { platform: Platform };
export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// Status enums (matching Prisma schema)
export { 
  Role,
  PlatformCategory,
  AuthType,
  SyncStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  GoalStatus,
  GoalType,
  GoalMetric,
  SubscriptionStatus,
  SubscriptionTier,
  BillingInterval,
  PaymentStatus,
  ExportFormat,
  ExportStatus,
  AuditAction,
  TicketStatus,
  TicketPriority
} from '@prisma/client';
