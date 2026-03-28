// src/lib/upload.ts
// File upload utilities (client-safe)

// =============================================================================
// TYPES
// =============================================================================

export type UploadAccept = 'image' | 'document' | 'any';
export type UploadDestination = 'avatars' | 'covers' | 'attachments' | 'exports' | 'blog' | 'temp';

export interface UploadConfig {
  destination: UploadDestination;
  accept: UploadAccept;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  maxFiles?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ValidateFileResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const UPLOAD_CONFIGS: Record<UploadDestination, UploadConfig> = {
  avatars: {
    destination: 'avatars',
    accept: 'image',
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles: 1,
  },
  covers: {
    destination: 'covers',
    accept: 'image',
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: 1,
  },
  attachments: {
    destination: 'attachments',
    accept: 'any',
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain', 'text/csv',
      'application/zip',
    ],
    maxFiles: 5,
  },
  exports: {
    destination: 'exports',
    accept: 'document',
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/pdf', 'text/csv', 'application/json', 'application/vnd.ms-excel'],
    maxFiles: 1,
  },
  blog: {
    destination: 'blog',
    accept: 'image',
    maxSizeBytes: 8 * 1024 * 1024, // 8MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
    maxFiles: 10,
  },
  temp: {
    destination: 'temp',
    accept: 'any',
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['*/*'],
    maxFiles: 1,
  },
};

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a file against upload configuration.
 */
export function validateFile(file: File, config: UploadConfig): ValidateFileResult {
  if (file.size > config.maxSizeBytes) {
    const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File is too large. Maximum size is ${maxMb}MB.` };
  }

  if (!config.allowedMimeTypes.includes('*/*')) {
    const isAllowed = config.allowedMimeTypes.some((mime) => {
      if (mime.endsWith('/*')) {
        return file.type.startsWith(mime.replace('/*', '/'));
      }
      return file.type === mime;
    });

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed. Accepted types: ${config.allowedMimeTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate multiple files.
 */
export function validateFiles(files: File[], config: UploadConfig): ValidateFileResult {
  if (config.maxFiles && files.length > config.maxFiles) {
    return { valid: false, error: `Too many files. Maximum is ${config.maxFiles}.` };
  }

  for (const file of files) {
    const result = validateFile(file, config);
    if (!result.valid) return result;
  }

  return { valid: true };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate accept string for <input type="file" accept="...">
 */
export function getInputAcceptString(config: UploadConfig): string {
  return config.allowedMimeTypes.join(',');
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file extension from filename.
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Generate a unique filename.
 */
export function generateFileName(original: string, prefix?: string): string {
  const ext = getFileExtension(original);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const base = prefix ? `${prefix}_` : '';
  return `${base}${timestamp}_${random}.${ext}`;
}

/**
 * Check if a file is an image.
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
