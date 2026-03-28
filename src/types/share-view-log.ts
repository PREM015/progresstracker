// src/types/share-view-log.ts
// Share link view tracking types

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Share view log record (matches Prisma ShareViewLog model) */
export interface ShareViewLog {
  id: string;
  shareLinkId: string;
  viewerUserId?: string | null; // null for anonymous
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  country?: string | null;
  city?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  viewedAt: Date;
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Share analytics for a single link */
export interface ShareLinkAnalytics {
  shareLinkId: string;
  totalViews: number;
  uniqueViews: number;
  registeredViews: number;
  anonymousViews: number;
  topCountries: Array<{ country: string; count: number }>;
  topReferrers: Array<{ referrer: string | null; count: number }>;
  viewsByDay: Array<{ date: string; count: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number; other: number };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface RecordShareViewInput {
  shareLinkId: string;
  viewerUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface ShareViewLogQuery {
  shareLinkId?: string;
  viewerUserId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  page?: number;
}

export default ShareViewLog;
