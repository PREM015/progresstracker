// ============================================================================
// FILE: src/config/export.ts
// PURPOSE: Data export configuration
// ============================================================================

import type {
  ExportFormat,
  ExportType,
  DateRangePreset,
} from '@/types/export';
import type { PlatformCategory } from '@prisma/client';

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ExportConfig {
  formats: FormatConfigs;
  limits: ExportLimits;
  storage: StorageConfig;
  processing: ProcessingConfig;
  scheduling: SchedulingConfig;
  templates: ExportTemplateConfig[];
}

export interface FormatConfigs {
  csv: FormatConfig;
  json: FormatConfig;
  pdf: FormatConfig;
  excel: FormatConfig;
  xml: FormatConfig;
}

export interface FormatConfig {
  enabled: boolean;
  label: string;
  extension: string;
  mimeType: string;
  icon: string;
  description: string;
  maxRecords: number;
  supportsCompression: boolean;
  supportsBatch: boolean;
  estimatedBytesPerRecord: number;
}

export interface ExportLimits {
  maxRecordsPerExport: number;
  maxFileSizeMB: number;
  maxConcurrentExports: number;
  maxExportsPerDay: number;
  maxScheduledExports: number;
  exportRetentionDays: number;
  freeUserMaxRecords: number;
  proUserMaxRecords: number;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'cloudflare';
  bucket: string;
  region: string;
  basePath: string;
  signedUrlExpiry: number;
  compressionEnabled: boolean;
  compressionLevel: number;
  encryptionEnabled: boolean;
}

export interface ProcessingConfig {
  chunkSize: number;
  maxMemoryMB: number;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  parallelProcessing: boolean;
  maxParallelWorkers: number;
}

export interface SchedulingConfig {
  enabled: boolean;
  frequencies: ScheduleFrequency[];
  maxScheduledPerUser: number;
  defaultDeliveryMethod: 'email' | 'download';
  emailMaxSizeMB: number;
}

export interface ScheduleFrequency {
  value: string;
  label: string;
  description: string;
}

export interface ExportTemplateConfig {
  id: string;
  name: string;
  description: string;
  type: ExportType;
  format: ExportFormat;
  dateRange: DateRangePreset;
  includeOptions: ExportIncludeOptions;
  isDefault: boolean;
}

export interface ExportIncludeOptions {
  trackerEntries: boolean;
  goals: boolean;
  achievements: boolean;
  platforms: boolean;
  stats: boolean;
  notes: boolean;
  metadata: boolean;
}

// =============================================================================
// FORMAT CONFIGURATIONS
// =============================================================================

export const FORMAT_CONFIGS: FormatConfigs = {
  csv: {
    enabled: true,
    label: 'CSV',
    extension: '.csv',
    mimeType: 'text/csv',
    icon: 'FileSpreadsheet',
    description: 'Comma-separated values, compatible with Excel and Google Sheets',
    maxRecords: 100000,
    supportsCompression: true,
    supportsBatch: true,
    estimatedBytesPerRecord: 200,
  },
  json: {
    enabled: true,
    label: 'JSON',
    extension: '.json',
    mimeType: 'application/json',
    icon: 'FileJson',
    description: 'JavaScript Object Notation, ideal for developers and APIs',
    maxRecords: 50000,
    supportsCompression: true,
    supportsBatch: true,
    estimatedBytesPerRecord: 500,
  },
  pdf: {
    enabled: true,
    label: 'PDF',
    extension: '.pdf',
    mimeType: 'application/pdf',
    icon: 'FileText',
    description: 'Portable Document Format, great for sharing and printing',
    maxRecords: 10000,
    supportsCompression: false,
    supportsBatch: false,
    estimatedBytesPerRecord: 1000,
  },
  excel: {
    enabled: true,
    label: 'Excel',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    icon: 'FileSpreadsheet',
    description: 'Microsoft Excel format with multiple sheets',
    maxRecords: 100000,
    supportsCompression: false,
    supportsBatch: true,
    estimatedBytesPerRecord: 300,
  },
  xml: {
    enabled: true,
    label: 'XML',
    extension: '.xml',
    mimeType: 'application/xml',
    icon: 'FileCode',
    description: 'Extensible Markup Language, structured data format',
    maxRecords: 50000,
    supportsCompression: true,
    supportsBatch: true,
    estimatedBytesPerRecord: 600,
  },
};

// =============================================================================
// EXPORT LIMITS
// =============================================================================

export const EXPORT_LIMITS: ExportLimits = {
  /** Maximum records per single export */
  maxRecordsPerExport: parseInt(process.env.EXPORT_MAX_RECORDS || '100000', 10),

  /** Maximum export file size in MB */
  maxFileSizeMB: parseInt(process.env.EXPORT_MAX_SIZE_MB || '100', 10),

  /** Maximum concurrent export jobs per user */
  maxConcurrentExports: 2,

  /** Maximum exports per day per user */
  maxExportsPerDay: parseInt(process.env.EXPORT_MAX_PER_DAY || '10', 10),

  /** Maximum scheduled exports per user */
  maxScheduledExports: 5,

  /** Export file retention in days */
  exportRetentionDays: parseInt(process.env.EXPORT_RETENTION_DAYS || '7', 10),

  /** Free user max records */
  freeUserMaxRecords: 1000,

  /** Pro user max records */
  proUserMaxRecords: 100000,
};

// =============================================================================
// STORAGE CONFIGURATION
// =============================================================================

export const STORAGE_CONFIG: StorageConfig = {
  /** Storage provider */
  provider: (process.env.EXPORT_STORAGE_PROVIDER as 'local' | 's3' | 'cloudflare') || 'local',

  /** S3 bucket name */
  bucket: process.env.EXPORT_S3_BUCKET || 'progresstracker-exports',

  /** S3 region */
  region: process.env.EXPORT_S3_REGION || 'us-east-1',

  /** Base path for exports */
  basePath: process.env.EXPORT_BASE_PATH || 'exports',

  /** Signed URL expiry in seconds (24 hours) */
  signedUrlExpiry: parseInt(process.env.EXPORT_URL_EXPIRY || '86400', 10),

  /** Enable compression for exports */
  compressionEnabled: process.env.EXPORT_COMPRESSION !== 'false',

  /** Compression level (1-9) */
  compressionLevel: 6,

  /** Enable encryption for stored exports */
  encryptionEnabled: IS_PRODUCTION,
};

// =============================================================================
// PROCESSING CONFIGURATION
// =============================================================================

export const PROCESSING_CONFIG: ProcessingConfig = {
  /** Chunk size for batch processing */
  chunkSize: 1000,

  /** Maximum memory usage in MB */
  maxMemoryMB: 512,

  /** Processing timeout in ms (30 minutes) */
  timeoutMs: 30 * 60 * 1000,

  /** Retry attempts for failed exports */
  retryAttempts: 3,

  /** Delay between retries in ms */
  retryDelayMs: 5000,

  /** Enable parallel processing */
  parallelProcessing: true,

  /** Maximum parallel workers */
  maxParallelWorkers: 4,
};

// =============================================================================
// SCHEDULING CONFIGURATION
// =============================================================================

export const SCHEDULING_CONFIG: SchedulingConfig = {
  /** Enable scheduled exports */
  enabled: true,

  /** Available frequencies */
  frequencies: [
    { value: 'daily', label: 'Daily', description: 'Every day at specified time' },
    { value: 'weekly', label: 'Weekly', description: 'Once per week on specified day' },
    { value: 'biweekly', label: 'Bi-weekly', description: 'Every two weeks' },
    { value: 'monthly', label: 'Monthly', description: 'Once per month on specified day' },
  ],

  /** Maximum scheduled exports per user */
  maxScheduledPerUser: 5,

  /** Default delivery method */
  defaultDeliveryMethod: 'email',

  /** Maximum file size for email delivery in MB */
  emailMaxSizeMB: 10,
};

// =============================================================================
// DATE RANGE PRESETS
// =============================================================================

export const DATE_RANGE_PRESETS: Record<DateRangePreset, {
  label: string;
  days: number | null;
  description: string;
}> = {
  last_7_days: {
    label: 'Last 7 days',
    days: 7,
    description: 'Data from the past week',
  },
  last_30_days: {
    label: 'Last 30 days',
    days: 30,
    description: 'Data from the past month',
  },
  last_90_days: {
    label: 'Last 90 days',
    days: 90,
    description: 'Data from the past 3 months',
  },
  last_year: {
    label: 'Last year',
    days: 365,
    description: 'Data from the past 12 months',
  },
  all_time: {
    label: 'All time',
    days: null,
    description: 'All available data',
  },
  custom: {
    label: 'Custom range',
    days: null,
    description: 'Select custom start and end dates',
  },
};

// =============================================================================
// EXPORT TYPE CONFIGURATIONS
// =============================================================================

export const EXPORT_TYPES: Record<ExportType, {
  label: string;
  description: string;
  icon: string;
  includedData: string[];
}> = {
  full: {
    label: 'Full Export',
    description: 'Export all your data',
    icon: 'Archive',
    includedData: ['tracker', 'goals', 'achievements', 'platforms', 'stats'],
  },
  tracker: {
    label: 'Activity Log',
    description: 'Export tracker entries only',
    icon: 'Activity',
    includedData: ['tracker'],
  },
  goals: {
    label: 'Goals',
    description: 'Export goals and progress',
    icon: 'Target',
    includedData: ['goals'],
  },
  achievements: {
    label: 'Achievements',
    description: 'Export unlocked achievements',
    icon: 'Trophy',
    includedData: ['achievements'],
  },
  platforms: {
    label: 'Platforms',
    description: 'Export platform connections',
    icon: 'Layers',
    includedData: ['platforms'],
  },
  analytics: {
    label: 'Analytics',
    description: 'Export analytics and statistics',
    icon: 'BarChart',
    includedData: ['stats', 'analytics'],
  },
  custom: {
    label: 'Custom',
    description: 'Choose what to export',
    icon: 'Settings',
    includedData: [],
  },
};

// =============================================================================
// EXPORT TEMPLATES
// =============================================================================

export const EXPORT_TEMPLATES: ExportTemplateConfig[] = [
  {
    id: 'weekly-summary',
    name: 'Weekly Summary',
    description: 'Last 7 days of activity with stats',
    type: 'full',
    format: 'pdf',
    dateRange: 'last_7_days',
    includeOptions: {
      trackerEntries: true,
      goals: true,
      achievements: true,
      platforms: false,
      stats: true,
      notes: false,
      metadata: false,
    },
    isDefault: false,
  },
  {
    id: 'monthly-report',
    name: 'Monthly Report',
    description: 'Comprehensive monthly data export',
    type: 'full',
    format: 'excel',
    dateRange: 'last_30_days',
    includeOptions: {
      trackerEntries: true,
      goals: true,
      achievements: true,
      platforms: true,
      stats: true,
      notes: true,
      metadata: true,
    },
    isDefault: true,
  },
  {
    id: 'activity-backup',
    name: 'Activity Backup',
    description: 'All tracker entries as JSON',
    type: 'tracker',
    format: 'json',
    dateRange: 'all_time',
    includeOptions: {
      trackerEntries: true,
      goals: false,
      achievements: false,
      platforms: false,
      stats: false,
      notes: true,
      metadata: true,
    },
    isDefault: false,
  },
  {
    id: 'spreadsheet-export',
    name: 'Spreadsheet Export',
    description: 'All data in CSV format',
    type: 'full',
    format: 'csv',
    dateRange: 'last_90_days',
    includeOptions: {
      trackerEntries: true,
      goals: true,
      achievements: true,
      platforms: true,
      stats: true,
      notes: true,
      metadata: false,
    },
    isDefault: false,
  },
];

// =============================================================================
// PLATFORM CATEGORIES FOR EXPORT FILTER
// =============================================================================

export const EXPORTABLE_CATEGORIES: PlatformCategory[] = [
  'DSA',
  'JOB',
  'GIT',
  'LEARNING',
  'HACKATHON',
  'OPENSOURCE',
  'COMPANY',
  'DESIGN',
  'DATA_SCIENCE',
  'OTHER',
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get format configuration */
export function getFormatConfig(format: ExportFormat): FormatConfig {
  return FORMAT_CONFIGS[format];
}

/** Get enabled formats */
export function getEnabledFormats(): ExportFormat[] {
  return (Object.keys(FORMAT_CONFIGS) as ExportFormat[])
    .filter(format => FORMAT_CONFIGS[format].enabled);
}

/** Estimate export file size */
export function estimateExportSize(recordCount: number, format: ExportFormat): number {
  const config = FORMAT_CONFIGS[format];
  return recordCount * config.estimatedBytesPerRecord;
}

/** Format file size for display */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Generate export filename */
export function generateExportFilename(
  type: ExportType,
  format: ExportFormat,
  date?: Date
): string {
  const timestamp = (date || new Date()).toISOString().split('T')[0];
  const config = FORMAT_CONFIGS[format];
  return `progresstracker-${type}-${timestamp}${config.extension}`;
}

/** Get date range from preset */
export function getDateRangeFromPreset(preset: DateRangePreset): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const start = new Date();

  const days = DATE_RANGE_PRESETS[preset].days;
  if (days === null) {
    start.setFullYear(2020, 0, 1); // All time starts from 2020
  } else {
    start.setDate(end.getDate() - days);
  }

  return { start, end };
}

/** Check if export exceeds limits */
export function exceedsExportLimits(
  recordCount: number,
  format: ExportFormat,
  userTier: 'free' | 'pro' = 'free'
): { exceeds: boolean; reason?: string } {
  const maxRecords = userTier === 'free'
    ? EXPORT_LIMITS.freeUserMaxRecords
    : EXPORT_LIMITS.proUserMaxRecords;

  if (recordCount > maxRecords) {
    return {
      exceeds: true,
      reason: `Export exceeds maximum of ${maxRecords.toLocaleString()} records for ${userTier} users`,
    };
  }

  const formatConfig = FORMAT_CONFIGS[format];
  if (recordCount > formatConfig.maxRecords) {
    return {
      exceeds: true,
      reason: `${format.toUpperCase()} format supports maximum of ${formatConfig.maxRecords.toLocaleString()} records`,
    };
  }

  const estimatedSize = estimateExportSize(recordCount, format);
  const maxSizeBytes = EXPORT_LIMITS.maxFileSizeMB * 1024 * 1024;
  if (estimatedSize > maxSizeBytes) {
    return {
      exceeds: true,
      reason: `Estimated file size exceeds ${EXPORT_LIMITS.maxFileSizeMB}MB limit`,
    };
  }

  return { exceeds: false };
}

/** Validate export configuration */
export function validateExportConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check storage configuration
  if (STORAGE_CONFIG.provider === 's3') {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      errors.push('AWS_ACCESS_KEY_ID is required for S3 storage');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      errors.push('AWS_SECRET_ACCESS_KEY is required for S3 storage');
    }
  }

  // Check if any formats are enabled
  const enabledFormats = getEnabledFormats();
  if (enabledFormats.length === 0) {
    errors.push('At least one export format must be enabled');
  }

  // Warn about limits
  if (EXPORT_LIMITS.exportRetentionDays < 1) {
    warnings.push('Export retention is less than 1 day');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// COMBINED CONFIG EXPORT
// =============================================================================

export const EXPORT_CONFIG: ExportConfig = {
  formats: FORMAT_CONFIGS,
  limits: EXPORT_LIMITS,
  storage: STORAGE_CONFIG,
  processing: PROCESSING_CONFIG,
  scheduling: SCHEDULING_CONFIG,
  templates: EXPORT_TEMPLATES,
};

export default EXPORT_CONFIG;