// ============================================================================
// FILE: emails/waitlist-position-update.tsx
// PURPOSE: Email sent when waitlist position changes
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/waitlist-welcome.tsx - Waitlist welcome email
// 2. emails/welcome.tsx - Welcome email pattern
// 3. emails/components/EmailLayout.tsx - Email layout
// 4. emails/components/Button.tsx - Email button
// 5. services/waitlistService.ts - Waitlist service
// 6. lib/email.ts - Email sending
// 7. types/waitlist.ts - Waitlist types
// 8. prisma/schema.prisma - Waitlist model
// -----------------------------------------------------------------------------

import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface WaitlistPositionUpdateProps {
    name: string;
    email: string;
    previousPosition: number;
    currentPosition: number;
    referralCode: string;
    shareLink?: string;
}

export const WaitlistPositionUpdateEmail: React.FC<WaitlistPositionUpdateProps> = ({
    name = 'there',
    email,
    previousPosition = 100,
    currentPosition = 50,
    referralCode,
    shareLink,
}) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
    const referralLink = shareLink || `${baseUrl}?ref=${referralCode}`;
    const positionChange = previousPosition - currentPosition;
    const hasMovedUp = positionChange > 0;

    return (
        <EmailLayout preview={`You moved ${hasMovedUp ? 'up' : ''} on the waitlist!`}>
            <Section style={celebrationBanner}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px' }}>
                    {hasMovedUp ? '🎉' : '📊'}
                </Text>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    {hasMovedUp ? 'You Moved Up!' : 'Position Update'}
                </Text>
            </Section>

            <Text style={paragraph}>Hey {name},</Text>

            <Text style={paragraph}>
                {hasMovedUp
                    ? `Great news! You've moved up ${positionChange} ${positionChange === 1 ? 'spot' : 'spots'
                    } on the ProgressTracker waitlist! 🚀`
                    : 'Here\'s an update on your waitlist position.'}
            </Text>

            <Card variant={hasMovedUp ? 'success' : 'info'} title="Your Position">
                <Section style={{ textAlign: 'center' as const }}>
                    <Text style={positionBadge}>
                        #{currentPosition}
                    </Text>
                    {previousPosition !== currentPosition && (
                        <Text style={{ margin: '8px 0 0', fontSize: '14px', color: '#6b7280' }}>
                            Previously: #{previousPosition}
                            {hasMovedUp && (
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                    {' '}
                                    (↑ {positionChange})
                                </span>
                            )}
                        </Text>
                    )}
                </Section>
            </Card>

            {hasMovedUp && (
                <Text style={{ ...paragraph, textAlign: 'center' as const, fontSize: '18px' }}>
                    You&apos;re getting closer to early access! 🎯
                </Text>
            )}

            <Card variant="info" title="🚀 Move Up Even Faster!">
                <Text style={{ margin: '0 0 12px', fontSize: '14px', textAlign: 'center' as const }}>
                    Share your unique referral link and jump ahead in line:
                </Text>
                <Section style={referralBox}>
                    <Text style={referralLinkText}>{referralLink}</Text>
                </Section>
                <Text
                    style={{
                        margin: '12px 0 0',
                        fontSize: '14px',
                        textAlign: 'center' as const,
                        fontWeight: 'bold',
                    }}
                >
                    Each friend who signs up moves you up 5 spots! 📈
                </Text>
            </Card>

            <Section style={shareButtons}>
                <Link
                    href={`https://twitter.com/intent/tweet?text=I'm %23${currentPosition} on the @ProgressTracker waitlist! Track your coding progress across 60+ platforms. Join me: ${referralLink}`}
                    style={shareButton}
                >
                    Share on Twitter
                </Link>
                <Link
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                        referralLink
                    )}`}
                    style={shareButton}
                >
                    Share on LinkedIn
                </Link>
            </Section>

            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
                <Button
                    href={`${baseUrl}/waitlist/status?email=${encodeURIComponent(email)}`}
                    variant="primary"
                >
                    Check Your Status
                </Button>
            </Section>

            <Card variant="default" title="What's Next?">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    We&apos;re rolling out access in waves. The higher your position, the sooner you&apos;ll
                    get early access to ProgressTracker!
                    <br />
                    <br />
                    We&apos;ll notify you as soon as your spot comes up. Stay tuned! 🔔
                </Text>
            </Card>

            <Text style={smallText}>Keep sharing to move up faster!</Text>

            <Text style={signoff}>
                Happy coding! 🚀
                <br />
                The ProgressTracker Team
            </Text>
        </EmailLayout>
    );
};

const celebrationBanner = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
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

const positionBadge = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#10b981',
    margin: '0',
};

const referralBox = {
    backgroundColor: '#1f2937',
    borderRadius: '6px',
    padding: '12px',
    margin: '12px 0',
};

const referralLinkText = {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#10b981',
    margin: 0,
    wordBreak: 'break-all' as const,
    textAlign: 'center' as const,
};

const shareButtons = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    margin: '24px 0',
};

const shareButton = {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
};

const smallText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

const signoff = {
    fontSize: '16px',
    color: '#374151',
    margin: '32px 0 0',
};

export default WaitlistPositionUpdateEmail;
