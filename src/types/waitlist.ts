// src/types/waitlist.ts
// ===== FILE: src/types/waitlist.ts =====
// Complete waitlist types matching Prisma Waitlist model

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Waitlist status */
export type WaitlistStatus = 'waiting' | 'invited' | 'joined' | 'expired';

/** Waitlist source */
export type WaitlistSource = 
  | 'landing'
  | 'blog'
  | 'social'
  | 'referral'
  | 'organic'
  | 'paid'
  | 'other';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Waitlist entry (matches Prisma Waitlist model) */
export interface WaitlistEntry {
  id: string;

  // Identity
  email: string;
  name?: string;

  // Source
  source?: string;
  referralCode?: string;

  // Status
  status: string;

  // Invite
  invitedAt?: Date;
  inviteCode?: string;
  joinedAt?: Date;

  // Position
  position?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Waitlist entry for display */
export interface WaitlistEntryDisplay extends WaitlistEntry {
  statusLabel: string;
  statusColor: string;
  statusBgColor: string;
  formattedDate: string;
  daysWaiting: number;
  hasReferrals: boolean;
}

/** Waitlist stats */
export interface WaitlistStats {
  total: number;
  waiting: number;
  invited: number;
  joined: number;
  expired: number;
  conversionRate: number;
  avgWaitTime: number; // days
  bySource: Record<WaitlistSource, number>;
  recentSignups: WaitlistEntry[];
  topReferrers: Array<{
    email: string;
    referralCount: number;
  }>;
  growthThisWeek: number;
  growthThisMonth: number;
}

/** Waitlist invite */
export interface WaitlistInvite {
  email: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Join waitlist input */
export interface JoinWaitlistInput {
  email: string;
  name?: string;
  source?: WaitlistSource;
  referralCode?: string;
}

/** Send invites input */
export interface SendInvitesInput {
  count: number;
  prioritize?: 'oldest' | 'referrals' | 'random';
}

/** Update waitlist entry input */
export interface UpdateWaitlistEntryInput {
  status?: WaitlistStatus;
  position?: number;
  inviteCode?: string;
}

/** Waitlist filter */
export interface WaitlistFilter {
  status?: WaitlistStatus;
  source?: WaitlistSource;
  hasReferrals?: boolean;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Status configuration */
export const WAITLIST_STATUS_CONFIG: Record<WaitlistStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  waiting: {
    label: 'Waiting',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock'
  },
  invited: {
    label: 'Invited',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Mail'
  },
  joined: {
    label: 'Joined',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  expired: {
    label: 'Expired',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'XCircle'
  },
};

/** Source configuration */
export const WAITLIST_SOURCE_CONFIG: Record<WaitlistSource, {
  label: string;
  icon: string;
  color: string;
}> = {
  landing: {
    label: 'Landing Page',
    icon: 'Home',
    color: '#3B82F6'
  },
  blog: {
    label: 'Blog',
    icon: 'BookOpen',
    color: '#8B5CF6'
  },
  social: {
    label: 'Social Media',
    icon: 'Share2',
    color: '#EC4899'
  },
  referral: {
    label: 'Referral',
    icon: 'Users',
    color: '#10B981'
  },
  organic: {
    label: 'Organic Search',
    icon: 'Search',
    color: '#F59E0B'
  },
  paid: {
    label: 'Paid Ads',
    icon: 'DollarSign',
    color: '#EF4444'
  },
  other: {
    label: 'Other',
    icon: 'MoreHorizontal',
    color: '#6B7280'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get waitlist status config */
export function getWaitlistStatusConfig(status: WaitlistStatus) {
  return WAITLIST_STATUS_CONFIG[status];
}

/** Get waitlist source config */
export function getWaitlistSourceConfig(source: WaitlistSource) {
  return WAITLIST_SOURCE_CONFIG[source];
}

/** Calculate days waiting */
export function calculateDaysWaiting(entry: WaitlistEntry): number {
  const now = new Date();
  const created = new Date(entry.createdAt);
  const diff = now.getTime() - created.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Generate invite code */
export function generateInviteCode(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Generate invite URL */
export function generateInviteUrl(inviteCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/invite/${inviteCode}`;
}

/** Format waitlist entry for display */
export function formatWaitlistEntry(entry: WaitlistEntry): WaitlistEntryDisplay {
  const statusConfig = WAITLIST_STATUS_CONFIG[entry.status as WaitlistStatus];

  return {
    ...entry,
    statusLabel: statusConfig.label,
    statusColor: statusConfig.color,
    statusBgColor: statusConfig.bgColor,
    formattedDate: new Date(entry.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    daysWaiting: calculateDaysWaiting(entry),
    hasReferrals: !!entry.referralCode,
  };
}

/** Calculate conversion rate */
export function calculateConversionRate(total: number, joined: number): number {
  if (total === 0) return 0;
  return Math.round((joined / total) * 100);
}

/** Calculate average wait time */
export function calculateAvgWaitTime(entries: WaitlistEntry[]): number {
  const joined = entries.filter(e => e.joinedAt);
  if (joined.length === 0) return 0;

  const totalDays = joined.reduce((sum, entry) => {
    const created = new Date(entry.createdAt).getTime();
    const joinedAt = new Date(entry.joinedAt!).getTime();
    const days = (joinedAt - created) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round(totalDays / joined.length);
}

/** Sort by priority */
export function sortByPriority(
  entries: WaitlistEntry[],
  strategy: 'oldest' | 'referrals' | 'random'
): WaitlistEntry[] {
  const sorted = [...entries];

  switch (strategy) {
    case 'oldest':
      return sorted.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    
    case 'referrals':
      return sorted.sort((a, b) => {
        // Prioritize those with referral codes (they were referred)
        const aHasRef = a.referralCode ? 1 : 0;
        const bHasRef = b.referralCode ? 1 : 0;
        if (aHasRef !== bHasRef) return bHasRef - aHasRef;
        // Then by oldest
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    
    case 'random':
      return sorted.sort(() => Math.random() - 0.5);
    
    default:
      return sorted;
  }
}

/** Group by source */
export function groupBySource(entries: WaitlistEntry[]): Record<WaitlistSource, WaitlistEntry[]> {
  return entries.reduce((acc, entry) => {
    const source = (entry.source as WaitlistSource) || 'other';
    if (!acc[source]) acc[source] = [];
    acc[source].push(entry);
    return acc;
  }, {} as Record<WaitlistSource, WaitlistEntry[]>);
}

/** Get top referrers */
export function getTopReferrers(
  entries: WaitlistEntry[],
  limit = 10
): Array<{ email: string; referralCount: number }> {
  const referralCounts = new Map<string, number>();

  entries.forEach(entry => {
    if (entry.referralCode) {
      // This person was referred, find who referred them
      // In a real implementation, you'd track referrer-referee relationship
      // This is a simplified version
      const count = referralCounts.get(entry.email) || 0;
      referralCounts.set(entry.email, count + 1);
    }
  });

  return Array.from(referralCounts.entries())
    .map(([email, count]) => ({ email, referralCount: count }))
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, limit);
}

/** Validate email */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Check if invite is expired */
export function isInviteExpired(invitedAt: Date, expiryDays = 7): boolean {
  const now = new Date();
  const invited = new Date(invitedAt);
  const daysSinceInvite = (now.getTime() - invited.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceInvite > expiryDays;
}

/** Get next position */
export function getNextPosition(entries: WaitlistEntry[]): number {
  const positions = entries.map(e => e.position).filter((p): p is number => p !== null);
  return positions.length > 0 ? Math.max(...positions) + 1 : 1;
}

export default WaitlistEntry;