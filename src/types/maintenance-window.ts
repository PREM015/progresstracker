// src/types/maintenance-window.ts
// Maintenance window types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type MaintenanceWindowStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type MaintenanceWindowType = 'planned' | 'emergency' | 'routine';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Maintenance window record (matches Prisma MaintenanceWindow model) */
export interface MaintenanceWindow {
  id: string;
  title: string;
  description?: string | null;
  type: MaintenanceWindowType;
  status: MaintenanceWindowStatus;
  startTime: Date;
  endTime: Date;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  affectedServices: string[];
  notifyUsers: boolean;
  notificationSentAt?: Date | null;
  message?: string | null; // Message shown during maintenance
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateMaintenanceWindowInput {
  title: string;
  description?: string;
  type?: MaintenanceWindowType;
  startTime: Date;
  endTime: Date;
  affectedServices?: string[];
  notifyUsers?: boolean;
  message?: string;
}

export interface UpdateMaintenanceWindowInput extends Partial<CreateMaintenanceWindowInput> {
  status?: MaintenanceWindowStatus;
  actualStartTime?: Date;
  actualEndTime?: Date;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isMaintenanceActive(win: Pick<MaintenanceWindow, 'status' | 'startTime' | 'endTime'>): boolean {
  if (win.status === 'active') return true;
  if (win.status !== 'scheduled') return false;
  const now = Date.now();
  return now >= new Date(win.startTime).getTime() && now <= new Date(win.endTime).getTime();
}

export function getMaintenanceTimeRemaining(win: Pick<MaintenanceWindow, 'endTime'>): number {
  return Math.max(0, new Date(win.endTime).getTime() - Date.now());
}

export default MaintenanceWindow;
