/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FILE: services/fileUploadService.ts
// PURPOSE: File upload handling - storage, validation, processing
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const log = logger.child({ service: 'FileUploadService' });

// =============================================================================
// TYPES
// =============================================================================

export interface UploadOptions {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    folder?: string;
    generateThumbnail?: boolean;
    resize?: { width?: number; height?: number };
}

export interface UploadResult {
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
}

export interface ValidationRules {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface ImageProcessOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ProcessedImage {
    url: string;
    width: number;
    height: number;
    size: number;
    format: string;
}

export interface FileMetadata {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
    uploadedBy: string;
}

export interface PresignedUrl {
    url: string;
    fields: Record<string, string>;
    expiresAt: Date;
}

export interface Attachment {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    entityType: string;
    entityId: string;
}

export interface StorageUsage {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
    fileCount: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/csv'];

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const fileUploadService = {
    /**
     * Upload a file
     */
    async uploadFile(
        file: File,
        userId: string,
        options: UploadOptions = {}
    ): Promise<UploadResult> {
        try {
            const {
                maxSize = MAX_FILE_SIZE,
                allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES],
                folder = 'general',
                generateThumbnail = false,
                resize,
            } = options;

            // Validate file
            const validation = this.validateFile(file, {
                maxSize,
                allowedTypes,
            });

            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            // Generate unique filename
            const ext = path.extname(file.name);
            const filename = `${crypto.randomUUID()}${ext}`;
            const uploadPath = path.join(folder, filename);
            const fullPath = path.join(UPLOAD_DIR, uploadPath);

            // Ensure directory exists
            await mkdir(path.dirname(fullPath), { recursive: true });

            // Convert File to Buffer
            const buffer = Buffer.from(await file.arrayBuffer());

            // Process image if needed
            let processedBuffer = buffer;
            if (file.type.startsWith('image/') && resize) {
                const processed = await this.processImage(file, resize);
                processedBuffer = Buffer.from(await (await fetch(processed.url)).arrayBuffer());
            }

            // Write file
            await writeFile(fullPath, processedBuffer);

            const url = `/uploads/${uploadPath}`;
            let thumbnailUrl: string | undefined;

            // Generate thumbnail if requested
            if (generateThumbnail && file.type.startsWith('image/')) {
                const thumbnailFilename = `thumb_${filename}`;
                const thumbnailPath = path.join(folder, thumbnailFilename);
                const thumbnailFullPath = path.join(UPLOAD_DIR, thumbnailPath);

                await sharp(buffer)
                    .resize(200, 200, { fit: 'cover' })
                    .toFile(thumbnailFullPath);

                thumbnailUrl = `/uploads/${thumbnailPath}`;
            }

            log.info('File uploaded', {
                userId,
                filename,
                size: file.size,
                mimeType: file.type,
            });

            return {
                url,
                filename,
                size: file.size,
                mimeType: file.type,
                thumbnailUrl,
            };
        } catch (error) {
            log.error('Error uploading file', { userId }, error);
            throw error;
        }
    },

    /**
     * Upload user avatar
     */
    async uploadAvatar(userId: string, file: File): Promise<string> {
        try {
            // Validate it's an image
            if (!file.type.startsWith('image/')) {
                throw new Error('Avatar must be an image');
            }

            const result = await this.uploadFile(file, userId, {
                folder: 'avatars',
                maxSize: 5 * 1024 * 1024, // 5MB
                allowedTypes: ALLOWED_IMAGE_TYPES,
                resize: { width: 400, height: 400 },
                generateThumbnail: true,
            });

            // Update user avatar
            await prisma.user.update({
                where: { id: userId },
                data: { image: result.url },
            });

            log.info('Avatar uploaded', { userId, url: result.url });

            return result.url;
        } catch (error) {
            log.error('Error uploading avatar', { userId }, error);
            throw error;
        }
    },

    /**
     * Upload attachment for an entity
     */
    async uploadAttachment(
        file: File,
        userId: string,
        entityType: string,
        entityId: string
    ): Promise<Attachment> {
        try {
            const result = await this.uploadFile(file, userId, {
                folder: `attachments/${entityType}`,
            });

            // Store attachment metadata in database
            // Note: You'd need an Attachment model in your schema
            const attachment = {
                id: crypto.randomUUID(),
                filename: file.name,
                url: result.url,
                size: file.size,
                mimeType: file.type,
                entityType,
                entityId,
            };

            log.info('Attachment uploaded', {
                userId,
                entityType,
                entityId,
                filename: file.name,
            });

            return attachment;
        } catch (error) {
            log.error('Error uploading attachment', { userId, entityType, entityId }, error);
            throw error;
        }
    },

    /**
     * Generate presigned URL for direct upload
     * In production, this would generate S3 presigned URLs
     */
    async generatePresignedUrl(
        filename: string,
        contentType: string,
        userId: string
    ): Promise<PresignedUrl> {
        try {
            const uploadId = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // In production, generate S3 presigned URL
            const url = `/api/upload/direct/${uploadId}`;

            log.info('Presigned URL generated', {
                userId,
                filename,
                contentType,
                uploadId,
            });

            return {
                url,
                fields: {
                    key: `${uploadId}/${filename}`,
                    'Content-Type': contentType,
                },
                expiresAt,
            };
        } catch (error) {
            log.error('Error generating presigned URL', { userId, filename }, error);
            throw error;
        }
    },

    /**
     * Validate file against rules
     */
    validateFile(file: File, rules: ValidationRules): ValidationResult {
        const errors: string[] = [];

        // Check size
        if (rules.maxSize && file.size > rules.maxSize) {
            errors.push(`File size exceeds maximum of ${Math.round(rules.maxSize / 1024 / 1024)}MB`);
        }

        // Check MIME type
        if (rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} is not allowed`);
        }

        // Check extension
        if (rules.allowedExtensions) {
            const ext = path.extname(file.name).toLowerCase();
            if (!rules.allowedExtensions.includes(ext)) {
                errors.push(`File extension ${ext} is not allowed`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    },

    /**
     * Process image (resize, compress, format conversion)
     */
    async processImage(
        file: File,
        options: ImageProcessOptions
    ): Promise<ProcessedImage> {
        try {
            const {
                width,
                height,
                quality = 80,
                format = 'jpeg',
                fit = 'cover',
            } = options;

            const buffer = Buffer.from(await file.arrayBuffer());

            let pipeline = sharp(buffer);

            if (width || height) {
                pipeline = pipeline.resize(width, height, { fit });
            }

            if (format === 'jpeg') {
                pipeline = pipeline.jpeg({ quality });
            } else if (format === 'png') {
                pipeline = pipeline.png({ quality });
            } else if (format === 'webp') {
                pipeline = pipeline.webp({ quality });
            }

            const processed = await pipeline.toBuffer();
            const metadata = await sharp(processed).metadata();

            // Save processed image
            const filename = `${crypto.randomUUID()}.${format}`;
            const uploadPath = path.join('processed', filename);
            const fullPath = path.join(UPLOAD_DIR, uploadPath);

            await mkdir(path.dirname(fullPath), { recursive: true });
            await writeFile(fullPath, processed);

            return {
                url: `/uploads/${uploadPath}`,
                width: metadata.width || 0,
                height: metadata.height || 0,
                size: processed.length,
                format: metadata.format || format,
            };
        } catch (error) {
            log.error('Error processing image', {}, error);
            throw error;
        }
    },

    /**
     * Delete file
     */
    async deleteFile(fileUrl: string): Promise<void> {
        try {
            // Extract path from URL
            const filePath = fileUrl.replace('/uploads/', '');
            const fullPath = path.join(UPLOAD_DIR, filePath);

            await unlink(fullPath);

            log.info('File deleted', { fileUrl });
        } catch (error) {
            log.error('Error deleting file', { fileUrl }, error);
            // Don't throw - file might not exist
        }
    },

    /**
     * Get file metadata
     */
    async getFileMetadata(fileUrl: string): Promise<FileMetadata | null> {
        try {
            // In production, this would query from database or S3
            // For now, return mock data
            return {
                filename: path.basename(fileUrl),
                size: 0,
                mimeType: 'application/octet-stream',
                uploadedAt: new Date(),
                uploadedBy: 'unknown',
            };
        } catch (error) {
            log.error('Error getting file metadata', { fileUrl }, error);
            return null;
        }
    },

    /**
     * List user's uploaded files
     */
    async listUserFiles(
        userId: string,
        options: { limit?: number; offset?: number; type?: string } = {}
    ): Promise<FileMetadata[]> {
        try {
            // In production, query from database
            // For now, return empty array
            return [];
        } catch (error) {
            log.error('Error listing user files', { userId }, error);
            return [];
        }
    },

    /**
     * Cleanup orphaned files (files not referenced in database)
     */
    async cleanupOrphanedFiles(): Promise<{ deleted: number; freed: number }> {
        try {
            // In production, scan uploads directory and compare with database
            log.info('Cleanup orphaned files completed', { deleted: 0, freed: 0 });

            return {
                deleted: 0,
                freed: 0,
            };
        } catch (error) {
            log.error('Error cleaning up orphaned files', {}, error);
            return { deleted: 0, freed: 0 };
        }
    },

    /**
     * Get storage usage for user
     */
    async getStorageUsage(userId: string): Promise<StorageUsage> {
        try {
            // In production, sum file sizes from database
            const storageLimit = 1024 * 1024 * 1024; // 1GB
            const used = 0;

            return {
                total: storageLimit,
                used,
                remaining: storageLimit - used,
                percentage: (used / storageLimit) * 100,
                fileCount: 0,
            };
        } catch (error) {
            log.error('Error getting storage usage', { userId }, error);
            throw error;
        }
    },
};

export default fileUploadService;
