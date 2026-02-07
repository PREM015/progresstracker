// ============================================================================
// FILE: emails/subscription-renewed.tsx
// PURPOSE: Email sent when subscription renews
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/subscription-created.tsx - New subscription email
// 2. emails/subscription-cancelled.tsx - Cancellation email
// 3. emails/invoice-paid.tsx - Payment confirmation
// 4. emails/components/EmailLayout.tsx - Email layout
// 5. services/stripeService.ts - Stripe/billing service
// 6. lib/email.ts - Email sending
// 7. types/billing.ts - Billing types
// 8. prisma/schema.prisma - Subscription model
// -----------------------------------------------------------------------------

import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface SubscriptionRenewedProps {
    userName: string;
    planName: string;
    amount: number;
    currency: string;
    nextBillingDate: Date | string;
    invoiceUrl?: string;
}

export const SubscriptionRenewedEmail: React.FC<SubscriptionRenewedProps> = ({
    userName = 'there',
    planName = 'Pro',
    amount = 9.99,
    currency = 'USD',
    nextBillingDate = new Date().toISOString(),
    invoiceUrl,
}) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

    const formatCurrency = (amt: number, curr: string) => {
        const symbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£' };
        return `${symbols[curr] || curr} ${amt.toFixed(2)}`;
    };

    return (
        <EmailLayout preview={`Your ${planName} subscription has been renewed`}>
            <Section style={successBanner}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px' }}>✅</Text>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    Subscription Renewed!
                </Text>
            </Section>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                Your ProgressTracker <strong>{planName}</strong> subscription has been successfully
                renewed. Thank you for continuing your coding journey with us!
            </Text>

            <Card variant="success" title="💳 Payment Confirmation">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    <strong>Plan:</strong> {planName}
                    <br />
                    <strong>Amount Charged:</strong> {formatCurrency(amount, currency)}
                    <br />
                    <strong>Billing Date:</strong> {new Date().toLocaleDateString()}
                    <br />
                    <strong>Next Billing Date:</strong> {new Date(nextBillingDate).toLocaleDateString()}
                </Text>
            </Card>

            {invoiceUrl && (
                <Section style={{ textAlign: 'center' as const, margin: '16px 0' }}>
                    <Link
                        href={invoiceUrl}
                        style={{
                            color: '#3b82f6',
                            textDecoration: 'underline',
                            fontSize: '14px',
                        }}
                    >
                        📄 Download Invoice
                    </Link>
                </Section>
            )}

            <Card variant="info" title="✨ What's Included">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    Your {planName} subscription includes:
                    <br />
                    <br />
                    • Advanced analytics and insights
                    <br />
                    • Unlimited platform integrations
                    <br />
                    • Priority customer support
                    <br />
                    • Custom reports and exports
                    <br />
                    • Early access to new features
                </Text>
            </Card>

            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
                <Button href={`${baseUrl}/dashboard`} variant="primary">
                    Go to Dashboard
                </Button>
            </Section>

            <Card variant="default" title="Manage Your Subscription">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    Need to update your payment method or billing details?
                    <br />
                    <br />
                    <Link
                        href={`${baseUrl}/settings/billing`}
                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    >
                        Manage Billing Settings →
                    </Link>
                </Text>
            </Card>

            <Text style={paragraph}>
                Thank you for being a valued member of ProgressTracker. We&apos;re here to help you track
                and achieve your coding goals! 🚀
            </Text>

            <Text style={smallText}>
                Questions about your subscription? Contact us at support@progresstracker.app
            </Text>
        </EmailLayout>
    );
};

const successBanner = {
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

const smallText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

export default SubscriptionRenewedEmail;
