// src/types/share-link.ts
// Share link types for public profile sharing

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ShareLinkType = 'profile' | 'stats' | 'streak' | 'goals' | 'achievements' | 'report';
export type ShareLinkStatus = 'active' | 'expired' | 'revoked';

export const SHARE_LINK_BASE_URL = '/share';
export const DEFAULT_SHARE_LINK_EXPIRY_DAYS = 30;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Share link record (matches Prisma ShareLink model) */
export interface ShareLink {
  id: string;
  userId: string;
  code: string; // Short unique code for URL
  type: ShareLinkType;
  title?: string | null;
  description?: string | null;
  status: ShareLinkStatus;
  isPublic: boolean;
  requiresPassword: boolean;
  passwordHash?: string | null;
  allowedViews?: number | null; // Max views, null = unlimited
  viewCount: number;
  expiresAt?: Date | null;
  lastViewedAt?: Date | null;
  customization?: ShareLinkCustomization | null;
  includedData: ShareLinkDataOptions;
  createdAt: Date;
  updatedAt: Date;
}

/** Customization options for share page */
export interface ShareLinkCustomization {
  theme?: 'light' | 'dark';
  primaryColor?: string;
  showBranding?: boolean;
  showAvatar?: boolean;
}

/** Which data to include in share */
export interface ShareLinkDataOptions {
  showStreak?: boolean;
  showTotalProblems?: boolean;
  showPlatforms?: boolean;
  showGoals?: boolean;
  showAchievements?: boolean;
  showHeatmap?: boolean;
  showStats?: boolean;
  dateRange?: {
    start?: string;
    end?: string;
    preset?: '7d' | '30d' | '90d' | '365d' | 'all';
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateShareLinkInput {
  type: ShareLinkType;
  title?: string;
  description?: string;
  isPublic?: boolean;
  password?: string;
  allowedViews?: number;
  expiresAt?: Date;
  customization?: ShareLinkCustomization;
  includedData?: ShareLinkDataOptions;
}

export interface UpdateShareLinkInput extends Partial<CreateShareLinkInput> {
  status?: ShareLinkStatus;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ShareLinkListResponse {
  links: ShareLink[];
  total: number;
  activeCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function buildShareUrl(code: string): string {
  return `${SHARE_LINK_BASE_URL}/${code}`;
}

export function isShareLinkAccessible(link: Pick<ShareLink, 'status' | 'expiresAt' | 'allowedViews' | 'viewCount'>): boolean {
  if (link.status !== 'active') return false;
  if (link.expiresAt && new Date() > new Date(link.expiresAt)) return false;
  if (link.allowedViews !== null && link.allowedViews !== undefined && link.viewCount >= link.allowedViews) return false;
  return true;
}

export default ShareLink;
