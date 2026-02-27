// ===== FILE: src/config/support.ts =====
// Support system configuration - synced with Prisma SupportTicket model

import type { TicketStatus, TicketPriority } from '@prisma/client';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SupportConfig {
  /** Enable support system */
  enabled: boolean;
  /** Support email */
  email: string;
  /** Support categories */
  categories: SupportCategory[];
  /** Priority levels */
  priorities: SupportPriorityConfig[];
  /** Status configurations */
  statuses: SupportStatusConfig[];
  /** SLA settings */
  sla: SLAConfig;
  /** Auto-response settings */
  autoResponse: AutoResponseConfig;
  /** Ticket settings */
  ticketSettings: TicketSettings;
}

export interface SupportCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  requiresAuth: boolean;
  autoAssign?: string;
}

export interface SupportPriorityConfig {
  value: TicketPriority;
  name: string;
  description: string;
  color: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

export interface SupportStatusConfig {
  value: TicketStatus;
  name: string;
  description: string;
  color: string;
  isOpen: boolean;
  order: number;
}

export interface SLAConfig {
  enabled: boolean;
  businessHoursOnly: boolean;
  businessHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
    workDays: number[]; // 0-6, 0=Sunday
  };
  escalation: {
    enabled: boolean;
    levels: EscalationLevel[];
  };
}

export interface EscalationLevel {
  afterHours: number;
  action: 'notify' | 'reassign' | 'priority_bump';
  notifyEmails?: string[];
  assignTo?: string;
}

export interface AutoResponseConfig {
  enabled: boolean;
  acknowledgementEnabled: boolean;
  acknowledgementDelay: number; // seconds
  templates: {
    acknowledgement: string;
    resolved: string;
    closed: string;
  };
}

export interface TicketSettings {
  maxAttachments: number;
  maxAttachmentSize: number; // bytes
  allowedFileTypes: string[];
  autoCloseAfterDays: number;
  satisfactionSurveyEnabled: boolean;
}

// =============================================================================
// CATEGORIES CONFIGURATION
// =============================================================================

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'bug',
    name: 'Bug Report',
    description: 'Report a bug or issue with the platform',
    icon: 'Bug',
    order: 1,
    requiresAuth: false,
  },
  {
    id: 'feature',
    name: 'Feature Request',
    description: 'Suggest a new feature or improvement',
    icon: 'Lightbulb',
    order: 2,
    requiresAuth: false,
  },
  {
    id: 'account',
    name: 'Account Issues',
    description: 'Problems with login, profile, or settings',
    icon: 'User',
    order: 3,
    requiresAuth: true,
  },
  {
    id: 'billing',
    name: 'Billing & Subscription',
    description: 'Payment issues, refunds, or subscription questions',
    icon: 'CreditCard',
    order: 4,
    requiresAuth: true,
  },
  {
    id: 'sync',
    name: 'Sync Issues',
    description: 'Problems with platform connections or data sync',
    icon: 'RefreshCw',
    order: 5,
    requiresAuth: true,
  },
  {
    id: 'data',
    name: 'Data & Export',
    description: 'Issues with data export, import, or accuracy',
    icon: 'Database',
    order: 6,
    requiresAuth: true,
  },
  {
    id: 'security',
    name: 'Security Concern',
    description: 'Report a security vulnerability or concern',
    icon: 'Shield',
    order: 7,
    requiresAuth: false,
  },
  {
    id: 'other',
    name: 'Other',
    description: 'General questions or other issues',
    icon: 'HelpCircle',
    order: 8,
    requiresAuth: false,
  },
];

// =============================================================================
// PRIORITY CONFIGURATION
// =============================================================================

export const SUPPORT_PRIORITIES: SupportPriorityConfig[] = [
  {
    value: 'LOW',
    name: 'Low',
    description: 'General questions, minor issues',
    color: '#6B7280',
    responseTimeHours: 48,
    resolutionTimeHours: 168, // 1 week
  },
  {
    value: 'MEDIUM',
    name: 'Medium',
    description: 'Non-critical bugs, feature requests',
    color: '#F59E0B',
    responseTimeHours: 24,
    resolutionTimeHours: 72, // 3 days
  },
  {
    value: 'HIGH',
    name: 'High',
    description: 'Significant issues affecting usage',
    color: '#EF4444',
    responseTimeHours: 8,
    resolutionTimeHours: 24,
  },
  {
    value: 'CRITICAL',
    name: 'Critical',
    description: 'Service outage, security issues, data loss',
    color: '#DC2626',
    responseTimeHours: 2,
    resolutionTimeHours: 8,
  },
];

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

export const SUPPORT_STATUSES: SupportStatusConfig[] = [
  {
    value: 'OPEN',
    name: 'Open',
    description: 'Ticket is new and awaiting response',
    color: '#3B82F6',
    isOpen: true,
    order: 1,
  },
  {
    value: 'IN_PROGRESS',
    name: 'In Progress',
    description: 'Ticket is being worked on',
    color: '#F59E0B',
    isOpen: true,
    order: 2,
  },
  {
    value: 'WAITING',
    name: 'Waiting on Customer',
    description: 'Awaiting response from customer',
    color: '#8B5CF6',
    isOpen: true,
    order: 3,
  },
  {
    value: 'RESOLVED',
    name: 'Resolved',
    description: 'Issue has been resolved',
    color: '#10B981',
    isOpen: false,
    order: 4,
  },
  {
    value: 'CLOSED',
    name: 'Closed',
    description: 'Ticket is closed',
    color: '#6B7280',
    isOpen: false,
    order: 5,
  },
];

// =============================================================================
// MAIN CONFIGURATION
// =============================================================================

export const supportConfig: SupportConfig = {
  enabled: true,
  email: process.env.SUPPORT_EMAIL || 'support@codesyncpro.com',
  categories: SUPPORT_CATEGORIES,
  priorities: SUPPORT_PRIORITIES,
  statuses: SUPPORT_STATUSES,
  sla: {
    enabled: true,
    businessHoursOnly: true,
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'UTC',
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
    },
    escalation: {
      enabled: true,
      levels: [
        {
          afterHours: 4,
          action: 'notify',
          notifyEmails: ['team-lead@codesyncpro.com'],
        },
        {
          afterHours: 8,
          action: 'priority_bump',
        },
        {
          afterHours: 24,
          action: 'reassign',
          assignTo: 'senior-support',
        },
      ],
    },
  },
  autoResponse: {
    enabled: true,
    acknowledgementEnabled: true,
    acknowledgementDelay: 60, // 1 minute
    templates: {
      acknowledgement: 'support-acknowledgement',
      resolved: 'support-resolved',
      closed: 'support-closed',
    },
  },
  ticketSettings: {
    maxAttachments: 5,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/json',
    ],
    autoCloseAfterDays: 7,
    satisfactionSurveyEnabled: true,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): SupportCategory | undefined {
  return SUPPORT_CATEGORIES.find((c) => c.id === categoryId);
}

/**
 * Get priority config by value
 */
export function getPriorityConfig(priority: TicketPriority): SupportPriorityConfig | undefined {
  return SUPPORT_PRIORITIES.find((p) => p.value === priority);
}

/**
 * Get status config by value
 */
export function getStatusConfig(status: TicketStatus): SupportStatusConfig | undefined {
  return SUPPORT_STATUSES.find((s) => s.value === status);
}

/**
 * Get open statuses
 */
export function getOpenStatuses(): TicketStatus[] {
  return SUPPORT_STATUSES.filter((s) => s.isOpen).map((s) => s.value);
}

/**
 * Get closed statuses
 */
export function getClosedStatuses(): TicketStatus[] {
  return SUPPORT_STATUSES.filter((s) => !s.isOpen).map((s) => s.value);
}

/**
 * Check if status is open
 */
export function isStatusOpen(status: TicketStatus): boolean {
  return getStatusConfig(status)?.isOpen ?? false;
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: TicketPriority): string {
  return getPriorityConfig(priority)?.color ?? '#6B7280';
}

/**
 * Get status color
 */
export function getStatusColor(status: TicketStatus): string {
  return getStatusConfig(status)?.color ?? '#6B7280';
}

/**
 * Calculate SLA deadline
 */
export function calculateSLADeadline(
  priority: TicketPriority,
  createdAt: Date,
  type: 'response' | 'resolution'
): Date {
  const config = getPriorityConfig(priority);
  if (!config) return createdAt;
  
  const hours = type === 'response' ? config.responseTimeHours : config.resolutionTimeHours;
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + hours);
  
  return deadline;
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(
  priority: TicketPriority,
  createdAt: Date,
  type: 'response' | 'resolution',
  actionTakenAt?: Date
): boolean {
  const deadline = calculateSLADeadline(priority, createdAt, type);
  const checkTime = actionTakenAt || new Date();
  return checkTime > deadline;
}

/**
 * Generate ticket number
 */
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

/**
 * Validate attachment file type
 */
export function isAllowedFileType(mimeType: string): boolean {
  return supportConfig.ticketSettings.allowedFileTypes.includes(mimeType);
}

/**
 * Validate attachment size
 */
export function isAllowedFileSize(sizeBytes: number): boolean {
  return sizeBytes <= supportConfig.ticketSettings.maxAttachmentSize;
}

export default supportConfig;