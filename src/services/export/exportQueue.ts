// src/services/export/exportQueue.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ExportFormat, PlatformCategory } from '@prisma/client';




const log = logger.child({ service: 'ExportQueue' });

export interface QueueExportJobInput {
  userId: string;
  format: ExportFormat;
  name?: string;
  dateFrom?: Date;
  dateTo?: Date;
  platforms?: string[];
  categories?: PlatformCategory[];

  includeNotes?: boolean;
  includeStats?: boolean;
}

export class ExportQueue {
  /**
   * Add export job to queue
   */
  static async enqueue(data: QueueExportJobInput) {
    try {
      const job = await prisma.exportJob.create({
        data: {
          userId: data.userId,
          name: data.name,
          format: data.format,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          platforms: data.platforms || [],
          categories:  data.categories || [],
          includeNotes: data.includeNotes ?? true,
          includeStats: data.includeStats ?? true,
          status: 'QUEUED',
          progress: 0,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      log.info('Export job queued', { jobId: job.id, userId: data.userId, format: data.format });

      return job;
    } catch (error) {
      log.error('Error queueing export job', { userId: data.userId }, error);
      throw error;
    }
  }

  /**
   * Get next pending job
   */
  static async getNextJob() {
    try {
      const job = await prisma.exportJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
      });

      if (job) {
        await prisma.exportJob.update({
          where: { id: job.id },
          data: { status: 'PROCESSING', startedAt: new Date() },
        });

        log.info('Export job processing', { jobId: job.id });
      }

      return job;
    } catch (error) {
      log.error('Error getting next export job', {}, error);
      throw error;
    }
  }

  /**
   * Update job progress
   */
  static async updateProgress(jobId: string, progress: number) {
    try {
      await prisma.exportJob.update({
        where: { id: jobId },
        data: { progress },
      });

      log.info('Export job progress updated', { jobId, progress });
    } catch (error) {
      log.error('Error updating export job progress', { jobId }, error);
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  static async complete(jobId: string, fileUrl: string, fileName: string, fileSize: number) {
    try {
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          fileUrl,
          fileName,
          fileSize,
        },
      });

      log.info('Export job completed', { jobId, fileName });
    } catch (error) {
      log.error('Error completing export job', { jobId }, error);
      throw error;
    }
  }

  /**
   * Mark job as failed
   */
  static async fail(jobId: string, errorMessage: string) {
    try {
      await prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          hasError: true,
          errorMessage,
          completedAt: new Date(),
        },
      });

      log.error('Export job failed', { jobId, errorMessage });
    } catch (error) {
      log.error('Error marking export job as failed', { jobId }, error);
      throw error;
    }
  }

  /**
   * Clean up expired jobs
   */
  static async cleanupExpired() {
    try {
      const result = await prisma.exportJob.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      log.info('Expired export jobs cleaned up', { count: result.count });

      return { deleted: result.count };
    } catch (error) {
      log.error('Error cleaning up expired jobs', {}, error);
      throw error;
    }
  }
}

export default ExportQueue;