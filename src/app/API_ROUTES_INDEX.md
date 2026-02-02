# API Routes Index

Generated: 2026-02-02T11:57:44.633131

## Routes Summary

| Path | Methods | Auth | Admin | Rate Limit | Description |
|------|---------|------|-------|------------|-------------|
| `/admin/cache` | GET | ✅ | ✅ | 30/min | Cache statistics |
| `/admin/cache/clear` | POST, DELETE | ✅ | ✅ | 5/min | Clear cache |
| `/admin/dashboard` | GET | ✅ | ✅ | 30/min | Admin dashboard data |
| `/admin/database/backup` | POST | ✅ | ✅ | 2/min | Trigger database backup |
| `/admin/database/stats` | GET | ✅ | ✅ | 20/min | Database statistics |
| `/admin/email/send-bulk` | POST | ✅ | ✅ | 5/min | Send bulk emails |
| `/admin/email/templates` | GET, POST, PUT, DELETE | ✅ | ✅ | 30/min | Email templates CRUD |
| `/admin/logs/export` | POST | ✅ | ✅ | 5/min | Export logs |
| `/admin/permissions` | GET | ✅ | ✅ | 50/min | List available permissions |
| `/admin/platforms/health` | GET | ✅ | ✅ | 30/min | Platform health dashboard |
| `/admin/roles` | GET, POST, PUT, DELETE | ✅ | ✅ | 30/min | Manage roles |
| `/admin/users/[id]/activity` | GET | ✅ | ✅ | 50/min | Get user activity log (admin view) |
| `/admin/users/[id]/ban` | POST | ✅ | ✅ | 20/min | Ban user |
| `/admin/users/[id]/impersonate` | POST | ✅ | ✅ | 5/min | Impersonate user (for debugging) |
| `/admin/users/[id]/reset-password` | POST | ✅ | ✅ | 10/min | Force reset user password |
| `/admin/users/[id]/unban` | POST | ✅ | ✅ | 20/min | Unban user |
| `/admin/users/[id]/verify` | POST | ✅ | ✅ | 20/min | Manually verify user |
| `/analytics/categories` | GET | ✅ | ❌ | 50/min | Analytics by category |
| `/analytics/dashboard` | GET | ✅ | ❌ | 50/min | Dashboard summary analytics |
| `/analytics/heatmap` | GET | ✅ | ❌ | 50/min | Activity heatmap data |
| `/analytics/platforms` | GET | ✅ | ❌ | 50/min | Analytics by platform |
| `/analytics/predictions` | GET | ✅ | ❌ | 20/min | AI-powered predictions |
| `/analytics/productivity` | GET | ✅ | ❌ | 50/min | Productivity metrics |
| `/analytics/time-spent` | GET | ✅ | ❌ | 50/min | Time tracking analytics |
| `/auth/check-email` | GET, POST | ❌ | ❌ | 20/min | Check if email is available |
| `/auth/check-username` | GET, POST | ❌ | ❌ | 30/min | Check if username is available |
| `/auth/login` | POST | ❌ | ❌ | 10/min | Direct login with email and password |
| `/auth/social/connect` | POST | ✅ | ❌ | 20/min | Connect a social account to existing user |
| `/auth/social/disconnect` | POST, DELETE | ✅ | ❌ | 20/min | Disconnect a social account from user |
| `/auth/validate-token` | GET, POST | ❌ | ❌ | 100/min | Validate JWT or session token |
| `/config` | GET | ❌ | ❌ | 100/min | Get public configuration |
| `/cron/achievement-check` | POST | ✅ | ✅ | 5/min | Check and award achievements |
| `/cron/cleanup` | POST | ✅ | ✅ | 2/min | Cleanup old data |
| `/cron/goal-reminder` | POST | ✅ | ✅ | 10/min | Send goal reminders |
| `/cron/monthly-report` | POST | ✅ | ✅ | 5/min | Generate monthly reports |
| `/cron/platform-health` | POST | ✅ | ✅ | 10/min | Check platform health |
| `/cron/streak-freeze` | POST | ✅ | ✅ | 5/min | Apply streak freezes |
| `/cron/subscription-check` | POST | ✅ | ✅ | 5/min | Check subscription status |
| `/cron/weekly-report` | POST | ✅ | ✅ | 5/min | Generate weekly reports |
| `/export/excel` | POST | ✅ | ❌ | 10/min | Excel export |
| `/export/scheduled/run` | POST | ✅ | ❌ | 10/min | Run scheduled export now |
| `/export/templates` | GET, POST, PUT, DELETE | ✅ | ❌ | 30/min | Export templates |
| `/export/xml` | POST | ✅ | ❌ | 10/min | XML export |
| `/feature-flags` | GET | ❌ | ❌ | 100/min | Get public feature flags |
| `/goals/[id]/cancel` | POST | ✅ | ❌ | 20/min | Cancel goal |
| `/goals/[id]/pause` | POST | ✅ | ❌ | 20/min | Pause goal |
| `/goals/[id]/reminders` | GET, POST, PUT, DELETE | ✅ | ❌ | 30/min | Manage specific goal's reminders |
| `/goals/[id]/resume` | POST | ✅ | ❌ | 20/min | Resume paused goal |
| `/goals/[id]/stats` | GET | ✅ | ❌ | 50/min | Individual goal statistics |
| `/goals/categories` | GET | ✅ | ❌ | 50/min | Goals by category |
| `/goals/reminders` | GET, POST | ✅ | ❌ | 30/min | CRUD for goal reminders |
| `/goals/stats` | GET | ✅ | ❌ | 50/min | Goal statistics overview |
| `/leaderboard` | GET | ❌ | ❌ | 50/min | Global leaderboard |
| `/leaderboard/category/[category]` | GET | ❌ | ❌ | 50/min | Category-specific leaderboard |
| `/leaderboard/friends` | GET | ✅ | ❌ | 50/min | Friends leaderboard |
| `/leaderboard/monthly` | GET | ❌ | ❌ | 50/min | Monthly leaderboard |
| `/leaderboard/weekly` | GET | ❌ | ❌ | 50/min | Weekly leaderboard |
| `/notifications/delete-all` | DELETE, POST | ✅ | ❌ | 10/min | Delete all notifications |
| `/notifications/push/subscribe` | POST | ✅ | ❌ | 20/min | Subscribe to push notifications |
| `/notifications/push/test` | POST | ✅ | ❌ | 10/min | Send test push notification |
| `/notifications/push/unsubscribe` | POST, DELETE | ✅ | ❌ | 20/min | Unsubscribe from push notifications |
| `/notifications/stats` | GET | ✅ | ❌ | 50/min | Notification statistics |
| `/notifications/test` | POST | ✅ | ❌ | 10/min | Send test notification |
| `/ping` | GET | ❌ | ❌ | 500/min | Simple health ping |
| `/platforms/[id]/stats` | GET | ✅ | ❌ | 50/min | Get platform-specific stats |
| `/platforms/[id]/sync` | POST | ✅ | ❌ | 10/min | Sync specific platform |
| `/platforms/[id]/verify` | POST | ✅ | ❌ | 20/min | Verify specific platform connection |
| `/platforms/categories` | GET | ❌ | ❌ | 100/min | Get platform categories |
| `/platforms/recommended` | GET | ✅ | ❌ | 30/min | Get recommended platforms for user |
| `/platforms/refresh-token` | POST | ✅ | ❌ | 30/min | Refresh OAuth token for platform |
| `/platforms/status` | GET | ❌ | ❌ | 100/min | Get platform health status |
| `/platforms/verify` | POST | ✅ | ❌ | 20/min | Verify platform connection |
| `/referral` | GET | ✅ | ❌ | 50/min | Get referral info |
| `/referral/generate` | POST | ✅ | ❌ | 5/min | Generate referral code |
| `/referral/rewards` | GET | ✅ | ❌ | 30/min | Referral rewards |
| `/referral/stats` | GET | ✅ | ❌ | 30/min | Referral statistics |
| `/referral/validate` | POST | ❌ | ❌ | 30/min | Validate referral code |
| `/reports/custom` | POST | ✅ | ❌ | 20/min | Custom date range report |
| `/reports/generate` | POST | ✅ | ❌ | 10/min | Generate report on-demand |
| `/reports/monthly` | GET | ✅ | ❌ | 30/min | Get monthly report |
| `/reports/schedule` | GET, POST, PUT, DELETE | ✅ | ❌ | 30/min | Manage scheduled reports |
| `/reports/weekly` | GET | ✅ | ❌ | 30/min | Get weekly report |
| `/reports/yearly` | GET | ✅ | ❌ | 20/min | Get yearly report |
| `/search` | GET, POST | ✅ | ❌ | 50/min | Global search |
| `/search/goals` | GET | ✅ | ❌ | 50/min | Search user's goals |
| `/search/platforms` | GET | ❌ | ❌ | 100/min | Search platforms |
| `/search/suggestions` | GET | ✅ | ❌ | 100/min | Search suggestions/autocomplete |
| `/search/users` | GET | ❌ | ❌ | 50/min | Search public users |
| `/share` | POST | ✅ | ❌ | 30/min | Create share link |
| `/share/[code]` | GET | ❌ | ❌ | 100/min | Get shared content |
| `/share/achievement` | POST | ✅ | ❌ | 30/min | Share achievement |
| `/share/goal` | POST | ✅ | ❌ | 20/min | Share goal |
| `/share/stats` | POST | ✅ | ❌ | 20/min | Share stats card |
| `/status` | GET | ❌ | ❌ | 200/min | API status check |
| `/stripe/apply-coupon` | POST | ✅ | ❌ | 20/min | Apply coupon/promo code |
| `/stripe/payment-methods` | GET, POST | ✅ | ❌ | 30/min | List/add payment methods |
| `/stripe/payment-methods/[id]` | GET, PUT, DELETE | ✅ | ❌ | 30/min | Manage specific payment method |
| `/stripe/plans` | GET | ❌ | ❌ | 100/min | Get available subscription plans |
| `/stripe/preview-change` | POST | ✅ | ❌ | 30/min | Preview subscription change |
| `/stripe/prices` | GET | ❌ | ❌ | 100/min | Get pricing details |
| `/stripe/retry-payment` | POST | ✅ | ❌ | 10/min | Retry failed payment |
| `/stripe/usage` | GET | ✅ | ❌ | 50/min | Get subscription usage data |
| `/sync/[platformId]/force` | POST | ✅ | ❌ | 5/min | Force sync for platform |
| `/sync/[platformId]/schedule` | GET, PUT | ✅ | ❌ | 30/min | Platform-specific sync schedule |
| `/sync/analytics` | GET | ✅ | ❌ | 30/min | Sync analytics |
| `/sync/cancel` | POST | ✅ | ❌ | 20/min | Cancel ongoing sync |
| `/sync/history` | GET | ✅ | ❌ | 50/min | Full sync history |
| `/sync/schedule` | GET, POST, PUT | ✅ | ❌ | 30/min | Schedule future sync |
| `/tracker/[id]/duplicate` | POST | ✅ | ❌ | 20/min | Duplicate tracker entry |
| `/tracker/[id]/notes` | GET, PUT, PATCH | ✅ | ❌ | 50/min | Manage tracker entry notes |
| `/tracker/aggregate` | GET, POST | ✅ | ❌ | 30/min | Aggregate tracker data |
| `/tracker/calendar` | GET | ✅ | ❌ | 50/min | Calendar view data |
| `/tracker/search` | GET, POST | ✅ | ❌ | 50/min | Search tracker entries |
| `/upload` | POST | ✅ | ❌ | 20/min | General file upload |
| `/upload/attachment` | POST | ✅ | ❌ | 20/min | Attachment upload (support tickets, etc.) |
| `/upload/avatar` | POST | ✅ | ❌ | 10/min | Avatar upload |
| `/upload/import` | POST | ✅ | ❌ | 5/min | Bulk data import file |
| `/user/activity` | GET | ✅ | ❌ | 50/min | Get user's activity log |
| `/user/deactivate` | POST | ✅ | ❌ | 5/min | Deactivate user account (soft delete) |
| `/user/onboarding` | GET, PUT | ✅ | ❌ | 30/min | Get/update onboarding status |
| `/user/onboarding/complete` | POST | ✅ | ❌ | 10/min | Mark onboarding as complete |
| `/user/referrals` | GET | ✅ | ❌ | 30/min | Get user's referrals list |
| `/user/streak` | GET, POST, PUT | ✅ | ❌ | 50/min | Manage user streak |
| `/version` | GET | ❌ | ❌ | 200/min | Get API version info |
| `/webhooks/email/bounce` | POST | ❌ | ❌ | 100/min | Handle email bounce webhook |
| `/webhooks/email/complaint` | POST | ❌ | ❌ | 100/min | Handle spam complaint webhook |
| `/webhooks/email/delivery` | POST | ❌ | ❌ | 200/min | Handle email delivery confirmation |
| `/webhooks/external/[provider]` | POST | ❌ | ❌ | 100/min | Handle external provider webhooks |
| `/webhooks/push` | POST | ❌ | ❌ | 100/min | Handle push notification webhook |

## Routes by Tag

### Account

- `/user/deactivate`

### Achievement

- `/cron/achievement-check`
- `/share/achievement`

### Activity

- `/user/activity`

### Admin

- `/admin/users/[id]/ban`
- `/admin/users/[id]/unban`
- `/admin/users/[id]/impersonate`
- `/admin/users/[id]/reset-password`
- `/admin/users/[id]/verify`
- `/admin/users/[id]/activity`
- `/admin/platforms/health`
- `/admin/cache`
- `/admin/cache/clear`
- `/admin/database/stats`
- `/admin/database/backup`
- `/admin/email/templates`
- `/admin/email/send-bulk`
- `/admin/logs/export`
- `/admin/roles`
- `/admin/permissions`
- `/admin/dashboard`

### Aggregate

- `/tracker/aggregate`

### Ai

- `/analytics/predictions`

### Analytics

- `/tracker/aggregate`
- `/sync/analytics`
- `/analytics/dashboard`
- `/analytics/categories`
- `/analytics/platforms`
- `/analytics/time-spent`
- `/analytics/productivity`
- `/analytics/predictions`
- `/analytics/heatmap`

### Attachment

- `/upload/attachment`

### Audit

- `/user/activity`
- `/admin/users/[id]/activity`

### Auth

- `/auth/login`
- `/auth/check-username`
- `/auth/check-email`
- `/auth/social/connect`
- `/auth/social/disconnect`
- `/auth/validate-token`

### Autocomplete

- `/search/suggestions`

### Avatar

- `/upload/avatar`

### Backup

- `/admin/database/backup`

### Billing

- `/cron/subscription-check`

### Bounce

- `/webhooks/email/bounce`

### Bulk

- `/admin/email/send-bulk`

### Cache

- `/admin/cache`
- `/admin/cache/clear`

### Calendar

- `/tracker/calendar`

### Cancel

- `/sync/cancel`

### Card

- `/share/stats`

### Category

- `/platforms/categories`
- `/goals/categories`
- `/analytics/categories`
- `/leaderboard/category/[category]`

### Cleanup

- `/cron/cleanup`

### Complaint

- `/webhooks/email/complaint`

### Config

- `/config`

### Coupon

- `/stripe/apply-coupon`

### Cron

- `/cron/weekly-report`
- `/cron/monthly-report`
- `/cron/achievement-check`
- `/cron/goal-reminder`
- `/cron/cleanup`
- `/cron/subscription-check`
- `/cron/streak-freeze`
- `/cron/platform-health`

### Custom

- `/reports/custom`

### Dashboard

- `/admin/dashboard`
- `/analytics/dashboard`

### Data

- `/upload/import`

### Database

- `/admin/database/stats`
- `/admin/database/backup`

### Deactivation

- `/user/deactivate`

### Debug

- `/admin/users/[id]/impersonate`

### Delete

- `/notifications/delete-all`

### Delivery

- `/webhooks/email/delivery`

### Discount

- `/stripe/apply-coupon`

### Duplicate

- `/tracker/[id]/duplicate`

### Email

- `/admin/email/templates`
- `/admin/email/send-bulk`
- `/webhooks/email/bounce`
- `/webhooks/email/complaint`
- `/webhooks/email/delivery`

### Excel

- `/export/excel`

### Export

- `/admin/logs/export`
- `/export/excel`
- `/export/xml`
- `/export/scheduled/run`
- `/export/templates`

### External

- `/webhooks/external/[provider]`

### Feature-Flags

- `/feature-flags`

### File

- `/upload`

### Force

- `/sync/[platformId]/force`

### Friends

- `/leaderboard/friends`

### Gamification

- `/user/streak`

### Generate

- `/referral/generate`
- `/reports/generate`

### Global

- `/search`

### Goal

- `/goals/stats`
- `/goals/reminders`
- `/goals/categories`
- `/goals/[id]/reminders`
- `/goals/[id]/pause`
- `/goals/[id]/resume`
- `/goals/[id]/cancel`
- `/goals/[id]/stats`
- `/cron/goal-reminder`
- `/search/goals`
- `/share/goal`

### Health

- `/platforms/status`
- `/admin/platforms/health`
- `/cron/platform-health`
- `/status`
- `/ping`

### Heatmap

- `/analytics/heatmap`

### History

- `/sync/history`

### Image

- `/upload/avatar`

### Import

- `/upload/import`

### Info

- `/referral`

### Integration

- `/webhooks/external/[provider]`

### Leaderboard

- `/leaderboard`
- `/leaderboard/weekly`
- `/leaderboard/monthly`
- `/leaderboard/category/[category]`
- `/leaderboard/friends`

### Link

- `/share`

### Login

- `/auth/login`

### Logs

- `/admin/logs/export`

### Maintenance

- `/cron/cleanup`

### Moderation

- `/admin/users/[id]/ban`
- `/admin/users/[id]/unban`

### Monthly

- `/leaderboard/monthly`
- `/reports/monthly`

### Notes

- `/tracker/[id]/notes`

### Notification

- `/goals/reminders`
- `/notifications/delete-all`
- `/notifications/test`
- `/notifications/stats`
- `/notifications/push/subscribe`
- `/notifications/push/unsubscribe`
- `/notifications/push/test`

### Oauth

- `/auth/social/connect`
- `/auth/social/disconnect`
- `/platforms/refresh-token`

### Onboarding

- `/user/onboarding`
- `/user/onboarding/complete`

### Payment

- `/stripe/payment-methods`
- `/stripe/payment-methods/[id]`
- `/stripe/retry-payment`

### Permission

- `/admin/roles`
- `/admin/permissions`

### Ping

- `/ping`

### Plans

- `/stripe/plans`

### Platform

- `/platforms/verify`
- `/platforms/refresh-token`
- `/platforms/status`
- `/platforms/categories`
- `/platforms/recommended`
- `/platforms/[id]/sync`
- `/platforms/[id]/verify`
- `/platforms/[id]/stats`
- `/admin/platforms/health`
- `/sync/[platformId]/schedule`
- `/analytics/platforms`
- `/cron/platform-health`
- `/search/platforms`

### Prediction

- `/analytics/predictions`

### Preview

- `/stripe/preview-change`

### Pricing

- `/stripe/plans`
- `/stripe/prices`

### Productivity

- `/analytics/productivity`

### Public

- `/share/[code]`

### Push

- `/webhooks/push`
- `/notifications/push/subscribe`
- `/notifications/push/unsubscribe`
- `/notifications/push/test`

### Ranking

- `/leaderboard`

### Recommendation

- `/platforms/recommended`

### Referral

- `/user/referrals`
- `/referral`
- `/referral/generate`
- `/referral/validate`
- `/referral/stats`
- `/referral/rewards`

### Reminder

- `/goals/reminders`
- `/goals/[id]/reminders`
- `/cron/goal-reminder`

### Report

- `/cron/weekly-report`
- `/cron/monthly-report`
- `/reports/generate`
- `/reports/weekly`
- `/reports/monthly`
- `/reports/yearly`
- `/reports/custom`
- `/reports/schedule`

### Retry

- `/stripe/retry-payment`

### Rewards

- `/referral/rewards`

### Role

- `/admin/roles`

### Schedule

- `/sync/schedule`
- `/sync/[platformId]/schedule`
- `/reports/schedule`

### Scheduled

- `/cron/weekly-report`
- `/cron/monthly-report`
- `/cron/achievement-check`
- `/cron/goal-reminder`
- `/cron/streak-freeze`
- `/export/scheduled/run`

### Search

- `/tracker/search`
- `/search`
- `/search/suggestions`
- `/search/users`
- `/search/platforms`
- `/search/goals`

### Security

- `/admin/users/[id]/reset-password`

### Share

- `/share`
- `/share/[code]`
- `/share/goal`
- `/share/achievement`
- `/share/stats`

### Social

- `/auth/social/connect`
- `/auth/social/disconnect`
- `/leaderboard/friends`

### Stats

- `/platforms/[id]/stats`
- `/goals/stats`
- `/goals/[id]/stats`
- `/share/stats`
- `/referral/stats`
- `/notifications/stats`

### Status

- `/platforms/status`
- `/goals/[id]/pause`
- `/goals/[id]/resume`
- `/goals/[id]/cancel`
- `/status`

### Streak

- `/user/streak`
- `/cron/streak-freeze`

### Stripe

- `/stripe/plans`
- `/stripe/prices`
- `/stripe/usage`
- `/stripe/payment-methods`
- `/stripe/payment-methods/[id]`
- `/stripe/retry-payment`
- `/stripe/apply-coupon`
- `/stripe/preview-change`

### Subscribe

- `/notifications/push/subscribe`

### Subscription

- `/cron/subscription-check`
- `/stripe/usage`
- `/stripe/preview-change`

### Sync

- `/platforms/[id]/sync`
- `/sync/schedule`
- `/sync/cancel`
- `/sync/history`
- `/sync/analytics`
- `/sync/[platformId]/force`
- `/sync/[platformId]/schedule`

### System

- `/admin/cache`
- `/admin/cache/clear`
- `/admin/database/stats`
- `/version`
- `/status`
- `/ping`
- `/feature-flags`
- `/config`

### Template

- `/admin/email/templates`
- `/export/templates`

### Test

- `/notifications/test`
- `/notifications/push/test`

### Time

- `/analytics/time-spent`

### Token

- `/auth/validate-token`
- `/platforms/refresh-token`

### Tracker

- `/tracker/search`
- `/tracker/calendar`
- `/tracker/aggregate`
- `/tracker/[id]/notes`
- `/tracker/[id]/duplicate`

### Unsubscribe

- `/notifications/push/unsubscribe`

### Upload

- `/upload`
- `/upload/avatar`
- `/upload/attachment`
- `/upload/import`

### Usage

- `/stripe/usage`

### User

- `/user/activity`
- `/user/referrals`
- `/user/streak`
- `/user/onboarding`
- `/user/onboarding/complete`
- `/user/deactivate`
- `/admin/users/[id]/ban`
- `/admin/users/[id]/unban`
- `/admin/users/[id]/impersonate`
- `/admin/users/[id]/reset-password`
- `/admin/users/[id]/verify`
- `/admin/users/[id]/activity`
- `/search/users`

### Validation

- `/auth/check-username`
- `/auth/check-email`
- `/auth/validate-token`
- `/referral/validate`

### Verification

- `/platforms/verify`
- `/platforms/[id]/verify`
- `/admin/users/[id]/verify`

### Version

- `/version`

### View

- `/tracker/calendar`

### Visualization

- `/analytics/heatmap`

### Webhook

- `/webhooks/email/bounce`
- `/webhooks/email/complaint`
- `/webhooks/email/delivery`
- `/webhooks/push`
- `/webhooks/external/[provider]`

### Weekly

- `/leaderboard/weekly`
- `/reports/weekly`

### Xml

- `/export/xml`

### Yearly

- `/reports/yearly`
