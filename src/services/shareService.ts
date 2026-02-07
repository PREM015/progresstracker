/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================================
// FILE: services/shareService.ts
// PURPOSE: Handle sharing functionality - generate share links, embeds
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const log = logger.child({ service: 'ShareService' });

// =============================================================================
// TYPES
// =============================================================================

export type ShareType = 'profile' | 'goal' | 'achievement' | 'stats' | 'dashboard';

export interface SharedContent {
    code: string;
    type: ShareType;
    entityId: string;
    userId: string;
    title: string;
    description?: string;
    data: Record<string, unknown>;
    viewCount: number;
    createdAt: Date;
    expiresAt?: Date;
}

export interface ShareLink {
    id: string;
    code: string;
    type: ShareType;
    entityId: string;
    title: string;
    viewCount: number;
    createdAt: Date;
    expiresAt?: Date;
    isActive: boolean;
}

export interface ShareStats {
    totalViews: number;
    uniqueVisitors: number;
    viewsByDate: Record<string, number>;
    referrers: Record<string, number>;
}

export interface EmbedOptions {
    theme?: 'light' | 'dark' | 'auto';
    width?: number | string;
    height?: number | string;
    showHeader?: boolean;
    showFooter?: boolean;
}

export interface EmbedData {
    html: string;
    script?: string;
    style?: string;
}

export interface ViewerInfo {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    country?: string;
}

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const shareService = {
    /**
     * Generate unique share code for content
     */
    async generateShareCode(
        type: ShareType,
        entityId: string,
        userId: string,
        options: { expiresIn?: number; title?: string } = {}
    ): Promise<string> {
        try {
            const { expiresIn, title } = options;

            // Check if share code already exists for this entity
            const existing = await prisma.goal.findFirst({
                where: {
                    id: entityId,
                    userId,
                    shareCode: { not: null },
                },
                select: { shareCode: true },
            });

            if (existing?.shareCode) {
                return existing.shareCode;
            }

            // Generate unique code
            const code = this._generateUniqueCode();

            // Update entity with share code
            if (type === 'goal') {
                await prisma.goal.update({
                    where: { id: entityId },
                    data: {
                        shareCode: code,
                        isPublic: true,
                    },
                });
            }

            log.info('Share code generated', {
                userId,
                type,
                entityId,
                code,
            });

            return code;
        } catch (error) {
            log.error('Error generating share code', { type, entityId, userId }, error);
            throw error;
        }
    },

    /**
     * Get shared content by code
     */
    async getSharedContent(code: string): Promise<SharedContent | null> {
        try {
            // Try finding in goals
            const goal = await prisma.goal.findFirst({
                where: {
                    shareCode: code,
                    isPublic: true,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true,
                        },
                    },
                },
            });

            if (goal) {
                return {
                    code,
                    type: 'goal',
                    entityId: goal.id,
                    userId: goal.userId,
                    title: goal.title,
                    description: goal.description || undefined,
                    data: {
                        goal: {
                            title: goal.title,
                            description: goal.description,
                            targetValue: goal.target,
                            currentValue: goal.progress,
                            unit: goal.unit,
                            status: goal.status,
                            category: goal.category,
                        },
                        user: goal.user,
                    },
                    viewCount: 0,
                    createdAt: goal.createdAt,
                };
            }

            // Could add more entity types here (achievements, profiles, etc.)

            return null;
        } catch (error) {
            log.error('Error getting shared content', { code }, error);
            return null;
        }
    },

    /**
     * Revoke share code (make content private)
     */
    async revokeShareCode(code: string, userId: string): Promise<boolean> {
        try {
            // Try to find and revoke in goals
            const goal = await prisma.goal.findFirst({
                where: {
                    shareCode: code,
                    userId,
                },
            });

            if (goal) {
                await prisma.goal.update({
                    where: { id: goal.id },
                    data: {
                        shareCode: null,
                        isPublic: false,
                    },
                });

                log.info('Share code revoked', { userId, code, entityId: goal.id });
                return true;
            }

            return false;
        } catch (error) {
            log.error('Error revoking share code', { code, userId }, error);
            return false;
        }
    },

    /**
     * Get share statistics
     */
    async getShareStats(code: string): Promise<ShareStats> {
        try {
            // In production, track views in a separate ViewLog table
            // For now, return mock stats
            return {
                totalViews: 0,
                uniqueVisitors: 0,
                viewsByDate: {},
                referrers: {},
            };
        } catch (error) {
            log.error('Error getting share stats', { code }, error);
            throw error;
        }
    },

    /**
     * Generate embed code
     */
    async generateEmbed(code: string, options: EmbedOptions = {}): Promise<EmbedData> {
        try {
            const {
                theme = 'auto',
                width = '100%',
                height = '400px',
                showHeader = true,
                showFooter = true,
            } = options;

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const embedUrl = `${baseUrl}/embed/${code}?theme=${theme}`;

            const html = `
<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  scrolling="no"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  allowtransparency="true"
></iframe>
      `.trim();

            const style = `
<style>
  .progress-tracker-embed {
    max-width: 100%;
    border-radius: 8px;
    overflow: hidden;
  }
</style>
      `.trim();

            return {
                html,
                style,
            };
        } catch (error) {
            log.error('Error generating embed', { code }, error);
            throw error;
        }
    },

    /**
     * List all shares for a user
     */
    async listUserShares(userId: string): Promise<ShareLink[]> {
        try {
            const goals = await prisma.goal.findMany({
                where: {
                    userId,
                    shareCode: { not: null },
                },
                select: {
                    id: true,
                    shareCode: true,
                    title: true,
                    isPublic: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return goals.map(goal => ({
                id: goal.id,
                code: goal.shareCode!,
                type: 'goal' as ShareType,
                entityId: goal.id,
                title: goal.title,
                viewCount: 0,
                createdAt: goal.createdAt,
                isActive: goal.isPublic,
            }));
        } catch (error) {
            log.error('Error listing user shares', { userId }, error);
            return [];
        }
    },

    /**
     * Validate if share code exists and is accessible
     */
    async validateShareCode(code: string): Promise<boolean> {
        try {
            const content = await this.getSharedContent(code);
            return content !== null;
        } catch (error) {
            log.error('Error validating share code', { code }, error);
            return false;
        }
    },

    /**
     * Track view of shared content
     */
    async trackShareView(code: string, viewerInfo: ViewerInfo): Promise<void> {
        try {
            // In production, log to ViewLog table
            log.debug('Share view tracked', {
                code,
                ipAddress: viewerInfo.ipAddress,
                referrer: viewerInfo.referrer,
            });
        } catch (error) {
            log.error('Error tracking share view', { code }, error);
        }
    },

    /**
     * Generate social media share text
     */
    generateShareText(type: ShareType, title: string): string {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        switch (type) {
            case 'goal':
                return `Check out my goal: ${title} on Progress Tracker! 🎯`;
            case 'achievement':
                return `I just unlocked: ${title}! 🏆`;
            case 'stats':
                return `Check out my progress stats on Progress Tracker! 📊`;
            default:
                return `Check out ${title} on Progress Tracker!`;
        }
    },

    /**
     * Generate unique code
     */
    _generateUniqueCode(): string {
        return crypto.randomBytes(8).toString('hex');
    },

    /**
     * Create shareable profile link
     */
    async createProfileShareLink(userId: string): Promise<string> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    username: true,
                    settings: {
                        select: {
                            publicProfile: true,
                        },
                    },
                },
            });

            if (!user?.username) {
                throw new Error('User does not have a username');
            }

            if (!user.settings?.publicProfile) {
                throw new Error('User profile is not public');
            }

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return `${baseUrl}/profile/${user.username}`;
        } catch (error) {
            log.error('Error creating profile share link', { userId }, error);
            throw error;
        }
    },

    /**
     * Bulk revoke all shares for user
     */
    async revokeAllUserShares(userId: string): Promise<number> {
        try {
            const result = await prisma.goal.updateMany({
                where: {
                    userId,
                    shareCode: { not: null },
                },
                data: {
                    shareCode: null,
                    isPublic: false,
                },
            });

            log.info('All user shares revoked', { userId, count: result.count });
            return result.count;
        } catch (error) {
            log.error('Error revoking all user shares', { userId }, error);
            return 0;
        }
    },
};

export default shareService;
