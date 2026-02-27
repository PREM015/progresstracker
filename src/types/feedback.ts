// src/types/feedback.ts
// ===== FILE: src/types/feedback.ts =====
// Complete feedback types matching Prisma Feedback model

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Feedback type */
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

/** Feedback status */
export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'implemented' | 'declined' | 'duplicate';

/** Feedback priority */
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Feedback (matches Prisma Feedback model) */
export interface Feedback {
  id: string;
  userId?: string;

  // Type
  type: string;

  // Content
  title?: string;
  message: string;

  // Rating
  rating?: number; // 1-5

  // Context
  page?: string;
  userAgent?: string;

  // Status
  status: string;

  // Response
  response?: string;
  respondedAt?: Date;

  // Timestamps
  createdAt: Date;

  // Relations
  user?: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

/** Feedback for display */
export interface FeedbackDisplay extends Feedback {
  typeLabel: string;
  typeColor: string;
  typeIcon: string;
  statusLabel: string;
  statusColor: string;
  statusBgColor: string;
  formattedDate: string;
  hasResponse: boolean;
}

/** Feedback summary */
export interface FeedbackSummary {
  total: number;
  new: number;
  reviewed: number;
  planned: number;
  implemented: number;
  byType: Record<FeedbackType, number>;
  byStatus: Record<FeedbackStatus, number>;
  avgRating: number;
  recentFeedback: Feedback[];
  topRequests: Array<{
    message: string;
    count: number;
  }>;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create feedback input */
export interface CreateFeedbackInput {
  type: FeedbackType;
  title?: string;
  message: string;
  rating?: number;
  page?: string;
  userAgent?: string;
}

/** Update feedback input */
export interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  response?: string;
  priority?: FeedbackPriority;
}

/** Feedback filter */
export interface FeedbackFilter {
  type?: FeedbackType | FeedbackType[];
  status?: FeedbackStatus | FeedbackStatus[];
  userId?: string;
  hasResponse?: boolean;
  minRating?: number;
  maxRating?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Feedback type configuration */
export const FEEDBACK_TYPE_CONFIG: Record<FeedbackType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  emoji: string;
}> = {
  bug: {
    label: 'Bug Report',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'Bug',
    emoji: '🐛'
  },
  feature: {
    label: 'Feature Request',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: 'Lightbulb',
    emoji: '💡'
  },
  improvement: {
    label: 'Improvement',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'TrendingUp',
    emoji: '🚀'
  },
  other: {
    label: 'Other',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'MessageSquare',
    emoji: '💬'
  },
};

/** Feedback status configuration */
export const FEEDBACK_STATUS_CONFIG: Record<FeedbackStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  new: {
    label: 'New',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Inbox'
  },
  reviewed: {
    label: 'Reviewed',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: 'Eye'
  },
  planned: {
    label: 'Planned',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Calendar'
  },
  implemented: {
    label: 'Implemented',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  declined: {
    label: 'Declined',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'XCircle'
  },
  duplicate: {
    label: 'Duplicate',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'Copy'
  },
};

/** Priority configuration */
export const FEEDBACK_PRIORITY_CONFIG: Record<FeedbackPriority, {
  label: string;
  color: string;
  sortOrder: number;
}> = {
  low: { label: 'Low', color: '#6B7280', sortOrder: 1 },
  medium: { label: 'Medium', color: '#F59E0B', sortOrder: 2 },
  high: { label: 'High', color: '#EF4444', sortOrder: 3 },
  critical: { label: 'Critical', color: '#DC2626', sortOrder: 4 },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get feedback type config */
export function getFeedbackTypeConfig(type: FeedbackType) {
  return FEEDBACK_TYPE_CONFIG[type];
}

/** Get feedback status config */
export function getFeedbackStatusConfig(status: FeedbackStatus) {
  return FEEDBACK_STATUS_CONFIG[status];
}

/** Format feedback for display */
export function formatFeedback(feedback: Feedback): FeedbackDisplay {
  const typeConfig = FEEDBACK_TYPE_CONFIG[feedback.type as FeedbackType] || FEEDBACK_TYPE_CONFIG.other;
  const statusConfig = FEEDBACK_STATUS_CONFIG[feedback.status as FeedbackStatus] || FEEDBACK_STATUS_CONFIG.new;

  return {
    ...feedback,
    typeLabel: typeConfig.label,
    typeColor: typeConfig.color,
    typeIcon: typeConfig.icon,
    statusLabel: statusConfig.label,
    statusColor: statusConfig.color,
    statusBgColor: statusConfig.bgColor,
    formattedDate: new Date(feedback.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    hasResponse: !!feedback.response,
  };
}

/** Validate rating */
export function isValidRating(rating: number): boolean {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
}

/** Group feedback by type */
export function groupFeedbackByType(feedbacks: Feedback[]): Record<FeedbackType, Feedback[]> {
  return feedbacks.reduce((acc, feedback) => {
    const type = feedback.type as FeedbackType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(feedback);
    return acc;
  }, {} as Record<FeedbackType, Feedback[]>);
}

/** Get average rating */
export function getAverageRating(feedbacks: Feedback[]): number {
  const rated = feedbacks.filter(f => f.rating);
  if (rated.length === 0) return 0;
  const sum = rated.reduce((acc, f) => acc + (f.rating || 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

/** Sort by priority */
export function sortByPriority(feedbacks: Feedback[], priorities: Map<string, FeedbackPriority>): Feedback[] {
  return [...feedbacks].sort((a, b) => {
    const priorityA = priorities.get(a.id) || 'low';
    const priorityB = priorities.get(b.id) || 'low';
    const orderA = FEEDBACK_PRIORITY_CONFIG[priorityA].sortOrder;
    const orderB = FEEDBACK_PRIORITY_CONFIG[priorityB].sortOrder;
    return orderB - orderA;
  });
}

export default Feedback;