// src/emails/email-changed.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface EmailChangedProps {
  userName: string;
  oldEmail: string;
  newEmail: string;
  changedAt: string;
  ipAddress: string;
}

export const EmailChangedEmail: React.FC<EmailChangedProps> = ({
  userName = 'there',
  oldEmail = 'old@example.com',
  newEmail = 'new@example.com',
  changedAt = new Date().toISOString(),
  ipAddress = 'Unknown',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="Your email address has been changed">
      <Text style={heading}>📧 Email Address Changed</Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        This is a confirmation that your ProgressTracker account email address has been
        successfully changed.
      </Text>

      <Card variant="info" title="Email Change Summary">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Previous Email:</strong> {oldEmail}
          <br />
          <strong>New Email:</strong> {newEmail}
          <br />
          <strong>Changed At:</strong> {new Date(changedAt).toLocaleString()}
          <br />
          <strong>IP Address:</strong> {ipAddress}
        </Text>
      </Card>

      <Text style={paragraph}>
        All future communications will be sent to your new email address. You will no longer
        receive emails at this address.
      </Text>

      <Card variant="danger" title="⚠️ Wasn't You?">
        <Text style={{ margin: '0 0 12px', fontSize: '14px' }}>
          If you did not make this change, your account may be compromised. Please contact our
          support team immediately.
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/support`} variant="danger">
          Contact Support
        </Button>
      </Section>

      <Text style={smallText}>
        This notification was sent to your previous email address for security purposes.
      </Text>
    </EmailLayout>
  );
};

const heading = { fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 24px' };
const paragraph = { fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' };
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const smallText = { fontSize: '14px', color: '#6b7280', margin: '24px 0 0' };

export default EmailChangedEmail;