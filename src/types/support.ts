// src/types/security.ts
// ===== FILE: src/types/security.ts =====
// Complete security types for authentication, sessions, and 2FA

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Security event type */
export type SecurityEventType = 
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'password_change'
  | 'password_reset'
  | 'email_change'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | 'session_created'
  | 'session_revoked'
  | 'api_key_created'
  | 'api_key_deleted'
  | 'suspicious_activity';

/** Session status */
export type SessionStatus = 'active' | 'expired' | 'revoked';

/** Device type */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

/** 2FA method */
export type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup_code';

// =============================================================================
// SESSION TYPES
// =============================================================================

/** Active session (matches Prisma ActiveSession model) */
export interface ActiveSession {
  id: string;
  userId: string;
  
  // Token
  token: string;
  
  // Device
  userAgent?: string;
  ipAddress?: string;
  device?: string;
  deviceModel?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  
  // Location
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  
  // Status
  isValid: boolean;
  isCurrent: boolean;
  
  // Activity
  lastActiveAt: Date;
  expiresAt: Date;
  
  // Revocation
  revokedAt?: Date;
  revokedReason?: string;
  
  createdAt: Date;
}

/** Session for display */
export interface SessionDisplay extends ActiveSession {
  status: SessionStatus;
  deviceType: DeviceType;
  deviceLabel: string;
  locationLabel: string;
  formattedLastActive: string;
  isExpiringSoon: boolean;
}

/** Refresh token (matches Prisma RefreshToken model) */
export interface RefreshToken {
  id: string;
  userId: string;
  
  token: string;
  family: string;
  
  deviceId?: string;
  
  isValid: boolean;
  
  expiresAt: Date;
  
  revokedAt?: Date;
  revokedReason?: string;
  replacedByToken?: string;
  
  createdAt: Date;
}

// =============================================================================
// TWO-FACTOR AUTHENTICATION TYPES
// =============================================================================

/** Two-factor auth (matches Prisma TwoFactorAuth model) */
export interface TwoFactorAuth {
  id: string;
  userId: string;
  
  secret: string; // Encrypted
  
  isEnabled: boolean;
  isPending: boolean;
  
  verifiedAt?: Date;
  lastUsedAt?: Date;
  
  recoveryEmail?: string;
  recoveryPhone?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/** Backup code (matches Prisma BackupCode model) */
export interface BackupCode {
  id: string;
  userId: string;
  
  code: string; // Hashed
  
  usedAt?: Date;
  usedIpAddress?: string;
  
  createdAt: Date;
}

/** 2FA setup data */
export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

/** 2FA verification input */
export interface TwoFactorVerifyInput {
  code: string;
  method: TwoFactorMethod;
  trustDevice?: boolean;
}

// =============================================================================
// LOGIN & AUTHENTICATION TYPES
// =============================================================================

/** Login attempt (matches Prisma LoginAttempt model) */
export interface LoginAttempt {
  id: string;
  userId?: string;
  
  email: string;
  
  success: boolean;
  failureReason?: string;
  
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  
  twoFactorRequired: boolean;
  twoFactorPassed: boolean;
  
  createdAt: Date;
}

/** Login history item */
export interface LoginHistoryItem extends LoginAttempt {
  deviceLabel: string;
  locationLabel: string;
  formattedDate: string;
}

/** Password reset (matches Prisma PasswordReset model) */
export interface PasswordReset {
  id: string;
  userId: string;
  
  token: string; // Hashed
  expiresAt: Date;
  usedAt?: Date;
  
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date;
}

/** Email verification (matches Prisma EmailVerification model) */
export interface EmailVerification {
  id: string;
  userId: string;
  
  email: string;
  token: string;
  expiresAt: Date;
  verifiedAt?: Date;
  
  type: string; // 'verification' | 'change'
  
  verifiedIp?: string;
  
  createdAt: Date;
}

/** Email change request (matches Prisma EmailChangeRequest model) */
export interface EmailChangeRequest {
  id: string;
  userId: string;
  
  oldEmail: string;
  newEmail: string;
  
  oldEmailToken: string;
  newEmailToken: string;
  
  oldEmailVerified: boolean;
  newEmailVerified: boolean;
  
  expiresAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  createdAt: Date;
}

// =============================================================================
// API KEY TYPES
// =============================================================================

/** API key (matches Prisma ApiKey model) */
export interface ApiKey {
  id: string;
  userId: string;
  
  name: string;
  description?: string;
  
  keyHash: string;
  keyPrefix: string;
  
  scopes: string[];
  
  rateLimit: number;
  rateLimitWindow: number;
  
  allowedIps: string[];
  allowedOrigins: string[];
  
  isActive: boolean;
  
  expiresAt?: Date;
  
  lastUsedAt?: Date;
  lastUsedIp?: string;
  usageCount: number;
  usageCountDaily: number;
  usageResetAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/** API key display */
export interface ApiKeyDisplay extends ApiKey {
  maskedKey: string;
  statusLabel: string;
  statusColor: string;
  formattedLastUsed: string;
  isExpired: boolean;
  daysUntilExpiry?: number;
}

// =============================================================================
// SECURITY EVENT TYPES
// =============================================================================

/** Security event */
export interface SecurityEvent {
  id: string;
  userId: string;
  type: SecurityEventType;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/** Suspicious activity alert */
export interface SuspiciousActivityAlert {
  id: string;
  userId: string;
  type: 'multiple_failed_logins' | 'unusual_location' | 'unusual_device' | 'unusual_time';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  events: SecurityEvent[];
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Enable 2FA input */
export interface Enable2FAInput {
  code: string;
  backupCodes?: string[];
}

/** Verify 2FA input */
export interface Verify2FAInput {
  code: string;
  trustDevice?: boolean;
}

/** Create API key input */
export interface CreateApiKeyInput {
  name: string;
  description?: string;
  scopes?: string[];
  expiresIn?: number; // days
  allowedIps?: string[];
  allowedOrigins?: string[];
}

/** Update API key input */
export interface UpdateApiKeyInput {
  name?: string;
  description?: string;
  scopes?: string[];
  isActive?: boolean;
}

/** Revoke session input */
export interface RevokeSessionInput {
  sessionId: string;
  reason?: string;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Security event configuration */
export const SECURITY_EVENT_CONFIG: Record<SecurityEventType, {
  label: string;
  icon: string;
  color: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  login: { label: 'Login', icon: 'LogIn', color: '#10B981', severity: 'low' },
  login_failed: { label: 'Failed Login', icon: 'XCircle', color: '#EF4444', severity: 'medium' },
  logout: { label: 'Logout', icon: 'LogOut', color: '#6B7280', severity: 'low' },
  password_change: { label: 'Password Changed', icon: 'Key', color: '#8B5CF6', severity: 'high' },
  password_reset: { label: 'Password Reset', icon: 'RefreshCw', color: '#F59E0B', severity: 'high' },
  email_change: { label: 'Email Changed', icon: 'Mail', color: '#3B82F6', severity: 'high' },
  '2fa_enabled': { label: '2FA Enabled', icon: 'Shield', color: '#10B981', severity: 'high' },
  '2fa_disabled': { label: '2FA Disabled', icon: 'ShieldOff', color: '#EF4444', severity: 'critical' },
  '2fa_verified': { label: '2FA Verified', icon: 'CheckCircle', color: '#10B981', severity: 'low' },
  '2fa_failed': { label: '2FA Failed', icon: 'XCircle', color: '#EF4444', severity: 'medium' },
  session_created: { label: 'Session Created', icon: 'Plus', color: '#3B82F6', severity: 'low' },
  session_revoked: { label: 'Session Revoked', icon: 'Trash', color: '#F59E0B', severity: 'medium' },
  api_key_created: { label: 'API Key Created', icon: 'Key', color: '#8B5CF6', severity: 'medium' },
  api_key_deleted: { label: 'API Key Deleted', icon: 'Trash', color: '#EF4444', severity: 'medium' },
  suspicious_activity: { label: 'Suspicious Activity', icon: 'AlertTriangle', color: '#DC2626', severity: 'critical' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get session status */
export function getSessionStatus(session: ActiveSession): SessionStatus {
  if (session.revokedAt) return 'revoked';
  if (!session.isValid || new Date() > new Date(session.expiresAt)) return 'expired';
  return 'active';
}

/** Determine device type */
export function determineDeviceType(userAgent?: string): DeviceType {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Format device label */
export function formatDeviceLabel(session: ActiveSession): string {
  const parts: string[] = [];
  
  if (session.browser) {
    parts.push(session.browser);
    if (session.browserVersion) parts[parts.length - 1] += ` ${session.browserVersion}`;
  }
  
  if (session.os) {
    parts.push(`on ${session.os}${session.osVersion ? ` ${session.osVersion}` : ''}`);
  }
  
  if (session.deviceModel) {
    parts.push(session.deviceModel);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Unknown Device';
}

/** Format location label */
export function formatLocationLabel(session: ActiveSession): string {
  const parts: string[] = [];
  
  if (session.city) parts.push(session.city);
  if (session.region && session.region !== session.city) parts.push(session.region);
  if (session.country) parts.push(session.country);
  
  return parts.length > 0 ? parts.join(', ') : session.ipAddress || 'Unknown Location';
}

/** Check if session is expiring soon */
export function isSessionExpiringSoon(session: ActiveSession, hoursThreshold = 24): boolean {
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursUntilExpiry > 0 && hoursUntilExpiry <= hoursThreshold;
}

/** Mask API key */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}${'*'.repeat(32)}`;
}

/** Check if API key is expired */
export function isApiKeyExpired(apiKey: ApiKey): boolean {
  if (!apiKey.expiresAt) return false;
  return new Date() > new Date(apiKey.expiresAt);
}

/** Get days until API key expiry */
export function getDaysUntilExpiry(apiKey: ApiKey): number | undefined {
  if (!apiKey.expiresAt) return undefined;
  const now = new Date();
  const expiresAt = new Date(apiKey.expiresAt);
  const diff = expiresAt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Generate backup codes */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || '';
    
    codes.push(code);
  }
  
  return codes;
}

/** Hash backup code */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Detect suspicious activity */
export function detectSuspiciousLogin(
  attempt: LoginAttempt,
  recentAttempts: LoginAttempt[]
): boolean {
  // Multiple failed attempts
  const recentFailed = recentAttempts.filter(a => 
    !a.success && 
    a.email === attempt.email &&
    Date.now() - new Date(a.createdAt).getTime() < 3600000 // 1 hour
  );
  
  if (recentFailed.length >= 5) return true;
  
  // Login from unusual location
  const userLocations = new Set(
    recentAttempts
      .filter(a => a.success)
      .map(a => a.country)
      .filter(Boolean)
  );
  
  if (attempt.country && userLocations.size > 0 && !userLocations.has(attempt.country)) {
    return true;
  }
  
  return false;
}

export default ActiveSession;