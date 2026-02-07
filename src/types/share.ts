// ============================================================================
// FILE: types/share.ts
// PURPOSE: Share-related type definitions
// ============================================================================

import type { Goal } from './goal';
import type { UserAchievement, Achievement } from './achievement';
import type { UserProfile, UserStats } from './user';
import type { Streak, StreakStats } from './streak';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Share type */
export type ShareType = 
  | 'profile'      // User profile
  | 'goal'         // Goal progress
  | 'achievement'  // Single achievement
  | 'achievements' // Multiple achievements
  | 'streak'       // Streak info
  | 'stats'        // Statistics summary
  | 'report'       // Weekly/monthly report
  | 'badge'        // Shareable badge
  | 'certificate'  // Completion certificate
  | 'custom';      // Custom share

/** Share visibility */
export type ShareVisibility = 
  | 'public'       // Anyone with link
  | 'unlisted'     // Only with link, not indexed
  | 'private';     // Requires authentication

/** Share status */
export type ShareStatus = 
  | 'active'       // Currently shareable
  | 'expired'      // Link expired
  | 'disabled'     // Manually disabled
  | 'deleted';     // Content deleted

/** Embed theme */
export type EmbedTheme = 'light' | 'dark' | 'auto' | 'custom';

/** Embed size */
export type EmbedSize = 'small' | 'medium' | 'large' | 'full';

/** Social platform for sharing */
export type SocialPlatform = 
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'reddit'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'copy';

/** Share format */
export type ShareFormat = 
  | 'link'         // Simple link
  | 'embed'        // Embeddable widget
  | 'image'        // Generated image
  | 'og'           // Open Graph card
  | 'json';        // JSON data

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Share link record */
export interface ShareLink {
  id: string;
  
  // Owner
  userId: string;
  
  // Link info
  code: string;
  shortUrl?: string;
  fullUrl: string;
  
  // Content reference
  type: ShareType;
  entityId?: string;
  entityType?: string;
  
  // Visibility
  visibility: ShareVisibility;
  status: ShareStatus;
  
  // Expiration
  expiresAt?: Date | null;
  
  // Password protection
  isPasswordProtected: boolean;
  passwordHash?: string;
  
  // Customization
  title?: string;
  description?: string;
  thumbnail?: string;
  theme?: EmbedTheme;
  
  // Stats
  viewCount: number;
  uniqueViewCount: number;
  lastViewedAt?: Date | null;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Share code details */
export interface ShareCode {
  code: string;
  type: ShareType;
  entityId?: string;
  
  // Status
  isValid: boolean;
  isExpired: boolean;
  isPasswordProtected: boolean;
  
  // URLs
  shareUrl: string;
  embedUrl?: string;
  imageUrl?: string;
  
  // Expiration
  expiresAt?: Date | null;
  expiresIn?: number; // seconds
  
  // Owner info
  ownerUsername?: string;
  ownerId?: string;
  
  createdAt: Date;
}

/** Shared content data (what gets displayed) */
export interface SharedContent {
  type: ShareType;
  code: string;
  
  // Owner info (minimal)
  owner: {
    id: string;
    username?: string;
    name?: string;
    image?: string;
  };
  
  // The actual content (varies by type)
  content: 
    | SharedProfileContent
    | SharedGoalContent
    | SharedAchievementContent
    | SharedStreakContent
    | SharedStatsContent
    | SharedReportContent
    | SharedBadgeContent
    | SharedCustomContent;
  
  // Display settings
  title: string;
  description?: string;
  thumbnail?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/** Shared profile content */
export interface SharedProfileContent {
  type: 'profile';
  profile: UserProfile;
  stats?: Partial<UserStats>;
  achievements?: Array<{
    id: string;
    title: string;
    icon: string;
    unlockedAt: Date;
  }>;
  streak?: {
    current: number;
    longest: number;
  };
}

/** Shared goal content */
export interface SharedGoalContent {
  type: 'goal';
  goal: {
    id: string;
    title: string;
    description?: string;
    target: number;
    progress: number;
    progressPercentage: number;
    status: string;
    deadline?: Date | null;
    icon?: string;
    color?: string;
    completedAt?: Date | null;
  };
  milestones?: Array<{
    value: number;
    label: string;
    reached: boolean;
  }>;
}

/** Shared achievement content */
export interface SharedAchievementContent {
  type: 'achievement' | 'achievements';
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    rarity: string;
    tier: string;
    points: number;
    unlockedAt: Date;
  }>;
  totalPoints?: number;
  totalAchievements?: number;
}

/** Shared streak content */
export interface SharedStreakContent {
  type: 'streak';
  streak: {
    current: number;
    longest: number;
    startDate?: Date | null;
    lastActivityDate?: Date | null;
    totalDays: number;
  };
  calendar?: Array<{
    date: string;
    hasActivity: boolean;
    count?: number;
  }>;
  milestones?: Array<{
    days: number;
    label: string;
    reached: boolean;
    reachedAt?: Date | null;
  }>;
}

/** Shared stats content */
export interface SharedStatsContent {
  type: 'stats';
  stats: {
    totalProblems: number;
    totalCommits: number;
    totalProjects: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
  };
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  highlights?: Array<{
    metric: string;
    value: number;
    label: string;
    trend?: 'up' | 'down' | 'stable';
  }>;
}

/** Shared report content */
export interface SharedReportContent {
  type: 'report';
  report: {
    id: string;
    type: 'weekly' | 'monthly' | 'yearly' | 'custom';
    title: string;
    periodStart: Date;
    periodEnd: Date;
    summary?: string;
  };
  highlights?: Record<string, unknown>;
  charts?: Array<{
    type: string;
    title: string;
    data: unknown;
  }>;
}

/** Shared badge content */
export interface SharedBadgeContent {
  type: 'badge';
  badge: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    earnedAt?: Date;
  };
  stats?: {
    label: string;
    value: string | number;
  };
}

/** Shared custom content */
export interface SharedCustomContent {
  type: 'custom';
  title: string;
  description?: string;
  data: Record<string, unknown>;
  template?: string;
}

/** Share statistics */
export interface ShareStats {
  // Views
  totalViews: number;
  uniqueViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  
  // Timeline
  viewsByDay: Array<{
    date: string;
    views: number;
    uniqueViews: number;
  }>;
  
  // Sources
  viewsBySource: Array<{
    source: string;
    views: number;
    percentage: number;
  }>;
  
  // Referrers
  topReferrers: Array<{
    referrer: string;
    views: number;
  }>;
  
  // Geography
  viewsByCountry?: Array<{
    country: string;
    countryCode: string;
    views: number;
  }>;
  
  // Engagement
  avgTimeOnPage?: number; // seconds
  embedViews?: number;
  
  // Last viewed
  lastViewedAt?: Date | null;
  
  // Period
  periodStart: Date;
  periodEnd: Date;
}

/** Share view event */
export interface ShareViewEvent {
  id: string;
  shareId: string;
  
  // Viewer info (anonymous)
  viewerHash?: string;
  isUnique: boolean;
  
  // Source
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  
  // Location
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  
  // Device
  device?: string;
  browser?: string;
  os?: string;
  
  // Session
  duration?: number; // seconds
  
  createdAt: Date;
}

// =============================================================================
// EMBED TYPES
// =============================================================================

/** Embed options */
export interface EmbedOptions {
  // Appearance
  theme: EmbedTheme;
  size: EmbedSize;
  width?: number;
  height?: number;
  
  // Customization
  showHeader: boolean;
  showFooter: boolean;
  showBranding: boolean;
  showStats: boolean;
  showAvatar: boolean;
  
  // Styling
  borderRadius?: number;
  padding?: number;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  fontFamily?: string;
  
  // Custom CSS
  customCss?: string;
  
  // Behavior
  interactive: boolean;
  autoRefresh: boolean;
  refreshInterval?: number; // seconds
  
  // Link
  clickable: boolean;
  targetUrl?: string;
  openInNewTab: boolean;
}

/** Generated embed data */
export interface EmbedData {
  // Code snippets
  html: string;
  iframe: string;
  markdown?: string;
  bbcode?: string;
  
  // URLs
  embedUrl: string;
  directUrl: string;
  imageUrl?: string;
  
  // Dimensions
  width: number;
  height: number;
  
  // Options used
  options: EmbedOptions;
  
  // Preview
  previewHtml?: string;
}

/** Embed preset */
export interface EmbedPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<EmbedOptions>;
  previewImage?: string;
  isDefault?: boolean;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Generate share link input */
export interface GenerateShareInput {
  type: ShareType;
  entityId?: string;
  
  // Options
  visibility?: ShareVisibility;
  expiresIn?: number; // seconds
  password?: string;
  
  // Customization
  title?: string;
  description?: string;
  thumbnail?: string;
  
  // Embed options
  embedOptions?: Partial<EmbedOptions>;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

/** Update share link input */
export interface UpdateShareInput {
  visibility?: ShareVisibility;
  status?: ShareStatus;
  expiresAt?: Date | null;
  password?: string;
  removePassword?: boolean;
  title?: string;
  description?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

/** Validate share access input */
export interface ValidateShareAccessInput {
  code: string;
  password?: string;
}

/** Generate embed input */
export interface GenerateEmbedInput {
  code: string;
  options?: Partial<EmbedOptions>;
  format?: 'html' | 'iframe' | 'markdown' | 'all';
}

/** Track share view input */
export interface TrackShareViewInput {
  code: string;
  referrer?: string;
  source?: string;
  viewerHash?: string;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/** Share link response */
export interface ShareResponse {
  success: boolean;
  share?: ShareLink;
  shareUrl?: string;
  embedUrl?: string;
  error?: string;
  message?: string;
}

/** Shared content response */
export interface SharedContentResponse {
  success: boolean;
  content?: SharedContent;
  requiresPassword?: boolean;
  isExpired?: boolean;
  isDisabled?: boolean;
  error?: string;
}

/** Share stats response */
export interface ShareStatsResponse {
  success: boolean;
  stats?: ShareStats;
  error?: string;
}

/** Embed response */
export interface EmbedResponse {
  success: boolean;
  embed?: EmbedData;
  error?: string;
}

/** Validate access response */
export interface ValidateAccessResponse {
  success: boolean;
  isValid: boolean;
  requiresPassword: boolean;
  error?: string;
}

/** User shares list response */
export interface UserSharesResponse {
  success: boolean;
  shares: ShareLink[];
  total: number;
  error?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Share type configuration */
export const SHARE_TYPE_CONFIG: Record<ShareType, {
  label: string;
  icon: string;
  color: string;
  description: string;
  supportsEmbed: boolean;
  supportsImage: boolean;
}> = {
  profile: {
    label: 'Profile',
    icon: 'User',
    color: '#3B82F6',
    description: 'Share your public profile',
    supportsEmbed: true,
    supportsImage: true,
  },
  goal: {
    label: 'Goal',
    icon: 'Target',
    color: '#10B981',
    description: 'Share goal progress',
    supportsEmbed: true,
    supportsImage: true,
  },
  achievement: {
    label: 'Achievement',
    icon: 'Award',
    color: '#F59E0B',
    description: 'Share an unlocked achievement',
    supportsEmbed: true,
    supportsImage: true,
  },
  achievements: {
    label: 'Achievements',
    icon: 'Trophy',
    color: '#8B5CF6',
    description: 'Share multiple achievements',
    supportsEmbed: true,
    supportsImage: true,
  },
  streak: {
    label: 'Streak',
    icon: 'Flame',
    color: '#EF4444',
    description: 'Share your coding streak',
    supportsEmbed: true,
    supportsImage: true,
  },
  stats: {
    label: 'Statistics',
    icon: 'BarChart',
    color: '#6366F1',
    description: 'Share your stats summary',
    supportsEmbed: true,
    supportsImage: true,
  },
  report: {
    label: 'Report',
    icon: 'FileText',
    color: '#EC4899',
    description: 'Share a progress report',
    supportsEmbed: false,
    supportsImage: true,
  },
  badge: {
    label: 'Badge',
    icon: 'Shield',
    color: '#14B8A6',
    description: 'Share a badge or certificate',
    supportsEmbed: true,
    supportsImage: true,
  },
  certificate: {
    label: 'Certificate',
    icon: 'Award',
    color: '#F97316',
    description: 'Share a completion certificate',
    supportsEmbed: false,
    supportsImage: true,
  },
  custom: {
    label: 'Custom',
    icon: 'Share2',
    color: '#6B7280',
    description: 'Custom shareable content',
    supportsEmbed: true,
    supportsImage: false,
  },
};

/** Social platform configuration */
export const SOCIAL_PLATFORM_CONFIG: Record<SocialPlatform, {
  label: string;
  icon: string;
  color: string;
  shareUrlTemplate: string;
}> = {
  twitter: {
    label: 'Twitter',
    icon: 'Twitter',
    color: '#1DA1F2',
    shareUrlTemplate: 'https://twitter.com/intent/tweet?text={text}&url={url}',
  },
  facebook: {
    label: 'Facebook',
    icon: 'Facebook',
    color: '#1877F2',
    shareUrlTemplate: 'https://www.facebook.com/sharer/sharer.php?u={url}',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'Linkedin',
    color: '#0A66C2',
    shareUrlTemplate: 'https://www.linkedin.com/sharing/share-offsite/?url={url}',
  },
  reddit: {
    label: 'Reddit',
    icon: 'MessageSquare',
    color: '#FF4500',
    shareUrlTemplate: 'https://www.reddit.com/submit?url={url}&title={title}',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'MessageCircle',
    color: '#25D366',
    shareUrlTemplate: 'https://wa.me/?text={text}%20{url}',
  },
  telegram: {
    label: 'Telegram',
    icon: 'Send',
    color: '#0088CC',
    shareUrlTemplate: 'https://t.me/share/url?url={url}&text={text}',
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    color: '#6B7280',
    shareUrlTemplate: 'mailto:?subject={title}&body={text}%20{url}',
  },
  copy: {
    label: 'Copy Link',
    icon: 'Copy',
    color: '#6B7280',
    shareUrlTemplate: '{url}',
  },
};

/** Embed theme configuration */
export const EMBED_THEME_CONFIG: Record<EmbedTheme, {
  label: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}> = {
  light: {
    label: 'Light',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    accentColor: '#3B82F6',
  },
  dark: {
    label: 'Dark',
    backgroundColor: '#1F2937',
    textColor: '#F9FAFB',
    accentColor: '#60A5FA',
  },
  auto: {
    label: 'Auto',
    backgroundColor: 'transparent',
    textColor: 'inherit',
    accentColor: '#3B82F6',
  },
  custom: {
    label: 'Custom',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    accentColor: '#3B82F6',
  },
};

/** Embed size configuration */
export const EMBED_SIZE_CONFIG: Record<EmbedSize, {
  label: string;
  width: number;
  height: number;
}> = {
  small: { label: 'Small', width: 300, height: 150 },
  medium: { label: 'Medium', width: 400, height: 200 },
  large: { label: 'Large', width: 600, height: 300 },
  full: { label: 'Full Width', width: 800, height: 400 },
};

/** Default embed options */
export const DEFAULT_EMBED_OPTIONS: EmbedOptions = {
  theme: 'auto',
  size: 'medium',
  showHeader: true,
  showFooter: true,
  showBranding: true,
  showStats: true,
  showAvatar: true,
  borderRadius: 8,
  padding: 16,
  interactive: true,
  autoRefresh: false,
  clickable: true,
  openInNewTab: true,
};

/** Embed presets */
export const EMBED_PRESETS: EmbedPreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, minimal embed',
    options: {
      showHeader: false,
      showFooter: false,
      showBranding: false,
      size: 'small',
    },
  },
  {
    id: 'card',
    name: 'Card',
    description: 'Standard card layout',
    options: {
      showHeader: true,
      showFooter: true,
      showBranding: true,
      size: 'medium',
    },
    isDefault: true,
  },
  {
    id: 'banner',
    name: 'Banner',
    description: 'Wide banner format',
    options: {
      showHeader: true,
      showFooter: false,
      showBranding: true,
      size: 'full',
      height: 120,
    },
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Compact badge format',
    options: {
      showHeader: false,
      showFooter: false,
      showBranding: false,
      showStats: false,
      showAvatar: false,
      size: 'small',
      width: 150,
      height: 50,
    },
  },
];

// =============================================================================
// CONSTANTS
// =============================================================================

/** Share code length */
export const SHARE_CODE_LENGTH = 10;

/** Share code characters */
export const SHARE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Default share expiry (days) */
export const DEFAULT_SHARE_EXPIRY_DAYS = 30;

/** Max shares per user */
export const MAX_SHARES_PER_USER = 100;

/** Max password length */
export const MAX_PASSWORD_LENGTH = 100;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Generate share code */
export function generateShareCode(length: number = SHARE_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SHARE_CODE_CHARS.charAt(Math.floor(Math.random() * SHARE_CODE_CHARS.length));
  }
  return code;
}

/** Validate share code format */
export function isValidShareCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  if (code.length < 6 || code.length > 20) return false;
  return /^[A-Za-z0-9]+$/.test(code);
}

/** Generate share URL */
export function generateShareUrl(code: string, baseUrl?: string): string {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  return `${url}/share/${code}`;
}

/** Generate embed URL */
export function generateEmbedUrl(code: string, options?: Partial<EmbedOptions>, baseUrl?: string): string {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
  let embedUrl = `${url}/embed/${code}`;
  
  if (options) {
    const params = new URLSearchParams();
    if (options.theme) params.set('theme', options.theme);
    if (options.size) params.set('size', options.size);
    if (options.showBranding === false) params.set('branding', '0');
    if (options.showStats === false) params.set('stats', '0');
    
    const queryString = params.toString();
    if (queryString) embedUrl += `?${queryString}`;
  }
  
  return embedUrl;
}

/** Generate social share URL */
export function generateSocialShareUrl(
  platform: SocialPlatform,
  shareUrl: string,
  options?: {
    title?: string;
    text?: string;
  }
): string {
  const config = SOCIAL_PLATFORM_CONFIG[platform];
  if (!config) return shareUrl;
  
  const { title = '', text = '' } = options || {};
  
  return config.shareUrlTemplate
    .replace('{url}', encodeURIComponent(shareUrl))
    .replace('{title}', encodeURIComponent(title))
    .replace('{text}', encodeURIComponent(text));
}

/** Generate embed HTML */
export function generateEmbedHtml(embedUrl: string, options?: Partial<EmbedOptions>): string {
  const { width, height } = getEmbedDimensions(options);
  const borderRadius = options?.borderRadius ?? DEFAULT_EMBED_OPTIONS.borderRadius;
  
  return `<iframe 
  src="${embedUrl}" 
  width="${width}" 
  height="${height}" 
  frameborder="0" 
  style="border-radius: ${borderRadius}px; overflow: hidden;"
  loading="lazy"
  allowtransparency="true"
></iframe>`;
}

/** Generate embed iframe code */
export function generateIframeCode(embedUrl: string, options?: Partial<EmbedOptions>): string {
  return generateEmbedHtml(embedUrl, options);
}

/** Generate markdown embed */
export function generateMarkdownEmbed(shareUrl: string, title?: string): string {
  return `[![${title || 'Progress'}](${shareUrl}/image)](${shareUrl})`;
}

/** Get embed dimensions */
export function getEmbedDimensions(options?: Partial<EmbedOptions>): { width: number; height: number } {
  if (options?.width && options?.height) {
    return { width: options.width, height: options.height };
  }
  
  const size = options?.size || DEFAULT_EMBED_OPTIONS.size;
  return EMBED_SIZE_CONFIG[size];
}

/** Get share type config */
export function getShareTypeConfig(type: ShareType) {
  return SHARE_TYPE_CONFIG[type];
}

/** Get social platform config */
export function getSocialPlatformConfig(platform: SocialPlatform) {
  return SOCIAL_PLATFORM_CONFIG[platform];
}

/** Get embed theme config */
export function getEmbedThemeConfig(theme: EmbedTheme) {
  return EMBED_THEME_CONFIG[theme];
}

/** Check if share is expired */
export function isShareExpired(share: ShareLink): boolean {
  if (!share.expiresAt) return false;
  return new Date() > new Date(share.expiresAt);
}

/** Check if share is accessible */
export function isShareAccessible(share: ShareLink): boolean {
  if (share.status !== 'active') return false;
  if (isShareExpired(share)) return false;
  return true;
}

/** Calculate share expiry date */
export function calculateShareExpiry(expiresInSeconds?: number): Date | null {
  if (!expiresInSeconds) return null;
  
  const expiry = new Date();
  expiry.setSeconds(expiry.getSeconds() + expiresInSeconds);
  
  return expiry;
}

/** Format view count */
export function formatViewCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

/** Get share status label */
export function getShareStatusLabel(share: ShareLink): string {
  if (share.status !== 'active') {
    return share.status.charAt(0).toUpperCase() + share.status.slice(1);
  }
  if (isShareExpired(share)) {
    return 'Expired';
  }
  return 'Active';
}

/** Get share status color */
export function getShareStatusColor(share: ShareLink): string {
  if (share.status === 'disabled' || share.status === 'deleted') return '#6B7280';
  if (share.status === 'expired' || isShareExpired(share)) return '#EF4444';
  return '#10B981';
}

/** Get default share title */
export function getDefaultShareTitle(type: ShareType, entityName?: string): string {
  const config = SHARE_TYPE_CONFIG[type];
  if (entityName) {
    return `${entityName} - ${config.label}`;
  }
  return `My ${config.label}`;
}

/** Get default share description */
export function getDefaultShareDescription(type: ShareType): string {
  return SHARE_TYPE_CONFIG[type].description;
}

/** Merge embed options with defaults */
export function mergeEmbedOptions(options?: Partial<EmbedOptions>): EmbedOptions {
  return {
    ...DEFAULT_EMBED_OPTIONS,
    ...options,
  };
}

/** Get embed preset by ID */
export function getEmbedPreset(presetId: string): EmbedPreset | undefined {
  return EMBED_PRESETS.find(preset => preset.id === presetId);
}

/** Apply embed preset */
export function applyEmbedPreset(presetId: string): EmbedOptions {
  const preset = getEmbedPreset(presetId);
  if (!preset) return DEFAULT_EMBED_OPTIONS;
  
  return mergeEmbedOptions(preset.options);
}

/** Generate OG meta tags */
export function generateOGMetaTags(share: ShareLink, content?: SharedContent): Record<string, string> {
  const url = generateShareUrl(share.code);
  const title = share.title || getDefaultShareTitle(share.type);
  const description = share.description || getDefaultShareDescription(share.type);
  
  return {
    'og:url': url,
    'og:type': 'website',
    'og:title': title,
    'og:description': description,
    'og:image': share.thumbnail || `${url}/og-image`,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': share.thumbnail || `${url}/og-image`,
  };
}

/** Hash viewer for unique tracking */
export function hashViewer(ip: string, userAgent: string): string {
  const combined = `${ip}:${userAgent}`;
  let hash = 0;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/** Filter shares by status */
export function filterSharesByStatus(shares: ShareLink[], status: ShareStatus): ShareLink[] {
  return shares.filter(share => share.status === status);
}

/** Sort shares by view count */
export function sortSharesByViews(shares: ShareLink[], order: 'asc' | 'desc' = 'desc'): ShareLink[] {
  return [...shares].sort((a, b) => {
    const diff = a.viewCount - b.viewCount;
    return order === 'desc' ? -diff : diff;
  });
}

/** Sort shares by date */
export function sortSharesByDate(shares: ShareLink[], order: 'asc' | 'desc' = 'desc'): ShareLink[] {
  return [...shares].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/** Calculate share stats summary */
export function calculateShareStatsSummary(shares: ShareLink[]): {
  total: number;
  active: number;
  expired: number;
  totalViews: number;
  avgViews: number;
} {
  const active = shares.filter(s => isShareAccessible(s)).length;
  const expired = shares.filter(s => isShareExpired(s)).length;
  const totalViews = shares.reduce((sum, s) => sum + s.viewCount, 0);
  
  return {
    total: shares.length,
    active,
    expired,
    totalViews,
    avgViews: shares.length > 0 ? Math.round(totalViews / shares.length) : 0,
  };
}

export default ShareLink;