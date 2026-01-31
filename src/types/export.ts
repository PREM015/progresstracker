// src/types/export.ts
// ===== FILE: src/types/export.ts =====
// Complete export types for data export functionality

import type { 
  PlatformCategory as PrismaPlatformCategory,
  ExportFormat as PrismaExportFormat,
  ExportStatus as PrismaExportStatus 
} from '@prisma/client';

// =============================================================================
// RE-EXPORT PRISMA ENUMS FOR CONVENIENCE
// =============================================================================

export type { PrismaPlatformCategory };

/** Export file formats - matches Prisma ExportFormat enum */
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel' | 'xml';

/** Database export format (uppercase) */
export type DatabaseExportFormat = PrismaExportFormat;

/** Export status - matches Prisma ExportStatus enum */
export type ExportStatus = 'queued' | 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';

/** Database export status (uppercase) */
export type DatabaseExportStatus = PrismaExportStatus;

/** Export type */
export type ExportType = 'full' | 'tracker' | 'goals' | 'achievements' | 'platforms' | 'analytics' | 'custom';

/** Date range preset */
export type DateRangePreset = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year' | 'all_time' | 'custom';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Export options configuration - used by ExportService */
export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  dateRange: DateRangePreset;
  startDate?: Date;
  endDate?: Date;
  includeTracker?: boolean;
  includeGoals?: boolean;
  includeAchievements?: boolean;
  includePlatforms?: boolean;
  includeStats?: boolean;
  includeNotes?: boolean;
  includeMetadata?: boolean;
  platforms?: string[];
  categories?: PrismaPlatformCategory[];
  compression?: boolean;
  password?: string;
}

/** Export job - matches Prisma ExportJob model */
export interface ExportJob {
  id: string;
  userId: string;
  name: string | null;
  format: PrismaExportFormat;
  dateFrom: Date | null;
  dateTo: Date | null;
  platforms: string[];
  categories: PrismaPlatformCategory[];
  includeNotes: boolean;
  includeStats: boolean;
  status: PrismaExportStatus;
  progress: number;
  startedAt: Date | null;
  completedAt: Date | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
  hasError: boolean;
  errorMessage: string | null;
  expiresAt: Date | null;
  totalRecords: number;
  exportedRecords: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Scheduled export - matches Prisma ScheduledExport model */
export interface ScheduledExport {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  time: string;
  timezone: string;
  format: PrismaExportFormat;
  platforms: string[];
  categories: PrismaPlatformCategory[];
  relativeDateRange: string;
  deliveryMethod: string;
  emailTo: string | null;
  emailSubject: string | null;
  isActive: boolean;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  lastRunJobId: string | null;
  nextRunAt: Date | null;
  runCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Export template */
export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  format: ExportFormat;
  type: ExportType;
  options: Partial<ExportOptions>;
  isDefault: boolean;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
}

// =============================================================================
// EXPORT DATA STRUCTURES - Used by ExportService
// =============================================================================

/** Main export data container */
export interface ExportData {
  exportInfo?: ExportInfo;
  user: UserExport;
  exportDate: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary?: SummaryExport;
  trackerEntries: TrackerEntryExport[];
  goals: GoalExport[];
  achievements: AchievementExport[];
  platforms: PlatformExport[];
  stats?: StatsExport;
  metadata?: MetadataExport;
}

/** Export info header */
export interface ExportInfo {
  exportId: string;
  exportDate: string;
  exportFormat: ExportFormat;
  exportType: ExportType;
  version: string;
  generatedBy: string;
}

/** User info for export */
export interface UserExport {
  id: string;
  name: string;
  email: string;
  username?: string;
  createdAt?: string;
  memberSince?: string;
}

/** Date range for export */
export interface DateRangeExport {
  preset: DateRangePreset;
  start: string;
  end: string;
  daysIncluded: number;
}

/** Summary statistics */
export interface SummaryExport {
  totalEntries: number;
  totalDays: number;
  activeDays: number;
  totalProblems: number;
  totalCommits: number;
  totalTime: number;
  totalGoals: number;
  completedGoals: number;
  totalAchievements: number;
  unlockedAchievements: number;
  currentStreak: number;
  longestStreak: number;
  platformsConnected: number;
}

/** Tracker entry export format - matches TrackerEntry model fields */
export interface TrackerEntryExport {
  id?: string;
  date: string;
  platform: string;
  platformSlug?: string;
  category: string;
  problemsSolved?: number;
  problemsAttempted?: number;
  easyProblems?: number;
  mediumProblems?: number;
  hardProblems?: number;
  commits?: number;
  pullRequests?: number;
  projectsStarted?: number;
  projectsCompleted?: number;
  applicationsSubmitted?: number;
  coursesCompleted?: number;
  certificationsEarned?: number;
  timeSpent?: number;
  rating?: number;
  ratingChange?: number;
  points?: number;
  mood?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Goal export format - matches Goal model fields */
export interface GoalExport {
  id?: string;
  title: string;
  description: string;
  category: string;
  goalType?: string;
  metric?: string;
  target: number;
  progress: number;
  progressPercentage?: number;
  status: string;
  startDate?: string;
  deadline?: string;
  completedAt?: string;
  platform?: string;
  daysActive?: number;
  createdAt?: string;
}

/** Achievement export format - matches Achievement/UserAchievement models */
export interface AchievementExport {
  id?: string;
  slug?: string;
  title: string;
  description: string;
  category: string;
  rarity?: string;
  tier?: string;
  points?: number;
  unlockedAt: string;
  progress?: number;
}

/** Platform export format - matches UserPlatform model */
export interface PlatformExport {
  id?: string;
  name: string;
  slug?: string;
  category: string;
  isConnected: boolean;
  username?: string;
  profileUrl?: string;
  lastSynced?: string;
  syncStatus?: string;
  totalEntries?: number;
  totalProblems?: number;
  stats?: Record<string, unknown>;
}

/** Stats export format */
export interface StatsExport {
  period?: {
    start: string;
    end: string;
    days: number;
  };
  totals?: {
    problems: number;
    commits: number;
    pullRequests: number;
    time: number;
    points: number;
    applications: number;
    courses: number;
    certifications: number;
  };
  averages?: {
    problemsPerDay: number;
    commitsPerDay: number;
    timePerDay: number;
    pointsPerDay: number;
  };
  streaks?: {
    current: number;
    longest: number;
    startDate?: string;
  };
  totalEntries?: number;
  totalGoals?: number;
  completedGoals?: number;
  achievements?: number;
  currentStreak?: number;
  longestStreak?: number;
  totalProblemsSolved?: number;
  totalTimeSpent?: number;
  byCategory?: Record<string, {
    problems: number;
    commits: number;
    time: number;
    entries: number;
  }>;
  byPlatform?: Record<string, {
    problems: number;
    commits: number;
    time: number;
    entries: number;
  }>;
  byMonth?: Array<{
    month: string;
    problems: number;
    commits: number;
    time: number;
    activeDays: number;
  }>;
}

/** Metadata export */
export interface MetadataExport {
  exportedAt: string;
  exportDuration: number;
  recordCounts: {
    trackerEntries: number;
    goals: number;
    achievements: number;
    platforms: number;
  };
  filters: {
    dateRange: DateRangeExport;
    platforms?: string[];
    categories?: string[];
  };
  checksums?: {
    data: string;
    file: string;
  };
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/** Export result */
export interface ExportResult {
  success: boolean;
  jobId?: string;
  format: ExportFormat;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  data?: string | Buffer | Blob;
  recordCount?: number;
  duration?: number;
  expiresAt?: Date;
  error?: string;
}

/** Export progress update */
export interface ExportProgress {
  jobId: string;
  status: ExportStatus;
  progress: number;
  currentStep: string;
  processedRecords: number;
  totalRecords: number;
  estimatedTimeRemaining?: number;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create export request */
export interface CreateExportRequest {
  format: ExportFormat;
  type?: ExportType;
  dateRange?: DateRangePreset;
  startDate?: string;
  endDate?: string;
  options?: Partial<ExportOptions>;
}

/** Create scheduled export request */
export interface CreateScheduledExportRequest {
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  format: ExportFormat;
  options: Partial<ExportOptions>;
  deliveryMethod: 'email' | 'download';
  emailTo?: string;
}

// =============================================================================
// FORMAT CONFIGURATIONS
// =============================================================================

/** Export format configurations */
export const EXPORT_FORMAT_CONFIG: Record<ExportFormat, {
  label: string;
  extension: string;
  mimeType: string;
  icon: string;
  description: string;
  maxRecords: number;
  supportsCompression: boolean;
  prismaValue: PrismaExportFormat;
}> = {
  csv: {
    label: 'CSV',
    extension: '.csv',
    mimeType: 'text/csv',
    icon: 'FileSpreadsheet',
    description: 'Comma-separated values, compatible with Excel and Google Sheets',
    maxRecords: 100000,
    supportsCompression: true,
    prismaValue: 'CSV',
  },
  json: {
    label: 'JSON',
    extension: '.json',
    mimeType: 'application/json',
    icon: 'FileJson',
    description: 'JavaScript Object Notation, ideal for developers and APIs',
    maxRecords: 50000,
    supportsCompression: true,
    prismaValue: 'JSON',
  },
  pdf: {
    label: 'PDF',
    extension: '.pdf',
    mimeType: 'application/pdf',
    icon: 'FileText',
    description: 'Portable Document Format, great for sharing and printing',
    maxRecords: 10000,
    supportsCompression: false,
    prismaValue: 'PDF',
  },
  excel: {
    label: 'Excel',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    icon: 'FileSpreadsheet',
    description: 'Microsoft Excel format with multiple sheets',
    maxRecords: 100000,
    supportsCompression: false,
    prismaValue: 'EXCEL',
  },
  xml: {
    label: 'XML',
    extension: '.xml',
    mimeType: 'application/xml',
    icon: 'FileCode',
    description: 'Extensible Markup Language, structured data format',
    maxRecords: 50000,
    supportsCompression: true,
    prismaValue: 'XML',
  },
};

/** Date range presets */
export const DATE_RANGE_PRESETS: Record<DateRangePreset, {
  label: string;
  days: number | null;
  getRange: () => { start: Date; end: Date };
}> = {
  last_7_days: {
    label: 'Last 7 days',
    days: 7,
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { start, end };
    },
  },
  last_30_days: {
    label: 'Last 30 days',
    days: 30,
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { start, end };
    },
  },
  last_90_days: {
    label: 'Last 90 days',
    days: 90,
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 90);
      return { start, end };
    },
  },
  last_year: {
    label: 'Last year',
    days: 365,
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(end.getFullYear() - 1);
      return { start, end };
    },
  },
  all_time: {
    label: 'All time',
    days: null,
    getRange: () => {
      const end = new Date();
      const start = new Date(2020, 0, 1);
      return { start, end };
    },
  },
  custom: {
    label: 'Custom range',
    days: null,
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { start, end };
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get export format config */
export function getExportFormatConfig(format: ExportFormat) {
  return EXPORT_FORMAT_CONFIG[format];
}

/** Convert lowercase format to Prisma enum value */
export function toPrismaExportFormat(format: ExportFormat): PrismaExportFormat {
  return EXPORT_FORMAT_CONFIG[format].prismaValue;
}

/** Convert Prisma enum value to lowercase format - FIXED */
export function fromPrismaExportFormat(format: PrismaExportFormat): ExportFormat {
  const reverseMap: Record<PrismaExportFormat, ExportFormat> = {
    CSV: 'csv',
    JSON: 'json',
    PDF: 'pdf',
    EXCEL: 'excel',
    XML: 'xml',
  };
  return reverseMap[format];
}

/** Convert lowercase status to Prisma enum value */
export function toPrismaExportStatus(status: ExportStatus): PrismaExportStatus {
  const statusMap: Record<ExportStatus, PrismaExportStatus> = {
    queued: 'QUEUED',
    pending: 'PENDING',
    processing: 'PROCESSING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    expired: 'EXPIRED',
    cancelled: 'CANCELLED',
  };
  return statusMap[status];
}

/** Convert Prisma enum value to lowercase status - FIXED */
export function fromPrismaExportStatus(status: PrismaExportStatus): ExportStatus {
  const reverseMap: Record<PrismaExportStatus, ExportStatus> = {
    QUEUED: 'queued',
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
  };
  return reverseMap[status];
}

/** Get date range from preset */
export function getDateRangeFromPreset(preset: DateRangePreset): { start: Date; end: Date } {
  return DATE_RANGE_PRESETS[preset].getRange();
}

/** Generate export filename */
export function generateExportFilename(
  type: ExportType,
  format: ExportFormat,
  date?: Date
): string {
  const timestamp = (date || new Date()).toISOString().split('T')[0];
  const extension = EXPORT_FORMAT_CONFIG[format].extension;
  return `progress-tracker-${type}-${timestamp}${extension}`;
}

/** Calculate estimated export size */
export function estimateExportSize(recordCount: number, format: ExportFormat): number {
  const bytesPerRecord: Record<ExportFormat, number> = {
    csv: 200,
    json: 500,
    pdf: 1000,
    excel: 300,
    xml: 600,
  };
  return recordCount * bytesPerRecord[format];
}

/** Format file size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Check if export is expired */
export function isExportExpired(job: ExportJob): boolean {
  if (!job.expiresAt) return false;
  return new Date() > new Date(job.expiresAt);
}

export default ExportData;