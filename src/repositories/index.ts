// src/repositories/index.ts
// Barrel re-exports for all repository classes

// Auth / Identity
export { AccountRepository } from './account.repository';
export { UserRepository } from './user.repository';
export { SessionRepository } from './session.repository';
export { ActiveSessionRepository } from './activeSession.repository';
export { LoginAttemptRepository } from './loginAttempt.repository';
export { PasswordResetRepository } from './passwordReset.repository';
export { RefreshTokenRepository } from './refreshToken.repository';
export { VerificationTokenRepository } from './verificationToken.repository';
export { EmailVerificationRepository } from './emailVerification.repository';
export { EmailChangeRequestRepository } from './emailChangeRequest.repository';
export { TwoFactorAuthRepository } from './twoFactorAuth.repository';
export { BackupCodeRepository } from './backupCode.repository';
export { ApiKeyRepository } from './apiKey.repository';

// User / Profile
export { UserSettingsRepository } from './userSettings.repository';
export { UserAchievementRepository } from './userAchievement.repository';
export { NotificationPreferencesRepository } from './notificationPreferences.repository';

// Core Domain
export { AchievementRepository } from './achievement.repository';
export { PlatformRepository } from './platform.repository';
export { CustomPlatformRepository } from './customPlatform.repository';
export { UserPlatformRepository } from './userPlatform.repository';
export { TrackerEntryRepository } from './trackerEntry.repository';
export { DailyStatsRepository } from './dailyStats.repository';
export { PlatformDailyStatsRepository } from './platformDailyStats.repository';
export { StreakHistoryRepository } from './streakHistory.repository';
export { GoalRepository } from './goal.repository';
export { GoalHistoryRepository } from './goalHistory.repository';
export { GoalReminderRepository } from './goalReminder.repository';
export { GoalTemplateRepository } from './goalTemplate.repository';

// Notifications / Engagement
export { NotificationRepository } from './notification.repository';
export { BookmarkRepository } from './bookmark.repository';
export { ReportRepository } from './report.repository';
export { FeedbackRepository } from './feedback.repository';
export { ReferralRewardRepository } from './referralReward.repository';
export { PushSubscriptionRepository } from './pushSubscription.repository';

// Blog
export { BlogPostRepository } from './blogPost.repository';
export { BlogCommentRepository } from './blogComment.repository';
export { BlogPostLikeRepository } from './blogPostLike.repository';
export { ChangelogEntryRepository } from './changelogEntry.repository';

// Billing / Subscription
export { SubscriptionRepository } from './subscription.repository';
export { PaymentEventRepository } from './paymentEvent.repository';
export { PaymentMethodRepository } from './paymentMethod.repository';
export { InvoiceRepository } from './invoice.repository';
export { CouponRepository } from './coupon.repository';
export { CouponRedemptionRepository } from './couponRedemption.repository';

// Support / KB
export { SupportTicketRepository } from './supportTicket.repository';
export { TicketReplyRepository } from './ticketReply.repository';
export { KnowledgeBaseRepository } from './knowledgeBase.repository';
export { KnowledgeBaseArticleRepository } from './knowledgeBaseArticle.repository';
export { KnowledgeBaseCategoryRepository } from './knowledgeBaseCategory.repository';

// Sharing / Export
export { ShareLinkRepository } from './shareLink.repository';
export { ShareViewLogRepository } from './shareViewLog.repository';
export { ExportJobRepository } from './exportJob.repository';
export { ScheduledExportRepository } from './scheduledExport.repository';

// System / Admin
export { AuditLogRepository } from './auditLog.repository';
export { FeatureFlagRepository } from './featureFlag.repository';
export { MaintenanceWindowRepository } from './maintenanceWindow.repository';
export { SystemSettingsRepository } from './systemSettings.repository';
export { SyncLogRepository } from './syncLog.repository';
export { EmailLogRepository } from './emailLog.repository';
export { EmailTemplateRepository } from './emailTemplate.repository';
export { NewsletterSubscriberRepository } from './newsletterSubscriber.repository';
export { WaitlistRepository } from './waitlist.repository';

// Webhooks
export { WebhookRepository } from './webhook.repository';
export { WebhookDeliveryRepository } from './webhookDelivery.repository';
