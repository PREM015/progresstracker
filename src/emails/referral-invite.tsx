// ============================================================================
// FILE: emails/referral-invite.tsx
// PURPOSE: Email sent when user invites someone via referral
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/welcome.tsx - Welcome email (similar structure)
// 2. emails/verify-email.tsx - Email with CTA button
// 3. emails/newsletter.tsx - Newsletter email pattern
// 4. emails/components/EmailLayout.tsx - Email layout component
// 5. emails/components/Button.tsx - Email button component
// 6. emails/components/Card.tsx - Email card component
// 7. services/referralService.ts - Referral data
// 8. lib/email.ts - Email sending utilities
// 9. lib/email/email-service.tsx - Email service
// 10. types/referral.ts - Referral types
// -----------------------------------------------------------------------------

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface ReferralInviteProps {
    inviterName: string;
    inviterEmail: string;
    referralCode: string;
    referralLink: string;
    recipientName?: string;
}

export const ReferralInviteEmail: React.FC<ReferralInviteProps> = ({
    inviterName = 'A friend',
    inviterEmail,
    referralCode,
    referralLink,
    recipientName,
}) => {
    const displayRecipient = recipientName || 'there';

    return (
        <EmailLayout preview={`${inviterName} invited you to join ProgressTracker!`}>
            <Section style={inviteBanner}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px' }}>🎁</Text>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    You&apos;re Invited!
                </Text>
            </Section>

            <Text style={paragraph}>Hey {displayRecipient},</Text>

            <Text style={paragraph}>
                <strong>{inviterName}</strong> ({inviterEmail}) has invited you to join{' '}
                <strong>ProgressTracker</strong> – the ultimate platform for tracking your coding journey
                across 60+ platforms!
            </Text>

            <Card variant="info" title="🚀 What is ProgressTracker?">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    ProgressTracker helps developers like you:
                    <br />
                    <br />
                    • Track progress across GitHub, LeetCode, Codeforces, and 60+ platforms
                    <br />
                    • View beautiful analytics and insights
                    <br />
                    • Set goals and unlock achievements
                    <br />
                    • Maintain coding streaks
                    <br />• Get weekly progress reports
                </Text>
            </Card>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
                <Button href={referralLink} variant="primary">
                    Join ProgressTracker
                </Button>
            </Section>

            <Card variant="success" title="✨ Special Invite Perks">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    By using {inviterName}&apos;s referral link, you both get:
                    <br />
                    <br />
                    🎁 <strong>Premium features for your first month</strong>
                    <br />
                    🏆 <strong>Exclusive achievement badges</strong>
                    <br />
                    ⚡ <strong>Priority onboarding support</strong>
                </Text>
            </Card>

            <Text style={paragraph}>
                Join thousands of developers who are already tracking their coding progress and achieving
                their goals with ProgressTracker!
            </Text>

            <Section style={featuresGrid}>
                <Section style={featureCard}>
                    <Text style={featureEmoji}>📊</Text>
                    <Text style={featureTitle}>Analytics</Text>
                    <Text style={featureText}>Beautiful charts and insights</Text>
                </Section>
                <Section style={featureCard}>
                    <Text style={featureEmoji}>🔗</Text>
                    <Text style={featureTitle}>Integrations</Text>
                    <Text style={featureText}>60+ platform connections</Text>
                </Section>
                <Section style={featureCard}>
                    <Text style={featureEmoji}>🎯</Text>
                    <Text style={featureTitle}>Goals</Text>
                    <Text style={featureText}>Track your achievements</Text>
                </Section>
            </Section>

            <Card variant="default" title="Why {inviterName} loves ProgressTracker">
                <Text
                    style={{
                        margin: 0,
                        fontSize: '14px',
                        textAlign: 'center' as const,
                        fontStyle: 'italic',
                    }}
                >
                    &ldquo;ProgressTracker has helped me stay consistent with my coding goals. Being able to
                    see all my progress in one place is incredibly motivating!&rdquo;
                </Text>
            </Card>

            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
                <Text style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    Ready to level up your coding journey?
                </Text>
                <Button href={referralLink} variant="secondary">
                    Get Started Free
                </Button>
            </Section>

            <Text style={smallText}>
                This invitation was sent by {inviterName}. If you don&apos;t want to receive these emails,
                you can safely ignore this message.
            </Text>
        </EmailLayout>
    );
};

const inviteBanner = {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
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

const featuresGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    margin: '24px 0',
};

const featureCard = {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
};

const featureEmoji = {
    fontSize: '32px',
    margin: '0 0 8px',
};

const featureTitle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 4px',
};

const featureText = {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
};

const smallText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

export default ReferralInviteEmail;
