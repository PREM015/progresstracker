// ============================================================================
// FILE: src/config/upload.ts
// PURPOSE: File upload configuration
// ============================================================================

// =============================================================================
// ENVIRONMENT
// =============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface UploadConfig {
  storage: StorageProviderConfig;
  limits: UploadLimits;
  types: FileTypeConfigs;
  processing: ProcessingConfig;
  security: SecurityConfig;
  paths: PathConfig;
}

export interface StorageProviderConfig {
  provider: 'local' | 's3' | 'cloudflare' | 'vercel';
  s3: S3Config;
  cloudflare: CloudflareConfig;
  local: LocalConfig;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  signedUrlExpiry: number;
  accelerateEndpoint: boolean;
}

export interface CloudflareConfig {
  accountId: string | undefined;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  bucket: string;
  publicUrl: string | undefined;
}

export interface LocalConfig {
  uploadDir: string;
  publicPath: string;
  tempDir: string;
}

export interface UploadLimits {
  maxFileSize: number;
  maxFileSizeByType: Record<string, number>;
  maxFilesPerUpload: number;
  maxFilesPerUser: number;
  maxTotalStoragePerUser: number;
  maxConcurrentUploads: number;
}

export interface FileTypeConfig {
  enabled: boolean;
  extensions: string[];
  mimeTypes: string[];
  maxSize: number;
  processable: boolean;
  requireAuth: boolean;
  allowedFor: ('avatar' | 'attachment' | 'document' | 'import' | 'general')[];
}

export type FileTypeConfigs = Record<string, FileTypeConfig>;

export interface ProcessingConfig {
  images: ImageProcessingConfig;
  documents: DocumentProcessingConfig;
}

export interface ImageProcessingConfig {
  enabled: boolean;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  thumbnails: ThumbnailConfig[];
  stripMetadata: boolean;
}

export interface ThumbnailConfig {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface DocumentProcessingConfig {
  enabled: boolean;
  extractText: boolean;
  generatePreview: boolean;
  maxPages: number;
}

export interface SecurityConfig {
  scanForViruses: boolean;
  validateMimeType: boolean;
  validateContent: boolean;
  sanitizeFilenames: boolean;
  randomizeFilenames: boolean;
  blockedExtensions: string[];
  blockedMimeTypes: string[];
}

export interface PathConfig {
  avatars: string;
  attachments: string;
  documents: string;
  imports: string;
  exports: string;
  temp: string;
}

// =============================================================================
// STORAGE PROVIDER CONFIGURATION
// =============================================================================

export const STORAGE_PROVIDER = (
  process.env.UPLOAD_STORAGE_PROVIDER ||
  (IS_PRODUCTION ? 's3' : 'local')
) as 'local' | 's3' | 'cloudflare' | 'vercel';

export const S3_CONFIG: S3Config = {
  bucket: process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || 'progresstracker-uploads',
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  signedUrlExpiry: parseInt(process.env.S3_SIGNED_URL_EXPIRY || '3600', 10), // 1 hour
  accelerateEndpoint: process.env.S3_ACCELERATE === 'true',
};

export const CLOUDFLARE_CONFIG: CloudflareConfig = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  bucket: process.env.CLOUDFLARE_R2_BUCKET || 'progresstracker-uploads',
  publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
};

export const LOCAL_CONFIG: LocalConfig = {
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  publicPath: '/uploads',
  tempDir: process.env.TEMP_DIR || './uploads/temp',
};

export const STORAGE_CONFIG: StorageProviderConfig = {
  provider: STORAGE_PROVIDER,
  s3: S3_CONFIG,
  cloudflare: CLOUDFLARE_CONFIG,
  local: LOCAL_CONFIG,
};

// =============================================================================
// UPLOAD LIMITS
// =============================================================================

export const UPLOAD_LIMITS: UploadLimits = {
  /** Maximum file size in bytes (10MB) */
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),

  /** Maximum file size by type */
  maxFileSizeByType: {
    avatar: 5 * 1024 * 1024,      // 5MB
    image: 10 * 1024 * 1024,      // 10MB
    document: 25 * 1024 * 1024,   // 25MB
    import: 50 * 1024 * 1024,     // 50MB
    attachment: 10 * 1024 * 1024, // 10MB
  },

  /** Maximum files per single upload request */
  maxFilesPerUpload: 10,

  /** Maximum files per user (total) */
  maxFilesPerUser: 1000,

  /** Maximum total storage per user (1GB) */
  maxTotalStoragePerUser: 1024 * 1024 * 1024,

  /** Maximum concurrent uploads */
  maxConcurrentUploads: 5,
};

// =============================================================================
// FILE TYPE CONFIGURATIONS
// =============================================================================

export const FILE_TYPE_CONFIGS: FileTypeConfigs = {
  // Images
  image: {
    enabled: true,
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/svg+xml',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    processable: true,
    requireAuth: false,
    allowedFor: ['avatar', 'attachment', 'general'],
  },

  // Documents
  document: {
    enabled: true,
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    processable: true,
    requireAuth: true,
    allowedFor: ['document', 'attachment'],
  },

  // Spreadsheets
  spreadsheet: {
    enabled: true,
    extensions: ['.csv', '.xls', '.xlsx', '.ods'],
    mimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    processable: false,
    requireAuth: true,
    allowedFor: ['import', 'document', 'attachment'],
  },

  // JSON (for imports)
  json: {
    enabled: true,
    extensions: ['.json'],
    mimeTypes: ['application/json'],
    maxSize: 50 * 1024 * 1024, // 50MB
    processable: false,
    requireAuth: true,
    allowedFor: ['import'],
  },

  // Archives
  archive: {
    enabled: true,
    extensions: ['.zip', '.tar', '.gz', '.7z'],
    mimeTypes: [
      'application/zip',
      'application/x-tar',
      'application/gzip',
      'application/x-7z-compressed',
    ],
    maxSize: 100 * 1024 * 1024, // 100MB
    processable: false,
    requireAuth: true,
    allowedFor: ['import', 'attachment'],
  },
};

// =============================================================================
// IMAGE PROCESSING CONFIGURATION
// =============================================================================

export const IMAGE_PROCESSING_CONFIG: ImageProcessingConfig = {
  /** Enable image processing */
  enabled: true,

  /** Maximum width for uploaded images */
  maxWidth: 4096,

  /** Maximum height for uploaded images */
  maxHeight: 4096,

  /** JPEG quality (0-100) */
  quality: 85,

  /** Output format */
  format: 'webp',

  /** Thumbnail configurations */
  thumbnails: [
    { name: 'xs', width: 50, height: 50, fit: 'cover' },
    { name: 'sm', width: 100, height: 100, fit: 'cover' },
    { name: 'md', width: 300, height: 300, fit: 'cover' },
    { name: 'lg', width: 600, height: 600, fit: 'cover' },
  ],

  /** Strip EXIF and other metadata */
  stripMetadata: true,
};

export const DOCUMENT_PROCESSING_CONFIG: DocumentProcessingConfig = {
  /** Enable document processing */
  enabled: false,

  /** Extract text from documents */
  extractText: false,

  /** Generate preview images */
  generatePreview: false,

  /** Maximum pages to process */
  maxPages: 50,
};

export const PROCESSING_CONFIG: ProcessingConfig = {
  images: IMAGE_PROCESSING_CONFIG,
  documents: DOCUMENT_PROCESSING_CONFIG,
};

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export const SECURITY_CONFIG: SecurityConfig = {
  /** Scan uploaded files for viruses */
  scanForViruses: IS_PRODUCTION && process.env.VIRUS_SCAN_ENABLED === 'true',

  /** Validate MIME type matches extension */
  validateMimeType: true,

  /** Validate file content matches MIME type */
  validateContent: true,

  /** Sanitize filenames (remove special chars) */
  sanitizeFilenames: true,

  /** Randomize filenames */
  randomizeFilenames: true,

  /** Blocked file extensions */
  blockedExtensions: [
    '.exe', '.dll', '.bat', '.cmd', '.sh', '.bash',
    '.ps1', '.vbs', '.js', '.jsx', '.ts', '.tsx',
    '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl',
    '.py', '.rb', '.jar', '.war', '.msi', '.dmg',
    '.app', '.scr', '.pif', '.com', '.hta', '.htaccess',
  ],

  /** Blocked MIME types */
  blockedMimeTypes: [
    'application/x-msdownload',
    'application/x-executable',
    'application/x-dosexec',
    'application/x-msdos-program',
    'text/x-php',
    'application/x-php',
    'application/x-httpd-php',
    'application/x-sh',
    'application/x-shellscript',
  ],
};

// =============================================================================
// PATH CONFIGURATION
// =============================================================================

export const PATH_CONFIG: PathConfig = {
  avatars: 'avatars',
  attachments: 'attachments',
  documents: 'documents',
  imports: 'imports',
  exports: 'exports',
  temp: 'temp',
};

// =============================================================================
// AVATAR CONFIGURATION
// =============================================================================

export const AVATAR_CONFIG = {
  /** Maximum avatar file size (5MB) */
  maxSize: 5 * 1024 * 1024,

  /** Allowed extensions */
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],

  /** Allowed MIME types */
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

  /** Output dimensions */
  dimensions: {
    width: 256,
    height: 256,
  },

  /** Output format */
  format: 'webp' as const,

  /** Quality */
  quality: 90,

  /** Default avatar URL */
  defaultUrl: '/images/default-avatar.png',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get file type config by extension */
export function getFileTypeByExtension(extension: string): FileTypeConfig | undefined {
  const ext = extension.toLowerCase();
  for (const [, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (config.extensions.includes(ext)) {
      return config;
    }
  }
  return undefined;
}

/** Get file type config by MIME type */
export function getFileTypeByMime(mimeType: string): FileTypeConfig | undefined {
  for (const [, config] of Object.entries(FILE_TYPE_CONFIGS)) {
    if (config.mimeTypes.includes(mimeType)) {
      return config;
    }
  }
  return undefined;
}

/** Check if file extension is allowed */
export function isExtensionAllowed(extension: string): boolean {
  const ext = extension.toLowerCase();
  if (SECURITY_CONFIG.blockedExtensions.includes(ext)) {
    return false;
  }
  return getFileTypeByExtension(ext) !== undefined;
}

/** Check if MIME type is allowed */
export function isMimeTypeAllowed(mimeType: string): boolean {
  if (SECURITY_CONFIG.blockedMimeTypes.includes(mimeType)) {
    return false;
  }
  return getFileTypeByMime(mimeType) !== undefined;
}

/** Get max file size for type */
export function getMaxFileSize(
  fileType: keyof typeof UPLOAD_LIMITS.maxFileSizeByType
): number {
  return UPLOAD_LIMITS.maxFileSizeByType[fileType] || UPLOAD_LIMITS.maxFileSize;
}

/** Sanitize filename */
export function sanitizeFilename(filename: string): string {
  if (!SECURITY_CONFIG.sanitizeFilenames) return filename;

  // Remove path separators and null bytes
  let sanitized = filename.replace(/[/\\:\0]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Replace special characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, maxLength - ext.length) + ext;
  }

  return sanitized || 'unnamed';
}

/** Generate unique filename */
export function generateUniqueFilename(originalFilename: string): string {
  if (!SECURITY_CONFIG.randomizeFilenames) {
    return sanitizeFilename(originalFilename);
  }

  const ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}${ext}`;
}

/** Get storage path */
export function getStoragePath(type: keyof PathConfig, filename: string): string {
  const basePath = PATH_CONFIG[type];
  const datePath = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  return `${basePath}/${datePath}/${filename}`;
}

/** Get public URL for file */
export function getPublicUrl(path: string): string {
  switch (STORAGE_PROVIDER) {
    case 's3':
      return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com/${path}`;
    case 'cloudflare':
      return `${CLOUDFLARE_CONFIG.publicUrl}/${path}`;
    case 'local':
      return `${LOCAL_CONFIG.publicPath}/${path}`;
    default:
      return path;
  }
}

/** Validate upload configuration */
export function validateUploadConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check storage provider configuration
  if (STORAGE_PROVIDER === 's3') {
    if (!S3_CONFIG.accessKeyId) errors.push('AWS_ACCESS_KEY_ID is required for S3');
    if (!S3_CONFIG.secretAccessKey) errors.push('AWS_SECRET_ACCESS_KEY is required for S3');
  }

  if (STORAGE_PROVIDER === 'cloudflare') {
    if (!CLOUDFLARE_CONFIG.accountId) errors.push('CLOUDFLARE_ACCOUNT_ID is required');
    if (!CLOUDFLARE_CONFIG.accessKeyId) errors.push('CLOUDFLARE_ACCESS_KEY_ID is required');
  }

  // Check limits
  if (UPLOAD_LIMITS.maxFileSize > 100 * 1024 * 1024) {
    warnings.push('Max file size is very large (>100MB)');
  }

  // Check virus scanning
  if (IS_PRODUCTION && !SECURITY_CONFIG.scanForViruses) {
    warnings.push('Virus scanning is disabled in production');
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

export const UPLOAD_CONFIG: UploadConfig = {
  storage: STORAGE_CONFIG,
  limits: UPLOAD_LIMITS,
  types: FILE_TYPE_CONFIGS,
  processing: PROCESSING_CONFIG,
  security: SECURITY_CONFIG,
  paths: PATH_CONFIG,
};

export default UPLOAD_CONFIG;