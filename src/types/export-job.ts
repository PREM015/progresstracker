// src/types/export-job.ts
// Data export job types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel' | 'xml';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
export type ExportDataType =
  | 'all'
  | 'tracker'
  | 'goals'
  | 'achievements'
  | 'platforms'
  | 'stats'
  | 'blog_posts'
  | 'account';

export const EXPORT_FILE_EXPIRY_HOURS = 48;

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Export job record (matches Prisma ExportJob model) */
export interface ExportJob {
  id: string;
  userId: string;
  format: ExportFormat;
  dataTypes: ExportDataType[];
  status: ExportStatus;
  progress: number; // 0-100
  fileUrl?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
  filters?: ExportFilters | null;
  error?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  expiresAt?: Date | null;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Export filters configuration */
export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  platformIds?: string[];
  goalIds?: string[];
  includeMetadata?: boolean;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateExportJobInput {
  format: ExportFormat;
  dataTypes: ExportDataType[];
  filters?: ExportFilters;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ExportJobStatusResponse {
  id: string;
  status: ExportStatus;
  progress: number;
  fileUrl?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
  completedAt?: Date | null;
  expiresAt?: Date | null;
  error?: string | null;
}

export interface ExportJobListResponse {
  jobs: ExportJob[];
  total: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function isExportReady(job: Pick<ExportJob, 'status' | 'fileUrl'>): boolean {
  return job.status === 'completed' && !!job.fileUrl;
}

export function isExportExpired(job: Pick<ExportJob, 'expiresAt'>): boolean {
  if (!job.expiresAt) return false;
  return new Date() > new Date(job.expiresAt);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default ExportJob;
