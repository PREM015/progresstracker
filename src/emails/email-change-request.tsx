// src/emails/email-change-request.tsx
// Email sent to verify new email address

import {
  Text,
  Section,
} from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

interface EmailChangeRequestEmailProps {
  userName: string;
  currentEmail: string;
  newEmail: string;
  verificationUrl: string;
  expiresIn: string;
  requestedAt: string;
  ipAddress: string;
}

export const EmailChangeRequestEmail: React.FC<EmailChangeRequestEmailProps> = ({
  userName = 'User',
  currentEmail = 'old@example.com',
  newEmail = 'new@example.com',
  verificationUrl = '#',
  expiresIn = '24 hours',
  requestedAt = new Date().toISOString(),
  ipAddress = 'Unknown',
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="Verify your new email address">
      <Text style={heading}>✉️ Email Change Request</Text>
      
      <Text style={paragraph}>
        Hi {userName},
      </Text>
      
      <Text style={paragraph}>
        You&apos;ve requested to change your ProgressTracker email address. 
        Please verify your new email to complete this change.
      </Text>

      <Card variant="info" title="Email Change">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Current Email:</strong> {currentEmail}<br />
          <strong>New Email:</strong> {newEmail}
        </Text>
      </Card>

      <Section style={ctaSection}>
        <Button href={verificationUrl} variant="primary">
          Verify New Email Address
        </Button>
      </Section>

      <Card variant="warning">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          ⏰ This link expires in <strong>{expiresIn}</strong>
        </Text>
      </Card>

      <Card variant="default" title="Request Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Requested:</strong> {new Date(requestedAt).toLocaleString()}<br />
          <strong>IP Address:</strong> {ipAddress}
        </Text>
      </Card>

      <Text style={paragraph}>
        If you didn&apos;t request this change, please ignore this email and your 
        email address will remain unchanged. Consider reviewing your{' '}
        <a href={`${baseUrl}/settings/security`} style={link}>security settings</a>.
      </Text>

      <Text style={smallText}>
        This verification email was sent to {newEmail}.
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

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
};

export default EmailChangeRequestEmail;