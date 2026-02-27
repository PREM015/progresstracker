// src/types/newsletter.ts
// ===== FILE: src/types/newsletter.ts =====
// Complete newsletter types matching Prisma NewsletterSubscriber model

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Newsletter frequency */
export type NewsletterFrequency = 'weekly' | 'monthly' | 'quarterly';

/** Subscription status */
export type SubscriptionStatus = 'active' | 'unsubscribed' | 'bounced' | 'pending';

/** Newsletter topic */
export type NewsletterTopic = 
  | 'updates'
  | 'tutorials'
  | 'tips'
  | 'announcements'
  | 'releases'
  | 'events'
  | 'all';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Newsletter subscriber (matches Prisma NewsletterSubscriber model) */
export interface NewsletterSubscriber {
  id: string;

  // Identity
  email: string;
  name?: string;

  // Preferences
  topics: string[];
  frequency: string;

  // Status
  isActive: boolean;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  unsubscribeReason?: string;

  // Token
  unsubscribeToken: string;

  // Stats
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Newsletter subscriber for display */
export interface NewsletterSubscriberDisplay extends NewsletterSubscriber {
  status: SubscriptionStatus;
  statusLabel: string;
  statusColor: string;
  frequencyLabel: string;
  topicLabels: string[];
  engagementRate: number;
  formattedDate: string;
}

/** Newsletter campaign */
export interface NewsletterCampaign {
  id: string;
  subject: string;
  content: string;
  scheduledFor?: Date;
  sentAt?: Date;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  openRate: number;
  clickRate: number;
}

/** Newsletter stats */
export interface NewsletterStats {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribed: number;
  pendingConfirmation: number;
  bounced: number;
  growthThisMonth: number;
  growthPercentage: number;
  byFrequency: Record<NewsletterFrequency, number>;
  byTopic: Record<NewsletterTopic, number>;
  avgEngagementRate: number;
  topSubscribers: NewsletterSubscriber[];
  recentCampaigns: NewsletterCampaign[];
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Subscribe input */
export interface SubscribeNewsletterInput {
  email: string;
  name?: string;
  topics?: NewsletterTopic[];
  frequency?: NewsletterFrequency;
}

/** Update subscription input */
export interface UpdateNewsletterSubscriptionInput {
  name?: string;
  topics?: NewsletterTopic[];
  frequency?: NewsletterFrequency;
}

/** Unsubscribe input */
export interface UnsubscribeNewsletterInput {
  token: string;
  reason?: string;
  feedback?: string;
}

/** Newsletter filter */
export interface NewsletterFilter {
  status?: SubscriptionStatus;
  frequency?: NewsletterFrequency;
  topics?: NewsletterTopic[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Frequency configuration */
export const NEWSLETTER_FREQUENCY_CONFIG: Record<NewsletterFrequency, {
  label: string;
  description: string;
  icon: string;
}> = {
  weekly: {
    label: 'Weekly',
    description: 'Receive updates every week',
    icon: 'Calendar'
  },
  monthly: {
    label: 'Monthly',
    description: 'Receive updates once a month',
    icon: 'CalendarDays'
  },
  quarterly: {
    label: 'Quarterly',
    description: 'Receive updates every 3 months',
    icon: 'CalendarRange'
  },
};

/** Topic configuration */
export const NEWSLETTER_TOPIC_CONFIG: Record<NewsletterTopic, {
  label: string;
  description: string;
  icon: string;
  color: string;
}> = {
  updates: {
    label: 'Product Updates',
    description: 'New features and improvements',
    icon: 'Sparkles',
    color: '#3B82F6'
  },
  tutorials: {
    label: 'Tutorials',
    description: 'Step-by-step guides and how-tos',
    icon: 'BookOpen',
    color: '#10B981'
  },
  tips: {
    label: 'Tips & Tricks',
    description: 'Helpful tips to get the most out of the platform',
    icon: 'Lightbulb',
    color: '#F59E0B'
  },
  announcements: {
    label: 'Announcements',
    description: 'Important news and announcements',
    icon: 'Megaphone',
    color: '#EF4444'
  },
  releases: {
    label: 'Release Notes',
    description: 'Latest version releases and changelogs',
    icon: 'Package',
    color: '#8B5CF6'
  },
  events: {
    label: 'Events',
    description: 'Webinars, workshops, and community events',
    icon: 'Calendar',
    color: '#EC4899'
  },
  all: {
    label: 'All Topics',
    description: 'Receive all types of updates',
    icon: 'Mail',
    color: '#6366F1'
  },
};

/** Status configuration */
export const SUBSCRIPTION_STATUS_CONFIG: Record<SubscriptionStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  active: {
    label: 'Active',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  pending: {
    label: 'Pending Confirmation',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Clock'
  },
  unsubscribed: {
    label: 'Unsubscribed',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'XCircle'
  },
  bounced: {
    label: 'Bounced',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'AlertTriangle'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get subscription status */
export function getSubscriptionStatus(subscriber: NewsletterSubscriber): SubscriptionStatus {
  if (!subscriber.isActive && subscriber.unsubscribedAt) return 'unsubscribed';
  if (!subscriber.confirmedAt) return 'pending';
  if (subscriber.isActive) return 'active';
  return 'bounced';
}

/** Calculate engagement rate */
export function calculateEngagementRate(subscriber: NewsletterSubscriber): number {
  if (subscriber.emailsSent === 0) return 0;
  const engaged = subscriber.emailsOpened + subscriber.emailsClicked;
  return Math.round((engaged / subscriber.emailsSent) * 100);
}

/** Get frequency config */
export function getNewsletterFrequencyConfig(frequency: NewsletterFrequency) {
  return NEWSLETTER_FREQUENCY_CONFIG[frequency];
}

/** Get topic config */
export function getNewsletterTopicConfig(topic: NewsletterTopic) {
  return NEWSLETTER_TOPIC_CONFIG[topic];
}

/** Get status config */
export function getSubscriptionStatusConfig(status: SubscriptionStatus) {
  return SUBSCRIPTION_STATUS_CONFIG[status];
}

/** Format subscriber for display */
export function formatNewsletterSubscriber(subscriber: NewsletterSubscriber): NewsletterSubscriberDisplay {
  const status = getSubscriptionStatus(subscriber);
  const statusConfig = SUBSCRIPTION_STATUS_CONFIG[status];
  const frequencyConfig = NEWSLETTER_FREQUENCY_CONFIG[subscriber.frequency as NewsletterFrequency] || 
    NEWSLETTER_FREQUENCY_CONFIG.monthly;

  return {
    ...subscriber,
    status,
    statusLabel: statusConfig.label,
    statusColor: statusConfig.color,
    frequencyLabel: frequencyConfig.label,
    topicLabels: subscriber.topics.map(
      topic => NEWSLETTER_TOPIC_CONFIG[topic as NewsletterTopic]?.label || topic
    ),
    engagementRate: calculateEngagementRate(subscriber),
    formattedDate: new Date(subscriber.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
  };
}

/** Validate email */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Generate unsubscribe token */
export function generateUnsubscribeToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Get active subscribers */
export function getActiveSubscribers(subscribers: NewsletterSubscriber[]): NewsletterSubscriber[] {
  return subscribers.filter(s => s.isActive && s.confirmedAt);
}

/** Get subscribers by frequency */
export function getSubscribersByFrequency(
  subscribers: NewsletterSubscriber[],
  frequency: NewsletterFrequency
): NewsletterSubscriber[] {
  return subscribers.filter(s => s.frequency === frequency && s.isActive);
}

/** Get subscribers by topic */
export function getSubscribersByTopic(
  subscribers: NewsletterSubscriber[],
  topic: NewsletterTopic
): NewsletterSubscriber[] {
  return subscribers.filter(s => 
    s.isActive && (s.topics.includes(topic) || s.topics.includes('all'))
  );
}

/** Calculate campaign metrics */
export function calculateCampaignMetrics(campaign: NewsletterCampaign): {
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
} {
  const { recipientCount, openCount, clickCount, bounceCount, unsubscribeCount } = campaign;
  
  if (recipientCount === 0) {
    return { openRate: 0, clickRate: 0, bounceRate: 0, unsubscribeRate: 0 };
  }

  return {
    openRate: Math.round((openCount / recipientCount) * 100),
    clickRate: Math.round((clickCount / recipientCount) * 100),
    bounceRate: Math.round((bounceCount / recipientCount) * 100),
    unsubscribeRate: Math.round((unsubscribeCount / recipientCount) * 100),
  };
}

export default NewsletterSubscriber;
