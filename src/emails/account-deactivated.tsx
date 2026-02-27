// ============================================================================
// FILE: emails/account-deactivated.tsx
// PURPOSE: Email sent when account is deactivated
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/account-deleted.tsx - Account deletion email
// 2. emails/security-alert.tsx - Security-related email (if exists)
// 3. emails/password-changed.tsx - Account change email
// 4. emails/components/EmailLayout.tsx - Email layout
// 5. services/userService.ts - User deactivation
// 6. lib/email.ts - Email sending
// 7. types/user.ts - User types
// -----------------------------------------------------------------------------

import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface AccountDeactivatedProps {
    userName: string;
    deactivationDate: Date | string;
    reason?: string;
    reactivationLink: string;
    dataRetentionDays: number;
}

export const AccountDeactivatedEmail: React.FC<AccountDeactivatedProps> = ({
    userName = 'there',
    deactivationDate = new Date().toISOString(),
    reason,
    reactivationLink,
    dataRetentionDays = 30,
}) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
    const reactivateUrl = reactivationLink || `${baseUrl}/account/reactivate`;
    const permanentDeleteDate = new Date(
        new Date(deactivationDate).getTime() + dataRetentionDays * 24 * 60 * 60 * 1000
    );

    return (
        <EmailLayout preview="Your account has been deactivated">
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 24px' }}>
                😔 Account Deactivated
            </Text>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                Your ProgressTracker account has been deactivated. Your profile is no longer active, but
                your data is safely stored.
            </Text>

            <Card variant="info" title="Deactivation Details">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    <strong>Deactivated On:</strong> {new Date(deactivationDate).toLocaleDateString()}
                    <br />
                    {reason && (
                        <>
                            <strong>Reason:</strong> {reason}
                            <br />
                        </>
                    )}
                    <strong>Status:</strong> Account is now inactive
                </Text>
            </Card>

            <Text style={paragraph}>
                <strong>What happens now?</strong>
            </Text>
            <Text style={paragraph}>
                • Your profile is hidden and no longer accessible
                <br />
                • Connected platforms have been temporarily disconnected
                <br />
                • You won&apos;t receive notifications or reports
                <br />
                • Your data is preserved for {dataRetentionDays} days
                <br />• You can reactivate your account at any time
            </Text>

            <Card variant="warning" title="📅 Data Retention">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    Your account data will be kept until{' '}
                    <strong>{permanentDeleteDate.toLocaleDateString()}</strong> ({dataRetentionDays} days).
                    <br />
                    <br />
                    After this period, if you don&apos;t reactivate, your data may be permanently deleted.
                </Text>
            </Card>

            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
                <Button href={reactivateUrl} variant="primary">
                    Reactivate My Account
                </Button>
            </Section>

            <Card variant="default" title="💡 Changed your mind?">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    You can reactivate your account at any time by clicking the button above or visiting{' '}
                    <Link
                        href={reactivateUrl}
                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                    >
                        {reactivateUrl}
                    </Link>
                    <br />
                    <br />
                    All your data, progress, and settings will be restored exactly as you left them.
                </Text>
            </Card>

            <Text style={paragraph}>
                Need help or have questions? Contact our support team at{' '}
                <Link
                    href="mailto:support@progresstracker.app"
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                    support@progresstracker.app
                </Link>
            </Text>

            <Text style={{ fontSize: '16px', color: '#374151', margin: '32px 0 0', fontStyle: 'italic' }}>
                We hope to see you back soon,
                <br />
                The ProgressTracker Team
            </Text>
        </EmailLayout>
    );
};

const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };

export default AccountDeactivatedEmail;
