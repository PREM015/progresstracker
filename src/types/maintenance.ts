// src/types/maintenance.ts
// ===== FILE: src/types/maintenance.ts =====
// Complete maintenance types matching Prisma MaintenanceWindow model

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Maintenance status */
export type MaintenanceStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

/** Affected service types */
export type AffectedService = 
  | 'api'
  | 'web'
  | 'sync'
  | 'database'
  | 'auth'
  | 'notifications'
  | 'export'
  | 'all';

/** Maintenance severity */
export type MaintenanceSeverity = 'low' | 'medium' | 'high' | 'critical';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Maintenance window (matches Prisma MaintenanceWindow model) */
export interface MaintenanceWindow {
  id: string;

  // Content
  title: string;
  message: string;

  // Schedule
  startTime: Date;
  endTime: Date;

  // Status
  isActive: boolean;
  affectedServices: string[];

  // Admin
  createdBy?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Maintenance window for display */
export interface MaintenanceWindowDisplay extends MaintenanceWindow {
  status: MaintenanceStatus;
  severity: MaintenanceSeverity;
  duration: number; // minutes
  timeUntilStart?: number; // minutes
  timeUntilEnd?: number; // minutes
  affectedServicesLabels: string[];
  formattedStartTime: string;
  formattedEndTime: string;
}

/** Maintenance summary */
export interface MaintenanceSummary {
  current?: MaintenanceWindow;
  upcoming: MaintenanceWindow[];
  past: MaintenanceWindow[];
  total: number;
  scheduled: number;
  completed: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create maintenance window input */
export interface CreateMaintenanceWindowInput {
  title: string;
  message: string;
  startTime: Date | string;
  endTime: Date | string;
  affectedServices?: AffectedService[];
  severity?: MaintenanceSeverity;
}

/** Update maintenance window input */
export interface UpdateMaintenanceWindowInput {
  title?: string;
  message?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  affectedServices?: AffectedService[];
  isActive?: boolean;
}

/** Maintenance window filter */
export interface MaintenanceWindowFilter {
  status?: MaintenanceStatus;
  affectedService?: AffectedService;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Service configuration */
export const SERVICE_CONFIG: Record<AffectedService, {
  label: string;
  icon: string;
  color: string;
}> = {
  api: {
    label: 'API',
    icon: 'Code',
    color: '#6366F1'
  },
  web: {
    label: 'Web Application',
    icon: 'Globe',
    color: '#3B82F6'
  },
  sync: {
    label: 'Platform Sync',
    icon: 'RefreshCw',
    color: '#10B981'
  },
  database: {
    label: 'Database',
    icon: 'Database',
    color: '#8B5CF6'
  },
  auth: {
    label: 'Authentication',
    icon: 'Lock',
    color: '#EF4444'
  },
  notifications: {
    label: 'Notifications',
    icon: 'Bell',
    color: '#F59E0B'
  },
  export: {
    label: 'Data Export',
    icon: 'Download',
    color: '#EC4899'
  },
  all: {
    label: 'All Services',
    icon: 'AlertTriangle',
    color: '#DC2626'
  },
};

/** Status configuration */
export const MAINTENANCE_STATUS_CONFIG: Record<MaintenanceStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  scheduled: {
    label: 'Scheduled',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'Calendar'
  },
  active: {
    label: 'In Progress',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: 'Activity'
  },
  completed: {
    label: 'Completed',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: 'CheckCircle'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'XCircle'
  },
};

/** Severity configuration */
export const MAINTENANCE_SEVERITY_CONFIG: Record<MaintenanceSeverity, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  low: {
    label: 'Low Impact',
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  medium: {
    label: 'Medium Impact',
    color: '#F59E0B',
    bgColor: '#FEF3C7'
  },
  high: {
    label: 'High Impact',
    color: '#EF4444',
    bgColor: '#FEE2E2'
  },
  critical: {
    label: 'Critical',
    color: '#DC2626',
    bgColor: '#FEE2E2'
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get maintenance status */
export function getMaintenanceStatus(window: MaintenanceWindow): MaintenanceStatus {
  const now = new Date();
  const start = new Date(window.startTime);
  const end = new Date(window.endTime);

  if (!window.isActive) {
    return now > end ? 'completed' : 'cancelled';
  }

  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'active';
  return 'completed';
}

/** Get time until start (in minutes) */
export function getTimeUntilStart(window: MaintenanceWindow): number | undefined {
  const now = new Date();
  const start = new Date(window.startTime);
  
  if (now >= start) return undefined;
  
  return Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
}

/** Get time until end (in minutes) */
export function getTimeUntilEnd(window: MaintenanceWindow): number | undefined {
  const now = new Date();
  const end = new Date(window.endTime);
  
  if (now >= end) return undefined;
  
  return Math.floor((end.getTime() - now.getTime()) / (1000 * 60));
}

/** Calculate duration (in minutes) */
export function calculateDuration(window: MaintenanceWindow): number {
  const start = new Date(window.startTime);
  const end = new Date(window.endTime);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/** Determine severity based on affected services */
export function determineSeverity(affectedServices: string[]): MaintenanceSeverity {
  if (affectedServices.includes('all')) return 'critical';
  if (affectedServices.includes('database') || affectedServices.includes('auth')) return 'high';
  if (affectedServices.length >= 3) return 'medium';
  return 'low';
}

/** Format maintenance window for display */
export function formatMaintenanceWindow(window: MaintenanceWindow): MaintenanceWindowDisplay {
  const status = getMaintenanceStatus(window);
  const duration = calculateDuration(window);
  const timeUntilStart = getTimeUntilStart(window);
  const timeUntilEnd = getTimeUntilEnd(window);
  const severity = determineSeverity(window.affectedServices);

  return {
    ...window,
    status,
    severity,
    duration,
    timeUntilStart,
    timeUntilEnd,
    affectedServicesLabels: window.affectedServices.map(
      service => SERVICE_CONFIG[service as AffectedService]?.label || service
    ),
    formattedStartTime: new Date(window.startTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    formattedEndTime: new Date(window.endTime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
  };
}

/** Check if service is affected */
export function isServiceAffected(window: MaintenanceWindow, service: AffectedService): boolean {
  return window.affectedServices.includes('all') || window.affectedServices.includes(service);
}

/** Get current maintenance */
export function getCurrentMaintenance(windows: MaintenanceWindow[]): MaintenanceWindow | undefined {
  return windows.find(w => getMaintenanceStatus(w) === 'active');
}

/** Get upcoming maintenance */
export function getUpcomingMaintenance(windows: MaintenanceWindow[], limit = 5): MaintenanceWindow[] {
  return windows
    .filter(w => getMaintenanceStatus(w) === 'scheduled')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, limit);
}

/** Format duration */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hours}h ${mins}m`;
}

/** Validate maintenance window */
export function validateMaintenanceWindow(input: CreateMaintenanceWindowInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (isNaN(start.getTime())) {
    errors.push('Invalid start time');
  }

  if (isNaN(end.getTime())) {
    errors.push('Invalid end time');
  }

  if (start >= end) {
    errors.push('End time must be after start time');
  }

  const duration = (end.getTime() - start.getTime()) / (1000 * 60);
  if (duration < 5) {
    errors.push('Maintenance window must be at least 5 minutes');
  }

  if (duration > 24 * 60) {
    errors.push('Maintenance window cannot exceed 24 hours');
  }

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!input.message || input.message.trim().length === 0) {
    errors.push('Message is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default MaintenanceWindow;