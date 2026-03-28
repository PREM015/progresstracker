// ============================================================================
// FILE: src/config/index.ts
// PURPOSE: Central export for all configuration modules
// ARCHITECTURE: Namespaced exports pattern
// 
// This file uses TypeScript's `export * as namespace` pattern. This is an
// advanced exporting technique that guarantees zero naming collisions across
// a large modular codebase. It provides a clean, structured access pattern:
// 
// Usage Example:
// import { database, api } from '@/config';
// console.log(database.DATABASE_CONFIG);
// console.log(api.API_TIMEOUTS);
// ============================================================================

// =============================================================================
// GLOBAL ENVIRONMENT FLAGS (Single Source of Truth)
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// =============================================================================
// NAMESPACED CONFIGURATIONS
// =============================================================================

// Core Configs
export * as api from './api';
export * as database from './database';
export * as auth from './auth';
export * as cache from './cache';
export * as cron from './cron';

// Feature & Business Logic 
export * as featureFlags from './feature-flags';
export * as permissions from './permissions';
export * as rateLimit from './rate-limit';
export * as billing from './billing';
export * as categories from './categories';
export * as achievements from './achievements';
export * as streak from './streak';
export * as reports from './reports';

// Communication & Integrations
export * as email from './email';
export * as notifications from './notifications';
export * as newsletter from './newsletter';
export * as support from './support';
export * as oauth from './oauth';
export * as webhooks from './webhooks';
export * as sync from './sync';
export * as upload from './upload';

// UI & System
export * as navigation from './navigation';
export * as phases from './phases';
export * as platforms from './platforms';
export * as maintenance from './maintenance';
export * as exportData from './export'; // Using exportData because 'export' is a reserved keyword
export * as sentry from './sentry';