// ============================================================================
// FILE: src/constants/colors.ts
// PURPOSE: Color palette and theme constants
// ============================================================================

// =============================================================================
// BRAND COLORS
// =============================================================================

export const BRAND_COLORS = {
  PRIMARY: '#6366F1',
  SECONDARY: '#8B5CF6',
  ACCENT: '#EC4899',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
} as const;

// =============================================================================
// PLATFORM CATEGORY COLORS
// =============================================================================

export const PLATFORM_CATEGORY_COLORS = {
  DSA: '#6366F1',
  JOB: '#10B981',
  GIT: '#8B5CF6',
  LEARNING: '#EC4899',
  HACKATHON: '#F59E0B',
  OPENSOURCE: '#EF4444',
  COMPANY: '#64748B',
  DESIGN: '#F472B6',
  DATA_SCIENCE: '#06B6D4',
  OTHER: '#6B7280',
} as const;

// =============================================================================
// STATUS COLORS
// =============================================================================

export const STATUS_COLORS = {
  ACTIVE: '#10B981',
  INACTIVE: '#6B7280',
  PENDING: '#F59E0B',
  SUCCESS: '#10B981',
  FAILED: '#EF4444',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
  CANCELLED: '#6B7280',
} as const;

// =============================================================================
// SYNC STATUS COLORS
// =============================================================================

export const SYNC_STATUS_COLORS = {
  IDLE: '#6B7280',
  PENDING: '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  SUCCESS: '#10B981',
  PARTIAL: '#F59E0B',
  FAILED: '#EF4444',
  CANCELLED: '#6B7280',
  RATE_LIMITED: '#EF4444',
} as const;

// =============================================================================
// GOAL STATUS COLORS
// =============================================================================

export const GOAL_STATUS_COLORS = {
  DRAFT: '#6B7280',
  ACTIVE: '#3B82F6',
  PAUSED: '#F59E0B',
  COMPLETED: '#10B981',
  FAILED: '#EF4444',
  ARCHIVED: '#6B7280',
  CANCELLED: '#6B7280',
} as const;

// =============================================================================
// SUBSCRIPTION TIER COLORS
// =============================================================================

export const SUBSCRIPTION_TIER_COLORS = {
  FREE: '#6B7280',
  STARTER: '#10B981',
  PRO: '#6366F1',
  TEAM: '#8B5CF6',
  ENTERPRISE: '#DC2626',
} as const;

// =============================================================================
// NOTIFICATION PRIORITY COLORS
// =============================================================================

export const NOTIFICATION_PRIORITY_COLORS = {
  LOW: '#6B7280',
  NORMAL: '#3B82F6',
  HIGH: '#F59E0B',
  URGENT: '#EF4444',
} as const;

// =============================================================================
// DIFFICULTY COLORS
// =============================================================================

export const DIFFICULTY_COLORS = {
  EASY: '#10B981',
  MEDIUM: '#F59E0B',
  HARD: '#EF4444',
} as const;

// =============================================================================
// CHART COLORS
// =============================================================================

export const CHART_COLORS = {
  PRIMARY: '#6366F1',
  SECONDARY: '#8B5CF6',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',
  GRAY: '#6B7280',
} as const;

export const CHART_COLOR_PALETTE = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#EF4444',
  '#06B6D4',
  '#F472B6',
  '#64748B',
] as const;

// =============================================================================
// GRADIENT COLORS
// =============================================================================

export const GRADIENT_COLORS = {
  PRIMARY: 'from-indigo-500 to-purple-600',
  SUCCESS: 'from-green-400 to-emerald-600',
  WARNING: 'from-yellow-400 to-orange-600',
  ERROR: 'from-red-400 to-rose-600',
  INFO: 'from-blue-400 to-cyan-600',
  DARK: 'from-gray-700 to-gray-900',
} as const;

// =============================================================================
// BACKGROUND COLORS
// =============================================================================

export const BACKGROUND_COLORS = {
  PRIMARY: '#F9FAFB',
  SECONDARY: '#F3F4F6',
  ACCENT: '#EDE9FE',
  CARD: '#FFFFFF',
  HOVER: '#F9FAFB',
} as const;

// =============================================================================
// BORDER COLORS
// =============================================================================

export const BORDER_COLORS = {
  DEFAULT: '#E5E7EB',
  HOVER: '#D1D5DB',
  FOCUS: '#6366F1',
  ERROR: '#EF4444',
  SUCCESS: '#10B981',
} as const;

// =============================================================================
// TEXT COLORS
// =============================================================================

export const TEXT_COLORS = {
  PRIMARY: '#111827',
  SECONDARY: '#6B7280',
  MUTED: '#9CA3AF',
  ACCENT: '#6366F1',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  WHITE: '#FFFFFF',
} as const;

// =============================================================================
// SOCIAL COLORS
// =============================================================================

export const SOCIAL_COLORS = {
  GITHUB: '#181717',
  GITLAB: '#FC6D26',
  BITBUCKET: '#0052CC',
  LINKEDIN: '#0A66C2',
  TWITTER: '#1DA1F2',
  DISCORD: '#5865F2',
  GOOGLE: '#4285F4',
  FACEBOOK: '#1877F2',
} as const;

// =============================================================================
// PLATFORM COLORS (specific platforms)
// =============================================================================

export const PLATFORM_COLORS = {
  LEETCODE: '#FFA116',
  CODEFORCES: '#1F8ACB',
  CODECHEF: '#5B4638',
  HACKERRANK: '#00EA64',
  GITHUB: '#181717',
  GITLAB: '#FC6D26',
  KAGGLE: '#20BEFF',
  COURSERA: '#0056D2',
  UDEMY: '#A435F0',
  LINKEDIN: '#0A66C2',
} as const;

// =============================================================================
// HEATMAP COLORS
// =============================================================================

export const HEATMAP_COLORS = {
  LEVEL_0: '#EBEDF0',
  LEVEL_1: '#9BE9A8',
  LEVEL_2: '#40C463',
  LEVEL_3: '#30A14E',
  LEVEL_4: '#216E39',
} as const;

export const HEATMAP_COLOR_SCALE = [
  '#EBEDF0', // No activity
  '#C6E48B', // Low activity
  '#7BC96F', // Medium activity
  '#239A3B', // High activity
  '#196127', // Very high activity
] as const;

// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const SEMANTIC_COLORS = {
  POSITIVE: '#10B981',
  NEGATIVE: '#EF4444',
  NEUTRAL: '#6B7280',
  HIGHLIGHT: '#F59E0B',
} as const;

// =============================================================================
// OPACITY VARIANTS
// =============================================================================

export const OPACITY_VARIANTS = {
  5: '0D',
  10: '1A',
  20: '33',
  30: '4D',
  40: '66',
  50: '80',
  60: '99',
  70: 'B3',
  80: 'CC',
  90: 'E6',
  95: 'F2',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function getColorWithOpacity(color: string, opacity: keyof typeof OPACITY_VARIANTS): string {
  return `${color}${OPACITY_VARIANTS[opacity]}`;
}

// =============================================================================
// EXPORTS
// =============================================================================

const COLORS_EXPORT = {
  BRAND: BRAND_COLORS,
  PLATFORM_CATEGORY: PLATFORM_CATEGORY_COLORS,
  STATUS: STATUS_COLORS,
  SYNC_STATUS: SYNC_STATUS_COLORS,
  GOAL_STATUS: GOAL_STATUS_COLORS,
  SUBSCRIPTION_TIER: SUBSCRIPTION_TIER_COLORS,
  NOTIFICATION_PRIORITY: NOTIFICATION_PRIORITY_COLORS,
  DIFFICULTY: DIFFICULTY_COLORS,
  CHART: CHART_COLORS,
  CHART_PALETTE: CHART_COLOR_PALETTE,
  GRADIENT: GRADIENT_COLORS,
  BACKGROUND: BACKGROUND_COLORS,
  BORDER: BORDER_COLORS,
  TEXT: TEXT_COLORS,
  SOCIAL: SOCIAL_COLORS,
  PLATFORM: PLATFORM_COLORS,
  HEATMAP: HEATMAP_COLORS,
  SEMANTIC: SEMANTIC_COLORS,
};

export default COLORS_EXPORT;