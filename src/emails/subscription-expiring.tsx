// ============================================================================
// FILE: emails/subscription-expiring.tsx
// PURPOSE: Email sent before subscription expires
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/subscription-renewed.tsx - Renewal email
// 2. emails/subscription-cancelled.tsx - Cancellation email
// 3. emails/payment-failed.tsx - Payment issue email
// 4. emails/components/EmailLayout.tsx - Email layout
// 5. services/stripeService.ts - Stripe service
// 6. lib/email.ts - Email sending
// 7. types/billing.ts - Billing types
// -----------------------------------------------------------------------------

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface SubscriptionExpiringProps {
    userName: string;
    planName: string;
    expirationDate: Date | string;
    daysUntilExpiration: number;
    renewLink: string;
    features?: string[];
}

export const SubscriptionExpiringEmail: React.FC<SubscriptionExpiringProps> = ({
    userName = 'there',
    planName = 'Pro',
    expirationDate = new Date().toISOString(),
    daysUntilExpiration = 7,
    renewLink,
    features = [
        'Advanced analytics',
        'Unlimited platform integrations',
        'Priority support',
        'Custom reports',
    ],
}) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
    const renewUrl = renewLink || `${baseUrl}/billing/renew`;

    const urgencyVariant = daysUntilExpiration <= 3 ? 'danger' : 'warning';

    return (
        <EmailLayout preview={`Your ${planName} subscription expires soon`}>
            <Section style={warningBanner}>
                <Text style={warningEmoji}>⏰</Text>
                <Text style={warningTitle}>Subscription Expiring Soon</Text>
            </Section>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                Your ProgressTracker <strong>{planName}</strong> subscription is expiring soon.
                Don&apos;t lose access to your premium features!
            </Text>

            <Card variant={urgencyVariant} title="⏳ Expiration Details">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    <strong style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>
                        {daysUntilExpiration} {daysUntilExpiration === 1 ? 'day' : 'days'} remaining
                    </strong>
                    Your subscription will expire on{' '}
                    <strong>{new Date(expirationDate).toLocaleDateString()}</strong>
                </Text>
            </Card>

            {features && features.length > 0 && (
                <>
                    <Text style={paragraph}>
                        <strong>What you&apos;ll lose access to:</strong>
                    </Text>
                    <Card variant="info" title={`✨ ${planName} Features`}>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {features.map((feature, index) => (
                                <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card>
                </>
            )}

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
                <Button href={renewUrl} variant="primary">
                    Renew {planName} Plan
                </Button>
            </Section>

            <Card variant="success" title="🎁 Limited Time Offer">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    Renew now and get <strong>10% off</strong> your next billing cycle!
                    <br />
                    <br />
                    Keep tracking your coding journey without interruption.
                </Text>
            </Card>

            <Text style={paragraph}>
                After your subscription expires, you&apos;ll be moved to our free plan with limited
                features. Your data will remain safe, but some advanced features will no longer be
                accessible.
            </Text>

            <Text style={smallText}>
                Questions about your subscription? Contact us at support@progresstracker.app
            </Text>
        </EmailLayout>
    );
};

const warningBanner = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    marginBottom: '24px',
};

const warningEmoji = {
    fontSize: '36px',
    margin: '0 0 8px',
};

const warningTitle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#92400e',
    margin: 0,
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 16px',
};

const smallText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

export default SubscriptionExpiringEmail;
