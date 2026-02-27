// src/emails/two-factor-disabled.tsx
import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';
import type { TwoFactorDisabledProps } from '@/types/email';

export const TwoFactorDisabledEmail: React.FC<TwoFactorDisabledProps> = ({
  userName = 'there',
  disabledAt = new Date().toISOString(),
  ipAddress,
  device,
}) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

  return (
    <EmailLayout preview="Two-factor authentication disabled">
      <Section style={{ backgroundColor: '#fef2f2', borderRadius: '8px', padding: '20px', textAlign: 'center' as const, marginBottom: '24px' }}>
        <Text style={{ fontSize: '36px', margin: '0 0 8px' }}>⚠️</Text>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>Two-Factor Authentication Disabled</Text>
      </Section>

      <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' }}>Hi {userName},</Text>
      <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 16px' }}>
        Two-factor authentication has been disabled on your account. Your account is now less secure.
      </Text>

      <Card variant="warning" title="Action Details">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          <strong>Disabled At:</strong> {new Date(disabledAt).toLocaleString()}<br />
          {ipAddress && <><strong>IP Address:</strong> {ipAddress}<br /></>}
          {device && <><strong>Device:</strong> {device}</>}
        </Text>
      </Card>

      <Card variant="danger" title="⚠️ Security Warning">
        <Text style={{ margin: 0, fontSize: '14px' }}>
          We strongly recommend re-enabling 2FA to protect your account.
        </Text>
      </Card>

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button href={`${baseUrl}/settings/security`} variant="primary">Re-enable Two-Factor Auth</Button>
      </Section>
    </EmailLayout>
  );
};

export default TwoFactorDisabledEmail;