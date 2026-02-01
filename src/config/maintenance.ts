// ===== FILE: src/config/maintenance.ts =====
// Maintenance window configuration - synced with Prisma MaintenanceWindow model

import { logger } from '@/lib/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface MaintenanceConfig {
  /** Enable maintenance mode globally */
  enabled: boolean;
  /** Bypass key for admin access during maintenance */
  bypassKey: string | null;
  /** Default maintenance message */
  defaultMessage: string;
  /** Allow read-only access during maintenance */
  allowReadOnly: boolean;
  /** Services that can be affected */
  services: MaintenanceService[];
  /** Notification settings */
  notifications: MaintenanceNotificationConfig;
  /** Scheduled maintenance windows */
  scheduledWindows: ScheduledMaintenanceWindow[];
}

export interface MaintenanceService {
  id: string;
  name: string;
  description: string;
  critical: boolean;
  healthCheckUrl?: string;
}

export interface MaintenanceNotificationConfig {
  /** Send email notifications before maintenance */
  emailEnabled: boolean;
  /** Hours before maintenance to send notification */
  notifyHoursBefore: number[];
  /** Send push notifications */
  pushEnabled: boolean;
  /** Show banner in app */
  bannerEnabled: boolean;
  /** Banner warning hours before maintenance */
  bannerHoursBefore: number;
}

export interface ScheduledMaintenanceWindow {
  id: string;
  title: string;
  message: string;
  startTime: Date;
  endTime: Date;
  affectedServices: string[];
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
}

export interface MaintenanceStatus {
  isActive: boolean;
  currentWindow: ScheduledMaintenanceWindow | null;
  upcomingWindows: ScheduledMaintenanceWindow[];
  affectedServices: string[];
  estimatedEndTime: Date | null;
  message: string;
}

// =============================================================================
// SERVICES CONFIGURATION
// =============================================================================

export const MAINTENANCE_SERVICES: MaintenanceService[] = [
  {
    id: 'api',
    name: 'API',
    description: 'Core API endpoints',
    critical: true,
    healthCheckUrl: '/api/health',
  },
  {
    id: 'auth',
    name: 'Authentication',
    description: 'Login, registration, and session management',
    critical: true,
  },
  {
    id: 'sync',
    name: 'Platform Sync',
    description: 'Auto-sync with external platforms',
    critical: false,
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Email and push notifications',
    critical: false,
  },
  {
    id: 'export',
    name: 'Data Export',
    description: 'CSV, JSON, PDF export functionality',
    critical: false,
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Stripe payment processing',
    critical: true,
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Primary database operations',
    critical: true,
  },
  {
    id: 'cache',
    name: 'Cache',
    description: 'Redis cache layer',
    critical: false,
  },
  {
    id: 'storage',
    name: 'File Storage',
    description: 'S3/file upload and download',
    critical: false,
  },
];

// =============================================================================
// MAIN CONFIGURATION
// =============================================================================

export const maintenanceConfig: MaintenanceConfig = {
  enabled: false,
  bypassKey: process.env.MAINTENANCE_BYPASS_KEY || null,
  defaultMessage: 'We are currently performing scheduled maintenance. Please check back soon.',
  allowReadOnly: true,
  services: MAINTENANCE_SERVICES,
  notifications: {
    emailEnabled: true,
    notifyHoursBefore: [24, 1],
    pushEnabled: true,
    bannerEnabled: true,
    bannerHoursBefore: 2,
  },
  scheduledWindows: [],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if maintenance mode is currently active
 */
export function isMaintenanceActive(): boolean {
  if (maintenanceConfig.enabled) return true;
  
  const now = new Date();
  return maintenanceConfig.scheduledWindows.some(
    (window) => now >= window.startTime && now <= window.endTime
  );
}

/**
 * Get current maintenance status
 */
export function getMaintenanceStatus(): MaintenanceStatus {
  const now = new Date();
  
  // Find active window
  const activeWindow = maintenanceConfig.scheduledWindows.find(
    (window) => now >= window.startTime && now <= window.endTime
  );
  
  // Find upcoming windows (next 7 days)
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingWindows = maintenanceConfig.scheduledWindows
    .filter((window) => window.startTime > now && window.startTime <= weekFromNow)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  return {
    isActive: maintenanceConfig.enabled || !!activeWindow,
    currentWindow: activeWindow || null,
    upcomingWindows,
    affectedServices: activeWindow?.affectedServices || [],
    estimatedEndTime: activeWindow?.endTime || null,
    message: activeWindow?.message || maintenanceConfig.defaultMessage,
  };
}

/**
 * Check if a specific service is under maintenance
 */
export function isServiceUnderMaintenance(serviceId: string): boolean {
  const status = getMaintenanceStatus();
  if (!status.isActive) return false;
  
  // If no specific services listed, all are affected
  if (status.affectedServices.length === 0) return true;
  
  return status.affectedServices.includes(serviceId);
}

/**
 * Check if request has maintenance bypass
 */
export function hasBypassAccess(bypassKey: string | null): boolean {
  if (!maintenanceConfig.bypassKey) return false;
  return bypassKey === maintenanceConfig.bypassKey;
}

/**
 * Get service by ID
 */
export function getServiceById(serviceId: string): MaintenanceService | undefined {
  return MAINTENANCE_SERVICES.find((s) => s.id === serviceId);
}

/**
 * Get critical services
 */
export function getCriticalServices(): MaintenanceService[] {
  return MAINTENANCE_SERVICES.filter((s) => s.critical);
}

/**
 * Format maintenance message with dynamic values
 */
export function formatMaintenanceMessage(
  template: string,
  data: { endTime?: Date; services?: string[] }
): string {
  let message = template;
  
  if (data.endTime) {
    message = message.replace(
      '{endTime}',
      data.endTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    );
  }
  
  if (data.services) {
    message = message.replace('{services}', data.services.join(', '));
  }
  
  return message;
}

/**
 * Log maintenance event
 */
export function logMaintenanceEvent(
  event: 'start' | 'end' | 'scheduled' | 'cancelled',
  details: Record<string, unknown>
): void {
  logger.info(`Maintenance ${event}`, {
    event,
    ...details,
  });
}

/**
 * Schedule a maintenance window
 */
export function scheduleMaintenanceWindow(
  window: Omit<ScheduledMaintenanceWindow, 'id'>
): ScheduledMaintenanceWindow {
  const newWindow: ScheduledMaintenanceWindow = {
    ...window,
    id: `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  maintenanceConfig.scheduledWindows.push(newWindow);
  logMaintenanceEvent('scheduled', { window: newWindow });
  
  return newWindow;
}

/**
 * Cancel a scheduled maintenance window
 */
export function cancelMaintenanceWindow(windowId: string): boolean {
  const index = maintenanceConfig.scheduledWindows.findIndex((w) => w.id === windowId);
  if (index === -1) return false;
  
  const cancelled = maintenanceConfig.scheduledWindows.splice(index, 1)[0];
  logMaintenanceEvent('cancelled', { window: cancelled });
  
  return true;
}

// =============================================================================
// MAINTENANCE PAGE CONTENT
// =============================================================================

export const maintenancePageContent = {
  title: 'Under Maintenance',
  heading: "We'll be back soon!",
  description: 'We are currently performing scheduled maintenance to improve your experience.',
  features: [
    'Performance improvements',
    'New features being deployed',
    'Security updates',
  ],
  contact: {
    email: 'support@codesyncpro.com',
    twitter: '@codesyncpro',
  },
  links: {
    status: 'https://status.codesyncpro.com',
    blog: '/blog',
  },
};

export default maintenanceConfig;