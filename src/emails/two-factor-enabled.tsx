// src/emails/two-factor-enabled.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { TwoFactorEnabledProps } from '@/types/email';

export const TwoFactorEnabledEmail: React.FC<TwoFactorEnabledProps> = ({
  userName = 'there',
  enabledAt = new Date().toISOString(),
  method = 'authenticator',
  ipAddress,
  device,
  backupCodesGenerated = true,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
  const methodLabels = { authenticator: 'Authenticator App', sms: 'SMS', email: 'Email' };

  return (
    <EmailLayout preview="Two-factor authentication enabled">
      <Section style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '20px', textAlign: 'center' as const, marginBottom: '24px' }}>
        <Text style={{ fontSize: '36px', margin: '0 0 8px' }}>🔐</Text>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#065f46', margin: 0 }}>Two-Factor Authentication Enabled!</Text>
      </Section>

      <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' }}>Hi {userName},</Text>
      <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' }}>
        Great news! Two-factor authentication has been successfully enabled on your account.
      </Text>

      <Card variant="success" title="2FA Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Method:</strong> {methodLabels[method]}<br />
          <strong>Enabled At:</strong> {new Date(enabledAt).toLocaleString()}<br />
          {ipAddress && <><strong>IP Address:</strong> {ipAddress}<br /></>}
          {device && <><strong>Device:</strong> {device}</>}
        </Text>
      </Card>

      {backupCodesGenerated && (
        <Card variant="warning" title="📋 Backup Codes Generated">
          <Text style={{ margin: 0, fontSize: '14px' }}>
            Store your backup codes in a safe place! Each code can only be used once.
          </Text>
        </Card>
      )}

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button href={`${baseUrl}/settings/security`} variant="primary">View Security Settings</Button>
      </Section>
    </EmailLayout>
  );
};

export default TwoFactorEnabledEmail;