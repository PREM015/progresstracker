// src/types/session-info.ts
// Rich session info for active session management

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';
export type SessionStatus = 'active' | 'expired' | 'revoked';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Full session info record (matches Prisma ActiveSession model) */
export interface SessionInfo {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceType?: DeviceType | null;
  deviceName?: string | null;
  browser?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  osVersion?: string | null;
  country?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isTrusted: boolean;
  lastActivity: Date;
  expiresAt: Date;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight session info for list display */
export interface SessionInfoSummary {
  id: string;
  deviceName?: string | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  city?: string | null;
  lastActivity: Date;
  isCurrent: boolean;
  isTrusted: boolean;
  status: SessionStatus;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create session info from request */
export interface CreateSessionInfoInput {
  userId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: DeviceType;
  deviceName?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
}

/** Update session activity */
export interface UpdateSessionActivityInput {
  lastActivity: Date;
  ipAddress?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface SessionInfoListResponse {
  sessions: SessionInfoSummary[];
  total: number;
  currentSessionId: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDeviceIcon(deviceType: DeviceType | null | undefined): string {
  switch (deviceType) {
    case 'mobile': return '📱';
    case 'tablet': return '📟';
    case 'desktop': return '🖥️';
    default: return '💻';
  }
}

export function formatLastActivity(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default SessionInfo;
