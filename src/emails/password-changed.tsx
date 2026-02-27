// src/emails/password-changed.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { PasswordChangedProps } from '@/types/email';

export const PasswordChangedEmail: React.FC<PasswordChangedProps> = ({
  userName = 'there',
  changedAt = new Date().toISOString(),
  ipAddress = 'Unknown',
  device = 'Unknown Device',
  location = '',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="Your password has been changed">
      <Text style={heading}>🔒 Password Changed Successfully</Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Your ProgressTracker password was successfully changed. If you made this change, no
        further action is needed.
      </Text>

      <Card variant="info" title="Change Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Time:</strong> {new Date(changedAt).toLocaleString()}
          <br />
          <strong>IP Address:</strong> {ipAddress}
          <br />
          <strong>Device:</strong> {device}
          {location && (
            <>
              <br />
              <strong>Location:</strong> {location}
            </>
          )}
        </Text>
      </Card>

      <Card variant="danger" title="⚠️ Wasn't You?">
        <Text style={{ margin: '0 0 12px', fontSize: '14px' }}>
          If you did not make this change, your account may be compromised. Take action
          immediately:
        </Text>
        <Text style={{ margin: 0, fontSize: '14px' }}>
          1. Reset your password immediately
          <br />
          2. Review your active sessions
          <br />
          3. Enable two-factor authentication
          <br />
          4. Contact our support team
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={`${baseUrl}/settings/security`} variant="primary">
          Review Security Settings
        </Button>
      </Section>

      <Text style={smallText}>This is an automated security notification from ProgressTracker.</Text>
    </EmailLayout>
  );
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
};

export default PasswordChangedEmail;