// src/types/scheduled-export.ts
// Scheduled/recurring export types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ScheduledExportFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduledExportStatus = 'active' | 'paused' | 'cancelled' | 'completed';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Scheduled export record (matches Prisma ScheduledExport model) */
export interface ScheduledExport {
  id: string;
  userId: string;
  name: string;
  format: string; // ExportFormat
  dataTypes: string[]; // ExportDataType[]
  frequency: ScheduledExportFrequency;
  status: ScheduledExportStatus;
  deliveryMethod: 'email' | 'download';
  deliveryEmail?: string | null;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  runCount: number;
  filters?: Record<string, unknown> | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateScheduledExportInput {
  name: string;
  format: string;
  dataTypes: string[];
  frequency: ScheduledExportFrequency;
  deliveryMethod: 'email' | 'download';
  deliveryEmail?: string;
  filters?: Record<string, unknown>;
}

export interface UpdateScheduledExportInput extends Partial<CreateScheduledExportInput> {
  isEnabled?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ScheduledExportListResponse {
  exports: ScheduledExport[];
  total: number;
  activeCount: number;
}

export default ScheduledExport;
