/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FILE: services/fileUploadService.ts
// PURPOSE: File upload handling - storage, validation, processing
// ============================================================================

import 'server-only';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import { s3Client, R2_BUCKET_NAME, isR2Configured } from '@/lib/s3';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { validateFile, type ValidationRules, type ValidationResult } from './fileValidation';

const log = logger.child({ service: 'FileUploadService' });

// =============================================================================
// TYPES
// =============================================================================

export interface UploadOptions {
    maxSize?: number;
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

export type { ValidationRules, ValidationResult };
export { validateFile };

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

// Use UPLOAD_DIR env var if set, otherwise resolve statically at module load time.
// The /*turbopackIgnore: true*/ comment prevents Turbopack from tracing
// filesystem operations originating from this path, avoiding the
// "matches 10369 files" and NFT whole-project warnings.
const UPLOAD_BASE_DIR: string = process.env.UPLOAD_DIR
    ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/csv'];

// =============================================================================
// HELPERS — centralise all path construction here so Turbopack only sees
// joins rooted at the statically-ignored UPLOAD_BASE_DIR constant.
// =============================================================================

/**
 * Build an absolute filesystem path under UPLOAD_BASE_DIR.
 * All path.join calls that touch UPLOAD_BASE_DIR must go through here
 * so Turbopack's static analyser sees a single, narrow pattern.
 */
function toAbsPath(...segments: string[]): string {
    // turbopackIgnore keeps Turbopack from expanding UPLOAD_BASE_DIR
    // into a glob that matches thousands of project files.
    return path.join(/*turbopackIgnore: true*/ UPLOAD_BASE_DIR, ...segments);
}

/**
 * Build the public URL path for a local upload.
 * Kept separate so we never accidentally expose the absolute FS path.
 */
function toPublicUrl(...segments: string[]): string {
    return '/uploads/' + segments.join('/');
}

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const fileUploadService = {
    /**
     * Upload a file to R2 or local storage.
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
            const validation = this.validateFile(file, { maxSize, allowedTypes });
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }

            // Generate unique filename
            const ext = path.extname(file.name);
            const filename = `${crypto.randomUUID()}${ext}`;

            // Convert File to Buffer
            const buffer = Buffer.from(await file.arrayBuffer());

            // Optionally resize
            let processedBuffer = buffer;
            if (file.type.startsWith('image/') && resize) {
                const processed = await this.processImage(file, resize);
                processedBuffer = Buffer.from(
                    await (await fetch(processed.url)).arrayBuffer()
                );
            }

            let url = '';
            let thumbnailUrl: string | undefined;

            if (isR2Configured) {
                // ── R2 upload ──────────────────────────────────────────────
                // R2 key is a simple string join — no filesystem tracing involved.
                const r2Key = `${folder}/${filename}`;

                await s3Client.send(new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: r2Key,
                    Body: processedBuffer,
                    ContentType: file.type,
                }));

                const publicDomain =
                    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
                    process.env.R2_ENDPOINT?.replace('https://', 'https://pub-');

                url = `${publicDomain}/${r2Key}`;

                if (generateThumbnail && file.type.startsWith('image/')) {
                    const thumbKey = `${folder}/thumb_${filename}`;

                    const thumbnailBuffer = await sharp(buffer)
                        .resize(200, 200, { fit: 'cover' })
                        .toBuffer();

                    await s3Client.send(new PutObjectCommand({
                        Bucket: R2_BUCKET_NAME,
                        Key: thumbKey,
                        Body: thumbnailBuffer,
                        ContentType: file.type,
                    }));

                    thumbnailUrl = `${publicDomain}/${thumbKey}`;
                }
            } else {
                // ── Local storage ──────────────────────────────────────────
                // All absolute paths go through toAbsPath() which carries
                // the turbopackIgnore annotation on UPLOAD_BASE_DIR.
                const fullPath = toAbsPath(folder, filename);

                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, processedBuffer);

                url = toPublicUrl(folder, filename);

                if (generateThumbnail && file.type.startsWith('image/')) {
                    const thumbFilename = `thumb_${filename}`;
                    const thumbFullPath = toAbsPath(folder, thumbFilename);

                    await sharp(buffer)
                        .resize(200, 200, { fit: 'cover' })
                        .toFile(thumbFullPath);

                    thumbnailUrl = toPublicUrl(folder, thumbFilename);
                }
            }

            log.info('File uploaded', {
                userId,
                filename,
                size: file.size,
                mimeType: file.type,
                storage: isR2Configured ? 'R2' : 'local',
            });

            return { url, filename, size: file.size, mimeType: file.type, thumbnailUrl };
        } catch (error) {
            log.error('Error uploading file', { userId }, error);
            throw error;
        }
    },

    /**
     * Upload user avatar and persist the URL to the database.
     */
    async uploadAvatar(userId: string, file: File): Promise<string> {
        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('Avatar must be an image');
            }

            const result = await this.uploadFile(file, userId, {
                folder: 'avatars',
                maxSize: 5 * 1024 * 1024,
                allowedTypes: ALLOWED_IMAGE_TYPES,
                resize: { width: 400, height: 400 },
                generateThumbnail: true,
            });

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
     * Upload an attachment and return its metadata.
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

            const attachment: Attachment = {
                id: crypto.randomUUID(),
                filename: file.name,
                url: result.url,
                size: file.size,
                mimeType: file.type,
                entityType,
                entityId,
            };

            log.info('Attachment uploaded', { userId, entityType, entityId, filename: file.name });
            return attachment;
        } catch (error) {
            log.error('Error uploading attachment', { userId, entityType, entityId }, error);
            throw error;
        }
    },

    /**
     * Generate a presigned URL for direct client-side upload.
     */
    async generatePresignedUrl(
        filename: string,
        contentType: string,
        userId: string
    ): Promise<PresignedUrl> {
        try {
            const uploadId = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            const url = `/api/upload/direct/${uploadId}`;

            log.info('Presigned URL generated', { userId, filename, contentType, uploadId });

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
     * Validate a file against the given rules.
     */
    validateFile(file: File, rules: ValidationRules): ValidationResult {
        return validateFile(file, rules);
    },

    /**
     * Resize / reformat an image and save it locally.
     */
    async processImage(file: File, options: ImageProcessOptions): Promise<ProcessedImage> {
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

            const filename = `${crypto.randomUUID()}.${format}`;

            // Use toAbsPath so all local FS joins share the same turbopackIgnore root.
            const fullPath = toAbsPath('processed', filename);

            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, processed);

            return {
                url: toPublicUrl('processed', filename),
                width: metadata.width ?? 0,
                height: metadata.height ?? 0,
                size: processed.length,
                format: metadata.format ?? format,
            };
        } catch (error) {
            log.error('Error processing image', {}, error);
            throw error;
        }
    },

    /**
     * Delete a file from R2 or local storage.
     */
    async deleteFile(fileUrl: string): Promise<void> {
        try {
            if (isR2Configured && !fileUrl.startsWith('/uploads/')) {
                const publicDomain =
                    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
                    process.env.R2_ENDPOINT?.replace('https://', 'https://pub-');

                const key = fileUrl.replace(`${publicDomain}/`, '');

                await s3Client.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: key,
                }));
            } else {
                // Strip the leading /uploads/ prefix, then resolve via toAbsPath.
                const relativePath = fileUrl.replace(/^\/uploads\//, '');
                const fullPath = toAbsPath(relativePath);
                await fs.unlink(fullPath);
            }

            log.info('File deleted', { fileUrl, storage: isR2Configured ? 'R2' : 'local' });
        } catch (error) {
            log.error('Error deleting file', { fileUrl }, error);
            // Don't throw — file may already be gone
        }
    },

    /**
     * Return basic metadata for a file URL.
     */
    async getFileMetadata(fileUrl: string): Promise<FileMetadata | null> {
        try {
            return {
                filename: fileUrl.split('/').pop() ?? fileUrl,
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
     * List files uploaded by a user (stub — replace with DB query).
     */
    async listUserFiles(
        userId: string,
        options: { limit?: number; offset?: number; type?: string } = {}
    ): Promise<FileMetadata[]> {
        try {
            return [];
        } catch (error) {
            log.error('Error listing user files', { userId }, error);
            return [];
        }
    },

    /**
     * Remove files that are no longer referenced in the database (stub).
     */
    async cleanupOrphanedFiles(): Promise<{ deleted: number; freed: number }> {
        try {
            log.info('Cleanup orphaned files completed', { deleted: 0, freed: 0 });
            return { deleted: 0, freed: 0 };
        } catch (error) {
            log.error('Error cleaning up orphaned files', {}, error);
            return { deleted: 0, freed: 0 };
        }
    },

    /**
     * Return storage quota information for a user (stub — replace with DB query).
     */
    async getStorageUsage(userId: string): Promise<StorageUsage> {
        try {
            const storageLimit = 1024 * 1024 * 1024; // 1 GB
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