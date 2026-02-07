// ============================================================================
// FILE: types/referral.ts
// PURPOSE: Referral-related type definitions
// ============================================================================

import type { User } from './user';
import type { SubscriptionTier } from './billing';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Referral status */
export type ReferralStatus = 
  | 'pending'      // Invited but not signed up
  | 'registered'   // Signed up but not completed qualifying action
  | 'completed'    // Completed qualifying action, reward earned
  | 'expired'      // Invitation expired
  | 'cancelled';   // Referral cancelled

/** Referral reward type */
export type ReferralRewardType = 
  | 'credits'      // Account credits
  | 'discount'     // Percentage or fixed discount
  | 'free_month'   // Free subscription month
  | 'upgrade'      // Tier upgrade
  | 'feature'      // Feature unlock
  | 'custom';      // Custom reward

/** Referral event type */
export type ReferralEventType = 
  | 'invite_sent'
  | 'invite_clicked'
  | 'user_registered'
  | 'user_verified'
  | 'user_subscribed'
  | 'reward_earned'
  | 'reward_redeemed';

/** Qualifying action for reward */
export type QualifyingAction = 
  | 'signup'           // Just sign up
  | 'verify_email'     // Verify email
  | 'first_sync'       // Complete first platform sync
  | 'subscribe'        // Start paid subscription
  | 'subscribe_paid';  // Complete first payment

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Referral relationship */
export interface Referral {
  id: string;
  
  // Referrer (person who invited)
  referrerId: string;
  referrer?: User;
  
  // Referee (person who was invited)
  refereeId: string;
  referee?: User;
  
  // Referral code used
  referralCode: string;
  
  // Status
  status: ReferralStatus;
  
  // Tracking
  invitedAt: Date;
  registeredAt?: Date | null;
  completedAt?: Date | null;
  expiredAt?: Date | null;
  
  // Rewards
  referrerRewardEarned: boolean;
  referrerRewardRedeemedAt?: Date | null;
  refereeRewardEarned: boolean;
  refereeRewardRedeemedAt?: Date | null;
  
  // Attribution
  source?: string;  // 'email', 'link', 'social', etc.
  campaign?: string;
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Referral code details */
export interface ReferralCode {
  code: string;
  userId: string;
  user?: User;
  
  // Status
  isActive: boolean;
  isCustom: boolean;
  
  // Usage stats
  usageCount: number;
  usageLimit?: number | null;
  
  // Validity
  expiresAt?: Date | null;
  
  // Customization
  description?: string;
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Referral statistics */
export interface ReferralStats {
  // Overview
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  conversionRate: number; // percentage
  
  // Rewards
  totalRewardsEarned: number;
  totalRewardsRedeemed: number;
  pendingRewards: number;
  rewardValue: number; // monetary value or credits
  
  // Timeline
  thisMonth: {
    referrals: number;
    completed: number;
    rewards: number;
  };
  lastMonth: {
    referrals: number;
    completed: number;
    rewards: number;
  };
  allTime: {
    referrals: number;
    completed: number;
    rewards: number;
  };
  
  // Rankings
  rank?: number;
  percentile?: number;
  
  // Referral code
  referralCode: string;
  codeUsageCount: number;
  
  // Top referrals
  topReferrals: ReferralSummary[];
  recentReferrals: ReferralSummary[];
}

/** Referral summary (simplified) */
export interface ReferralSummary {
  id: string;
  refereeId: string;
  refereeName?: string;
  refereeEmail?: string;
  refereeImage?: string;
  status: ReferralStatus;
  invitedAt: Date;
  completedAt?: Date | null;
  rewardEarned: boolean;
  source?: string;
}

/** Referral reward configuration */
export interface ReferralReward {
  id: string;
  name: string;
  description: string;
  type: ReferralRewardType;
  
  // Reward details
  value: number;
  valueType: 'percentage' | 'fixed' | 'credits' | 'days';
  currency?: string;
  
  // Eligibility
  forReferrer: boolean;
  forReferee: boolean;
  minTier?: SubscriptionTier;
  qualifyingAction: QualifyingAction;
  
  // Constraints
  maxRedemptions?: number;
  expiresAfterDays?: number;
  stackable: boolean;
  
  // Status
  isActive: boolean;
  
  // Display
  icon?: string;
  color?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/** Referral invitation */
export interface ReferralInvite {
  id: string;
  referrerId: string;
  
  // Recipient
  email: string;
  name?: string;
  
  // Invitation
  referralCode: string;
  inviteLink: string;
  message?: string;
  
  // Status
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'registered' | 'bounced';
  sentAt: Date;
  openedAt?: Date | null;
  clickedAt?: Date | null;
  
  // Attribution
  source: string;
  campaign?: string;
  
  createdAt: Date;
}

/** Referral event (tracking) */
export interface ReferralEvent {
  id: string;
  referralId: string;
  type: ReferralEventType;
  
  // Details
  userId?: string;
  data?: Record<string, unknown>;
  
  // Tracking
  ipAddress?: string;
  userAgent?: string;
  
  createdAt: Date;
}

/** Referral leaderboard entry */
export interface ReferralLeaderboardEntry {
  rank: number;
  userId: string;
  username?: string;
  name?: string;
  image?: string;
  
  // Stats
  totalReferrals: number;
  completedReferrals: number;
  conversionRate: number;
  totalRewards: number;
  
  // Highlights
  isCurrentUser?: boolean;
  isTopPerformer?: boolean;
  
  // Period
  period: 'all_time' | 'month' | 'week';
}

/** Referral campaign */
export interface ReferralCampaign {
  id: string;
  name: string;
  description?: string;
  
  // Targeting
  targetTiers?: SubscriptionTier[];
  targetUserIds?: string[];
  
  // Rewards
  referrerReward: ReferralReward;
  refereeReward: ReferralReward;
  
  // Duration
  startDate: Date;
  endDate?: Date | null;
  
  // Stats
  totalInvites: number;
  totalRegistrations: number;
  totalCompletions: number;
  
  // Status
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Apply referral code input */
export interface ApplyReferralInput {
  referralCode: string;
  userId: string;
}

/** Send referral invite input */
export interface SendReferralInviteInput {
  emails: string[];
  message?: string;
  source?: string;
  campaign?: string;
}

/** Create custom referral code input */
export interface CreateReferralCodeInput {
  code: string;
  description?: string;
  usageLimit?: number;
  expiresAt?: Date;
}

/** Update referral status input */
export interface UpdateReferralStatusInput {
  referralId: string;
  status: ReferralStatus;
  metadata?: Record<string, unknown>;
}

/** Redeem reward input */
export interface RedeemReferralRewardInput {
  referralId: string;
  userId: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Referral response */
export interface ReferralResponse {
  success: boolean;
  referral?: Referral;
  error?: string;
  message?: string;
}

/** Referral stats response */
export interface ReferralStatsResponse {
  success: boolean;
  stats: ReferralStats;
  error?: string;
}

/** Referral code response */
export interface ReferralCodeResponse {
  success: boolean;
  code: ReferralCode;
  shareLink: string;
  error?: string;
}

/** Referral list response */
export interface ReferralListResponse {
  success: boolean;
  referrals: Referral[];
  total: number;
  error?: string;
}

/** Referral leaderboard response */
export interface ReferralLeaderboardResponse {
  success: boolean;
  leaderboard: ReferralLeaderboardEntry[];
  userRank?: number;
  total: number;
  error?: string;
}

/** Send invites response */
export interface SendInvitesResponse {
  success: boolean;
  sent: number;
  failed: number;
  invites: ReferralInvite[];
  errors?: Array<{
    email: string;
    error: string;
  }>;
}

/** Redeem reward response */
export interface RedeemRewardResponse {
  success: boolean;
  reward?: ReferralReward;
  applied: boolean;
  message?: string;
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Default referral rewards */
export const DEFAULT_REFERRAL_REWARDS: ReferralReward[] = [
  {
    id: 'referrer_free_month',
    name: 'Free Month for Referrer',
    description: 'Get 1 month free when your referral subscribes',
    type: 'free_month',
    value: 1,
    valueType: 'days',
    forReferrer: true,
    forReferee: false,
    qualifyingAction: 'subscribe_paid',
    stackable: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'referee_discount',
    name: '20% Off for New User',
    description: 'Get 20% off your first month',
    type: 'discount',
    value: 20,
    valueType: 'percentage',
    forReferrer: false,
    forReferee: true,
    qualifyingAction: 'signup',
    expiresAfterDays: 30,
    stackable: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'both_credits',
    name: '$10 Credits Each',
    description: 'Both get $10 in credits',
    type: 'credits',
    value: 10,
    valueType: 'fixed',
    currency: 'USD',
    forReferrer: true,
    forReferee: true,
    qualifyingAction: 'subscribe_paid',
    stackable: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** Referral status configuration */
export const REFERRAL_STATUS_CONFIG: Record<ReferralStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock',
    description: 'Invited but not yet signed up',
  },
  registered: {
    label: 'Registered',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'UserPlus',
    description: 'Signed up, pending qualification',
  },
  completed: {
    label: 'Completed',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle',
    description: 'Qualified and reward earned',
  },
  expired: {
    label: 'Expired',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'XCircle',
    description: 'Invitation expired',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'Ban',
    description: 'Referral cancelled',
  },
};

/** Reward type configuration */
export const REWARD_TYPE_CONFIG: Record<ReferralRewardType, {
  label: string;
  icon: string;
  color: string;
}> = {
  credits: { label: 'Account Credits', icon: 'DollarSign', color: '#10B981' },
  discount: { label: 'Discount', icon: 'Percent', color: '#3B82F6' },
  free_month: { label: 'Free Month', icon: 'Calendar', color: '#8B5CF6' },
  upgrade: { label: 'Tier Upgrade', icon: 'TrendingUp', color: '#F59E0B' },
  feature: { label: 'Feature Unlock', icon: 'Unlock', color: '#EC4899' },
  custom: { label: 'Custom Reward', icon: 'Gift', color: '#6366F1' },
};

/** Qualifying action configuration */
export const QUALIFYING_ACTION_CONFIG: Record<QualifyingAction, {
  label: string;
  description: string;
  icon: string;
}> = {
  signup: {
    label: 'Sign Up',
    description: 'Complete account registration',
    icon: 'UserPlus',
  },
  verify_email: {
    label: 'Verify Email',
    description: 'Verify email address',
    icon: 'Mail',
  },
  first_sync: {
    label: 'First Sync',
    description: 'Complete first platform sync',
    icon: 'RefreshCw',
  },
  subscribe: {
    label: 'Subscribe',
    description: 'Start any paid subscription',
    icon: 'CreditCard',
  },
  subscribe_paid: {
    label: 'First Payment',
    description: 'Complete first subscription payment',
    icon: 'CheckCircle',
  },
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Referral code length */
export const REFERRAL_CODE_LENGTH = 8;

/** Referral code prefix */
export const REFERRAL_CODE_PREFIX = 'REF';

/** Default invitation expiry (days) */
export const DEFAULT_INVITE_EXPIRY_DAYS = 30;

/** Max invites per batch */
export const MAX_INVITES_PER_BATCH = 50;

/** Share channels */
export const SHARE_CHANNELS = [
  { id: 'email', label: 'Email', icon: 'Mail', color: '#3B82F6' },
  { id: 'twitter', label: 'Twitter', icon: 'Twitter', color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: 'Facebook', color: '#1877F2' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', color: '#0A66C2' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', color: '#25D366' },
  { id: 'copy', label: 'Copy Link', icon: 'Copy', color: '#6B7280' },
] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Generate referral code */
export function generateReferralCode(username?: string): string {
  if (username) {
    // Try to use username-based code
    const sanitized = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
    if (sanitized.length >= 4) {
      const random = Math.random().toString(36).substring(2, 4).toUpperCase();
      return `${sanitized}${random}`;
    }
  }
  
  // Generate random code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = REFERRAL_CODE_PREFIX;
  
  for (let i = 0; i < REFERRAL_CODE_LENGTH - REFERRAL_CODE_PREFIX.length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return code;
}

/** Validate referral code format */
export function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Must be 4-20 characters, alphanumeric
  const codeRegex = /^[A-Z0-9]{4,20}$/;
  return codeRegex.test(code.toUpperCase());
}

/** Get referral status config */
export function getReferralStatusConfig(status: ReferralStatus) {
  return REFERRAL_STATUS_CONFIG[status];
}

/** Get reward type config */
export function getRewardTypeConfig(type: ReferralRewardType) {
  return REWARD_TYPE_CONFIG[type];
}

/** Calculate conversion rate */
export function calculateConversionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100 * 10) / 10;
}

/** Format reward value */
export function formatRewardValue(reward: ReferralReward): string {
  switch (reward.valueType) {
    case 'percentage':
      return `${reward.value}% off`;
    case 'fixed':
      return `$${reward.value}`;
    case 'credits':
      return `$${reward.value} credits`;
    case 'days':
      return `${reward.value} ${reward.value === 1 ? 'day' : 'days'}`;
    default:
      return String(reward.value);
  }
}

/** Generate share link */
export function generateShareLink(referralCode: string, baseUrl: string = ''): string {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  return `${url}/signup?ref=${referralCode}`;
}

/** Generate email invite link */
export function generateInviteLink(
  referralCode: string,
  email: string,
  baseUrl: string = ''
): string {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  return `${url}/signup?ref=${referralCode}&email=${encodeURIComponent(email)}`;
}

/** Get share URL for channel */
export function getShareUrl(channel: string, referralCode: string, message?: string): string {
  const link = generateShareLink(referralCode);
  const text = message || `Join me on this platform! Use my referral code: ${referralCode}`;
  
  switch (channel) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
    default:
      return link;
  }
}

/** Check if referral is qualified */
export function isReferralQualified(
  referral: Referral,
  qualifyingAction: QualifyingAction
): boolean {
  if (referral.status === 'completed') return true;
  
  // Check based on qualifying action
  switch (qualifyingAction) {
    case 'signup':
      return !!referral.registeredAt;
    case 'verify_email':
      // Would need to check user's email verification status
      return referral.status === 'registered' || referral.status === 'completed';
    case 'first_sync':
    case 'subscribe':
    case 'subscribe_paid':
      return referral.status === 'completed';
    default:
      return false;
  }
}

/** Check if reward is redeemable */
export function isRewardRedeemable(reward: ReferralReward): boolean {
  if (!reward.isActive) return false;
  
  // Check max redemptions if applicable
  if (reward.maxRedemptions !== undefined && reward.maxRedemptions <= 0) {
    return false;
  }
  
  return true;
}

/** Calculate reward expiry date */
export function calculateRewardExpiry(
  earnedAt: Date,
  expiresAfterDays?: number
): Date | null {
  if (!expiresAfterDays) return null;
  
  const expiry = new Date(earnedAt);
  expiry.setDate(expiry.getDate() + expiresAfterDays);
  
  return expiry;
}

/** Check if reward is expired */
export function isRewardExpired(
  earnedAt: Date,
  expiresAfterDays?: number
): boolean {
  if (!expiresAfterDays) return false;
  
  const expiry = calculateRewardExpiry(earnedAt, expiresAfterDays);
  if (!expiry) return false;
  
  return new Date() > expiry;
}

/** Get referral timeline */
export function getReferralTimeline(referral: Referral): Array<{
  event: string;
  date: Date;
  status: 'completed' | 'pending';
}> {
  const timeline: Array<{
    event: string;
    date: Date;
    status: 'completed' | 'pending';
  }> = [];
  
  timeline.push({
    event: 'Invited',
    date: referral.invitedAt,
    status: 'completed',
  });
  
  if (referral.registeredAt) {
    timeline.push({
      event: 'Registered',
      date: referral.registeredAt,
      status: 'completed',
    });
  }
  
  if (referral.completedAt) {
    timeline.push({
      event: 'Qualified',
      date: referral.completedAt,
      status: 'completed',
    });
  }
  
  if (referral.referrerRewardRedeemedAt) {
    timeline.push({
      event: 'Reward Redeemed',
      date: referral.referrerRewardRedeemedAt,
      status: 'completed',
    });
  }
  
  return timeline;
}

/** Format referral period */
export function formatReferralPeriod(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** Validate email for invitation */
export function isValidInviteEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Get referral progress percentage */
export function getReferralProgressPercentage(
  referral: Referral,
  qualifyingAction: QualifyingAction
): number {
  if (referral.status === 'completed') return 100;
  if (referral.status === 'expired' || referral.status === 'cancelled') return 0;
  
  // Calculate progress based on qualifying action
  const steps = {
    signup: ['invited', 'registered'],
    verify_email: ['invited', 'registered', 'verified'],
    first_sync: ['invited', 'registered', 'verified', 'synced'],
    subscribe: ['invited', 'registered', 'verified', 'subscribed'],
    subscribe_paid: ['invited', 'registered', 'verified', 'subscribed', 'paid'],
  };
  
  const actionSteps = steps[qualifyingAction] || steps.signup;
  const currentStep = referral.registeredAt ? 2 : 1;
  
  return Math.round((currentStep / actionSteps.length) * 100);
}

export default Referral;