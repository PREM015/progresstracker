// src/emails/password-reset.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { PasswordResetProps } from '@/types/email';

export const PasswordResetEmail: React.FC<PasswordResetProps> = ({
  userName = 'there',
  resetUrl = '#',
  expiresIn = '1 hour',
  ipAddress = 'Unknown',
  device = 'Unknown Device',
}) => {
  return (
    <EmailLayout preview="Reset your password">
      <Text style={heading}>🔑 Reset Your Password</Text>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        We received a request to reset your ProgressTracker password. Click the button below to
        create a new password.
      </Text>

      <Section style={ctaSection}>
        <Button href={resetUrl} variant="primary">
          Reset Password
        </Button>
      </Section>

      <Card variant="warning">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          ⏰ This link expires in <strong>{expiresIn}</strong>
        </Text>
      </Card>

      <Card variant="info" title="Request Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>IP Address:</strong> {ipAddress}
          <br />
          <strong>Device:</strong> {device}
          <br />
          <strong>Time:</strong> {new Date().toLocaleString()}
        </Text>
      </Card>

      <Text style={paragraph}>
        If you didn&apos;t request a password reset, please ignore this email or contact support
        if you have concerns about your account security.
      </Text>

      <Text style={smallText}>
        For security, this password reset link is single-use and will expire shortly.
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

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
};

export default PasswordResetEmail;