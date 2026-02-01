// src/types/email.ts
// Email types synced with Prisma schema - Fixed version without unused imports

import type {
  User,
  Platform,
  UserPlatform,
  Goal,
  Achievement,
  Subscription,
  Invoice,
  SupportTicket,
  TicketReply,
  SyncLog,
  Report,
  
  
  MaintenanceWindow,
  NewsletterSubscriber,
  Waitlist,
} from '@prisma/client';

// ============================================================================
// BASE TYPES
// ============================================================================

export type EmailUser = Pick<
  User,
  'id' | 'name' | 'email' | 'username' | 'preferredLanguage' | 'timezone'
>;

export interface BaseEmailProps {
  user: EmailUser;
  unsubscribeToken?: string;
}

// ============================================================================
// AUTH EMAIL PROPS
// ============================================================================

export interface WelcomeEmailProps {
  userName: string;
  email: string;
  onboardingUrl: string;
}

export interface VerifyEmailProps {
  userName: string;
  verificationUrl: string;
  verificationCode?: string;
  expiresIn: string;
}

export interface PasswordResetProps {
  userName: string;
  resetUrl: string;
  expiresIn: string;
  ipAddress?: string;
  device?: string;
}

export interface PasswordChangedProps {
  userName: string;
  changedAt: string;
  ipAddress: string;
  device: string;
  location?: string;
}

export interface EmailChangeRequestProps {
  userName: string;
  currentEmail: string;
  newEmail: string;
  verificationUrl: string;
  expiresIn: string;
  ipAddress?: string;
}

export interface EmailChangedProps {
  userName: string;
  oldEmail: string;
  newEmail: string;
  changedAt: string;
  ipAddress: string;
}

// ============================================================================
// SECURITY EMAIL PROPS
// ============================================================================

export interface LoginAlertProps {
  userName: string;
  loginTime: string;
  ipAddress: string;
  device: string;
  browser: string;
  location: string;
  isNewDevice: boolean;
  isNewLocation: boolean;
}

export interface TwoFactorEnabledProps {
  userName: string;
  enabledAt: string;
  method: 'authenticator' | 'sms' | 'email';
  ipAddress?: string;
  device?: string;
  backupCodesGenerated: boolean;
}

export interface TwoFactorDisabledProps {
  userName: string;
  disabledAt: string;
  ipAddress?: string;
  device?: string;
}

export interface BackupCodesGeneratedProps {
  userName: string;
  codes: string[];
  generatedAt: string;
  ipAddress?: string;
  device?: string;
}

// ============================================================================
// STREAK EMAIL PROPS
// ============================================================================

export interface StreakAtRiskProps {
  userName: string;
  currentStreak: number;
  hoursRemaining: number;
  suggestedActions?: string[];
}

export interface StreakBrokenProps {
  userName: string;
  brokenStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  encouragementMessage?: string;
}

export interface StreakMilestoneProps {
  userName: string;
  streakDays: number;
  milestone: number;
  nextMilestone: number;
  totalActivities: number;
  startDate: string;
}

// ============================================================================
// GOAL EMAIL PROPS
// ============================================================================

export interface GoalReminderGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
  deadline: string;
  daysRemaining: number;
}

export interface GoalReminderProps {
  userName: string;
  goals: GoalReminderGoal[];
  reminderType: 'daily' | 'weekly' | 'deadline';
}

export interface GoalCompletedProps {
  userName: string;
  goalTitle: string;
  goalTarget: number;
  goalUnit: string;
  completedAt: string;
  daysToComplete: number;
  xpEarned: number;
  achievementUnlocked?: string;
  nextSuggestedGoal?: string;
}

// ============================================================================
// ACHIEVEMENT EMAIL PROPS
// ============================================================================

export interface AchievementUnlockedProps {
  userName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  pointsEarned: number;
  totalAchievements: number;
}

// ============================================================================
// REPORT EMAIL PROPS
// ============================================================================

export interface WeeklyReportStats {
  problemsSolved: number;
  problemsChange: number;
  commits: number;
  commitsChange: number;
  timeSpent: number;
  timeChange: number;
  currentStreak: number;
  longestStreak: number;
  goalsCompleted: number;
  goalsTotal: number;
  rank?: number;
  rankChange?: number;
}

export interface PlatformStat {
  name: string;
  icon: string;
  value: number;
  label: string;
}

export interface WeeklyReportProps {
  userName: string;
  weekNumber: number;
  year: number;
  stats: WeeklyReportStats;
  platformStats: PlatformStat[];
  topAchievement?: string;
  motivationalQuote?: string;
}

export interface MonthlyReportStats {
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  activeDays: number;
  totalDays: number;
  longestStreak: number;
  goalsCompleted: number;
  achievementsUnlocked: number;
  topPlatform: string;
  topLanguage?: string;
}

export interface WeeklyBreakdown {
  week: number;
  problems: number;
  commits: number;
}

export interface MonthlyReportProps {
  userName: string;
  month: string;
  year: number;
  stats: MonthlyReportStats;
  weeklyBreakdown: WeeklyBreakdown[];
  improvements?: string[];
  downloadUrl: string;
}

export interface ReportGeneratedStats {
  problemsSolved: number;
  commits: number;
  timeSpent: number;
  streak: number;
  goalsCompleted: number;
  achievementsUnlocked: number;
}

export interface ReportGeneratedProps {
  userName: string;
  reportType: 'weekly' | 'monthly' | 'yearly' | 'custom';
  reportId: string;
  periodStart: string;
  periodEnd: string;
  stats: ReportGeneratedStats;
  downloadUrl: string;
  expiresAt: string;
  highlights?: string[];
}

// ============================================================================
// SYNC EMAIL PROPS
// ============================================================================

export interface SyncFailedProps {
  userName: string;
  platformName: string;
  platformIcon: string;
  failureReason: string;
  failedAt: string;
  consecutiveFailures: number;
  suggestedActions: string[];
}

// ============================================================================
// SUPPORT EMAIL PROPS
// ============================================================================

export interface SupportTicketCreatedProps {
  userName: string;
  ticketNumber: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedResponseTime: string;
}

export interface PreviousMessage {
  author: string;
  content: string;
  timestamp: string;
  isStaff: boolean;
}

export interface SupportTicketReplyProps {
  userName: string;
  ticketNumber: string;
  ticketId: string;
  subject: string;
  replierName: string;
  isStaffReply: boolean;
  replyContent: string;
  repliedAt: string;
  previousMessages?: PreviousMessage[];
}

// ============================================================================
// MAINTENANCE EMAIL PROPS
// ============================================================================

export interface MaintenanceNotificationProps {
  userName: string;
  maintenanceTitle: string;
  maintenanceDescription: string;
  startTime: string;
  endTime: string;
  affectedServices: string[];
  isEmergency?: boolean;
}

// ============================================================================
// NEWSLETTER EMAIL PROPS
// ============================================================================

export interface NewsletterArticle {
  title: string;
  excerpt: string;
  url: string;
  image?: string;
  category: string;
}

export interface NewsletterProps {
  subscriberName?: string;
  subject: string;
  introText: string;
  articles: NewsletterArticle[];
  tips?: string[];
  unsubscribeToken: string;
}

// ============================================================================
// WAITLIST EMAIL PROPS
// ============================================================================

export interface WaitlistWelcomeProps {
  email: string;
  name?: string;
  position: number;
  referralCode: string;
  estimatedLaunchDate?: string;
  features?: string[];
}

// ============================================================================
// BILLING EMAIL PROPS
// ============================================================================

export interface SubscriptionCreatedProps {
  userName: string;
  planName: string;
  planPrice: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  nextBillingDate: string;
  trialEnds?: string;
}

export interface SubscriptionCancelledProps {
  userName: string;
  planName: string;
  cancelledAt: string;
  accessEndsAt: string;
  reason?: string;
  feedbackUrl?: string;
}

export interface PaymentFailedProps {
  userName: string;
  planName: string;
  amount: string;
  failedAt: string;
  failureReason: string;
  retryDate?: string;
  gracePeriodEnds: string;
  paymentMethodLast4: string;
}

export interface InvoiceItem {
  description: string;
  amount: string;
}

export interface InvoicePaidProps {
  userName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  paymentMethod: string;
  paymentMethodLast4: string;
  planName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  items: InvoiceItem[];
  invoiceUrl: string;
  nextBillingDate: string;
}

export interface AccountDeletedProps {
  userName: string;
  email: string;
  deletedAt: string;
  dataRetentionDays: number;
  feedbackUrl?: string;
}

// ============================================================================
// EMAIL SERVICE TYPES
// ============================================================================

export type EmailTemplate =
  | 'welcome'
  | 'verify-email'
  | 'password-reset'
  | 'password-changed'
  | 'email-change-request'
  | 'email-changed'
  | 'login-alert'
  | 'two-factor-enabled'
  | 'two-factor-disabled'
  | 'backup-codes-generated'
  | 'streak-at-risk'
  | 'streak-broken'
  | 'streak-milestone'
  | 'goal-reminder'
  | 'goal-completed'
  | 'achievement-unlocked'
  | 'weekly-report'
  | 'monthly-report'
  | 'report-generated'
  | 'sync-failed'
  | 'support-ticket-created'
  | 'support-ticket-reply'
  | 'maintenance-notification'
  | 'newsletter'
  | 'waitlist-welcome'
  | 'subscription-created'
  | 'subscription-cancelled'
  | 'payment-failed'
  | 'invoice-paid'
  | 'account-deleted';

export interface EmailQueueItem {
  id: string;
  to: string;
  template: EmailTemplate;
  props: Record<string, unknown>;
  priority: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

export interface EmailProviderConfig {
  provider: 'nodemailer' | 'brevo' | 'resend' | 'sendgrid' | 'mailjet';
  apiKey?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
}

// ============================================================================
// SERVICE PROP TYPES (for emailNotificationService)
// ============================================================================

export interface SendEmailToUserProps {
  user: EmailUser;
  goal?: Goal;
  achievement?: Achievement;
  platform?: Platform;
  userPlatform?: UserPlatform;
  subscription?: Subscription;
  invoice?: Invoice;
  ticket?: SupportTicket;
  ticketReply?: TicketReply;
  syncLog?: SyncLog;
  report?: Report;
  maintenance?: MaintenanceWindow;
  newsletter?: NewsletterSubscriber;
  waitlist?: Waitlist;
}