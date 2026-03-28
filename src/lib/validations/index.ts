// src/lib/validations/index.ts
// Barrel re-exports for all validation schemas

// Auth / Identity
export * from './auth';
export * from './account';
export * from './session';
export * from './active-session';
export * from './login-attempt';
export * from './password-reset';
export * from './refresh-token';
export * from './verification-token';
export * from './email-verification';
export * from './email-change';
export * from './two-factor';
export * from './backup-code';
export * from './api-key';

// User
export * from './user';
export * from './user-settings';
export * from './user-platform';
export * from './user-achievement';
export * from './settings';
export * from './notification';

// Core Domain
export * from './tracker';
export * from './platform';
export * from './custom-platform';
export * from './daily-stats';
export * from './platform-daily-stats';
export * from './streak';
export * from './streak-history';
export * from './goal-reminder';
export * from './goal-template';
export * from './bookmark';

// Blog
export * from './blog-post';
export * from './blog-comment';

// Billing / Subscription
export * from './subscription';
export * from './payment';
export * from './payment-method';
export * from './invoice';

// Support / Knowledge Base
export * from './support-ticket';
export * from './knowledge-base';

// Sharing / Export
export * from './share-link';
export * from './export';

// System / Admin
export * from './system-settings';
export * from './maintenance-window';
export * from './audit-log';
export * from './sync-log';
export * from './email-template';
export * from './push';

// Webhooks
export * from './webhook';
