// src/services/changelogService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const log = logger.child({ service: 'ChangelogService' });

export interface CreateChangelogInput {
  version: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'bugfix' | 'security';
  changes: Array<{
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
    description: string;
  }>;
  isPublished?: boolean;
}

export interface UpdateChangelogInput {
  version?: string;
  title?: string;
  description?: string;
  type?: 'feature' | 'improvement' | 'bugfix' | 'security';
  changes?: Array<{
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
    description: string;
  }>;
  isPublished?: boolean;
}

class ChangelogService {
  /**
   * Create changelog entry
   */
  async create(data: CreateChangelogInput) {
    try {
      const existing = await prisma.changelogEntry.findFirst({
        where: { version: data.version },
      });

      if (existing) {
        throw new Error('Changelog entry for this version already exists');
      }

      const entry = await prisma.changelogEntry.create({
        data: {
          version: data.version,
          title: data.title,
          description: data.description,
          type: data.type,
          changes: data.changes as Prisma.InputJsonValue,
          isPublished: data.isPublished || false,
          publishedAt: data.isPublished ? new Date() : null,
        },
      });

      log.info('Changelog entry created', { id: entry.id, version: data.version });

      return entry;
    } catch (error) {
      log.error('Error creating changelog entry', { version: data.version }, error);
      throw error;
    }
  }

  /**
   * Get all changelog entries
   */
  async getAll(includeUnpublished: boolean = false) {
    try {
      const where: Prisma.ChangelogEntryWhereInput = {};

      if (!includeUnpublished) {
        where.isPublished = true;
      }

      const entries = await prisma.changelogEntry.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
      });

      log.info('Changelog entries fetched', { count: entries.length });

      return entries;
    } catch (error) {
      log.error('Error fetching changelog entries', {}, error);
      throw error;
    }
  }

  /**
   * Get changelog entry by version
   */
  async getByVersion(version: string) {
    try {
      const entry = await prisma.changelogEntry.findFirst({
        where: { version },
      });

      if (entry) {
        log.info('Changelog entry fetched', { version });
      }

      return entry;
    } catch (error) {
      log.error('Error fetching changelog entry', { version }, error);
      throw error;
    }
  }

  /**
   * Get latest published changelog
   */
  async getLatest() {
    try {
      const entry = await prisma.changelogEntry.findFirst({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
      });

      if (entry) {
        log.info('Latest changelog fetched', { version: entry.version });
      }

      return entry;
    } catch (error) {
      log.error('Error fetching latest changelog', {}, error);
      throw error;
    }
  }

  /**
   * Update changelog entry
   */
  async update(id: string, data: UpdateChangelogInput) {
    try {
      const updateData: Prisma.ChangelogEntryUpdateInput = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.changes) {
        updateData.changes = data.changes as Prisma.InputJsonValue;
      }

      if (data.isPublished === true) {
        const current = await prisma.changelogEntry.findUnique({
          where: { id },
          select: { publishedAt: true },
        });

        if (!current?.publishedAt) {
          updateData.publishedAt = new Date();
        }
      }

      const entry = await prisma.changelogEntry.update({
        where: { id },
        data: updateData,
      });

      log.info('Changelog entry updated', { id, version: entry.version });

      return entry;
    } catch (error) {
      log.error('Error updating changelog entry', { id }, error);
      throw error;
    }
  }

  /**
   * Delete changelog entry
   */
  async delete(id: string) {
    try {
      await prisma.changelogEntry.delete({
        where: { id },
      });

      log.info('Changelog entry deleted', { id });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting changelog entry', { id }, error);
      throw error;
    }
  }

  /**
   * Publish changelog entry
   */
  async publish(id: string) {
    try {
      const entry = await prisma.changelogEntry.update({
        where: { id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
        },
      });

      log.info('Changelog entry published', { id, version: entry.version });

      return entry;
    } catch (error) {
      log.error('Error publishing changelog entry', { id }, error);
      throw error;
    }
  }

  /**
   * Unpublish changelog entry
   */
  async unpublish(id: string) {
    try {
      const entry = await prisma.changelogEntry.update({
        where: { id },
        data: {
          isPublished: false,
        },
      });

      log.info('Changelog entry unpublished', { id, version: entry.version });

      return entry;
    } catch (error) {
      log.error('Error unpublishing changelog entry', { id }, error);
      throw error;
    }
  }
}

export const changelogService = new ChangelogService();
export default changelogService;