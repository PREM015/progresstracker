// src/emails/account-deleted.tsx
import { Text, Section, Link } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface AccountDeletedProps {
  userName: string;
  email: string;
  deletedAt: string;
  dataRetentionDays: number;
  feedbackUrl?: string;
}

export const AccountDeletedEmail: React.FC<AccountDeletedProps> = ({
  userName = 'there',
  email = 'user@example.com',
  deletedAt = new Date().toISOString(),
  dataRetentionDays = 30,
  feedbackUrl = '',
}) => {
  const permanentDeleteDate = new Date(
    new Date(deletedAt).getTime() + dataRetentionDays * 24 * 60 * 60 * 1000
  );

  return (
    <EmailLayout preview="Your ProgressTracker account has been deleted">
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 24px' }}>
        👋 Account Deleted
      </Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Your ProgressTracker account has been successfully deleted. We&apos;re sad to see you go,
        but we respect your decision.
      </Text>

      <Card variant="info" title="Account Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Email:</strong> {email}
          <br />
          <strong>Deleted At:</strong> {new Date(deletedAt).toLocaleString()}
        </Text>
      </Card>

      <Card variant="warning" title="📅 Data Retention">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          Your data will be permanently deleted on{' '}
          <strong>{permanentDeleteDate.toLocaleDateString()}</strong> ({dataRetentionDays} days from
          now).
          <br />
          <br />
          If you change your mind before then, you can restore your account by contacting our
          support team.
        </Text>
      </Card>

      <Text style={paragraph}>
        <strong>What happens now?</strong>
      </Text>
      <Text style={paragraph}>
        • Your profile and settings are no longer accessible
        <br />
        • Connected platforms have been unlinked
        <br />
        • Your progress data will be permanently deleted after {dataRetentionDays} days
        <br />• You won&apos;t receive any more emails from us
      </Text>

      {feedbackUrl && (
        <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          <Text style={{ marginBottom: '12px', color: '#6b7280' }}>
            Help us improve by sharing your feedback:
          </Text>
          <Button href={feedbackUrl} variant="secondary">
            Share Feedback
          </Button>
        </Section>
      )}

      <Card variant="default" title="Changed your mind?">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          You can restore your account within {dataRetentionDays} days by contacting our support
          team at{' '}
          <Link href="mailto:support@progresstracker.app" style={{ color: '#3b82f6', textDecoration: 'none' }}>
            support@progresstracker.app
          </Link>
        </Text>
      </Card>

      <Text style={paragraph}>
        Thank you for being part of our community. We wish you all the best in your coding journey!
        🚀
      </Text>

      <Text style={{ fontSize: '16px', color: '#374151', margin: '32px 0 0', fontStyle: 'italic' }}>
        The ProgressTracker Team
      </Text>
    </EmailLayout>
  );
};

const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };

export default AccountDeletedEmail;