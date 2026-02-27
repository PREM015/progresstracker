
// src/services/featureFlagService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SubscriptionTier, Prisma } from '@prisma/client';

const log = logger.child({ service: 'FeatureFlagService' });

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
  enabledForAll?: boolean;
  enabledUserIds?: string[];
  enabledTiers?: SubscriptionTier[];
  enabledPercentage?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  enabledForAll?: boolean;
  enabledUserIds?: string[];
  enabledTiers?: SubscriptionTier[];
  enabledPercentage?: number;
  metadata?: Record<string, unknown>;
}

class FeatureFlagService {
  /**
   * Create feature flag
   */
  async create(data: CreateFeatureFlagInput) {
    try {
      const existing = await prisma.featureFlag.findUnique({
        where: { key: data.key },
      });

      if (existing) {
        throw new Error('Feature flag with this key already exists');
      }

      const flag = await prisma.featureFlag.create({
        data: {
          key: data.key,
          name: data.name,
          description: data.description,
          isEnabled: data.isEnabled || false,
          enabledForAll: data.enabledForAll || false,
          enabledUserIds: data.enabledUserIds || [],
          enabledTiers: data.enabledTiers || [],
          enabledPercentage: data.enabledPercentage || 0,
          metadata: data.metadata as Prisma.InputJsonValue,
        },
      });

      log.info('Feature flag created', { key: data.key });

      return flag;
    } catch (error) {
      log.error('Error creating feature flag', { key: data.key }, error);
      throw error;
    }
  }

  /**
   * Get all feature flags
   */
  async getAll() {
    try {
      const flags = await prisma.featureFlag.findMany({
        orderBy: { key: 'asc' },
      });

      log.info('Feature flags fetched', { count: flags.length });

      return flags;
    } catch (error) {
      log.error('Error fetching feature flags', {}, error);
      throw error;
    }
  }

  /**
   * Get feature flag by key
   */
  async getByKey(key: string) {
    try {
      const flag = await prisma.featureFlag.findUnique({
        where: { key },
      });

      if (flag) {
        log.info('Feature flag fetched', { key });
      }

      return flag;
    } catch (error) {
      log.error('Error fetching feature flag', { key }, error);
      throw error;
    }
  }

  /**
   * Check if feature is enabled for user
   */
  async isEnabled(key: string, userId?: string, tier?: SubscriptionTier): Promise<boolean> {
    try {
      const flag = await prisma.featureFlag.findUnique({
        where: { key },
      });

      if (!flag || !flag.isEnabled) {
        return false;
      }

      if (flag.enabledForAll) {
        return true;
      }

      if (userId && flag.enabledUserIds.includes(userId)) {
        return true;
      }

      if (tier && flag.enabledTiers.includes(tier)) {
        return true;
      }

      if (flag.enabledPercentage > 0 && userId) {
        const hash = this.hashUserId(userId);
        const percentage = (hash % 100) + 1;
        if (percentage <= flag.enabledPercentage) {
          return true;
        }
      }

      return false;
    } catch (error) {
      log.error('Error checking feature flag', { key, userId }, error);
      return false;
    }
  }

  /**
   * Update feature flag
   */
  async update(key: string, data: UpdateFeatureFlagInput) {
    try {
      const updateData: Prisma.FeatureFlagUpdateInput= {
        ...data,
        updatedAt: new Date(), 
        metadata: data.metadata ? (data.metadata as unknown as Prisma.InputJsonValue) : undefined,
      };

      if (data.metadata) {
        updateData.metadata = data.metadata as Prisma.InputJsonValue;
      }

      const flag = await prisma.featureFlag.update({
        where: { key },
        data: updateData,
      });

      log.info('Feature flag updated', { key });

      return flag;
    } catch (error) {
      log.error('Error updating feature flag', { key }, error);
      throw error;
    }
  }

  /**
   * Delete feature flag
   */
  async delete(key: string) {
    try {
      await prisma.featureFlag.delete({
        where: { key },
      });

      log.info('Feature flag deleted', { key });

      return { deleted: true };
    } catch (error) {
      log.error('Error deleting feature flag', { key }, error);
      throw error;
    }
  }

  /**
   * Enable feature flag
   */
  async enable(key: string) {
    try {
      const flag = await prisma.featureFlag.update({
        where: { key },
        data: { isEnabled: true },
      });

      log.info('Feature flag enabled', { key });

      return flag;
    } catch (error) {
      log.error('Error enabling feature flag', { key }, error);
      throw error;
    }
  }

  /**
   * Disable feature flag
   */
  async disable(key: string) {
    try {
      const flag = await prisma.featureFlag.update({
        where: { key },
        data: { isEnabled: false },
      });

      log.info('Feature flag disabled', { key });

      return flag;
    } catch (error) {
      log.error('Error disabling feature flag', { key }, error);
      throw error;
    }
  }

  /**
   * Get enabled features for user
   */
  async getEnabledFeatures(userId: string, tier?: SubscriptionTier): Promise<string[]> {
    try {
      const flags = await prisma.featureFlag.findMany({
        where: { isEnabled: true },
      });

      const enabled: string[] = [];

      for (const flag of flags) {
        if (await this.isEnabled(flag.key, userId, tier)) {
          enabled.push(flag.key);
        }
      }

      log.info('Enabled features fetched', { userId, count: enabled.length });

      return enabled;
    } catch (error) {
      log.error('Error fetching enabled features', { userId }, error);
      return [];
    }
  }

  /**
   * Hash user ID for percentage rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const featureFlagService = new FeatureFlagService();
export default featureFlagService;