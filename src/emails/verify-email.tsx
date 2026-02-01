// src/emails/verify-email.tsx
import { Text, Section} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { VerifyEmailProps } from '@/types/email';

export const VerifyEmailEmail: React.FC<VerifyEmailProps> = ({
  userName = 'there',
  verificationUrl = '#',
  verificationCode = '',
  expiresIn = '24 hours',
}) => {
  return (
    <EmailLayout preview="Verify your email address">
      <Text style={heading}>✉️ Verify Your Email</Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Thanks for signing up for ProgressTracker! Please verify your email address to complete
        your registration.
      </Text>

      <Section style={ctaSection}>
        <Button href={verificationUrl} variant="primary">
          Verify Email Address
        </Button>
      </Section>

      {verificationCode && (
        <Card variant="default" title="Or use this code:">
          <Text style={codeDisplay}>{verificationCode}</Text>
        </Card>
      )}

      <Card variant="warning">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          ⏰ This link expires in <strong>{expiresIn}</strong>
        </Text>
      </Card>

      <Text style={paragraph}>
        If you didn&apos;t create an account with ProgressTracker, you can safely ignore this
        email.
      </Text>

      <Text style={smallText}>
        Button not working? Copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: 'break-all' as const, color: '#6b7280' }}>{verificationUrl}</span>
      </Text>
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

const codeDisplay = {
  fontSize: '32px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  letterSpacing: '8px',
  textAlign: 'center' as const,
  color: '#3b82f6',
  margin: 0,
};

const smallText = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '24px 0 0',
};

export default VerifyEmailEmail;