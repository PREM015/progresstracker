// src/emails/index.ts
// Export all email templates as default exports



export { WelcomeEmail } from '@/emails/welcome';
export { VerifyEmailEmail } from './verify-email';
export { PasswordResetEmail } from './password-reset';
export { PasswordChangedEmail } from './password-changed';
export { EmailChangeRequestEmail } from './email-change-request';
export { EmailChangedEmail } from './email-changed';
export { LoginAlertEmail } from './login-alert';
export { TwoFactorEnabledEmail } from './two-factor-enabled';
export { TwoFactorDisabledEmail } from './two-factor-disabled';
export { BackupCodesGeneratedEmail } from './backup-codes-generated';
export { StreakAtRiskEmail } from './streak-at-risk';
export { StreakBrokenEmail } from './streak-broken';
export { StreakMilestoneEmail } from './streak-milestone';
export { GoalReminderEmail } from './goal-reminder';
export { GoalCompletedEmail } from './goal-completed';
export { AchievementUnlockedEmail } from './achievement-unlocked';
export { WeeklyReportEmail } from './weekly-report';
export { MonthlyReportEmail } from './monthly-report';
export { ReportGeneratedEmail } from './report-generated';
export { SyncFailedEmail } from './sync-failed';
export type { MaintenanceNotificationEmailProps } from '@/emails/maintenance-notification';
export { SubscriptionCreatedEmail } from './subscription-created';
export { SubscriptionCancelledEmail } from './subscription-cancelled';
export { PaymentFailedEmail } from './payment-failed';
export { InvoicePaidEmail } from './invoice-paid';
export { AccountDeletedEmail } from './account-deleted';
export { SupportTicketCreatedEmail } from './support-ticket-created';
export { SupportTicketReplyEmail } from './support-ticket-reply';
export { NewsletterEmail } from './newsletter';
export { WaitlistWelcomeEmail } from './waitlist-welcome';