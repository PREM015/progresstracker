/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/sync/webhookHandler.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SyncQueue } from './syncQueue';
import crypto from 'crypto';

const log = logger.child({ service: 'WebhookHandler' });

export interface WebhookPayload {
  platform: 'github' | 'gitlab' | 'bitbucket';
  event: string;
  data: any;
  signature?: string;
  timestamp?: string;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  syncTriggered?: boolean;
  syncLogId?: string;
}

export class WebhookHandler {
  /**
   * Handle incoming webhook
   */
  static async handle(payload: WebhookPayload, userId: string): Promise<WebhookResult> {
    const startTime = Date.now();
    
    try {
      log.info('Processing webhook', { 
        platform: payload.platform, 
        event: payload.event,
        userId 
      });

      // Verify webhook signature if provided
      if (payload.signature) {
        const isValid = this.verifySignature(payload);
        if (!isValid) {
          log.warn('Invalid webhook signature', { platform: payload.platform });
          return {
            success: false,
            message: 'Invalid signature',
          };
        }
      }

      // Route to platform-specific handler
      let result: WebhookResult;
      
      switch (payload.platform) {
        case 'github':
          result = await this.handleGitHub(payload, userId);
          break;
        case 'gitlab':
          result = await this.handleGitLab(payload, userId);
          break;
        case 'bitbucket':
          result = await this.handleBitbucket(payload, userId);
          break;
        default:
          return {
            success: false,
            message: `Unsupported platform: ${payload.platform}`,
          };
      }

      const duration = Date.now() - startTime;
      log.info('Webhook processed', { 
        platform: payload.platform, 
        result: result.success,
        duration 
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('Webhook processing failed', { 
        platform: payload.platform,
        duration 
      }, error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed',
      };
    }
  }

  /**
   * Handle GitHub webhook
   */
  private static async handleGitHub(payload: WebhookPayload, userId: string): Promise<WebhookResult> {
    try {
      const { event, data } = payload;

      // Only trigger sync for relevant events
      const relevantEvents = ['push', 'pull_request', 'issues', 'commit_comment'];
      
      if (!relevantEvents.includes(event)) {
        return {
          success: true,
          message: 'Event ignored',
          syncTriggered: false,
        };
      }

      // Find user's GitHub platform
      const userPlatform = await prisma.userPlatform.findFirst({
        where: {
          userId,
          platform: { slug: 'github' },
          isActive: true,
        },
      });

      if (!userPlatform) {
        return {
          success: false,
          message: 'GitHub platform not connected',
        };
      }

      // Trigger sync
      const syncLogId = await SyncQueue.enqueue({
        userId,
        platformId: userPlatform.platformId,
        userPlatformId: userPlatform.id,
        triggeredBy: 'webhook',
        triggerSource: `github:${event}`,
      });

      return {
        success: true,
        message: 'Sync triggered',
        syncTriggered: true,
        syncLogId,
      };

    } catch (error) {
      log.error('GitHub webhook handling failed', { userId }, error);
      throw error;
    }
  }

  /**
   * Handle GitLab webhook
   */
  private static async handleGitLab(payload: WebhookPayload, userId: string): Promise<WebhookResult> {
    try {
      const { event, data } = payload;

      const relevantEvents = ['push', 'merge_request', 'issue', 'note'];
      
      if (!relevantEvents.includes(event)) {
        return {
          success: true,
          message: 'Event ignored',
          syncTriggered: false,
        };
      }

      const userPlatform = await prisma.userPlatform.findFirst({
        where: {
          userId,
          platform: { slug: 'gitlab' },
          isActive: true,
        },
      });

      if (!userPlatform) {
        return {
          success: false,
          message: 'GitLab platform not connected',
        };
      }

      const syncLogId = await SyncQueue.enqueue({
        userId,
        platformId: userPlatform.platformId,
        userPlatformId: userPlatform.id,
        triggeredBy: 'webhook',
        triggerSource: `gitlab:${event}`,
      });

      return {
        success: true,
        message: 'Sync triggered',
        syncTriggered: true,
        syncLogId,
      };

    } catch (error) {
      log.error('GitLab webhook handling failed', { userId }, error);
      throw error;
    }
  }

  /**
   * Handle Bitbucket webhook
   */
  private static async handleBitbucket(payload: WebhookPayload, userId: string): Promise<WebhookResult> {
    try {
      const { event, data } = payload;

      const relevantEvents = ['repo:push', 'pullrequest:created', 'issue:created'];
      
      if (!relevantEvents.includes(event)) {
        return {
          success: true,
          message: 'Event ignored',
          syncTriggered: false,
        };
      }

      const userPlatform = await prisma.userPlatform.findFirst({
        where: {
          userId,
          platform: { slug: 'bitbucket' },
          isActive: true,
        },
      });

      if (!userPlatform) {
        return {
          success: false,
          message: 'Bitbucket platform not connected',
        };
      }

      const syncLogId = await SyncQueue.enqueue({
        userId,
        platformId: userPlatform.platformId,
        userPlatformId: userPlatform.id,
        triggeredBy: 'webhook',
        triggerSource: `bitbucket:${event}`,
      });

      return {
        success: true,
        message: 'Sync triggered',
        syncTriggered: true,
        syncLogId,
      };

    } catch (error) {
      log.error('Bitbucket webhook handling failed', { userId }, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private static verifySignature(payload: WebhookPayload): boolean {
    try {
      if (!payload.signature) return false;

      const secret = this.getWebhookSecret(payload.platform);
      if (!secret) return false;

      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload.data))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(payload.signature),
        Buffer.from(computedSignature)
      );

    } catch (error) {
      log.error('Signature verification failed', {}, error);
      return false;
    }
  }

  /**
   * Get webhook secret for platform
   */
  private static getWebhookSecret(platform: string): string | null {
    switch (platform) {
      case 'github':
        return process.env.GITHUB_WEBHOOK_SECRET || null;
      case 'gitlab':
        return process.env.GITLAB_WEBHOOK_SECRET || null;
      case 'bitbucket':
        return process.env.BITBUCKET_WEBHOOK_SECRET || null;
      default:
        return null;
    }
  }

  /**
   * Register webhook with platform (helper for setup)
   */
  static async registerWebhook(
    platform: 'github' | 'gitlab' | 'bitbucket',
    userId: string,
    accessToken: string
  ): Promise<{ success: boolean; webhookId?: string; error?: string }> {
    try {
      // Implementation would call platform API to register webhook
      // Example for GitHub:
      // POST /repos/{owner}/{repo}/hooks
      
      log.info('Registering webhook', { platform, userId });

      // This is a placeholder - actual implementation would vary by platform
      return {
        success: true,
        webhookId: 'placeholder-webhook-id',
      };

    } catch (error) {
      log.error('Webhook registration failed', { platform, userId }, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }
}