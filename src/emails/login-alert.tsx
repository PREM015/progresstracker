// src/emails/login-alert.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { LoginAlertProps } from '@/types/email';

export const LoginAlertEmail: React.FC<LoginAlertProps> = ({
  userName = 'there',
  loginTime = new Date().toISOString(),
  ipAddress = 'Unknown',
  device = 'Unknown Device',
  browser = 'Unknown Browser',
  location = 'Unknown Location',
  isNewDevice = true,
  isNewLocation = false,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="New login detected">
      <Section style={alertBanner}>
        <Text style={alertEmoji}>🔔</Text>
        <Text style={alertTitle}>New Login Detected</Text>
      </Section>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        We detected a new sign-in to your ProgressTracker account. If this was you, no action is
        needed.
      </Text>

      <Card variant={isNewDevice && isNewLocation ? 'danger' : 'warning'} title="Login Details">
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
          {isNewDevice && (
            <>
              <br />
              <span style={newBadge}>🆕 New Device</span>
            </>
          )}
          {isNewLocation && (
            <>
              <br />
              <span style={newBadge}>📍 New Location</span>
            </>
          )}
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
        <Button href={`${baseUrl}/settings/security?action=secure`} variant="danger">
          No, secure my account
        </Button>
      </Section>

      <Card variant="info" title="If this wasn't you:">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          1. Change your password immediately
          <br />
          2. Sign out all devices
          <br />
          3. Enable two-factor authentication
          <br />
          4. Review your recent account activity
        </Text>
      </Card>

      <Text style={smallText}>You&apos;re receiving this because you have login alerts enabled.</Text>
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

const newBadge = {
  backgroundColor: '#fef3c7',
  color: '#92400e',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
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

export default LoginAlertEmail;