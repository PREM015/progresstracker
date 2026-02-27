// src/emails/subscription-cancelled.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface SubscriptionCancelledProps {
  userName: string;
  planName: string;
  cancelledAt: string;
  accessEndsAt: string;
  reason?: string;
  feedbackUrl?: string;
}

export const SubscriptionCancelledEmail: React.FC<SubscriptionCancelledProps> = ({
  userName = 'there',
  planName = 'Pro',
  cancelledAt = new Date().toISOString(),
  accessEndsAt = new Date().toISOString(),
  feedbackUrl,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="Your subscription has been cancelled">
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 24px' }}>
        📋 Subscription Cancelled
      </Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Your ProgressTracker {planName} subscription has been cancelled. We&apos;re sorry to see
        you go!
      </Text>

      <Card variant="info" title="Cancellation Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Plan:</strong> {planName}
          <br />
          <strong>Cancelled On:</strong> {new Date(cancelledAt).toLocaleDateString()}
          <br />
          <strong>Access Until:</strong> {new Date(accessEndsAt).toLocaleDateString()}
        </Text>
      </Card>

      <Card variant="success" title="✅ Good News">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          You&apos;ll continue to have access to all {planName} features until{' '}
          <strong>{new Date(accessEndsAt).toLocaleDateString()}</strong>. After that, your account
          will automatically switch to the Free plan.
        </Text>
      </Card>

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button href={`${baseUrl}/settings/billing`} variant="primary">
          Resubscribe Anytime
        </Button>
      </Section>

      {feedbackUrl && (
        <Card variant="default">
          <Text style={{ margin: '0 0 12px', fontSize: '14px', textAlign: 'center' as const }}>
            Help us improve! We&apos;d love to know why you cancelled:
          </Text>
          <Section style={{ textAlign: 'center' as const }}>
            <Button href={feedbackUrl} variant="secondary">
              Share Feedback
            </Button>
          </Section>
        </Card>
      )}
    </EmailLayout>
  );
};

const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };

export default SubscriptionCancelledEmail;