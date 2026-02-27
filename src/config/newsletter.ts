// ===== FILE: src/config/newsletter.ts =====
// Newsletter configuration - synced with Prisma NewsletterSubscriber model

import { logger } from '@/lib/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface NewsletterConfig {
  /** Enable newsletter functionality */
  enabled: boolean;
  /** Default sender email */
  fromEmail: string;
  /** Default sender name */
  fromName: string;
  /** Reply-to email */
  replyToEmail: string;
  /** Available topics for subscription */
  topics: NewsletterTopic[];
  /** Frequency options */
  frequencies: NewsletterFrequency[];
  /** Email templates */
  templates: NewsletterTemplates;
  /** Rate limiting */
  rateLimit: NewsletterRateLimit;
  /** Double opt-in settings */
  doubleOptIn: DoubleOptInConfig;
}

export interface NewsletterTopic {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  icon?: string;
}

export interface NewsletterFrequency {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
}

export interface NewsletterTemplates {
  welcome: string;
  confirmation: string;
  weekly: string;
  monthly: string;
  unsubscribe: string;
}

export interface NewsletterRateLimit {
  maxPerHour: number;
  maxPerDay: number;
  cooldownMinutes: number;
}

export interface DoubleOptInConfig {
  enabled: boolean;
  tokenExpiryHours: number;
  reminderAfterHours: number;
}

export interface NewsletterStats {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedCount: number;
  avgOpenRate: number;
  avgClickRate: number;
  topTopics: Array<{ topic: string; count: number }>;
}

// =============================================================================
// TOPICS CONFIGURATION
// =============================================================================

export const NEWSLETTER_TOPICS: NewsletterTopic[] = [
  {
    id: 'product-updates',
    name: 'Product Updates',
    description: 'New features, improvements, and platform updates',
    isDefault: true,
    icon: 'Rocket',
  },
  {
    id: 'tips-tricks',
    name: 'Tips & Tricks',
    description: 'Productivity tips and best practices for tracking progress',
    isDefault: true,
    icon: 'Lightbulb',
  },
  {
    id: 'dsa-insights',
    name: 'DSA Insights',
    description: 'Competitive programming tips and problem-solving strategies',
    isDefault: false,
    icon: 'Code',
  },
  {
    id: 'career-advice',
    name: 'Career Advice',
    description: 'Job search tips, interview preparation, and career guidance',
    isDefault: false,
    icon: 'Briefcase',
  },
  {
    id: 'community',
    name: 'Community Highlights',
    description: 'Success stories, achievements, and community updates',
    isDefault: false,
    icon: 'Users',
  },
  {
    id: 'opensource',
    name: 'Open Source',
    description: 'Open source opportunities, GSoC updates, and contribution guides',
    isDefault: false,
    icon: 'Heart',
  },
];

// =============================================================================
// FREQUENCY OPTIONS
// =============================================================================

export const NEWSLETTER_FREQUENCIES: NewsletterFrequency[] = [
  {
    id: 'weekly',
    name: 'Weekly Digest',
    description: 'Get updates every week',
    cronExpression: '0 9 * * 1', // Every Monday at 9 AM
  },
  {
    id: 'biweekly',
    name: 'Bi-weekly',
    description: 'Get updates every two weeks',
    cronExpression: '0 9 1,15 * *', // 1st and 15th of each month
  },
  {
    id: 'monthly',
    name: 'Monthly Digest',
    description: 'Get updates once a month',
    cronExpression: '0 9 1 * *', // First of every month
  },
];

// =============================================================================
// MAIN CONFIGURATION
// =============================================================================

export const newsletterConfig: NewsletterConfig = {
  enabled: true,
  fromEmail: process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@codesyncpro.com',
  fromName: process.env.NEWSLETTER_FROM_NAME || 'CodeSync Pro',
  replyToEmail: process.env.NEWSLETTER_REPLY_TO || 'hello@codesyncpro.com',
  topics: NEWSLETTER_TOPICS,
  frequencies: NEWSLETTER_FREQUENCIES,
  templates: {
    welcome: 'newsletter-welcome',
    confirmation: 'newsletter-confirmation',
    weekly: 'newsletter-weekly',
    monthly: 'newsletter-monthly',
    unsubscribe: 'newsletter-unsubscribe',
  },
  rateLimit: {
    maxPerHour: 1000,
    maxPerDay: 10000,
    cooldownMinutes: 5,
  },
  doubleOptIn: {
    enabled: true,
    tokenExpiryHours: 48,
    reminderAfterHours: 24,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get topic by ID
 */
export function getTopicById(topicId: string): NewsletterTopic | undefined {
  return NEWSLETTER_TOPICS.find((t) => t.id === topicId);
}

/**
 * Get default topics
 */
export function getDefaultTopics(): NewsletterTopic[] {
  return NEWSLETTER_TOPICS.filter((t) => t.isDefault);
}

/**
 * Get default topic IDs
 */
export function getDefaultTopicIds(): string[] {
  return getDefaultTopics().map((t) => t.id);
}

/**
 * Get frequency by ID
 */
export function getFrequencyById(frequencyId: string): NewsletterFrequency | undefined {
  return NEWSLETTER_FREQUENCIES.find((f) => f.id === frequencyId);
}

/**
 * Validate topics array
 */
export function validateTopics(topics: string[]): { valid: boolean; invalidTopics: string[] } {
  const validTopicIds = NEWSLETTER_TOPICS.map((t) => t.id);
  const invalidTopics = topics.filter((t) => !validTopicIds.includes(t));
  return {
    valid: invalidTopics.length === 0,
    invalidTopics,
  };
}

/**
 * Validate frequency
 */
export function validateFrequency(frequency: string): boolean {
  return NEWSLETTER_FREQUENCIES.some((f) => f.id === frequency);
}

/**
 * Generate unsubscribe URL
 */
export function generateUnsubscribeUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://codesyncpro.com';
  return `${baseUrl}/api/newsletter/unsubscribe?token=${token}`;
}

/**
 * Generate confirmation URL
 */
export function generateConfirmationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://codesyncpro.com';
  return `${baseUrl}/api/newsletter/confirm?token=${token}`;
}

/**
 * Format newsletter subject
 */
export function formatSubject(template: string, data: Record<string, string>): string {
  let subject = template;
  Object.entries(data).forEach(([key, value]) => {
    subject = subject.replace(`{${key}}`, value);
  });
  return subject;
}

/**
 * Get topic names from IDs
 */
export function getTopicNames(topicIds: string[]): string[] {
  return topicIds
    .map((id) => getTopicById(id)?.name)
    .filter((name): name is string => !!name);
}

/**
 * Log newsletter event
 */
export function logNewsletterEvent(
  event: 'subscribe' | 'unsubscribe' | 'confirm' | 'send' | 'open' | 'click',
  details: Record<string, unknown>
): void {
  logger.info(`Newsletter ${event}`, {
    event,
    ...details,
  });
}

// =============================================================================
// EMAIL CONTENT TEMPLATES
// =============================================================================

export const emailContent = {
  welcome: {
    subject: 'Welcome to CodeSync Pro Newsletter! 🚀',
    preheader: 'Thanks for subscribing to our newsletter.',
  },
  confirmation: {
    subject: 'Confirm your subscription to CodeSync Pro',
    preheader: 'Click the link to confirm your email address.',
  },
  weekly: {
    subject: 'Your Weekly Coding Progress Digest 📊',
    preheader: 'See what the community has been up to this week.',
  },
  monthly: {
    subject: 'Your Monthly CodeSync Pro Recap 📈',
    preheader: 'A summary of your progress and platform updates.',
  },
  unsubscribe: {
    subject: "You've been unsubscribed from CodeSync Pro",
    preheader: "We're sorry to see you go.",
  },
};

export default newsletterConfig;