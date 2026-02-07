// ============================================================================
// FILE: services/referralService.ts
// PURPOSE: Handle referral logic - code generation, tracking, rewards
// ============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

import { sendEmail } from '@/lib/email';
import ReferralInviteEmail from '@/emails/referral-invite';
import ReferralSuccessEmail from '@/emails/referral-success';
import { render } from '@react-email/render';
import * as React from 'react';

const log = logger.child({ service: 'ReferralService' });

// =============================================================================
// TYPES
// =============================================================================

export interface ReferralStats {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    totalRewards: number;
    conversionRate: number;
}

export interface ReferralInfo {
    id: string;
    name: string;
    email: string;
    status: 'pending' | 'completed' | 'expired';
    joinedAt?: Date;
    reward?: number;
    createdAt: Date;
}

export interface PaginatedReferrals {
    referrals: ReferralInfo[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const REFERRAL_REWARDS = {
    REFERRER_CREDIT: 500, // $5 credit in cents
    REFEREE_CREDIT: 500,   // $5 credit in cents
    MILESTONE_BONUS: {
        5: 2500,   // $25 bonus for 5 referrals
        10: 5000,  // $50 bonus for 10 referrals
        25: 15000, // $150 bonus for 25 referrals
    },
};

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const referralService = {
    /**
     * Generate referral code for user
     */
    async generateReferralCode(userId: string): Promise<string> {
        try {
            // Check if user already has a referral code
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { referralCode: true },
            });

            if (user?.referralCode) {
                return user.referralCode;
            }

            // Generate unique code
            let code: string;
            let isUnique = false;

            while (!isUnique) {
                code = this._generateCode();
                const existing = await prisma.user.findFirst({
                    where: { referralCode: code },
                });
                isUnique = !existing;
            }

            // Update user with referral code
            await prisma.user.update({
                where: { id: userId },
                data: { referralCode: code! },
            });

            log.info('Referral code generated', { userId, code: code! });

            return code!;
        } catch (error) {
            log.error('Error generating referral code', { userId }, error);
            throw error;
        }
    },

    /**
     * Get user's referral code
     */
    async getReferralCode(userId: string): Promise<string> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { referralCode: true },
            });

            if (!user?.referralCode) {
                return await this.generateReferralCode(userId);
            }

            return user.referralCode;
        } catch (error) {
            log.error('Error getting referral code', { userId }, error);
            throw error;
        }
    },

    /**
     * Apply referral code during signup
     */
    async applyReferralCode(userId: string, code: string): Promise<boolean> {
        try {
            // Find referrer by code
            const referrer = await prisma.user.findFirst({
                where: { referralCode: code },
                select: { id: true, name: true, email: true },
            });

            if (!referrer) {
                log.warn('Invalid referral code', { code, userId });
                return false;
            }

            if (referrer.id === userId) {
                log.warn('User tried to use own referral code', { userId });
                return false;
            }

            // Check if user already has a referrer
            const existingUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { referredBy: true },
            });

            if (existingUser?.referredBy) {
                log.warn('User already has a referrer', { userId });
                return false;
            }

            // Apply referral
            await prisma.user.update({
                where: { id: userId },
                data: { referredBy: referrer.id },
            });

            // Process rewards
            await this.processReferralReward(referrer.id, userId);

            log.info('Referral code applied', {
                referrerId: referrer.id,
                referredUserId: userId,
                code,
            });

            return true;
        } catch (error) {
            log.error('Error applying referral code', { userId, code }, error);
            return false;
        }
    },

    /**
     * Get referral statistics for user
     */
    async getReferralStats(userId: string): Promise<ReferralStats> {
        try {
            const referrals = await prisma.user.findMany({
                where: { referredBy: userId },
                select: {
                    id: true,
                    createdAt: true,
                    isActive: true,
                },
            });

            const total = referrals.length;
            const successful = referrals.filter(r => r.isActive).length;
            const pending = total - successful;

            // Calculate total rewards
            let totalRewards = successful * REFERRAL_REWARDS.REFERRER_CREDIT;

            // Add milestone bonuses
            for (const [milestone, bonus] of Object.entries(REFERRAL_REWARDS.MILESTONE_BONUS)) {
                if (successful >= parseInt(milestone)) {
                    totalRewards += bonus;
                }
            }

            return {
                totalReferrals: total,
                successfulReferrals: successful,
                pendingReferrals: pending,
                totalRewards,
                conversionRate: total > 0 ? (successful / total) * 100 : 0,
            };
        } catch (error) {
            log.error('Error getting referral stats', { userId }, error);
            throw error;
        }
    },

    /**
     * Get list of referrals with pagination
     */
    async getReferrals(
        userId: string,
        options: { page?: number; pageSize?: number } = {}
    ): Promise<PaginatedReferrals> {
        try {
            const { page = 1, pageSize = 20 } = options;
            const skip = (page - 1) * pageSize;

            const [referrals, total] = await Promise.all([
                prisma.user.findMany({
                    where: { referredBy: userId },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        isActive: true,
                        createdAt: true,
                    },
                    skip,
                    take: pageSize,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.user.count({
                    where: { referredBy: userId },
                }),
            ]);

            const referralInfos: ReferralInfo[] = referrals.map(r => ({
                id: r.id,
                name: r.name || 'Unknown User',
                email: r.email || '',
                status: r.isActive ? 'completed' : 'pending',
                joinedAt: r.createdAt,
                reward: r.isActive ? REFERRAL_REWARDS.REFERRER_CREDIT : 0,
                createdAt: r.createdAt,
            }));

            return {
                referrals: referralInfos,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            };
        } catch (error) {
            log.error('Error getting referrals', { userId }, error);
            throw error;
        }
    },

    /**
     * Send referral invite email
     */
    async sendReferralInvite(userId: string, inviteEmail: string): Promise<void> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    name: true,
                    email: true,
                    referralCode: true,
                },
            });

            if (!user?.referralCode) {
                throw new Error('User does not have a referral code');
            }

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const referralUrl = `${baseUrl}/signup?ref=${user.referralCode}`;

            const emailHtml = await render(ReferralInviteEmail({
                inviterName: user.name || 'A friend',
                inviterEmail: user.email || '',
                referralCode: user.referralCode,
                referralLink: referralUrl,
            }) as React.ReactElement);

            await sendEmail({
                to: inviteEmail,
                subject: `${user.name || 'A friend'} invited you to join Progress Tracker`,
                html: emailHtml,
            });

            log.info('Referral invite sent', {
                userId,
                inviteEmail,
                referralCode: user.referralCode,
            });
        } catch (error) {
            log.error('Error sending referral invite', { userId, inviteEmail }, error);
            throw error;
        }
    },

    /**
     * Process referral rewards
     */
    async processReferralReward(referrerId: string, referredId: string): Promise<void> {
        try {
            const [referrer, referred] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: referrerId },
                    select: {
                        name: true,
                        email: true,
                        totalPoints: true,
                    },
                }),
                prisma.user.findUnique({
                    where: { id: referredId },
                    select: {
                        name: true,
                        email: true,
                    },
                }),
            ]);

            if (!referrer || !referred) {
                throw new Error('User not found');
            }

            // Award credits/points to both users
            await Promise.all([
                // Referrer reward
                prisma.user.update({
                    where: { id: referrerId },
                    data: {
                        totalPoints: {
                            increment: REFERRAL_REWARDS.REFERRER_CREDIT,
                        },
                    },
                }),
                // Referred user reward
                prisma.user.update({
                    where: { id: referredId },
                    data: {
                        totalPoints: {
                            increment: REFERRAL_REWARDS.REFEREE_CREDIT,
                        },
                    },
                }),
            ]);

            // Check for milestone bonuses
            const stats = await this.getReferralStats(referrerId);
            const milestones = Object.keys(REFERRAL_REWARDS.MILESTONE_BONUS).map(Number);
            const reachedMilestone = milestones.find(m => m === stats.successfulReferrals);

            if (reachedMilestone) {
                const bonus = REFERRAL_REWARDS.MILESTONE_BONUS[reachedMilestone as keyof typeof REFERRAL_REWARDS.MILESTONE_BONUS];
                await prisma.user.update({
                    where: { id: referrerId },
                    data: {
                        totalPoints: {
                            increment: bonus,
                        },
                    },
                });

                log.info('Referral milestone bonus awarded', {
                    referrerId,
                    milestone: reachedMilestone,
                    bonus,
                });
            }

            // Send success notification
            if (referrer.email) {
                const emailHtml = await render(ReferralSuccessEmail({
                    referrerName: referrer.name || 'there',
                    referredUserName: referred.name || 'A friend',
                    rewardValue: REFERRAL_REWARDS.REFERRER_CREDIT / 100,
                    rewardType: 'Credits',
                    totalReferrals: stats.successfulReferrals,
                }) as React.ReactElement);

                await sendEmail({
                    to: referrer.email,
                    subject: 'Your referral was successful! 🎉',
                    html: emailHtml,
                });
            }

            log.info('Referral rewards processed', {
                referrerId,
                referredId,
                referrerReward: REFERRAL_REWARDS.REFERRER_CREDIT,
                referredReward: REFERRAL_REWARDS.REFEREE_CREDIT,
            });
        } catch (error) {
            log.error('Error processing referral reward', { referrerId, referredId }, error);
        }
    },

    /**
     * Validate referral code
     */
    async validateReferralCode(code: string): Promise<{ valid: boolean; userId?: string }> {
        try {
            const user = await prisma.user.findFirst({
                where: { referralCode: code },
                select: { id: true },
            });

            return {
                valid: !!user,
                userId: user?.id,
            };
        } catch (error) {
            log.error('Error validating referral code', { code }, error);
            return { valid: false };
        }
    },

    /**
     * Get referral leaderboard
     */
    async getReferralLeaderboard(limit: number = 10): Promise<Array<{
        userId: string;
        name: string;
        image?: string;
        referralCount: number;
    }>> {
        try {
            const users = await prisma.user.findMany({
                where: {
                    referrals: {
                        some: {},
                    },
                },
                select: {
                    id: true,
                    name: true,
                    image: true,
                    _count: {
                        select: {
                            referrals: true,
                        },
                    },
                },
                orderBy: {
                    referrals: {
                        _count: 'desc',
                    },
                },
                take: limit,
            });

            return users.map(u => ({
                userId: u.id,
                name: u.name || 'Unknown User',
                image: u.image || undefined,
                referralCount: u._count.referrals,
            }));
        } catch (error) {
            log.error('Error getting referral leaderboard', {}, error);
            return [];
        }
    },

    /**
     * Generate unique referral code
     */
    _generateCode(): string {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    },
};

export default referralService;
