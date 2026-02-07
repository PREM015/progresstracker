// ============================================================================
// FILE: emails/referral-success.tsx
// PURPOSE: Email sent when referred user signs up
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/referral-invite.tsx - Related referral email
// 2. emails/welcome.tsx - Welcome email pattern
// 3. emails/achievement-unlocked.tsx - Celebration email
// 4. emails/components/EmailLayout.tsx - Email layout
// 5. emails/components/Button.tsx - Email button
// 6. services/referralService.ts - Referral data
// 7. lib/email.ts - Email sending
// 8. types/referral.ts - Referral types
// -----------------------------------------------------------------------------

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface ReferralSuccessProps {
    referrerName: string;
    referredUserName: string;
    rewardType: string;
    rewardValue: string | number;
    totalReferrals: number;
}

export const ReferralSuccessEmail: React.FC<ReferralSuccessProps> = ({
    referrerName = 'there',
    referredUserName = 'Your friend',
    rewardType = 'Premium Days',
    rewardValue = '30',
    totalReferrals = 1,
}) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

    const formatReward = () => {
        if (rewardType.toLowerCase().includes('day')) {
            return `${rewardValue} days of Premium`;
        } else if (rewardType.toLowerCase().includes('credit')) {
            return `$${rewardValue} account credit`;
        } else if (rewardType.toLowerCase().includes('points')) {
            return `${rewardValue} bonus points`;
        }
        return `${rewardValue} ${rewardType}`;
    };

    return (
        <EmailLayout preview="🎉 Your referral just signed up!">
            <Section style={celebrationBanner}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px' }}>🎊</Text>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    Referral Success!
                </Text>
            </Section>

            <Text style={paragraph}>Hey {referrerName},</Text>

            <Text style={paragraph}>
                Amazing news! <strong>{referredUserName}</strong> just signed up using your referral link!
                🎉
            </Text>

            <Card variant="success" title="🎁 Your Reward">
                <Text style={{ margin: 0, fontSize: '16px', textAlign: 'center' as const }}>
                    You&apos;ve earned:
                </Text>
                <Text style={rewardText}>{formatReward()}</Text>
                <Text
                    style={{
                        margin: '8px 0 0',
                        fontSize: '14px',
                        color: '#6b7280',
                        textAlign: 'center' as const,
                    }}
                >
                    Your reward has been automatically added to your account! ✨
                </Text>
            </Card>

            <Card variant="info" title="📊 Your Referral Stats">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    <strong style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
                        {totalReferrals}
                    </strong>
                    Total successful {totalReferrals === 1 ? 'referral' : 'referrals'}
                    <br />
                    <br />
                    Keep sharing and earning rewards! 🚀
                </Text>
            </Card>

            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151', margin: '0 0 16px' }}>
                    Invite More Friends!
                </Text>
                <Text style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }}>
                    Share ProgressTracker with your coding friends and earn more rewards.
                </Text>
                <Button href={`${baseUrl}/referrals`} variant="primary">
                    Get Your Referral Link
                </Button>
            </Section>

            <Card variant="default" title="💡 Referral Milestones">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    <strong>Upcoming Rewards:</strong>
                    <br />
                    <br />
                    {totalReferrals < 5 && '🥉 5 referrals = Bonus achievement badge'}
                    {totalReferrals >= 5 && totalReferrals < 10 && '🥈 10 referrals = 3 months Premium'}
                    {totalReferrals >= 10 && totalReferrals < 25 && '🥇 25 referrals = 1 year Premium'}
                    {totalReferrals >= 25 && '💎 Keep going! Special rewards await!'}
                    <br />
                    {totalReferrals < 5 && (
                        <>
                            <br />
                            Only {5 - totalReferrals} more {5 - totalReferrals === 1 ? 'referral' : 'referrals'}{' '}
                            to reach your next milestone!
                        </>
                    )}
                </Text>
            </Card>

            <Text style={paragraph}>
                Thank you for spreading the word about ProgressTracker! Together, we&apos;re helping
                developers around the world track their coding journey and achieve their goals. 🌟
            </Text>

            <Section style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '24px 0' }}>
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    <strong>Pro Tip:</strong> Share your referral link on Twitter, LinkedIn, or Discord to
                    reach more developers!
                </Text>
            </Section>

            <Text style={smallText}>
                Questions about referrals? Check out our{' '}
                <a href={`${baseUrl}/referrals/faq`} style={{ color: '#3b82f6' }}>
                    Referral FAQ
                </a>{' '}
                or contact support.
            </Text>
        </EmailLayout>
    );
};

const celebrationBanner = {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '12px',
    padding: '32px 20px',
    textAlign: 'center' as const,
    marginBottom: '24px',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 16px',
};

const rewardText = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#10b981',
    margin: '8px 0',
    textAlign: 'center' as const,
};

const smallText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

export default ReferralSuccessEmail;
