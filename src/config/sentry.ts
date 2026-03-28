// ============================================================================
// FILE: src/config/sentry.ts
// PURPOSE: Sentry error tracking and monitoring configuration
// ============================================================================

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SentryConfig {
  enabled: boolean;
  dsn: string | undefined;
  environment: string;
  release: string | undefined;
  sampleRates: SampleRates;
  integrations: IntegrationConfig;
  filtering: FilteringConfig;
  performance: PerformanceConfig;
  session: SessionConfig;
  breadcrumbs: BreadcrumbConfig;
  user: UserConfig;
  tags: Record<string, string>;
}

export interface SampleRates {
  /** Error sample rate (0.0 - 1.0) */
  errorSampleRate: number;
  /** Transaction sample rate (0.0 - 1.0) */
  tracesSampleRate: number;
  /** Profile sample rate (0.0 - 1.0) */
  profilesSampleRate: number;
  /** Replay sample rate for errors (0.0 - 1.0) */
  replaysOnErrorSampleRate: number;
  /** Replay sample rate for sessions (0.0 - 1.0) */
  replaysSessionSampleRate: number;
}

export interface IntegrationConfig {
  /** Enable browser tracing */
  browserTracing: boolean;
  /** Enable HTTP tracing */
  httpTracing: boolean;
  /** Enable Prisma tracing */
  prismaTracing: boolean;
  /** Enable console logging */
  captureConsole: boolean;
  /** Enable context lines */
  contextLines: number;
  /** Enable replay integration */
  replay: boolean;
  /** Enable profiling */
  profiling: boolean;
}

export interface FilteringConfig {
  /** Ignore these error messages */
  ignoreErrors: (string | RegExp)[];
  /** Ignore these URLs */
  denyUrls: (string | RegExp)[];
  /** Allow only these URLs */
  allowUrls: (string | RegExp)[];
  /** Filter these transactions */
  ignoreTransactions: string[];
  /** Scrub sensitive data */
  scrubData: boolean;
  /** Fields to scrub */
  scrubFields: string[];
}

export interface PerformanceConfig {
  /** Enable performance monitoring */
  enabled: boolean;
  /** Transaction name patterns to trace */
  tracePropagationTargets: (string | RegExp)[];
  /** Routes to exclude from tracing */
  excludeRoutes: string[];
  /** Slow transaction threshold (ms) */
  slowTransactionThreshold: number;
}

export interface SessionConfig {
  /** Enable session tracking */
  enabled: boolean;
  /** Session sample rate */
  sampleRate: number;
}

export interface BreadcrumbConfig {
  /** Maximum breadcrumbs to keep */
  maxBreadcrumbs: number;
  /** Enable console breadcrumbs */
  console: boolean;
  /** Enable DOM breadcrumbs */
  dom: boolean;
  /** Enable fetch breadcrumbs */
  fetch: boolean;
  /** Enable XHR breadcrumbs */
  xhr: boolean;
  /** Enable history breadcrumbs */
  history: boolean;
  /** Enable sentry breadcrumbs */
  sentry: boolean;
}

export interface UserConfig {
  /** Include IP address */
  includeIp: boolean;
  /** Include user email */
  includeEmail: boolean;
  /** Include username */
  includeUsername: boolean;
}

// =============================================================================
// DSN CONFIGURATION
// =============================================================================

/** Sentry DSN */
export const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Sentry organization */
export const SENTRY_ORG = process.env.SENTRY_ORG;

/** Sentry project */
export const SENTRY_PROJECT = process.env.SENTRY_PROJECT;

/** Sentry auth token (for source maps) */
export const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;

// =============================================================================
// SAMPLE RATES
// =============================================================================

export const SAMPLE_RATES: SampleRates = {
  /** Percentage of errors to capture */
  errorSampleRate: IS_PRODUCTION ? 1.0 : 1.0,

  /** Percentage of transactions to trace */
  tracesSampleRate: IS_PRODUCTION
    ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
    : 1.0,

  /** Percentage of transactions to profile */
  profilesSampleRate: IS_PRODUCTION
    ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1')
    : 0,

  /** Replay sample rate when error occurs */
  replaysOnErrorSampleRate: IS_PRODUCTION ? 1.0 : 0,

  /** Replay sample rate for all sessions */
  replaysSessionSampleRate: IS_PRODUCTION
    ? parseFloat(process.env.SENTRY_REPLAY_SAMPLE_RATE || '0.1')
    : 0,
};

// =============================================================================
// INTEGRATION CONFIGURATION
// =============================================================================

export const INTEGRATION_CONFIG: IntegrationConfig = {
  /** Enable browser tracing for performance */
  browserTracing: true,

  /** Enable HTTP request tracing */
  httpTracing: true,

  /** Enable Prisma query tracing */
  prismaTracing: IS_PRODUCTION,

  /** Capture console.error as breadcrumbs */
  captureConsole: true,

  /** Number of context lines around error */
  contextLines: 5,

  /** Enable session replay */
  replay: IS_PRODUCTION,

  /** Enable profiling */
  profiling: IS_PRODUCTION,
};

// =============================================================================
// FILTERING CONFIGURATION
// =============================================================================

export const FILTERING_CONFIG: FilteringConfig = {
  /** Error messages to ignore */
  ignoreErrors: [
    // Browser extensions
    /^Script error\.?$/,
    /^ResizeObserver loop/,

    // Network errors that are user-side
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'AbortError',
    'TimeoutError',

    // User actions
    'User rejected the request',
    'User denied transaction signature',

    // Benign errors
    'Non-Error promise rejection captured',
    /^Loading chunk \d+ failed/,
    /^Hydration failed/,

    // Auth errors (not bugs)
    'NEXT_REDIRECT',
    'Unauthorized',
  ],

  /** URLs to ignore errors from */
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,

    // Analytics
    /google-analytics\.com/i,
    /googletagmanager\.com/i,
    /segment\.io/i,
    /amplitude\.com/i,

    // Third-party scripts
    /cdn\.jsdelivr\.net/i,
    /unpkg\.com/i,
  ],

  /** Allow errors only from these URLs (empty = allow all) */
  allowUrls: [],

  /** Transaction names to ignore */
  ignoreTransactions: [
    'GET /api/health',
    'GET /api/ping',
    'GET /_next/static',
    'GET /favicon.ico',
  ],

  /** Scrub sensitive data from events */
  scrubData: true,

  /** Fields to scrub */
  scrubFields: [
    'password',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'creditCard',
    'credit_card',
    'ssn',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
  ],
};

// =============================================================================
// PERFORMANCE CONFIGURATION
// =============================================================================

export const PERFORMANCE_CONFIG: PerformanceConfig = {
  /** Enable performance monitoring */
  enabled: IS_PRODUCTION,

  /** Trace requests to these URLs */
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/.*\.progresstracker\.com/,
    /^https:\/\/progresstracker\.com/,
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean) as (string | RegExp)[],

  /** Routes to exclude from tracing */
  excludeRoutes: [
    '/api/health',
    '/api/ping',
    '/_next',
    '/static',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ],

  /** Threshold for slow transactions (ms) */
  slowTransactionThreshold: 3000,
};

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

export const SESSION_CONFIG: SessionConfig = {
  /** Enable session tracking */
  enabled: IS_PRODUCTION,

  /** Session sample rate */
  sampleRate: 1.0,
};

// =============================================================================
// BREADCRUMB CONFIGURATION
// =============================================================================

export const BREADCRUMB_CONFIG: BreadcrumbConfig = {
  /** Maximum breadcrumbs to capture */
  maxBreadcrumbs: 100,

  /** Capture console logs */
  console: true,

  /** Capture DOM interactions */
  dom: true,

  /** Capture fetch requests */
  fetch: true,

  /** Capture XHR requests */
  xhr: true,

  /** Capture navigation */
  history: true,

  /** Capture Sentry events */
  sentry: true,
};

// =============================================================================
// USER CONFIGURATION
// =============================================================================

export const USER_CONFIG: UserConfig = {
  /** Include user IP in reports */
  includeIp: false, // GDPR compliance

  /** Include user email in reports */
  includeEmail: IS_PRODUCTION,

  /** Include username in reports */
  includeUsername: true,
};

// =============================================================================
// DEFAULT TAGS
// =============================================================================

export const DEFAULT_TAGS: Record<string, string> = {
  app: 'progresstracker',
  runtime: typeof window !== 'undefined' ? 'browser' : 'node',
  framework: 'nextjs',
  version: process.env.npm_package_version || 'unknown',
};

// =============================================================================
// RELEASE CONFIGURATION
// =============================================================================

/** Get release version */
export function getRelease(): string | undefined {
  return (
    process.env.SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.npm_package_version
  );
}

/** Get environment name */
export function getEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    NODE_ENV
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Check if Sentry is enabled */
export function isSentryEnabled(): boolean {
  // Disable in test environment
  if (IS_TEST) return false;

  // Check if DSN is configured
  if (!SENTRY_DSN) return false;

  // Check explicit disable flag
  if (process.env.SENTRY_DISABLED === 'true') return false;

  return true;
}

/** Check if error should be filtered */
export function shouldFilterError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error : error.message;

  return FILTERING_CONFIG.ignoreErrors.some(pattern => {
    if (typeof pattern === 'string') {
      return message.includes(pattern);
    }
    return pattern.test(message);
  });
}

/** Check if URL should be filtered */
export function shouldFilterUrl(url: string): boolean {
  return FILTERING_CONFIG.denyUrls.some(pattern => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

/** Check if transaction should be filtered */
export function shouldFilterTransaction(name: string): boolean {
  return FILTERING_CONFIG.ignoreTransactions.some(pattern =>
    name.includes(pattern)
  );
}

/** Scrub sensitive data from object */
export function scrubSensitiveData<T extends Record<string, unknown>>(data: T): T {
  if (!FILTERING_CONFIG.scrubData) return data;

  const scrubbed = { ...data };

  for (const field of FILTERING_CONFIG.scrubFields) {
    if (field in scrubbed) {
      scrubbed[field as keyof T] = '[Filtered]' as T[keyof T];
    }
  }

  return scrubbed;
}

/** Get Sentry user context */
export function getSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
  ip?: string;
}): Record<string, string | undefined> {
  const context: Record<string, string | undefined> = {};

  if (user.id) context.id = user.id;
  if (USER_CONFIG.includeEmail && user.email) context.email = user.email;
  if (USER_CONFIG.includeUsername && user.username) context.username = user.username;
  if (USER_CONFIG.includeIp && user.ip) context.ip_address = user.ip;

  return context;
}

/** Validate Sentry configuration */
export function validateSentryConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (IS_PRODUCTION) {
    if (!SENTRY_DSN) {
      warnings.push('Sentry DSN not configured for production');
    }

    if (!SENTRY_AUTH_TOKEN) {
      warnings.push('Sentry auth token not set (source maps may not upload)');
    }

    if (!SENTRY_ORG || !SENTRY_PROJECT) {
      warnings.push('Sentry org/project not configured');
    }
  }

  // Check sample rates
  const rates = SAMPLE_RATES;
  if (rates.tracesSampleRate > 0.5 && IS_PRODUCTION) {
    warnings.push('High traces sample rate may impact costs');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Get configuration summary */
export function getSentryConfigSummary(): Record<string, unknown> {
  return {
    enabled: isSentryEnabled(),
    environment: getEnvironment(),
    release: getRelease(),
    dsnConfigured: !!SENTRY_DSN,
    errorSampleRate: SAMPLE_RATES.errorSampleRate,
    tracesSampleRate: SAMPLE_RATES.tracesSampleRate,
    performanceEnabled: PERFORMANCE_CONFIG.enabled,
    replayEnabled: INTEGRATION_CONFIG.replay,
    profilingEnabled: INTEGRATION_CONFIG.profiling,
  };
}

// =============================================================================
// SENTRY CLIENT OPTIONS
// =============================================================================

/** Get Sentry client options */
export function getSentryOptions() {
  return {
    dsn: SENTRY_DSN,
    environment: getEnvironment(),
    release: getRelease(),

    // Sample rates
    sampleRate: SAMPLE_RATES.errorSampleRate,
    tracesSampleRate: SAMPLE_RATES.tracesSampleRate,
    profilesSampleRate: SAMPLE_RATES.profilesSampleRate,
    replaysOnErrorSampleRate: SAMPLE_RATES.replaysOnErrorSampleRate,
    replaysSessionSampleRate: SAMPLE_RATES.replaysSessionSampleRate,

    // Breadcrumbs
    maxBreadcrumbs: BREADCRUMB_CONFIG.maxBreadcrumbs,

    // Filtering
    ignoreErrors: FILTERING_CONFIG.ignoreErrors,
    denyUrls: FILTERING_CONFIG.denyUrls,

    // Debug (development only)
    debug: IS_DEVELOPMENT,

    // Attach stack trace to pure capture message
    attachStacktrace: true,

    // Normalize depth
    normalizeDepth: 5,

    // Enable auto session tracking
    autoSessionTracking: SESSION_CONFIG.enabled,

    // Send default PII
    sendDefaultPii: USER_CONFIG.includeEmail || USER_CONFIG.includeUsername,
  };
}

// =============================================================================
// COMBINED CONFIG EXPORT
// =============================================================================

export const SENTRY_CONFIG: SentryConfig = {
  enabled: isSentryEnabled(),
  dsn: SENTRY_DSN,
  environment: getEnvironment(),
  release: getRelease(),
  sampleRates: SAMPLE_RATES,
  integrations: INTEGRATION_CONFIG,
  filtering: FILTERING_CONFIG,
  performance: PERFORMANCE_CONFIG,
  session: SESSION_CONFIG,
  breadcrumbs: BREADCRUMB_CONFIG,
  user: USER_CONFIG,
  tags: DEFAULT_TAGS,
};

export default SENTRY_CONFIG;