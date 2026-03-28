// src/types/session.ts
// Session types matching Prisma schema + NextAuth

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Database session record (matches Prisma Session model) */
export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Session with user relation */
export interface SessionWithUser extends Session {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
  };
}

/** Session metadata for analytics */
export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  lastActivity?: Date;
}

// =============================================================================
// INPUT/REQUEST TYPES
// =============================================================================

/** Create session input */
export interface CreateSessionInput {
  sessionToken: string;
  userId: string;
  expires: Date;
}

/** Update session expiry input */
export interface UpdateSessionInput {
  expires: Date;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Active sessions list for user account page */
export interface ActiveSessionsResponse {
  sessions: SessionWithMetadata[];
  total: number;
  currentSessionId?: string;
}

/** Session with metadata */
export interface SessionWithMetadata extends Session {
  metadata?: SessionMetadata;
  isCurrent?: boolean;
  isExpired: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Check if a session is expired */
export function isSessionExpired(session: Pick<Session, 'expires'>): boolean {
  return new Date() > new Date(session.expires);
}

/** Format session expiry for display */
export function formatSessionExpiry(expires: Date): string {
  const diff = new Date(expires).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `Expires in ${days}d`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `Expires in ${hours}h`;
  return 'Expires soon';
}

export default Session;
