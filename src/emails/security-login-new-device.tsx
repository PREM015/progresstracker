// ============================================================================
// FILE: emails/security-login-new-device.tsx
// PURPOSE: Email sent when login from new device detected
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/login-alert.tsx - Login alert email
// 2. emails/password-changed.tsx - Security email pattern
// 3. emails/two-factor-enabled.tsx - Security email
// 4. emails/components/EmailLayout.tsx - Email layout
// 5. services/authService.ts - Auth service
// 6. services/loginHistoryService.ts - Login history
// 7. lib/email.ts - Email sending
// 8. types/security.ts - Security types
// 9. prisma/schema.prisma - ActiveSession, LoginAttempt models
// -----------------------------------------------------------------------------

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface SecurityLoginNewDeviceProps {
  userName: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  loginTime: Date | string;
  secureAccountLink?: string;
}

export const SecurityLoginNewDeviceEmail: React.FC<SecurityLoginNewDeviceProps> = ({
  userName = 'there',
  device = 'Unknown Device',
  browser = 'Unknown Browser',
  location = 'Unknown Location',
  ipAddress = 'Unknown',
  loginTime = new Date().toISOString(),
  secureAccountLink,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
  const secureUrl = secureAccountLink || `${baseUrl}/settings/security?action=secure`;

  return (
    <EmailLayout preview="New device login detected">
      <Section style={alertBanner}>
        <Text style={alertEmoji}>🔐</Text>
        <Text style={alertTitle}>New Device Login</Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        We detected a sign-in to your ProgressTracker account from a new device. If this was you,
        no action is needed.
      </Text>

      <Card variant="warning" title="🆕 New Device Login Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Time:</strong> {new Date(loginTime).toLocaleString()}
          <br />
          <strong>Device:</strong> {device}
          <br />
          <strong>Browser:</strong> {browser}
          <br />
          <strong>IP Address:</strong> {ipAddress}
          <br />
          <strong>Location:</strong> {location}
        </Text>
      </Card>

      <Text style={paragraph}>
        <strong>Was this you?</strong>
      </Text>

      <Section style={buttonRow}>
        <Button href={`${baseUrl}/settings/sessions`} variant="success">
          Yes, this was me
        </Button>
      </Section>

      <Section style={buttonRow}>
        <Button href={secureUrl} variant="danger">
          No, secure my account
        </Button>
      </Section>

      <Card variant="info" title="If this wasn't you:">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          1. Click the "Secure my account" button above
          <br />
          2. Change your password immediately
          <br />
          3. Sign out all devices
          <br />
          4. Enable two-factor authentication
          <br />
          5. Review your active sessions
        </Text>
      </Card>

      <Text style={smallText}>
        This is an automated security notification. You&apos;re receiving this because we detected
        a login from a device not previously associated with your account.
      </Text>

      <Text style={smallText}>
        If you have questions, contact us at support@progresstracker.app
      </Text>
    </EmailLayout>
  );
};

const alertBanner = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const alertEmoji = {
  fontSize: '36px',
  margin: '0 0 8px',
};

const alertTitle = {
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

const buttonRow = {
  textAlign: 'center' as const,
  margin: '8px 0',
};

const smallText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '24px 0 0',
};

export default SecurityLoginNewDeviceEmail;
