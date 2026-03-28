// ============================================================================
// FILE: src/config/auth.ts
// PURPOSE: Authentication and authorization configuration
// ============================================================================

import type { UserRole } from '@/types/user';

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface AuthConfig {
  session: SessionConfig;
  jwt: JWTConfig;
  password: PasswordConfig;
  twoFactor: TwoFactorConfig;
  oauth: OAuthConfig;
  security: SecurityConfig;
  rateLimit: AuthRateLimitConfig;
}

export interface SessionConfig {
  maxAge: number;
  updateAge: number;
  cookieName: string;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  cookieHttpOnly: boolean;
  cookiePath: string;
  maxConcurrentSessions: number;
  sessionTimeout: number;
  extendOnActivity: boolean;
}

export interface JWTConfig {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  algorithm: string;
}

export interface PasswordConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  bcryptRounds: number;
  preventReuse: number;
  maxAge: number;
}

export interface TwoFactorConfig {
  enabled: boolean;
  issuer: string;
  algorithm: string;
  digits: number;
  period: number;
  window: number;
  backupCodesCount: number;
  backupCodeLength: number;
}

export interface OAuthConfig {
  allowDangerousEmailAccountLinking: boolean;
  providers: OAuthProviderConfig[];
  callbackBaseUrl: string;
}

export interface OAuthProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  scopes: string[];
}

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  suspiciousLoginThreshold: number;
  requireEmailVerification: boolean;
  allowPasswordlessLogin: boolean;
  magicLinkExpiry: number;
  passwordResetExpiry: number;
  emailVerificationExpiry: number;
  emailChangeExpiry: number;
}

export interface AuthRateLimitConfig {
  login: { window: number; max: number };
  register: { window: number; max: number };
  passwordReset: { window: number; max: number };
  magicLink: { window: number; max: number };
  twoFactor: { window: number; max: number };
}

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

export const SESSION_CONFIG: SessionConfig = {
  /** Session max age in seconds (30 days) */
  maxAge: parseInt(process.env.SESSION_MAX_AGE || '2592000', 10),

  /** How often to update session in seconds (24 hours) */
  updateAge: 86400,

  /** Session cookie name */
  cookieName: IS_PRODUCTION
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token',

  /** Use secure cookies in production */
  cookieSecure: IS_PRODUCTION,

  /** SameSite cookie policy */
  cookieSameSite: 'lax',

  /** HTTP only cookie */
  cookieHttpOnly: true,

  /** Cookie path */
  cookiePath: '/',

  /** Maximum concurrent sessions per user */
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5', 10),

  /** Session timeout in milliseconds (30 minutes of inactivity) */
  sessionTimeout: 30 * 60 * 1000,

  /** Extend session on activity */
  extendOnActivity: true,
};

// =============================================================================
// JWT CONFIGURATION
// =============================================================================

export const JWT_CONFIG: JWTConfig = {
  /** JWT secret (must be set in production) */
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production',

  /** Access token expiry */
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',

  /** Refresh token expiry */
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  /** JWT issuer */
  issuer: process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.com',

  /** JWT audience */
  audience: process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.com',

  /** JWT signing algorithm */
  algorithm: 'HS256',
};

// =============================================================================
// PASSWORD CONFIGURATION
// =============================================================================

export const PASSWORD_CONFIG: PasswordConfig = {
  /** Minimum password length */
  minLength: 8,

  /** Maximum password length */
  maxLength: 128,

  /** Require uppercase letter */
  requireUppercase: true,

  /** Require lowercase letter */
  requireLowercase: true,

  /** Require number */
  requireNumbers: true,

  /** Require special character */
  requireSpecialChars: true,

  /** Allowed special characters */
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',

  /** BCrypt rounds for hashing */
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  /** Number of previous passwords to prevent reuse */
  preventReuse: 5,

  /** Maximum password age in days (0 = no expiry) */
  maxAge: 0,
};

// =============================================================================
// TWO-FACTOR AUTHENTICATION CONFIGURATION
// =============================================================================

export const TWO_FACTOR_CONFIG: TwoFactorConfig = {
  /** Enable 2FA feature */
  enabled: process.env.TWO_FACTOR_ENABLED !== 'false',

  /** TOTP issuer name */
  issuer: process.env.NEXT_PUBLIC_APP_NAME || 'ProgressTracker',

  /** TOTP algorithm */
  algorithm: 'SHA1',

  /** TOTP digits */
  digits: 6,

  /** TOTP period in seconds */
  period: 30,

  /** TOTP verification window (number of periods) */
  window: 1,

  /** Number of backup codes to generate */
  backupCodesCount: 10,

  /** Length of each backup code */
  backupCodeLength: 8,
};

// =============================================================================
// OAUTH CONFIGURATION
// =============================================================================

export const OAUTH_CONFIG: OAuthConfig = {
  /** Allow linking accounts with same email */
  allowDangerousEmailAccountLinking: true,

  /** Callback base URL */
  callbackBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  /** OAuth providers */
  providers: [
    {
      id: 'google',
      name: 'Google',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scopes: ['openid', 'email', 'profile'],
    },
    {
      id: 'github',
      name: 'GitHub',
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scopes: ['read:user', 'user:email'],
    },
    {
      id: 'discord',
      name: 'Discord',
      enabled: !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      scopes: ['identify', 'email'],
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      enabled: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      scopes: ['r_liteprofile', 'r_emailaddress'],
    },
  ],
};

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export const SECURITY_CONFIG: SecurityConfig = {
  /** Maximum login attempts before lockout */
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),

  /** Account lockout duration in seconds (15 minutes) */
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900', 10),

  /** Number of suspicious logins before alert */
  suspiciousLoginThreshold: 3,

  /** Require email verification for new accounts */
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',

  /** Allow passwordless (magic link) login */
  allowPasswordlessLogin: process.env.ALLOW_PASSWORDLESS !== 'false',

  /** Magic link expiry in seconds (15 minutes) */
  magicLinkExpiry: parseInt(process.env.MAGIC_LINK_EXPIRY || '900', 10),

  /** Password reset token expiry in seconds (1 hour) */
  passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '3600', 10),

  /** Email verification token expiry in seconds (24 hours) */
  emailVerificationExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '86400', 10),

  /** Email change request expiry in seconds (24 hours) */
  emailChangeExpiry: parseInt(process.env.EMAIL_CHANGE_EXPIRY || '86400', 10),
};

// =============================================================================
// AUTH RATE LIMITING
// =============================================================================

export const AUTH_RATE_LIMITS: AuthRateLimitConfig = {
  /** Login rate limit */
  login: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 10,
  },

  /** Registration rate limit */
  register: {
    window: 60 * 60 * 1000, // 1 hour
    max: 5,
  },

  /** Password reset rate limit */
  passwordReset: {
    window: 60 * 60 * 1000, // 1 hour
    max: 3,
  },

  /** Magic link rate limit */
  magicLink: {
    window: 15 * 60 * 1000, // 15 minutes
    max: 5,
  },

  /** 2FA verification rate limit */
  twoFactor: {
    window: 5 * 60 * 1000, // 5 minutes
    max: 5,
  },
};

// =============================================================================
// ROLE & PERMISSION CONFIGURATION
// =============================================================================

export const ROLES: Record<UserRole, {
  label: string;
  level: number;
  permissions: string[];
}> = {
  user: {
    label: 'User',
    level: 1,
    permissions: [
      'read:own',
      'write:own',
      'delete:own',
      'export:own',
    ],
  },
  admin: {
    label: 'Administrator',
    level: 100,
    permissions: [
      'read:all',
      'write:all',
      'delete:all',
      'export:all',
      'manage:users',
      'manage:content',
      'manage:settings',
      'manage:billing',
      'view:admin',
      'impersonate:users',
    ],
  },
};

export const PERMISSIONS = {
  // User permissions
  READ_OWN: 'read:own',
  WRITE_OWN: 'write:own',
  DELETE_OWN: 'delete:own',
  EXPORT_OWN: 'export:own',

  // Admin permissions
  READ_ALL: 'read:all',
  WRITE_ALL: 'write:all',
  DELETE_ALL: 'delete:all',
  EXPORT_ALL: 'export:all',
  MANAGE_USERS: 'manage:users',
  MANAGE_CONTENT: 'manage:content',
  MANAGE_SETTINGS: 'manage:settings',
  MANAGE_BILLING: 'manage:billing',
  VIEW_ADMIN: 'view:admin',
  IMPERSONATE_USERS: 'impersonate:users',
} as const;

// =============================================================================
// AUTH PAGES
// =============================================================================

export const AUTH_PAGES = {
  signIn: '/login',
  signUp: '/register',
  signOut: '/logout',
  error: '/auth/error',
  verifyRequest: '/verify-email',
  newUser: '/onboarding',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  twoFactorSetup: '/2fa/setup',
  twoFactorVerify: '/2fa/verify',
} as const;

export const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
  '/goals',
  '/achievements',
  '/tracker',
  '/analytics',
  '/export',
  '/notifications',
  '/profile',
  '/api-keys',
  '/billing',
  '/webhooks',
  '/connected-platforms',
  '/sync',
  '/reports',
  '/support/tickets',
] as const;

export const ADMIN_ROUTES = [
  '/admin',
] as const;

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/magic-link',
  '/about',
  '/features',
  '/pricing',
  '/blog',
  '/changelog',
  '/docs',
  '/privacy',
  '/terms',
  '/contact',
  '/status',
  '/waitlist',
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Check if user has permission */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  return userPermissions.includes(permission) || userPermissions.includes('*');
}

/** Check if user has role */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLES[userRole].level >= ROLES[requiredRole].level;
}

/** Get role permissions */
export function getRolePermissions(role: UserRole): string[] {
  return ROLES[role].permissions;
}

/** Check if route is protected */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/** Check if route is admin route */
export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route));
}

/** Check if route is public */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

/** Get enabled OAuth providers */
export function getEnabledOAuthProviders(): OAuthProviderConfig[] {
  return OAUTH_CONFIG.providers.filter(p => p.enabled);
}

/** Validate password against policy */
export function validatePasswordPolicy(password: string): {
  valid: boolean;
  errors: string[];
  strength: number;
} {
  const errors: string[] = [];
  let strength = 0;

  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.minLength} characters`);
  } else {
    strength += 1;
  }

  if (password.length > PASSWORD_CONFIG.maxLength) {
    errors.push(`Password must be less than ${PASSWORD_CONFIG.maxLength} characters`);
  }

  if (PASSWORD_CONFIG.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  } else if (PASSWORD_CONFIG.requireLowercase) {
    strength += 1;
  }

  if (PASSWORD_CONFIG.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  } else if (PASSWORD_CONFIG.requireUppercase) {
    strength += 1;
  }

  if (PASSWORD_CONFIG.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  } else if (PASSWORD_CONFIG.requireNumbers) {
    strength += 1;
  }

  if (PASSWORD_CONFIG.requireSpecialChars) {
    const specialRegex = new RegExp(`[${PASSWORD_CONFIG.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain a special character');
    } else {
      strength += 1;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: Math.min(5, strength),
  };
}

/** Parse JWT expiry string to milliseconds */
export function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

/** Validate auth configuration */
export function validateAuthConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check JWT secret
  if (!process.env.NEXTAUTH_SECRET) {
    if (IS_PRODUCTION) {
      errors.push('NEXTAUTH_SECRET is required in production');
    } else {
      warnings.push('NEXTAUTH_SECRET not set, using default (development only)');
    }
  }

  // Check OAuth providers
  const enabledProviders = getEnabledOAuthProviders();
  if (enabledProviders.length === 0) {
    warnings.push('No OAuth providers configured');
  }

  // Check bcrypt rounds
  if (PASSWORD_CONFIG.bcryptRounds < 10) {
    warnings.push('BCrypt rounds below 10 is not recommended for production');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// COMBINED CONFIG EXPORT
// =============================================================================

export const AUTH_CONFIG: AuthConfig = {
  session: SESSION_CONFIG,
  jwt: JWT_CONFIG,
  password: PASSWORD_CONFIG,
  twoFactor: TWO_FACTOR_CONFIG,
  oauth: OAUTH_CONFIG,
  security: SECURITY_CONFIG,
  rateLimit: AUTH_RATE_LIMITS,
};

export default AUTH_CONFIG;